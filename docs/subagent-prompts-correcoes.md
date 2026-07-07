# Prompts para Subagentes — Correções e Melhorias (C1–C10)

> **Instruções de uso:** Cole cada prompt abaixo numa sessão separada do Devin configurada com modelo **GLM-5.2 High (200k contexto)**. Cada prompt é autocontido: inclui o problema, os arquivos exatos a modificar, o contexto mínimo necessário e os critérios de teste. Ao final de cada subagente, traga o código de volta para o projeto principal.


---

## Prompt C4 — Erros de API engolidos no frontend

```
Você é um subagente de correção de bugs no projeto football-manager-web (TypeScript, React, Zustand).

PROBLEMA:
Em frontend/src/store/gameStore.ts, praticamente todas as ~40 mutations seguem o padrão:
```ts
apiAction(...).then(syncFromResponse).catch(err => console.error('API action failed:', err))
```
(exemplo na linha 808). Se o backend recusar ou a rede falhar, a UI fica como se tivesse funcionado — transferência "feita" que não existe, tática "salva" que não salvou.

CONTEXTO:
- Já existe um componente Toast em frontend/src/components/ui/Toast.tsx com ToastData { id, message, type: 'success'|'warning'|'error'|'info', timestamp } e ToastContainer.
- O client HTTP está em frontend/src/api/client.ts. As funções apiGet e apiPost (linhas 14-28) usam fetch SEM timeout.
- A função apiAction (linha 37) roteia para /api/action ou sala online.

TAREFA:
1. Em frontend/src/api/client.ts, adicionar timeout de 15s em todas as chamadas fetch:
```ts
export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}
```
Fazer o mesmo em apiPost e em roomFetch.

2. Criar um sistema de toast global. Opção mais simples: adicionar um array de toasts no gameStore (Zustand):
```ts
toasts: [] as ToastData[],
pushToast: (message: string, type: ToastData['type']) => set(state => ({
  toasts: [...state.toasts, { id: crypto.randomUUID(), message, type, timestamp: Date.now() }]
})),
dismissToast: (id: string) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
```

3. Em frontend/src/store/gameStore.ts, criar um wrapper `apiActionSafe` que substitui o padrão `.catch(err => console.error(...))`:
```ts
const apiActionSafe = async (action: string, args: any[], errorMsg = 'Ação falhou'): Promise<any> => {
  try {
    const result = await apiAction(action, args);
    syncFromResponse(result);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    useGameStore.getState().pushToast(`${errorMsg}: ${msg}`, 'error');
    throw err; // re-lançar para o componente poder reagir
  }
};
```

4. Substituir TODAS as ocorrências de `.catch(err => console.error('API action failed:', err))` no gameStore por chamadas via apiActionSafe com mensagem contextual (ex: "Falha ao salvar tática", "Falha na transferência", "Falha ao avançar semana").

5. Nas ações críticas (buyPlayer, makeOffer, advanceWeek, saveGame), garantir que o erro seja retornado ao componente chamador para ele poder reagir (re-habilitar botão, manter modal aberto). Isso significa que essas funções devem ser async e retornar Promise<void> que rejeita em erro, em vez de fire-and-forget.

6. Montar o ToastContainer no App.tsx (raiz da aplicação) consumindo os toasts do store:
```tsx
<ToastContainer toasts={toasts} onDismiss={dismissToast} />
```

ARQUIVOS A MODIFICAR:
- frontend/src/api/client.ts
- frontend/src/store/gameStore.ts
- frontend/src/App.tsx

ARQUIVOS DE REFERÊNCIA (não modificar):
- frontend/src/components/ui/Toast.tsx (já existe, apenas consumir)

CRITÉRIO DE TESTE:
Derrubar o backend com o jogo aberto e tentar salvar tática → toast de erro aparece em ≤15s e a UI não finge sucesso.
```

---

## Prompt C5 — Polling do modo online: duplicado, sem backoff e sem feedback

