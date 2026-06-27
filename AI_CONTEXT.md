# AI Context - Football Manager Web
# Manter sempre atualizado
## Visão Geral do Projeto

**Football Manager Web** é um jogo de gestão de futebol estilo Football Manager. Arquitetura cliente-servidor: backend Express.js com estado em memória (Zustand) + saves em disco, frontend React 19 que delega mutações via API REST. Interface 2D minimalista com sidebar, cards, tabelas e tema claro/escuro.

**Localização:** `C:\Users\caioa\Desktop\football-manager-web`

**Progresso estimado:** ~98% da especificação completa (ver `IMPLMENTATION_CHECKLIST.md`). Fluxos completos documentados em `docs/fluxo.md`.

**Stack:**
- **Backend:** Express 4, Zustand 5 (estado em memória), Zod 4 (validação), TypeScript 5.6, tsx (dev), Vitest (testes)
- **Frontend:** Vite 6, React 19, Zustand 5 (thin client), React Router DOM 7, Lucide React (ícones), Recharts (gráficos), TypeScript 5.6, Vitest (testes)
- **Root:** concurrently (orquestra backend + frontend)

**Persistência:**
- **Saves:** arquivos JSON em `backend/saves/` (`save_slot_1.json`, `save_slot_2.json`) — até 2 slots
- **Tema:** `fm-theme-pref` em localStorage (`light` | `dark` | `system`)
- **Estado do jogo:** em memória no backend (Zustand sem persist); hidratado dos saves ao iniciar o servidor

---

## 📁 Estrutura de Arquivos

