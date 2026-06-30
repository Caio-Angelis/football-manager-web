# AI Context - Football Manager Web
# Manter sempre atualizado
## Visão Geral do Projeto

**Football Manager Web** é um jogo de gestão de futebol estilo Football Manager. Arquitetura cliente-servidor: backend Express.js com estado em memória (Zustand) + saves em disco, frontend React 19 que delega mutações via API REST. Interface 2D minimalista com sidebar, cards, tabelas e tema claro/escuro.

**Localização:** `c:\Users\caioa\Desktop\football-manager-web`

**Progresso estimado:** ~99% da especificação completa (ver `IMPLMENTATION_CHECKLIST.md`). Fluxos completos documentados em `docs/fluxo.md`. Database real de 20 clubes do Brasileirão integrada (ver `DataBase jogadores/`). Sistema multi-temporada (até 3), IA adversária ativa, dinâmica de moral semanal e relatórios pós-jogo implementados.

**Stack:**
- **Backend:** Express 4, Zustand 5 (estado em memória), Zod 4 (validação), TypeScript 5.6, tsx (dev), Vitest 4 (testes). Script headless (`headless_sim.ts`) para simulação sem servidor.
- **Frontend:** Vite 6, React 19, Zustand 5 (thin client), React Router DOM 7, Lucide React (ícones), Recharts (gráficos), TypeScript 5.6, Vitest 3 + happy-dom (testes)
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
├── especificacao_football_manager_web.md  # Especificação completa do produto
├── TransferenciasChecklist.md  # Checklist do sistema de transferências
├── DynamicsView_content.txt    # Conteúdo de referência da DynamicsView
├── DataBase jogadores/         # Database real de clubes (20 JSONs + gerar_jsons.py)
│   ├── atletico_mineiro.json
│   ├── bahia.json
│   ├── botafogo.json
│   ├── ... (17 outros clubes do Brasileirão)
│   └── gerar_jsons.py          # Script Python que gera os JSONs
├── docs/
│   ├── fluxo.md
│   ├── screenshot_*.png
│   └── snapshot_main.txt
│
├── backend/
│   ├── package.json            # Express, Zustand, Zod, tsx, Vitest
│   ├── headless_sim.ts         # Simulação headless de 3 temporadas sem servidor/frontend
│   ├── run_batch.py            # Executa headless_sim 30x e gera balance_report.txt
│   ├── sim_output.json         # Métricas geradas pelo headless_sim (gerado em runtime)
│   ├── balance_report.txt      # Relatório de balanceamento (gerado em runtime)
│   ├── .env.example            # PORT, NODE_ENV, SAVES_DIR
│   ├── eslint.config.js
│   ├── .prettierrc
│   ├── saves/                  # save_slot_{1,2}.json (criados em runtime)
│   └── src/
│       ├── server.ts           # Express app + hydrateSavesFromDisk() on boot
│       ├── routes/
│       │   └── game.ts         # /api/state, /api/action, /api/init
│       ├── middleware/
│       │   ├── auth.ts          # Bearer token auth (opcional via API_TOKEN env)
│       │   ├── errorHandler.ts  # AppError → JSON, 404 handler
│       │   ├── rateLimiter.ts   # 120 req/min por IP (cleanup periódico)
│       │   └── requestLogger.ts # INFO/WARN logs
│       ├── services/
│       │   └── saveService.ts   # I/O disco: persist/load/delete/list saves
│       ├── validation/
│       │   └── schemas.ts       # Zod schemas para todas as actions
│       ├── utils/
│       │   ├── errors.ts        # AppError, ValidationError, toErrorResponse
│       │   ├── playerGenerator.ts  # Geração procedural (jogadores + times)
│       │   ├── playerName.ts    # getFullName() — nome completo do jogador
│       │   └── dataLoader.ts    # Carrega times reais de DataBase jogadores/*.json
│       ├── types/               # 14 arquivos de tipos de domínio
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
│       │   ├── youth.ts
│       │   └── press.ts         # Tipos do Sistema de Coletiva de Imprensa
│       ├── store/
│       │   ├── gameStore.ts     # Composition root — combina 14 slices
│       │   ├── slices/          # 14 slices de domínio
│       │   │   ├── core.ts          # initGame, selectTeam, advanceWeek
│       │   │   ├── match.ts         # simulateMatch, liveMatch, finishMatch, getPreMatchAnalysis
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
│       │   │   ├── attributes.ts    # snapshot, progression, delta
│       │   │   └── press.ts         # coletiva de imprensa, fan mood, media pressure
│       │   └── helpers/         # Lógica pura extraída dos slices (12 helpers)
│       │       ├── matchEngine.ts   # simulateFullMatch, simulateMinute, initLiveMatchState, generatePostMatchReport, calculateTeamStrength, tacticalBonus, calculatePlayerMatchRatings, generateWeekMatches, applyMatchResultToTeams
│       │       ├── league.ts        # calculateLeagueStandings
│       │       ├── inbox.ts         # generateInboxMessage
│       │       ├── injury.ts        # calculatePlayerInjuryRisk, getRiskLevel
│       │       ├── training.ts      # applyTrainingToPlayer, captureSnapshot
│       │       ├── transfer.ts      # maybeGenerateIncomingTransfer, recalcWageBill
│       │       ├── scouting.ts      # maskAttributeValue, processScoutMissions, generateScoutReportForMission, calculateScoutGrade
│       │       ├── aiManager.ts     # processAIWeeklyDecisions — transferências AI-vs-AI, ajustes táticos, renovações de contrato
│       │       ├── moraleDynamics.ts # applyWeeklyMoraleDynamics — 6 motores de moral (promessas, tempo de jogo, forma, cascata social, regressão)
│       │       ├── finance.ts       # calculateMarketValue, calculatePlayerSalary, calculateTeamBudget, calculateTransferBudget, calculateTicketRevenue, calculateSponsorshipRevenue, calculateFacilityCosts, weeklyWages, calculateWageLimit
│       │       └── preMatchAnalysis.ts # generatePreMatchAnalysis — Monte Carlo (500 iterações), key matchups, recomendação tática
│       └── tests/
│           ├── errors.test.ts
│           └── schemas.test.ts
│
└── frontend/
    ├── package.json            # Vite, React 19, React Router 7, Lucide, Recharts, happy-dom
    ├── index.html              # Inline theme bootstrap (anti-flash)
    ├── tsconfig.json
    ├── vite.config.ts          # Proxy /api → localhost:3001
    ├── vitest.config.ts        # happy-dom, setup smoke tests
    └── src/
        ├── main.tsx            # BrowserRouter + ErrorBoundary + fetch /api/state (importa app-fm.css e fm-shared.css por último)
        ├── App.tsx             # Routes + sidebar + footer + toast system (sidebar/actionbar usam ícones lucide)
        ├── app-fm.css          # tema dark estilo Football Manager para o SHELL (sidebar/actionbar/fundo), escopado em .fm-shell-fm
        ├── fm-shared.css       # CSS compartilhado com variáveis e componentes base do padrão /taticas (escopado em .fms-page)
        ├── api/
        │   └── client.ts       # apiGet, apiPost, apiAction helpers
        ├── store/
        │   └── gameStore.ts    # Thin client: getters locais + mutations via API
        ├── types/
        │   └── game.ts         # Tipos espelhados do backend
        ├── hooks/
        │   ├── useTheme.ts     # Theme preference + system listener
        │   └── useSortable.ts  # Reusable table sorting hook (sort key + direction toggle)
        ├── utils/
        │   ├── theme.ts        # resolveTheme, applyTheme, getStoredThemePreference
        │   ├── player.ts       # getFullName() — nome completo do jogador (mirror do backend)
        │   └── finance.ts      # Mirror frontend do finance helper (revenue, expenses, wage limit)
        ├── styles.css             # ~105KB, design tokens oklch() com fallbacks hex, light/dark via [data-theme], badge tokens semânticos
        ├── styles-supplement.css  # ~107KB, estilos complementares, Night Pitch theme, auto dark via prefers-color-scheme
        ├── styles-mobile.css      # ~8KB, media queries (1024/900/768/640/480px), reduced backdrop-filter em mobile
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
            │   ├── MatchCenter.tsx
            │   ├── MatchPitch2D.tsx      # Visualização 2D estilo "jogo de botão"
            │   ├── MatchPitch2D.css
            │   ├── PreMatchBriefing.tsx  # Centro de Inteligência Pré-Jogo (Monte Carlo, matchups, tática)
            │   ├── PostMatchReportView.tsx  # Relatório pós-jogo (mapa de calor, insights, conselhos)
            │   └── PostMatchReportView.css
            ├── transfer/
            │   ├── TransferMarket.tsx
            │   └── ScoutReportCard.tsx
            ├── tactics/
            │   ├── TacticsView.tsx
            │   └── tactics-fm.css        # tema dark estilo Football Manager (escopado em .fm-tactics-fm)
            ├── inbox/
            │   ├── InboxView.tsx
            │   └── constants.ts         # BOARD_REPLY_CATEGORIES
            ├── training/
            │   └── TrainingView.tsx
            ├── dynamics/
            │   └── DynamicsView.tsx
            ├── finance/
            │   └── FinanceView.tsx
            ├── league/
            │   └── LeagueTable.tsx
            └── season/
                └── SeasonSummaryModal.tsx  # Resumo de fim de temporada (colocação, zona, artilheiro)
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
  └─ Middleware: cors, json(5mb), requestLogger, rateLimiter, authMiddleware, errorHandler
