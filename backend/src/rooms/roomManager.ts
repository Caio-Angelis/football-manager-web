// ============================================================
// GERENCIADOR DE SALAS ONLINE (em memória)
// Cada sala tem um universo de jogo isolado (createGameStore()).
// Ver PlanoOnline.md — Fase 1+.
// ponytail: Map em memória basta para o MVP; persistência/DB = Fase 10.
// ============================================================

import { createGameStore, type GameStoreApi } from '../store/gameStore.js';
import { extractState } from '../store/storeHelpers.js';
import { processWeeklyScopedFeatures } from '../store/slices/core.js';
import { recalcWageBill } from '../store/helpers/transfer.js';
import { getFullName } from '../utils/playerName.js';
import type { GameState, WeeklyTrainingPlan, Team, InboxMessage } from '../types/game.js';

export type RoomStatus = 'lobby' | 'drafting' | 'playing' | 'finished';

export interface RoomPlayer {
  playerId: string;      // token estável gerado no cliente (NÃO exposto a outros)
  nickname: string;
  teamId: string | null; // definido no draft (Fase 3)
  ready: boolean;        // ready-check da rodada (Fase 5)
  connected: boolean;
  lastSeen: number;
}

// Negociação de transferência entre dois HUMANOS (Fase 7).
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export interface HumanOffer {
  id: string;
  playerId: string;
  playerName: string;
  sellerTeamId: string;
  buyerTeamId: string;
  price: number;              // em milhões de R$
  status: OfferStatus;
  turn: 'seller' | 'buyer';  // de quem é a vez de responder
  round: number;
  history: { by: 'buyer' | 'seller'; price: number }[];
}

export interface Room {
  code: string;
  ownerId: string;
  status: RoomStatus;
  players: RoomPlayer[];
  store: GameStoreApi;   // universo isolado da sala
  scopes: Record<string, Partial<GameState>>; // estado por-jogador (chave = teamId)
  offers: HumanOffer[];  // negociações humano×humano ativas/recentes
  createdAt: number;
}

// Campos do GameState que pertencem a UM jogador (não são do universo compartilhado).
// São trocados (swap) no store a cada request conforme o jogador — assim os slices
// existentes continuam lendo `state.inbox` etc. sem nenhuma alteração. Ver Fase 5/6.
export const SCOPED_KEYS: (keyof GameState)[] = [
  'inbox', 'trainingPlan',
  'pendingInstallments', 'incomingBonuses',
  'incomingTransfers', 'counterOffers', 'deferredTransfers',
  'scoutReports', 'scoutKnowledge', 'scoutMissions', 'shortlist', 'scoutRecommendations',
  'boardReplies', 'boardSatisfaction', 'financialReports',
  'recommendations', 'preventionSessions', 'degradedConditions',
  'fanMood', 'mediaPressure', 'biddingWars', 'activeLoans',
  'reserveTeam', 'youthAcademy', 'youthIntakeCompleted',
  'pressConferences', 'transferAgreements', 'injuryHistory',
  'fatigueLog', 'completedTransfers', 'socialTree',
];

function snapshotScope(store: GameStoreApi): Partial<GameState> {
  const s = store.getState() as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of SCOPED_KEYS) out[k as string] = structuredClone(s[k as string]);
  return out as Partial<GameState>;
}

/** Carrega o estado por-jogador no store (antes de ler/agir por aquele jogador). */
export function loadScope(room: Room, teamId: string): void {
  const scope = room.scopes[teamId];
  if (scope) room.store.setState(scope as Partial<GameState>);
}

/** Persiste o estado por-jogador do store de volta ao escopo do jogador (após agir). */
export function saveScope(room: Room, teamId: string): void {
  room.scopes[teamId] = snapshotScope(room.store);
}

// Visão pública da sala, relativa a quem pediu — NUNCA expõe o playerId (token) alheio.
export interface PublicRoom {
  code: string;
  status: RoomStatus;
  createdAt: number;
  currentWeek: number;   // semana do universo (para o cliente detectar avanço de rodada)
  isOwner: boolean;      // quem pediu é o dono?
  players: {
    nickname: string;
    teamId: string | null;
    ready: boolean;
    connected: boolean;
    isOwner: boolean;
    isYou: boolean;
  }[];
  offers: OfferView[];   // negociações relevantes para quem pediu
}