```
football-manager-web/
├── package.json                # Root: scripts dev/build/install:all (concurrently)
├── AI_CONTEXT.md
├── IMPLMENTATION_CHECKLIST.md
├── PRODUCT.md
├── Projeto.md
├── DESIGN.md
├── docs/
│   ├── fluxo.md
│   ├── screenshot_*.png
│   └── snapshot_main.txt
│
├── backend/
│   ├── package.json            # Express, Zustand, Zod, tsx, Vitest
│   ├── .env.example            # PORT, NODE_ENV, SAVES_DIR
│   ├── eslint.config.js
│   ├── .prettierrc
│   └── src/
│       ├── server.ts           # Express app + hydrateSavesFromDisk() on boot
│       ├── routes/
│       │   └── game.ts         # /api/state, /api/action, /api/init
│       ├── middleware/
│       │   ├── errorHandler.ts  # AppError → JSON, 404 handler
│       │   ├── rateLimiter.ts   # 120 req/min por IP
│       │   └── requestLogger.ts # INFO/WARN logs
│       ├── services/
│       │   └── saveService.ts   # I/O disco: persist/load/delete/list saves
│       ├── validation/
│       │   └── schemas.ts       # Zod schemas para todas as actions
│       ├── utils/
│       │   ├── errors.ts        # AppError, ValidationError, toErrorResponse
│       │   └── playerGenerator.ts  # Geração procedural (jogadores + times)
│       ├── types/               # 13 arquivos de tipos de domínio
│       │   ├── game.ts          # Barrel re-export + GameState + GameActions + GameStore
│       │   ├── player.ts
│       │   ├── team.ts
│       │   ├── match.ts
│       │   ├── transfer.ts
│       │   ├── injury.ts
│       │   ├── financial.ts
│       │   ├── inbox.ts
│       │   ├── training.ts
│       │   ├── social.ts
│       │   ├── league.ts
│       │   ├── saves.ts
│       │   └── youth.ts
│       ├── store/
│       │   ├── gameStore.ts     # Composition root — combina 13 slices
│       │   ├── slices/          # 13 slices de domínio
│       │   │   ├── core.ts          # initGame, selectTeam, advanceWeek
│       │   │   ├── match.ts         # simulateMatch, liveMatch, finishMatch
│       │   │   ├── transfer.ts      # buy/makeOffer/accept/defer/negotiate
│       │   │   ├── training.ts      # setTrainingPlan, applyWeeklyTraining
│       │   │   ├── injury.ts        # injury risk, prevention, fatigue, recovery
│       │   │   ├── inbox.ts         # handleInboxAction, handleBoardReply
│       │   │   ├── financial.ts     # generateFinancialReport, adjustSalary
│       │   │   ├── scouting.ts      # assignScout
│       │   │   ├── social.ts        # generateSocialTree, updateConnections
│       │   │   ├── promises.ts      # updatePromiseCountdown, checkDeadlines
│       │   │   ├── saves.ts         # saveGame, loadGame, deleteSave (disco)
│       │   │   ├── youth.ts         # academy, reserve team
│       │   │   └── attributes.ts    # snapshot, progression, delta
│       │   └── helpers/         # Lógica pura extraída dos slices
│       │       ├── matchEngine.ts   # calculateTeamStrength, tacticalBonus, simulate
│       │       ├── league.ts        # calculateLeagueStandings
│       │       ├── inbox.ts         # generateInboxMessage
│       │       ├── injury.ts        # calculatePlayerInjuryRisk, getRiskLevel
│       │       ├── training.ts      # applyTrainingToPlayer, captureSnapshot
│       │       └── transfer.ts      # maybeGenerateIncomingTransfer, recalcWageBill
│       └── tests/
│           ├── errors.test.ts
│           └── schemas.test.ts
│
└── frontend/
    ├── package.json            # Vite, React 19, React Router 7, Lucide, Recharts
    ├── index.html              # Inline theme bootstrap (anti-flash)
    ├── tsconfig.json
    └── src/
        ├── main.tsx            # BrowserRouter + ErrorBoundary + fetch /api/state
        ├── App.tsx             # Routes + sidebar + footer + toast system
        ├── api/
        │   └── client.ts       # apiGet, apiPost, apiAction helpers
        ├── store/
        │   └── gameStore.ts    # Thin client: getters locais + mutations via API
        ├── types/
        │   └── game.ts         # Tipos espelhados do backend
        ├── hooks/
        │   └── useTheme.ts     # Theme preference + system listener
        ├── utils/
        │   └── theme.ts        # resolveTheme, applyTheme, getStoredThemePreference
        ├── styles.css             # ~104KB, variáveis --fm-*, light/dark via [data-theme]
        ├── styles-supplement.css  # ~66KB, estilos complementares
        ├── styles-mobile.css      # ~6KB, media queries (1024/768/640/480px)
        ├── smoke/
        │   ├── setup.ts
        │   └── gameFlows.test.ts  # Smoke tests (Vitest)
        └── components/
            ├── TeamSelection.tsx
            ├── ui/
            │   ├── Button.tsx
            │   ├── ErrorBoundary.tsx
            │   ├── StatBar.tsx
            │   ├── Toast.tsx
            │   └── ThemeToggle.tsx     # Light/Dark/System radio group
            ├── saves/
            │   └── SaveSlot.tsx
            ├── squad/
            │   ├── SquadView.tsx
            │   ├── SquadTable.tsx
            │   ├── PlayerCard.tsx
            │   └── PlayerDetailPanel.tsx
            ├── match/
            │   └── MatchCenter.tsx
            ├── transfer/
            │   ├── TransferMarket.tsx
            │   └── ScoutReportCard.tsx
            ├── tactics/
            │   └── TacticsView.tsx
            ├── inbox/
            │   ├── InboxView.tsx
            │   └── constants.ts         # BOARD_REPLY_CATEGORIES
            ├── training/
            │   └── TrainingView.tsx
            ├── dynamics/
            │   └── DynamicsView.tsx
            ├── finance/
            │   └── FinanceView.tsx
            └── league/
                └── LeagueTable.tsx
```

---

## 🏗️ Arquitetura Cliente-Servidor

### Visão Geral

```
Browser (React 19)
  │
  ├─ main.tsx → fetch /api/state → useGameStore.setState()
  │
  ├─ useGameStore (Zustand thin client)
  │    ├─ Getters: computados localmente (sem round-trip)
  │    └─ Mutations: apiAction('actionName', args) → POST /api/action
  │         └─ response { result, state } → syncFromResponse → setState()
  │
  └─ updateTeam: otimista (set local + sync backend)

Backend (Express 4)
  │
  ├─ POST /api/action { action, args }
  │    ├─ Auto-discover action names from store
  │    ├─ Zod validation (actionSchemas)
  │    ├─ Execute fn.apply(store, args)
  │    └─ Return { result, state } (state = non-function keys)
  │
  ├─ POST /api/init → initGame()
  ├─ GET  /api/state → extractState()
  ├─ GET  /health
  │
  └─ Middleware: cors, json(50mb), requestLogger, rateLimiter, errorHandler
```

