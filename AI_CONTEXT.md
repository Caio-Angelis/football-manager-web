# AI Context - Football Manager Web

## Visão Geral do Projeto

**Football Manager Web** é um jogo de gestão de futebol estilo Football Manager, 100% frontend (React 19 + TypeScript + Zustand 5), sem backend. Interface 2D minimalista com sidebar, cards e tabelas.

**Localização:** `C:\Users\caioa\Desktop\football-manager-web`

**Progresso estimado:** ~98% da especificação completa (ver `IMPLMENTATION_CHECKLIST.md`). Bugs conhecidos pós-teste UI: ver `ERRORCHECKLIST.md`.

**Stack:** Vite 6, React 19, Zustand 5 (persistência em localStorage), TypeScript 5.6 strict mode.

**Persistência:**
- `fm-game-storage-v3` — estado principal do jogo (Zustand persist; `saveSlots` excluídos do blob principal)
- `fm-save-slots-v3` — até 2 slots de save (`SaveSlot[]` com `metadata` + `gameState`)

---

## 📁 Estrutura de Arquivos

```
football-manager-web/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── AI_CONTEXT.md
├── ERRORCHECKLIST.md           # Bugs encontrados + como corrigir (testes MCP jun/2026)
├── IMPLMENTATION_CHECKLIST.md
├── PRODUCT.md
├── Projeto.md
├── DESIGN.md
└── src/
    ├── main.tsx                # ErrorBoundary + styles
    ├── App.tsx
    ├── styles.css              # ~1900 linhas, variáveis --fm-*
    ├── styles-supplement.css   # Estilos adicionais (saves, error boundary, etc.)
    ├── smoke/
    │   ├── setup.ts
    │   └── gameFlows.test.ts   # 23 smoke tests (Vitest)
    ├── types/
    │   └── game.ts             # Tipos centrais (~770 linhas)
    ├── store/
    │   └── gameStore.ts        # Motor do jogo + saves (~2830 linhas)
    ├── utils/
    │   └── playerGenerator.ts  # Geração procedural de jogadores/times
    ├── data/                   # Legado — não usado em runtime
    │   ├── players.json
    │   └── teams.json
    └── components/
        ├── ui/
        │   ├── Button.tsx
        │   ├── ErrorBoundary.tsx  # Captura erros; reset limpa localStorage
        │   ├── StatBar.tsx
        │   └── Toast.tsx
        ├── saves/
        │   └── SaveSlot.tsx       # UI de save/load na tela inicial (2 slots)
        ├── TeamSelection.tsx
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
        │   └── InboxView.tsx
        ├── training/
        │   └── TrainingView.tsx
        ├── dynamics/
        │   └── DynamicsView.tsx
        └── finance/
            └── FinanceView.tsx
```

---

## 🧩 Types (`src/types/game.ts`)

### Jogador (`Player`)
- **Atributos técnicos, mentais e físicos** (escala 1-20)
- **Atributos de GK** (`GKAttributes`)
- **Atributos ocultos** (`HiddenAttributes`)
- **CA/PA** (`currentAbility` / `potentialAbility`): escala 1-200
- **Contrato:** salário (milhares), `contractEnd` (semanas), cláusula de rescisão
- **Status:** moral, forma, condição física, lesão, `squadStatus`
- **Dinâmica:** `teamMates`, `socialGroup`, `promises` (interface `Promise` — usar alias `PlayerPromise` no store para evitar conflito com global)
- **Histórico:** `attributeHistory` para progressão de treino

### Time (`Team`)
- Identidade, finanças, infraestrutura, estatísticas de temporada
- **Táticas avançadas:** mentalidade (7 níveis), largura, passe, ritmo, pressão, etc.
- **`tacticsConfig`:** roles por posição + instruções individuais
- **`coachTreatment`**, `leagueForm`, `formRating`, `leaguePosition`

### Partida (`Match`)
- Resultado, data, status (`completed`)
- **Live match:** `isLive`, `liveMinute`, `liveEvents`, `liveStats`
- Eventos e stats finais (`events`, `stats`)

### Transferências
- `TransferOffer`, `IncomingTransfer`, `CounterOffer`
- `InstallmentClause`, `PlayerBonus`, `TransferAgreement`, `ScoutReport`

### Saves
- `SaveSlotMetadata` — `slotNumber`, `teamName`, `currentWeek`, `currentSeason`, `savedAt`
- `SaveSlot` — `{ metadata, gameState }` (snapshot parcial do `GameState` para restauração)
- `GameState.saveSlots` — array em memória; persistido separadamente em `fm-save-slots-v3`

### Outros
- `InboxMessage`, `InjuryReport`, `BoardReply`, `FinancialReport`
- `TrainingSession`, `WeeklyTrainingPlan`
- `SocialTree`, `SocialNode` — árvore social do plantel
- `GameState` + `GameActions` → `GameStore`

---

## ⚙️ Engine Procedural (`src/utils/playerGenerator.ts`)