// Oferta na perspectiva de quem pediu.
export interface OfferView {
  id: string;
  playerName: string;
  price: number;
  status: OfferStatus;
  round: number;
  iAmBuyer: boolean;
  iAmSeller: boolean;
  myTurn: boolean;       // é a minha vez de responder?
  fromNickname: string;  // comprador
  toNickname: string;    // vendedor
  history: { by: 'buyer' | 'seller'; price: number }[];
}

const rooms = new Map<string, Room>();

const CODE_LEN = 6;
// Sem 0/O/1/I para evitar confusão ao digitar.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genCode(): string {
  let code = '';
  do {
    code = Array.from({ length: CODE_LEN }, () =>
      CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join('');
  } while (rooms.has(code));
  return code;
}

export function createRoom(ownerId: string, nickname: string): Room {
  const room: Room = {
    code: genCode(),
    ownerId,
    status: 'lobby',
    players: [{ playerId: ownerId, nickname, teamId: null, ready: false, connected: true, lastSeen: Date.now() }],
    store: createGameStore(),
    scopes: {},
    offers: [],
    createdAt: Date.now(),
  };
  rooms.set(room.code, room);
  return room;
}

export function getRoom(code: string | undefined): Room | undefined {
  if (!code) return undefined;
  return rooms.get(code.toUpperCase());
}

export function getPlayer(room: Room, playerId: string): RoomPlayer | undefined {
  return room.players.find(p => p.playerId === playerId);
}

/** Entra numa sala existente (ou reentra, se o playerId já estava nela). */
export function joinRoom(code: string, playerId: string, nickname: string): Room | null {
  const room = getRoom(code);
  if (!room) return null;
  const existing = getPlayer(room, playerId);
  if (existing) {
    // Reconexão: atualiza apelido/presença.
    existing.nickname = nickname || existing.nickname;
    existing.connected = true;
    existing.lastSeen = Date.now();
    return room;
  }
  // Só é possível entrar como novo jogador enquanto está no lobby.
  if (room.status !== 'lobby') return null;
  room.players.push({ playerId, nickname, teamId: null, ready: false, connected: true, lastSeen: Date.now() });
  return room;
}

/** Marca presença (heartbeat) do jogador que fez a request. */
export function touch(room: Room, playerId: string): void {
  const p = getPlayer(room, playerId);
  if (p) { p.connected = true; p.lastSeen = Date.now(); }
}

/** Dono encerra a sala: remove do Map. Os demais recebem 404 no próximo polling (Fase 9). */
export function closeRoom(room: Room, playerId: string): RoomOpResult {
  if (room.ownerId !== playerId) return { ok: false, status: 403, message: 'Apenas o dono pode encerrar a sala' };
  rooms.delete(room.code);
  return { ok: true };
}

// ============================================================
// INÍCIO DO JOGO E DRAFT DE CLUBES (Fase 3)
// ============================================================

export type RoomOpResult = { ok: true } | { ok: false; status: number; message: string };

/** Dono inicia: gera os clubes (initGame) e abre o draft. */
export function startGame(room: Room, playerId: string): RoomOpResult {
  if (room.ownerId !== playerId) return { ok: false, status: 403, message: 'Apenas o dono pode iniciar' };
  if (room.status !== 'lobby') return { ok: false, status: 409, message: 'Sala já iniciada' };
  room.store.getState().initGame(); // gera os 20 clubes; todos sem ownerId (= IA)
  room.status = 'drafting';
  return { ok: true };
}

/** Jogador escolhe um clube no draft (troca o anterior, se houver). */
export function pickTeam(room: Room, playerId: string, teamId: string): RoomOpResult {
  if (room.status !== 'drafting') return { ok: false, status: 409, message: 'O draft não está aberto' };
  const rp = getPlayer(room, playerId);
  if (!rp) return { ok: false, status: 403, message: 'Você não está na sala' };

  const state = room.store.getState();
  const target = state.teams.find(t => t.id === teamId);
  if (!target) return { ok: false, status: 404, message: 'Clube não encontrado' };
  // Corrida: se já tem dono (e não é você), rejeita.
  if (target.ownerId && target.ownerId !== playerId) {
    return { ok: false, status: 409, message: 'Esse clube já foi escolhido' };
  }

  room.store.setState({
    teams: state.teams.map(t => {
      if (t.id === teamId) return { ...t, ownerId: playerId };
      if (t.ownerId === playerId) return { ...t, ownerId: null }; // libera o clube anterior
      return t;
    }),
  });
  rp.teamId = teamId;
  return { ok: true };
}

