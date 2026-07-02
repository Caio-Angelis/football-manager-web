# Plano Online — Multiplayer por Sala (checklist passo a passo)

> Objetivo: criar salas com **código de entrada**, vários humanos no **mesmo universo**
> (mesma liga), onde é possível **comprar jogador um do outro** e **se enfrentar**.
>
> Modo alvo do MVP (decisões travadas):
> - **Partida humano × humano:** SIMULADA no servidor (reaproveita `simulateFullMatch`); o relatório pós-jogo aparece para os dois. (Ao vivo PvP fica como evolução futura — Fase 10.)
> - **Avanço de rodada:** READY-CHECK (a rodada só fecha quando todos os humanos marcam "pronto").
> - **Persistência/identidade:** salas em MEMÓRIA no servidor; jogador identificado por **token + apelido** (sem contas/login). (Banco de dados = Fase 10.)
>
> Regra de ouro: **o modo single-player atual não pode quebrar.** Todo o online é aditivo.
> Faça os itens **na ordem**. Ao fim de cada Fase há um "✅ Como testar".

---

## 📊 Status (atualizado)

| Fase | Descrição | Situação |
|------|-----------|----------|
| 0 | Fábrica de store + `playerId` | ✅ Concluída |
| 1 | Salas e lobby (código) | ✅ Concluída |
| 2 | Estado por sala + roteamento de ações | ✅ Concluída |
| 3 | Iniciar jogo + draft de clubes | ✅ Concluída |
| 4 | Contexto por request (foco + denylist + anti-trapaça) | ✅ Concluída |
| 5 | Ready-check + `advanceWeek` multi-humano + estado por jogador (swap de escopo) | ✅ Concluída |
| 6 | Projeção escopada (não vazar rivais) | ✅ Concluída |
| 7 | Transferências entre humanos | ⬜ Pendente |
| 8 | Partidas humano × humano (relatório para os dois) | ⬜ Pendente |
| 9 | Robustez: reconexão/desconexão | 🟡 Parcial (heartbeat + auto-pronto de desconectado já existem; reentrar/encerrar sala pela UI pendentes) |
| 10 | Evoluções futuras (PvP ao vivo, DB/contas, escala) | ⬜ Fora do MVP |

**MVP jogável hoje:** criar sala por código → entrar → dono inicia → draft de clubes → todos jogam no mesmo universo, cada um com seu estado (inbox/scouting/finanças/treino), rivais mascarados, rodada fechada por ready-check com todas as partidas simuladas. Tudo verificado por API ponta a ponta; single-player intacto (typecheck limpo, 16 testes passando).

**Limitações conhecidas do MVP:** (a) transferências entre humanos ainda usam a lógica de IA (Fase 7); (b) não há tela dedicada de resultado humano×humano além do relatório de partida existente (Fase 8); (c) o processamento **automático semanal** de parcelas/bônus/scout/torcida roda no escopo do host (acesso interativo é 100% por jogador); (d) sem persistência — reiniciar o servidor apaga as salas (Fase 10).

---

## Legenda
- `[ ]` = tarefa a fazer.
- **Arquivo:** caminho relativo à raiz do projeto.
- Blocos de código são **esboços ilustrativos** (adapte nomes/tipos ao seu código real).

---

## FASE 0 — Preparação: transformar o store global em fábrica + identidade do jogador

Hoje o backend tem **um** store global (`create<GameStore>()`) e o `selectedTeam` é singular.
Antes de qualquer sala, precisamos poder criar **um store por sala**.

- [x] **Confirmar como o store é criado hoje.**
  - **Arquivo:** `backend/src/store/gameStore.ts`
  - Era `export const useGameStore = create<GameStore>()(...)` (singleton, binding React do `zustand`). Consumido só via `.getState()/.setState()` em `routes/game.ts`, `slices/saves.ts` e testes.

- [x] **Extrair uma fábrica `createGameStore()`.**
  - **Arquivo:** `backend/src/store/gameStore.ts`
  - Use `createStore` do `zustand/vanilla` (já é dependência) em vez do singleton.
  - Esboço:
    ```ts
    import { createStore } from 'zustand/vanilla';
    export function createGameStore() {
      return createStore<GameStore>()((set, get) => ({
        ...initialState,            // o mesmo estado inicial de hoje
        ...createCoreSlice(set, get),
        ...createMatchSlice(set, get),
        // ... os 14 slices, igual hoje
      }));
    }
    // Mantém o singleton p/ o modo single-player não quebrar:
    export const gameStore = createGameStore();
    export type GameStoreApi = ReturnType<typeof createGameStore>;
    ```
  - **Onde isso é usado hoje:** `backend/src/routes/game.ts` importa o store. Deixe o single-player usando `gameStore` (o singleton) por enquanto.
  - ✅ Feito: passou a usar `createStore` do `zustand/vanilla`; exporta `createGameStore()`, `gameStore` e `useGameStore` (alias do singleton, mantém rotas/testes intactos) + tipo `GameStoreApi`.

