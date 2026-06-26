# AI Context - Football Manager Web
# Manter sempre atualizado
## Visão Geral do Projeto

**Football Manager Web** é um jogo de gestão de futebol estilo Football Manager, 100% frontend (React 19 + TypeScript + Zustand 5), sem backend. Interface 2D minimalista com sidebar, cards e tabelas.

**Localização:** `C:\Users\caioa\Desktop\football-manager-web`

**Progresso estimado:** ~98% da especificação completa (ver `IMPLMENTATION_CHECKLIST.md`). Bugs conhecidos pós-teste UI: ver `ERRORCHECKLIST.md`. Fluxos completos documentados em `docs/fluxo.md`.

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
├── docs/                         # Documentação
│   ├── fluxo.md                 # Fluxos de navegação completos (12 fluxos)
│   ├── screenshot_main.png      # Screenshot da tela principal
│   └── snapshot_main.txt        # Snapshot do DOM da tela principal
└── src/
    ├── main.tsx                  # ErrorBoundary + styles imports
    ├── App.tsx
    ├── styles.css                # ~1900 linhas, variáveis --fm-*
    ├── styles-supplement.css     # Estilos adicionais (saves, error boundary, etc.)
    ├── styles-mobile.css         # Media queries mobile (breakpoints: 1024/768/640/480px)
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
- Gera 8 times procedurais
- Reputação define tier (elite ≥80, forte ≥60, regular ≥40, emergente)
- Cada tier tem diferentes faixas de orçamento, salário e atributos
- Formações aleatórias: 4-4-2, 4-3-3, 3-5-2, 5-2-2
- Táticas e mentalidade aleatórias

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
| Iniciar jogo | `initGame()` — gera 8 times procedurais |
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

### Motor de Partida (Interno)

**`calculateTeamStrength()`**
- Calcula força baseada nos 11 primeiros jogadores
- Combina CA com atributos técnicos, mentais e físicos (pesos diferentes)
- Aplica `getTacticalBonus()` baseado em táticas

**`getTacticalBonus()`**
- Bônus táticos variam de +0.01 a +0.04 por configuração
- Considera: mentalidade, contra-pressionamento, linha defensiva, estilo de passe, ritmo

**`simulateMatchResult()`**
- Compara forças dos times (home/away com boost de 0.02-0.05)
- Gera gols baseado em diferença de força + random
- Cria eventos, stats (xG, posse, chutes, passes)

**`generateLiveMatchMinute()`**
- Avança minute (0-90)
- Gera eventos ao vivo aleatórios
- Suporta substituições e gritos (5 substs por time)

---

## 🖥️ Componentes UI

### Navegação (`App.tsx`)

**Dois estados de UI:**

1. **Sem time selecionado** — `TeamSelection` + painel `SaveSlot` (slots 1 e 2)
2. **Com time** — sidebar colapsável com 10 telas + footer: **Voltar**, **Início**, **Continuar ▶**, **💾 Save 1/2** + badge de inbox

**`NAV_ITEMS`** define as 10 telas:
| ID | Tela | Componente | Ícone |
|----|------|------------|-------|
| `squad` | Elenco | `SquadView` | 👥 |
| `match` | Partidas | `MatchCenter` | ⚽ |
| `league` | Classificação | `LeagueTable` | 📊 |
| `transfer` | Transferências | `TransferMarket` | 🔄 |
| `tactics` | Táticas | `TacticsView` | 📋 |
| `training` | Treino | `TrainingView` | 🏋️ |
| `dynamics` | Dinâmica | `DynamicsView` | 📊 |
| `inbox` | Caixa de Entrada | `InboxView` | 📬 |
| `finance` | Finanças | `FinanceView` | 💰 |
| `club` | Visão do Clube | inline em `App.tsx` | 🏢 |

**Fluxos completos:** Ver `docs/fluxo.md` — documentação detalhada de 12 fluxos principais cobrindo todos os caminhos de navegação, ações e sub-fluxos.