/** Dono confirma o começo: exige que todos tenham escolhido um clube. */
export function beginGame(room: Room, playerId: string): RoomOpResult {
  if (room.ownerId !== playerId) return { ok: false, status: 403, message: 'Apenas o dono pode começar' };
  if (room.status !== 'drafting') return { ok: false, status: 409, message: 'O draft não está aberto' };
  if (!room.players.every(p => p.teamId)) {
    return { ok: false, status: 409, message: 'Todos precisam escolher um clube' };
  }
  // Inicializa o escopo por-jogador de cada humano com os defaults pós-initGame.
  const template = snapshotScope(room.store);
  for (const p of room.players) {
    if (p.teamId) room.scopes[p.teamId] = structuredClone(template);
  }
  room.status = 'playing';
  return { ok: true };
}

// ============================================================
// NEGOCIAÇÃO DE TRANSFERÊNCIA HUMANO × HUMANO (Fase 7)
// ============================================================

/** Um time é controlado por humano se algum jogador da sala o escolheu. */
export function isHumanTeam(room: Room, teamId: string | undefined | null): boolean {
  if (!teamId) return false;
  return room.players.some(p => p.teamId === teamId);
}

function pushInbox(room: Room, teamId: string, msg: InboxMessage): void {
  const scope = room.scopes[teamId];
  if (!scope) return;
  scope.inbox = [msg, ...((scope.inbox as InboxMessage[] | undefined) ?? [])].slice(0, 100);
}

function offerInbox(playerName: string, subject: string, body: string): InboxMessage {
  return {
    id: `hoffer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'transfer',
    subject,
    body,
    timestamp: Date.now(),
    read: false,
    priority: 'high',
  } as InboxMessage;
}

/** Comprador humano faz uma oferta por um jogador de outro time humano. */
export function makeHumanOffer(room: Room, buyerPlayerId: string, playerId: string, price: number): RoomOpResult {
  if (room.status !== 'playing') return { ok: false, status: 409, message: 'O jogo não está em andamento' };
  const buyerTeamId = getPlayer(room, buyerPlayerId)?.teamId;
  if (!buyerTeamId) return { ok: false, status: 403, message: 'Você não está jogando' };
  if (!(price > 0)) return { ok: false, status: 400, message: 'Valor inválido' };

  const teams = room.store.getState().teams;
  const seller = teams.find(t => t.squad.some(p => p.id === playerId));
  if (!seller) return { ok: false, status: 404, message: 'Jogador não encontrado' };
  if (seller.id === buyerTeamId) return { ok: false, status: 400, message: 'Esse jogador já é seu' };
  if (!isHumanTeam(room, seller.id)) return { ok: false, status: 400, message: 'Esse time não é de um jogador humano' };
  if (room.offers.some(o => o.status === 'pending' && o.playerId === playerId && o.buyerTeamId === buyerTeamId)) {
    return { ok: false, status: 409, message: 'Você já tem uma oferta ativa por esse jogador' };
  }

  const player = seller.squad.find(p => p.id === playerId)!;
  const playerName = getFullName(player);
  const offer: HumanOffer = {
    id: `ho_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    playerId, playerName, sellerTeamId: seller.id, buyerTeamId,
    price: Math.round(price * 10) / 10, status: 'pending', turn: 'seller', round: 1,
    history: [{ by: 'buyer', price: Math.round(price * 10) / 10 }],
  };
  room.offers.push(offer);
  pushInbox(room, seller.id, offerInbox(
    playerName,
    `💰 Proposta por ${playerName}`,
    `${nickForTeam(room, buyerTeamId)} ofereceu R$ ${offer.price}M por ${playerName}. Responda em Negociações Online.`,
  ));
  return { ok: true };
}

/** Move o jogador e o dinheiro entre os dois times (ambos humanos, preço cheio). */
function executeHumanTransfer(room: Room, offer: HumanOffer): RoomOpResult {
  const teams = room.store.getState().teams;
  const bi = teams.findIndex(t => t.id === offer.buyerTeamId);
  const si = teams.findIndex(t => t.id === offer.sellerTeamId);
  if (bi === -1 || si === -1) return { ok: false, status: 404, message: 'Time não encontrado' };

  const buyer = { ...teams[bi] };
  const seller = { ...teams[si] };
  const player = seller.squad.find(p => p.id === offer.playerId);
  if (!player) return { ok: false, status: 409, message: 'Jogador não está mais disponível' };
  if (buyer.budget < offer.price) return { ok: false, status: 409, message: 'Comprador sem orçamento suficiente' };

  seller.squad = seller.squad.filter(p => p.id !== offer.playerId);
  buyer.squad = [...buyer.squad, { ...player, squadStatus: 'Rotation' }];
  buyer.budget = Math.round((buyer.budget - offer.price) * 100) / 100;
  seller.budget = Math.round((seller.budget + offer.price) * 100) / 100;
  buyer.wageBill = recalcWageBill(buyer);
  seller.wageBill = recalcWageBill(seller);

  const newTeams = [...teams];
  newTeams[bi] = buyer;
  newTeams[si] = seller;
  room.store.setState({ teams: newTeams });
  return { ok: true };
}

