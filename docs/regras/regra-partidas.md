# Regras de Partidas

## Partida do Usuário vs. Partidas da IA

- **Partidas do usuário:** Ficam **pendentes** a cada rodada. O usuário pode jogá-las ao vivo no Centro de Partidas, com visualização 2D em tempo real (campo com discos representando os 22 jogadores, bola animada, placar ao vivo). Se o usuário avançar a semana sem jogar, a partida é **auto-finalizada** na próxima rodada usando o motor de simulação.
- **Partidas dos outros times:** São **simuladas automaticamente** quando o usuário avança a semana. O resultado é calculado instantaneamente e aplicado à classificação.

### Bloqueio por Lesão

Se houver um jogador lesionado (`injury.active`) no XI titular do time do usuário, a partida **não pode iniciar** nem ser auto-simulada. Tanto `simulateMatch` quanto `advanceWeek` verificam o XI titular e bloqueiam a execução, definindo `matchBlockMessage` no estado global. Um modal centralizado é exibido com a mensagem "Partida não pode iniciar: (nome do jogador) lesionado". O usuário deve substituir o jogador lesionado no XI antes de prosseguir.

---

## Motor de Simulação (Passo a Passo)

Todas as partidas usam o mesmo motor de simulação **minuto a minuto**, com cada minuto gerando ações individuais (passe, drible, chute, desarme, interceptação).

### 1. Posse Inicial

Determinada pela qualidade de passe dos titulares. O time com melhor média de passe tem mais chance de começar com a bola.

### 2. Ações por Minuto

A cada minuto, o portador da bola decide entre três ações:

- **Chutar:** Quanto mais perto do gol adversário, maior a probabilidade. A chance de gol depende de finalização, técnica, compostura do atacante vs. reflexos, posicionamento e concentração do goleiro. Chutes de longe são menos precisos; chutes de perto são mais difíceis de defender.
- **Driblar:** Mais provável quando sob pressão defensiva. Sucesso depende de drible, técnica, agilidade, velocidade do atacante vs. desarme, marcação, força e antecipação do defensor.
- **Passar:** Ação mais comum. Sucesso depende de passe, técnica, compostura, visão e decisões do passador, além do primeiro toque do receptor. A pressão defensiva reduz a precisão. Passes curtos aumentam a precisão; passes diretos reduzem.

### 3. Posição da Bola

A bola se move no campo (0 = gol de casa, 1 = gol de visitante). Pases e dribles bem-sucedidos avançam a bola. Erros causam interceptação ou bola solta.

### 4. Cruzamentos

Ocorrem ocasionalmente quando a bola está na ponta do ataque. O sucesso depende do atributo de cruzamento do jogador.

### 5. Faltas e Cartões

- Após um desarme, há **25% de chance** de falta.
- **15% de chance** de cartão amarelo se houver falta.
- Faltas em zona perigosa (>65% do campo de ataque) disparam cobrança de falta com `simulateFreeKick`.
- Faltas na área (**8% chance**) resultam em pênalti via `simulatePenalty`.

**Sistema de cartões em `simulateMinute`:**
- Faltas esparsas (~12%/min)
- Faltas em drible geram cartões via `bookOffender()`
- Amarelo acumula por jogador; 2º amarelo ou vermelho direto (~1.2%) expulsam
- Time com jogador expulso sofre penalidade real de força no minuto
- Cadência realista: ~2.2 amarelos, ~0.33 vermelhos por jogo

### 6. Escanteios

Após defesa do goleiro (20% chance) ou chute para fora na zona de ataque (35% chance), dispara `simulateCornerKick` com cobrança configurável.

### 7. Laterais

5% de chance por minuto de lateral, cobrado pelo estilo configurado (curto, longo, rápido).

---

## Bônus Tático e Multiplicadores de Tática

### Bônus Tático Base (`getTacticalBonus`)

- Tática `attacking`: +4% de bônus base
- Tática `defensive`: +8% de bônus base
- **Mentalidade ofensiva:** +5%; mentalidade defensiva: +4%
- **Contra-pressionamento:** +3%; contra-ataque: +4%
- **Linha alta/linha de engajamento alta:** +2% a +3%
- **Pressão alta:** +3%; desarme agressivo: +2%
- **Ritmo rápido:** +3%; passes curtos: +2%
- **Levar bola à área:** +2%; armadilha de impedimento: +1%

### Multiplicadores de Força por Tática (aplicados após o bônus)

| Tática | Ataque | Defesa | Característica |
|--------|--------|--------|----------------|
| Attacking | ×1.12 | ×0.85 | Forte ofensivamente, fraco defensivamente |
| Balanced | ×0.88 | ×0.88 | Penalidade em ambos para compensar flexibilidade |
| Defensive | ×0.88 | ×1.20 | Fraco ofensivamente, forte defensivamente |

