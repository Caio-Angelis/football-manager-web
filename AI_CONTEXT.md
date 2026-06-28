# AI Context - Football Manager Web
# Manter sempre atualizado
## Visão Geral do Projeto

**Football Manager Web** é um jogo de gestão de futebol estilo Football Manager. Arquitetura cliente-servidor: backend Express.js com estado em memória (Zustand) + saves em disco, frontend React 19 que delega mutações via API REST. Interface 2D minimalista com sidebar, cards, tabelas e tema claro/escuro.

**Localização:** `/home/caio/Área de trabalho/football-manager-web`

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
│       │   ├── errorHandler.ts  # AppError → JSON, 404 handler
│       │   ├── rateLimiter.ts   # 120 req/min por IP
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
│       │   └── helpers/         # Lógica pura extraída dos slices (9 helpers)
│       │       ├── matchEngine.ts   # simulateFullMatch, simulateMinute, initLiveMatchState, generatePostMatchReport, calculateTeamStrength, tacticalBonus, calculatePlayerMatchRatings, generateWeekMatches, applyMatchResultToTeams
│       │       ├── league.ts        # calculateLeagueStandings
│       │       ├── inbox.ts         # generateInboxMessage
│       │       ├── injury.ts        # calculatePlayerInjuryRisk, getRiskLevel
│       │       ├── training.ts      # applyTrainingToPlayer, captureSnapshot
│       │       ├── transfer.ts      # maybeGenerateIncomingTransfer, recalcWageBill
│       │       ├── scouting.ts      # maskAttributeValue, processScoutMissions, generateScoutReportForMission, calculateScoutGrade
│       │       ├── aiManager.ts     # processAIWeeklyDecisions — transferências AI-vs-AI, ajustes táticos, renovações de contrato
│       │       └── moraleDynamics.ts # applyWeeklyMoraleDynamics — 6 motores de moral (promessas, tempo de jogo, forma, cascata social, regressão)
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
        │   ├── theme.ts        # resolveTheme, applyTheme, getStoredThemePreference
        │   └── player.ts       # getFullName() — nome completo do jogador (mirror do backend)
        ├── styles.css             # ~105KB, variáveis --fm-*, light/dark via [data-theme]
        ├── styles-supplement.css  # ~107KB, estilos complementares (componentes, telas, responsivo)
        ├── styles-mobile.css      # ~7KB, media queries (1024/768/640/480px)
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
            │   ├── PostMatchReportView.tsx  # Relatório pós-jogo (mapa de calor, insights, conselhos)
            │   └── PostMatchReportView.css
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
  └─ Middleware: cors, json(50mb), requestLogger, rateLimiter, errorHandler
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
- **Status:** moral, forma, condição física, lesão, `squadStatus`
- **Dinâmica:** `teamMates`, `socialGroup`, `promises` (interface `Promise` — alias `PlayerPromise`)
- **Histórico:** `attributeHistory` para progressão de treino
- **Gestão:** `coachTreatment`, `trustLevel`, `cumulativeLoad`, `fatigueLog`