/** Vendedor/comprador responde a uma oferta: aceitar, recusar ou contrapropor. */
export function respondHumanOffer(
  room: Room, responderPlayerId: string, offerId: string,
  action: 'accept' | 'reject' | 'counter' | 'withdraw', counterPrice?: number,
): RoomOpResult {
  const offer = room.offers.find(o => o.id === offerId);
  if (!offer || offer.status !== 'pending') return { ok: false, status: 404, message: 'Oferta indisponível' };
  const myTeamId = getPlayer(room, responderPlayerId)?.teamId;
  if (!myTeamId) return { ok: false, status: 403, message: 'Você não está jogando' };

  const iAmSeller = myTeamId === offer.sellerTeamId;
  const iAmBuyer = myTeamId === offer.buyerTeamId;
  if (!iAmSeller && !iAmBuyer) return { ok: false, status: 403, message: 'Oferta não é sua' };

  if (action === 'withdraw') {
    if (!iAmBuyer) return { ok: false, status: 403, message: 'Só o comprador pode retirar a oferta' };
    offer.status = 'withdrawn';
    pushInbox(room, offer.sellerTeamId, offerInbox(offer.playerName, `Proposta retirada`, `${nickForTeam(room, offer.buyerTeamId)} retirou a proposta por ${offer.playerName}.`));
    return { ok: true };
  }

  // Precisa ser a vez de quem respondeu.
  const isMyTurn = (offer.turn === 'seller' && iAmSeller) || (offer.turn === 'buyer' && iAmBuyer);
  if (!isMyTurn) return { ok: false, status: 409, message: 'Não é a sua vez nesta negociação' };

  if (action === 'accept') {
    const done = executeHumanTransfer(room, offer);
    if (!done.ok) return done;
    offer.status = 'accepted';
    pushInbox(room, offer.buyerTeamId, offerInbox(offer.playerName, `✅ ${offer.playerName} é seu!`, `Transferência de ${offer.playerName} concluída por R$ ${offer.price}M.`));
    pushInbox(room, offer.sellerTeamId, offerInbox(offer.playerName, `✅ ${offer.playerName} vendido`, `Você vendeu ${offer.playerName} por R$ ${offer.price}M.`));
    return { ok: true };
  }

  if (action === 'reject') {
    offer.status = 'rejected';
    const notify = iAmSeller ? offer.buyerTeamId : offer.sellerTeamId;
    pushInbox(room, notify, offerInbox(offer.playerName, `❌ Proposta recusada`, `A negociação por ${offer.playerName} foi recusada.`));
    return { ok: true };
  }

  // counter
  if (!(counterPrice && counterPrice > 0)) return { ok: false, status: 400, message: 'Valor da contraproposta inválido' };
  offer.price = Math.round(counterPrice * 10) / 10;
  offer.turn = iAmSeller ? 'buyer' : 'seller';
  offer.round += 1;
  offer.history.push({ by: iAmSeller ? 'seller' : 'buyer', price: offer.price });
  const other = iAmSeller ? offer.buyerTeamId : offer.sellerTeamId;
  pushInbox(room, other, offerInbox(offer.playerName, `🔁 Contraproposta por ${offer.playerName}`, `Novo valor: R$ ${offer.price}M. Responda em Negociações Online.`));
  return { ok: true };
}

// ============================================================
// PROJEÇÃO DE ESTADO ESCOPADA (Fase 6) — não vazar dados dos rivais
// ============================================================

// Campos internos/sensíveis de um clube rival que o jogador NÃO deve ver.
// (Atributos dos jogadores já são mascarados por scouting em extractState.)
function stripRivalTeam(team: Team): Team {
  return {
    ...team,
    budget: 0,
    wageBill: 0,
    scouts: [],
    squad: team.squad.map(p => ({ ...p, salary: 0, morale: 0, fitness: 0, form: 0 })),
  };
}

