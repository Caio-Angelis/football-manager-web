// ============================================================
// GERENCIADOR DE SALAS ONLINE (em memória)
// Cada sala tem um universo de jogo isolado (createGameStore()).
// Ver PlanoOnline.md — Fase 1+.
// ponytail: Map em memória basta para o MVP; persistência/DB = Fase 10.
// ============================================================

import { createGameStore, type GameStoreApi } from '../store/gameStore.js';
import { extractState } from '../store/storeHelpers.js';
import type { GameState, WeeklyTrainingPlan, Team } from '../types/game.js';

export type RoomStatus = 'lobby' | 'drafting' | 'playing' | 'finished';

export interface RoomPlayer {
  playerId: string;      // token estável gerado no cliente (NÃO exposto a outros)
  nickname: string;
  teamId: string | null; // definido no draft (Fase 3)
  ready: boolean;        // ready-check da rodada (Fase 5)
  connected: boolean;
  lastSeen: number;
}

export interface Room {
  code: string;
  ownerId: string;
  status: RoomStatus;
  players: RoomPlayer[];
  store: GameStoreApi;   // universo isolado da sala
  scopes: Record<string, Partial<GameState>>; // estado por-jogador (chave = teamId)
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
  const rp = getPlayer(room, playerId);
  if (!rp?.teamId) return { ok: false, status: 403, message: 'Você não está jogando nesta sala' };
  rp.ready = ready ?? !rp.ready;
  return { ok: true };
}

/** Todos os jogadores com time estão prontos? (desconectado conta como pronto — Fase 9) */
export function allPlayersReady(room: Room): boolean {
  const playing = room.players.filter(p => p.teamId);
  return playing.length > 0 && playing.every(p => p.ready || !p.connected);
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
  room.store.getState().advanceWeek(humanTeamIds, trainingByTeam);
  saveScope(room, hostTeamId);

  for (const p of room.players) p.ready = false;
  // Fim de temporada encerra a sala (MVP: sem multi-temporada online).
  const s = room.store.getState();
  if (s.seasonSummary || s.gameOver) room.status = 'finished';
}

/** Projeção pública relativa ao solicitante — nunca vaza o token de outros jogadores. */
export function toPublicRoom(room: Room, requesterId: string): PublicRoom {
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
      connected: p.connected,
      isOwner: p.playerId === room.ownerId,
      isYou: p.playerId === requesterId,
    })),
  };
}

// ============================================================
// LIMPEZA DE SALAS ABANDONADAS (evita vazar memória)
// Espelha o padrão do rateLimiter (setInterval no módulo).
// ============================================================
const CLEANUP_INTERVAL_MS = 5 * 60_000;
const ROOM_TTL_MS = 6 * 60 * 60_000;      // sala viva por até 6h
const STALE_PLAYER_MS = 60_000;           // sem heartbeat há 1min = desconectado

const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    // Marca jogadores sem heartbeat recente como desconectados.
    for (const p of room.players) {
      if (now - p.lastSeen > STALE_PLAYER_MS) p.connected = false;
    }
    const everyoneGone = room.players.every(p => !p.connected);
    const expired = now - room.createdAt > ROOM_TTL_MS;
    if (expired || everyoneGone) rooms.delete(code);
  }
}, CLEANUP_INTERVAL_MS);
cleanup.unref?.(); // não segura o processo vivo (ex.: em testes)
