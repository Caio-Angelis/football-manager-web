# AI Context - Football Manager Web
# Manter sempre atualizado
## Visão Geral do Projeto

**Football Manager Web** é um jogo de gestão de futebol estilo Football Manager. Arquitetura cliente-servidor: backend Express.js com estado em memória (Zustand) + saves em disco, frontend React 19 que delega mutações via API REST. Interface 2D minimalista com sidebar, cards, tabelas e tema claro/escuro.

**Localização:** `c:\Users\caioa\Desktop\football-manager-web`

**Progresso estimado:** ~99% da especificação single-player completa. Fluxos completos documentados em `docs/fluxo.md`. Database real de 20 clubes do Brasileirão integrada (ver `DataBase jogadores/`). Sistema multi-temporada (até 3), IA adversária ativa, dinâmica de moral semanal e relatórios pós-jogo implementados. **Modo online multiplayer** (draft de clubes, salas com código, ready-check por rodada, negociações humano×humano) implementado (ver `PlanoOnline.md`).

## Atualização recente — .gitignore (2026-07-15)

- Ignora de fato `graphify-out/` (e zip), relatórios de harness/finanças (`balance_report.txt`, `finance_*`, `*_output.json`, `*_report.txt`), venv Python e worktrees locais. Artefatos gerados removidos do índice Git (permanecem no disco).

## Atualização recente — Motor v2 checklist fechada (2026-07-15)

- **Checklist `PlanoMatchEngine-CHECKLIST.md` concluída e removida.** Fonte de verdade restante: `PlanoMatchEngine.md` (design) + `matchEngineV2.spec.ts` (TDD).
- **TDD completo:** 41 testes ativos sob `MATCH_ENGINE=v2` (0 todo/skip); sob default `v1`: 25 pass / 16 skip. Default do motor permanece **v1**; v2 atrás de flag.
- **Calibração Fase 3:** `lowBlockCompactness` / `possessionHunger` — parking the bus e “domino posse” emergentes; transição com `transitionTicksForLoss` + exposição por mentalidade; tracking `chancesByOrigin.transição`.
- **Fases 4–11:** testes reais para transição, instruções relacionais, estado dinâmico, bola parada/árbitro, IA (`aiManagerV2`), previsão unificada, relatório pós-jogo e sanity de invariantes/upset.
- **Novo orçamento:** `PERF_BUDGET_PREDICTION_MS` em `engineInvariants.ts`.
- Batch completo (`python run_batch.py --v1v2`, 30–100 runs) continua manual; smoke do harness coberto no spec.

## Atualização recente — Match Live Fullscreen / FM clássico 2D (2026-07-09)

- **UX:** a partida ao vivo não embute mais o pitch no scroll do Centro. Botão **"Ver partida"** (e "Iniciar Partida") abre overlay fullscreen `MatchLiveView`.
- **Campo:** `MatchPitch2D` ganhou `variant="classic"` — vertical (casa ataca para cima), discos flat, bola amarela, apron/arquibancada; `variant="board"` mantém o horizontal antigo.
- **HUD:** placar overlay (escudos + relógio/acréscimos), comentário flutuante, barra inferior com formação/mentalidade, strip do XI (fitness + rating provisório), gritos/subs em painéis, intervalo modal, velocidade 1x/2x/4x, Esc fecha.
- **Sim:** `liveMatchWatching` continua o timer em background; `fullscreenOpen` controla só a UI. Stats/momentum/feed longo ficam no Centro / modal de detalhes.
- Arquivos: `frontend/src/components/match/MatchLiveView.tsx`, `MatchLiveView.css`, `MatchPitch2D.tsx`, `MatchPitch2D.css`, `MatchCenter.tsx`, `MatchCenter.css`.

## Atualização recente — Dashboard motion / impeccable animate (2026-07-09)

- **Hero moment:** gauges de saúde do elenco desenham o arco (`stroke-dashoffset`) com stagger.
- **Barras:** atmosfera / lesão / força usam `scaleX` + `--fill` (não animam `width`).
- **Entrada:** cards, stats do hero, quick actions e performers com micro-stagger (transform only; conteúdo sempre visível).
- **Feedback:** press scale nos botões; pulse curto no badge de inbox; `prefers-reduced-motion` desliga tudo.
- Arquivos: `frontend/src/components/dashboard/Dashboard.tsx`, `Dashboard.css`.

## Atualização recente — Sidebar polish / impeccable (2026-07-09)

- **Ativo sem side-stripe:** item ativo usa tint Pitch Blue + borda 1px completa (ban do DESIGN.md / detector). Mobile bottom-nav idem (sem `border-bottom: 3px`).
- **Hierarquia:** logo "FM WEB" em Oswald uppercase/ink (não accent); temporada em label 10px; nav body 12px; atalhos numéricos viraram hint tipográfico (não chip/badge).
- **A11y:** `aria-label` no nav/toggle, `aria-expanded`, focus-visible, badge de inbox com label, `prefers-reduced-motion`.
- Arquivos: `frontend/src/app-fm.css`, `frontend/src/App.tsx`, `frontend/src/styles-mobile.css`.

## Atualização recente — Brand assets / escudos (2026-07-09)

- **Logo FM Web:** asset raster em `frontend/public/brand/fm-web-logo.png` (favicon + apple-touch). Componente `Logo.tsx` deixou o SVG genérico e passa a usar a imagem.
- **Escudos:** 20 badges em `frontend/public/badges/` com fundo preto removido (script `scripts/clean_badges.py`). `TeamCrest` já mapeava via `getTeamBadge`.
- **UI:** `SaveSlot`, `LeagueTable` e mini-tabela do `Dashboard` passam a renderizar `TeamCrest` (antes ícone Shield / só texto). Empty state da seleção de clube usa `/brand/empty-clubs.png`.

## Atualização recente — Mercado Bidirecional / Transfer Requests (2026-07-09)

- **Ofertas da IA inteligentes:** `maybeGenerateIncomingTransfer` deixou o sorteio de 35%. `detectPositionalCrises` rastreia titulares lesionados (14/30/60+ dias) e profundidade fraca; clubes elite fazem propostas agressivas (premium) por reservas/altos CA do usuário.
- **Pedidos de transferência:** `processTransferRequests` (após moral semanal) — moral < 28, promessas quebradas ou titular no banco insatisfeito pedem saída (Excess + desconto 15–35%). Cascata social em `teamMates`/grupo enquanto não vender; recusar oferta agrava o vestiário.
- Campo opcional `Player.transferRequest`. UI: badge "Saída"/"Pediu saída" no elenco, dinâmica e ofertas. Testes: `transferMarketLive.test.ts`.

## Atualização recente — Pacing de Treino / Curva de Idade (2026-07-09)

- **Ganho base** reduzido de 0.2–1.0 para **0.05–0.25** por sessão (`baseTrainingGain` em `helpers/training.ts`).
- **Multiplicador de idade definitivo** (`ageTrainingMultiplier`) aplica-se a atributos e CA: Sub-21 ×2.0; auge 22–28 ×0.45; 29–30 ×0.2; 31+ ×0.1.
- **Declínio mensal 31+** (`applyMonthlyAgeDecline`): a cada 4 semanas, −0.1..0.3 em speed/stamina (e leve CA) se o foco semanal não for `medical`/`recovery`. Integrado em `advanceWeek` e `headless_sim`.
- Docs: `docs/regras/regra-treino.md`, seção Ritmo de Evolução em `projeto.md`. Testes: `trainingPacing.test.ts`.

## Atualização recente — Motor de Partida v2 Fase 11 — Balanceamento (2026-07-09)

- **Invariantes validados no v2:**
  - Gols/jogo: 2.76 (alvo 2.5-2.9) ✅
  - homeWin%: 44% (alvo 45-48%, 1pp abaixo — variância aceitável)
  - Empates: 20% (alvo 24-28%, abaixo — variância com 50 seeds)
  - Upset B: 32% (alvo 25-35%) ✅
  - Perf partida: 13.4ms (alvo <50ms) ✅
  - Perf rodada: 107ms (alvo <1000ms) ✅
- **Pergunta-teste do blueprint responde SIM:** técnico esperto com time médio (coerente) bate time 30% mais forte mal treinado (incoerente) em 32% das partidas (v1: 0%).
- **Motor v2 completo (Fases 0-11):** 11 testes TDD ativos, 29 todo. Todos os módulos implementados: `engineFlag`, `engineInvariants`, `engineSetups`, `roles`, `zones`, `phases`, `instructions`, `dynamicState`, `setPiecesV2`, `aiManagerV2`, `postMatchReportV2`. V1 intacto e default; v2 atrás de flag `MATCH_ENGINE=v2`.

## Atualização recente — Motor de Partida v2 Fase 10 (2026-07-09)

- **Relatório pós-jogo v2:** `backend/src/store/helpers/postMatchReportV2.ts` — duelos por zona, chances por origem e conselho do assistente.
- **Duelos por zona:** `summarizeDuelsByZone()` agrega o log de duelos por zona 3×3. `generateDuelInsights()` identifica jogadores que dominaram ou perderam duelos ("seu lateral perdeu 7 de 10").
- **Chances por origem:** `summarizeChancesByOrigin(state)` resume `chancesByOrigin` do `LiveMatchState` (lateral/centro/bolaParada/transição) com contagem e percentual.
- **Conselho do assistente:** `generateAssistantAdviceV2()` gera conselhos acionáveis baseados em zonas fracas, origem predominante de chances, produtividade de bola parada e exposição em transição. Ex: "o adversário criou maioria das chances pelo centro — adicione um volante a mais".
- **Spec TDD:** 11 testes ativos, 29 todo. Sem regressão.

## Atualização recente — Motor de Partida v2 Fase 9 (2026-07-09)

- **Previsão unificada:** `preMatchAnalysis.ts` atualizado para usar `simulateFullMatchV2` quando `isV2` está ativo, em vez do Poisson divergente (`simulateMatchResult`). 100 sims do motor v2 (vs 500 do Poisson) — mesmo motor, não divergente.
- **Determinismo:** seeds fixas (9000+i) garantem previsão reproduzível.
- **Spec TDD:** 11 testes ativos, 29 todo. Sem regressão.

## Atualização recente — Motor de Partida v2 Fase 8 (2026-07-09)