```
Você é um subagente de correção de bugs no projeto football-manager-web (TypeScript, React).

PROBLEMA:
Existem DOIS pollings independentes da mesma sala a cada 2s:
1. App.tsx (~linha 244-276): useEffect com setInterval(poll, 2000) chamando getRoom(online.code)
2. RoomView.tsx (~linha 34-77): useEffect com setInterval(poll, POLL_MS=2000) chamando getRoom(code)

Quando ambos estão montados = 2 requisições/2s por cliente. Não há backoff em falha, não há aviso de "conexão perdida", e no reingresso o RoomView engole o 404 deixando o usuário num loader infinito.

CONTEXTO DO CÓDIGO:

App.tsx polling (linhas 244-276):
```tsx
React.useEffect(() => {
  if (!online) { setRoomPub(null); return; }
  let alive = true;
  const poll = async () => {
    try {
      const { room } = await getRoom(online.code);
      if (!alive) return;
      setRoomPub(room);
      if (room.currentWeek !== lastWeekRef.current) {
        const prevWeek = lastWeekRef.current;
        lastWeekRef.current = room.currentWeek;
        const { state } = await apiRoomState(online.code);
        if (!alive) return;
        useGameStore.setState({ ...state, selectedTeam: online.teamId });
        if (prevWeek !== -1) {
          const matches: Match[] = state.matches ?? [];
          const mine = [...matches].reverse().find(m => m.completed && (m.homeTeam === online.teamId || m.awayTeam === online.teamId));
          if (mine) setRoundResult(mine);
        }
      }
    } catch (e) {
      if ((e as { status?: number })?.status === 404) exitClosedRoom();
    }
  };
  poll();
  const id = setInterval(poll, 2000);
  return () => { alive = false; clearInterval(id); };
}, [online?.code, online?.teamId, exitClosedRoom]);
```

RoomView.tsx polling (linhas 34-77):
```tsx
React.useEffect(() => {
  let alive = true;
  const poll = async () => {
    try {
      const { room: r } = await getRoom(code);
      if (!alive) return;
      if (!r.players.some(p => p.isYou)) {
        const nick = localStorage.getItem(NICK_KEY);
        if (nick) { try { await joinRoom(code, nick); } catch {} }
      }
      rememberRoom(code);
      setRoom(r);
      setError(null);
      if (r.status === 'drafting') {
        try { const { state } = await apiRoomState(code); if (alive) setTeams(state.teams ?? []); } catch {}
      }
      if (r.status === 'playing' && !enteredRef.current) {
        const me = r.players.find(p => p.isYou);
        if (me?.teamId) {
          enteredRef.current = true;
          setActiveRoom(code, me.teamId);
          const { state } = await apiRoomState(code);
          useGameStore.setState({ ...state, selectedTeam: me.teamId });
          navigate('/dashboard');
        }
      }
    } catch (e) {
      if (!alive) return;
      if ((e as { status?: number })?.status === 404) { forgetRoom(); navigate('/online'); return; }
      setError(e instanceof Error ? e.message : 'Sala indisponível.');
    }
  };
  poll();
  const id = setInterval(poll, POLL_MS);
  return () => { alive = false; clearInterval(id); };
}, [code, navigate]);
```

TAREFA:
1. Criar um hook compartilhado frontend/src/hooks/useRoomPolling.ts que:
   - Recebe (code: string, onRoomUpdate: (room: PublicRoom) => void, onWeekChange: (state: any) => void)
   - Faz UM único polling por sala
   - Implementa backoff exponencial: 2s → 4s → 8s em falhas consecutivas, reset para 2s no sucesso
   - Rastreia falhas consecutivas e expõe `isReconnecting` (true quando 2+ falhas seguidas)
   - Trata 404 chamando um callback onRoomClosed
   - Usa useRef para o timer e AbortController para cancelar fetch pendente

2. Em App.tsx, substituir o useEffect de polling pelo hook useRoomPolling. Usar isReconnecting para mostrar um banner "Reconectando…" no topo da tela.

3. Em RoomView.tsx, REMOVER o polling próprio. O RoomView deve consumir o estado da sala do hook compartilhado (ou de App.tsx via props/contexto). Se RoomView precisa de seu próprio polling (caso App.tsx não esteja montado), usar o mesmo hook — ele deduplica por código de sala se necessário, ou simplesmente delegar ao hook.

4. No reingresso (RoomView.tsx:42-46), tratar 404 explicitamente: chamar forgetRoom() e navigate('/online') com toast "A sala foi encerrada" (usar o sistema de toast do C4 se disponível, ou setError).

ARQUIVOS A MODIFICAR:
- frontend/src/hooks/useRoomPolling.ts (NOVO)
- frontend/src/App.tsx
- frontend/src/components/online/RoomView.tsx

ARQUIVOS DE REFERÊNCIA (não modificar):
- frontend/src/api/client.ts (getRoom, apiRoomState, forgetRoom)

CRITÉRIO DE TESTE:
Entrar numa sala em 2 abas e conferir no Network que há 1 polling por aba (não 2). Desligar o backend → banner "Reconectando…" aparece e a frequência cai. Religar → recupera. Encerrar a sala pelo dono → o convidado volta ao /online com aviso.
```