### Padrão de Comunicação

- **Frontend store** (`frontend/src/store/gameStore.ts`): thin client Zustand. Getters (`getSaveSlots`, `calculateInjuryRisk`, `getActivePromises`, `getPlayerAttributeProgression`, etc.) computam localmente do estado sincronizado. Mutations chamam `apiAction()` e sincronizam resposta.
- **Backend store** (`backend/src/store/gameStore.ts`): Zustand em memória, composition root de 13 slices. Sem persistência — estado é reconstruído em `initGame()` ou hidratado de saves em `hydrateSavesFromDisk()`.
- **`updateTeam`**: caso especial — frontend computa o `newTeam` localmente (UI instantânea) e envia o objeto completo ao backend.
- **`syncFromResponse()`**: `useGameStore.setState(data.state)` — substitui todo o estado frontend pelo estado backend.

### Tipos

Tipos são definidos no backend em 13 arquivos de domínio sob `backend/src/types/`, com barrel export em `game.ts`. O frontend espelha os tipos em `frontend/src/types/game.ts`.

---

## 🧩 Tipos de Domínio (`backend/src/types/`)

### Jogador (`player.ts`)
- **Atributos técnicos, mentais e físicos** (escala 1-20)
- **Atributos de GK** (`GKAttributes`)
- **Atributos ocultos** (`HiddenAttributes`)
- **CA/PA** (`currentAbility` / `potentialAbility`): escala 1-200
- **Contrato:** salário (milhares), `contractEnd` (semanas), cláusula de rescisão
- **Status:** moral, forma, condição física, lesão, `squadStatus`
- **Dinâmica:** `teamMates`, `socialGroup`, `promises` (interface `Promise` — alias `PlayerPromise`)
- **Histórico:** `attributeHistory` para progressão de treino
- **Gestão:** `coachTreatment`, `trustLevel`, `cumulativeLoad`, `fatigueLog`

### Time (`team.ts`)
- Identidade, finanças, infraestrutura, estatísticas de temporada
- **Táticas avançadas:** mentalidade (7 níveis), largura, passe, ritmo, pressão, etc.
- **`tacticsConfig`:** roles por posição + instruções individuais
- **`coachTreatment`**, `leagueForm`, `formRating`, `leaguePosition`

### Partida (`match.ts`)
- Resultado, data, status (`completed`)
- **Live match:** `isLive`, `liveMinute`, `liveEvents`, `liveStats`
- Eventos e stats finais (`events`, `stats`)
- `PlayerMatchRating`

### Transferências (`transfer.ts`)
- `TransferOffer`, `IncomingTransfer`, `CounterOffer`, `NegotiationResult`
- `DeferredTransfer`, `CompletedTransfer`
- `InstallmentClause`, `PlayerBonus`, `TransferAgreement`, `ScoutReport`

### Lesões (`injury.ts`)
- `InjuryHistory`, `LoadManagement`, `PreventionSession`, `PlayerLoadState`
- `FatigueLogEntry`, `Recommendation`, `DegradedCondition`, `InjuryReport`

### Outros
- `InboxMessage` (`inbox.ts`), `BoardReply` + `FinancialReport` (`financial.ts`)
- `TrainingSession`, `WeeklyTrainingPlan` (`training.ts`)
- `SocialNode`, `SocialTree` (`social.ts`)
- `FormResult`, `LeagueStandings` (`league.ts`)
- `SaveSlotMetadata`, `SaveSlot` (`saves.ts`)
- `YouthPlayer`, `YouthAcademy`, `ReserveTeamPlayer` (`youth.ts`)
- `GameState` + `GameActions` → `GameStore` (`game.ts`)

---

## ⚙️ Engine Procedural (`backend/src/utils/playerGenerator.ts`)

### Funções Principais