- [x] **Gerar um `playerId` estável no cliente.**
  - **Arquivo:** `frontend/src/api/client.ts` (ou um novo `frontend/src/online/identity.ts`)
  - Ao carregar, se não existir, cria e salva em `localStorage`:
    ```ts
    export function getPlayerId(): string {
      let id = localStorage.getItem('fm-player-id');
      if (!id) { id = crypto.randomUUID(); localStorage.setItem('fm-player-id', id); }
      return id;
    }
    ```
  - ✅ Feito: `getPlayerId()` adicionado em `frontend/src/api/client.ts`.

✅ **Como testar a Fase 0:** rode `npm run dev` na raiz; o jogo single-player deve funcionar **exatamente** como antes. `getPlayerId()` retorna sempre o mesmo id no mesmo navegador.

---

## FASE 1 — Salas e Lobby (sem gameplay ainda)

Criar/entrar em sala por código e ver quem está dentro. Nada de clubes ainda.

- [x] **Criar o módulo de salas (backend).** ✅ `backend/src/rooms/roomManager.ts` (Room/RoomPlayer, `createRoom`/`joinRoom`/`getRoom`/`touch`/`toPublicRoom`, `genCode`). A projeção `toPublicRoom` é relativa ao solicitante e **nunca** expõe o `playerId` alheio.
  - **Arquivo novo:** `backend/src/rooms/roomManager.ts`
  - Estruturas:
    ```ts
    import { createGameStore, type GameStoreApi } from '../store/gameStore';

    export interface RoomPlayer {
      playerId: string;
      nickname: string;
      teamId: string | null;   // definido no draft (Fase 3)
      ready: boolean;          // ready-check (Fase 5)
      connected: boolean;
      lastSeen: number;
    }
    export interface Room {
      code: string;
      ownerId: string;
      status: 'lobby' | 'drafting' | 'playing' | 'finished';
      players: RoomPlayer[];
      store: GameStoreApi;     // universo isolado da sala
      createdAt: number;
    }

    const rooms = new Map<string, Room>();

    function genCode(): string {
      // 6 chars, sem 0/O/1/I p/ evitar confusão
      const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let c = '';
      do { c = Array.from({length:6}, () => alpha[Math.floor(Math.random()*alpha.length)]).join(''); }
      while (rooms.has(c));
      return c;
    }

    export function createRoom(ownerId: string, nickname: string): Room {
      const room: Room = {
        code: genCode(), ownerId, status: 'lobby',
        players: [{ playerId: ownerId, nickname, teamId: null, ready: false, connected: true, lastSeen: Date.now() }],
        store: createGameStore(), createdAt: Date.now(),
      };
      rooms.set(room.code, room);
      return room;
    }
    export function getRoom(code: string): Room | undefined { return rooms.get(code?.toUpperCase()); }
    export function joinRoom(code: string, playerId: string, nickname: string): Room | null {
      const room = getRoom(code); if (!room || room.status !== 'lobby') return null;
      if (!room.players.find(p => p.playerId === playerId))
        room.players.push({ playerId, nickname, teamId: null, ready: false, connected: true, lastSeen: Date.now() });
      return room;
    }
    ```
  - **ponytail:** `Map` em memória é suficiente pro MVP. Banco = Fase 10.

- [x] **Limpeza de salas abandonadas (evita vazar memória).** ✅ `setInterval` (5min) marca jogadores sem heartbeat (1min) como desconectados e remove salas vazias/expiradas (TTL 6h); `.unref()` p/ não segurar o processo.
  - **Arquivo:** `backend/src/rooms/roomManager.ts`
  - `setInterval` a cada ~5 min removendo salas com `createdAt` muito antigo e sem jogadores conectados. Espelhe o padrão que já existe em `backend/src/middleware/rateLimiter.ts` (que já faz cleanup periódico).