---

## Prompt C6 — Processamento semanal online só no escopo do host

```
Você é um subagente de correção de bugs no projeto football-manager-web (TypeScript, Node.js, Zustand).

PROBLEMA:
Em backend/src/rooms/roomManager.ts:455-494, a função advanceRoomWeek carrega o escopo do HOST (loadScope) e chama advanceWeek uma única vez. Parcelas a pagar/receber dos outros humanos podem não ser processadas na semana certa e missões de scout deles não progridem.

CÓDIGO ATUAL (roomManager.ts:455-494):
```ts
export function advanceRoomWeek(room: Room): void {
  const humanTeamIds = room.players.map(p => p.teamId).filter((id): id is string => !!id);
  if (humanTeamIds.length === 0) return;
  const hostTeamId = getPlayer(room, room.ownerId)?.teamId ?? humanTeamIds[0];

  const trainingByTeam: Record<string, WeeklyTrainingPlan | null> = {};
  for (const id of humanTeamIds) {
    trainingByTeam[id] = (room.scopes[id]?.trainingPlan as WeeklyTrainingPlan | null | undefined) ?? null;
  }

  loadScope(room, hostTeamId);
  room.store.getState().selectTeam(hostTeamId);
  const weekBefore = room.store.getState().currentWeek;
  const inboxByTeam = room.store.getState().advanceWeek(humanTeamIds, trainingByTeam) as Record<string, InboxMessage[]> | undefined;
  saveScope(room, hostTeamId);

  if (inboxByTeam) {
    for (const [teamId, messages] of Object.entries(inboxByTeam)) {
      if (teamId === hostTeamId) continue;
      for (const msg of messages) { pushInbox(room, teamId, msg); }
    }
  }

  const s = room.store.getState();
  if (s.currentWeek > weekBefore) {
    for (const p of room.players) p.ready = false;
  }
  if (s.seasonSummary || s.gameOver) room.status = 'finished';
}
```

CONTEXTO:
- SCOPED_KEYS (roomManager.ts:54-60) define quais campos do GameState pertencem a UM jogador: inbox, trainingPlan, pendingInstallments, incomingBonuses, incomingTransfers, counterOffers, deferredTransfers, scoutReports, scoutKnowledge, scoutMissions, shortlist, scoutRecommendations, boardReplies, boardSatisfaction, financialReports, recommendations, preventionSessions, degradedConditions, etc.
- loadScope(room, teamId) troca esses campos no store pelos do jogador. saveScope(room, teamId) persiste de volta.
- advanceWeek em core.ts já recebe humanTeamIds e processa squad/finanças de TODOS os humanos, mas as features "single-track" (parcelas, scout, torcida) só rodam no escopo carregado.

TAREFA:
1. Em backend/src/rooms/roomManager.ts, modificar advanceRoomWeek para processar o escopo de CADA humano:

```ts
export function advanceRoomWeek(room: Room): void {
  const humanTeamIds = room.players.map(p => p.teamId).filter((id): id is string => !!id);
  if (humanTeamIds.length === 0) return;
  const hostTeamId = getPlayer(room, room.ownerId)?.teamId ?? humanTeamIds[0];

  const trainingByTeam: Record<string, WeeklyTrainingPlan | null> = {};
  for (const id of humanTeamIds) {
    trainingByTeam[id] = (room.scopes[id]?.trainingPlan as WeeklyTrainingPlan | null | undefined) ?? null;
  }

  // 1. Carregar escopo do host e chamar advanceWeek (processa TODOS os humanos)
  loadScope(room, hostTeamId);
  room.store.getState().selectTeam(hostTeamId);
  const weekBefore = room.store.getState().currentWeek;
  const inboxByTeam = room.store.getState().advanceWeek(humanTeamIds, trainingByTeam) as Record<string, InboxMessage[]> | undefined;
  saveScope(room, hostTeamId);

  // 2. Para cada humano NÃO-host: carregar seu escopo, processar features single-track, salvar
  for (const hid of humanTeamIds) {
    if (hid === hostTeamId) continue;
    loadScope(room, hid);
    // Processar parcelas pendentes, missões de scout, fanMood, etc. para este humano
    // Extrair a lógica de advanceWeek que processa essas features e chamá-la aqui
    // OU simplesmente chamar uma versão "light" do advanceWeek que só processa o escopo
    saveScope(room, hid);
  }

  // 3. Distribuir inbox
  if (inboxByTeam) {
    for (const [teamId, messages] of Object.entries(inboxByTeam)) {
      if (teamId === hostTeamId) continue;
      for (const msg of messages) { pushInbox(room, teamId, msg); }
    }
  }

  const s = room.store.getState();
  if (s.currentWeek > weekBefore) {
    for (const p of room.players) p.ready = false;
  }
  if (s.seasonSummary || s.gameOver) room.status = 'finished';
}
```

2. O desafio principal: extrair de advanceWeek (core.ts) a lógica que processa features "single-track" (parcelas via pendingInstallments, bônus via incomingBonuses, scoutMissions, fanMood) para uma função separada `processWeeklyScopedFeatures(state, teamId)` que pode ser chamada por jogador. Ver o que advanceWeek faz com esses campos entre as linhas ~440-676 e extrair.

3. Alternativa mais simples se a extração for muito complexa: para cada humano não-host, fazer loadScope → selectTeam → chamar advanceWeek com apenas [hid] (um humano de cada vez) → saveScope. MAS isso requer que advanceWeek seja idempotente no avanço de semana (não avançar 2x). Verificar se advanceWeek tem guarda contra duplo avanço.

ARQUIVOS A MODIFICAR:
- backend/src/rooms/roomManager.ts
- backend/src/store/slices/core.ts (extrair função processWeeklyScopedFeatures se necessário)

ARQUIVOS DE REFERÊNCIA (não modificar):
- backend/src/store/storeHelpers.ts
- backend/src/types/game.ts (SCOPED_KEYS)

CRITÉRIO DE TESTE:
Sala com 2 jogadores. Jogador B (não-host) vende jogador parcelado. Avançar 4 rodadas → B recebeu as parcelas no orçamento e a missão de scout de B progrediu.
```