| Função | Descrição |
|--------|-----------|
| `generatePlayer()` | Spawner principal com distribuição gaussiana para atributos |
| `generateTeam()` | Time completo com elenco, táticas e finanças |
| `generateYouthIntake()` | Fornada de jovens (auto-admission na semana 1) |
| `getRandomNationality()` | Nacionalidade ponderada pela reputação do jogador |
| `createDefaultTacticsConfig()` | Config tática padrão |
| `NAMES_DATABASE` | Banco de nomes por país (Brasil, Argentina, Portugal, etc.) |

### Algoritmo de Geração

**Distribuição Gaussiana:** Usa Box-Muller transform para gerar atributos com média e desvio padrão, limitados entre 1-20.

**Geração de Jogadores:**
- Gera 15-20 jogadores por time
- Distribuição: 2 GK, 6 DEF, 5 MID, 3-4 FWD
- Atributos baseados em posição (GK forte em reflexes, FWD forte em finishing)
- Idades: 16-35 anos
- CA = overall × 10 + random; PA = CA × 1.5 + random (com restrições por idade)

**Geração de Times:**
- Gera 8 times procedurais (4 Série A + 4 Série B)
- Reputação define tier (elite ≥80, forte ≥60, regular ≥40, emergente)
- Cada tier tem diferentes faixas de orçamento, salário e atributos
- Formações aleatórias: 4-4-2, 4-3-3, 3-5-2, 5-2-2
- Táticas e mentalidade aleatórias

---

## 🎮 Backend Store (`backend/src/store/`)

### Composition Root (`gameStore.ts`)

Combina 13 slices num único `create<GameStore>()`. Estado inicial definido inline; actions delegadas aos slices.

### Estado (`GameState`)
```typescript
selectedTeam, currentWeek, currentSeason, matches, teams,
transfers, incomingTransfers, counterOffers, deferredTransfers, inbox,
trainingPlan, youthIntakeCompleted, scoutReports,
pendingInstallments, incomingBonuses, transferAgreements,
boardReplies, boardSatisfaction, financialReports,
injuryHistory, preventionSessions, fatigueLog,
recommendations, degradedConditions, socialTree,
leagueTable, saveSlots, completedTransfers,
youthAcademy, reserveTeam
```

### Slices (13)

| Slice | Arquivo | Responsabilidade |
|-------|---------|-----------------|
| Core | `core.ts` | `initGame`, `selectTeam`, `deselectTeam`, `advanceWeek` |
| Match | `match.ts` | `simulateMatch`, `generateLiveMatchMinute`, `applyMatchIntervention`, `finishMatch` |
| Transfer | `transfer.ts` | `buyPlayer`, `makeOffer`, `acceptOffer`, `deferTransfer`, `negotiateCounterOffer`, parcelas, bônus, acordos |
| Training | `training.ts` | `setTrainingPlan`, `applyWeeklyTraining`, `applyTrainingCooldown` |
| Injury | `injury.ts` | `calculateInjuryRisk`, `schedulePreventionSession`, `recoverInjuredPlayer`, fadiga, recomendações |
| Inbox | `inbox.ts` | `handleInboxAction`, `handleBoardReply`, `markAsRead`, `removeMessage` |
| Financial | `financial.ts` | `generateFinancialReport`, `getFinancialReport`, `adjustPlayerSalary` |
| Scouting | `scouting.ts` | `assignScout` |
| Social | `social.ts` | `generateSocialTree`, `updateSocialConnections` |
| Promises | `promises.ts` | `updatePromiseCountdown`, `getActivePromises`, `checkPromiseDeadlines`, `setCoachTreatment` |
| Saves | `saves.ts` | `saveGame`, `loadGame`, `deleteSave` (disco via `saveService`) |
| Youth | `youth.ts` | `generateYouthPlayers`, `promoteYouthPlayer`, `setAcademyTraining`, reserva |
| Attributes | `attributes.ts` | `captureWeeklyAttributeSnapshot`, `getAttributeDelta`, `getPlayerAttributeProgression` |

### Helpers (6) — Lógica pura extraída