| Função | Descrição |
|--------|-----------|
| `generatePlayer()` | Spawner principal com distribuição gaussiana |
| `generateTeam()` | Time completo com elenco, táticas e finanças |
| `generateYouthIntake()` | Fornada de jovens |
| `getRandomNationality()` | Nacionalidade ponderada pela reputação |
| `createDefaultTacticsConfig()` | Config tática padrão |
| `NAMES_DATABASE` | Banco de nomes por país |

**Fluxo inicial:** `TeamSelection` → "Gerar clubes" → `initGame()` → 8 times procedurais.

---

## 🎮 Game Store (`src/store/gameStore.ts`)

### Estado (`GameState`)
```typescript
selectedTeam, currentWeek, currentSeason, matches, teams,
transfers, incomingTransfers, counterOffers, inbox,
trainingPlan, youthIntakeCompleted, scoutReports,
pendingInstallments, incomingBonuses, transferAgreements,
boardReplies, boardSatisfaction, financialReports,
injuryHistory, preventionSessions, fatigueLog,
recommendations, degradedConditions, socialTree,
saveSlots  // SaveSlot[] — persistido em fm-save-slots-v3
```

### Ações principais

| Ação | Função |
|------|--------|
| Iniciar jogo | `initGame()` |
| Avançar tempo | `advanceWeek()` — simula partidas AI, finanças, inbox, youth intake, promessas, snapshot de atributos |
| Partida ao vivo | `simulateMatch()` → `generateLiveMatchMinute()` |
| Intervenção live | `applyMatchIntervention(index, 'substitution' \| 'shout')` |
| Treino | `setTrainingPlan()`, `applyWeeklyTraining()`, `captureWeeklyAttributeSnapshot()` |
| Transferências | `buyPlayer()`, `acceptIncomingTransfer()`, `negotiateCounterOffer()` |
| Scouting | `assignScout()` |
| Inbox | `handleInboxAction()`, `handleBoardReply()`, `getInjuryReport()`, `getFinancialReport()` |
| Dinâmica | `generateSocialTree()`, `updatePromiseCountdown()`, `getActivePromises()` |
| Finanças | `adjustPlayerSalary(playerId, newSalary)` |
| Lesões | `calculateInjuryRisk()`, `schedulePreventionSession()`, `getInjuryRiskSummary()` |
| Saves | `saveGame(1\|2)`, `loadGame(1\|2)`, `deleteSave(1\|2)`, `getSaveSlots()` → `SaveSlotMetadata[]` |
| Navegação | `deselectTeam()` — volta à tela de seleção de clube |

### Motor de partida (interno)
- `calculateTeamStrength()`, `getTacticalBonus()`, `simulateMatchResult()`
- Partidas do jogador: modo **live**; demais: simulação instantânea no `advanceWeek()`

---

## 🖥️ Componentes UI

### Navegação (`App.tsx`)
Duas fases de UI:
1. **Sem time selecionado** — `TeamSelection` + painel `SaveSlot` (slots 1 e 2)
2. **Com time** — sidebar colapsável com 9 telas + footer: **Voltar**, **Início**, **Continuar ▶**, **💾 Save 1/2** + badge de inbox

`ErrorBoundary` envolve toda a app em `main.tsx`.

| ID | Tela | Componente |
|----|------|------------|
| `squad` | Elenco | `SquadView` |
| `match` | Partidas | `MatchCenter` |
| `transfer` | Transferências | `TransferMarket` |
| `tactics` | Táticas | `TacticsView` |
| `training` | Treino | `TrainingView` |
| `dynamics` | Dinâmica | `DynamicsView` |
| `inbox` | Caixa de Entrada | `InboxView` |
| `finance` | Finanças | `FinanceView` |
| `club` | Visão do Clube | inline em `App.tsx` |

### Destaques por tela

**MatchCenter** — Calendário, classificação, modal live com stats/xG, substituições e gritos.

**TransferMarket** — Tabs Mercado/Ofertas/Acordos; scouting; parcelas e bónus.

**TacticsView** — 7 mentalidades, drag-and-drop, instruções por fase (posse/transição/sem posse).

**InboxView** — Filtros, modais funcionais: lesão, diretoria, relatório financeiro.

**TrainingView** — Calendário 7×3, foco semanal, risco de lesão, progressão de atributos.

**DynamicsView** — Hierarquia, satisfação, performance do clube, árvore social, promessas com countdown.

**FinanceView** — Balanço, projeção 6 semanas, ajuste de salário por jogador com slider.

---

## 🔄 Fluxo de Dados

```
User → App.tsx → useGameStore (Zustand + localStorage)
  ├─ playerGenerator.ts (initGame, youth intake)
  ├─ simulateMatchResult / generateLiveMatchMinute
  └─ advanceWeek (partidas, finanças, inbox, treino, promessas)
```

---

## 🎮 Regras de Jogo