---

## Prompt C7 — Robustez dos controles da partida ao vivo (MatchCenter)

```
Você é um subagente de correção de bugs no projeto football-manager-web (TypeScript, React, Zustand).

PROBLEMA 1 — Loop ao vivo instável:
Em frontend/src/components/match/MatchCenter.tsx:354-366, o efeito do loop ao vivo:
```tsx
useEffect(() => {
  if (liveMatchWatching !== null && matches[liveMatchWatching]?.isLive) {
    const timer = setInterval(() => {
      const cur = useGameStore.getState().matches[liveMatchWatching];
      if (!cur || !cur.isLive) return;
      if (cur.liveMinute >= 45 && cur.liveMinute < 90 && !halfTimeResumedRef.current) return;
      generateLiveMatchMinute(liveMatchWatching);
    }, 2000 / matchSpeed);
    return () => clearInterval(timer);
  }
}, [liveMatchWatching, liveMatchWatching !== null ? matches[liveMatchWatching]?.isLive : false, matchSpeed, generateLiveMatchMinute]);
```
O array de dependências inclui `matches[liveMatchWatching]?.isLive` que muda a cada tick (o array matches é atualizado pelo store), fazendo o efeito re-executar e recriar o intervalo a cada mudança. Isso pode causar timers duplicados ou minutos pulando.

PROBLEMA 2 — Substituições permitem escolher jogador que não está em campo:
Em MatchCenter.tsx:297-299, o seletor "em campo" é:
```tsx
const onPitch = team.startingXI
  .map(id => team.squad.find(p => p.id === id))
  .filter((p): p is Player => !!p && !sentOff.includes(p.id));