**Toast System:**
- `addToast(message, type)` — adiciona notificação temporária
- `dismissToast(id)` — remove notificação
- Container no topo/baixo da app com auto-dismiss

**`handleSaveSlotSelect()`:** Callback chamado ao carregar um save via `SaveSlot`

### TeamSelection (`TeamSelection.tsx`)

**Funcionalidade:** Permite escolher um dos 8 times gerados proceduralmente ou criar novos.

**Features:**
- Lista times por tier (elite, forte, regular, emergente)
- Cada time mostra: escudo SVG, nome, reputação, formação, mentalidade, playstyle
- `getCrestColors()` gera cores únicas baseadas no nome do time
- Botão "Gerar Novos Times" reseta com novos times procedurais
- Ao selecionar, chama `selectTeam(teamId)` que seta `selectedTeam`

**Team Crest:**
- SVG escudo com iniciais do time
- Cores determinísticas baseadas em hash do nome
- Tier define tons (elite usa azul sólido)

### SquadView (`src/components/squad/SquadView.tsx`)

**Fluxo:**
1. Exibe cabeçalho com nome do time, formação, tática, mentalidade
2. Mostra estatísticas de temporada (pontos, jogos, vitórias, empates, derrotas)
3. Renderiza `SquadTable` com todos os jogadores
4. Ao clicar em jogador, abre `PlayerDetailPanel`

**PlayerDetailPanel:**
- Desktop: Drawer lateral
- Mobile: Overlay fullscreen
- Mostra todos atributos do jogador, posição, contrato, valor, status

**SquadTable:**
- Tabela com coluna: Posição, Nome, Idade, CA, PA, Salário, Status
- Ordenação por posição
- Destaque para jogadores da escalação

### MatchCenter (`src/components/match/MatchCenter.tsx`)

**Funcionalidade:** Exibe calendário, resultados, classificações e partidas ao vivo.

**Componentes Internos:**
- `MatchEventDisplay` — exibe evento com ícone, minuto, descrição
- `MatchStatsDisplay` — compara xG, posse, chutes, passes
- `LiveDataHub` — indicador de status da partida ao vivo

**Partida ao Vivo:**
- `useEffect` cria timer a cada 2 segundos para avançar minuto
- Botões de Substituição (troca jogador) e Grito (boost de moral)
- Limit de 5 substituições por time
- Mostra pulse indicator quando ao vivo
- Botão "Finalizar" para encerrar manualmente

**Calendário:**
- Lista todas as partidas da rodada atual
- Resultados passados com expand/collapse
- Próxima partida destacada

### TransferMarket (`src/components/transfer/TransferMarket.tsx`)

**Tabs:**
1. **Mercado** — Jogadores disponíveis para compra
2. **Ofertas** — Propostas recebidas
3. **Acordos** — Acordos contratuais ativos

**Funcionalidades:**
- **Compra:** `buyPlayer(playerId, sellerTeamId)` com verificação de orçamento
- **Venda:** Aceitar/Rejeitar propostas de outros times
- **Contra-oferta:** `negotiateCounterOffer()` para negociar preço
- **Scouting:** `assignScout()` para gerar relatórios de jogadores
- **Parcelas:** `InstallmentClauseDisplay` mostra pagamentos parcelados
- **Bônus:** `PlayerBonusDisplay` mostra bônus de desempenho
- **Acordos:** `TransferAgreementDisplay` mostra contratos com opção de `terminateTransferAgreement()`

### TacticsView (`src/components/tactics/TacticsView.tsx`)

**7 Mentalidades:**
- Muito Defensivo, Defensivo, Cauteloso, Equilibrado, Positivo, Ofensivo, Muito Ofensivo

**Possessão (4 opções):**
- Largura (estreito, equilibrado, largo)
- Estilo de Passe (curto, misto, direto)
- Ritmo (lento, equilibrado, rápido)
- Foco (nenhum, esquerda, direita)

**Transição (2 opções):**
- Após Perder a Posse (contra-pressionar, recuar)
- Após Ganhar a Posse (contra-atacar, manter posse)