### Time (`team.ts`)
- Identidade, finanças, infraestrutura, estatísticas de temporada
- **Táticas avançadas:** mentalidade (7 níveis), largura, passe, ritmo, pressão, etc.
- **`tacticsConfig`:** roles por posição + instruções individuais
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
- `InstallmentClause`, `PlayerBonus`, `TransferAgreement`, `ScoutReport`
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
- `InboxMessage` (`inbox.ts`), `BoardReply` + `FinancialReport` (`financial.ts`)
- `TrainingSession`, `WeeklyTrainingPlan` (`training.ts`)
- `SocialNode`, `SocialTree` (`social.ts`)
- `FormResult`, `LeagueStandings` (`league.ts`)
- `SaveSlotMetadata`, `SaveSlot` (`saves.ts`)
- `YouthPlayer`, `YouthAcademy`, `ReserveTeamPlayer` (`youth.ts`)
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
| `createDefaultTacticsConfig()` | Config tática padrão (usado também pelo dataLoader) |
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
youthAcademy, reserveTeam,
scoutKnowledge (Record<string, number>), scoutMissions (ActiveScoutMission[]),
seasonSummary (SeasonSummary | null), gameOver (boolean),
shortlist (ShortlistEntry[]), scoutRecommendations (ScoutRecommendation[]),
activeLoans (LoanDeal[]), biddingWars (BiddingWar[])
```

### Slices (13)

| Slice | Arquivo | Responsabilidade |
|-------|---------|-----------------|
| Core | `core.ts` | `initGame` (database real + fallback procedural), `selectTeam`, `deselectTeam`, `updateTeam`, `advanceWeek` (auto-finaliza partida pendente, simula outras, processa IA adversária, dinâmica de moral, scouting, finanças, fadiga, parcelas, bônus, inbox; **treino aplicado após `set()` final** para persistir alterações), `startNextSeason` (reseta stats, gera novo calendário), `updateClubPerformance`, `updateLeagueForm`, `setLeaguePosition` |
| Match | `match.ts` | `simulateMatch` (inicia estado ao vivo via `initLiveMatchState`), `generateLiveMatchMinute` (simula 1 minuto via `simulateMinute`), `applyMatchIntervention`, `finishMatch` (continua simulação até minuto 90, gera `postMatchReport`) |
| Transfer | `transfer.ts` | `buyPlayer`, `makeOffer`, `acceptOffer`, `negotiatePlayerContract`, `deferTransfer`, `reinstateDeferredTransfer`, `rejectDeferredTransfer`, `negotiateCounterOffer`, `generateInstallmentClause`, `generatePlayerBonus`, parcelas, bônus, acordos, `loanPlayer`, `recallLoanedPlayer`, `buyLoanedPlayer`, `activateReleaseClause`, `raiseBid`, `withdrawBid` |
| Training | `training.ts` | `setTrainingPlan`, `applyWeeklyTraining` (passa o foco real — physical, technical, cohesion, medical, recovery, light — diretamente para `updatePlayerAttributes`), `applyTrainingCooldown` |
| Injury | `injury.ts` | `calculateInjuryRisk`, `schedulePreventionSession`, `recoverInjuredPlayer`, fadiga, recomendações |
| Inbox | `inbox.ts` | `handleInboxAction`, `handleBoardReply`, `markAsRead`, `removeMessage` |
| Financial | `financial.ts` | `generateFinancialReport`, `getFinancialReport`, `adjustPlayerSalary` |
| Scouting | `scouting.ts` | `assignScout` (sem playerId: embaralha candidatos antes de selecionar 3), `assignScoutMission`, `getScoutKnowledge`, `addToShortlist` (playerId, priority?, notes?), `removeFromShortlist`, `getShortlist`, `dismissScoutRecommendation` |
| Social | `social.ts` | `generateSocialTree`, `updateSocialConnections` (atualização imutável de edges) |
| Promises | `promises.ts` | `updatePromiseCountdown`, `getActivePromises`, `checkPromiseDeadlines`, `setCoachTreatment`, `setPlayerTrustLevel`, `setPlayerTrainingLoad` |
| Saves | `saves.ts` | `saveGame`, `loadGame`, `deleteSave` (disco via `saveService`) |
| Youth | `youth.ts` | `generateYouthPlayers`, `promoteYouthPlayer`, `setAcademyTraining`, reserva |
| Attributes | `attributes.ts` | `captureWeeklyAttributeSnapshot`, `getAttributeDelta`, `getPlayerAttributeProgression` |

### Helpers (9) — Lógica pura extraída

| Helper | Arquivo | Funções |
|--------|---------|---------|
| Match Engine | `matchEngine.ts` | `getTacticalBonus`, `calculateTeamStrength`, `getPossessionBias`, `simulateMatchResult` (xG+Poisson), `simulateFullMatch` (90min passo a passo), `simulateMinute`, `initLiveMatchState`, `calculatePlayerMatchRatings`, `generatePostMatchReport` (mapa de calor, insights, conselhos), `generateWeekMatches`, `applyMatchResultToTeams` |
| League | `league.ts` | `calculateLeagueStandings` |
| Inbox | `inbox.ts` | `generateInboxMessage` |
| Injury | `injury.ts` | `calculatePlayerInjuryRisk`, `getRiskLevel` |
| Training | `training.ts` | `applyTrainingToPlayer`, `captureSnapshot`, `updatePlayerAttributes` (recalcula CA com curva de idade: <21 ×1.5, 21-23 ×1.2, 24-27 ×0.8, 28-30 ×0.4, 31+ ×0.1) |
| Transfer | `transfer.ts` | `maybeGenerateIncomingTransfer`, `recalcWageBill` |
| Scouting | `scouting.ts` | `maskAttributeValue`, `maskPlayerAttributes`, `getBestScout`, `generateDefaultScouts`, `processScoutMissions`, `generateScoutReportForMission`, `calculateScoutGrade` |
| AI Manager | `aiManager.ts` | `processAIWeeklyDecisions` — orquestra `processAITransfers` (janelas 1-12 e 20-26, AI-vs-AI), `processAITactics` (ajustes a cada 4 semanas: rebaixamento 50/30/20 attacking/balanced/defensive, título 40% attacking em boa forma, mid-table 50% defensive após derrotas; demissão de técnico com nova formação), `processAIContracts` (renovação automática) |
| Morale Dynamics | `moraleDynamics.ts` | `applyWeeklyMoraleDynamics` — 6 motores: promessas expiradas, tempo de jogo vs. status, forma do time, cascata do capitão, cascata de grupo social, regressão à média |

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
1. Auto-discover action names do store (funções)
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
- Footer: ThemeToggle

**Action bar (topo do main):**
- Voltar (deselectTeam), Início (navega /elenco), Continuar ▶ (advanceWeek), 💾 Save 1, 💾 Save 2

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

- 7 mentalidades (Muito Defensivo → Muito Ofensivo)
- **Em Posse:** 4 opções multi-valor (largura, estilo de passe, ritmo, foco lateral) + 3 toggles (levar bola à área, centro das laterais, mais riscos)
- **Em Transição:** 2 opções (contra-pressionar/recuar + contra-atacar/manter posse)
- **Sem Posse:** 4 opções multi-valor (linha de engajamento, linha defensiva, intensidade de pressão, desarmes) + 1 toggle (armadilha de impedimento)
- Drag-and-drop de jogadores para posições no campo
- Roles individuais por posição (GK, DEF, MID, FWD — múltiplos roles cada)
- Instruções individuais por jogador

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
| Slices de store (backend) | 13 |
| Helpers de store (backend) | 9 |
| Tipos de domínio (backend) | 13 arquivos |
| Componentes React | ~25 |
| Telas na sidebar | 10 |
| Schemas Zod | 91 |
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
7. **Estilos:** `frontend/src/styles.css` (variáveis `--fm-*`, light/dark via `[data-theme]`)
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