```
Isso usa startingXI original e só desconta sentOff. Não desconta jogadores que já foram substituídos (saíram) nem inclui os que entraram.

TAREFA:
1. Estabilizar o loop ao vivo:
   - Guardar `liveMatchWatching` e um booleano `isLive` em estado próprio (já existe liveMatchWatching; adicionar isLiveLive como state separado atualizado explicitamente)
   - Usar `useRef` para o timer: `const timerRef = useRef<ReturnType<typeof setInterval>>`
   - O useEffect deve depender apenas de `[liveMatchWatching, isMatchLive, matchSpeed]` onde isMatchLive é um booleano estável
   - Dentro do intervalo, ler estado via `useGameStore.getState()` (já faz isso) mas NÃO depender do array `matches` no useEffect
   - Limpar o timer corretamente no cleanup

2. Derivar "em campo" do estado real da partida:
   - O backend reporta eventos de substituição e cartão vermelho nos MatchAction/MatchEvent
   - Em vez de calcular onPitch a partir do startingXI estático, calcular a partir dos eventos da partida ao vivo:
     - Começar com startingXI
     - Remover jogadores que foram substituídos (saíram)
     - Adicionar jogadores que entraram
     - Remover expulsos (cartão vermelho)
   - O componente LiveControls recebe `sentOff: string[]` — expandir para receber também `substitutedOut: string[]` e `substitutedIn: string[]`, ou passar o estado completo da partida para derivar dentro do componente

3. No backend (backend/src/store/slices/match.ts), validar substituição:
   - Recusar entrada de jogador lesionado ou expulso
   - Recusar saída de jogador que não está em campo (não está no startingXI nem entrou como substituto)
   - Hoje só valida o limite de 5 trocas — adicionar essas validações

ARQUIVOS A MODIFICAR:
- frontend/src/components/match/MatchCenter.tsx
- backend/src/store/slices/match.ts

ARQUIVOS DE REFERÊNCIA (não modificar):
- frontend/src/store/gameStore.ts (generateLiveMatchMinute, substitutePlayer)
- backend/src/types/game.ts (Match, MatchEvent, MatchAction, LiveMatchState)

CRITÉRIO DE TESTE:
Partida ao vivo com expulsão → o expulso não aparece no seletor "sai". Tentar via devtools substituir um expulso → backend recusa. Mudar a velocidade da partida não duplica o timer (sem minutos pulando).
```

---

## Prompt C8 — Dividir o TransferMarket.tsx (1.654 linhas) em subcomponentes