**Sem Posse (5 opções):**
- Linha de Engajamento (alta, média, baixa)
- Linha Defensiva (alta, média, baixa)
- Intensidade de Pressão (baixa, média, alta)
- Estilo de Desarme (agressivo, contenção)
- Armadilha de Impasses (on/off)

**Drag-and-Drop:**
- Arrastar jogadores para posições na formação
- Configurar roles individuais por posição

### InboxView (`src/components/inbox/InboxView.tsx`)

**7 Tipos de Mensagens:**
- Transfer (💰), Lesão (🏥), Sugestão (💡), Diretoria (👔), Base (🌱), Treino (🏋️), Financeiro (📊)

**Ações por Tipo:**
| Tipo | Botões |
|------|--------|
| Transfer | Aceitar, Recusar, Negociar, Adiar |
| Lesão | Ver Relatório, Marcar Treino, Marcar como Lido |
| Sugestão | Aplicar, Dispensar, Marcar como Lido |
| Diretoria | Responder, Arquivar, Marcar como Lido |
| Base | Convocar, Ignorar, Marcar como Lido |
| Treino | Ver Detalhes, Marcar como Lido |
| Financeiro | Ver Relatório, Arquivar, Marcar como Lido |

**Filtros:** Todos, Transfer, Lesão, Sugestão, Diretoria, Base, Treino, Financeiro

**Modais Funcionais:**
- Lesão: Abre `InjuryReport` com tipo, gravidade, dias fora, prognóstico
- Diretoria: Abre modal para responder com `handleBoardReply()`
- Financeiro: Abre `FinancialReport` com balanço, receitas, despesas

### TrainingView (`src/components/training/TrainingView.tsx`)

**Calendário 7×3:**
- Grid de 7 dias × 3 blocos (Manhã, Tarde, Noite)
- Tipos: Físico, Técnico, Coesão, Médico, Recuperação, Leve
- Padrão: descanso para todos os slots

**Foco Semanal:**
- Botões para alterar foco (aplica a todos os slots)
- Botões: Salvar Plano, Aplicar Treino Agora, Capturar Snapshot

**Risco de Lesão:**
- `getInjuryRisk(playerId)` calcula risco baseado em carga
- Cores: Verde (baixo), Amarelo (moderado), Laranja (alto), Vermelho (crítico)
- Botão "Ver Resumo" mostra todos os jogadores classificados

**Progressão de Atributos:**
- `getPlayerAttributeProgression(playerId)` mostra deltas semanais
- Tabela comparativa de evolução

**Sessão de Prevenção:**
- Tipos: Médico, Recuperação, Leve
- Seleciona jogadores afetados
- `applyPreventionSession()` aplica recuperação

### DynamicsView (`src/components/dynamics/DynamicsView.tsx`)

**Pirâmide de Hierarquia:**
- Líderes (Key Player, liderança ≥15)
- Altamente Influentes (Regular Starter, liderança ≥12)
- Influentes (Rotation)
- Jovens Promessas (Young Talent)
- Outros (Excess)

**Grupos Sociais:**
- Agrupa jogadores por `socialGroup`
- Mostra número de membros por grupo

**Promessas:**
- `getActivePromises()` retorna promessas ativas com countdown
- Mostra jogador, objetivo, semanas restantes
- Countdown decresce a cada `advanceWeek()`

**Form Rating:**
- Cores: Excelente (verde), Bom (verde-claro), Médio (amarelo), Ruim (laranja), Péssimo (vermelho)

### FinanceView (`src/components/finance/FinanceView.tsx`)

**Resumo Financeiro:**
- Orçamento Atual
- Orçamento Transferências
- Folha Salarial (semanal)
- Balanço Semual (receitas - despesas)

**Receitas:**
- Bilheteira: `(reputation / 100) × 0.5 × played`
- Patrocínio: `(reputation / 100) × 0.3 × currentWeek`