/**
 * Estado do jogo projetado para um jogador: público (tabela, resultados, jogadores
 * contratáveis com atributos mascarados) + privado só do próprio time. O estado
 * por-jogador (inbox/scouting/parcelas/...) já vem do escopo carregado no store.
 */
export function projectState(room: Room, myTeamId: string | null): GameState {
  const state = extractState(room.store); // atributos de rivais já mascarados
  if (myTeamId && Array.isArray(state.teams)) {
    state.teams = state.teams.map(t => (t.id === myTeamId ? t : stripRivalTeam(t)));
  } else if (Array.isArray(state.teams)) {
    // E-27: Sem time (drafting) — mascarar TODOS os times para evitar vazamento.
    state.teams = state.teams.map(t => stripRivalTeam(t));
  }
  return state;
}

/**
 * Foca o store da sala no time do jogador que fez a request, antes de executar
 * a ação / extrair o estado. Faz a lógica "por jogador" (que lê selectedTeam)
 * operar no time certo. Ver PlanoOnline.md — Fase 4 (endurecimento vem depois).
 */
export function focusTeam(room: Room, playerId: string): void {
  const rp = getPlayer(room, playerId);
  if (rp?.teamId) room.store.getState().selectTeam(rp.teamId);
}

// ============================================================
// READY-CHECK E AVANÇO COORDENADO DE RODADA (Fase 5)
// ============================================================

/** Marca (ou alterna) o "pronto" do jogador para a rodada. */
export function setReady(room: Room, playerId: string, ready?: boolean): RoomOpResult {
  if (room.status !== 'playing') return { ok: false, status: 409, message: 'O jogo não está em andamento' };
  // E-29: Exigir boolean explícito para evitar toggle por double-click.
  if (ready === undefined) return { ok: false, status: 400, message: 'ready deve ser true ou false' };
  const rp = getPlayer(room, playerId);
  if (!rp?.teamId) return { ok: false, status: 403, message: 'Você não está jogando nesta sala' };
  rp.ready = ready;
  return { ok: true };
}

/** Todos os jogadores com time estão prontos? (desconectado conta como pronto — Fase 9) */
export function allPlayersReady(room: Room): boolean {
  const now = Date.now();
  const playing = room.players.filter(p => p.teamId);
  // E-28: Calcular conectividade derivada de lastSeen em vez de flag.
  return playing.length > 0 && playing.every(p => p.ready || (now - p.lastSeen > STALE_PLAYER_MS));
}

/**
 * Fecha a rodada quando todos estão prontos: foca o time do host (para as
 * features single-track — inbox/parcelas/torcida) e chama o advanceWeek
 * multi-humano com TODOS os times humanos. Depois zera os "prontos".
 */
export function advanceRoomWeek(room: Room): void {
  const humanTeamIds = room.players.map(p => p.teamId).filter((id): id is string => !!id);
  if (humanTeamIds.length === 0) return;
  const hostTeamId = getPlayer(room, room.ownerId)?.teamId ?? humanTeamIds[0];

  // Cada humano treina conforme SEU próprio plano (guardado no escopo).
  const trainingByTeam: Record<string, WeeklyTrainingPlan | null> = {};
  for (const id of humanTeamIds) {
    trainingByTeam[id] = (room.scopes[id]?.trainingPlan as WeeklyTrainingPlan | null | undefined) ?? null;
  }

  // Carrega o escopo do host para as features single-track do avanço
  // (inbox/parcelas/torcida/scout). Squad+finanças de TODOS os humanos são
  // processados por-time dentro do advanceWeek.
  loadScope(room, hostTeamId);
  room.store.getState().selectTeam(hostTeamId);
  // E-20: Capturar semana antes do avanço para verificar se incrementou.
  const weekBefore = room.store.getState().currentWeek;
  // E-10: advanceWeek retorna mapa de inbox por time humano para distribuição.
  const inboxByTeam = room.store.getState().advanceWeek(humanTeamIds, trainingByTeam) as Record<string, InboxMessage[]> | undefined;
  saveScope(room, hostTeamId);

  // C6: Processar features single-track (parcelas, bônus, scout, torcida)
  // para cada humano NÃO-host. O advanceWeek principal só processa o escopo
  // do host; os outros humanos precisam que seu escopo seja carregado e
  // processado separadamente.
  const newWeek = room.store.getState().currentWeek;
  if (newWeek > weekBefore) {
    const currentTeams = room.store.getState().teams;
    for (const hid of humanTeamIds) {
      if (hid === hostTeamId) continue;
      loadScope(room, hid);
      room.store.getState().selectTeam(hid);
      const result = processWeeklyScopedFeatures(
        room.store.getState as () => any,
        room.store.setState.bind(room.store) as any,
        hid,
        newWeek,
        currentTeams,
      );
      // Distribuir mensagens geradas para o inbox do humano
      for (const msg of result.inboxMessages) {
        pushInbox(room, hid, msg);
      }
      saveScope(room, hid);
    }
    // Restaurar escopo do host no store
    loadScope(room, hostTeamId);
    room.store.getState().selectTeam(hostTeamId);
  }

  // E-10: Distribuir mensagens privadas (lesões, contratos, recomendações) para cada humano.
  if (inboxByTeam) {
    for (const [teamId, messages] of Object.entries(inboxByTeam)) {
      if (teamId === hostTeamId) continue; // host já recebeu via finalInbox
      for (const msg of messages) {
        pushInbox(room, teamId, msg);
      }
    }
  }

  // E-20: Só zerar ready flags se a semana realmente avançou.
  const s = room.store.getState();
  if (s.currentWeek > weekBefore) {
    for (const p of room.players) p.ready = false;
  }
  // Fim de temporada encerra a sala (MVP: sem multi-temporada online).
  if (s.seasonSummary || s.gameOver) room.status = 'finished';
}