```
Você é um subagente de refatoração no projeto football-manager-web (TypeScript, React).

PROBLEMA:
frontend/src/components/transfer/TransferMarket.tsx tem 1.654 linhas — mercado, ofertas recebidas, negociação/contraproposta, parcelas, bônus, empréstimos, shortlist e relatórios de scout num componente só. Qualquer mudança arrisca quebrar outra aba, e re-render de qualquer pedaço re-renderiza tudo.

ESTRUTURA ATUAL (primeiras 70 linhas):
- Linhas 14-43: InstallmentClauseDisplay (componente interno)
- Linhas 45-65: PlayerBonusDisplay (componente interno)
- Linhas 67+: TransferAgreementDisplay (componente interno)
- Restante: componente TransferMarket principal com todas as abas/lógicas

TAREFA:
1. Extrair os componentes internos para arquivos próprios em frontend/src/components/transfer/:
   - InstallmentClauseDisplay.tsx (linhas 14-43 do original)
   - PlayerBonusDisplay.tsx (linhas 45-65 do original)
   - TransferAgreementDisplay.tsx (linhas 67+ do original)
   Cada um deve ser exportado como componente nomeado.

2. Extrair por responsabilidade SEM mudar comportamento:
   - OffersInbox.tsx — ofertas recebidas + respostas (aceitar/rejeitar/contraproposta)
   - NegotiationPanel.tsx — contraproposta/parcelas/bônus na negociação
   - LoanPanel.tsx — empréstimos
   - ShortlistPanel.tsx — shortlist e favoritos
   - MarketBrowser.tsx — busca/filtros/lista de jogadores do mercado

3. O componente TransferMarket.tsx pai deve:
   - Manter o estado (aba ativa, jogador selecionado, etc.) no componente-pai ou no store
   - Passar props para os filhos
   - Importar os subcomponentes extraídos
   - Meta: nenhum arquivo da pasta acima de ~400 linhas

4. Garantir que OnlineTransfers.tsx e Inbox possam reutilizar InstallmentClauseDisplay e PlayerBonusDisplay importando dos novos arquivos (em vez de duplicar).

ARQUIVOS A MODIFICAR:
- frontend/src/components/transfer/TransferMarket.tsx (reduzir para <400 linhas)
- frontend/src/components/transfer/InstallmentClauseDisplay.tsx (NOVO)
- frontend/src/components/transfer/PlayerBonusDisplay.tsx (NOVO)
- frontend/src/components/transfer/TransferAgreementDisplay.tsx (NOVO)
- frontend/src/components/transfer/OffersInbox.tsx (NOVO)
- frontend/src/components/transfer/NegotiationPanel.tsx (NOVO)
- frontend/src/components/transfer/LoanPanel.tsx (NOVO)
- frontend/src/components/transfer/ShortlistPanel.tsx (NOVO)
- frontend/src/components/transfer/MarketBrowser.tsx (NOVO)

ARQUIVOS DE REFERÊNCIA (não modificar):
- frontend/src/components/transfer/ScoutReportCard.tsx (já existe)
- frontend/src/components/online/OnlineTransfers.tsx (pode importar os novos componentes)
- frontend/src/types/game.ts (tipos)

CRITÉRIO DE TESTE:
Typecheck verde (npm run typecheck). Smoke test (npm run test:smoke) verde. Fluxo completo manual: buscar → ofertar → contraproposta → fechar com parcelas → conferir no financeiro. Nenhum arquivo da pasta transfer/ acima de ~400 linhas.
```

---

## Prompt C9 — Autosave + versionamento de saves

```
Você é um subagente de correção de bugs no projeto football-manager-web (TypeScript, Node.js).

PROBLEMA:
backend/src/services/saveService.ts tem 2 slots manuais em JSON puro, sem número de versão. Se o schema do estado mudar, o save antigo quebra o load sem mensagem útil. E como só existe save manual, um crash custa horas de jogo.

CÓDIGO ATUAL (saveService.ts completo — 51 linhas):
```ts
import { promises as fs } from 'fs';
import path from 'path';
import type { SaveSlot, SaveSlotMetadata } from '../types/game';

const SAVES_DIR = path.resolve(process.cwd(), 'saves');

async function ensureSavesDir(): Promise<void> {
  await fs.mkdir(SAVES_DIR, { recursive: true });
}

function slotFilePath(slotNumber: number): string {
  return path.join(SAVES_DIR, `save_slot_${slotNumber}.json`);
}

export async function persistSave(slot: SaveSlot): Promise<void> {
  await ensureSavesDir();
  const filePath = slotFilePath(slot.metadata.slotNumber);
  await fs.writeFile(filePath, JSON.stringify(slot, null, 2), 'utf-8');
}

export async function loadSaveFromDisk(slotNumber: 1 | 2): Promise<SaveSlot | null> {
  try {
    const filePath = slotFilePath(slotNumber);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as SaveSlot;
  } catch { return null; }
}

export async function deleteSaveFromDisk(slotNumber: 1 | 2): Promise<void> {
  try { await fs.unlink(slotFilePath(slotNumber)); } catch {}
}

export async function listSaveSlotsFromDisk(): Promise<SaveSlotMetadata[]> {
  await ensureSavesDir();
  const slots: SaveSlotMetadata[] = [];
  for (const slotNumber of [1, 2] as const) {
    const save = await loadSaveFromDisk(slotNumber);
    if (save) slots.push(save.metadata);
  }
  return slots;
}
```

TIPOS ATUAIS (types/saves.ts):
```ts
export interface SaveSlotMetadata {
  slotNumber: 1 | 2;
  teamName: string;
  currentWeek: number;
  savedAt: string;
}