**Despesas:**
- Salários: `wageBill` (semanal)
- Instalações: `facilitiesLevel × 0.1`

**Projeção 6 Semanas:**
- Calcula balanço futuro baseado em receitas/despesas projetadas
- Mostra tendência (alta/baixa)

**Controle da Folha:**
- Meter visual: folha atual vs limite sugerido (`budget × 0.4`)
- Alerta quando acima do limite

**Ajuste de Salário:**
- Slider para cada jogador
- `adjustPlayerSalary(playerId, newSalary)` atualiza folha
- Recalcula `wageBill` automaticamente

### SaveSlot (`src/components/saves/SaveSlot.tsx`)

**Props:**
- `slotNumber`: 1 ou 2
- `onSaveSlot`: callback ao carregar/salvar

**Funcionalidades:**
- **Salvar:** `handleSave()` — chama `store.saveGame(slotNumber)`
- **Carregar:** `handleLoad()` — chama `store.loadGame(slotNumber)`
- **Deletar:** `handleDelete()` — confirmação antes de deletar
- Mostra metadata: nome do time, semana, temporada, data de salvamento
- Feedback visual: mensagem de sucesso/erro, botão desabilitado durante save

### UI Components (`src/components/ui/`)

**Button (`Button.tsx`):**
- Variantes: `primary`, `secondary`, `success`
- Estados: disabled, loading
- Classes CSS: `fm-button--primary`, `fm-button--success`, etc.

**Toast (`Toast.tsx`):**
- Tipos: `info`, `success`, `error`
- Auto-dismiss após 5 segundos
- Container com `onDismiss` callback

**ErrorBoundary (`ErrorBoundary.tsx`):**
- Captura erros de renderização
- Mostra mensagem amigável (diferencia corrupção de dados de bugs de código)
- Botão "Tentar novamente" — `reset(soft=true)` limpa apenas o boundary
- Botão "Limpar dados" — só aparece para erros reais de corrupção; remove localStorage e recarrega
- `STATE_CORRUPTION_PATTERNS`: detecta 'corrupt', 'invalid state', 'failed to parse', 'JSON'

---

## 🔄 Fluxo de Dados

```
User → App.tsx → useGameStore (Zustand + localStorage)
  ├─ playerGenerator.ts (initGame, youth intake)
  ├─ simulateMatchResult / generateLiveMatchMinute
  └─ advanceWeek (partidas, finanças, inbox, treino, promessas)
```

### Fluxo de Inicialização
```
1. App carrega → Zustand recarrega estado de localStorage
2. Se selectedTeam === null → mostra TeamSelection + SaveSlots
3. Se selectedTeam === "..." → mostra sidebar + tela selecionada
```

### Fluxo de Jogo
```
1. Usuário clica "Continuar" → advanceWeek()
2. advanceWeek() executa:
   ├─ Simula todas as partidas dos outros times
   ├─ Atualiza classificação
   ├─ Gera mensagens de inbox aleatórias
   ├─ Atualiza finanças
   ├─ Atualiza promessas
   ├─ Captura snapshot de atributos (semanal)
   └─ Incrementa currentWeek
```

### Fluxo de Partida ao Vivo
```
1. Usuário clica "Assistir" na próxima partida
2. MatchCenter inicia live mode com setInterval
3. generateLiveMatchMinute() avança minuto a cada 2s
4. Usuário pode: substituir jogador, gritar
5. Fim: usuário clica "Finalizar" ou minute atinge 90
```

### Fluxo de Transferência
```
1. Mercado: usuário clica "Comprar" → buyPlayer()
2. Ou: recebe oferta → inbox → aceitar/rejeitar/negociar
3. Contra-oferta: negotiateCounterOffer() → espera resposta
```

### Fluxo de Save/Load
```
Salvar:
  1. Sidebar "💾 Save 1" → saveGame(1)
  2. Salva em gameStore (memória) + localStorage (fm-save-slots-v3)

Carregar:
  1. Tela inicial → SaveSlot "Carregar"
  2. loadGame(1) → restaura estado + seta selectedTeam
  3. App redireciona para SquadView
```

