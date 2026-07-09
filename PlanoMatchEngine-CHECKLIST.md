# Motor de Partida v2 — Checklist de Execução (para IA implementadora)

**Como usar este arquivo.** Cada fase é uma unidade de trabalho fechada. Faça **em ordem**. Não comece a próxima fase antes de a atual passar (a) seus testes, (b) o benchmark de perf, (c) o gate dos 3 pilares. Sem trechos de código aqui de propósito: o texto diz **o que usar, de onde, e o que muda** — a implementação é sua, mas os alvos são exatos.

**Fonte da verdade conceitual:** `PlanoMatchEngine.md` (o *porquê*). Este arquivo é o *como*. Quando houver dúvida de comportamento, o blueprint decide.

**Stack confirmada:**
- Motor: `backend/src/store/helpers/matchEngine.ts` (~2800 linhas, já calibrado, determinismo mulberry32 já pronto).
- Tipos: `backend/src/types/team.ts`, `player.ts`, `match.ts`, `game.ts` (barrel).
- Previsão: `backend/src/store/helpers/preMatchAnalysis.ts`.
- Drivers: `backend/src/store/slices/match.ts` e `core.ts`.
- Tooling de balanceamento: `backend/headless_sim.ts` + `backend/run_batch.py`.
- Testes: `backend/src/tests/*.test.ts` — runner **vitest** (`npm test` = `vitest run` em `backend/`).
- Testes TDD desta iniciativa: `backend/src/tests/matchEngineV2.spec.ts` (já criado; ative os blocos conforme implementa).

**Regra de ouro (Seção 0.5 do blueprint):** todo recurso novo (A) roda atrás da flag `v2` com o v1 intacto; (B) passa o orçamento de perf; (C) a IA adversária sabe usá-lo. Três checkboxes obrigatórios por fase.

---

## FASE 0 — Infra dos 3 pilares (bloqueia todo o resto)

> **Nada da Fase 1+ começa antes desta fase estar pronta.** Ela cria a rede de segurança.

### 0.1 — Flag de motor (`v2` atrás de flag) — Pilar A
- [ ] Criar uma constante única de seleção de motor, lida de env var `MATCH_ENGINE` (valores `v1` | `v2`, **default `v1`**). Colocá-la num único módulo (ex: `backend/src/store/helpers/engineFlag.ts`) e importar de lá — **nunca** ler `process.env` espalhado.
- [ ] Em `simulateFullMatch`, `simulateMinute` e `initLiveMatchState` (todos em `matchEngine.ts`): quando a flag for `v2`, delegar para as funções novas (`*V2`); quando `v1`, manter o comportamento atual **byte a byte**.
- [ ] **Não** apagar nenhuma função do v1 nesta iniciativa inteira até a Fase 11 declarar o corte.
- **DoD:** com `MATCH_ENGINE` ausente ou `v1`, a suíte de testes atual passa idêntica; com `v2` e nenhuma função nova ainda, cai num stub que chama o v1 (comportamento igual).

### 0.2 — Harness comparativo v1×v2 — Pilar A
- [ ] Estender `headless_sim.ts` para aceitar um argumento de motor e rodar **os mesmos confrontos com as mesmas seeds** nos dois motores.
- [ ] Emitir um relatório lado a lado dos invariantes da Seção 12 do blueprint (ver tabela em 0.4 abaixo). Usar seeds fixas (lista de N seeds constante no arquivo) para reprodutibilidade.
- [ ] `run_batch.py` deve rodar isso 30–100× e agregar médias + variância.
- **DoD:** um comando produz uma tabela "v1 vs v2 vs alvo" por invariante.