export interface SaveSlot {
  metadata: SaveSlotMetadata;
  gameState: GameState;
}
```

TAREFA:
1. Em backend/src/types/saves.ts, adicionar `schemaVersion: number` ao SaveSlot e SaveSlotMetadata:
```ts
export const CURRENT_SCHEMA_VERSION = 1;

export interface SaveSlotMetadata {
  slotNumber: 1 | 2;  // Estender para incluir 0 (autosave)
  teamName: string;
  currentWeek: number;
  savedAt: string;
  schemaVersion: number;
}

export interface SaveSlot {
  metadata: SaveSlotMetadata;
  gameState: GameState;
  schemaVersion: number;
}
```

2. Em backend/src/services/saveService.ts:
   - Adicionar slot 0 (autosave, oculto da UI de saves manuais)
   - Mudar slotFilePath para aceitar 0 | 1 | 2
   - Adicionar função `autoSave(slot: SaveSlot)` que grava no slot 0
   - Adicionar função `loadAutoSave()` que carrega do slot 0
   - Em loadSaveFromDisk, adicionar etapa de migração:
```ts
const migrations: Record<number, (state: GameState) => GameState> = {
  // 1: (state) => ({ ...state, newField: defaultValue }),
};

function migrateGameState(state: GameState, fromVersion: number): GameState {
  let migrated = state;
  for (let v = fromVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    const migrator = migrations[v];
    if (migrator) migrated = migrator(migrated);
  }
  return migrated;
}
```
   - Se a versão do save for desconhecida (maior que CURRENT_SCHEMA_VERSION), lançar erro claro em vez de crashar

3. Em backend/src/store/slices/core.ts, no advanceWeek (ponto único de avanço), chamar autoSave após processar:
```ts
// No final do advanceWeek, antes do set() final ou após:
// Trigger autosave (não-bloqueante)
autoSave({ metadata: { slotNumber: 0, teamName: ..., currentWeek: newWeek, savedAt: new Date().toISOString(), schemaVersion: CURRENT_SCHEMA_VERSION }, gameState: newState, schemaVersion: CURRENT_SCHEMA_VERSION }).catch(() => {});
```

4. No frontend, adicionar opção "Continuar (Autosave)" na tela inicial que carrega do slot 0. Verificar onde a tela de saves/load está montada (provavelmente em App.tsx ou componente de menu inicial) e adicionar o botão.

5. Em listSaveSlotsFromDisk, NÃO incluir o slot 0 (é oculto).

ARQUIVOS A MODIFICAR:
- backend/src/types/saves.ts
- backend/src/services/saveService.ts
- backend/src/store/slices/core.ts (trigger autosave no advanceWeek)
- frontend/src/App.tsx ou componente de menu (botão "Continuar")

ARQUIVOS DE REFERÊNCIA (não modificar):
- backend/src/types/game.ts (GameState, SaveSlot)
- frontend/src/store/gameStore.ts (loadGame, saveGame)

CRITÉRIO DE TESTE:
Salvar, editar o JSON para uma versão antiga simulada, carregar → migração roda e o jogo abre. Matar o processo no meio da sessão → "Continuar" restaura a última semana avançada.
```

---

## Prompt C10 — Blindar `calculateTeamStrength` contra atributos ausentes (NaN)