- [x] **Criar as rotas de sala (backend).** ✅ `backend/src/routes/rooms.ts` montado em `/api/rooms` no `server.ts`. Identidade via header `x-player-id` (validado como UUID com Zod); apelido validado (1–20). Endpoints: `POST /`, `POST /:code/join`, `GET /:code`. Testado via curl: create/join/get, `isYou`/`isOwner` corretos, 400 sem header, 404 código inválido.
  - **Arquivo novo:** `backend/src/routes/rooms.ts` (registre no `backend/src/server.ts` junto das outras rotas)
  - Identidade via header `x-player-id` (leia num pequeno middleware ou inline).
  - Endpoints:
    - `POST /api/rooms` → body `{ nickname }`, header `x-player-id` → cria sala → `{ code }`
    - `POST /api/rooms/:code/join` → body `{ nickname }` → entra → `{ ok, room: publicRoom }`
    - `GET  /api/rooms/:code` → estado público da sala (para polling do lobby)
  - **`publicRoom`**: só metadados (código, status, lista de `{nickname, teamId, ready, connected}` e quem é o dono). **Nunca** mande o `store` inteiro aqui.
  - Valide `code`/`nickname` com Zod em `backend/src/validation/schemas.ts` (siga o padrão dos schemas existentes: `zString`, etc.).

- [x] **Aba "Online" no frontend + telas de lobby.** ✅ Rotas `/online` e `/online/sala/:code` no `App.tsx` (ramo sem `selectedTeam`) + botão "Jogar online" na home. `OnlineHome.tsx` (criar/entrar com apelido salvo em localStorage) e `Lobby.tsx`. Helpers `createRoom`/`joinRoom`/`getRoom` em `client.ts` (mandam header `x-player-id`). Botão "Iniciar" aparece só p/ o dono, desabilitado até a Fase 3.
  - **Arquivo:** `frontend/src/App.tsx` — adicione rota `/online` e um item/entrada para ela (fora do fluxo que exige `selectedTeam`).
  - **Arquivos novos:**
    - `frontend/src/components/online/OnlineHome.tsx` — dois botões: **Criar sala** / **Entrar com código** + campo de apelido.
    - `frontend/src/components/online/Lobby.tsx` — mostra o código da sala (para compartilhar), lista de jogadores, botão **Iniciar** (só habilitado para o dono).
  - **Arquivo:** `frontend/src/api/client.ts` — helpers novos: `createRoom(nickname)`, `joinRoom(code, nickname)`, `getRoom(code)`. Todos mandam header `x-player-id: getPlayerId()`.

- [x] **Polling do lobby (sem WebSocket no MVP).** ✅ `Lobby.tsx` faz `getRoom(code)` a cada 2s (serve de heartbeat) e reingressa automaticamente com o apelido salvo se você abrir a URL direto.
  - **Arquivo:** `Lobby.tsx` — `setInterval` de ~2s chamando `getRoom(code)` para atualizar a lista de jogadores e o `status`. (Padrão já usado no `MatchCenter` com `setInterval`.)
  - **ponytail:** polling de 2s no lobby é suficiente; WebSocket só se a latência incomodar.

✅ **Como testar a Fase 1:** abra dois navegadores (ou um anônimo). Num, "Criar sala" → aparece o código. No outro, "Entrar com código" → os dois veem a lista de jogadores atualizando. Single-player continua funcionando.

---

## FASE 2 — Estado por sala + roteamento de ações

Fazer as ações do jogo rodarem no store **da sala**, não no global.

- [x] **Rota de ação escopada por sala.** ✅ Extraí `extractState`/`runAction` para `backend/src/store/storeHelpers.ts` (usado pelo single-player E pelas salas); `game.ts` foi refatorado para usá-los. `POST /api/rooms/:code/action` executa no `room.store`. Já chama `focusTeam` (foco no time do solicitante) — trazido da Fase 4 para o jogo ser jogável por time.
  - **Arquivo:** `backend/src/routes/rooms.ts`
  - `POST /api/rooms/:code/action` → body `{ action, args }`, header `x-player-id`.
  - Reutilize a MESMA lógica do `POST /api/action` de hoje (`backend/src/routes/game.ts`), mas:
    1. `const room = getRoom(code)` (404 se não existir).
    2. `const store = room.store` (em vez do singleton).
    3. Auto-discover das actions, validação Zod, `fn.apply(store, args)` — **igual hoje**, só mudando de qual store.
  - **Dica de refatoração:** extraia a função "executar ação num store" de `game.ts` para um helper compartilhado e use tanto no single-player quanto no online.

- [x] **Rota de estado escopada por sala.** ✅ `GET /api/rooms/:code/state` foca no time do solicitante e retorna `extractState(room.store)` (rivais já mascarados pelo scouting; projeção completa = Fase 6).
  - **Arquivo:** `backend/src/routes/rooms.ts`
  - `GET /api/rooms/:code/state` header `x-player-id` → por enquanto retorne o estado completo do `room.store` (a **projeção escopada** vem na Fase 6).