/** Projeção pública relativa ao solicitante — nunca vaza o token de outros jogadores. */
export function toPublicRoom(room: Room, requesterId: string): PublicRoom {
  const myTeamId = getPlayer(room, requesterId)?.teamId ?? null;
  return {
    code: room.code,
    status: room.status,
    createdAt: room.createdAt,
    currentWeek: room.store.getState().currentWeek,
    isOwner: room.ownerId === requesterId,
    players: room.players.map(p => ({
      nickname: p.nickname,
      teamId: p.teamId,
      ready: p.ready,
      // E-28: Conectividade derivada de lastSeen.
      connected: (Date.now() - p.lastSeen) < STALE_PLAYER_MS,
      isOwner: p.playerId === room.ownerId,
      isYou: p.playerId === requesterId,
    })),
    offers: offersView(room, myTeamId),
  };
}

// Apelido do dono de um time humano (para exibir nas ofertas).
function nickForTeam(room: Room, teamId: string): string {
  return room.players.find(p => p.teamId === teamId)?.nickname ?? '—';
}

function offersView(room: Room, myTeamId: string | null): OfferView[] {
  if (!myTeamId) return [];
  return room.offers
    .filter(o => o.buyerTeamId === myTeamId || o.sellerTeamId === myTeamId)
    .filter(o => o.status !== 'withdrawn')
    .map(o => {
      const iAmBuyer = o.buyerTeamId === myTeamId;
      const iAmSeller = o.sellerTeamId === myTeamId;
      return {
        id: o.id,
        playerName: o.playerName,
        price: o.price,
        status: o.status,
        round: o.round,
        iAmBuyer,
        iAmSeller,
        myTurn: o.status === 'pending' && ((o.turn === 'seller' && iAmSeller) || (o.turn === 'buyer' && iAmBuyer)),
        fromNickname: nickForTeam(room, o.buyerTeamId),
        toNickname: nickForTeam(room, o.sellerTeamId),
        history: o.history,
      };
    });
}

// ============================================================
// LIMPEZA DE SALAS ABANDONADAS (evita vazar memória)
// Espelha o padrão do rateLimiter (setInterval no módulo).
// ============================================================
const CLEANUP_INTERVAL_MS = 5 * 60_000;
const ROOM_TTL_MS = 6 * 60 * 60_000;      // sala viva por até 6h
const STALE_PLAYER_MS = 60_000;           // sem heartbeat há 1min = desconectado
const ROOM_GRACE_MS = 15 * 60_000;        // E-28: carência antes de apagar sala com todos ausentes

const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    // E-28: Conectividade derivada de lastSeen — não precisa setar flag aqui.
    const everyoneGone = room.players.every(p => (now - p.lastSeen) > STALE_PLAYER_MS);
    const lastActive = Math.max(...room.players.map(p => p.lastSeen));
    const expired = now - room.createdAt > ROOM_TTL_MS;
    // Só apagar se todos estão ausentes há mais de ROOM_GRACE_MS, ou se expirou.
    if (expired || (everyoneGone && (now - lastActive) > ROOM_GRACE_MS)) rooms.delete(code);
  }
}, CLEANUP_INTERVAL_MS);
cleanup.unref?.(); // não segura o processo vivo (ex.: em testes)
