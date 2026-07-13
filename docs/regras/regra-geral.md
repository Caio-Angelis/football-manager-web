# Regra Geral do Jogo

## Visão Geral

Football Manager Web é um simulador de gestão de futebol inspirado no Football Manager. O jogador assume o controle de um clube do Brasileirão e é responsável por todas as decisões: táticas, transferências, treino, finanças e dinâmica do plantel. O objetivo é conduzir o clube ao longo de uma temporada de 38 rodadas, buscando o título, classificação para torneios continentais ou evitando o rebaixamento.

O jogo roda com arquitetura cliente-servidor: um backend em Express mantém todo o estado do jogo em memória, e o frontend em React consome esse estado via API REST. Todas as regras e simulações acontecem no backend.

---

## Estrutura da Temporada

- **Duração:** 38 rodadas (semanas) por temporada, representando um campeonato de pontos corridos.
- **Temporadas máximas:** O jogo suporta até **3 temporadas consecutivas**.
- **Times:** 20 clubes reais do Brasileirão Série A 2025, carregados a partir de arquivos JSON com dados reais (jogos, gols, assistências, atributos). Se o database não estiver disponível, o jogo gera 8 times procedurais como fallback.
- **Calendário:** A cada rodada, os 20 times são embaralhados e pareados dois a dois, gerando **10 partidas por semana**.
- **Classificação:** Calculada após cada rodada, ordenando por pontos, saldo de gols e gols pró.

---

## Zonas da Tabela

- **Título (Libertadores):** Top 4 — classificação para torneios continentais
- **Sul-Americana:** 5º ao 8º lugar
- **Zona segura:** 9º ao antepenúltimo lugar
- **Rebaixamento:** Últimos 3 colocados — marcados como rebaixados ao final da temporada (semana 38)

---

## Fim de Temporada

Ao completar 38 rodadas, o jogo exibe um **resumo de fim de temporada** com:
- Colocação final
- Zona (Libertadores, Sul-Americana, Meio de Tabela, Rebaixamento)
- Artilheiro e líder de assistências do time
- Pontos, V/E/D, gols pró/contra

O usuário pode iniciar a próxima temporada, que:
- Reseta os stats dos times
- **Limpa todo o estado de transferências e scouting:** incomingTransfers, transfers, counterOffers, deferredTransfers, inbox, scoutReports, pendingInstallments, incomingBonuses, transferAgreements, scoutMissions, shortlist, scoutRecommendations, activeLoans, biddingWars, fanMood, mediaPressure
- Gera novo calendário

---

## Condição de Fim de Jogo (Game Over)

Após a rodada 38 da **3ª temporada**, o jogo seta `gameOver = true` e exibe o `SeasonSummaryModal`. Não há botão de continuação. O usuário pode carregar um save anterior, mas não há sistema de pontuação final ou ranking.

### Demissão por Insatisfação da Diretoria

**Não implementada.** A `boardSatisfaction` varia de -100 a 100 (começa em 50), mas não há verificação de demissão em `advanceWeek`. A diretoria pode enviar mensagens críticas, mas não pode demitir o usuário. O único game over é após a temporada 3.

---

## Fluxo de Jogo

1. **Iniciar jogo** → 20 times reais são carregados → usuário escolhe seu clube
2. **Avançar semana** ("Continuar"):
   - Partida pendente do usuário é auto-finalizada (se não jogou)
   - Partidas dos outros times são simuladas automaticamente
   - Nova partida do usuário fica pendente (jogável ao vivo)
   - Finanças, fadiga, lesões e contratos são processados
   - Ofertas de transferência podem chegar (sistema inteligente baseado em crises posicionais da IA)
   - IA adversária toma decisões (transferências, táticas, renovações, empréstimos, agentes livres)
   - Dinâmica de moral e pedidos de transferência são processados
   - Missões de scouting progridem e conhecimento decai
   - Guerras de ofertas e empréstimos ativos são processados
   - Humor da torcida e pressão midiática decaem
   - Treino semanal é aplicado e snapshots de atributos são capturados
   - Classificação é atualizada
   - Mensagens do inbox são geradas
3. **Jogar partida ao vivo** (opcional):
   - Intelligence Center (opcional, pré-jogo): análise preditiva via Monte Carlo
   - Visualização 2D em tempo real, minuto a minuto
   - Substituições e gritos táticos
   - Ratings de jogadores ao final
4. **Mercado de transferências** (a qualquer momento)
5. **Gerenciar time** (a qualquer momento): táticas, treino, finanças, dinâmica
6. **Fim da temporada** (semana 38): resumo + opção de próxima temporada

---

## Avançar Semana (`advanceWeek`)

Ordem de processamento a cada avanço de semana:

