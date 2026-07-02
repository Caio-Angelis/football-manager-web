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
   - Classificação é atualizada
   - Finanças, treino, fadiga, lesões e promessas são processados
   - Ofertas de transferência podem chegar (35% de chance)
   - Missões de scouting progridem
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

1. Se semana > 38: gera `SeasonSummary`, seta `gameOver` se temporada 3, return
2. Auto-finaliza partida pendente do usuário (continua simulação se ao vivo, ou simula do zero)
3. Simula partidas dos outros times via `simulateFullMatch()` (passo a passo, 90 min)
4. Deixa a partida do usuário **PENDENTE** (jogável ao vivo)
5. Gera youth intake na semana 1
6. Aplica treino semanal (se plano definido)
7. Atualiza finanças (bilheteira, patrocínio, salários)
8. Gera incoming transfers (35% chance)
9. Gera inbox messages (lesões, recomendações, contexto)
10. Processa parcelas vencidas e bônus
11. Atualiza classificação (leagueTable)
12. `processAIWeeklyDecisions()` — IA adversária
13. `applyWeeklyMoraleDynamics()` — dinâmica de moral (6 motores)
14. `processScoutMissions()` — progresso de olheiros
15. `updatePromiseCountdown()` + `captureWeeklyAttributeSnapshot()`
16. `processWeeklyPressDecay()` — humor da torcida e pressão midiática
17. Incrementa `currentWeek`

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