| Helper | Arquivo | Funções |
|--------|---------|---------|
| Match Engine | `matchEngine.ts` | `getTacticalBonus`, `calculateTeamStrength`, `simulateMatchResult`, `calculatePlayerMatchRatings`, `generateWeekMatches`, `applyMatchResultToTeams` |
| League | `league.ts` | `calculateLeagueStandings` |
| Inbox | `inbox.ts` | `generateInboxMessage` |
| Injury | `injury.ts` | `calculatePlayerInjuryRisk`, `getRiskLevel` |
| Training | `training.ts` | `applyTrainingToPlayer`, `captureSnapshot` |
| Transfer | `transfer.ts` | `maybeGenerateIncomingTransfer`, `recalcWageBill` |

### Motor de Partida (`helpers/matchEngine.ts`)

**`getTacticalBonus()`**
- Bônus táticos variam de +0.02 a +0.08 por configuração
- Considera: mentalidade, contra-pressionamento, linha defensiva, estilo de passe, ritmo

**`calculateTeamStrength()`**
- Calcula força baseada nos 11 primeiros jogadores
- Combina CA com atributos técnicos, mentais e físicos (pesos diferentes)
- Aplica `getTacticalBonus()`

**`simulateMatchResult()`**
- Compara forças dos times (home/away com boost)
- Gera gols baseado em diferença de força + random
- Cria eventos, stats (xG, posse, chutes, passes)

---

## 🔌 API REST (`backend/src/routes/game.ts`)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/health` | Health check → `{ status: 'ok' }` |
| `GET` | `/api/state` | Retorna estado completo (non-function keys) |
| `POST` | `/api/init` | Executa `initGame()` |
| `POST` | `/api/action` | Executa action genérica: `{ action, args }` → `{ result, state }` |

**`/api/action` fluxo:**
1. Auto-discover action names do store (funções)
2. Valida args com Zod schema (`actionSchemas`)
3. Caso especial: `updateTeam` recebe `[teamId, newTeam]` em vez de updater
4. Executa `fn.apply(store, args)`
5. Retorna `{ result, state }`

### Validação Zod (`backend/src/validation/schemas.ts`)

122 schemas cobrindo todas as actions. Tipos comuns: `zString`, `zNumber`, `zMatchIndex`, `zSlot` (1|2), `zEmpty`. Actions sem schema emitem `console.warn`.

### Erros (`backend/src/utils/errors.ts`)

- `AppError` — erro base com `code`, `statusCode`, `details`
- `ValidationError` — subclass para erros de validação Zod (400)
- `toErrorResponse()` — serializa erro para JSON response

### Middleware

| Middleware | Arquivo | Função |
|------------|---------|--------|
| CORS | (express) | Permite cross-origin |
| JSON Body | (express) | Limite 50mb |
| Request Logger | `requestLogger.ts` | `INFO/WARN method path → status (duration)` |
| Rate Limiter | `rateLimiter.ts` | 120 req/min por IP (429 se exceder) |
| Error Handler | `errorHandler.ts` | `AppError` → JSON; 404 handler |

---

## 💾 Saves (`backend/src/services/saveService.ts`)

- **Local:** `backend/saves/save_slot_{1,2}.json`
- **`persistSave(slot)`** — escreve JSON em disco
- **`loadSaveFromDisk(slotNumber)`** — lê e parseia JSON
- **`deleteSaveFromDisk(slotNumber)`** — remove arquivo (silencioso se não existir)
- **`listSaveSlotsFromDisk()`** — retorna `SaveSlotMetadata[]` dos 2 slots
- **`hydrateSavesFromDisk()`** — chamado no boot do servidor (`server.ts`)

---

## 🖥️ Frontend

### Navegação (`App.tsx` + React Router DOM 7)

**Rotas (sem time selecionado):**
- `/` — Landing page (Nova partida + SaveSlots)
- `/selecionar-time` — TeamSelection
- `*` → redirect `/`

**Rotas (com time selecionado):**
- `/elenco` — SquadView
- `/partidas` — MatchCenter
- `/classificacao` — LeagueTable
- `/transferencias` — TransferMarket
- `/taticas` — TacticsView
- `/treino` — TrainingView
- `/dinamica` — DynamicsView
- `/caixa-de-entrada` — InboxView
- `/financas` — FinanceView
- `/clube` — ClubView (inline)

**`NAV_ITEMS`** define as 10 telas da sidebar com path, label e ícone.