A pressão defensiva sobre o portador também é afetada pela intensidade de pressão, contra-pressionamento e linha de engajamento do time defensor.

---

## Modelo de Gols Esperados (xG) + Poisson

Usado internamente em `simulateMatchResult` (simulação rápida) e como componente de probabilidade:

- **Força ofensiva e defensiva** separadas por posição (FWD/MID/DEF/GK), ponderadas por forma e condição física
- **Gols esperados (λ):** `BASE_GOALS × (ataque / defesa adversária)^1.15 × vantagem de casa (1.12)` — `BASE_GOALS = 2.2`
- **Amostragem de Poisson** (Knuth's algorithm) para o número de gols de cada time
- **Autor do gol** ponderado por finalização + posição (FWD peso 3.2, MID 1.5, DEF 0.45, GK 0.02)
- **Assistências** atribuídas por passe/visão/cruzamento, priorizando meias (~62% dos gols têm assistência)
- **Estatísticas coerentes** (chutes, no alvo, posse, passes, xG) derivadas dos lambdas e gols
- **Vantagem de jogar em casa:** +12% (HOME_ADVANTAGE = 1.12)

---

## Bolas Paradas (Set Pieces)

O sistema é totalmente configurável na aba **Set pieces** da tela de Táticas e tem efeito direto na simulação.

### Ataque

**Escanteios** — 5 tipos de cobrança:
- **1º Poste:** Mais preciso, chance alta
- **2º Poste:** Mais arriscado, chance menor
- **Área:** Equilibrado
- **Curto:** Posse segura, baixa chance de gol
- **Borda:** Chute de fora da área
- Cobrador selecionado por `crossing`; alvo/cabeçador por `heading` + `jumping`
- Auto-seleção do melhor atributo se não houver jogador designado

**Faltas** — 4 tipos:
- **Tiro Direto:** Chance de gol baseada em `freeKicks` + `technique` + `finishing` + `longShots` + `composure` vs. `reflexes` + `positioning` do goleiro, modificado pela barreira. Distância afeta precisão.
- **Cruzamento:** Bola na área para o melhor cabeçador
- **Curto:** Posse
- **Bola Longa:** Bola longa na área

**Laterais** — 3 estilos: Curto (posse), Longo (bola na área), Rápido (contra-ataque)

**Pênaltis:**
- Cobrador designado por `finishing` + `composure`
- Conversão base ~76%, modificada por atributos do cobrador vs. goleiro (`reflexes` + `oneOnOne`)
- Range: 55%-92%

### Defesa

**Escanteios defensivos:**
- Marcação Individual: +15% eficiência
- Zonal: base
- Misto: +8%
- Opção de Contra-ataque: 60% chance de sair rápido após afastar a bola, mas -3% na chance de criar chance adversária

**Faltas defensivas:**
- Marcação Individual: +10%
- Zonal: base
- Misto: +5%
- Barreira Pequena: +15% chance de gol adversário
- Barreira Média: neutro
- Barreira Grande: -15% chance de gol adversário

### Integração no Motor

- `simulateMatchResult`: bônus de set pieces adicionado ao lambda — `setPieceStrength(attack) - setPieceStrength(defense)`, clamp -0.15 a +0.25
- `simulateMinute`: escanteios após defesa (20%) ou chute fora (35% no ataque); faltas em zona perigosa (>65%); pênaltis (8% na área); laterais (5% por minuto)
- Atributos relevantes: `crossing`, `heading`, `jumping`, `freeKicks`, `finishing`, `composure`, `technique`, `longShots`, `marking`, `commandOfArea`, `aerialReach`, `reflexes`, `oneOnOne`, `positioning`

---

## Centro de Inteligência Pré-Jogo (Pre-Match Intelligence Center)

Análise preditiva que roda **500 simulações Monte Carlo** usando `simulateMatchResult`:

- **Probabilidade de resultado:** % de vitória casa, empate, vitória fora
- **Placar mais provável:** resultado com maior frequência nas 500 simulações
- **Gols esperados (xG):** média de gols por time arredondada
- **Força dos times:** `calculateTeamStrength` para casa e fora
- **Duelos decisivos:** comparações diretas entre melhores jogadores por posição:
  - Atacante (casa) vs Defensor (fora)
  - Meio-campo (casa) vs Meio-campo (fora)
  - Goleiro (casa) vs Atacante (fora)
  - Defensor (casa) vs Contra-atacante (fora)
  - Vantagem indicada quando diferença de rating > 5 pontos
- **Forma recente:** últimos 5 jogos (V/E/D) com pontuação (V=3, E=1, D=0)
- **Recomendação tática:** mentalidade sugerida (Ofensivo, Defensivo, Equilibrado, Cauteloso, Positivo) com abordagem tática, justificativa e nível de risco
- **Nível de confiança:** maior probabilidade entre os três resultados

---

## Intervenções do Usuário em Partida Ao Vivo

### Substituições

- Máximo de **5 por partida** por time.
- Troca real: outId ↔ inId no startingXI do usuário; efeito imediato pois o motor lê `state.teams` por minuto.

### Gritos (Shouts)

O usuário pode dar instruções que aplicam um bônus temporário ao seu time:
- **Encourage (encorajar):** moral +, boost de intervenção
- **Demand (exigir):** moral +, boost maior
- **Praise (elogiar):** moral +
- **Calm (acalmar):** moral estabiliza
- Efeito: mais chance de chutar e driblar, menos pressão sentida. O time adversário com boost exerce mais pressão.

### Intervalo (Half-Time)

Gerenciado no frontend: pausa o loop aos 45' até o técnico iniciar o 2º tempo.

---

## Avaliação de Jogadores por Partida

Ao final de cada partida, todos os 22 titulares recebem uma nota (4.0 a 10.0) baseada em:

- **Gols marcados:** +1.15 por gol
- **Assistências:** +0.65 por assistência
- **Goleiros:** +1.0 por clean sheet; -0.4 por gol sofrido
- **Zagueiros:** +0.6 por clean sheet; -0.22 por gol sofrido; +bônus por desarmes e interceptações
- **Meias:** +bônus por gols do time e precisão de passe
- **Atacantes:** +bônus por gols do time; -0.4 se não marcar nenhum gol
- **Vitória:** +0.4; **Derrota:** -0.35
- **Forma e condição física** influenciam a nota
- **Teto de qualidade** baseado na habilidade atual (CA) do jogador, com exceção para quem marca 2+ gols (teto mínimo de 9.5)

O melhor jogador da partida é destacado como "Melhor em Campo".

---

## Relatório Pós-Partida

Gerado para todas as partidas (ao vivo ou simuladas):

- **Mapa de calor:** Grid 3×3 (defesa/meio/ataque × esquerda/centro/direita) mostrando a distribuição de ações de cada time, com intensidade visual (4 níveis).
- **Insights táticos:** Observações positivas, negativas e neutras sobre o desempenho de cada time (ex: domínio de posse, eficiência ofensiva, fragilidade defensiva).
- **Comentários do assistente:** Conselhos táticos, sobre jogadores e formação.
- **Breakdown de passes:** Passes certos vs. errados por time.
- **Zonas de ataque:** Distribuição de ações ofensivas por flanco (esquerda/centro/direita).

---

## Estatísticas de Partida

A partida gera estatísticas coerentes em tempo real:
- **xG (Gols Esperados):** Acumulado a cada chute, baseado na posição da bola e finalização do atacante
- **Posse de bola:** Calculada pela proporção de ações de cada time
- **Chutes e chutes no alvo:** Contabilizados em tempo real
- **Passes e precisão de passe:** Contabilizados por time
- **Eventos:** Gols, defesas, escanteios, faltas, cartões, pênaltis e laterais, ordenados por minuto

---

## Visualização 2D de Partidas

### Campo e Jogadores

- Campo 2D com discos coloridos representando os 22 jogadores titulares
- Cores dos times derivadas deterministicamente do nome do clube (hash → hue), com correção se cores iguais
- Time da casa ataca para a direita; visitante para a esquerda

### Movimento Dinâmico (5 Camadas)

A cada "tick" da bola (~700ms), os 22 jogadores recalculam suas posições:

1. **Shift de bloco:** Toda a equipe avança (atacando) ou recua (defendendo) proporcional ao progresso da bola
2. **Comportamento individual por posição:** GK acompanha a bola lateralmente; laterais sobem no ataque; meias cobrem todo o meio-campo; atacantes fazem runs diagonais
3. **Pressing:** Jogador mais próximo da bola persegue ativamente (50-55% da distância); segundo mais próximo faz cobertura (25%)
4. **Espaçamento:** Jogadores não-envolvidos se abrem para o lado oposto da bola
5. **Limites por posição:** GK restrito à área (1-14%); DEF até meio-campo (5-60%); MID quase todo o campo (18-82%); FWD de meio-campo ao gol adversário (30-95%)
6. **Micro-jitter:** Movimento natural aleatório de ±2%

### Celebração de Gols

Bola corre para o gol, jogadores do time atacante avançam, disco do autor pisca em dourado, letreiro "GOL!" com nome. Ao fim da celebração, todos voltam às posições base.