- [x] **Cliente online no frontend.** ✅ `client.ts`: `setActiveRoom/clearActiveRoom/getActiveRoom` + `apiAction` roteia automaticamente para `/rooms/:code/action` quando há sala ativa (todas as mutations existentes passam a funcionar online sem mudança). Helpers `startRoom/pickTeam/beginRoom/apiRoomState`. `gameStore.ts`: `syncFromResponse` força `selectedTeam = meu time` no modo online.
  - **Arquivo:** `frontend/src/api/client.ts`
  - `apiRoomAction(code, action, args)` e `apiRoomState(code)` — iguais aos `apiAction`/`apiGet`, mas na URL da sala e com header `x-player-id`.
  - **Arquivo:** `frontend/src/store/gameStore.ts` (thin client)
  - Adicione um "modo": se houver `roomCode` ativo, as mutations chamam `apiRoomAction(roomCode, ...)` e o sync usa `apiRoomState(roomCode)`. Se não, mantém o comportamento single-player atual.

✅ **Como testar a Fase 2:** dentro de uma sala, dispare uma ação simples (ex.: `initGame` via botão do dono na Fase 3) e confirme que o estado muda **só** naquela sala (crie 2 salas e verifique isolamento).

---

## FASE 3 — Iniciar o jogo + Draft de clubes

O dono inicia → gera os clubes → cada humano escolhe um.

- [x] **Adicionar dono ao time.** ✅ `ownerId?: string | null` em `backend/src/types/team.ts` e espelhado em `frontend/src/types/game.ts`.
  - **Arquivo:** `backend/src/types/team.ts`
  - Novo campo: `ownerId?: string | null;` (`null`/ausente = controlado pela IA).
  - **Arquivo:** `frontend/src/types/game.ts` — espelhe o campo.

- [x] **Dono inicia a sala.** ✅ `POST /:code/start` (só dono) → `startGame()` roda `initGame()` (20 clubes, todos sem dono) e vira `drafting`. Testado.
  - **Arquivo:** `backend/src/routes/rooms.ts`
  - `POST /api/rooms/:code/start` (só o `ownerId`): chama `room.store.getState().initGame()` (gera os 20 clubes reais) e muda `room.status = 'drafting'`.
  - Garanta que TODOS os times comecem com `ownerId = null`.

- [x] **Escolher clube (draft).** ✅ `POST /:code/pick` seta `team.ownerId` + `roomPlayer.teamId`, libera o clube anterior ao trocar, e **rejeita com 409** se o clube já tem dono (corrida testada). `POST /:code/begin` (só dono) exige que todos tenham escolhido → `playing`.
  - **Arquivo:** `backend/src/routes/rooms.ts`
  - `POST /api/rooms/:code/pick` → body `{ teamId }`, header `x-player-id`.
    - Rejeita se o time já tem dono (corrida entre dois cliques simultâneos — trate aqui, é o primeiro ponto de concorrência real).
    - Seta `team.ownerId = playerId` (via `room.store`) e `roomPlayer.teamId = teamId`.
  - Quando todos os `players` tiverem `teamId`, o dono pode chamar `POST /api/rooms/:code/begin` → `room.status = 'playing'`.

- [x] **Tela de draft (frontend).** ✅ `DraftScreen.tsx` (grid de clubes, marca escolhidos com apelido, destaca o meu, desabilita ocupados) + `RoomView.tsx` orquestra polling e ramifica lobby→draft→jogo. Ao virar `playing`, faz `setActiveRoom` + carrega o estado da sala + `selectedTeam = meu time` e entra nas telas normais (`/dashboard`). `Lobby.tsx` virou apresentacional; botão "Voltar" no shell sai da sala sem tocar no universo.
  - **Arquivo novo:** `frontend/src/components/online/DraftScreen.tsx`
  - Reaproveite o visual de `frontend/src/components/TeamSelection.tsx`, mas:
    - Lista os clubes da sala; marca os já escolhidos (com o apelido do dono) e desabilita.
    - Polling ~2s para ver escolhas dos outros.
  - Ao entrar em `status: 'playing'`, redirecione para as telas normais do jogo (Elenco, Táticas, etc.), agora apontando para o estado da sala.

✅ **Como testar a Fase 3:** dono inicia → clubes aparecem → cada navegador escolhe um clube diferente; tentar pegar o mesmo clube ao mesmo tempo → só um consegue.

---

## FASE 4 — Contexto do jogador por request (o truque que faz os slices funcionarem)

O código single-player inteiro filtra por `state.selectedTeam` (lesões, treino, finanças, imprensa, promessas…). Em vez de reescrever os 14 slices, **defina o `selectedTeam` do store da sala para o time do jogador que fez a request, antes de executar a ação.**

