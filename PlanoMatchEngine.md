# Motor de Partida — Blueprint Estilo Football Manager

**Objetivo:** especificar tudo que o motor de simulação precisa conter para produzir partidas realistas, taticamente profundas e desafiadoras, no mesmo modelo mental do Football Manager oficial — onde **o melhor overall não vence sozinho**, e cada decisão tática, escalação e ajuste faz diferença mensurável.

Este documento é a fonte de verdade do design. Não é código; é o mapa do que precisa existir, por quê, e como as peças se conectam. A implementação deve seguir este blueprint em fases testáveis.

---

## 0. Princípio fundamental (o que muda tudo)

> **O FM não calcula "força A vs força B → gols". Ele simula uma sequência de decisões individuais em zonas do campo, onde a tática decide QUAIS decisões e ONDE, e os atributos decidem QUÃO BEM são executadas.**

Toda a arquitetura abaixo deriva desse princípio. Três consequências não-negociáveis:

1. **O motor é orientado a eventos (event-based), não a placar (score-based).** O placar é *emergente* — resultado de milhares de microdecisões — nunca um número sorteado de uma distribuição de força.
2. **Tudo é relacional, nunca absoluto.** Nenhum bônus tático é um multiplicador fixo aplicado ao próprio time. Todo efeito depende do que o adversário está fazendo naquela zona, naquele momento. "Pressão alta" não é `+8%`; é uma aposta que ganha contra saída de bola ruim e perde contra saída de bola boa.
3. **A partida tem estado que evolui.** Fadiga, moral, momentum, placar e cartões alteram a execução minuto a minuto. Um plano perfeito aos 0' pode ruir aos 70' se você não gerenciar.

### Anti-padrões a eliminar (o que o motor atual faz de errado)

| Anti-padrão atual | Por que mata o realismo |
|---|---|
| `multiplicador tático fixo` (ex: attacking ×1.12) | Torna tática um bônus escalar → CA domina tudo |
| Força agregada do time como base do lambda | Elimina duelos locais; seu lateral fraco "some" na média |
| Vantagem de casa constante (1.12) | Casa deveria variar com torcida, moral, pressão midiática |
| Posse como consequência direta do ataque | Posse deve **emergir** de quem vence a construção |
| "volume de chance" e "qualidade de chance" no mesmo lambda | Impede o "domino o jogo mas não finalizo" e o "parking the bus" |
| Roles apenas como label | Roles precisam **mudar decisões e pesos de atributo** |

---

## 0.5. Os TRÊS PILARES inegociáveis de execução (leia antes de tudo)

O modelo conceitual (Seções 1-10) está correto. Mas o que **decide se este projeto entrega ou fracassa** não são os conceitos — são três pilares de execução. Se qualquer fase da Seção 13 for entregue violando um destes, ela **não está pronta**, mesmo que a lógica de jogo pareça funcionar. Estes três voltam como *gate* em toda fase.

### Pilar A — Migração paralela atrás de flag (NUNCA big-bang)
O motor atual tem ~2800 linhas **já calibradas** (~2.7 gols/jogo, testes passando, determinismo mulberry32 já implementado). Reescrever o núcleo direto no lugar = semanas com o jogo pior e desbalanceado.
- O motor novo nasce **atrás de uma flag** (`MATCH_ENGINE=v2` via env/config), com o v1 intacto e ativo por padrão.
- `headless_sim.ts` roda **v1 e v2 sobre os mesmos confrontos + as mesmas seeds** e compara os invariantes da Seção 12 lado a lado.
- v2 só vira padrão quando **iguala ou supera** o v1 em todos os invariantes.
- **Regra:** nenhuma fase remove código do v1 antes do v2 passar o gate. A flag é a rede de segurança que torna "sem quebrar o jogo" real.