**Sidebar:**
- Colapsável (botão toggle)
- Badge de inbox não-lidas
- Footer: ThemeToggle, Voltar, Início, Continuar ▶, 💾 Save 1/2

**Toast System:**
- `addToast(message, type)` — adiciona notificação temporária
- `dismissToast(id)` — remove notificação
- `ToastContainer` com auto-dismiss

### Thin Client Store (`frontend/src/store/gameStore.ts`)

**Getters locais** (sem round-trip à API):
- `getSaveSlots()`, `calculateInjuryRisk()`, `getInjuryRiskSummary()`
- `getActivePromises()`, `getTransferAgreements()`, `getSocialTree()`
- `getYouthPlayers()`, `getReserveTeam()`, `getCompletedTransfers()`
- `getFatigueHistory()`, `getAttributeDelta()`, `getPlayerAttributeProgression()`
- `getInjuryReport()`, `generateFinancialReport()`, `getFinancialReport()`
- `checkPromiseDeadlines()`

**Mutations** (delegadas à API):
- Todas as actions chamam `apiAction('actionName', args).then(syncFromResponse)`
- `updateTeam` é otimista: `set` local + sync backend
- `initGame` usa `apiPost('/init', {})`

### Tema (`frontend/src/hooks/useTheme.ts` + `utils/theme.ts`)

- **3 preferências:** `light`, `dark`, `system`
- **Storage:** `fm-theme-pref` em localStorage
- **Anti-flash:** inline script em `index.html` aplica tema antes do React montar
- **System listener:** `matchMedia('(prefers-color-scheme: dark)')` quando preference = `system`
- **Aplicação:** `document.documentElement.dataset.theme` + `colorScheme`
- **Componente:** `ThemeToggle` (radio group compact)

### Componentes UI

**Button (`ui/Button.tsx`):** Variantes `primary`, `secondary`, `success`; estados disabled, loading

**Toast (`ui/Toast.tsx`):** Tipos `info`, `success`, `error`; auto-dismiss 5s

**ErrorBoundary (`ui/ErrorBoundary.tsx`):** Captura erros de render; diferencia corrupção de dados de bugs de código

**StatBar (`ui/StatBar.tsx`):** Barra de atributo visual

**ThemeToggle (`ui/ThemeToggle.tsx`):** Radio group Claro/Escuro/Sistema

### TeamSelection (`TeamSelection.tsx`)

- Lista 8 times por tier (elite, forte, regular, emergente)
- Escudo SVG com cores determinísticas (hash do nome)
- Botão "Gerar Novos Times" → `initGame()`
- Ao selecionar → `selectTeam(teamId)`

### SquadView (`squad/SquadView.tsx`)

- Cabeçalho: nome, formação, tática, mentalidade, estatísticas
- `SquadTable`: Posição, Nome, Idade, CA, PA, Salário, Status
- `PlayerDetailPanel`: drawer lateral (desktop) / overlay (mobile)
- `PlayerCard`: card resumido do jogador

### MatchCenter (`match/MatchCenter.tsx`)

- Calendário, resultados, classificações, partidas ao vivo
- `MatchEventDisplay`, `MatchStatsDisplay`, `LiveDataHub`
- Live mode: `setInterval` 2s → `generateLiveMatchMinute()`
- Substituições (máx 5) + Gritos + Finalizar

### TransferMarket (`transfer/TransferMarket.tsx`)

- Tabs: Mercado, Ofertas, Acordos
- `buyPlayer`, `makeOffer`, `acceptOffer`, `deferTransfer`, `negotiateCounterOffer`
- `assignScout` → `ScoutReportCard`
- Parcelas (`InstallmentClauseDisplay`), Bônus (`PlayerBonusDisplay`)
- `terminateTransferAgreement`

### TacticsView (`tactics/TacticsView.tsx`)

- 7 mentalidades, possessão (4 opções), transição (2), sem posse (5)
- Drag-and-drop de jogadores para posições
- Roles individuais por posição

### InboxView (`inbox/InboxView.tsx`)

- 7 tipos de mensagem (Transfer, Lesão, Sugestão, Diretoria, Base, Treino, Financeiro)
- Filtros por tipo; modais funcionais (lesão, diretoria, financeiro)
- `BOARD_REPLY_CATEGORIES` em `constants.ts`