- [x] **Resolver o time do jogador e "focar" o store antes da ação.** ✅ Feito na Fase 2/3 (`focusTeam` nas rotas `/action` e `/state`).
  - **Arquivo:** `backend/src/routes/rooms.ts` (na rota `/action`)
  - Antes de `fn.apply(store, args)`:
    ```ts
    const rp = room.players.find(p => p.playerId === playerId);
    if (!rp?.teamId) return res.status(403).json({ error: 'Jogador sem time' });
    store.getState().selectTeam(rp.teamId); // seta state.selectedTeam = time do jogador
    ```
  - Assim, ações "por jogador" (ajustar tática, treino, comprar jogador, escalar) já operam no time certo, sem tocar nos slices.

- [x] **Bloquear ações que não são "por jogador" nessa rota.** ✅ `ROOM_FORBIDDEN_ACTIONS` (advanceWeek, startNextSeason, initGame, selectTeam, deselectTeam, saveGame, loadGame, deleteSave) → 403. Testado.
  - **Arquivo:** `backend/src/routes/rooms.ts`
  - `advanceWeek`, `startNextSeason`, `initGame` **não** podem ser chamadas por um jogador individual online. Crie uma allowlist/denylist de actions permitidas via `/action` (as globais têm fluxo próprio na Fase 5).

- [x] **Validar que a ação afeta só o próprio time.** ✅ `updateTeam` na rota online rejeita (403) `teamId` ≠ time do jogador. Testado. (Dívida: trocar `updateTeam` por ações granulares no futuro — Fase 10.)
  - **Atenção ao `updateTeam`:** hoje ele recebe o **objeto time inteiro do cliente** (vetor de trapaça). Na rota online, rejeite `updateTeam` cujo `teamId` ≠ time do jogador. (Idealmente, no futuro, substituir `updateTeam` por ações granulares — anote como dívida.)

✅ **Como testar a Fase 4:** dois jogadores na mesma sala ajustam táticas/treino ao mesmo tempo; cada um só altera o próprio time. Tente (via devtools) mandar `updateTeam` de outro time → deve ser rejeitado.

---

## FASE 5 — Rodada coordenada (ready-check) + `advanceWeek` multi-time

Este é o coração do multiplayer e a maior mudança de gameplay.

- [x] **Ready-check por jogador.** ✅ `POST /:code/ready` (alterna/seta) + `toPublicRoom` expõe `ready` por jogador e `currentWeek`. Frontend: botão "Continuar" vira "Pronto? (X/Y)" no modo online.
  - **Arquivo:** `backend/src/routes/rooms.ts`
  - `POST /api/rooms/:code/ready` → alterna `roomPlayer.ready`.
  - `GET /api/rooms/:code` deve expor quantos estão prontos (para a UI).

- [x] **Fechar a rodada quando todos prontos.** ✅ `advanceRoomWeek(room)` dispara automaticamente quando o último jogador fica pronto (`allPlayersReady`); foca o time do host (features single-track), chama `advanceWeek(humanTeamIds)`, zera os "prontos"; fim de temporada → `finished`. Testado (2 jogadores, 3 rodadas).
  - **Arquivo:** `backend/src/rooms/roomManager.ts` (função `advanceRoomWeek(room)`)
  - Quando todos os `players` com `teamId` estiverem `ready`:
    1. Chame `room.store.getState().advanceWeek()` (ver adaptação abaixo).
    2. Zere `ready` de todos.
  - Dispare isso ao receber o último "ready", ou via `POST /api/rooms/:code/advance` do dono.