```

### Padrão de Comunicação

- **Frontend store** (`frontend/src/store/gameStore.ts`): thin client Zustand. Getters (`getSaveSlots`, `calculateInjuryRisk`, `getActivePromises`, `getPlayerAttributeProgression`, etc.) computam localmente do estado sincronizado. Mutations chamam `apiAction()` e sincronizam resposta.
- **Backend store** (`backend/src/store/gameStore.ts`): Zustand em memória, composition root de 13 slices. Sem persistência — estado é reconstruído em `initGame()` ou hidratado de saves em `hydrateSavesFromDisk()`.
- **`updateTeam`**: caso especial — frontend computa o `newTeam` localmente (UI instantânea) e envia o objeto completo ao backend.
- **`syncFromResponse()`**: `useGameStore.setState(data.state)` — substitui todo o estado frontend pelo estado backend.

### Tipos

Tipos são definidos no backend em 13 arquivos de domínio sob `backend/src/types/`, com barrel export em `game.ts`. O frontend espelha os tipos em `frontend/src/types/game.ts`.

> **⚠️ Dessincronização:** O `GameActions` do backend (`backend/src/types/game.ts`) possui actions extras não espelhadas no thin client do frontend (`frontend/src/store/gameStore.ts`): `generateInstallmentClause`, `generatePlayerBonus`, `setCoachTreatment`, `setPlayerTrustLevel`, `setPlayerTrainingLoad`, `updateClubPerformance`, `updateLeagueForm`, `setLeaguePosition`, `assignScoutMission`, `getScoutKnowledge`. Essas actions são invocadas diretamente via `apiAction()` sem implementação no thin client. `negotiatePlayerContract`, `loanPlayer`, `recallLoanedPlayer`, `buyLoanedPlayer`, `activateReleaseClause`, `raiseBid`, `withdrawBid`, `addToShortlist`, `removeFromShortlist`, `getShortlist`, `dismissScoutRecommendation` estão espelhadas no frontend (tipos + store). Os tipos `Scout`, `ActiveScoutMission`, `ContractNegotiationResult`, `LoanDeal`, `ShortlistEntry`, `ScoutRecommendation`, `BiddingWar`, `scoutKnowledge` e `scoutMissions` estão espelhados em `frontend/src/types/game.ts`.

---

## 🧩 Tipos de Domínio (`backend/src/types/`)

### Jogador (`player.ts`)
- **Atributos técnicos, mentais e físicos** (escala 1-20)
- **Atributos de GK** (`GKAttributes`)
- **Atributos ocultos** (`HiddenAttributes`)
- **CA/PA** (`currentAbility` / `potentialAbility`): escala 1-200
- **Contrato:** salário (milhares), `contractEnd` (semanas), cláusula de rescisão
- **Status:** moral, forma, condição física, lesão (`{ active, daysRemaining, totalDays, type, severity, source }`), `squadStatus`
- **Dinâmica:** `teamMates`, `socialGroup`, `promises` (interface `PlayerPromise`)
- **Histórico:** `attributeHistory` (limitado a 20 snapshots), `fatigueLog` (limitado a 20 entradas)
- **Gestão:** `coachTreatment`, `trustLevel`, `cumulativeLoad`, `fatigueLog`

### Time (`team.ts`)
- Identidade, finanças, infraestrutura, estatísticas de temporada
- **Táticas avançadas:** mentalidade (7 níveis), largura, passe, ritmo, pressão, etc.
- **`tacticsConfig`:** roles por posição + instruções individuais + `setPieces?: SetPiecesConfig` (bolas paradas: escanteios, faltas, laterais, pênaltis, defesa)
- **`coachTreatment`**, `leagueForm`, `formRating`, `leaguePosition`
- **Olheiros:** `scouts: Scout[]` (id, name, judgingAbility, judgingPotential, assigned)

### Partida (`match.ts`)
- Resultado, data, status (`completed`)
- **Live match:** `isLive`, `liveMinute`, `liveEvents`, `liveStats`, `liveActions`, `liveMatchState`
- Eventos e stats finais (`events`, `stats`)
- `PlayerMatchRating`
- **Relatório pós-jogo:** `PostMatchReport` (summary, heatMapHome/away, insights, assistantComments, passBreakdown, attackZones)
- **Tipos de análise:** `HeatMapZone`, `TacticalInsight`, `AssistantAdvice`

### Transferências (`transfer.ts`)
- `TransferOffer`, `IncomingTransfer`, `CounterOffer`, `NegotiationResult`
- `ContractNegotiationResult` — negociação de contrato do jogador (salary, expectedSalary, counterSalary)
- `DeferredTransfer`, `CompletedTransfer`
- `InstallmentClause` (com `direction: 'payable' | 'receivable'` para distinguir parcelas a pagar vs receber), `PlayerBonus`, `TransferAgreement`, `ScoutReport`
- `ActiveScoutMission` — missão de observação ativa (scoutId, targetId, weeksAssigned, weeksTotal)
- `LoanDeal` — empréstimo de jogador (id, playerId, fromTeamId, toTeamId, loanFee, weeklyWageContribution, durationWeeks, remainingWeeks, buyOptionFee, buyOptionMandatory, status: active|completed|recalled|bought)
- `ShortlistEntry` — entrada de shortlist (playerId, addedAt, addedWeek, priority: high|medium|low, notes)
- `ScoutRecommendation` — recomendação automática de scout (id, playerId, playerName, position, age, estimatedCA, estimatedPA, currentTeamName, estimatedValue, grade: A-F, reason, scoutId, scoutName, week, dismissed)
- `BiddingWar` — guerra de ofertas (id, playerId, playerName, sellerTeamId, sellerTeamName, userOffer, highestOffer, aiOffers[], round, maxRounds, isUserWinning, status: active|won|lost|withdrawn)
- `AIOffer` — oferta de clube AI em guerra de ofertas (teamId, teamName, offerPrice)

### Lesões (`injury.ts`)
- `InjuryHistory`, `LoadManagement`, `PreventionSession`, `PlayerLoadState`
- `FatigueLogEntry`, `Recommendation`, `DegradedCondition`, `InjuryReport`

### Outros
- `InboxMessage` (`inbox.ts`), `BoardReply` + `FinancialReport` (`financial.ts`) — `FinancialReport` inclui `facilityCosts`
- `TrainingSession`, `WeeklyTrainingPlan` (`training.ts`)
- `SocialNode`, `SocialTree` (`social.ts`)
- `FormResult`, `LeagueStandings` (`league.ts`)
- `SaveSlotMetadata`, `SaveSlot` (`saves.ts`)
- `YouthPlayer`, `YouthAcademy`, `ReserveTeamPlayer` (`youth.ts`) — `ReserveTeamPlayer` inclui `trainingType?: string`
- `SeasonSummary` (`game.ts`) — resumo de fim de temporada (season, teamName, position, zone, zoneLabel, points, wins, draws, losses, goalsFor, goalsAgainst, topScorer, topAssister, isFinalSeason)
- `GameState` + `GameActions` → `GameStore` (`game.ts`)

---

## ⚙️ Geração de Times — Database Real + Procedural

### Database Real (`backend/src/utils/dataLoader.ts`)

Carrega times reais do Brasileirão a partir de arquivos JSON em `DataBase jogadores/`. **Prioridade:** `initGame()` tenta carregar do database primeiro; se vazio, faz fallback para geração procedural.

| Função | Descrição |
|--------|-----------|
| `loadTeamsFromDatabase()` | Lê todos os `*.json` de `DataBase jogadores/`, converte para `Team[]` |
| `convertPlayer()` | Converte `JsonPlayer` (6 stats + over_geral) → `Player` completo |
| `convertTeam()` | Converte `JsonTeam` → `Team` com reputação baseada no overall médio |
| `assignBoardExpectations()` | Atribui `boardExpectation` por percentis da reputação (top 10% title, próximos 30% top4, próximos 40% midtable, bottom 20% relegation) |
| `buildAttributes()` | Deriva atributos técnicos, mentais, físicos e GK dos 6 stats básicos |
| `to20()` | Converte escala 0-100 → 1-20 |

**Mapeamento de posições:** GOL→GK, ZAG/LAT→DEF, VOL/MEI→MID, ATA/PD/PE→FWD

**Database JSON (`DataBase jogadores/`):**
- 20 clubes reais do Brasileirão Série A 2025
- Cada JSON tem: `time` (nome), `jogadores[]` (nome, posicao, jogos, gols, assistencias, velocidade, chute, passe, drible, defesa, fisico, over_geral)
- `gerar_jsons.py` — script Python que gera os JSONs a partir de dados reais

### Geração Procedural (`backend/src/utils/playerGenerator.ts`)

Usada como fallback quando o database não está disponível.

| Função | Descrição |
|--------|-----------|
| `generatePlayer()` | Spawner principal com distribuição gaussiana para atributos |
| `generateTeam()` | Time completo com elenco, táticas e finanças |
| `generateYouthIntake()` | Fornada de jovens (auto-admission na semana 1) |
| `getRandomNationality()` | Nacionalidade ponderada pela reputação do jogador |
| `createDefaultTacticsConfig()` | Config tática padrão com `setPieces` (usado também pelo dataLoader) |
| `createDefaultSetPiecesConfig()` | Config padrão de bolas paradas (cantos, faltas, laterais, pênaltis, defesa) |
| `NAMES_DATABASE` | Banco de nomes por país (Brasil, Argentina, Portugal, etc.) |

### Algoritmo Procedural

**Distribuição Gaussiana:** Usa Box-Muller transform para gerar atributos com média e desvio padrão, limitados entre 1-20.

**Geração de Jogadores:**
- Gera 15-20 jogadores por time
- Distribuição: 2 GK, 6 DEF, 5 MID, 3-4 FWD
- Atributos baseados em posição (GK forte em reflexes, FWD forte em finishing)
- Idades: 16-35 anos
- CA = overall × 10 + random; PA = CA × 1.5 + random (com restrições por idade)

**Geração de Times (fallback):**
- Gera 8 times procedurais (4 Série A + 4 Série B)
- Reputação define tier (elite ≥80, forte ≥60, regular ≥40, emergente)
- Cada tier tem diferentes faixas de orçamento, salário e atributos
- Formações aleatórias: 4-4-2, 4-3-3, 3-5-2, 5-2-2
- Táticas e mentalidade aleatórias

---

## 🎮 Backend Store (`backend/src/store/`)

### Composition Root (`gameStore.ts`)

Combina 14 slices num único `create<GameStore>()`. Estado inicial definido inline; actions delegadas aos slices.

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
youthAcademy, reserveTeam,
scoutKnowledge (Record<string, number>), scoutMissions (ActiveScoutMission[]),
seasonSummary (SeasonSummary | null), gameOver (boolean),
shortlist (ShortlistEntry[]), scoutRecommendations (ScoutRecommendation[]),
activeLoans (LoanDeal[]), biddingWars (BiddingWar[]),
isAdvancing (boolean) — lock contra chamadas concorrentes de advanceWeek
```