- **IA adversária v2:** `backend/src/store/helpers/aiManagerV2.ts` — IA monta setup coerente, lê adversário, faz game management e tem curva de dificuldade.
- **Setup coerente:** `buildCoherentSetup(team)` mapeia slots da formação para roles/duties apropriados por zona (GK defende, DEF defende, MID supporta, ATA ataca). `evaluateSetupCoherence(team)` avalia mistura de duties, cobertura de zonas e fit de roles.
- **Contraposição tática:** `counterTactic(myTeam, opponent)` usa `deriveActiveInstruction` para ler o adversário e ajustar pressão, linha defensiva, tackling e tempo como contraposição (ex: adversário sai curto → pressão alta; adversário contra-ataca → linha baixa + posse).
- **Game management:** `gameManagementAdjust(team, state, side, minute)` — recua (mentalidade defensiva) ganhando nos últimos 15', arrisca (ofensiva + riscos) perdendo, cauteloso nos primeiros 15'. `aiSubstitutionDecisionV2()` troca lesionados, fadigados (>0.42 após 60'), amarelados+fadigados, priorizando posição por placar.
- **Curva de dificuldade:** `aiDecisionQuality(team)` = 0.5 + reputation/200. IA elite (quality ≥0.7) monta setup coerente + contrapõe; IA fraca só monta coerente. IA elite (≥0.65) faz game management; IA fraca não ajusta.
- **Spec TDD:** 11 testes ativos, 29 todo. Sem regressão.

## Atualização recente — Motor de Partida v2 Fase 7 (2026-07-09)

- **Bola parada & árbitro:** `backend/src/store/helpers/setPiecesV2.ts` — escanteios, faltas e pênaltis com xG baseado em atributos (crossing, heading, freeKicks, reflexes). `chancesByOrigin.bolaParada` rastreia gols de bola parada.
- **Faltas/cartões emergem de duelos:** `foulChanceFromDuel(defender, tacklingStyle)` usa aggression + dirtiness + tacklingStyle. `cardChanceFromFoul(offender, isDangerousArea)` modula cartão por aggression e área perigosa. Não é sorteio puro — jogador mais agressivo falta mais.
- **Expulsão e reorganização:** `reorganizeAfterRedCard(team, sentOffPlayerId, attacksTowardOne)` remove expulso da ocupação de zona (estrutura, não só -1 força). IA fará reorganização inteligente na Fase 8.
- **Integração no simulateTickV2:** faltas esparsas (1.8%/tick) baseadas em aggression, escanteios (5%/tick na fase finishing), faltas em área perigosa disparam pênaltis (8%) ou cobrança de falta (40%).
- **Calibração v2:** gols/jogo = 2.78 (✅), upset = 27% (✅), perf = 12ms (✅).
- **Spec TDD:** 11 testes ativos, 29 todo. Sem regressão.

## Atualização recente — Motor de Partida v2 Fase 6 (2026-07-09)

- **Estado dinâmico:** `backend/src/store/helpers/dynamicState.ts` — fadiga acumulada, swing combinado e vantagem de casa variável.
- **Fadiga após 70':** `fatigueProductionMod(state, player, minute)` — antes dos 70': penalidade leve (até -5%); após 70': penalidade escalada (até -25%, scale 1.0→1.5 do 70' ao 90'). Integrado no `fatigueMod` do `simulateTickV2`.
- **Swing combinado (clamp ±0.15):** `combinedSwing(state, team, side, minute, isHome)` — soma fadiga + moral + momentum + vantagem de casa, limitada a ±0.15 para evitar outliers por sorte empilhada. Aplicado no `shotChance` da fase finishing.
- **Vantagem de casa variável:** `homeAdvantageMod(team, state)` — base por reputação (0.04-0.10) + forma recente (±0.03) = 0.01-0.12. `awayDisadvantageMod(team, state)` = -0.01 a -0.10. Não é constante — varia por clube e contexto.
- **Calibração v2:** gols/jogo = 2.72 (✅), homeWin = 40% (melhorou de 26% → 40%, alvo 45-48%), empates = 28% (✅), upset = 28% (✅), perf = 11ms (✅).
- **Spec TDD:** 11 testes ativos, 29 todo. Sem regressão.

## Atualização recente — Motor de Partida v2 Fase 5 (2026-07-09)

- **Instruções relacionais:** `backend/src/store/helpers/instructions.ts` — matriz de interações táticas (pressão alta vs saída de bola, linha alta vs contra-ataque, flanco vs cobertura, tackling vs tempo, offside trap vs through balls). `relationalModifier(att, def)` retorna modificador ±0.15 que afeta duelos.
- **Sem multiplicador tático fixo no v2:** `v2TacticalModifier()` substitui `getTacticalBonus`/`tacticAttackMult`. Efeito tático vem de: (1) `effectiveStrength` (role/duty ponderam atributos), (2) `relationalModifier` (interação entre instruções), (3) `mentalityRiskShift` (régua de risco).
- **Mentalidade global desloca régua de risco:** `effectiveDuty(duty, team)` mapeia duty efetivo — `very offensive` faz `support`→`attack`, `defend`→`support`; `very defensive` faz o inverso. `mentalityActionMod(team)` modula shotChance/dribbleChance/passRisk.
- **Integração no simulateTickV2:** `relationalMod` aplicado nos duelos (progression + chanceCreation), `attMentality.shotMod` aplicado no shotChance da fase finishing.
- **Calibração v2:** gols/jogo = 2.76 (✅), upset = 30% (✅), perf = 9.4ms (✅).
- **Spec TDD:** 11 testes ativos, 29 todo. Sem regressão.

## Atualização recente — Motor de Partida v2 Fase 4 (2026-07-09)

- **Transição / Contra-ataque refinado:** perda adiantada (terço ofensivo) gera transição mais perigosa que perda no próprio campo. `transitionTicks` escala com `attackProgress`: 3-5 ticks para perda no terço ofensivo vs 2 ticks para perda no campo de defesa.
- **Mentalidade ofensiva aumenta exposição:** `teamMentality` do time que perdeu a posse modula o avanço da transição adversária. `very offensive` = +0.08 avanço extra, `offensive` = +0.05, `defensive` = -0.03, `very defensive` = -0.06. Time ofensivo que perde a bola alto fica exposto.
- **Calibração v2 atualizada:** gols/jogo = 2.86 (alvo 2.5-2.9 ✅), upset = 32% (alvo 25-35% ✅), perf = 7ms/partida (< 50ms ✅). Empates = 40% (será reduzido na Fase 6 com vantagem de casa).
- **Spec TDD:** 11 testes ativos, 29 todo. Sem regressão (falhas flaky pré-existentes isoladas).

## Atualização recente — Motor de Partida v2 Fase 3 (2026-07-09)

- **As 5 fases do lance:** `backend/src/store/helpers/phases.ts` — `simulateTickV2` reescrito como progressão por fases: `buildup` → `progression` → `chanceCreation` → `finishing` → `transition`. Cada fase tem transições determinadas por `ballPos`, `passChain` e `_matchRng`.
- **Estado de fase no LiveMatchState:** `ballPhase`, `transitionTicks`, `xgByPhase`, `chancesByOrigin` adicionados a `match.ts`. `BallPhase` exportado do barrel de tipos.
- **Volume ≠ qualidade:** `xgByPhase` rastreia xG acumulado por fase; `chancesByOrigin` separa chances por origem (lateral/centro). "Domino posse mas não crio" emerge naturalmente quando `overloadMod < 0.85` (bloco baixo bem posicionado).
- **Transição / contra-ataque:** perda adiantada dispara `transitionTicks` (2-3 ticks de transição rápida). Passes em transição são mais diretos (avanço 0.15-0.27 vs 0.03-0.11 no buildup).
- **simulateMinuteV2 e simulateFullMatchV2 ativos:** não são mais stubs — usam `simulateTickV2` com o mesmo padrão de PRNG, fadiga, lesões e substituições do v1.
- **Calibração v2:** gols/jogo = 2.58 (alvo 2.5-2.9 ✅), empates = 30% (alvo 24-28%, próximo), upset = 32% (alvo 25-35% ✅), perf = 11ms/partida (< 50ms ✅).
- **Spec TDD:** 11 testes ativos (+4 auto-ativados), 29 todo. Upset test PASS no v2!
- **homeWin% baixo (34% vs 45-48%):** será corrigido na Fase 6 (vantagem de casa variável).

## Atualização recente — Motor de Partida v2 Fase 2 (2026-07-09)

- **Zonas & Duelos individuais:** `backend/src/store/helpers/zones.ts` — grade 3×3 (9 zonas: 3 corredores × 3 terços). `ballToZone(ballPos, ballPosY, attacksTowardOne)` mapeia posição da bola para zona.
- **Ocupação de zona:** `computeZoneOccupancy(team, attacksTowardOne)` deriva posição efetiva (x, y) de cada titular a partir de `FORMATION_LAYOUT` + deslocamento por duty (attack avança, defend recua) + deslocamento por role (invertedWinger corta para centro). `occupantsInZone()` filtra quem está próximo.
- **Resolução de duelo:** `resolveDuel(attacker, defender, rng, overloadMod)` — P(attacker vence) = strength_attacker / (strength_attacker + strength_defender) × overloadMod. Usa `_matchRng` (determinismo preservado). `pickZoneDefender()` seleciona defensor por zona via weightedPick por strength.
- **Overloads:** `computeOverloadMod(att, def, zone)` — modificador baseado em diferença numérica de atacantes vs defensores na zona (±0.15 por jogador extra, clamp 0.7-1.6).
- **Tracker de duelos:** `resetDuelLog()`, `logDuel()`, `getDuelLog()`, `duelStatsByPlayer()` — acumula duelos por jogador/zona para relatório pós-jogo (Fase 10).
- **Re-exports:** todos os símbolos de `zones.ts` re-exportados de `matchEngine.ts`.
- **Spec TDD:** 7 testes ativos, 4 skipped, 29 todo. Sem regressão.

## Atualização recente — Motor de Partida v2 Fase 1 (2026-07-09)

- **Roles & Atributos por função:** `backend/src/store/helpers/roles.ts` — tabela `ROLE_WEIGHTS` com 21 roles (GK, DEF, MID, ATA) × 4 duties (defend/support/attack/balance), cada par com key attributes ponderados (peso 3-4) e atributos secundários (peso 1-2). Duty modifica pesos: attack boosta ofensivos, defend boosta defensivos.
- **Familiaridade posicional:** `positionFamiliarity(player, role)` consome `positionProficiency` (1-20 → 0.60-1.00) e `secondaryPositions`. Jogador fora de posição natural tem força efetiva reduzida.
- **FORMATION_LAYOUT:** mapa `formação → Array<{x, y, zone}>` por slotIndex para 4-4-2, 4-3-3, 3-5-2, 5-2-2. `x` = profundidade (0-1), `y` = lateralidade (0-1), `zone` = posição granular (GK, DL, DC, DR, MC, FL, FC, etc.).
- **effectiveStrength(player, role, duty):** soma ponderada de atributos × familiaridade × fitness × moral × forma × CA. Re-exportada de `matchEngine.ts`. O mesmo jogador rende diferente conforme role/duty; atacante como zagueiro rende menos.
- **Spec TDD:** 7 testes ativos (5 da Fase 0 + 2 da Fase 1), 4 skipped, 29 todo.
- **Performance:** v2 = 13.5ms/partida (< 50ms), 108ms/rodada (< 1000ms). Sem regressão.

## Atualização recente — Motor de Partida v2 Fase 0 (2026-07-09)

- **Motor v2 atrás de flag (Pilar A):** `backend/src/store/helpers/engineFlag.ts` — constante única `isV2` lê `MATCH_ENGINE` env var (default `v1`). `simulateFullMatch`, `simulateMinute`, `initLiveMatchState` em `matchEngine.ts` agora delegam para `*V1`/`*V2` conforme flag. V1 intacto e default; V2 é stub que delega para V1.
- **Harness comparativo v1×v2 (Pilar A):** `backend/headless_v1v2.ts` — roda 50 confrontos com seeds fixas (`HARNESS_SEEDS`) nos dois motores, mede invariantes lado a lado, roda teste de upset (100 sims). `run_batch.py --v1v2` roda 30× e agrega.
- **Benchmark de performance (Pilar B):** `PERF_BUDGET_MATCH_MS=50ms`, `PERF_BUDGET_ROUND_MS=1000ms` em `engineInvariants.ts`. Teste no spec v2 falha se v2 estourar orçamento. Baseline atual: v1=~10ms/partida, ~80ms/rodada.
- **Tabela de invariantes:** `backend/src/store/helpers/engineInvariants.ts` — fonte única de alvos (gols/jogo 2.5-2.9, homeWin 45-48%, etc.) consumida por testes e harness.
- **Setups de referência (Pilar C):** `backend/src/store/helpers/engineSetups.ts` — `applyRefCoeso()` (deveres equilibrados, cobertura), `applyRefIncoerente()` (todos em attack, 2 playmakers mesma zona), `buildUpsetMatchup()` (gap 130%, alvo winRate ≥25%).
- **Spec TDD:** `matchEngineV2.spec.ts` atualizado para importar constantes de `engineInvariants.ts` e ativar teste de setups de referência (5 testes ativos, 6 skipped, 29 todo).

## Atualização recente — Modo Online + Press Center + Refatoração (2026-07-08)

- **Modo online multiplayer** adicionado: `backend/src/rooms/roomManager.ts` (gerenciador de salas em memória com universo isolado por sala), `backend/src/routes/rooms.ts` (API REST de salas), `frontend/src/components/online/` (7 componentes: `OnlineHome`, `RoomView`, `Lobby`, `DraftScreen`, `OnlineTransfers`, `OnlineRoundResult`, `online.css`), `frontend/src/hooks/useRoomPolling.ts` (polling com backoff exponencial), funções de sala em `frontend/src/api/client.ts` (`createRoom`, `joinRoom`, `getRoom`, `startRoom`, `pickTeam`, `beginRoom`, `apiRoomState`, `setRoomReady`, `closeRoom`, `sendOffer`, `respondOffer`).
- **Sistema de salas:** cada sala tem um `GameStoreApi` isolado (universo próprio); estado por-jogador é swap-in/swap-out via `SCOPED_KEYS` (inbox, transfers, finanças, etc.) — slices existentes operam sem alteração. Pronto-check coordena avanço de rodada. Negociações humano×humano via `HumanOffer` (accept/reject/counter/withdraw).
- **Press Center** (`frontend/src/components/press/PressCenter.tsx` + `.css`): tela completa de coletiva de imprensa com perguntas contextuais, respostas tipadas (praise/defensive/critical/diplomatic/deflect) e efeitos em moral/diretoria/torcida/mídia. Rota `/imprensa` adicionada ao `NAV_ITEMS` (12 itens agora).
- **Refatoração de store helpers:** `extractState()` e `runAction()` extraídos para `backend/src/store/storeHelpers.ts` — compartilhados entre single-player (singleton `gameStore`) e salas online (uma instância por sala). `routes/game.ts` agora importa de `storeHelpers`.
- **`backend/src/utils/lineup.ts`:** `ensureElevenXI()` e `healTeamsXI()` — repara XIs incompletos (<11 jogadores) garantindo goleiro.
- **Lazy loading:** `App.tsx` agora usa `React.lazy()` + `Suspense` para todas as páginas (exceto `TeamSelection`, `OnlineHome`, `RoomView`).
- **Novos componentes UI:** `Logo`, `TeamCrest`, `TacticalPitch`, `PageHeader`, `MatchEventIcon`, `ZoneIcon`.
- **Novos utils frontend:** `matchTime.ts` (`fmtMinute` — acréscimos "90+2"), `statusColors.ts` (cores canônicas via `--t-*` tokens), `teamColors.ts` (badges PNG reais + cores determinísticas).
- **Badges reais:** 20 PNGs de escudos dos clubes em `frontend/public/badges/`.
- **Novos testes backend:** `nanGuard.test.ts` (guard contra NaN), `prng.test.ts` (testes do PRNG determinístico mulberry32).
- **Treinos UI (2026-07-06):** `TrainingView.tsx` recebeu passagem `/impeccable` — sistema `fms-*`, ícones Lucide, layout em duas áreas (`Plano semanal` e `Monitor de fadiga e risco`).
- `Button.tsx` agora aplica `variant` (`primary`, `secondary`, `success`), destravando a hierarquia visual dos CTAs.

**Stack:**
- **Backend:** Express 4, Zustand 5 (estado em memória), Zod 4 (validação), TypeScript 5.6, tsx (dev), Vitest 4 (testes). Script headless (`headless_sim.ts`) para simulação sem servidor.
- **Frontend:** Vite 6, React 19, Zustand 5 (thin client), React Router DOM 7, Lucide React (ícones), Recharts (gráficos), TypeScript 5.6, Vitest 3 + happy-dom (testes)
- **Root:** concurrently (orquestra backend + frontend)

**Persistência:**
- **Saves:** arquivos JSON em `backend/saves/` (`save_slot_0.json` = autosave, `save_slot_1.json`, `save_slot_2.json`) — 2 slots manuais + autosave oculto. Versionamento de schema com migração automática (C9).
- **Tema:** `fm-theme-pref` em localStorage (`light` | `dark` | `system`)
- **Estado do jogo:** em memória no backend (Zustand sem persist); hidratado dos saves ao iniciar o servidor. Autosave disparado após cada `advanceWeek` (C9).

---

## 📁 Estrutura de Arquivos

```
football-manager-web/
├── package.json                # Root: scripts dev/build/install:all (concurrently)
├── AI_CONTEXT.md
├── PlanoMatchEngine.md        # Blueprint do motor v2 (checklist de fases concluída/removida)
├── PRODUCT.md
├── Projeto.md
├── DESIGN.md
├── PlanoOnline.md             # Plano do modo online multiplayer (Fase 1-10)
├── especificacao_football_manager_web.md  # Especificação completa do produto
├── TransferenciasChecklist.md  # Checklist do sistema de transferências
├── DynamicsView_content.txt    # Conteúdo de referência da DynamicsView
├── DataBase jogadores/         # Database real de clubes (20 JSONs + gerar_jsons.py)
│   ├── atletico_mineiro.json
│   ├── bahia.json
│   ├── botafogo.json
│   ├── ... (17 outros clubes do Brasileirão)
│   └── gerar_jsons.py          # Script Python que gera os JSONs
├── scripts/
│   └── glm_bridge.py          # CLI bridge para API GLM (Zhipu AI), usado para delegar subtarefas de outros assistentes
├── docs/
│   ├── fluxo.md
│   ├── screenshot_*.png
│   ├── snapshot_main.txt
│   └── regras/                    # Documentação completa de todas as regras do jogo
│       ├── README.md              # Índice das regras
│       ├── regra-geral.md         # Visão geral, temporada, calendário, fim de jogo
│       ├── regra-partidas.md      # Motor de simulação, bônus tático, bolas paradas, relatório pós-jogo
│       ├── regra-financas.md      # Receitas, despesas, orçamento, salários, premiação, parcelas
│       ├── regra-transferencias.md # Compra, venda, ofertas, empréstimos, cláusulas, guerra de ofertas
│       ├── regra-scouting.md      # Olheiros, conhecimento, missões, relatórios, recomendações
│       ├── regra-taticas.md       # Formações, escalação, instruções, mentalidade, set pieces
│       ├── regra-treino.md        # Plano semanal, progressão, CA, fadiga, carga
│       ├── regra-lesoes.md        # Risco, geração, cura, condição degradada
│       ├── regra-dinamica.md      # Hierarquia, grupos sociais, promessas, moral semanal
│       ├── regra-imprensa.md      # Coletivas, respostas, humor da torcida, pressão midiática
│       ├── regra-ia-adversaria.md # Transferências AI, táticas, renovações, demissões
│       ├── regra-base-juvenis.md  # Fornada, qualidade, promoção, reserva
│       ├── regra-diretoria.md     # Expectativas, satisfação
│       ├── regra-saves.md         # Slots, persistência
│       └── regra-classificacao.md # Cálculo, desempate, zonas, forma
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
│       ├── server.ts           # Express app + hydrateSavesFromDisk() on boot; monta /api/rooms + /api
│       ├── routes/
│       │   ├── game.ts         # /api/state, /api/action, /api/init (usa storeHelpers)
│       │   └── rooms.ts        # /api/rooms — CRUD de salas online, draft, ready-check, negociações humano×humano
│       ├── rooms/
│       │   └── roomManager.ts  # Gerenciador de salas online em memória (Room, RoomPlayer, HumanOffer, SCOPED_KEYS, loadScope/saveScope, advanceRoomWeek, makeHumanOffer/respondHumanOffer)
│       ├── middleware/
│       │   ├── auth.ts          # Bearer token auth (opcional via API_TOKEN env)
│       │   ├── errorHandler.ts  # AppError → JSON, 404 handler
│       │   ├── rateLimiter.ts   # 200 req/min por player-id (fallback IP, trust proxy)
│       │   └── requestLogger.ts # INFO/WARN logs
│       ├── services/
│       │   └── saveService.ts   # I/O disco: persist/load/delete/list saves
│       ├── validation/
│       │   └── schemas.ts       # Zod schemas para todas as actions (104 schemas)
│       ├── utils/
│       │   ├── errors.ts        # AppError, ValidationError, toErrorResponse
│       │   ├── playerGenerator.ts  # Geração procedural (jogadores + times)
│       │   ├── playerName.ts    # getFullName() — nome completo do jogador
│       │   ├── dataLoader.ts    # Carrega times reais de DataBase jogadores/*.json
│       │   └── lineup.ts        # ensureElevenXI, healTeamsXI — repara XIs incompletos
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
│       │   ├── storeHelpers.ts  # extractState (mascara rivais via scoutKnowledge), runAction (valida+executa), getActionNames — compartilhados single-player + salas online
│       │   ├── slices/          # 14 slices de domínio
│       │   │   ├── core.ts          # initGame (sem partidas iniciais), advanceWeek (try/finally, healTeamsXI, retorna inboxByTeam, avisos de contrato 4/2/0 semanas, roll semanal de lesão reduzido 0.5%+risk×0.03%), startNextSeason (remove jogadores com contractEnd=0 → freeAgents, limpa lastInjuryWeek/degradedCondition)
│       │   │   ├── match.ts         # simulateMatch (bloqueia início se jogador lesionado no XI), liveMatch (aplica matchInjuries + inbox ao finalizar), finishMatch (aplica matchInjuries + inbox), getPreMatchAnalysis
│       │   │   ├── transfer.ts      # buy/makeOffer/accept/defer/negotiate, signFreeAgent (agentes livres sem taxa)
│       │   │   ├── training.ts      # setTrainingPlan, applyWeeklyTraining (targetGroup: all/attackers/midfielders/defenders/custom + customPlayerIds), filterSquadByGroup, applyTrainingCooldown
│       │   │   ├── injury.ts        # injury risk, prevention, fatigue, recovery
│       │   │   ├── inbox.ts         # handleInboxAction, handleBoardReply
│       │   │   ├── financial.ts     # generateFinancialReport, adjustSalary
│       │   │   ├── scouting.ts      # assignScout
│       │   │   ├── social.ts        # generateSocialTree, updateConnections
│       │   │   ├── promises.ts      # updatePromiseCountdown, checkDeadlines
│       │   │   ├── saves.ts         # saveGame (structuredClone deep copy), loadGame, deleteSave (disco)
│       │   │   ├── youth.ts         # academy, reserve team
│       │   │   ├── attributes.ts    # snapshot, progression, delta
│       │   │   └── press.ts         # coletiva de imprensa, fan mood, media pressure
│       │   └── helpers/         # Lógica pura extraída dos slices (12 helpers)
│       │       ├── matchEngine.ts   # simulateFullMatch, simulateMinute, initLiveMatchState, performAISubs (substitui lesionados), generatePostMatchReport, calculateTeamStrength, tacticalBonus, calculatePlayerMatchRatings, generateWeekMatches, applyMatchResultToTeams, applyMatchInjuries (lesões em partida: foulInjuryChance, fatigueInjuryChance, triggerMatchInjury)
│       │       ├── league.ts        # calculateLeagueStandings
│       │       ├── inbox.ts         # generateInboxMessage
│       │       ├── injury.ts        # calculatePlayerInjuryRisk, getRiskLevel, generateInjuryForPlayer, healInjuryForPlayer, applyFatigueDecayToPlayer
│       │       ├── training.ts      # applyTrainingToPlayer, captureSnapshot, updatePlayerAttributes
│       │       ├── transfer.ts      # maybeGenerateIncomingTransfer, recalcWageBill, reputationGapImpact
│       │       ├── scouting.ts      # maskAttributeValue, maskPlayerAttributes, getBestScout, processScoutMissions, generateScoutReportForMission, calculateScoutGrade
│       │       ├── aiManager.ts     # processAIWeeklyDecisions — transferências AI-vs-AI, ajustes táticos, renovações de contrato, assinatura de agentes livres
│       │       ├── moraleDynamics.ts # applyWeeklyMoraleDynamics — 6 motores de moral (promessas, tempo de jogo, forma, cascata social, regressão)
│       │       ├── finance.ts       # calculateMarketValue, calculatePlayerSalary, calculateTeamBudget, calculateTicketRevenue, calculateSponsorshipRevenue, calculateBroadcastingRevenue, calculateFacilityCosts, calculateStaffCosts, weeklyWages, calculateWageLimit, calculateMatchPrizeMoney, calculateSeasonFinalPrize
│       │       ├── preMatchAnalysis.ts # generatePreMatchAnalysis — Monte Carlo (500 iterações), key matchups, recomendação tática
│       │       └── press.ts         # generatePressConference, calculatePressConferenceEffects, updateFanMood, updateMediaPressure, weeklyFanMoodDecay, weeklyMediaPressureDecay, RESPONSE_OPTIONS
│       └── tests/
│           ├── errors.test.ts
│           ├── schemas.test.ts
│           ├── matchEngine.test.ts  # Motor de simulação: xG, posse, cartões, acréscimos
│           ├── predictionCalibration.test.ts # Calibração Poisson vs tick engine: gap <0.6 gols, W/D/L <12pp
│           ├── balance.test.ts     # Regression tests: 6 financial invariants (idle season, wage/revenue, market value, prizes)
│           ├── gameFlows.test.ts   # Smoke tests de fluxos de jogo (15.2-15.9): geração procedural, partidas, inbox, treino, transferências, táticas, dinâmica, finanças
│           ├── nanGuard.test.ts    # Guard contra NaN em atributos e cálculos
│           └── prng.test.ts        # Testes do PRNG determinístico mulberry32
│
└── frontend/
    ├── package.json            # Vite, React 19, React Router 7, Lucide, Recharts, happy-dom
    ├── index.html              # Inline theme bootstrap (anti-flash)
    ├── tsconfig.json
    ├── vite.config.ts          # Proxy /api → localhost:3001
    ├── vitest.config.ts        # happy-dom, setup smoke tests
    ├── public/
    │   └── badges/             # 20 PNGs de escudos reais dos clubes do Brasileirão
    └── src/
        ├── main.tsx            # BrowserRouter + ErrorBoundary + fetch /api/state (importa app-fm.css e fm-shared.css por último)
        ├── App.tsx             # Routes + sidebar + footer + toast system; React.lazy + Suspense para páginas; modo online com polling + ready-check + negociações
        ├── app-fm.css          # tema dark estilo Football Manager para o SHELL (sidebar/actionbar/fundo), escopado em .fm-shell-fm
        ├── fm-shared.css       # CSS compartilhado com variáveis e componentes base do padrão /taticas (escopado em .fms-page)
        ├── api/
        │   └── client.ts       # apiGet, apiPost, apiAction helpers; getPlayerId (UUID estável); funções de sala online (createRoom, joinRoom, getRoom, startRoom, pickTeam, beginRoom, apiRoomState, setRoomReady, closeRoom, sendOffer, respondOffer); setActiveRoom/clearActiveRoom/getActiveRoom; rememberRoom/forgetRoom/getRememberedRoom
        ├── store/
        │   └── gameStore.ts    # Thin client: getters locais + mutations via API; toasts (pushToast/dismissToast)
        ├── types/
        │   └── game.ts         # Tipos espelhados do backend
        ├── hooks/
        │   ├── useTheme.ts     # Theme preference + system listener
        │   ├── useSortable.ts  # Reusable table sorting hook (sort key + direction toggle)
        │   ├── useKeyboardShortcuts.ts  # Global keyboard shortcuts (Space=advance week, 1-0=navigate, Ctrl+S=save, Esc=back)
        │   └── useRoomPolling.ts  # Polling de sala online com backoff exponencial (2s→8s), heartbeat, reconnect
        ├── utils/
        │   ├── theme.ts        # resolveTheme, applyTheme, getStoredThemePreference
        │   ├── player.ts       # getFullName() — nome completo do jogador (mirror do backend)
        │   ├── finance.ts      # Mirror frontend do finance helper (revenue, expenses, wage limit)
        │   ├── winProbability.ts # Modelo de probabilidade de vitória ao vivo (Poisson): teamStrength, computeWinProb, buildMomentum, goalsFromMatch
        │   ├── matchTime.ts    # fmtMinute() — exibição do relógio (acréscimos "90+2")
        │   ├── statusColors.ts # STATUS_COLOR + getRatingColor — cores canônicas via --t-* tokens
        │   └── teamColors.ts   # getTeamBadge (badges PNG reais), getTeamTier, cores determinísticas por hash
        ├── styles.css             # ~129KB, design tokens oklch() com fallbacks hex, light/dark via [data-theme], badge tokens semânticos
        ├── styles-supplement.css  # ~155KB, estilos complementares, Night Pitch theme, auto dark via prefers-color-scheme
        ├── styles-mobile.css      # ~13KB, media queries (1024/900/768/640/480px), reduced backdrop-filter em mobile
        ├── smoke/
        │   ├── setup.ts
        │   └── winProbability.test.ts  # Testes do modelo de probabilidade de vitória (Poisson)
        └── components/
            ├── TeamSelection.tsx
            ├── charts/
            │   └── MiniAreaChart.tsx   # Mini gráfico de área (Recharts) para projeções
            ├── ui/
            │   ├── Button.tsx           # Variantes primary, secondary, success
            │   ├── ErrorBoundary.tsx
            │   ├── StatBar.tsx
            │   ├── Toast.tsx
            │   ├── ThemeToggle.tsx      # Light/Dark/System radio group
            │   ├── Logo.tsx             # Logo FM Web (SVG inline)
            │   ├── TeamCrest.tsx        # Escudo do clube (badge PNG ou SVG fallback)
            │   ├── TacticalPitch.tsx   # Campo tático 2D decorativo (landing page)
            │   ├── PageHeader.tsx       # Cabeçalho padrão .fms-page com título, subtítulo, ações
            │   ├── MatchEventIcon.tsx   # Ícones de eventos de partida (gol, cartão, etc.)
            │   └── ZoneIcon.tsx         # Ícones de zona da classificação
            ├── saves/
            │   └── SaveSlot.tsx
            ├── squad/
            │   ├── SquadView.tsx
            │   ├── SquadTable.tsx
            │   ├── PlayerCard.tsx
            │   └── PlayerDetailPanel.tsx
            ├── match/
            │   ├── MatchCenter.tsx       # Centro de partidas: hero match, fixtures, live view, controles ao vivo, bloqueio de início com jogador lesionado no XI
            │   ├── MatchCenter.css
            │   ├── MatchPitch2D.tsx      # Visualização 2D estilo "jogo de botão"
            │   ├── MatchPitch2D.css
            │   ├── PreMatchBriefing.tsx  # Centro de Inteligência Pré-Jogo (Monte Carlo, matchups, tática)
            │   ├── PostMatchReportView.tsx  # Relatório pós-jogo (mapa de calor, insights, conselhos)
            │   ├── PostMatchReportView.css
            │   ├── MomentumChart.tsx    # Central de Momentum — gráfico de probabilidade de vitória ao vivo (Recharts)
            │   └── MomentumChart.css
            ├── transfer/
            │   ├── TransferMarket.tsx
            │   ├── ScoutReportCard.tsx
            │   ├── InstallmentClauseDisplay.tsx  # Display de parcelas
            │   ├── PlayerBonusDisplay.tsx        # Display de bônus
            │   └── TransferAgreementDisplay.tsx  # Display de acordos de transferência
            ├── tactics/
            │   ├── TacticsView.tsx
            │   └── tactics-fm.css        # tema dark estilo Football Manager (escopado em .fm-tactics-fm)
            ├── inbox/
            │   ├── InboxView.tsx
            │   └── constants.ts         # BOARD_REPLY_CATEGORIES (obsoleto — não mais importado)
            ├── training/
            │   └── TrainingView.tsx
            ├── dynamics/
            │   └── DynamicsView.tsx
            ├── finance/
            │   └── FinanceView.tsx
            ├── league/
            │   └── LeagueTable.tsx
            ├── dashboard/
            │   ├── Dashboard.tsx        # Manager Dashboard — visão geral com gauges, gráficos e quick actions
            │   └── Dashboard.css        # Estilos do dashboard (dark theme, gauges, cards, mini-tabela)
            ├── press/
            │   ├── PressCenter.tsx      # Centro de Imprensa — coletivas pré/pós-jogo, perguntas contextuais, respostas tipadas
            │   └── PressCenter.css
            ├── online/
            │   ├── OnlineHome.tsx       # Tela inicial online: criar/entrar em sala, sala lembrada
            │   ├── RoomView.tsx         # View da sala: lobby, draft, ready-check, jogo online
            │   ├── Lobby.tsx            # Lobby da sala (antes do draft)
            │   ├── DraftScreen.tsx      # Draft de clubes (escolha de time em sala online)
            │   ├── OnlineTransfers.tsx  # Negociações humano×humano (ofertas, counter, accept/reject)
            │   ├── OnlineRoundResult.tsx # Resultado da rodada da sala online
            │   └── online.css           # Estilos do modo online
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
  │    ├─ Mutations: apiAction('actionName', args) → POST /api/action (single-player)
  │    │              ou POST /api/rooms/:code/action (online — com swap de escopo)
  │    │         └─ response { result, state } → syncFromResponse → setState()
  │    └─ Modo online: setActiveRoom() redireciona apiAction para /api/rooms/:code/action
  │
  └─ updateTeam: otimista (set local + sync backend)

Backend (Express 4)
  │
  ├─ POST /api/action { action, args }           ← single-player (singleton gameStore)
  │    ├─ runAction(gameStore, action, args) — valida Zod + executa
  │    └─ Return { result, state } (state = extractState, mascara rivais)
  │
  ├─ POST /api/rooms/:code/action { action, args } ← online (store da sala)
  │    ├─ loadScope(room, myTeamId) — swap estado per-jogador
  │    ├─ runAction(room.store, action, args) — valida + executa
  │    ├─ saveScope(room, myTeamId) — persiste escopo
  │    ├─ Actions proibidas: advanceWeek, initGame, saveGame, simulateMatch, etc.
  │    ├─ Aquisição de jogadores de times humanos bloqueada (usar /offer)
  │    └─ Return { result, state } (state = projectState, mascara rivais)
  │
  ├─ POST /api/init → initGame()
  ├─ GET  /api/state → extractState()
  ├─ GET  /api/rooms/:code/state → projectState (online, escopado por jogador)
  ├─ POST /api/rooms — CRUD de salas (create, join, start, pick, begin, ready, close, offer)
  ├─ GET  /health
  │
  └─ Middleware: cors, json(5mb), requestLogger, rateLimiter, authMiddleware, errorHandler
```

### Padrão de Comunicação

- **Frontend store** (`frontend/src/store/gameStore.ts`): thin client Zustand. Getters (`getSaveSlots`, `calculateInjuryRisk`, `getActivePromises`, `getPlayerAttributeProgression`, etc.) computam localmente do estado sincronizado. Mutations chamam `apiAction()` e sincronizam resposta.
- **Backend store** (`backend/src/store/gameStore.ts`): Zustand em memória, composition root de 14 slices. Sem persistência — estado é reconstruído em `initGame()` ou hidratado de saves em `hydrateSavesFromDisk()`. No modo online, cada sala tem seu próprio `GameStoreApi` isolado (ver `roomManager.ts`).
- **`updateTeam`**: caso especial — frontend computa o `newTeam` localmente (UI instantânea) e envia o objeto ao backend. O backend valida com Zod whitelist (`teamUpdateFields`) e faz **merge seletivo** — apenas campos táticos são aplicados (tacticsConfig, startingXI, squadStatus, formation, teamMentality, tactic, passingStyle, etc.). Campos protegidos (budget, reputation, squad, scouts, staffLevel, points, played, etc.) são stripped pelo Zod e preservados do estado atual.
- **`syncFromResponse()`**: `useGameStore.setState(data.state)` — substitui todo o estado frontend pelo estado backend.
- **`storeHelpers.ts`** (`backend/src/store/storeHelpers.ts`): `extractState()` (extrai estado sem funções + mascara atributos de rivais via `scoutKnowledge`), `runAction()` (valida Zod + executa action + trata `updateTeam` com merge seletivo), `getActionNames()` — compartilhados entre single-player (singleton `gameStore`) e salas online (instância por sala).
- **Modo online** (`backend/src/rooms/roomManager.ts`): cada `Room` tem um `GameStoreApi` isolado (universo próprio). Estado por-jogador é swap-in/swap-out via `SCOPED_KEYS` (inbox, transfers, finanças, scouting, etc.) — slices existentes operam sem alteração. `advanceRoomWeek()` coordena o avanço de rodada quando todos estão prontos. Negociações humano×humano via `HumanOffer` (accept/reject/counter/withdraw).

### Tipos

Tipos são definidos no backend em 14 arquivos de domínio sob `backend/src/types/`, com barrel export em `game.ts`. O frontend espelha os tipos em `frontend/src/types/game.ts`.

> **⚠️ Dessincronização:** O `GameActions` do backend (`backend/src/types/game.ts`) possui actions extras não espelhadas no thin client do frontend (`frontend/src/store/gameStore.ts`): `generateInstallmentClause`, `generatePlayerBonus`, `setCoachTreatment`, `setPlayerTrustLevel`, `setPlayerTrainingLoad`, `updateClubPerformance`, `updateLeagueForm`, `setLeaguePosition`, `assignScoutMission`, `getScoutKnowledge`. Essas actions são invocadas diretamente via `apiAction()` sem implementação no thin client. `negotiatePlayerContract`, `loanPlayer`, `recallLoanedPlayer`, `buyLoanedPlayer`, `activateReleaseClause`, `raiseBid`, `withdrawBid`, `addToShortlist`, `removeFromShortlist`, `getShortlist`, `dismissScoutRecommendation` estão espelhadas no frontend (tipos + store). Os tipos `Scout`, `ActiveScoutMission`, `ContractNegotiationResult`, `LoanDeal`, `ShortlistEntry`, `ScoutRecommendation`, `BiddingWar`, `scoutKnowledge` e `scoutMissions` estão espelhados em `frontend/src/types/game.ts`.

---

## 🧩 Tipos de Domínio (`backend/src/types/`)

### Jogador (`player.ts`)
- **Atributos técnicos, mentais e físicos** (escala 1-20)
- **Atributos de GK** (`GKAttributes`)
- **Atributos ocultos** (`HiddenAttributes`)
- **CA/PA** (`currentAbility` / `potentialAbility`): escala 1-200
- **Contrato:** salário (milhares), `contractEnd` (semanas), cláusula de rescisão, `freeAgent` (opcional, true se sem clube)
- **Status:** moral, forma, condição física, lesão (`{ active, daysRemaining, totalDays, type, severity, source }`), `squadStatus`
- **Dinâmica:** `teamMates`, `socialGroup`, `promises` (interface `PlayerPromise`)
- **Histórico:** `attributeHistory` (limitado a 20 snapshots), `fatigueLog` (limitado a 20 entradas)
- **Gestão:** `coachTreatment`, `trustLevel`, `cumulativeLoad`, `fatigueLog`
- **Reputação:** `reputation` (1-100) — reconhecimento mundial do jogador; `fame` (1-100) — fama para scouting

### Time (`team.ts`)
- Identidade, finanças, infraestrutura, estatísticas de temporada
- **Táticas avançadas:** mentalidade (7 níveis), largura, passe, ritmo, pressão, etc.
- **`tacticsConfig`:** roles por posição + instruções individuais + `setPieces?: SetPiecesConfig` (bolas paradas: escanteios, faltas, laterais, pênaltis, defesa)
- **`coachTreatment`**, `leagueForm`, `formRating`, `leaguePosition` (**sincronizado automaticamente** por `advanceWeek` e `startNextSeason` via `calculateLeagueStandings`; inicializa em 0)
- **Olheiros:** `scouts: Scout[]` (id, name, judgingAbility, judgingPotential, assigned)

### Partida (`match.ts`)
- Resultado, data, status (`completed`)
- **Live match:** `isLive`, `liveMinute`, `liveEvents`, `liveStats`, `liveActions`, `liveMatchState` (inclui `matchInjuries: { playerId, side }[]` para lesões em partida)
- Eventos e stats finais (`events`, `stats`) — `MatchEvent.type` inclui `'injury'`
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
- `InboxMessage` (`inbox.ts` — tipos: transfer/injury/suggestion/board/youth/training/financial/news; inclui `boardReplyOptions?: BoardReplyOption[]`), `BoardReply` + `BoardReplyOption` + `BoardReplyEffect` + `FinancialReport` (`financial.ts`) — `BoardReply` agora usa `optionId`/`optionLabel` (não mais `response`); `BoardReplyOption` tem `effects` com `satisfactionChange`, `budgetChange`, `moraleChange`, `transferBudgetChange`, `fanMoodChange`, `addBoardPromise`; `FinancialReport` inclui `facilityCosts` e `broadcastingRevenue`
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
| `convertPlayer()` | Converte `JsonPlayer` (6 stats + over_geral) → `Player` completo com reputação calculada (overall + produtividade + idade + reputação do clube) |
| `convertTeam()` | Converte `JsonTeam` → `Team` com reputação real do clube (mapa hardcoded Brasileirão 2025) |
| `calculateTeamReputation()` | Retorna reputação real do clube (1-100) baseada em mapa hardcoded FM; fallback usa overall médio |
| `calculatePlayerReputation()` | Calcula reputação do jogador (1-100): 60% overall + bônus produtividade + idade + visibilidade do clube + overrides para stars |
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
matchBlockMessage (string | null) — mensagem de bloqueio quando jogador lesionado está no XI
freeAgents (Player[]) — jogadores sem clube após expiração de contrato
```

### Slices (14)

| Slice | Arquivo | Responsabilidade |
|-------|---------|-----------------|
| Core | `core.ts` | `initGame` (database real + fallback procedural; **reseta TODOS os campos de estado** incluindo pendingInstallments, incomingBonuses, transfers, counterOffers, fatigueLog, recommendations, degradedConditions, socialTree, youthAcademy, reserveTeam, completedTransfers, etc.; **mediaPressure inicial = 50/low**), `selectTeam`, `deselectTeam`, `updateTeam`, `advanceWeek` (**bloqueia avanço se jogador lesionado no XI** — define `matchBlockMessage`; **lock isAdvancing** contra chamadas concorrentes; auto-finaliza partida pendente, simula outras, **cura lesões via `healInjuryForPlayer`** (7 dias base + bonus staff/facilities, age penalty, severity penalty; marca injuryHistory como recovered), **gera lesões baseadas em risco** (roll semanal: 2% base + risk×0.08%, via `generateInjuryForPlayer`), processa IA adversária, dinâmica de moral, scouting, finanças, fadiga via helper compartilhado `applyFatigueDecayToPlayer`, condição degradada via `updateDegradedConditionForPlayer`, parcelas com direction payable/receivable, **bônus baseados em estatísticas reais** seasonGoals/seasonAssists/played/form/position, inbox; **todas as atualizações pós-semana (promise countdown, treino, snapshot de atributos, press decay, youth intake) são batched em um único `set()` final** — sem chamadas `set()` adicionais), `startNextSeason` (**reseta stats + TODO o estado de transferências/scouting**: incomingTransfers, transfers, counterOffers, deferredTransfers, inbox, scoutReports, pendingInstallments, incomingBonuses, transferAgreements, scoutMissions, shortlist, scoutRecommendations, activeLoans, biddingWars, fanMood, mediaPressure; gera novo calendário), `updateClubPerformance`, `updateLeagueForm`, `setLeaguePosition` |
| Match | `match.ts` | `simulateMatch` (inicia estado ao vivo via `initLiveMatchState`), `generateLiveMatchMinute` (simula 1 minuto via `simulateMinute`), `applyMatchIntervention` (legado), `substitutePlayer` (substituição real: troca outId↔inId no startingXI do usuário; limite 5; efeito imediato pois o motor lê state.teams por minuto), `applyShout` (grito tipado encourage/demand/praise/calm — moral + interventionBoost distintos), `finishMatch` (continua simulação até minuto 90, gera `postMatchReport`), `getPreMatchAnalysis`. **Intervalo (half-time)** é gerenciado no frontend (pausa o loop aos 45' até o técnico iniciar o 2º tempo) (gera análise preditiva via Monte Carlo 500 iterações — probabilidades, placar provável, duelos, recomendação tática) |
| Transfer | `transfer.ts` | `buyPlayer` (parcelas marcadas como `direction: 'payable'`), `signFreeAgent` (agentes livres sem taxa, só salário), `makeOffer`, `acceptOffer`, `negotiatePlayerContract`, `deferTransfer`, `reinstateDeferredTransfer`, `rejectDeferredTransfer`, `negotiateCounterOffer`, `acceptIncomingTransfer` (parcelas marcadas como `direction: 'receivable'`), `generateInstallmentClause`, `generatePlayerBonus`, `checkBonuses` (usa estatísticas reais: seasonGoals, seasonAssists, played, form, league position), `claimBonus`, parcelas, bônus, acordos, `loanPlayer`, `recallLoanedPlayer`, `buyLoanedPlayer`, `activateReleaseClause`, `raiseBid`, `withdrawBid` |
| Training | `training.ts` | `setTrainingPlan`, `applyWeeklyTraining` (aceita `targetGroup` — all/attackers/midfielders/defenders/custom — e `customPlayerIds?`; filtra elenco via `filterSquadByGroup` antes de aplicar o foco real — physical, technical, cohesion, medical, recovery, light — diretamente para `updatePlayerAttributes`), `applyTrainingCooldown` — **buscam apenas no time selecionado** |
| Injury | `injury.ts` | `getInjuryReport` (usa dados armazenados: type, severity, daysRemaining, totalDays para recoveryProgress), `schedulePreventionSession`, `recoverInjuredPlayer` (marca apenas a lesão mais recente não recuperada no injuryHistory), `applyPostInjuryCondition` (degradedCondition baseado em severity: severe→minimal, moderate→low, minor→moderate), `updateDegradedConditions`, fadiga, recomendações — **todas as ações buscam apenas no time selecionado** (`state.selectedTeam`) |
| Inbox | `inbox.ts` | `handleInboxAction`, `handleBoardReply` (agora aceita `optionId` — aplica efeitos reais: satisfactionChange, budgetChange, moraleChange, fanMoodChange, transferBudgetChange, addBoardPromise), `markAsRead`, `removeMessage` |
| Financial | `financial.ts` | `generateFinancialReport`, `getFinancialReport`, `adjustPlayerSalary` |
| Scouting | `scouting.ts` | `assignScout` (sem playerId: embaralha candidatos antes de selecionar 3), `assignScoutMission`, `getScoutKnowledge`, `addToShortlist` (playerId, priority?, notes?), `removeFromShortlist`, `getShortlist`, `dismissScoutRecommendation` |
| Social | `social.ts` | `generateSocialTree` (**guard para elenco vazio**, força de conexão determinística baseada em socialGroup/squadStatus), `updateSocialConnections` (atualização imutável de edges, **bidirecional**: sempre atualiza/cria tanto A→B quanto B→A) |
| Promises | `promises.ts` | `updatePromiseCountdown`, `getActivePromises`, `checkPromiseDeadlines`, `setCoachTreatment`, `setPlayerTrustLevel`, `setPlayerTrainingLoad` |
| Saves | `saves.ts` | `saveGame`, `loadGame` (restaura pressConferences, fanMood, mediaPressure), `deleteSave` (disco via `saveService`) |
| Youth | `youth.ts` | `generateYouthPlayers`, `promoteYouthPlayer` (copia atributos technical/mental/physical do jovem ao promover), `setAcademyTraining`, reserva, `setReserveTraining` (armazena `trainingType` em cada `ReserveTeamPlayer`) |
| Attributes | `attributes.ts` | `captureWeeklyAttributeSnapshot`, `getAttributeDelta`, `getPlayerAttributeProgression` |
| Press | `press.ts` | `generatePreMatchPressConference`, `generatePostMatchPressConference` (**verifica opponent nulo**), `answerPressQuestion`, `skipPressConference`, `applyPressConferenceEffects` (**boardSatisfaction clamp -100 a 100**), `processWeeklyPressDecay`, `getPendingPressConference`, `getPressConferenceHistory` |

### Helpers (12) — Lógica pura extraída

| Helper | Arquivo | Funções |
|--------|---------|---------|
| Match Engine | `matchEngine.ts` | `getTacticalBonus`, `calculateTeamStrength`, `getPossessionBias`, `simulateMatchResult` (xG+Poisson+set pieces), `simulateFullMatch` (90min passo a passo, **filtra sentOff** via `_matchSentOff`, **subs da IA** via `performAISubs`), `simulateMinute` (integra set pieces: cantos, faltas, pênaltis, laterais; **posicionamento correto de tiro de meta**), `initLiveMatchState`, `performAISubs` (subs automáticas: fadiga, amarelo, tática), `calculatePlayerMatchRatings` (**limita minutesPlayed de expulsos**), `generatePostMatchReport` (mapa de calor, insights, conselhos), `generateWeekMatches`, `applyMatchResultToTeams` |
| League | `league.ts` | `calculateLeagueStandings` (**usa campos cumulativos do Team**, não array de partidas) |
| Inbox | `inbox.ts` | `generateInboxMessage` |
| Injury | `injury.ts` | `calculatePlayerInjuryRisk` (retorna 0 se já lesionado), `getRiskLevel`, `generateInjuryForPlayer` (centralizada: severity roll baseado em risk+proneness, age/fitness penalties, staff/facilities care reduction, injury type, injuryHistory, degradedCondition, fitness drop), `healInjuryForPlayer` (cura semanal: base 7 dias + staff/facilities bonus, age penalty, severity penalty no início), `applyFatigueDecayToPlayer` (recuperação semanal: fitness +5, load -5, consecutive -1, clear recoveryNeeded), `updateDegradedConditionForPlayer`, `reduceInjuryFromRecoveryTraining`, `INJURY_TYPE_LABELS` |
| Training | `training.ts` | `baseTrainingGain` (0.05–0.25), `ageTrainingMultiplier` (Sub-21 ×2 / auge ×0.45 / 31+ ×0.1), `applyMonthlyAgeDecline` (31+ −0.1..0.3 físicos/mês sem médico), `updatePlayerAttributes` (ganho × idade em atributos+CA; **respeita PA ceiling**; lesão via `generateInjuryForPlayer`; recuperação via `reduceInjuryFromRecoveryTraining`) |
| Transfer | `transfer.ts` | `detectPositionalCrises`, `maybeGenerateIncomingTransfer` (ofertas por necessidade/crise, não 35% fixo), `processTransferRequests` (pedidos de saída + cascata), `recalcWageBill`, `reputationGapImpact` |
| Scouting | `scouting.ts` | `maskAttributeValue`, `maskPlayerAttributes`, `getBestScout`, `generateDefaultScouts`, `processScoutMissions`, `generateScoutReportForMission`, `calculateScoutGrade` |
| AI Manager | `aiManager.ts` | `processAIWeeklyDecisions` — orquestra `processAITransfers` (janelas 1-12 e 20-26, AI-vs-AI; **usa `reputationGapImpact`** para vontade do jogador, salário e recusa categórica), `processAITactics` (ajustes a cada 4 semanas: rebaixamento 50/30/20 attacking/balanced/defensive, título 40% attacking em boa forma, mid-table 50% defensive após derrotas; demissão de técnico com nova formação), `processAIContracts` (renovação automática), `processAIReleaseClauses` (ativa cláusulas de rescisão; **usa `reputationGapImpact`**), `processAIFreeAgentSignings` (IA assina agentes livres sem taxa, priorizando posição mais fraca; **usa `reputationGapImpact`**) |
| Morale Dynamics | `moraleDynamics.ts` | `applyWeeklyMoraleDynamics` — 6 motores: promessas expiradas, tempo de jogo vs. status, forma do time, cascata do capitão, cascata de grupo social, regressão à média |
| Finance | `finance.ts` | `calculateMarketValue` (exponencial por overall, topo ~80M), `calculatePlayerSalary` (×30 + ruído, semanal em K R$), `calculateTeamBudget` (×10), `calculateTicketRevenue`, `calculateSponsorshipRevenue`, `calculateBroadcastingRevenue`, `calculateFacilityCosts` (×0.35), `calculateStaffCosts` (×0.25), `weeklyWages` (passa direto, sem conversão), `calculateWageLimit` (60% receita semanal), `calculateMatchPrizeMoney` (base ×0.2, win ×3/draw ×1.5/loss ×0.5), `calculateSeasonFinalPrize` (base ×10 × positionFactor, creditado ao final das 38 rodadas) — espelhado em `frontend/src/utils/finance.ts` |
| Press | `press.ts` | `generatePressConference` (gera perguntas contextuais por categoria/tom), `calculatePressConferenceEffects` (mapeia tom de resposta → efeitos em moral/diretoria/torcida/mídia), `updateFanMood`, `updateMediaPressure`, `weeklyFanMoodDecay`, `weeklyMediaPressureDecay`, `getMediaPressurePerformanceModifier`, `getFanMoodRevenueModifier`, `RESPONSE_OPTIONS` (banco de respostas predefinidas por tom) |

### Motor de Partida (`helpers/matchEngine.ts`)

**PRNG Determinística (mulberry32)**
- Todas as chamadas de `Math.random()` no motor foram substituídas por `_matchRng()` — uma referência de função mutável
- `mulberry32(seed)` gera uma PRNG determinística com método `.state()` para salvar/retomar o estado
- `LiveMatchState` tem campos opcionais `seed` e `rngState` — quando presentes, a simulação é 100% determinística (replay)
- Quando `seed` é `undefined`, `_matchRng = Math.random` (comportamento não-determinístico, backward-compatible)
- `simulateMinute()` restaura o PRNG de `state.rngState` no início e salva o estado atualizado no final
- `initLiveMatchState(home, away, seed?)` e `simulateFullMatch(home, away, boosts, seed?)` aceitam seed opcional
- `simulateMatchResult(home, away, boosts, seed?)` também aceita seed opcional
- Habilita: replay de partida (mesma seed → mesmo jogo), testes determinísticos, online seguro (servidor autoritário, cliente reproduz)

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
- **Gols esperados (λ):** `BASE_GOALS × (ataque / defesa adversária)^1.15 × vantagem de casa (1.12)` — `BASE_GOALS = 1.20` (calibrado contra o tick engine `simulateFullMatch` que produz ~2.85 gols/jogo; ver `predictionCalibration.test.ts`)
- **Amostragem de Poisson** (Knuth's algorithm, cap 10) para o número de gols de cada time
- **Autor do gol ponderado** por finalização + posição (FWD peso 3.2, MID 1.5, DEF 0.45, GK 0.02)
- **Assistências** atribuídas por passe/visão/cruzamento, priorizando meias (~62% dos gols têm assistência)
- **Estatísticas coerentes** (chutes, no alvo, posse, passes, xG) derivadas dos lambdas e gols
- Retorna `MatchResult` com `goalDetails[]` (scorerId, assistId, minute) além de events e stats

**`simulateFullMatch(homeTeam, awayTeam, homeBoost?, awayBoost?, seed?)`** — Simulação completa passo a passo (90 minutos)
- Inicializa estado via `initLiveMatchState(home, away, seed)` e roda `simulateMinute()` 90 vezes
- Após cada minuto, executa `performAISubs()` para substituições automáticas da IA (ambos os lados)
- Cada minuto gera ações individuais (passe, drible, chute, desarme, interceptação) com `LiveMatchState`
- Aplica boosts de intervenção se houver
- Constrói `MatchResult` final + `calculatePlayerMatchRatings()` + `generatePostMatchReport()` (usa times atualizados pós-subs)
- Retorna `MatchResult & { playerRatings, bestPlayer, postMatchReport, matchInjuries }`
- Usado para AI-vs-AI e auto-finalização de partidas do usuário

**Sistema de lesões em partida (em `simulateMinute`/`simulateTick`):** lesões geradas em tempo real via `foulInjuryChance` (após faltas) e `fatigueInjuryChance` (por minuto, jogadores com fadiga > 0.35). Tática `aggressive` (+4%), `tempo: fast` (+1%), fadiga alta e `injuryProneness` > 5 aumentam a chance. Jogadores lesionados são rastreados via `_matchInjured` (Set), removidos do XI pela `startingXI()`, substituídos pela IA com prioridade máxima (ignora minuto mínimo e probGate). `applyMatchInjuries()` aplica as lesões ao squad pós-partida usando `generateInjuryForPlayer` com source `'match'`. Inbox messages geradas para o time do usuário em `match.ts`.

**Sistema de cartões (em `simulateMinute`):** faltas esparsas (~12%/min) + faltas em drible geram cartões via `bookOffender()` — amarelo acumula por jogador (`liveMatchState.cards`), 2º amarelo ou vermelho direto (~1.2%) expulsam (`liveMatchState.sentOff.{home,away}`). Time com jogador expulso sofre penalidade real de força no minuto (menos chance de chute/drible, mais pressão sofrida). Cadência realista (~2.2 amarelos, ~0.33 vermelhos por jogo). Eventos `yellow`/`red` fluem para o feed de narração. **ponytail:** jogador expulso ainda pode ser sorteado com a bola (só a força é penalizada) — refinar excluindo-o do sorteio se necessário.

**`simulateMinute()`** — Simula 1 minuto de jogo (ação individual)
- Decide entre chutar/driblar/passar baseado em posição da bola e pressão
- **Bolas paradas integradas:** escanteios após defesa do goleiro (20%) ou chute para fora (35% se no ataque); faltas em posição perigosa (>65% ataque) disparam `simulateFreeKick`; pênaltis (8% chance se falta na área); laterais ocasionais (5%)
- Usa `SetPiecesConfig` do time para determinar cobrador, tipo de cobrança, alvo, marcação defensiva, barreira, contra-ataque
- Atributos relevantes: `crossing`, `heading`, `jumping`, `freeKicks`, `finishing`, `composure`, `commandOfArea`, `aerialReach`, `reflexes`, `marking`
- Atualiza `LiveMatchState` (ballPos, events, stats, goalDetails, actions, rngState)
- Usado tanto em partidas ao vivo (revelação progressiva) quanto em `simulateFullMatch()`
- PRNG determinística: restaura de `state.rngState` no início, salva no final — habilita replay e online seguro

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

**Substituições Automáticas da IA (`performAISubs` / `tryAISub`)**
- **Gatilho:** a partir do minuto 58, até 5 subs por time
- **Prioridade 3 (fadiga):** jogador com fadiga > 0.42 → probGate 35%
- **Prioridade 2 (amarelo + fadiga):** jogador amarelado com fadiga > 0.25 → probGate 20%
- **Prioridade 1 (tática):** nos minutos 60, 68, 76 — se perdendo por 2+, troca o DEF mais fraco por um FWD; se ganhando por 2+, troca o FWD mais fraco por um DEF → probGate 50%
- **Seleção do substituto:** `findBestReplacement` escolhe o jogador do banco com maior `currentAbility`, preferindo a mesma posição do substituído
- **Banco:** `getBenchPlayers` filtra jogadores não-titulares, não-expulsos e não-lesionados
- **Integração:** `simulateFullMatch` chama após cada minuto (ambos os lados); `generateLiveMatchMinute` e `finishMatch` chamam apenas para o lado da IA (não-usuário); `core.ts` chama para ambos os lados no auto-finish
- **Persistência:** XI atualizado é gravado no store para que próximas leituras usem o novo XI
- Substituto entra descansado (fadiga 0 no mapa) — `nextFatigue` acumula apenas para o XI atual

---

## 🔌 API REST (`backend/src/routes/game.ts` + `rooms.ts`)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/health` | Health check → `{ status: 'ok' }` |
| `GET` | `/api/state` | Retorna estado completo (extractState — mascara rivais) |
| `POST` | `/api/init` | Executa `initGame()` |
| `POST` | `/api/action` | Executa action genérica (single-player): `{ action, args }` → `{ result, state }` |
| `POST` | `/api/rooms` | Cria sala online → `{ code, room }` |
| `POST` | `/api/rooms/:code/join` | Entra/reentra numa sala |
| `GET` | `/api/rooms/:code` | Estado público da sala (polling) |
| `POST` | `/api/rooms/:code/start` | Dono gera clubes + abre draft |
| `POST` | `/api/rooms/:code/pick` | Escolhe clube no draft |
| `POST` | `/api/rooms/:code/begin` | Dono confirma início (todos escolheram) |
| `POST` | `/api/rooms/:code/ready` | Marca pronto; se todos prontos → advanceRoomWeek |
| `POST` | `/api/rooms/:code/close` | Dono encerra sala |
| `POST` | `/api/rooms/:code/offer` | Comprador humano oferta por jogador de outro humano |
| `POST` | `/api/rooms/:code/offer/respond` | Vendedor/comprador responde (accept/reject/counter/withdraw) |
| `GET` | `/api/rooms/:code/state` | Estado do jogo projetado para o jogador (escopado) |
| `POST` | `/api/rooms/:code/action` | Executa action na sala (com swap de escopo + actions proibidas) |

**`/api/action` fluxo (single-player):**
1. `runAction(gameStore, action, args)` — auto-discover action names (excluindo internas do Zustand)
2. Valida args com Zod schema (`actionSchemas`)
3. Caso especial: `updateTeam` recebe `[teamId, newTeam]` — valida com Zod whitelist (`teamUpdateFields`), faz merge seletivo preservando budget/reputation/squad, e não chama `fn.apply`
4. Executa `fn.apply(store, args)`
5. Retorna `{ result, state }` (state = `extractState`, mascara rivais)

**`/api/rooms/:code/action` fluxo (online):**
1. `loadScope(room, myTeamId)` — carrega estado por-jogador no store da sala
2. `focusTeam(room, playerId)` — seleciona o time do jogador
3. `runAction(room.store, action, args)` — valida + executa (mesmo `storeHelpers.runAction`)
4. `saveScope(room, myTeamId)` — persiste escopo de volta
5. Actions proibidas: `advanceWeek`, `initGame`, `saveGame`, `simulateMatch`, `substitutePlayer`, `applyShout`, etc.
6. Aquisição de jogadores de times humanos bloqueada (`buyPlayer`, `makeOffer`, etc. — usar `/offer`)
7. Retorna `{ result, state }` (state = `projectState`, escopado + mascara rivais)

### Validação Zod (`backend/src/validation/schemas.ts`)

104 schemas cobrindo todas as actions. Tipos comuns: `zString`, `zNumber`, `zNumberNonNeg`, `zMatchIndex`, `zSlot` (1|2), `zEmpty`. Actions sem schema emitem `console.warn`. `updateTeam` usa `teamUpdateFields` (Zod object whitelist) que faz strip de campos protegidos (budget, reputation, squad, etc.) e permite apenas campos táticos. Inclui schemas para: empréstimos (`loanPlayer`), cláusulas de rescisão (`activateReleaseClause`), guerra de ofertas (`raiseBid`, `withdrawBid`), shortlist (`addToShortlist`, `removeFromShortlist`), recomendações (`dismissScoutRecommendation`), coletivas de imprensa (`generatePreMatchPressConference`, `answerPressQuestion`, `skipPressConference`, etc.).

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
| Rate Limiter | `rateLimiter.ts` | 200 req/min por player-id (fallback IP, trust proxy); cleanup de entradas expiradas a cada 5min |
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
- `/` — Landing page (Nova partida + Jogar online + SaveSlots)
- `/selecionar-time` — TeamSelection
- `/online` — OnlineHome (criar/entrar em sala)
- `/online/sala/:code` — RoomView (lobby, draft, jogo online)
- `*` → redirect `/`

**Rotas (com time selecionado):**
- `/dashboard` — Dashboard (página inicial padrão)
- `/elenco` — SquadView
- `/partidas` — MatchCenter
- `/classificacao` — LeagueTable
- `/transferencias` — TransferMarket
- `/taticas` — TacticsView
- `/treino` — TrainingView
- `/dinamica` — DynamicsView
- `/caixa-de-entrada` — InboxView
- `/imprensa` — PressCenter
- `/financas` — FinanceView
- `/clube` — ClubView (`components/club/ClubView.tsx` + `club.css`, lazy)

**`NAV_ITEMS`** define as 12 telas da sidebar com path, label e **ícone lucide** (`icon: NavIcon` componente, não mais emoji). Atalhos numéricos 1-9, 0 mapeados por `key`.

**Lazy loading:** Todas as páginas (exceto `TeamSelection`, `OnlineHome`, `RoomView`) são carregadas via `React.lazy()` + `Suspense` com fallback de loading.

**Shell dark Football Manager (`app-fm.css`, escopado em `.fm-shell-fm`):** classe `fm-shell-fm` é adicionada ao `.fm-app` quando há time selecionado. Aplica tema dark (fundo com glow azul, sidebar/actionbar dark) por cima do tema legado claro/escuro (importado por último em `main.tsx`). Paleta espelha `tactics-fm.css` (verde de status `#3fbf6b`, azul `#3d7bf5`). Em `≤768px` o shell redefine a sidebar como bottom nav full-width (header/logo/season/footer ocultos, itens em linha com scroll horizontal) — necessário porque `.fm-shell-fm .fm-sidebar` tem especificidade maior que `styles-mobile.css` e, sem esses overrides, a sidebar desktop colapsava num chip no canto inferior esquerdo.

**CSS compartilhado (`fm-shared.css`, escopado em `.fms-page`):** extrai o padrão visual da página `/taticas` para todas as demais páginas. Define variáveis CSS (cores, bordas, painéis), e classes base reutilizáveis: `.fms-topbar` (barra superior com logo, título, subtítulo, botões de ícone, data e botão Continuar), `.fms-subtabs`/`.fms-subtab` (abas secundárias), `.fms-body--scroll` (corpo com scroll), `.fms-content` (área de conteúdo flex), `.fms-toolbar` (barra de ferramentas com filtros), `.fms-table`/`.fms-table-wrap` (tabelas com header sticky, hover, zebra), `.fms-chip`/`.fms-badge` (chips e badges coloridos), `.fms-card`/`.fms-stat-card` (cards e stat cards), `.fms-bar`/`.fms-bar__fill` (barras de progresso), `.fms-input`/`.fms-select`/`.fms-dropdown` (controles de formulário), além de utility classes (flex, gap, text colors, padding). Todas as 10 páginas (Elenco, Partidas, Classificação, Transferências, Treino, Dinâmica, Caixa de Entrada, Imprensa, Finanças, Visão do Clube) agora usam `.fms-page` como container raiz com a topbar padrão.

**Sidebar:**
- Colapsável (botão toggle estilizado)
- Logo com componente `Logo` (SVG inline) + "FM Web"
- Ícones lucide por item; item ativo com texto/borda verde
- Badge de inbox não-lidas
- Footer: ThemeToggle

**Action bar (topo do main):**
- Voltar (deselectTeam ou clearActiveRoom no online), Início (/dashboard), Continuar (advanceWeek offline ou Estou pronto/Pronto ✓ no online), Save 1, Save 2 (offline apenas) — todos com ícones lucide; Continuar em azul à direita (`margin-left:auto`)
- **Modo online:** botão "Negociações" com badge de ofertas pendentes; ready bar com status de cada jogador; botão "Encerrar sala" (dono)
- **Reconnecting banner:** exibido quando polling falha e está reconectando

**Toast System:**
- `pushToast(message, type)` — adiciona notificação temporária (via store)
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

### Modo Online (`frontend/src/components/online/` + `hooks/useRoomPolling.ts`)

- **OnlineHome:** criar sala (gera código de 6 chars), entrar com código, sala lembrada (`fm-last-room` em localStorage)
- **RoomView:** orquestra lobby → draft → jogo online; usa `useRoomPolling` para sincronizar estado
- **DraftScreen:** escolha de clubes em sala online (times já escolhidos bloqueados)
- **OnlineTransfers:** negociações humano×humano (enviar oferta, counter, accept/reject/withdraw)
- **OnlineRoundResult:** resultado da partida do jogador após avanço de rodada
- **useRoomPolling:** polling com backoff exponencial (2s→8s), heartbeat, reconexão automática; detecta avanço de rodada via `currentWeek` e re-sincroniza estado
- **Identidade:** `getPlayerId()` gera UUID estável em localStorage; enviado no header `x-player-id`
- **API client:** `setActiveRoom(code, teamId)` redireciona `apiAction` para `/api/rooms/:code/action`; `clearActiveRoom()` volta ao single-player

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

### Cores e Badges (`frontend/src/utils/statusColors.ts` + `teamColors.ts`)

- **`STATUS_COLOR`:** cores canônicas via `--t-*` tokens (green, amber, red, accent, purple, muted)
- **`getRatingColor(value, thresholds)`:** 3-tier green/amber/red para valores 0-100
- **`getTeamBadge(name)`:** retorna caminho do badge PNG real (20 clubes mapeados)
- **`getTeamTier(reputation)`:** elite/strong/average/developing
- Cores determinísticas por hash do nome (HUES array de 6 cores)

### Atalhos de Teclado (`frontend/src/hooks/useKeyboardShortcuts.ts`)

- **Hook global** `useKeyboardShortcuts()` — registra listener `keydown` em `window`, integrado em `App.tsx`
- **Space** → avançar semana (offline) ou toggle ready (online, via `CustomEvent('fm-shortcut-ready')`)
- **1-9, 0** → navegação rápida entre páginas (dashboard=1, elenco=2, … imprensa=0)
- **Ctrl+S** → salvar no slot 1
- **Escape** → fechar modais (match block) ou voltar ao dashboard
- **Ignora** atalhos quando foco está em `input`, `textarea`, `select` ou `contentEditable`
- Hints visuais: badges numéricos na sidebar (`.fm-sidebar__key-hint`) e tooltip no botão Continuar

### Componentes UI

**Button (`ui/Button.tsx`):** Variantes `primary`, `secondary`, `success`; estados disabled, loading

**Toast (`ui/Toast.tsx`):** Tipos `info`, `success`, `error`; auto-dismiss 5s

**ErrorBoundary (`ui/ErrorBoundary.tsx`):** Captura erros de render; diferencia corrupção de dados de bugs de código

**StatBar (`ui/StatBar.tsx`):** Barra de atributo visual

**ThemeToggle (`ui/ThemeToggle.tsx`):** Radio group Claro/Escuro/Sistema

**Logo (`ui/Logo.tsx`):** Logo FM Web em SVG inline

**TeamCrest (`ui/TeamCrest.tsx`):** Escudo do clube — usa badge PNG real via `getTeamBadge()`, fallback SVG com cores determinísticas

**TacticalPitch (`ui/TacticalPitch.tsx`):** Campo tático 2D decorativo (landing page)

**PageHeader (`ui/PageHeader.tsx`):** Cabeçalho padrão `.fms-page` com título, subtítulo, nome do time, reputação e botões de ação

**MatchEventIcon (`ui/MatchEventIcon.tsx`):** Ícones de eventos de partida (gol, cartão, substituição, etc.)

**ZoneIcon (`ui/ZoneIcon.tsx`):** Ícones de zona da classificação (Libertadores, Sul-Americana, etc.)

**MiniAreaChart (`charts/MiniAreaChart.tsx`):** Mini gráfico de área (Recharts) para projeções financeiras

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

**Redesign estilo Football Manager (tema dark, escopado em `.fm-tactics-fm` via `tactics-fm.css`).** Layout fiel ao FM com dados reais do time. Critique Jul/2026: CTA Pitch Blue (não purple), sem side-stripes, chrome oco removido, UI em PT, ações de XI com `confirm`.
- **Topbar:** logo do clube, título "Táticas", subtítulo com formação + próximo jogo (oponente + C/F), data e **Continuar**; setas ciclam formações; Globe → `/clube`, Trophy → `/classificacao`
- **Subtabs (PT):** Escalação | Adversário | Bolas Paradas — stubs Overview/Player/Roles/Numbers removidos
- **Campo vertical (`FORMATIONS`):** GK embaixo → ataque no topo; marcadores com camisa, role+duty (cores por linha); tooltip PT via `ROLE_LABEL`/`DUTY_LABEL`; drag-and-drop + click-to-place (`selectedSlot`); seleção com borda Pitch Blue (sem glow)
- **Toolbar:** "Editar tática" (Pitch Blue), "Melhor XI" (`autoFillBestXI` + confirm), ícone Ambulance só se `injuredInXI > 0` (`replaceInjured` + confirm), Save (`saveGame(1)`)
- **Resumo sob o campo:** formação · mentalidade PT · aviso de lesionados (substitui anéis Entrosamento/Intensidade/Resposta vazios)
- **Banco lateral:** 7 reservas draggable; labels ≥9px; targets ~44px
- **Tabela Escalação:** Papel (badge tint por linha, sem barra lateral), Nac (texto ISO), Hab, Jogador (+ tag Lesionado), Pos, Con, Mor, Carga — colunas stub (Pre/Últ.5/Méd/Desempenho) removidas; um botão "Substituir lesionados" na toolbar da tabela; Filter alterna banco curto / elenco
- **Adversário:** formação, mentalidade e estilo do próximo oponente (quando houver); aponta briefing pré-jogo para análise profunda
- **Editar tática:** chips de formação + selects PT (mentalidade/passe/ritmo)
- **Bolas Paradas (`SetPiecesPanel`):** Ataque/Defesa como antes; persiste em `tacticsConfig.setPieces`
- **Pendente:** edição detalhada de instruções individuais por jogador

### InboxView (`inbox/InboxView.tsx`)

- 8 tipos de mensagem (Transfer, Lesão, Sugestão, Diretoria, Base, Treino, Financeiro, Notícia)
- Filtros por tipo; modais funcionais (lesão, diretoria, financeiro)
- Tipo `news` é apenas informativo (botão "Marcar como Lido"), usado para transferências AI-vs-AI, cláusulas ativadas, empréstimos concluídos, bônus ativados e disputas
- `BOARD_REPLY_CATEGORIES` em `constants.ts` (obsoleto — não mais importado; respostas agora via `boardReplyOptions` na mensagem)

### TrainingView (`training/TrainingView.tsx`)

- Grid 7×3 (Manhã/Tarde/Noite); tipos: Físico, Técnico, Coesão, Médico, Recuperação, Leve
- Monitor de fadiga e risco por jogador (cores: verde→vermelho) — **sem botão "Recuperar"** (removido para evitar recuperação instantânea durante treino)
- Progressão de atributos (`getPlayerAttributeProgression`)
- Sessões de prevenção

### DynamicsView (`dynamics/DynamicsView.tsx`)

- Painel de diagnóstico do balneário com resumo de moral média, líderes naturais, grupos sociais e promessas ativas
- Hierarquia (Líderes → Outros) e contexto competitivo apresentados lado a lado em desktop
- Tabela ordenável de satisfação com barras para tempo de jogo, contrato, moral, forma e confiança no treinador
- Grupos sociais por `socialGroup` com coesão média, membros, posição e estatuto
- Rede de influência com centralizador, alcance, força das ligações e barras de influência
- Promessas ativas com countdown e urgência semântica
- Estilos próprios em `dynamics/dynamics.css`, baseados exclusivamente nos tokens `--t-*` do sistema `fms-*`

### FinanceView (`finance/FinanceView.tsx`)

- Resumo: orçamento, folha salarial, balanço semanal (inclui prêmios por partida)
- Extrato semanal explícito: bilheteira, patrocínio, transmissão, prêmios (média), salários, infraestruturas, staff + saldo total
- Fôlego (runway): semanas até esgotar caixa se saldo negativo; alerta vermelho quando ≤10 sem
- Projeção 6 semanas (MiniAreaChart); meter de folha salarial
- Tabela de salários por jogador com ordenação

### LeagueTable (`league/LeagueTable.tsx`)

- Classificação da liga (standings)

### PressCenter (`press/PressCenter.tsx`)

- Centro de Imprensa — coletivas pré e pós-jogo
- Perguntas contextuais geradas pelo backend (`generatePreMatchPressConference`, `generatePostMatchPressConference`)
- Respostas tipadas: `praise`, `defensive`, `critical`, `diplomatic`, `deflect`
- Efeitos em moral do elenco, satisfação da diretoria, humor da torcida e pressão midiática
- Decaimento semanal automático (`processWeeklyPressDecay`)
- Histórico de coletivas (`getPressConferenceHistory`)

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
   ├─ Gera incoming transfers (necessidade/crise da IA)
   ├─ Dinâmica de moral + processTransferRequests (pedidos de saída / cascata)
   ├─ Gera inbox messages (lesões, recomendações, contexto, avisos de contrato 4/2/0 semanas)
   ├─ Processa parcelas vencidas e bônus
   ├─ Atualiza classificação (leagueTable)
   ├─ processAIWeeklyDecisions() — IA adversária: transferências AI-vs-AI, ajustes táticos, renovações, assinatura de agentes livres
   ├─ applyWeeklyMoraleDynamics() — dinâmica de moral para todos os times (6 motores)
   ├─ processScoutMissions() — progresso de olheiros
   ├─ updatePromiseCountdown() + captureWeeklyAttributeSnapshot()
   └─ Incrementa currentWeek
3. Response { state } → syncFromResponse → UI atualizada
```

### Transferência
```
1. Mercado: buyPlayer() ou makeOffer() → POST /api/action
2. Oferta recebida: inbox (type='transfer') → acceptIncomingTransfer/reject/defer/negotiateCounterOffer
3. Contra-oferta: negotiateCounterOffer() → mensagem informativa (type='news') no inbox
4. Resolução: no advanceWeek, IA aceita/rejeita → mensagem no inbox (type='news')
5. Parcelas e bônus gerados automaticamente
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

### Modo Online (Sala Multiplayer)
```
Criar/Entrar:
  1. OnlineHome → criar sala (POST /api/rooms) ou entrar com código (POST /api/rooms/:code/join)
  2. Dono clica "Iniciar" → POST /api/rooms/:code/start → gera clubes + abre draft
  3. Cada jogador escolhe clube → POST /api/rooms/:code/pick
  4. Dono confirma → POST /api/rooms/:code/begin → status = 'playing'
  5. Frontend: setActiveRoom(code, teamId) → redireciona apiAction para /api/rooms/:code/action

Jogo por rodada:
  1. Jogador faz ações (táticas, transferências AI, treino, etc.) → POST /api/rooms/:code/action
     ├─ loadScope(room, myTeamId) — carrega estado per-jogador
     ├─ runAction(room.store, action, args) — valida + executa
     └─ saveScope(room, myTeamId) — persiste escopo
  2. Jogador clica "Estou pronto" → POST /api/rooms/:code/ready
  3. Quando todos prontos → advanceRoomWeek(room) — simula rodada, incrementa currentWeek
  4. useRoomPolling detecta currentWeek mudou → GET /api/rooms/:code/state → re-sincroniza
  5. OnlineRoundResult mostra resultado da partida do jogador

Negociações humano×humano:
  1. Comprador envia oferta → POST /api/rooms/:code/offer { playerId, price }
  2. Vendedor responde → POST /api/rooms/:code/offer/respond { offerId, action }
     ├─ accept → transfere jogador
     ├─ reject → encerra negociação
     ├─ counter → nova proposta com counterPrice
     └─ withdraw → comprador desiste
  3. UI: OnlineTransfers modal com lista de ofertas e histórico
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
20. **Modo online multiplayer** — salas com código de 6 chars; draft de clubes; universo isolado por sala; estado por-jogador via `SCOPED_KEYS`; ready-check coordena avanço de rodada; negociações humano×humano via `HumanOffer`
21. **Coletiva de imprensa** — perguntas contextais pré/pós-jogo; respostas tipadas (praise/defensive/critical/diplomatic/deflect); efeitos em moral, diretoria, torcida e mídia; decaimento semanal

---

## ⚠️ Limitações de Produto (Não-Bug)

| Área | Status | Pendências |
|------|--------|------------|
| Testes automatizados | ✅ | gameFlows/matchEngine/balance/errors/schemas/nanGuard/prng tests (backend) + winProbability tests (frontend) — 8 invariantes financeiros |
| Testes de UI | 🟡 | Sem Playwright/Cypress no CI |
| Liga | 🔲 | 20 times (database real), sem descenso/subida |
| IA adversária | ✅ | AI Manager ativo: transferências, táticas, renovações, demissões |
| Salários gerados | 🟡 | `playerGenerator` pode gerar salários >> 500K (cap da UI) |
| Estado backend | 🟡 | Em memória; perdido ao reiniciar (exceto saves em disco) |
| Mobile | 🟡 | Bottom nav ≤768px (app-fm.css + styles-mobile); actionbar wrap; tabelas com scroll-x |
| Modo online | 🟡 | Funcional (draft, ready-check, negociações); sem WebSocket (polling); sem persistência de salas |

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
npm run test         # Vitest — winProbability tests

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
| Arquivos TS/TSX (backend) | ~55 |
| Arquivos TS/TSX (frontend) | ~45 |
| Slices de store (backend) | 14 |
| Helpers de store (backend) | 12 |
| Tipos de domínio (backend) | 14 arquivos |
| Componentes React | ~35 |
| Telas na sidebar | 12 |
| Schemas Zod | 104 |
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
10. **API:** nova rota em `backend/src/routes/game.ts` (single-player) ou `backend/src/routes/rooms.ts` (online)
11. **Middleware:** `backend/src/middleware/`
12. **Validação:** adicionar schema em `backend/src/validation/schemas.ts`

---

## 🎯 Próximos Passos Prioritários

1. **Expandir Fase 2:** múltiplas divisões, copa
2. Corrigir escala de salários no gerador procedural
3. Persistência completa do estado backend (além dos saves)
4. PWA + sincronização cloud
5. Testes E2E (Playwright) para regressão dos fluxos save/voltar/carregar
6. WebSocket para live match e salas online (em vez de polling)
7. Schema Zod para `startNextSeason` (atualmente sem validação)
8. **Online Fase 2:** persistência de salas, reconexão robusta, espectador
9. **Online:** testes E2E para fluxo de sala (criar → draft → jogar → negociar)

---

## 🧪 Validação Rápida (Pós-Alterações)

```text
# Backend + Frontend
npm run dev
# Browser: localhost:5173

Gerar clubes → Assumir → Save 1 → Voltar → painel de saves OK
→ Carregar → jogo restaurado → F5 → Carregar slot 2
```

Console sem erros. Ver também `PlanoMatchEngine.md` e `matchEngineV2.spec.ts`.

---

**Última atualização:** Julho 2026 — polish Visão do Clube: extraiu `ClubView` de App.tsx para `components/club/` (lazy), alinhou ao `fms-*` (identidade + atmosfera + estrutura com barras de nível + finanças + desempenho + promessas), removeu CSS legado `fm-club-view*`. Mantido: fix bottom nav ≤768px; polish Táticas; modo online; Press Center; lazy loading; badges PNG; novos testes (nanGuard, prng); helpers agora são 12 (era 10); 104 schemas Zod (era 91); 12 telas na sidebar (era 11). Mantido de Junho 2026: sistema multi-temporada (até 3, `startNextSeason`, `SeasonSummary`, `gameOver`); IA adversária ativa (helper `aiManager.ts` — transferências AI-vs-AI em janelas, ajustes táticos por zona da tabela, demissão de técnico, renovações de contrato); dinâmica de moral semanal (helper `moraleDynamics.ts` — 6 motores: promessas, tempo de jogo, forma, cascata do capitão, cascata de grupo social, regressão à média); motor de partida atualizado (`simulateFullMatch`/`simulateMinute`/`initLiveMatchState` — simulação passo a passo para todas as partidas); relatório pós-jogo (`generatePostMatchReport` — mapa de calor 3×3, insights táticos, conselhos do assistente, breakdown de passes); novos tipos `PostMatchReport`, `HeatMapZone`, `TacticalInsight`, `AssistantAdvice`, `SeasonSummary`; novos componentes `PostMatchReportView` e `SeasonSummaryModal`; helpers agora são 9 (era 7); `startNextSeason` sem schema Zod; **sistema de transferências expandido:** empréstimos (`LoanDeal` — loanPlayer, recallLoanedPlayer, buyLoanedPlayer), cláusulas de rescisão (`activateReleaseClause`), guerra de ofertas (`BiddingWar` — raiseBid, withdrawBid), shortlist (`ShortlistEntry` — addToShortlist, removeFromShortlist, getShortlist), recomendações de scouts (`ScoutRecommendation` — dismissScoutRecommendation), experiência de scouts (`Scout.experience`, `Scout.missionsCompleted`); novos campos no `GameState`: `shortlist`, `scoutRecommendations`, `activeLoans`, `biddingWars`; compatibilidade de saves atualizada em `saves.ts`; 9 novos schemas Zod (total 91); UI do `TransferMarket` com 4 novas abas (Empréstimos, Shortlist, Recomendações, Guerra de Ofertas) + botões de shortlist/cláusula nos cards do mercado + painel de olheiros com experiência; **correções de bugs no mercado de transferências (#53-#58):** `maybeGenerateBiddingWar` agora é chamado em `makeOffer` ao aceitar oferta (antes nunca era invocado); `handleAcceptOffer` não re-envia `makeOffer` quando já aceito; `activateReleaseClause`/`buyLoanedPlayer`/`raiseBid` agora aguardam Promise com `await` (antes sempre mostravam sucesso); `handleQuickSalaryOffer` funciona na primeira entrada da fase de contrato; `acceptIncomingTransfer` não soma `currentWeek` duas vezes no `dueWeek` das parcelas; `negotiateCounterOffer` inclui `direction: 'receivable'` no `InstallmentClause`