### 0.3 — Benchmark de performance — Pilar B
- [ ] Adicionar ao harness a medição de tempo de: (i) **1 partida completa** (90') e (ii) **1 rodada de liga** (todos os jogos de fundo de uma semana).
- [ ] Definir os orçamentos como constantes nomeadas: `PERF_BUDGET_MATCH_MS` (ex: 50) e `PERF_BUDGET_ROUND_MS` (ex: 1000). Ajuste os números à máquina-alvo, mas fixe-os.
- [ ] Criar teste que **falha** se `v2` estourar o orçamento (ver `matchEngineV2.spec.ts` › "performance").
- **DoD:** o benchmark roda e reporta ms por partida e por rodada, para v1 e v2.

### 0.4 — Tabela de invariantes travada — base do balanceamento
- [ ] Fixar num único módulo os alvos (constantes nomeadas) que todo teste de balanceamento consulta:

| Invariante | Alvo |
|---|---|
| Gols/jogo | 2.5–2.9 |
| % vitória mandante | 45–48% |
| % empates | 24–28% |
| Pontos do campeão (38 rodadas) | 75–88 |
| % gols de bola parada | 25–30% |
| % gols de contra-ataque | >10% |
| Upset rate (ver 0.5) | 25–35% |
| Perf 1 partida | < `PERF_BUDGET_MATCH_MS` |
| Perf 1 rodada | < `PERF_BUDGET_ROUND_MS` |

- **DoD:** os alvos vivem em um lugar só, consumidos por testes e harness.

### 0.5 — Setups de referência para o teste de upset — Pilar C (base)
- [ ] Definir no harness **2 setups táticos fixos e nomeados**: `REF_COESO` (duties equilibrados, cobertura de espaço, sem 2 playmakers na mesma zona) e `REF_INCOERENTE` (ex: todos os duties em `attack`, dois playmakers na mesma zona, wing-backs Attack dos dois lados sem contenção).
- [ ] Definir um **gap de força fixo**: time A (com `REF_INCOERENTE`) = ~130% da força efetiva do time B (com `REF_COESO`).
- **DoD:** o teste de upset é reproduzível — `winRate(B_coeso vs A_incoerente_mais_forte) ≥ alvo`, sem números soltos.

### Gate dos 3 pilares (Fase 0)
- [ ] **A:** flag `v2` existe, v1 intacto e default.
- [ ] **B:** benchmark mede e reporta perf.
- [ ] **C:** setups de referência da IA definidos.

---

## FASE 1 — Fundação: Roles & Atributos por função

> **Objetivo:** o mesmo jogador rende diferente conforme role/duty/posição. Ainda no modelo de força agregada, mas já **ponderada por função**. Pré-requisito de tudo.

### 1.1 — Tabela de key attributes por role — usar dado que já existe
- [ ] `PlayerRole` (em `team.ts`) já tem `role: string` + `duty: string` + `slotIndex`. **Não criar tipo novo.**
- [ ] Criar um módulo de dados `backend/src/store/helpers/roles.ts` com um mapa `ROLE_WEIGHTS: role → duty → Record<atributo, peso>`, cobrindo os 12–16 roles da Seção 2 do blueprint. Key attributes com peso alto; resto peso baixo (não zero).
- [ ] Os nomes dos atributos devem bater **exatamente** com os campos de `PlayerAttribute`/`GKAttributes` em `player.ts` (ex: `offBall`, não `offTheBall`; `oneOnOne`, não `oneOnOnes`). Conferir cada um contra o type.
- **DoD:** existe peso para todo par (role, duty) usado nos setups de referência da Fase 0.

### 1.2 — Familiaridade posicional — consumir `positionProficiency`
- [ ] `Player.positionProficiency: Record<string, number>` (1-20) e `Player.secondaryPositions: string[]` **já existem** — o motor os ignora hoje. Passar a usá-los.
- [ ] Definir a curva: proficiency alta → fator 1.0; média → ~0.85–0.90; baixa/ausente → ~0.60–0.70. Fator multiplica a força efetiva **e** piora decisões (usar como modificador nas probabilidades de passe/decisão da fase).
- **DoD:** um jogador escalado fora da posição natural tem força efetiva mensuravelmente menor.

### 1.3 — Posições granulares + mapa formação→coordenadas — pré-requisito das zonas
- [ ] Hoje `Player.position` é grosseiro (`GK/DEF/MID/FWD`) e `Team.formation` é string (`'4-4-2'`, `'4-3-3'`, `'3-5-2'`, `'5-2-2'`). Isso **não** distingue lado (E/C/D) nem altura — a Fase 2 precisa disso.
- [ ] Criar `FORMATION_LAYOUT: Record<formation, Array<{x, y, zone}>>` indexado por `slotIndex`, onde `x` = profundidade (0 = próprio gol, 1 = gol adversário) e `y` = lateralidade (0 = uma ponta, 1 = outra). Uma entrada por slot de cada formação existente.
- [ ] Derivar a posição granular de cada titular por `slotIndex` (via `Team.startingXI` + `PlayerRole.slotIndex`) cruzando com `FORMATION_LAYOUT`. Chave de familiaridade (1.2) passa a poder usar a posição granular.
- **DoD:** dado um `startingXI` + formação, o motor sabe (x, y) base de cada titular.

### 1.4 — `effectiveStrength(jogador, role, duty)` (a "forçaEfetiva" do blueprint)
- [ ] **Nome canônico do export: `effectiveStrength`** (o spec TDD procura exatamente por esse nome). Criar em `matchEngine.ts` (ou `roles.ts` e re-exportar de `matchEngine.ts`): soma ponderada dos atributos pelos pesos de 1.1 × familiaridade posicional (1.2) × condição (`fitness`) × moral × forma. Reaproveitar os helpers existentes `getMoraleFactor` e o padrão de `((form)/100)*.5+.5`.
- [ ] `teamAttack`/`teamDefense`/`calculateTeamStrength` do v2 passam a somar `forçaEfetiva` em vez da média global atual. **Só na versão v2** (atrás da flag).
- **DoD:** ver testes `matchEngineV2.spec.ts` › "Fase 1".

### Gate dos 3 pilares (Fase 1)
- [ ] **A:** só o caminho v2 muda; v1 idêntico.
- [ ] **B:** ponderar por role não pode estourar o orçamento (é barato — força é pré-computada por partida, não por tick).
- [ ] **C:** a montagem da IA (Fase 8) passará a escalar por `forçaEfetiva`, não por CA bruto — deixar a função pronta para a IA consumir.

---

## FASE 2 — Zonas & Duelos individuais

> **Objetivo:** substituir "choque de médias de time" por **microduelos localizados**. Lateral fraco vs ponta forte gera exploração mensurável.

### 2.1 — Mapa de zonas
- [ ] Definir a grade de zonas: mínimo 3 corredores × 3 terços (9); alvo 5×6 (30) como o FM. Começar com 3×3 e subir se a perf permitir.
- [ ] A cada lance, mapear `ballPos`/`ballPosY` (já existem em `LiveMatchState`) para uma zona.

### 2.2 — Quem está em cada zona
- [ ] Derivar ocupação de zona por time a partir de: `FORMATION_LAYOUT` (1.3) + role/duty (deslocam a posição base: ex. `wingBack` Attack sobe; `invertedWinger` corta pro meio) + fase do jogo (Fase 3 puxa gente pro terço final).
- [ ] Isso alimenta tanto a resolução quanto o relatório pós-jogo (duelos por zona).

### 2.3 — Resolução de duelo
- [ ] Substituir os `pick*` genéricos (`pickPlayerWithBall`, `pickDefender`) do v2 por seleção **de quem está na zona**. Manter as assinaturas e o padrão `weightedPick` já existente para não reescrever o RNG.
- [ ] Probabilidade de vencer o duelo = f(forçaEfetiva do atacante nos atributos do duelo vs. defensor na zona, com cobertura como modificador). Usar `_matchRng()` — **nunca** `Math.random()` (determinismo já implementado; não quebrar).

### 2.4 — Overloads (superioridade numérica)
- [ ] Quando roles/duties concentram mais atacantes que defensores numa zona, o duelo pende para o ataque. Isso **emerge** da contagem de ocupação (2.2), não de número mágico.

### Gate dos 3 pilares (Fase 2)
- [ ] **A:** duelos só no v2.
- [ ] **B:** **crítico aqui** — duelo por zona por tick é o maior risco de perf. Rodar o benchmark; se estourar, reduzir a grade (30→9) ou pré-computar ocupação por minuto, não por tick.
- [ ] **C:** a IA (Fase 8) deve reconhecer overload sofrido e reagir (dobrar marcação naquele lado).

---

## FASE 3 — As 5 fases do lance

> **Objetivo:** `simulateTick` deixa de decidir "chuta/dribla/passa" genérico e passa a rastrear **em qual fase** o lance está e **qual duelo** resolver. Faz "domino mas não crio" e "parking the bus" acontecerem.

### 3.1 — Estado de fase no lance
- [ ] Adicionar ao `LiveMatchState` (em `match.ts`) o campo de fase atual do lance (Construção / Progressão / Criação / Finalização / Transição). Mantê-lo **serializável** (o replay depende disso).
- [ ] Reescrever o fluxo do `simulateTickV2` como progressão por fases, cada uma com o duelo dominante e os atributos-chave da Seção 1 do blueprint.

### 3.2 — Volume ≠ qualidade de chance
- [ ] Separar explicitamente **volume de chance** (quantas vezes chega ao terço final) de **qualidade de chance** (xG do lance). O xG por lance **já existe** em `shotSuccessProb` (retorna `xg`) — preservar e alimentar por fase.
- [ ] Contra bloco baixo bem posicionado (Fase 3), muita posse deve virar chute de fora / cruzamento bloqueado, **não** chance clara.

### Gate dos 3 pilares (Fase 3)
- [ ] **A/B/C** conforme padrão. Perf: fases adicionam ramificação por tick — medir.

---

## FASE 4 — Transição / Contra-ataque

> **Objetivo:** Fase 5 do blueprint como estado próprio. É como um time inferior vence um superior.

- [ ] Ao perder a bola, entrar num estado de **transição** por alguns ticks: a defesa que recuperou está desorganizada; o time que perdeu está exposto proporcionalmente a quantos jogadores subiu (mentalidade ofensiva = mais expostos).
- [ ] Perigo da transição ∝ **onde** a bola foi perdida (mais adiantada = mais perigosa) × pace/verticalidade de quem recuperou.
- [ ] Ligar `afterGainingPossession === 'counterAttack'` e `afterLosingPossession` (já em `Team`) a este estado — hoje só dão bônus escalar.
- **DoD:** teste de upset (0.5) começa a atingir o alvo — time retraído coerente vence ofensivo incoerente numa fração realista.

### Gate dos 3 pilares (Fase 4)
- [ ] **C:** a IA deve **arriscar exposição** de forma calculada (não subir todo mundo cegamente) e explorar transição quando o humano se expõe.

---

## FASE 5 — Instruções relacionais + mentalidade

> **Objetivo:** nenhuma instrução é boa/ruim em absoluto — é uma aposta condicional (ganha contra X, perde contra Y). Ver matriz da Seção 5 do blueprint.

- [ ] Reimplementar os efeitos de `engagementLine`, `defensiveLine`, `pressIntensity`, `tacklingStyle`, `passingStyle`, `tempo`, `useFlank`, `attackWidth` (todos já em `Team`) como **modificadores relacionais**: o efeito depende do que o adversário faz naquela zona/fase, não é `+X%` no próprio time.
- [ ] `teamMentality` (very defensive → very offensive) vira **régua de risco global**: desloca duties, avanço, risco de passe e **exposição na transição** — não é multiplicador de gols.
- [ ] Aplicar `PlayerInstruction` (já existe: `passMore`, `shootMore`, `cutInside`, `stayBack`, etc.) como ajuste fino das tendências de decisão por jogador.
- [ ] **Aposentar os multiplicadores fixos** do v1 no v2: `getTacticalBonus` (bônus escalar somado), `tacticAttackMult`/`tacticDefenseMult` (1.12/0.88 fixos em `teamAttack`/`teamDefense`), e a vantagem de casa constante `HOME_ADVANTAGE` — substituídos por efeitos relacionais/variáveis. **Só no v2.**

### Gate dos 3 pilares (Fase 5)
- [ ] **C:** **o mais importante** — a IA deve **ler o estilo do humano e escolher a contraposição** da matriz. Instrução que só o humano usa = dificuldade quebrada.

---

## FASE 6 — Estado dinâmico (partida "viva")

- [ ] **Fadiga → execução:** `nextFatigue`/`fatigueMod` **já existem** e degradam qualidade. Garantir que a queda de produção após ~70' é visível e que a fadiga sobe mais com pressão alta/tempo rápido/role de muita corrida.
- [ ] **Momentum:** `momentum` já existe no estado, curto e decaindo. Preservar; não deixar virar bola de neve.
- [ ] **Moral:** `getMoraleFactor`/`getTeamMoraleCohesion` já existem. Gol sofrido abala, marcado levanta; `pressure`/`bigGameImportance` modulam.
- [ ] **Teto combinado (Seção 7 do blueprint):** somar todos os modificadores de estado (fadiga+moral+momentum+casa+fase) e **limitar o swing total** (ex: `clamp(±0.15)`) antes de aplicar ao duelo. Qualidade + duelo tático dominam; estado tempera.
- [ ] **Casa variável:** substituir o `HOME_ADVANTAGE` constante por função de torcida/`fanMood`/`mediaPressure`/importância. (Se esses campos não existirem, criar mínimos ou derivar de reputação — verificar em `Team` antes.)
- [ ] **Game management:** o time ganhando recua no fim; perdendo arrisca (mais gols nos dois sentidos no fim). Isso é comportamento **da IA** durante o jogo → ligar com a Fase 8.

### Gate dos 3 pilares (Fase 6)
- [ ] **C:** game management é uma capacidade da IA — não pode existir só para o humano.

---

## FASE 7 — Bola parada & Árbitro integrados aos duelos

- [ ] Bola parada: as funções `simulateCornerKick`/`simulateFreeKick`/`simulatePenalty` **já existem** e usam `SetPiecesConfig` (já no type). No v2, integrá-las ao modelo de **duelo aéreo por zona** (heading+jumping+strength vs zaga + `commandOfArea`/`aerialReach`/`punching` do GK) em vez de fórmula isolada.
- [ ] Garantir que bola parada seja **rota real de gol** (~25–30%) — é o invariante da Seção 12. Decisiva em jogos travados.
- [ ] Árbitro: faltas **emergem** de duelos perdidos com `aggression`/`tackling` ruim + `dirtiness` (já em `HiddenAttributes`), não sorteio puro. Cartão por falta tática (parar contra-ataque = amarelo mais provável). Rigor do árbitro como variável leve por partida (seed-dependente).
- [ ] Expulsão muda **estrutura** (reorganização por zona), não só −1 força. `sentOff` já existe e já filtra do `startingXI` — estender para reorganização.

### Gate dos 3 pilares (Fase 7)
- [ ] **B:** conferir que integrar bola parada aos duelos não estoura perf.

---

## FASE 8 — Inteligência tática da IA adversária (Pilar C, dedicado)

> **Objetivo:** a IA joga tática. Sem isto, o objetivo do projeto não existe (Seção 0.5 / 7.5). Esta fase consolida o que as fases anteriores foram deixando pronto para a IA consumir.

### 8.1 — Montagem coerente (pré-jogo)
- [ ] A IA escolhe formação, roles e duties respeitando a coerência da Seção 2 (equilíbrio de duties, cobertura de espaço, sem 2 playmakers na mesma zona). Escala por `forçaEfetiva` (Fase 1), **não** por CA bruto.

### 8.2 — Leitura do adversário
- [ ] A IA identifica o padrão do adversário (flanco forte, bloco baixo, transição perigosa) e escolhe a contraposição da matriz da Seção 5 (Fase 5).

### 8.3 — Game management (durante)
- [ ] A IA ajusta mentalidade/instruções por placar/tempo/fadiga e **substitui** por fadiga/cartão/lesão (usa `matchInjuries`, `cards`, `fatigue` do estado). Ganhando aos 80' recua; perdendo arrisca.

### 8.4 — Níveis de competência
- [ ] Modular 8.1–8.3 por reputação/orçamento do clube: clube pequeno erra coerência e lê mal; gigante monta e ajusta perto do ótimo. Dá curva de dificuldade e evita que todo adversário seja gênio.

### Gate dos 3 pilares (Fase 8)
- [ ] **C cumprido:** roda o teste de curva de dificuldade (0.5) — IA elite vence/empata fração respeitável contra bom setup humano; IA fraca perde para setup coerente.

---

## FASE 9 — Previsão unificada (elimina odds enviesadas)

- [ ] Hoje `preMatchAnalysis.ts` (linha ~210) roda `simulateMatchResult` (modelo Poisson rápido) N× para prever odds — **modelo diferente** do que joga a partida.
- [ ] No v2, a previsão roda **o próprio motor de fases** com N seeds variadas, **ou** uma redução calibrada travada por teste contra as médias do motor completo.
- [ ] Reusar o **caminho rápido** (Pilar B) para as N sims — previsão não pode custar o caminho completo N vezes.
- **DoD:** `predictionCalibration.test.ts` passa a exigir que a distribuição prevista bata (dentro de tolerância) com a distribuição real do motor v2.

### Gate dos 3 pilares (Fase 9)
- [ ] **B:** N sims de previsão dentro do orçamento (usar caminho rápido).

---

## FASE 10 — Relatório pós-jogo com dados de fase/duelo

- [ ] `generatePostMatchReport` **já existe** (heatmap 9 zonas, insights, conselhos). No v2, alimentá-lo com os dados **reais** que o motor de duelos agora produz:
  - Duelos por jogador/zona ganhos-perdidos ("seu lateral-direito perdeu 7 de 10 duelos").
  - xG acumulado por time e por chance (qualidade separada de volume).
  - Chances por origem (lateral/centro/bola parada/transição).
  - Eficácia e custo da pressão (perdas forçadas × fadiga/espaço cedido).
  - Momento da queda de produção (fadiga) — "caiu após 70'".
  - Conselho do assistente **acionável** ("o meio deles teve superioridade; considere um volante a mais").
- **DoD:** o relatório expõe pelo menos duelos-por-zona e chances-por-origem com dados verdadeiros (não fallback aleatório).

---

## FASE 11 — Balanceamento final + corte do v1

- [ ] Rodar `run_batch.py` (30–100 temporadas) e ajustar cada constante do motor (pesos de duelo, custo de fadiga da pressão, base de xG, etc.) olhando o **efeito nos invariantes** (0.4), não achismo.
- [ ] Todos os invariantes da tabela 0.4 dentro do alvo, **incluindo perf e upset rate**, no v2.
- [ ] Só então: promover `v2` a default e **agendar** a remoção do v1 (não antes). Manter o v1 removível numa única troca de flag até estar 100% confiante.
- **DoD:** `MATCH_ENGINE=v2` passa todos os testes de balanceamento e perf; a pergunta-teste do blueprint ("treinador esperto com time médio bate time melhor mal treinado com frequência?") responde **sim**.

---

## Ordem-resumo (cole no topo do seu backlog)

0. Infra dos 3 pilares (flag, harness v1×v2, benchmark, invariantes, setups de referência)
1. Roles & atributos por função (`forçaEfetiva`, familiaridade, posições granulares)
2. Zonas & duelos
3. As 5 fases do lance
4. Transição/contra-ataque
5. Instruções relacionais + mentalidade (aposentar multiplicadores fixos no v2)
6. Estado dinâmico + teto combinado + casa variável
7. Bola parada & árbitro integrados
8. IA adversária (montagem, leitura, game management, níveis)
9. Previsão unificada
10. Relatório pós-jogo rico
11. Balanceamento final + corte do v1

**Cada fase: testes verdes + benchmark de perf + gate dos 3 pilares. Sem exceção.**