- [x] **Adaptar `advanceWeek` para vários humanos (a parte pesada).** ✅ `advanceWeek(humanTeamIds?)` — online processa finanças, fadiga/cura/lesões/contrato, promessas, treino e snapshots para CADA time humano (loops in-place, preservando a ordem do single-player); bloqueio-por-lesão-no-XI desligado online; TODAS as partidas simuladas no fechamento (nada pendente; `finalizePendingUserMatch` pulado online p/ não jogar 2x). Testado: 20 times jogam 1 partida/rodada, orçamento de ambos os humanos processado.
  - **Arquivo:** `backend/src/store/slices/core.ts`
  - Hoje `advanceWeek` faz o processamento semanal **apenas para `state.selectedTeam`** (finanças, treino, fadiga, cura, lesões, moral, parcelas, bônus, inbox).
  - Mude para processar **todos os times com `ownerId != null`** (os humanos), além da IA para os demais:
    - Extraia o "processamento semanal de um time do usuário" para uma função pura `processHumanTeamWeek(team, state)` e rode num loop sobre todos os times humanos.
    - Os helpers já são por-time (`applyFatigueDecayToPlayer`, `healInjuryForPlayer`, `updatePlayerAttributes`, `applyWeeklyMoraleDynamics`) — reutilize.
    - **Bloqueio por lesão no XI:** hoje bloqueia o avanço se o time do usuário tem lesionado no XI. Online: **não** bloquear a rodada inteira por causa de um jogador; em vez disso, auto-substituir/auto-simular o time daquele jogador (senão um jogador trava todos). Decida a regra e documente.
    - **Parcelas/bônus/inbox:** hoje só do `selectedTeam`. Faça por-humano (cada um tem seu inbox/parcelas — ver Fase 6 sobre onde guardar isso por jogador).
  - **Partidas do usuário:** hoje a do usuário fica pendente para jogar ao vivo. Online (MVP simulado): ver Fase 8 — todas as partidas (inclusive humano×humano) são simuladas no fechamento da rodada.

- [x] **Estado "por jogador" que hoje é global.** ✅ Resolvido via **swap de escopo por-request** (sem reescrever slices): `Room.scopes[teamId]` guarda os campos por-jogador (`SCOPED_KEYS`: inbox, trainingPlan, parcelas, bônus, ofertas recebidas/contra/adiadas, scouting completo, shortlist, boardReplies/Satisfaction, financialReports, recomendações, sessões de prevenção, degradedConditions, fanMood, mediaPressure, biddingWars, activeLoans). As rotas fazem `loadScope` antes e `saveScope` depois. No avanço, cada humano treina pelo SEU plano (`trainingByTeam`). Testado: shortlist de P1 isolada de P2 e persistente após a rodada. **Nota:** o processamento automático semanal de parcelas/bônus/scout/torcida ainda roda no escopo do host; o acesso interativo é totalmente por-jogador. Migração completa desses no avanço = refinamento futuro.
  - **Problema:** `inbox`, `pendingInstallments`, `incomingBonuses`, `incomingTransfers`, `scoutMissions`, `scoutKnowledge`, `shortlist`, etc. são campos **globais** do `GameState`, assumindo 1 humano.
  - **Decisão de MVP (mais simples):** transforme-os em mapas por jogador, ex.: `inboxByTeam: Record<teamId, InboxMessage[]>`. Comece pelos que a UI online realmente usa (inbox, parcelas, transferências recebidas) e migre incrementalmente.
  - **Onde:** `backend/src/types/game.ts` (GameState) + os slices que leem/escrevem esses campos. Grande, mas incremental (um campo por vez).

✅ **Como testar a Fase 5:** 2 jogadores, ambos marcam "pronto" → a semana avança para os dois; a tabela reflete as partidas de todos; finanças/treino de cada humano são processados. Um jogador sozinho não avança a rodada.

---

## FASE 6 — Projeção de estado escopada (não vazar info dos rivais)

Hoje `/state` devolve o estado inteiro. Online, cada jogador só pode ver o público + o seu.

- [x] **Função de projeção por jogador.** ✅ `projectState(room, myTeamId)` em `roomManager.ts`: usa `extractState` (atributos de rivais já mascarados por scouting) e depois oculta os campos sensíveis dos rivais (`budget`, `wageBill`, `scouts` e, por jogador, `salary/morale/fitness/form`). O estado por-jogador (inbox/scouting/parcelas/...) já vem do escopo carregado. Jogadores rivais continuam com `marketValue`/posição/idade visíveis (contratáveis).
  - **Arquivo novo:** `backend/src/rooms/projectState.ts`
  - `projectStateForPlayer(room, playerId)` retorna:
    - **Público:** `teams` (mas sem dados internos sensíveis dos rivais — ex.: esconder scouting/knowledge, moral individual, planos de treino), `matches`, `leagueTable`, `currentWeek`, `seasonSummary`.
    - **Privado (só do time do jogador):** `inboxByTeam[meuTime]`, `pendingInstallments` do meu time, `scoutKnowledge` meu, finanças detalhadas, `trainingPlan` meu.
  - **Regra:** jogadores contratáveis de outros times **devem** aparecer (para poder comprar), mas atributos ocultos/knowledge seguem o sistema de scouting já existente (`maskPlayerAttributes`).

- [x] **Usar a projeção nas respostas.** ✅ `GET /:code/state` e `POST /:code/action` retornam `projectState(room, myTeamId)`. Testado: P1 vê o próprio budget (57.2) mas budget do rival = 0 (nos dois sentidos); marketValue do rival continua visível.
  - **Arquivo:** `backend/src/routes/rooms.ts`
  - `GET /api/rooms/:code/state` e o `{ result, state }` do `/action` devem retornar `projectStateForPlayer(...)`, não o estado bruto.