### Slices (14)

| Slice | Arquivo | Responsabilidade |
|-------|---------|-----------------|
| Core | `core.ts` | `initGame` (database real + fallback procedural; **reseta TODOS os campos de estado** incluindo pendingInstallments, incomingBonuses, transfers, counterOffers, fatigueLog, recommendations, degradedConditions, socialTree, youthAcademy, reserveTeam, completedTransfers, etc.; **mediaPressure inicial = 50/low**), `selectTeam`, `deselectTeam`, `updateTeam`, `advanceWeek` (**lock isAdvancing** contra chamadas concorrentes; auto-finaliza partida pendente, simula outras, **cura lesões via `healInjuryForPlayer`** (7 dias base + bonus staff/facilities, age penalty, severity penalty; marca injuryHistory como recovered), **gera lesões baseadas em risco** (roll semanal: 2% base + risk×0.08%, via `generateInjuryForPlayer`), processa IA adversária, dinâmica de moral, scouting, finanças, fadiga via helper compartilhado `applyFatigueDecayToPlayer`, condição degradada via `updateDegradedConditionForPlayer`, parcelas com direction payable/receivable, **bônus baseados em estatísticas reais** seasonGoals/seasonAssists/played/form/position, inbox; **todas as atualizações pós-semana (promise countdown, treino, snapshot de atributos, press decay, youth intake) são batched em um único `set()` final** — sem chamadas `set()` adicionais), `startNextSeason` (**reseta stats + TODO o estado de transferências/scouting**: incomingTransfers, transfers, counterOffers, deferredTransfers, inbox, scoutReports, pendingInstallments, incomingBonuses, transferAgreements, scoutMissions, shortlist, scoutRecommendations, activeLoans, biddingWars, fanMood, mediaPressure; gera novo calendário), `updateClubPerformance`, `updateLeagueForm`, `setLeaguePosition` |
| Match | `match.ts` | `simulateMatch` (inicia estado ao vivo via `initLiveMatchState`), `generateLiveMatchMinute` (simula 1 minuto via `simulateMinute`), `applyMatchIntervention`, `finishMatch` (continua simulação até minuto 90, gera `postMatchReport`), `getPreMatchAnalysis` (gera análise preditiva via Monte Carlo 500 iterações — probabilidades, placar provável, duelos, recomendação tática) |
| Transfer | `transfer.ts` | `buyPlayer` (parcelas marcadas como `direction: 'payable'`), `makeOffer`, `acceptOffer`, `negotiatePlayerContract`, `deferTransfer`, `reinstateDeferredTransfer`, `rejectDeferredTransfer`, `negotiateCounterOffer`, `acceptIncomingTransfer` (parcelas marcadas como `direction: 'receivable'`), `generateInstallmentClause`, `generatePlayerBonus`, `checkBonuses` (usa estatísticas reais: seasonGoals, seasonAssists, played, form, league position), `claimBonus`, parcelas, bônus, acordos, `loanPlayer`, `recallLoanedPlayer`, `buyLoanedPlayer`, `activateReleaseClause`, `raiseBid`, `withdrawBid` |
| Training | `training.ts` | `setTrainingPlan`, `applyWeeklyTraining` (passa o foco real — physical, technical, cohesion, medical, recovery, light — diretamente para `updatePlayerAttributes`), `applyTrainingCooldown` — **buscam apenas no time selecionado** |
| Injury | `injury.ts` | `getInjuryReport` (usa dados armazenados: type, severity, daysRemaining, totalDays para recoveryProgress), `schedulePreventionSession`, `recoverInjuredPlayer` (marca apenas a lesão mais recente não recuperada no injuryHistory), `applyPostInjuryCondition` (degradedCondition baseado em severity: severe→minimal, moderate→low, minor→moderate), `updateDegradedConditions`, fadiga, recomendações — **todas as ações buscam apenas no time selecionado** (`state.selectedTeam`) |
| Inbox | `inbox.ts` | `handleInboxAction`, `handleBoardReply`, `markAsRead`, `removeMessage` |
| Financial | `financial.ts` | `generateFinancialReport`, `getFinancialReport`, `adjustPlayerSalary` |
| Scouting | `scouting.ts` | `assignScout` (sem playerId: embaralha candidatos antes de selecionar 3), `assignScoutMission`, `getScoutKnowledge`, `addToShortlist` (playerId, priority?, notes?), `removeFromShortlist`, `getShortlist`, `dismissScoutRecommendation` |
| Social | `social.ts` | `generateSocialTree` (**guard para elenco vazio**, força de conexão determinística baseada em socialGroup/squadStatus), `updateSocialConnections` (atualização imutável de edges, **bidirecional**: sempre atualiza/cria tanto A→B quanto B→A) |
| Promises | `promises.ts` | `updatePromiseCountdown`, `getActivePromises`, `checkPromiseDeadlines`, `setCoachTreatment`, `setPlayerTrustLevel`, `setPlayerTrainingLoad` |
| Saves | `saves.ts` | `saveGame`, `loadGame` (restaura pressConferences, fanMood, mediaPressure), `deleteSave` (disco via `saveService`) |
| Youth | `youth.ts` | `generateYouthPlayers`, `promoteYouthPlayer` (copia atributos technical/mental/physical do jovem ao promover), `setAcademyTraining`, reserva, `setReserveTraining` (armazena `trainingType` em cada `ReserveTeamPlayer`) |
| Attributes | `attributes.ts` | `captureWeeklyAttributeSnapshot`, `getAttributeDelta`, `getPlayerAttributeProgression` |
| Press | `press.ts` | `generatePreMatchPressConference`, `generatePostMatchPressConference` (**verifica opponent nulo**), `answerPressQuestion`, `skipPressConference`, `applyPressConferenceEffects` (**boardSatisfaction clamp -100 a 100**), `processWeeklyPressDecay`, `getPendingPressConference`, `getPressConferenceHistory` |