### Pilar B — Orçamento de performance (medido, não descoberto no lag)
Duelos por zona + roles por tick é **ordens de magnitude** mais caro que a força agregada de hoje, e roda para a **liga inteira toda semana** + **N× na previsão pré-jogo**. Sem teto explícito, uma rodada trava a UI.
- **Duas velocidades:** caminho **completo** (fases/duelos/relatório rico) só para a partida do usuário e jogos-chave visíveis; caminho **rápido** (modelo agregado calibrado às mesmas médias) para partidas de fundo da liga e as N sims de previsão.
- **Orçamento explícito, verificado no headless:** 1 partida (90') < ~50 ms; 1 rodada de liga (todos os jogos de fundo) < ~1 s. Ajuste os números à sua máquina-alvo, mas **defina-os e teste-os**.
- **Regra:** toda fase que adiciona custo por tick roda o benchmark de perf. Estourou o orçamento → não está pronta.

### Pilar C — Inteligência tática da IA adversária (sem ela, o objetivo não existe)
A tese é *"tática importa tanto quanto talento"*. O jogador só sente isso se o **adversário controlado pela IA também joga tática**. Motor perfeito + IA que escala 11 overalls e nunca ajusta = humano domina com setup mediano e o desafio colapsa.
- A IA precisa: **montar** setup coerente (roles/duties, Seção 2), **ler** o adversário e contrapor (matriz da Seção 5), e fazer **game management** durante o jogo (Seção 7.5).
- Detalhamento completo na **Seção 7.5**.
- **Regra:** cada capacidade nova dada ao humano (roles, instruções relacionais, ajustes in-game) só está pronta quando a **IA também sabe usá-la**. Recurso que só o humano usa é vantagem injusta que quebra a dificuldade.

> **Como os pilares aparecem na prática:** cada fase da Seção 13 termina com um bloco *"Gate dos 3 pilares"* — roda atrás da flag (A), passa o benchmark de perf (B), e a IA sabe usar o que foi adicionado (C). Três checkboxes obrigatórios por fase.

---

## 1. As 5 fases do jogo (a espinha dorsal)

O FM resolve cada posse de bola como uma progressão por fases. Um lance nasce, avança e morre (gol, perda, falta, saída). Cada fase tem um **gargalo diferente** e um **duelo dominante diferente**. Isso é o que permite um time ser ótimo numa coisa e péssimo noutra.

### Fase 1 — Construção (Build-up)
- **Onde:** defesa + primeiro terço.
- **Objetivo:** sair jogando sem perder a bola.
- **Duelo dominante:** saída de bola (passe/composure/decisão dos zagueiros e volante) **vs** pressão do adversário (pressing/agressividade/posicionamento dos atacantes deles).
- **Atributos-chave:** `passing`, `composure`, `decisions`, `firstTouch`, `vision` (do lado que constrói); `aggression`, `workRate`, `anticipation`, `pace` (do lado que pressiona).
- **Saídas possíveis:** progressão limpa → Fase 2; passe errado sob pressão → **perda no campo de defesa (Fase 5, transição perigosa pro adversário)**; bola longa (chuta pra frente, aposta na Fase 4 direta / disputa aérea).
- **Regra FM:** pressão alta contra boa saída de bola **abre espaço nas costas** e desgasta fadiga sem ganhar a bola. Contra saída ruim, recupera no campo adversário e gera chance de altíssima qualidade.

### Fase 2 — Progressão (avançar ao terço final)
- **Onde:** meio-campo.
- **Duelo dominante:** meio-campistas em posse (drible/passe/visão/técnica) **vs** meio-campistas defendendo (marcação/desarme/interceptação/posicionamento). **Superioridade numérica no meio** (nº de MID por formação) pesa muito aqui.
- **Atributos-chave:** `dribbling`, `passing`, `vision`, `technique`, `agility`, `balance` **vs** `tackling`, `marking`, `positioning`, `interceptions`, `strength`.
- **Saídas:** progressão pelo centro; progressão pela lateral (aciona duelo de flanco); perda no meio → transição.
- **Regra FM:** aqui é onde formação decide. 3 no meio vs 2 no meio = superioridade que domina a fase. Um trequartista/box-to-box muda o resultado desta fase pela role.

### Fase 3 — Criação de chance
- **Onde:** terço final.
- **Duelo dominante:** depende de **como** o time entra no terço final:
  - **Pela lateral** → duelo ala/ponta (pace/drible/cruzamento) vs lateral (marcação/pace/antecipação) → cruzamento → disputa aérea.
  - **Pelo centro** → passe entre linhas (visão/técnica) vs bloco defensivo (posicionamento/compostura) → chance clara ou chute de fora.
- **Atributos-chave:** `crossing`, `dribbling`, `passing`, `flair`, `vision`, `offTheBall` **vs** `marking`, `positioning`, `heading`, `concentration`.
- **Regra FM:** este é o gargalo do "domino mas não crio". Contra bloco baixo bem posicionado, o volume de posse não vira chance clara — vira chute de fora e cruzamento bloqueado. É AQUI que o *parking the bus* funciona.

### Fase 4 — Finalização
- **Duelo:** finalizador (finishing/composure/technique/off-the-ball) **vs** goleiro (reflexes/positioning/one-on-ones/handling) + último defensor.
- **Atributos-chave:** `finishing`, `composure`, `technique`, `longShots` (se de fora), `heading` (se aérea) **vs** `reflexes`, `oneOnOnes`, `positioning`, `handling`, `aerialReach`.
- **Regra FM:** **qualidade da chance (xG) e execução são coisas separadas.** Uma chance clara (xG alto) ainda pode ser perdida por finishing/composure baixos. Um artilheiro com composure alto converte chances medianas. O goleiro é um modificador real, não decorativo.

### Fase 5 — Transição (o momento decisivo do FM)
- **O que é:** o instante entre perder e recuperar a bola. A defesa ainda **não se reorganizou**.
- **Por que é central:** contra-ataque **não é um bônus** — é a Fase 3/4 executada contra uma defesa desorganizada. É como um time inferior vence um superior.
- **Fatores:** onde a bola foi perdida (quanto mais adiantada a perda, mais perigosa a transição sofrida); pace/verticalidade do time que recupera; quantos jogadores o time que perdeu tinha subido (mentalidade ofensiva = mais expostos na transição).
- **Regra FM:** mentalidade ofensiva **aumenta a exposição à transição**. Linha alta + perda no meio = contra-ataque em campo aberto. Este é o principal balanceador de "arriscar vs segurar".

> **Implicação de implementação:** o `simulateMinute` deixa de decidir "chuta/dribla/passa" genérico e passa a rastrear **em qual fase o lance está** e **qual duelo resolver**, com os atributos e a zona certos.

---

## 2. Roles + Duties (o coração — mais importante que a formação)

No FM, formação (4-3-3) é quase secundária. O que define o time é **o que cada jogador faz**. `tacticsConfig.playerRoles` já existe na sua base — hoje é label; precisa virar comportamento.

### O que uma Role define
1. **Posicionamento base e movimentação** — onde fica sem a bola, para onde se move com a bola (ex: `Inverted Winger` corta pro meio; `Wing-Back` sobe pela linha; `Deep-Lying Playmaker` recua pra construir).
2. **Key attributes** — quais atributos importam pra ESSA função (ver seção 3).
3. **Tendências de decisão** — o que tende a fazer com a bola (dribla mais, passa mais, chuta de fora, cruza).
4. **Contribuição por fase** — em quais das 5 fases o jogador é protagonista.

### Duty (Defend / Support / Attack) = régua de risco
O mesmo role muda radicalmente conforme o duty:
- **Defend:** prioriza posição, arrisca pouco, participa pouco do ataque, forte na transição defensiva.
- **Support:** equilíbrio, conecta as fases.
- **Attack:** avança muito, arrisca, gera chance — mas **deixa espaço nas costas** (custo na Fase 5).

### Conjunto mínimo de roles para começar (12–16 cobrindo tudo)
| Linha | Roles essenciais |
|---|---|
| GK | Goalkeeper, Sweeper Keeper |
| DEF central | Central Defender, Ball-Playing Defender |
| DEF lateral | Full-Back, Wing-Back, Inverted Full-Back |
| MID defensivo | Defensive Midfielder, Deep-Lying Playmaker, Anchor |
| MID central | Central Midfielder, Box-to-Box, Mezzala |
| MID ofensivo | Attacking Midfielder, Advanced Playmaker |
| Flanco | Winger, Inverted Winger |
| ATA | Advanced Forward, Target Man, Poacher, False Nine, Complete Forward |

### Coerência tática (crítico para dificuldade)
Um bom setup no FM tem **equilíbrio de duties** e **cobertura de espaço**. Combinações ruins têm penalidade emergente:
- Todos em Attack → sem ninguém pra Fase 5 → contra-ataques fatais.
- Dois playmakers pedindo a bola na mesma zona → conflito, perda de eficiência.
- Wing-Backs Attack dos dois lados sem volante de contenção → flancos abertos na transição.

Isso **não precisa ser proibido** — precisa ter **consequência natural** no motor. É assim que a tática vira habilidade do jogador, não checkbox.

---

## 3. Atributos ponderados por role (por que o mesmo jogador é bom e ruim)

**Nunca** use uma soma global de atributos. No FM cada role tem **key attributes** que valem muito mais que o resto. É isso que faz o mercado ter profundidade: um zagueiro com `passing` alto vale ouro como Ball-Playing e é irrelevante como Central Defender puro.

### Como calcular a "força efetiva" de um jogador numa role
```
forçaEfetiva(jogador, role, duty) =
    Σ (atributo_i × peso_i(role, duty))   // key attributes com peso alto
  + familiaridade_posicional(jogador, posição da role)  // jogar fora de posição penaliza forte
  × modificador_condição(fitness)
  × modificador_moral
  × modificador_forma
```

### Familiaridade posicional (o dado JÁ existe — falta o motor usar)
O `Player` já carrega `secondaryPositions: string[]` e `positionProficiency: Record<string, number>` (1-20 por posição). Não é peça que falta no modelo de dados; é peça que o motor ainda **ignora**. Consumir assim:
- Jogador na **posição natural** (proficiency alta) → 100%.
- Posição **secundária/aprendida** (proficiency média) → ~85–90%.
- Posição **estranha** (proficiency baixa; ex: atacante improvisado na zaga) → ~60–70% + decisões piores.

Isso torna o elenco *real*: você precisa de jogadores certos pras funções certas, não só "11 melhores overalls".

> **Pré-requisito de granularidade (bloqueia a Seção 4).** Hoje `position` é grosseiro: `GK/DEF/MID/FWD`. Zonas por corredor (E/C/D) e duelo de flanco exigem distinguir lateral-esquerdo de direito, ala de meia. Antes de qualquer duelo por zona é preciso: (a) posições granulares (DL/DC/DR/MC/AMR…) alimentando `positionProficiency`, e (b) um mapa **formação → coordenadas base** por jogador. Sem isso, "quem está na zona" não tem como ser derivado. Isso é Fase 1, não Fase 2.

### Atributos ocultos importam (você já tem `HiddenAttributes` — usar os nomes reais)
Campos que existem de fato em `HiddenAttributes` (confirme sempre no type antes de referenciar):
- `consistency` (1-5) — quão perto do teto o jogador joga a cada partida (baixa = imprevisível).
- `bigGameImportance` (1-5) — rende mais/menos em jogos grandes. *(não existe `importantMatches`/`bigGamePlayer`.)*
- `injuryProneness` (1-10) — já usado em lesão, também afeta risco sob carga na partida.
- `pressure`, `professionalism`, `temperament` (1-5) — modulam execução conforme contexto/placar.
- `dirtiness`, `temperament` (1-5) — modulam faltas e cartões (ligar à Seção 8).

Esses são o "tempero" que faz dois jogadores de mesmo CA se comportarem diferente. **Indispensáveis pro FM feel.**

---

## 4. Duelos individuais por zona (o fim da "força de time")

A partida é resolvida em **microduelos localizados**, não em choque de médias. A tática determina **onde** os duelos acontecem e **com que frequência**; os atributos determinam quem vence.

### Mapa de zonas
Divida o campo em zonas (mínimo 3 corredores × 3 terços = 9; ideal 5×6 = 30 como o FM). Cada ação acontece numa zona, e a resolução usa **quem está naquela zona dos dois times**.

### Exemplo de duelo de flanco (Fase 3)
```
Ataque pela direita:
  atacante = Winger deles (pace, dribbling, crossing, flair)
  defensor = seu Full-Back esquerdo (marking, pace, tackling, positioning)
  cobertura = seu volante/zagueiro mais próximo (depende da tática)

  P(ala vencer o duelo) = f(atributos do ala vs lateral, com cobertura como modificador)
  → se vence: cruzamento/entrada → Fase 3 continua
  → se perde: desarme → transição pro seu time (Fase 5)
```

### Overloads (superioridade numérica) — muito FM
A tática cria **superioridade em zonas**:
- Wing-Back + Winger + Mezzala pelo mesmo lado → 3 atacantes vs 2 defensores → o duelo pende fortemente pro ataque.
- Isso emerge das roles/duties, não de um número mágico. **É o núcleo da profundidade tática.**

> **Implicação:** o motor precisa saber, a cada lance, **quem está em cada zona** (derivado de formação + roles + duties + fase do jogo). Isso alimenta tanto a resolução quanto o relatório pós-jogo ("seu lateral perdeu 7 de 10 duelos contra o ponta deles").

---

## 5. Instruções de equipe — relacionais, nunca absolutas

Cada instrução é uma **aposta condicional**, com ganho e custo, cujo resultado depende do adversário.

| Instrução | Ganha contra | Perde contra | Custo |
|---|---|---|---|
| **Pressão alta** | Saída de bola ruim, jogadores lentos atrás | Boa saída de bola + ataque rápido | Fadiga acelerada; espaço nas costas |
| **Linha defensiva alta** | Ataque lento, sem profundidade | Atacante rápido (`pace`), bola nas costas | Vulnerabilidade a lançamento |
| **Linha baixa / bloco** | Time que depende de espaço | Time com bom passe entre linhas + chute de fora | Cede território e posse |
| **Tempo rápido / direto** | Defesa desorganizada, boa condição física | Defesa organizada, marcação forte | Menos controle, mais perda |
| **Tempo lento / posse** | Segurar resultado, controlar jogo | Bloco baixo paciente (não gera chance) | Poucas transições a favor |
| **Contra-ataque** | Time que sobe muito (ofensivo) | Time que fica atrás da linha da bola | Pouca posse; depende de recuperar |
| **Foco em flanco** | Adversário fraco naquele lado | Adversário forte/dobrando naquele lado | Previsibilidade |
| **Marcação individual** | Craque adversário isolado | Time coletivo, rotação de posição | Puxa marcador de posição |

**Regra de ouro:** nenhuma instrução é "boa" ou "ruim" em absoluto. Ela é **boa contra X e ruim contra Y**. Ler o adversário e ajustar = a habilidade central do FM.

### Mentalidade global (Very Defensive → Very Attacking)
Não é multiplicador de gols. Ela **desloca a régua de risco de todos os duties simultaneamente**: mais ofensiva = jogadores mais adiantados, passes mais arriscados, mais gente na Fase 3 — e **mais exposição na Fase 5**. É o dial mestre do trade-off ataque×risco.

---

## 6. Posse emergente (nunca um input)

No FM você **não seta posse**. Posse é o **resultado** de:
- Quem vence os duelos de construção (Fase 1) e progressão (Fase 2).
- Estilo (posse curta retém; direto cede posse mas ganha verticalidade).
- Placar e momentum (quem está ganhando e segurando tende a ter menos posse por escolha).

Um time pode ter 65% de posse e **perder** — se a posse for estéril (não fura o bloco) e o adversário for letal na transição. **Esse cenário precisa ser possível e frequente o bastante pra importar.** É o antídoto definitivo ao "melhor overall vence sempre".

---

## 7. Estado dinâmico da partida (a partida "viva")

O motor mantém e atualiza a cada minuto:

### Fadiga (você já tem — falta ligar à execução)
- Cai ao longo do jogo, mais rápido com pressão alta / tempo alto / mais corrida por role.
- **Reduz atributos efetivos** (pace, decisão, execução) progressivamente → o time cai de produção no fim.
- Torna **substituições decisivas** e o **gerenciamento de intensidade** uma escolha real.

### Momentum
- Sequência de bons lances / gol / grande defesa gera um estado temporário que melhora levemente a execução do time por alguns minutos (e piora do outro).
- Curto e decaindo — não é bola de neve infinita.

### Moral / confiança (você já tem)
- Moral alta → execução mais próxima do teto; moral baixa → mais erros, menos iniciativa.
- Gol sofrido abala; gol marcado levanta. `pressure` e `bigGamePlayer` modulam o quanto.

### Estado de placar (game management)
- Time ganhando pode recuar (a IA adversária deveria ajustar mentalidade **durante** o jogo, não só a cada 4 semanas).
- Time perdendo arrisca mais no fim → mais aberto → mais gols nos dois sentidos no fim de jogo (padrão real).

### Contexto da partida
- Casa/fora: vantagem de casa **variável** (torcida, `fanMood`, `mediaPressure`, importância do jogo) — não constante.
- Importância (clássico, decisão) → ativa `bigGameImportance` / `pressure`.

### Teto do estado dinâmico (senão vira caos, não realismo)
Fadiga, moral, momentum, casa e fase modulam execução **ao mesmo tempo**. Empilhados de forma multiplicativa, produzem outliers absurdos por sorte acumulada — exatamente o "modelo realista mal calibrado = caótico" que a Seção 12 alerta. **Princípio:** o swing combinado de todos os modificadores de estado sobre um duelo é somado e **limitado** (ex: `clamp(±0.15)`) antes de aplicar. A qualidade do jogador e o duelo tático dominam; o estado dinâmico tempera, nunca vira o jogo sozinho.

---

## 7.5. Inteligência tática da IA adversária (sem isto, o objetivo não existe)

Um motor perfeito não entrega o objetivo do projeto sozinho. A tese é *"tática importa tanto quanto talento"* — mas o jogador só sente isso se o **adversário controlado pela IA também joga tática**. Se a IA escala 11 overalls e nunca ajusta, o humano domina com um setup mediano e o desafio colapsa. **A competência tática da IA é tão decisiva quanto o motor.**

A IA precisa de três camadas:

1. **Montagem coerente (pré-jogo):** escolher formação, roles e duties que respeitem a coerência da Seção 2 (equilíbrio de duties, cobertura de espaço, sem dois playmakers na mesma zona). Escalar por `forçaEfetiva(jogador, role, duty)`, não por CA bruto.
2. **Leitura do adversário (pré e durante):** identificar o padrão do humano (flanco forte, bloco baixo, transição perigosa) e escolher a contraposição da matriz da Seção 5. É aqui que "ler o jogo" vira dificuldade real.
3. **Game management (durante):** ajustar mentalidade/instruções conforme placar, tempo e fadiga; substituir por fadiga/cartão/lesão (liga com a Seção 7). Ganhando aos 80' → recua; perdendo → arrisca.

**Níveis de competência** (dão dificuldade escalável e evitam que todo adversário seja gênio): a IA de um clube pequeno erra a coerência e não lê bem; a de um gigante monta e ajusta perto do ótimo. Modular por reputação/orçamento do clube.

> **Invariante próprio:** rodar humano-simulado com tática coerente vs. IA em cada nível deve produzir uma curva de dificuldade — a IA "elite" precisa vencer/empatar uma fração respeitável mesmo contra bom setup humano, senão o single-player é fácil demais.

---

## 8. Árbitro, faltas e cartões (você já tem base — refinar)

- Faltas emergem de duelos perdidos com agressividade/tackling ruim, não sorteio puro.
- Cartão como consequência de falta tática (parar contra-ataque = amarelo mais provável).
- Rigor do árbitro como variável leve por partida.
- Expulsão muda **estrutura**, não só "−1 força": o time precisa **reorganizar** (perde um setor), e a tática de quem tem a mais deveria poder explorar o espaço. Já existe `sentOff`; ligar à reorganização por zona.
- **Refinar o "ponytail" já anotado:** excluir expulso do sorteio de posse, não só penalizar força.
- **Lesão dentro do jogo (hoje é sorteio de temporada — mover pra cá).** O type já prevê `injury.source: 'match'`, mas a lesão hoje é gerada fora da partida. Deve **emergir** de desarme duro, choque aéreo, fadiga acumulada e `injuryProneness`/`dirtiness` do envolvido — forçando substituição real e conectando tática agressiva a consequência. `dirtiness` alto também eleva a chance de cartão e de lesionar o adversário.

---

## 9. Bolas paradas (você já tem `SetPiecesConfig` — integrar aos duelos)

- Escanteio/falta = **disputa aérea concentrada**: `heading` + `jumping` + `strength` dos atacantes vs zagueiros + `aerialReach`/`commandOfArea`/`punching` do goleiro.
- Cobrador importa (`crossing`/`freeKicks`/`corners`).
- Marcação (individual/zonal/mista) da config defensiva deve alterar a resolução.
- Pênalti: `penaltyTaking`/`composure` vs `reflexes`/`oneOnOnes` + fator psicológico (`pressure`, placar).
- Bola parada deve ser uma **rota real de gol** (~25-30% dos gols no futebol real), especialmente decisiva em jogos travados (Fase defensiva vs defensiva).

---

## 10. Saídas de dados para o relatório pós-jogo

Como o motor agora resolve fases e duelos, ele **naturalmente** produz dados ricos que o `PostMatchReport` hoje não consegue gerar. Rastrear e expor:

- Duelos por jogador (ganhos/perdidos) e por zona → "seu lateral-direito perdeu 7 de 10 duelos".
- xG acumulado por time e por chance (qualidade separada de volume).
- Chances por fase/origem (lateral vs centro vs bola parada vs transição).
- Eficácia da pressão (perdas forçadas no campo adversário) e seu custo (fadiga, espaço cedido).
- Momento de queda de rendimento (fadiga) — "caiu de produção após 70'".
- Mapa de calor real (já existe estrutura de 9 zonas — agora com dados verdadeiros).
- Comentário do assistente **acionável** (igual FM): "o meio deles teve superioridade numérica; considere um volante a mais".

---

## 11. Determinismo e replay (preservar o que já funciona)

- Todo o motor continua usando `_matchRng()` (mulberry32) com `seed`/`rngState` — **nenhuma** chamada a `Math.random()` direta.
- Mesma seed + mesmas táticas = mesma partida (replay, testes, online autoritário).
- Continua sendo `simulateMinute` chamado 90× a partir de `simulateFullMatch`/`initLiveMatchState`.
- Estado da partida (fase, posse, momentum, fadiga, duelos) entra no `LiveMatchState` serializável.

### Previsão e jogo têm de usar o MESMO motor
Hoje `preMatchAnalysis` roda `simulateMatchResult` (modelo Poisson rápido) N× pra estimar odds, enquanto a partida real roda o tick engine. São **modelos diferentes** → as probabilidades mostradas ao jogador já divergem do que o motor produz, e ao migrar pra fases/duelos a divergência **piora**. Regra: a previsão roda o próprio motor de fases (com seeds variadas), ou uma **redução calibrada travada por teste** contra as médias do motor completo. Odds que não batem com a realidade do jogo são pior que não ter odds.

---

## 12. Balanceamento — a parte que faz ou quebra tudo

Um modelo realista mal calibrado é **caótico**, não realista. O FM tem 20+ anos de tuning. Sua vantagem: `headless_sim.ts` + `run_batch.py`. **Nenhuma fase é "concluída" sem passar pelos invariantes.**

### Invariantes-alvo (validar via simulação em massa — centenas de temporadas)
| Métrica | Alvo realista |
|---|---|
| Gols por jogo | ~2.5 – 2.9 |
| % vitória do mandante | ~45–48% |
| % empates | ~24–28% |
| Pontos do campeão (38 rodadas) | ~75–88 |
| Distribuição de gols por jogo | Poisson-like (0 e 1 gol comuns; 5+ raro) |
| % gols de bola parada | ~25–30% |
| % gols de contra-ataque | relevante (>10%) |
| **Upset rate** (time pior tática/setup vence melhor overall) | **frequente o bastante pra tática importar — alvo a definir, ex: 25–35% dos confrontos "melhor overall vs melhor tática"** |
| **Performance — 1 partida (90')** | orçamento explícito (ex: < 50 ms) |
| **Performance — 1 rodada de liga (N partidas de fundo)** | orçamento explícito (ex: < 1 s) |

### Orçamento de performance (invariante esquecido que quebra a UX)
Duelos por zona + roles por tick é **ordens de magnitude mais caro** que a força agregada de hoje, e roda pra **liga inteira toda semana** + **N× na previsão** (Seção 11). Sem teto, uma rodada trava a UI. Solução de duas velocidades:
- **Caminho completo** (fases/duelos/relatório rico): só a partida do usuário e jogos-chave visíveis.
- **Caminho rápido** (modelo agregado calibrado a bater as mesmas médias): partidas de fundo da liga e as N sims de previsão.
Perf é invariante como qualquer outro: medir no `run_batch.py`, não descobrir no lag.

### O teste que prova o objetivo do projeto
> Rodar N partidas: **Time A** (overall alto, tática incoerente/mal ajustada) vs **Time B** (overall médio, tática coerente e bem contraposta). Se B vencer uma fração significativa (ex: ≥30–40%), o motor cumpre o objetivo: **tática importa tanto quanto talento.** Se A vencer quase sempre, o motor ainda está "score-based" disfarçado.
>
> **Operacionalizar (senão é teste no olho):** defina no harness 2-3 **setups táticos de referência fixos** — um coerente (`REF_COESO`) e um incoerente (`REF_INCOERENTE`, ex: todos em Attack, dois playmakers na mesma zona) — e um **gap de força fixo** (ex: A = 130% da força de B). O teste vira reproduzível: `winRate(B_coeso vs A_incoerente_mais_forte) ≥ alvo`. Sem constantes fixas, o número oscila e não prova nada.

### Ferramenta de tuning
- Estender `headless_sim.ts` para logar as métricas acima por temporada.
- `run_batch.py` roda 30–100× e gera relatório com médias e variância.
- Cada constante do motor (BASE, pesos de duelo, custo de fadiga da pressão, etc.) é ajustada olhando o efeito nos invariantes, não no "achismo".

---

## 13. Ordem de implementação (fases testáveis, sem quebrar o jogo)

> **Estratégia de migração — strangler, não big-bang (crítico).** O motor atual tem 2488 linhas já calibradas (~2.7 gols/jogo, testes passando). As Fases 2-3 abaixo **substituem o núcleo** — big-bang aqui deixa o jogo pior e desbalanceado por semanas. Em vez disso: construir o motor novo **atrás de uma flag** (`ENGINE=v2`), manter o v1 vivo, rodar os dois no `headless_sim.ts` sobre os mesmos confrontos+seeds e **comparar invariantes lado a lado**. Só promover v2 quando ele bater as metas da Seção 12 igual ou melhor que v1. A flag é a rede de segurança que torna "sem quebrar o jogo" verdade, não aspiração.

Cada fase entrega algo funcional e é validada antes da próxima. **Toda fase abaixo passa pelo "Gate dos 3 pilares" (Seção 0.5): (A) roda atrás da flag `v2` com v1 intacto; (B) passa o benchmark de perf; (C) a IA adversária sabe usar o que foi adicionado.** Fase que viola um pilar não está pronta.

> **Já implementado (não refazer, apenas preservar):** determinismo mulberry32 (`seed`/`rngState` no `LiveMatchState`, Seção 11) e lesão emergindo do jogo (`generateInjuryForPlayer` + `matchInjuries`, Seção 8) **já existem** no motor atual. As fases abaixo tratam do que falta: roles→comportamento, zonas, fases, transição, instruções relacionais, estado dinâmico, IA e balanceamento.

1. **Fundação — Roles & Atributos por função.** Tabela de roles com key attributes + familiaridade posicional + `forçaEfetiva(jogador, role, duty)`. Ainda no modelo de força, mas já ponderado por role. *Teste: mesmo jogador rende diferente em funções diferentes.*
2. **Zonas & Duelos.** Introduzir resolução por microduelo em zona no lugar da força agregada. *Teste: lateral fraco vs ponta forte gera exploração localizada mensurável.*
3. **As 5 fases.** Reescrever o fluxo do lance dentro de `simulateMinute` como progressão por fases com gargalos distintos. *Teste: "domino posse mas não crio" e "parking the bus" passam a acontecer.*
4. **Transição / contra-ataque.** Fase 5 como estado próprio; exposição ligada à mentalidade. *Teste: time inferior retraído vence superior ofensivo numa fração realista.*
5. **Instruções relacionais.** Matriz de apostas condicionais (seção 5); mentalidade como régua de risco. *Teste: mesma instrução ganha contra um estilo e perde contra outro.*
6. **Estado dinâmico.** Fadiga→execução, momentum, moral, game management, casa variável. *Teste: queda de produção no fim; substituições importam.*
7. **Bola parada & árbitro** integrados aos duelos.
8. **Saídas do relatório** pós-jogo com dados de fase/duelo.
9. **Balanceamento** contínuo em cada fase + passe final de tuning nos invariantes.

---

## 14. Checklist "não pode faltar" (resumo de uma olhada)

- [ ] Motor event-based (placar emergente, nunca sorteado de força)
- [ ] Tudo relacional (efeito depende do adversário, não do próprio time)
- [ ] 5 fases com gargalos e duelos distintos
- [ ] Volume de chance **separado** de qualidade de chance (xG)
- [ ] Roles com comportamento real + Duties como régua de risco
- [ ] Key attributes por role (fim da soma global)
- [ ] Familiaridade posicional consumida pelo motor (`positionProficiency`/`secondaryPositions` já existem)
- [ ] Posições granulares (E/C/D + altura) + mapa formação→coordenadas (pré-requisito das zonas)
- [ ] Atributos ocultos afetando execução (consistency, pressure, bigGamePlayer…)
- [ ] Duelos individuais por zona + overloads (superioridade numérica)
- [ ] Instruções como apostas condicionais (ganha contra X, perde contra Y)
- [ ] Mentalidade como deslocamento de risco (com custo na transição)
- [ ] Posse emergente (nunca input); posse estéril possível
- [ ] Transição/contra-ataque como fase própria e decisiva
- [ ] Fadiga ligada à execução em tempo real
- [ ] Momentum e moral afetando execução minuto a minuto
- [ ] Teto do swing combinado do estado dinâmico (não empilhar modificadores)
- [ ] IA adversária: montagem coerente + leitura + game management, com níveis de competência
- [ ] Game management (IA muda mentalidade durante o jogo)
- [ ] Vantagem de casa variável (torcida/moral/importância)
- [ ] Bola parada como rota real de gol, integrada a duelos aéreos
- [ ] Árbitro/cartões/expulsão com reorganização estrutural
- [ ] Lesão emergindo do jogo (`injury.source: 'match'`), ligada a desarme/fadiga/`dirtiness`
- [ ] Determinismo preservado (mulberry32, seed, replay)
- [ ] Previsão pré-jogo usa o mesmo motor (ou redução calibrada travada por teste)
- [ ] Orçamento de performance (caminho rápido p/ liga+previsão, completo p/ jogo do usuário)
- [ ] Migração strangler atrás de flag (v1 vs v2 comparados no headless)
- [ ] Harness de balanceamento com invariantes validados em massa
- [ ] Teste de upset operacionalizado (setups de referência + gap fixos)
- [ ] Relatório pós-jogo com dados de fase e duelo (acionável)

---

**Regra final:** se em qualquer ponto o motor puder ser resumido a "quem tem o maior número ganha", ele regrediu. O sucesso é medido pela pergunta: *"um treinador esperto com um time médio consegue, com frequência, bater um time melhor mal treinado?"* Se sim, você tem um FM. Se não, ainda é uma calculadora de força.