### TrainingView (`training/TrainingView.tsx`)

- Grid 7×3 (Manhã/Tarde/Noite); tipos: Físico, Técnico, Coesão, Médico, Recuperação, Leve
- Risco de lesão por jogador (cores: verde→vermelho)
- Progressão de atributos (`getPlayerAttributeProgression`)
- Sessões de prevenção

### DynamicsView (`dynamics/DynamicsView.tsx`)

- Pirâmide de hierarquia (Líderes → Outros)
- Grupos sociais por `socialGroup`
- Promessas ativas com countdown
- Form rating com cores

### FinanceView (`finance/FinanceView.tsx`)

- Resumo: orçamento, folha salarial, balanço semanal
- Receitas (bilheteira, patrocínio) e despesas (salários, instalações)
- Projeção 6 semanas; meter de folha salarial
- Ajuste de salário por jogador (slider)

### LeagueTable (`league/LeagueTable.tsx`)

- Classificação da liga (standings)

### SaveSlot (`saves/SaveSlot.tsx`)

- Slots 1 e 2; salvar/carregar/deletar
- Metadata: time, semana, temporada, data

---

## 🔄 Fluxo de Dados

### Inicialização
```
1. Backend boot → hydrateSavesFromDisk() → saves em memória
2. Frontend main.tsx → fetch /api/state → useGameStore.setState()
3. Se selectedTeam === null → landing page (/)
4. Se selectedTeam !== null → sidebar + rota ativa
```

### Jogo
```
1. Usuário clica "Continuar" → advanceWeek() → POST /api/action
2. Backend advanceWeek():
   ├─ Simula partidas dos outros times
   ├─ Atualiza classificação (leagueTable)
   ├─ Gera mensagens de inbox
   ├─ Atualiza finanças
   ├─ Atualiza promessas (countdown)
   ├─ Captura snapshot de atributos
   ├─ Maybe gera incoming transfers
   └─ Incrementa currentWeek
3. Response { state } → syncFromResponse → UI atualizada
```

### Partida ao Vivo
```
1. Usuário clica "Assistir" → simulateMatch(matchIndex)
2. MatchCenter inicia setInterval (2s) → generateLiveMatchMinute()
3. Usuário: substituir, gritar (applyMatchIntervention)
4. Fim: finishMatch() ou minute atinge 90
```

### Transferência
```
1. Mercado: buyPlayer() ou makeOffer() → POST /api/action
2. Oferta recebida: inbox → acceptIncomingTransfer/reject/defer
3. Contra-oferta: negotiateCounterOffer()
4. Parcelas e bônus gerados automaticamente
```

### Save/Load
```
Salvar:
  1. Sidebar "💾 Save 1" → saveGame(1) → POST /api/action
  2. Backend: persistSave() → save_slot_1.json em disco

Carregar:
  1. Landing page → SaveSlot "Carregar" → loadGame(1)
  2. Backend: loadSaveFromDisk() → restaura estado
  3. Response { state } → syncFromResponse → UI redireciona para /elenco
```

---

## 🎮 Regras de Jogo

1. **Gerar clubes** → escolher time
2. **Avançar semanas** via "Continuar"; calendário round-robin (8 times, 38 semanas)
3. **Partidas do jogador:** modo **live**; demais auto-simuladas
4. **Até 5 substituições + gritos** em partida ao vivo
5. **Transferências** com scouting, contra-ofertas, parcelas, bônus e acordos
6. **Transferências adiadas** (`deferTransfer`) — podem ser reinstadas ou rejeitadas
7. **Treino semanal** afeta atributos; snapshot semanal para progressão
8. **Youth intake** automático na semana 1; academia de jovens + equipe reserva
9. **Promessas** decrementam a cada `advanceWeek()`
10. **Salários** ajustáveis em Finanças (recalcula `wageBill`)
11. **Até 2 slots de save** em disco; sidebar grava via `saveGame()`
12. **Risco de lesão** aumenta com carga acumulada; prevenção reduz risco
13. **Árvore social** gerada; influencia moral e dinâmicas
14. **Diretoria** envia mensagens; satisfação varia com respostas
15. **Tema** claro/escuro/sistema com persistência em localStorage