- [x] **Frontend lida com estado parcial.** ✅ Campos ocultos vêm zerados (não `undefined`), então os getters/telas não quebram; `tacticsConfig` do rival preservado de propósito para evitar crash na análise de adversário.
  - **Arquivo:** `frontend/src/store/gameStore.ts`
  - Garanta que os getters/telas não quebrem quando campos de rivais vierem mascarados/ausentes.

✅ **Como testar a Fase 6:** jogador A não consegue ver finanças/scouting de B (verifique no payload da rede), mas vê a tabela, os resultados e os jogadores de B disponíveis no mercado.

---

## FASE 7 — Transferências entre humanos

Comprar jogador de outro humano precisa de negociação **assíncrona entre pessoas** (não a IA).

- [ ] **Detectar alvo humano vs IA na oferta.**
  - **Arquivo:** `backend/src/store/slices/transfer.ts`
  - Ao fazer oferta por um jogador cujo time tem `ownerId != null` (humano), **não** use a lógica de aceitação automática da IA. Em vez disso, crie uma **oferta pendente** endereçada ao dono daquele time.

- [ ] **Fila de ofertas recebidas por humano.**
  - **Arquivo:** `backend/src/types/transfer.ts` + `game.ts` (GameState)
  - Reaproveite/estenda `IncomingTransfer`, mas com `fromTeam` sendo outro humano e destino = inbox do humano-alvo (`inboxByTeam`, da Fase 5/6).
  - O humano-alvo **aceita/recusa/contra-propõe** com o fluxo que já existe (`acceptIncomingTransfer`, `negotiateCounterOffer`) — mas o "outro lado" agora é uma pessoa, então a resposta volta como nova oferta pendente para o comprador.

- [ ] **Concorrência.**
  - Bloqueie duas ofertas simultâneas fechando no mesmo jogador (trave o jogador enquanto uma negociação humano×humano está aberta, ou resolva na ordem de chegada). Este é o segundo ponto de corrida (o primeiro foi o draft).

- [ ] **Parcelas entre humanos.**
  - As parcelas já têm `direction: 'payable' | 'receivable'`. Ao fechar entre humanos: comprador recebe cláusula `payable`, vendedor `receivable`. O processamento semanal (Fase 5) credita/debita cada lado. (Isso já está correto no motor atual — só precisa rodar por-humano.)

✅ **Como testar a Fase 7:** A faz oferta por jogador de B → aparece no inbox de B → B aceita → jogador troca de time, dinheiro sai de A e entra em B (à vista ou em parcelas ao longo das semanas).

---

## FASE 8 — Partidas humano × humano (SIMULADAS no MVP)

- [ ] **Gerar o calendário com confrontos entre humanos.**
  - **Arquivo:** `backend/src/store/helpers/matchEngine.ts` (`generateWeekMatches`) — já pareia os 20 times; nada especial a fazer além de garantir que times humanos se enfrentem normalmente.

- [ ] **Simular todas as partidas no fechamento da rodada.**
  - **Arquivo:** `backend/src/store/slices/core.ts` (dentro do `advanceWeek` multi-time da Fase 5)
  - No MVP, **não há partida ao vivo** para ninguém online: toda partida (IA×IA, humano×IA, humano×humano) é resolvida com `simulateFullMatch` no fechamento da rodada.
  - Guarde o `postMatchReport` e `playerRatings` para AMBOS os humanos verem.

- [ ] **Tela de resultado pós-rodada para os dois.**
  - **Arquivo:** `frontend/src/components/match/MatchCenter.tsx` / `PostMatchReportView.tsx`
  - Após a rodada fechar, cada humano vê o relatório da sua partida (já existe o componente; só alimentar com o resultado da sala).

- [ ] **(Opcional MVP+) Táticas valem para a simulação.**
  - Como a partida é simulada, as escolhas de tática/escalação/bolas paradas de cada humano **já entram** no motor (`tacticsConfig`, `startingXI`). Garanta que estão salvas antes do "ready".

✅ **Como testar a Fase 8:** A e B se enfrentam na rodada; ambos marcam pronto; a rodada fecha; os dois veem o mesmo placar e cada um vê seu relatório. Mudar a tática antes de "pronto" muda o resultado.

---

## FASE 9 — Robustez: reconexão, desconexão e limpeza