```
Você é um subagente de correção de bugs no projeto football-manager-web (TypeScript, Node.js).

PROBLEMA:
calculateTeamStrength em backend/src/store/helpers/matchEngine.ts:39-71 acessa player.technical.passing etc. sem fallback. Um jogador com atributos parciais (save antigo, jogador mascarado por scouting, ou dado gerado incompleto) produz NaN, e NaN contamina silenciosamente o placar e as odds da partida inteira.

CÓDIGO ATUAL (matchEngine.ts:39-71):
```ts
export function calculateTeamStrength(team: Team): number {
  const starting11 = startingXI(team);
  let totalStrength = 0;

  starting11.forEach(player => {
    let sum = 0;
    let count = 0;

    if (player.technical) {
      [player.technical.passing, player.technical.technique, player.technical.finishing,
        player.technical.dribbling, player.technical.crossing].forEach(v => {
        if (v) { sum += v * 4; count++; }
      });
    }
    if (player.mental) {
      [player.mental.vision, player.mental.decisions, player.mental.composure,
        player.mental.anticipation, player.mental.positioning].forEach(v => {
        if (v) { sum += v * 5; count++; }
      });
    }
    if (player.physical) {
      [player.physical.speed, player.physical.stamina, player.physical.strength,
        player.physical.agility, player.physical.acceleration].forEach(v => {
        if (v) { sum += v * 3; count++; }
      });
    }

    const playerStrength = (player.currentAbility * 0.6 + (sum / Math.max(count, 1)) * 5.5) * 1.2;
    totalStrength += playerStrength * (player.form / 100) * (player.fitness / 100) * getMoraleFactor(player);
  });

  return (totalStrength / Math.max(starting11.length, 1)) * (1 + getTacticalBonus(team));
}
```

O problema: `if (v)` é truthy para 0 mas falsy para undefined/null. No entanto, se `player.technical` existe mas `passing` é undefined, `v` é undefined e é pulado — MAS se `currentAbility` é undefined, `player.currentAbility * 0.6` = NaN. Se `form` ou `fitness` é undefined, `form / 100` = NaN. O `if (v)` não protege esses campos.

TAREFA:
1. Criar um helper `attr()` no início do matchEngine.ts:
```ts
function attr(value: number | undefined | null, fallback = 10): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
```

2. Substituir TODOS os acessos de atributos em calculateTeamStrength por chamadas a attr():
```ts
if (player.technical) {
  [attr(player.technical.passing), attr(player.technical.technique), ...].forEach(v => {
    sum += v * 4; count++;  // agora sempre soma (não precisa de if(v))
  });
}
```

3. Proteger currentAbility, form, fitness:
```ts
const ca = attr(player.currentAbility, 50);
const form = attr(player.form, 50);
const fitness = attr(player.fitness, 50);
const playerStrength = (ca * 0.6 + (sum / Math.max(count, 1)) * 5.5) * 1.2;
totalStrength += playerStrength * (form / 100) * (fitness / 100) * getMoraleFactor(player);
```

4. Adicionar guarda no resultado final:
```ts
const result = (totalStrength / Math.max(starting11.length, 1)) * (1 + getTacticalBonus(team));
if (!Number.isFinite(result)) {
  console.warn(`[calculateTeamStrength] NaN detected for team ${team.id} (${team.name}). Using fallback 50.`);
  return 50;
}
return result;
```

5. Revisar outros consumidores de atributos no mesmo arquivo (simulateFullMatch, calculatePlayerMatchRatings, etc.) e aplicar o mesmo helper attr() onde acessam player.technical.*, player.mental.*, player.physical.*, player.currentAbility, player.form, player.fitness.

6. Verificar getMoraleFactor(player) — se acessa campos que podem ser undefined, proteger também.

7. Criar teste unitário em backend/src/tests/ (padrão vitest já existe no projeto):
```ts
import { describe, it, expect } from 'vitest';
import { calculateTeamStrength } from '../store/helpers/matchEngine';
import type { Team, Player } from '../types/game';

describe('calculateTeamStrength — NaN guard', () => {
  it('returns finite value for player without physical block', () => {
    const player: Partial<Player> = {
      id: 'test1',
      currentAbility: 60,
      form: 80,
      fitness: 90,
      technical: { passing: 50, technique: 50, finishing: 50, dribbling: 50, crossing: 50 },
      mental: { vision: 50, decisions: 50, composure: 50, anticipation: 50, positioning: 50 },
      // physical: undefined — simula save antigo ou dado incompleto
    };
    const team: Partial<Team> = {
      id: 'test-team',
      name: 'Test FC',
      startingXI: ['test1'],
      squad: [player as Player],
    };
    const strength = calculateTeamStrength(team as Team);
    expect(Number.isFinite(strength)).toBe(true);
    expect(strength).toBeGreaterThan(0);
    expect(strength).toBeLessThan(200);
  });
});
```

ARQUIVOS A MODIFICAR:
- backend/src/store/helpers/matchEngine.ts
- backend/src/tests/ (novo arquivo de teste)

ARQUIVOS DE REFERÊNCIA (não modificar):
- backend/src/types/game.ts (tipos Team, Player)

CRITÉRIO DE TESTE:
Rodar o novo teste + headless_sim.ts numa temporada completa sem nenhum NaN em placares/ratings.
```