---

## ⚠️ Limitações de Produto (Não-Bug)

| Área | Status | Pendências |
|------|--------|------------|
| Testes automatizados | ✅ | Smoke tests (frontend) + errors/schemas tests (backend) |
| Testes de UI | 🟡 | Sem Playwright/Cypress no CI |
| Liga | 🔲 | 8 times, sem descenso/subida |
| IA adversária | 🔲 | Times AI não adaptam táticas |
| Salários gerados | 🟡 | `playerGenerator` pode gerar salários >> 500K (cap da UI) |
| Estado backend | 🟡 | Em memória; perdido ao reiniciar (exceto saves em disco) |
| Mobile | 🟡 | Media queries básicas (1024/768/640/480px) |

---

## ⚙️ Comandos

```bash
# Root (orquesta ambos)
npm run dev          # concurrently: backend + frontend
npm run build        # build frontend + backend
npm run install:all  # instala deps de frontend e backend

# Frontend (cd frontend)
npm run dev          # Vite dev server
npm run build        # tsc + vite build
npm run test         # Vitest — smoke tests
npm run test:smoke   # build + testes

# Backend (cd backend)
npm run dev          # tsx watch src/server.ts
npm run build        # tsc
npm run start        # node dist/server.js
npm run test         # Vitest — errors + schemas
npm run lint         # eslint src
npm run format       # prettier --write src
```

**Portas:** Backend `:3001` | Frontend Vite `:5173` (proxy `/api` → `:3001`)

---

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| Arquivos TS/TSX (backend) | ~30 |
| Arquivos TS/TSX (frontend) | ~28 |
| Slices de store (backend) | 13 |
| Helpers de store (backend) | 6 |
| Tipos de domínio (backend) | 13 arquivos |
| Componentes React | ~24 |
| Telas na sidebar | 10 |
| Schemas Zod | 122 |
| Times por partida | 8 (procedurais) |

---

## 🔑 Pontos de Extensibilidade

1. **Novos tipos:** `backend/src/types/{dominio}.ts` + barrel em `game.ts`; espelhar em `frontend/src/types/game.ts`
2. **Geração procedural:** `backend/src/utils/playerGenerator.ts`
3. **Regras de jogo:** slice correspondente em `backend/src/store/slices/`
4. **Lógica pura:** helper correspondente em `backend/src/store/helpers/`
5. **Nova action:** adicionar ao slice + schema Zod em `schemas.ts` + thin client em `frontend/src/store/gameStore.ts`
6. **Nova tela:** componente em `frontend/src/components/` + rota em `App.tsx` + `NAV_ITEMS`
7. **Estilos:** `frontend/src/styles.css` (variáveis `--fm-*`, light/dark via `[data-theme]`)
8. **Saves:** `backend/src/services/saveService.ts` + slice `saves.ts` + `SaveSlot.tsx` (frontend)
9. **Tema:** `frontend/src/utils/theme.ts` + `hooks/useTheme.ts` + `ThemeToggle.tsx`
10. **API:** nova rota em `backend/src/routes/game.ts`
11. **Middleware:** `backend/src/middleware/`
12. **Validação:** adicionar schema em `backend/src/validation/schemas.ts`

---

## 🎯 Próximos Passos Prioritários

1. **Expandir Fase 2:** múltiplas divisões, copa, IA adversária
2. Corrigir escala de salários no gerador procedural
3. Persistência completa do estado backend (além dos saves)
4. PWA + sincronização cloud
5. Testes E2E (Playwright) para regressão dos fluxos save/voltar/carregar
6. WebSocket para live match (em vez de polling)

---

## 🧪 Validação Rápida (Pós-Alterações)

```text
# Backend + Frontend
npm run dev
# Browser: localhost:5173

Gerar clubes → Assumir → Save 1 → Voltar → painel de saves OK
→ Carregar → jogo restaurado → F5 → Carregar slot 2
```

Console sem erros. Ver também `IMPLMENTATION_CHECKLIST.md`.

---

**Última atualização:** Junho 2026 — refatoração completa para arquitetura cliente-servidor (Express + React), slices, helpers, Zod, tema claro/escuro, React Router