- [ ] **Heartbeat / connected.**
  - **Arquivo:** `backend/src/routes/rooms.ts`
  - Atualize `roomPlayer.lastSeen` a cada request; marque `connected=false` se ficar muito tempo sem aparecer (o polling já serve de heartbeat).

- [ ] **Jogador que caiu não trava a rodada.**
  - No ready-check (Fase 5), considere jogador `connected=false` como "auto-pronto" (o time dele é simulado). Documente essa regra.

- [ ] **Reentrar na sala.**
  - Como o `playerId` está no `localStorage`, ao reabrir a aba Online, ofereça "voltar para a sala X" se ele ainda estiver na lista de players.

- [ ] **Encerrar sala.**
  - Botão do dono para encerrar; remover do `Map`. Cleanup automático (Fase 1) cobre abandono.

✅ **Como testar a Fase 9:** feche a aba de B no meio da rodada; A marca pronto; a rodada fecha simulando o time de B. Reabrir a aba de B volta para a sala.

---

## FASE 10 — Evoluções futuras (fora do MVP)

- [ ] **Partida ao vivo PvP** (os dois assistindo minuto a minuto):
  - Mover a simulação ao vivo do frontend (`setInterval` em `MatchCenter`) para o **servidor autoritativo**; transmitir por **WebSocket** (ex.: `ws` ou `socket.io` — nova dependência); sincronizar substituições/gritos dos dois lados; tratar intervalo e desconexão. Reescrita significativa.
- [ ] **Banco de dados + contas reais:** persistir salas/saves (Postgres/SQLite); login; reconexão robusta; rodar múltiplas instâncias do servidor.
- [ ] **Substituir `updateTeam` (objeto inteiro do cliente) por ações granulares** validadas no servidor (anti-cheat definitivo).
- [ ] **Escala horizontal:** hoje o estado em memória impede rodar 2 instâncias; exige mover salas para um store compartilhado (Redis/DB).

---

## Resumo dos arquivos (o que foi realmente feito nas Fases 0–6)

**Novos (backend):**
- ✅ `backend/src/rooms/roomManager.ts` — salas, código, players, escopos por jogador, ready-check, `advanceRoomWeek`, `projectState` (a projeção ficou aqui, não num arquivo separado)
- ✅ `backend/src/routes/rooms.ts` — endpoints de sala/lobby/draft/ready/action/state
- ✅ `backend/src/store/storeHelpers.ts` — `extractState`/`runAction` compartilhados (single-player + salas)

**Alterados (backend):**
- ✅ `backend/src/store/gameStore.ts` — fábrica `createGameStore()` + alias `useGameStore`
- ✅ `backend/src/store/slices/core.ts` — `advanceWeek(humanTeamIds?, trainingByTeam?)` multi-humano
- ✅ `backend/src/types/team.ts` — `ownerId`
- ✅ `backend/src/types/game.ts` — assinatura de `advanceWeek`
- ✅ `backend/src/routes/game.ts` — usa `storeHelpers`
- ✅ `backend/src/server.ts` — registra `/api/rooms`
- ⬜ `backend/src/store/slices/transfer.ts` — negociação humano×humano (Fase 7, pendente)
- ℹ️ Validação das rotas de sala ficou **inline** em `rooms.ts` (Zod), não em `schemas.ts`. Estado por jogador foi resolvido por **swap de escopo** (`Room.scopes`), então **não** foi preciso criar `inboxByTeam` no `GameState`.

**Novos (frontend):**
- ✅ `frontend/src/components/online/OnlineHome.tsx` — criar/entrar
- ✅ `frontend/src/components/online/Lobby.tsx` — lobby (apresentacional)
- ✅ `frontend/src/components/online/DraftScreen.tsx` — escolher clube
- ✅ `frontend/src/components/online/RoomView.tsx` — orquestra lobby→draft→jogo (polling)

**Alterados (frontend):**
- ✅ `frontend/src/App.tsx` — rotas `/online` + ready-check no shell + resync por polling
- ✅ `frontend/src/api/client.ts` — `getPlayerId`, helpers de sala, `apiAction` roteia p/ sala
- ✅ `frontend/src/store/gameStore.ts` — `syncFromResponse` fixa `selectedTeam` no modo online
- ✅ `frontend/src/types/game.ts` — espelha `ownerId`
- ✅ `frontend/src/styles.css` — 1 regra p/ botões do fluxo online

---

## Próximos passos (pós-MVP)
Fase 7 (transferências entre humanos) → Fase 8 (tela de resultado humano×humano) → Fase 9 (reentrar/encerrar sala pela UI) → Fase 10 (PvP ao vivo, banco de dados/contas, escala). As Fases 5 e 6 eram as mais pesadas e já estão feitas.