1. **Guarda:** Se `isAdvancing`, `seasonSummary` ou `gameOver` → return
2. **Bloqueio por lesão:** Se jogador lesionado no XI titular → `matchBlockMessage`, return
3. **Valida XI:** `healTeamsXI` garante que todos os times tenham XI válido
4. Se semana > 38: gera `SeasonSummary`, seta `gameOver` se temporada 3, return
5. **Partidas:** Auto-finaliza partida pendente do usuário, simula partidas AI via `simulateFullMatch()`, deixa partida do usuário **PENDENTE**
6. **Youth intake:** Gera juvenis na semana 1 (se `youthIntakeCompleted` é false)
7. **Finanças:** Atualiza receitas (bilheteira, patrocínio, transmissão) e despesas (salários, facilities, staff) + prêmio por partida
8. **Incoming transfers:** `maybeGenerateIncomingTransfer()` — sistema inteligente baseado em crises posicionais da IA (não mais 35% fixo)
9. **Fadiga e lesões (times humanos):** `applyFatigueDecayToPlayer`, `healInjuryForPlayer`, decremento de contrato com avisos (4 e 2 semanas)
10. **Condição degradada:** `updateDegradedConditionForPlayer` para todos os jogadores
11. **Risco de lesão:** Calcula risco e gera lesões semanais (0.5% base + risk×0.03%), gera recomendações no inbox
12. **Parcelas e bônus:** Processa parcelas vencidas (auto-paga ou marca default), verifica triggers de bônus
13. **Classificação:** `calculateLeagueStandings()` e sincroniza `leaguePosition` em todos os times
14. **Contratos AI:** Decrementa `contractEnd` dos jogadores dos times AI
15. **IA adversária:** `processAIWeeklyDecisions()` — transferências AI-vs-AI, cláusulas de rescisão, empréstimos, ajustes táticos, renovações, agentes livres
16. **Contra-ofertas:** Resolve contra-ofertas pendentes (IA aceita/rejeita baseado em preço vs valor de mercado)
17. **Dinâmica de moral:** `applyWeeklyMoraleDynamics()` em todos os times (6 motores: promessas, tempo de jogo, forma, cascata capitão, grupo social, regressão à média)
18. **Pedidos de transferência:** `processTransferRequests()` — apenas times humanos
19. **Fadiga AI:** `applyFatigueDecayToPlayer` para times AI
20. **Scouting:** `processScoutMissions()`, `decayScoutKnowledge()`, `generateScoutRecommendations()`
21. **Guerras de ofertas:** `processBiddingWars()` — IA aumenta lances ou desiste
22. **Empréstimos:** `processLoans()` — decrementa semanas, retorna jogadores, executa compras obrigatórias
23. **Press:** `weeklyFanMoodDecay()` e `weeklyMediaPressureDecay()` — humor da torcida e pressão midiática
24. **Promessas e snapshots:** `updatePromiseCountdown()` + `captureWeeklyAttributeSnapshot()`
25. **Treino semanal:** Aplica plano de treino a jogadores não-lesionados (se definido)
26. **Declínio mensal:** `applyMonthlyAgeDecline()` a cada 4 semanas para jogadores 31+
27. **Incrementa `currentWeek`**

**Lock anti-concorrência:** `isAdvancing` impede chamadas concorrentes de `advanceWeek`.

**Bloqueio por lesão:** Se houver jogador lesionado no XI titular, o avanço é bloqueado com `matchBlockMessage`.

---

## Database de Times

### Database Real

Carrega 20 times reais do Brasileirão a partir de arquivos JSON em `DataBase jogadores/`. Prioridade: `initGame()` tenta carregar do database primeiro; se vazio, faz fallback procedural.

- Cada JSON tem: `time` (nome), `jogadores[]` (nome, posicao, jogos, gols, assistencias, velocidade, chute, passe, drible, defesa, fisico, over_geral)
- Mapeamento de posições: GOL→GK, ZAG/LAT→DEF, VOL/MEI→MID, ATA/PD/PE→FWD
- Reputação baseada no overall médio do elenco

### Geração Procedural (Fallback)

Usada quando o database não está disponível:
- Gera 8 times procedurais (4 Série A + 4 Série B)
- 15-20 jogadores por time (2 GK, 6 DEF, 5 MID, 3-4 FWD)
- Atributos com distribuição gaussiana (Box-Muller transform)
- Idades: 16-35 anos
- CA = overall × 10 + random; PA = CA × 1.5 + random
- Reputação define tier: elite (≥80), forte (≥60), regular (≥40), emergente

---

## Expectativas da Diretoria

Atribuídas por `assignBoardExpectations(teams)` em `initGame()`, baseadas na distribuição relativa das reputações dentro da liga:

- **Top 10%** por reputação → Título
- **Próximos 30%** → G4 / Libertadores
- **Próximos 40%** → Meio de tabela
- **Bottom 20%** → Evitar rebaixamento