### Helpers (11) — Lógica pura extraída

| Helper | Arquivo | Funções |
|--------|---------|---------|
| Match Engine | `matchEngine.ts` | `getTacticalBonus`, `calculateTeamStrength`, `getPossessionBias`, `simulateMatchResult` (xG+Poisson+set pieces), `simulateFullMatch` (90min passo a passo), `simulateMinute` (integra set pieces: cantos, faltas, pênaltis, laterais), `initLiveMatchState`, `calculatePlayerMatchRatings`, `generatePostMatchReport` (mapa de calor, insights, conselhos), `generateWeekMatches`, `applyMatchResultToTeams` |
| League | `league.ts` | `calculateLeagueStandings` |
| Inbox | `inbox.ts` | `generateInboxMessage` |
| Injury | `injury.ts` | `calculatePlayerInjuryRisk` (retorna 0 se já lesionado), `getRiskLevel`, `generateInjuryForPlayer` (centralizada: severity roll baseado em risk+proneness, age/fitness penalties, staff/facilities care reduction, injury type, injuryHistory, degradedCondition, fitness drop), `healInjuryForPlayer` (cura semanal: base 7 dias + staff/facilities bonus, age penalty, severity penalty no início), `applyFatigueDecayToPlayer` (recuperação semanal: fitness +5, load -5, consecutive -1, clear recoveryNeeded), `updateDegradedConditionForPlayer`, `reduceInjuryFromRecoveryTraining`, `INJURY_TYPE_LABELS` |
| Training | `training.ts` | `applyTrainingToPlayer`, `captureSnapshot`, `updatePlayerAttributes` (recalcula CA com curva de idade: <21 ×1.5, 21-23 ×1.2, 24-27 ×0.8, 28-30 ×0.4, 31+ ×0.1; **respeita PA ceiling**: `min(potentialAbility, 200, ...)`; **usa `generateInjuryForPlayer` centralizada** para lesões em treino físico; **usa `reduceInjuryFromRecoveryTraining`** para sessões médico/recuperação; aceita `facilitiesLevel` e `staffLevel` como params) |
| Transfer | `transfer.ts` | `maybeGenerateIncomingTransfer`, `recalcWageBill` |
| Scouting | `scouting.ts` | `maskAttributeValue`, `maskPlayerAttributes`, `getBestScout`, `generateDefaultScouts`, `processScoutMissions`, `generateScoutReportForMission`, `calculateScoutGrade` |
| AI Manager | `aiManager.ts` | `processAIWeeklyDecisions` — orquestra `processAITransfers` (janelas 1-12 e 20-26, AI-vs-AI), `processAITactics` (ajustes a cada 4 semanas: rebaixamento 50/30/20 attacking/balanced/defensive, título 40% attacking em boa forma, mid-table 50% defensive após derrotas; demissão de técnico com nova formação), `processAIContracts` (renovação automática) |
| Morale Dynamics | `moraleDynamics.ts` | `applyWeeklyMoraleDynamics` — 6 motores: promessas expiradas, tempo de jogo vs. status, forma do time, cascata do capitão, cascata de grupo social, regressão à média |
| Finance | `finance.ts` | `calculateMarketValue` (exponencial por overall), `calculatePlayerSalary`, `calculateTeamBudget`, `calculateTransferBudget`, `calculateTicketRevenue`, `calculateSponsorshipRevenue`, `calculateFacilityCosts`, `weeklyWages`, `calculateWageLimit` — espelhado em `frontend/src/utils/finance.ts` |
| Press | `press.ts` | `generatePressConference` (gera perguntas contextuais por categoria/tom), `calculatePressConferenceEffects` (mapeia tom de resposta → efeitos em moral/diretoria/torcida/mídia), `updateFanMood`, `updateMediaPressure`, `weeklyFanMoodDecay`, `weeklyMediaPressureDecay`, `getMediaPressurePerformanceModifier`, `getFanMoodRevenueModifier`, `RESPONSE_OPTIONS` (banco de respostas predefinidas por tom) |

### Motor de Partida (`helpers/matchEngine.ts`)