---

## 🎮 Regras de Jogo

1. **Gerar clubes** → escolher time
2. **Avançar semanas** via "Continuar"; calendário round-robin (8 times, 38 semanas)
3. **Partidas do jogador:** modo **live**; demais auto-simuladas
4. **Até 5 substituições + gritos** em partida ao vivo
5. **Transferências** com scouting, contra-ofertas, parcelas e acordos
6. **Treino semanal** afeta atributos; snapshot semanal para progressão
7. **Youth intake** automático na semana 1
8. **Promessas** decrementam a cada `advanceWeek()`
9. **Salários** ajustáveis em Finanças (recalcula `wagebill`)
10. **Até 2 slots de save**; sidebar grava via `saveGame()`; tela inicial usa `SaveSlot`
11. **Risco de lesão** aumenta com carga acumulada; prevenção reduz risco
12. **Árvore social** gerada semanalmente; influencia moral e dinâmicas
13. **Diretoria** envia mensagens baseadas em performance; satisfação varia com respostas

---

## 🐛 Bugs e Débito Técnico (`ERRORCHECKLIST.md`)

Testes de UI via **Chrome DevTools MCP** (jun/2026) cobriram botões da tela inicial, sidebar e conteúdo das 9 telas. Detalhes e passos de correção estão em `ERRORCHECKLIST.md`.

| # | Item | Severidade | Status |
|---|------|------------|--------|
| 1 | `SaveSlot` crash: `getSaveSlots()` retorna metadata, componente acessa `.metadata.teamName` | **Crítico** | ✅ Corrigido |
| 2 | Tipo `onSaveSlot` espera `SaveSlot`, recebe `SaveSlotMetadata` | Alto | ✅ Corrigido |
| 3 | `handleSaveSlotSelect` em `App.tsx` é placeholder | Alto | ✅ Corrigido |
| 4 | Botões **Save 1/2** na sidebar sem feedback (toast) | Alto | ✅ Corrigido |
| 5 | `ErrorBoundary` sugere "estado corrompido" e apaga todo localStorage | Médio | ✅ Corrigido |
| 6 | Botões Substituição/Gritos sem estado disabled fora de partida ao vivo | Médio | ✅ Corrigido |
| 7 | Ações da Inbox só no DOM com mensagem selecionada | Médio | ✅ Corrigido |
| 8 | 404 `/favicon.ico` no console | Baixo | ✅ Corrigido |
| 9 | ~54–83 campos sem `id`/`name` (principalmente `TacticsView`) | Baixo | ✅ Corrigido |
| 10 | HMR: `BOARD_REPLY_CATEGORIES` exportado de `InboxView.tsx` | Baixo | ✅ Corrigido |

**Status:** ✅ Todos os 10 itens resolvidos (jun/2026). Refinamento do `ErrorBoundary.tsx` removeu padrão `'undefined'` de `STATE_CORRUPTION_PATTERNS` para evitar falsos positivos (bugs de código agora tratados como bugs normais, não corrupção de estado).

---

## ⚠️ Limitações de Produto (Não-Bug)

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
| Telas na sidebar | 10 |
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

1. **Expandir Fase 2:** múltiplas divisões, copa, IA adversária
2. Expansão Fase 2: múltiplas divisões, copa, IA adversária
3. Corrigir escala de salários no gerador procedural
4. PWA + sincronização cloud
5. Testes E2E (Playwright) para regressão dos fluxos save/voltar/carregar

---

## 🧪 Validação Rápida (Pós-Alterações em Saves)

```text
Gerar clubes → Assumir → Save 1 → Voltar → painel de saves OK
→ Carregar → jogo restaurado → F5 → Carregar slot 2
```

Console sem `teamName` / Error Boundary. Ver também itens de verificação em `ERRORCHECKLIST.md`.

---

**Última atualização:** Junho 2026 — saves, ErrorBoundary, testes MCP, `ERRORCHECKLIST.md`