1. Gerar clubes → escolher time
2. Avançar semanas via "Continuar"; calendário round-robin (8 times, 38 semanas)
3. Partidas do jogador: modo live; demais auto-simuladas
4. Até 5 substituições + gritos em partida ao vivo
5. Transferências com scouting, contra-ofertas, parcelas e acordos
6. Treino semanal afeta atributos; snapshot semanal para progressão
7. Youth intake automático na semana 1
8. Promessas decrementam a cada `advanceWeek()`
9. Salários ajustáveis em Finanças (recalcula `wageBill`)
10. Até 2 slots de save; sidebar grava via `saveGame()`; tela inicial usa `SaveSlot`

---

## 🐛 Bugs e débito técnico (`ERRORCHECKLIST.md`)

Testes de UI via **Chrome DevTools MCP** (jun/2026) cobriram botões da tela inicial, sidebar e conteúdo das 9 telas. Detalhes e passos de correção estão em `ERRORCHECKLIST.md`.

| # | Item | Severidade | Status |
|---|------|------------|--------|
| 1 | `SaveSlot` crash: `getSaveSlots()` retorna metadata, componente acessa `.metadata.teamName` | **Crítico** | ✅ Corrigido |
| 2 | Tipo `onSaveSlot` espera `SaveSlot`, recebe `SaveSlotMetadata` | Alto | ✅ Corrigido |
| 3 | `handleSaveSlotSelect` em `App.tsx` é placeholder | Alto | Pendente |
| 4 | Botões **Save 1/2** na sidebar sem feedback (toast) | Alto | Pendente |
| 5 | `ErrorBoundary` sugere "estado corrompido" e apaga todo localStorage | Médio | Pendente |
| 6 | Botões Substituição/Gritos sem estado disabled fora de partida ao vivo | Médio | Pendente |
| 7 | Ações da Inbox só no DOM com mensagem selecionada | Médio | Pendente |
| 8 | 404 `/favicon.ico` no console | Baixo | Pendente |
| 9 | ~54–83 campos sem `id`/`name` (principalmente `TacticsView`) | Baixo | Pendente |
| 10 | HMR: `BOARD_REPLY_CATEGORIES` exportado de `InboxView.tsx` | Baixo | Pendente |

**Status:** ✅ Resolvido em `SaveSlot.tsx` e `App.tsx` (jun/2026). Tipos e acessos corrigidos.

---

## ⚠️ Limitações de produto (não-bug)

| Área | Status | Pendências |
|------|--------|------------|
| Testes automatizados | ✅ | 23 smoke tests em `src/smoke/gameFlows.test.ts` |
| Testes de UI | 🟡 | MCP manual; sem Playwright/Cypress no CI |
| Liga | 🔲 | Apenas 8 times, sem descenso/subida |
| IA adversária | 🔲 | Times AI não adaptam táticas |
| Salários gerados | 🟡 | `playerGenerator` pode gerar salários >> 500K (cap da UI) |
| Mobile | 🟡 | Layout responsivo básico; sem `@media` queries dedicadas |

---

## ⚙️ Comandos

```bash
npm install      # Instalar dependências
npm run dev      # Servidor de desenvolvimento (Vite)
npm run build    # tsc + vite build ✅ passa
npm run test     # Vitest — 23 smoke tests
npm run test:smoke  # build + testes completos
npm run preview  # Preview da build de produção
```

---

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| Arquivos TS/TSX em `src/` | ~27 |
| Linhas de código (est.) | ~10.000+ |
| Componentes React | ~22 |
| Times por partida | 8 (procedurais) |
| Telas na sidebar | 9 |
| Build JS (gzip) | ~104 KB |

---

## 🔑 Pontos de Extensibilidade

1. **Novos atributos/tipos:** `src/types/game.ts`
2. **Geração procedural:** `src/utils/playerGenerator.ts`
3. **Regras de jogo:** `src/store/gameStore.ts`
4. **Novas telas:** componente + `NAV_ITEMS` em `App.tsx`
5. **Estilos:** `src/styles.css` (variáveis `--fm-*`)
6. **Checklist de features:** `IMPLMENTATION_CHECKLIST.md`
7. **Checklist de bugs:** `ERRORCHECKLIST.md`
8. **Saves:** `SaveSlot.tsx` + ações em `gameStore.ts` (`saveGame`, `loadGame`, `deleteSave`)

---

## 🎯 Próximos Passos Prioritários

1. **Corrigir bugs do `ERRORCHECKLIST.md`** — ordem: itens 1–2 (saves/tipos ✅ resolvidos) → 3–4 (saves/UX) → 5 (ErrorBoundary)
2. Expansão Fase 2: múltiplas divisões, copa, IA adversária
3. Corrigir escala de salários no gerador procedural
4. PWA + sincronização cloud
5. Testes E2E (Playwright) para regressão dos fluxos save/voltar/carregar

---

## 🧪 Validação rápida (pós-alterações em saves)

```text
Gerar clubes → Assumir → Save 1 → Voltar → painel de saves OK
→ Carregar → jogo restaurado → F5 → Carregar slot 2
```

Console sem `teamName` / Error Boundary. Ver também itens de verificação em `ERRORCHECKLIST.md`.

---

**Última atualização:** Junho 2026 — saves, ErrorBoundary, testes MCP, `ERRORCHECKLIST.md`