**`getTacticalBonus()`**
- Bônus táticos: `attacking` +4%, `defensive` +8% (base)
- Mentalidade ofensiva +5%, defensiva +4%
- Considera: contra-pressionamento, linha defensiva, estilo de passe, ritmo, pressão, desarme, etc.

**Multiplicadores de força por tática (em `teamAttack` e `teamDefense`):**
- `attacking`: Ataque ×1.12, Defesa ×0.85
- `balanced`: Ataque ×0.88, Defesa ×0.88
- `defensive`: Ataque ×0.88, Defesa ×1.20

**`calculateTeamStrength()`**
- Calcula força baseada nos 11 primeiros jogadores
- Combina CA com atributos técnicos, mentais e físicos (pesos diferentes)
- Aplica `getTacticalBonus()`

**`simulateMatchResult()`** — Modelo de Gols Esperados (xG) + Poisson (usado internamente como componente de probabilidade)
- **Força ofensiva e defensiva separadas** por posição (FWD/MID/DEF/GK), ponderadas por forma e condição física
- Atributos reais: `finishing`, `tackling`, `marking`, `reflexes`, `composure`, `positioning`, etc.
- **Multiplicadores de tática** aplicados em `teamAttack` e `teamDefense` (ver acima)
- **Gols esperados (λ):** `BASE_GOALS × (ataque / defesa adversária)^1.15 × vantagem de casa (1.12)` — `BASE_GOALS = 2.2`
- **Amostragem de Poisson** (Knuth's algorithm, cap 10) para o número de gols de cada time
- **Autor do gol ponderado** por finalização + posição (FWD peso 3.2, MID 1.5, DEF 0.45, GK 0.02)
- **Assistências** atribuídas por passe/visão/cruzamento, priorizando meias (~62% dos gols têm assistência)
- **Estatísticas coerentes** (chutes, no alvo, posse, passes, xG) derivadas dos lambdas e gols
- Retorna `MatchResult` com `goalDetails[]` (scorerId, assistId, minute) além de events e stats

**`simulateFullMatch()`** — Simulação completa passo a passo (90 minutos)
- Inicializa estado via `initLiveMatchState()` e roda `simulateMinute()` 90 vezes
- Cada minuto gera ações individuais (passe, drible, chute, desarme, interceptação) com `LiveMatchState`
- Aplica boosts de intervenção se houver
- Constrói `MatchResult` final + `calculatePlayerMatchRatings()` + `generatePostMatchReport()`
- Retorna `MatchResult & { playerRatings, bestPlayer, postMatchReport }`
- Usado para AI-vs-AI e auto-finalização de partidas do usuário

**`simulateMinute()`** — Simula 1 minuto de jogo (ação individual)
- Decide entre chutar/driblar/passar baseado em posição da bola e pressão
- **Bolas paradas integradas:** escanteios após defesa do goleiro (20%) ou chute para fora (35% se no ataque); faltas em posição perigosa (>65% ataque) disparam `simulateFreeKick`; pênaltis (8% chance se falta na área); laterais ocasionais (5%)
- Usa `SetPiecesConfig` do time para determinar cobrador, tipo de cobrança, alvo, marcação defensiva, barreira, contra-ataque
- Atributos relevantes: `crossing`, `heading`, `jumping`, `freeKicks`, `finishing`, `composure`, `commandOfArea`, `aerialReach`, `reflexes`, `marking`
- Atualiza `LiveMatchState` (ballPos, events, stats, goalDetails, actions)
- Usado tanto em partidas ao vivo (revelação progressiva) quanto em `simulateFullMatch()`

**`generatePostMatchReport()`** — Análise tática pós-jogo
- **Mapa de calor:** 9 zonas (3×3) por time, intensidade 0-1 baseada em contagem de ações
- **Insights táticos:** positivos/negativos/neutros sobre posse, finalização, defesa
- **Comentários do assistente:** conselhos táticos, de jogador e de formação
- **Pass breakdown:** passes certos/errados por time
- **Attack zones:** distribuição por flanco (esquerda/centro/direita)

**`calculatePlayerMatchRatings()`**
- Notas baseadas em **contribuição real** (por `playerId`), não aleatória
- Gols (+1.15) e assistências (+0.65) contam diretamente
- Goleiro/zaga: bônus por clean sheet, penalidade por gols sofridos
- Atacante sem gol é penalizado; vitória/derrota ajusta a nota
- Forma e condição física influenciam; teto de qualidade baseado em CA (exceção para 2+ gols)
- Retorna `PlayerMatchRating[]` com stats coerentes por posição (passes, tackles, etc.)

---

## 🔌 API REST (`backend/src/routes/game.ts`)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/health` | Health check → `{ status: 'ok' }` |
| `GET` | `/api/state` | Retorna estado completo (non-function keys) |
| `POST` | `/api/init` | Executa `initGame()` |
| `POST` | `/api/action` | Executa action genérica: `{ action, args }` → `{ result, state }` |

**`/api/action` fluxo:**
1. Auto-discover action names do store (funções, **excluindo internas do Zustand**: setState, getState, subscribe, destroy, getInitialState)
2. Valida args com Zod schema (`actionSchemas`)
3. Caso especial: `updateTeam` recebe `[teamId, newTeam]` em vez de updater
4. Executa `fn.apply(store, args)`
5. Retorna `{ result, state }`

### Validação Zod (`backend/src/validation/schemas.ts`)

91 schemas cobrindo todas as actions. Tipos comuns: `zString`, `zNumber`, `zNumberNonNeg`, `zMatchIndex`, `zSlot` (1|2), `zEmpty`. Actions sem schema emitem `console.warn`. Novos schemas: `loanPlayerSchema`, `recallLoanedPlayerSchema`, `buyLoanedPlayerSchema`, `activateReleaseClauseSchema`, `raiseBidSchema`, `withdrawBidSchema`, `addToShortlistSchema`, `removeFromShortlistSchema`, `getShortlistSchema`, `dismissScoutRecommendationSchema`.

### Erros (`backend/src/utils/errors.ts`)

- `AppError` — erro base com `code`, `statusCode`, `details`
- `ValidationError` — subclass para erros de validação Zod (400)
- `toErrorResponse()` — serializa erro para JSON response

### Middleware

| Middleware | Arquivo | Função |
|------------|---------|--------|
| CORS | (express) | Permite cross-origin |
| JSON Body | (express) | Limite 5mb |
| Request Logger | `requestLogger.ts` | `INFO/WARN method path → status (duration)` |
| Rate Limiter | `rateLimiter.ts` | 120 req/min por IP (429 se exceder); cleanup de entradas expiradas a cada 5min |
| Auth | `auth.ts` | Bearer token (opcional, ativa se `API_TOKEN` env set) |
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

**`NAV_ITEMS`** define as 11 telas da sidebar com path, label e **ícone lucide** (`icon: NavIcon` componente, não mais emoji).

**Shell dark Football Manager (`app-fm.css`, escopado em `.fm-shell-fm`):** classe `fm-shell-fm` é adicionada ao `.fm-app` quando há time selecionado. Aplica tema dark (fundo com glow verde, sidebar/actionbar dark) por cima do tema legado claro/escuro (importado por último em `main.tsx`). Paleta espelha `tactics-fm.css` (verde de acento `#3fbf6b`, azul `#3d7bf5`).

**CSS compartilhado (`fm-shared.css`, escopado em `.fms-page`):** extrai o padrão visual da página `/taticas` para todas as demais páginas. Define variáveis CSS (cores, bordas, painéis), e classes base reutilizáveis: `.fms-topbar` (barra superior com logo, título, subtítulo, botões de ícone, data e botão Continuar), `.fms-subtabs`/`.fms-subtab` (abas secundárias), `.fms-body--scroll` (corpo com scroll), `.fms-content` (área de conteúdo flex), `.fms-toolbar` (barra de ferramentas com filtros), `.fms-table`/`.fms-table-wrap` (tabelas com header sticky, hover, zebra), `.fms-chip`/`.fms-badge` (chips e badges coloridos), `.fms-card`/`.fms-stat-card` (cards e stat cards), `.fms-bar`/`.fms-bar__fill` (barras de progresso), `.fms-input`/`.fms-select`/`.fms-dropdown` (controles de formulário), além de utility classes (flex, gap, text colors, padding). Todas as 10 páginas (Elenco, Partidas, Classificação, Transferências, Treino, Dinâmica, Caixa de Entrada, Imprensa, Finanças, Visão do Clube) agora usam `.fms-page` como container raiz com a topbar padrão.

**Sidebar:**
- Colapsável (botão toggle estilizado)
- Logo com ícone `Globe` verde + "FM Web"
- Ícones lucide por item; item ativo com texto/borda verde
- Badge de inbox não-lidas
- Footer: ThemeToggle

**Action bar (topo do main):**
- Voltar (deselectTeam), Início (/elenco), Continuar (advanceWeek), Save 1, Save 2 — todos com ícones lucide; barra com gradiente verde→dark; Continuar em azul à direita (`margin-left:auto`)

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
- `startNextSeason` usa `apiAction('startNextSeason', []).then(syncFromResponse)`

### Tema (`frontend/src/hooks/useTheme.ts` + `utils/theme.ts`)

- **3 preferências:** `light`, `dark`, `system`
- **Storage:** `fm-theme-pref` em localStorage
- **Anti-flash:** inline script em `index.html` aplica tema antes do React montar
- **System listener:** `matchMedia('(prefers-color-scheme: dark)')` quando preference = `system`
- **Aplicação:** `document.documentElement.dataset.theme` + `colorScheme`
- **Componente:** `ThemeToggle` (radio group compact)

### Ordenação de Tabelas (`frontend/src/hooks/useSortable.ts`)

- **Hook reutilizável** `useSortable<T>(initialKey, initialDirection)` — gerencia `SortState<T>` (key + direction) e `toggleSort(key)` que alterna asc/desc
- Aplicado em: `SquadTable`, `FinanceView` (folha salarial), `DynamicsView` (satisfação), `LeagueTable`, `MatchCenter` (classificação inline)
- Cabeçalhos clicáveis com indicador ↑/↓; CSS `--sortable` classes com `cursor: pointer` e hover

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
- `SquadTable`: Pos, Nome, Idade, CA, Forma, Cond., Moral, Status, Valor, Salário, Lesão — **cabeçalhos clicáveis para ordenação** (asc/desc) via `useSortable`
- `PlayerDetailPanel`: drawer lateral (desktop) / overlay (mobile)
- `PlayerCard`: card resumido do jogador

### MatchCenter (`match/MatchCenter.tsx`)

- Calendário, resultados, classificações, partidas ao vivo
- `MatchEventDisplay`, `MatchActionDisplay`, `StatBar`, `MatchStatsDisplay`, `LiveDataHub`
- **Match cards:** badges de status (Agendada/Ao Vivo/Finalizada), tag "Seu Jogo", placar com VS central
- **Live mode:** `setInterval` 2s → `generateLiveMatchMinute()`; scoreboard com nomes dos times + barra de progresso (minuto/90)
- **Estatísticas:** barras de comparação dual (casa vs fora) com xG, posse, chutes, passes
- **Player ratings:** `PlayerRatingBadge` com badge circular colorido por faixa (9+ excelente, 7-8 bom, 5-6 médio, 3-4 fraco), grid responsivo
- **Standings:** indicadores de zona (Libertadores top 4, Sul-Americana 5-6, Rebaixamento últimos 4) com marcadores coloridos + legenda
- Substituições (máx 5) + Gritos + Finalizar
- **Visualização 2D** (`MatchPitch2D`) integrada no modo ao vivo e no modal de detalhes
- **Relatório pós-jogo** (`PostMatchReportView`) exibido após conclusão da partida

### MatchPitch2D (`match/MatchPitch2D.tsx`)

- **Campo 2D estilo "jogo de botão"** com discos coloridos representando os 22 jogadores
- **Posicionamento por formação:** GK/DEF/MID/FWD dispostos em linhas, casa ataca à direita, visitante à esquerda
- **Cores dos times** derivadas deterministicamente do nome (hash → hue), com correção se cores iguais
- **Bola animada** que desliza pelo campo (~0.7s), indo para jogadores avançados do time com posse
- **Movimento dinâmico dos jogadores (`computeShiftedPositions`):** a cada tick da bola (700ms), os 22 jogadores recalculam suas posições com um modelo tático de 5 camadas:
  1. **Shift de bloco** — toda a equipe avança (atacando) ou recua (defendendo) proporcional ao progresso da bola no campo; bloco acompanha lateralmente o lado da bola
  2. **Comportamento individual por posição** — GK acompanha bola lateralmente e sai da meta sob pressão; DEF sobe no ataque (laterais mais pela ponta) e recua na defesa; MID cobre todo o meio-campo com pressing; FWD faz runs diagonais no ataque e volta para pressionar na defesa
  3. **Pressing** — jogador mais próximo da bola persegue ativamente (50-55% da distância); segundo mais próximo faz cobertura/dobra (25%)
  4. **Espaçamento** — jogadores não-envolvidos se abrem para o lado oposto da bola, evitando amontoamento
  5. **Limites por posição (`POS_RANGE`)** — GK restrito à área (1-14%), DEF até meio-campo (5-60%), MID quase todo o campo (18-82%), FWD de meio-campo ao gol adversário (30-95%); limites invertidos para o time visitante
  6. **Micro-jitter** — movimento natural aleatório de ±2% em cada eixo
- **Estados dinâmicos (`homeDyn`/`awayDyn`):** posições atualizadas a cada tick durante partida ao vivo; posições estáticas no modal de detalhes
- **Celebração de gol:** bola corre pro gol, jogadores do time atacante avançam em direção ao gol, disco do autor pisca em dourado, letreiro "GOL!" com nome; ao fim da celebração todos voltam às posições base
- **Placar ao vivo** com relógio pulsante, **barra de posse** e **ticker do último lance**
- **Transições CSS suaves** (`left`/`top` 0.7s) nos discos dos jogadores sincronizadas com a velocidade da bola
- No modal de detalhes (jogos concluídos) o campo aparece estático com formações e placar final

### TransferMarket (`transfer/TransferMarket.tsx`)

- Tabs: Mercado, Scouting, Ofertas, Adiados, Parcelas, Bônus, Acordos, Realizados, Empréstimos, Shortlist, Recomendações, Guerra de Ofertas
- `buyPlayer`, `makeOffer`, `acceptOffer`, `deferTransfer`, `negotiateCounterOffer`
- `assignScout` → `ScoutReportCard`
- Parcelas (`InstallmentClauseDisplay`), Bônus (`PlayerBonusDisplay`)
- `terminateTransferAgreement`
- **Empréstimos:** lista de `LoanDeal` ativos com ações recallar/comprar
- **Shortlist:** lista de `ShortlistEntry` ordenada por prioridade, com botão negociar
- **Recomendações:** `ScoutRecommendation` não-dismissed com nota, motivo, dispensar
- **Guerra de Ofertas:** `BiddingWar` ativos com input de nova oferta, aumentar/retirar
- **Market extras:** botão ☆ Adicionar à Shortlist + botão Cláusula de Rescisão em cada card
- **Scouts panel:** painel de olheiros com experiência, missões concluídas e barra de progresso

### TacticsView (`tactics/TacticsView.tsx`)

**Redesign estilo Football Manager (tema dark, escopado em `.fm-tactics-fm` via `tactics-fm.css`).** Layout fiel ao FM com dados reais do time:
- **Topbar:** logo do clube, título "Táticas", subtítulo com próximo jogo (oponente + C/F), data (temporada/semana) e botão **Continuar** (`advanceWeek`); setas de navegação ciclam formações (`cycleFormation`); ícones Globe → `/clube` e Trophy → `/classificacao`
- **Subtabs:** Overview, Player, Opposition, Set pieces, Roles, Numbers — Overview/Player mostram tabela de seleção; Opposition mostra análise do adversário; Roles mostra tabela de papéis/funções por slot; Set pieces tem painel completo de bolas paradas; Numbers é placeholder
- **Campo vertical (`FORMATIONS`):** GK embaixo → ataque no topo; marcadores com camisa, código do role + duty (cores por linha: GK/DEF verde, MID âmbar, FWD vermelho); **drag-and-drop** troca jogadores entre slots (`swapSlots` → atualiza `startingXI` + `tacticsConfig.playerRoles`)
- **Toolbar do campo:** "Editar tática" (toggle painel), botão Plus (auto-preencher escalão com melhores jogadores por posição via `autoFillBestXI`), botão Save (`saveGame(1)` com feedback de status)
- **Indicadores:** Entrosamento / Intensidade / Resposta + banco lateral com nomes reais dos reservas (`benchPlayers`)
- **Tabela de seleção:** colunas Instruções (barra colorida + role/duty), Nac, Habilidade (estrelas via `currentAbility`), Jogador, Posição, Con (fitness), Pre, Mor (cor por moral), Carga, Desempenho, Últ. 5, Méd; titulares por slot + reservas; botão "Sugestão de seleção" e "Escolha rápida" disparam `autoFillBestXI`; botão Filter alterna entre titulares e elenco completo (`showAllSquad`)
- **Painel "Editar tática":** formação (chips), mentalidade, passe, ritmo (escreve em `team.formation/teamMentality/passingStyle/tempo`)
- Mapas `ROLE_ABBR` / `DUTY_ABBR` traduzem roles/duties armazenados em `tacticsConfig.playerRoles` para abreviações FM
- **Aba Set pieces (`SetPiecesPanel`):** painel com 2 colunas (Ataque/Defesa); Ataque: escanteios (cobrança: 1º poste, 2º poste, área, curto, borda — cobrador + alvo/cabeçador), faltas (tiro direto, cruzamento, curto, bola longa — cobrador), laterais (curto, longo, rápido), pênaltis (cobrador); Defesa: escanteios (marcação: individual/zonal/misto + contra-ataque sim/não), faltas (marcação + barreira: pequena/média/grande); selects de jogador mostram atributos relevantes (Cr=Crossing, Cab=Heading, Imp=Jumping, Fl=FreeKicks, Fin=Finishing, Com=Composure); persiste em `tacticsConfig.setPieces` via `updateSetPieces`
- **Pendente (próxima iteração):** edição detalhada de instruções individuais, conteúdo da aba Numbers

### InboxView (`inbox/InboxView.tsx`)

- 7 tipos de mensagem (Transfer, Lesão, Sugestão, Diretoria, Base, Treino, Financeiro)
- Filtros por tipo; modais funcionais (lesão, diretoria, financeiro)
- `BOARD_REPLY_CATEGORIES` em `constants.ts`

### TrainingView (`training/TrainingView.tsx`)

- Grid 7×3 (Manhã/Tarde/Noite); tipos: Físico, Técnico, Coesão, Médico, Recuperação, Leve
- Monitor de fadiga e risco por jogador (cores: verde→vermelho) — **sem botão "Recuperar"** (removido para evitar recuperação instantânea durante treino)
- Progressão de atributos (`getPlayerAttributeProgression`)
- Sessões de prevenção

### DynamicsView (`dynamics/DynamicsView.tsx`)

- Pirâmide de hierarquia (Líderes → Outros)
- Grupos sociais por `socialGroup` — cards visuais com avatar de grupo, avatares circulares com iniciais por jogador, barra de coesão (moral média), badges de posição e status, accent gradient no topo por grupo (até 6 cores)
- Árvore social com nós de influência e conexões
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

### SeasonSummaryModal (`season/SeasonSummaryModal.tsx`)

- Exibido automaticamente ao final de cada temporada (quando `seasonSummary` não é null)
- Mostra: colocação final, zona (Libertadores/Sul-Americana/Meio de Tabela/Rebaixamento), pontos, V/E/D, gols pró/contra, artilheiro e líder de assistências do time
- Botão "Iniciar Temporada X" → `startNextSeason()` (reseta stats, gera novo calendário)
- Se `isFinalSeason` (temporada 3), exibe mensagem de fim de jogo sem botão de continuação

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
0. PRÉ-JOGO: Usuário clica "Intelligence Center" → getPreMatchAnalysis(matchIndex)
   └─ Backend roda 500 simulações Monte Carlo (simulateMatchResult) para prever:
      - Probabilidade de vitória/empate/derrota (%)
      - Placar mais provável e gols esperados (xG)
      - Duelos decisivos (atacante vs defensor, meio-campo, goleiro vs atacante)
      - Comparação de forma recente (últimos 5 jogos)
      - Recomendação tática (mentalidade, abordagem, risco)
   └─ Frontend exibe modal PreMatchBriefing com visual rico
1. Usuário clica "Simular Partida" → simulateMatch(matchIndex)
   └─ Backend PRÉ-COMPUTA o resultado completo UMA vez (fonte única de verdade)
   └─ Armazena events, stats, playerRatings no objeto match
2. MatchCenter inicia setInterval (2s) → generateLiveMatchMinute()
   └─ Revela eventos pré-computados até o minuto atual (placar sempre consistente)
   └─ Estatísticas escaladas pelo progresso da partida (minuto/90)
   └─ MatchPitch2D mostra animação 2D em tempo real
3. Usuário: substituir, gritar (applyMatchIntervention)
4. Fim: finishMatch() ou minute atinge 90
   └─ Usa o resultado já pré-computado (sem re-simular, sem contagem dupla)
   └─ applyMatchResultToTeams() atualiza classificação UMA vez
```

### Avançar Semana (`advanceWeek`)
```
1. Usuário clica "Continuar" → advanceWeek() → POST /api/action
2. Backend advanceWeek():
   ├─ Se semana > 38: gera SeasonSummary, seta gameOver se temporada 3, return
   ├─ Auto-finaliza partida pendente do usuário (continua simulação se ao vivo, ou simula do zero)
   ├─ Simula partidas dos outros times via simulateFullMatch() (passo a passo, 90 min)
   ├─ Deixa a partida do usuário PENDENTE (jogável ao vivo)
   ├─ Gera youth intake na semana 1
   ├─ Aplica treino semanal (se plano definido)
   ├─ Atualiza finanças (bilheteira, patrocínio, salários)
   ├─ Gera incoming transfers (35% chance)
   ├─ Gera inbox messages (lesões, recomendações, contexto)
   ├─ Processa parcelas vencidas e bônus
   ├─ Atualiza classificação (leagueTable)
   ├─ processAIWeeklyDecisions() — IA adversária: transferências AI-vs-AI, ajustes táticos, renovações
   ├─ applyWeeklyMoraleDynamics() — dinâmica de moral para todos os times (6 motores)
   ├─ processScoutMissions() — progresso de olheiros
   ├─ updatePromiseCountdown() + captureWeeklyAttributeSnapshot()
   └─ Incrementa currentWeek
3. Response { state } → syncFromResponse → UI atualizada
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

1. **Gerar clubes** → `initGame()` carrega 20 times reais do Brasileirão (fallback: 8 procedurais) → escolher time
2. **Avançar semanas** via "Continuar"; calendário round-robin (times do database, 38 semanas por temporada)
3. **Partidas do jogador:** ficam **pendentes** a cada rodada (jogáveis ao vivo no Centro de Partidas com visualização 2D); demais auto-simuladas via `simulateFullMatch()`; partida não jogada é auto-finalizada na próxima rodada
4. **Até 5 substituições + gritos** em partida ao vivo
5. **Relatório pós-jogo** gerado para todas as partidas (mapa de calor, insights, conselhos)
6. **Transferências** com scouting, contra-ofertas, parcelas, bônus e acordos
7. **Transferências adiadas** (`deferTransfer`) — podem ser reinstadas ou rejeitadas
8. **IA adversária** — 19 clubes AI tomam decisões ativas: transferências AI-vs-AI (janelas 1-12 e 20-26), ajustes táticos a cada 4 semanas, renovações de contrato, demissão de técnico
9. **Dinâmica de moral semanal** — 6 motores: promessas, tempo de jogo, forma, cascata do capitão, cascata de grupo social, regressão à média
10. **Treino semanal** afeta atributos; snapshot semanal para progressão
11. **Youth intake** automático na semana 1; academia de jovens + equipe reserva
12. **Promessas** decrementam a cada `advanceWeek()`
13. **Salários** ajustáveis em Finanças (recalcula `wageBill`)
14. **Até 2 slots de save** em disco; sidebar grava via `saveGame()`
15. **Risco de lesão** aumenta com carga acumulada; prevenção reduz risco
16. **Árvore social** gerada; influencia moral e dinâmicas
17. **Diretoria** envia mensagens; satisfação varia com respostas
18. **Tema** claro/escuro/sistema com persistência em localStorage
19. **Multi-temporada** — até 3 temporadas consecutivas; resumo de fim de temporada exibido; `startNextSeason()` reseta stats e gera novo calendário; `gameOver` após temporada 3

---

## ⚠️ Limitações de Produto (Não-Bug)

| Área | Status | Pendências |
|------|--------|------------|
| Testes automatizados | ✅ | Smoke tests (frontend) + errors/schemas tests (backend) |
| Testes de UI | 🟡 | Sem Playwright/Cypress no CI |
| Liga | 🔲 | 20 times (database real), sem descenso/subida |
| IA adversária | ✅ | AI Manager ativo: transferências, táticas, renovações, demissões |
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
npm run test:watch   # Vitest em watch mode
npm run lint         # eslint src
npm run lint:fix     # eslint src --fix
npm run format       # prettier --write src
npm run format:check # prettier --check src
```

**Portas:** Backend `:3001` | Frontend Vite `:5173` (proxy `/api` → `:3001`)

---

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| Arquivos TS/TSX (backend) | ~49 |
| Arquivos TS/TSX (frontend) | ~36 |
| Slices de store (backend) | 14 |
| Helpers de store (backend) | 10 |
| Tipos de domínio (backend) | 14 arquivos |
| Componentes React | ~26 |
| Telas na sidebar | 11 |
| Schemas Zod | 99 |
| Times por partida | 20 (database real) ou 8 (fallback procedural) |
| Temporadas máximas | 3 |

---

## 🔑 Pontos de Extensibilidade

1. **Novos tipos:** `backend/src/types/{dominio}.ts` + barrel em `game.ts`; espelhar em `frontend/src/types/game.ts`
2. **Geração procedural:** `backend/src/utils/playerGenerator.ts`
3. **Regras de jogo:** slice correspondente em `backend/src/store/slices/`
4. **Lógica pura:** helper correspondente em `backend/src/store/helpers/`
5. **Nova action:** adicionar ao slice + schema Zod em `schemas.ts` + thin client em `frontend/src/store/gameStore.ts`
6. **Nova tela:** componente em `frontend/src/components/` + rota em `App.tsx` + `NAV_ITEMS`
7. **Estilos:** `frontend/src/styles.css` (design tokens oklch() com fallbacks hex, badge tokens semânticos, light/dark via `[data-theme]`) + `styles-supplement.css` (Night Pitch theme, `prefers-color-scheme: dark` auto) + `styles-mobile.css` (breakpoint intermediário 900px, reduced backdrop-filter) + `app-fm.css` (shell dark FM, escopado `.fm-shell-fm`) + `fm-shared.css` (CSS compartilhado do padrão /taticas, escopado `.fms-page`, com topbar, toolbar, table, chips, badges, cards, stat grid, progress bars e utility classes) + `components/tactics/tactics-fm.css` (tela de táticas dark FM, escopado `.fm-tactics-fm`)
8. **Saves:** `backend/src/services/saveService.ts` + slice `saves.ts` + `SaveSlot.tsx` (frontend)
9. **Tema:** `frontend/src/utils/theme.ts` + `hooks/useTheme.ts` + `ThemeToggle.tsx`
10. **API:** nova rota em `backend/src/routes/game.ts`
11. **Middleware:** `backend/src/middleware/`
12. **Validação:** adicionar schema em `backend/src/validation/schemas.ts`

---

## 🎯 Próximos Passos Prioritários

1. **Expandir Fase 2:** múltiplas divisões, copa
2. Corrigir escala de salários no gerador procedural
3. Persistência completa do estado backend (além dos saves)
4. PWA + sincronização cloud
5. Testes E2E (Playwright) para regressão dos fluxos save/voltar/carregar
6. WebSocket para live match (em vez de polling)
7. Schema Zod para `startNextSeason` (atualmente sem validação)

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

**Última atualização:** Junho 2026 — sistema multi-temporada (até 3, `startNextSeason`, `SeasonSummary`, `gameOver`); IA adversária ativa (helper `aiManager.ts` — transferências AI-vs-AI em janelas, ajustes táticos por zona da tabela, demissão de técnico, renovações de contrato); dinâmica de moral semanal (helper `moraleDynamics.ts` — 6 motores: promessas, tempo de jogo, forma, cascata do capitão, cascata de grupo social, regressão à média); motor de partida atualizado (`simulateFullMatch`/`simulateMinute`/`initLiveMatchState` — simulação passo a passo para todas as partidas); relatório pós-jogo (`generatePostMatchReport` — mapa de calor 3×3, insights táticos, conselhos do assistente, breakdown de passes); novos tipos `PostMatchReport`, `HeatMapZone`, `TacticalInsight`, `AssistantAdvice`, `SeasonSummary`; novos componentes `PostMatchReportView` e `SeasonSummaryModal`; helpers agora são 9 (era 7); `startNextSeason` sem schema Zod; **sistema de transferências expandido:** empréstimos (`LoanDeal` — loanPlayer, recallLoanedPlayer, buyLoanedPlayer), cláusulas de rescisão (`activateReleaseClause`), guerra de ofertas (`BiddingWar` — raiseBid, withdrawBid), shortlist (`ShortlistEntry` — addToShortlist, removeFromShortlist, getShortlist), recomendações de scouts (`ScoutRecommendation` — dismissScoutRecommendation), experiência de scouts (`Scout.experience`, `Scout.missionsCompleted`); novos campos no `GameState`: `shortlist`, `scoutRecommendations`, `activeLoans`, `biddingWars`; compatibilidade de saves atualizada em `saves.ts`; 9 novos schemas Zod (total 91); UI do `TransferMarket` com 4 novas abas (Empréstimos, Shortlist, Recomendações, Guerra de Ofertas) + botões de shortlist/cláusula nos cards do mercado + painel de olheiros com experiência
