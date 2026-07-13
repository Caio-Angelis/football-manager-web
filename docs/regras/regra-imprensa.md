# Regras de Coletiva de Imprensa

## Visão Geral

O treinador pode participar de coletivas de imprensa antes e depois das partidas. As respostas dadas aos jornalistas afetam a moral do elenco, a satisfação da diretoria, o humor da torcida e a pressão midiática.

---

## Tipos de Coletiva

| Tipo | Quando | Foco |
|------|--------|------|
| **Pré-jogo** | Antes de cada partida do usuário | Adversário, táticas, forma do time, expectativas |
| **Pós-jogo** | Após a partida | Resultado, desempenho, polêmicas, controvérsias |
| **Geral** | Sem contexto de partida | Transferências, diretoria, objetivos da temporada |

---

## Perguntas

Cada coletiva gera **3-4 perguntas** contextualizadas, sorteadas de um banco de templates.

### Categorias

| Categoria | Descrição |
|-----------|-----------|
| `match_preview` / `match_review` | Expectativas e análise do jogo |
| `transfer` | Mercado de transferências |
| `player_form` | Forma de jogadores específicos (referencia um jogador do elenco) |
| `tactics` | Escolhas táticas e esquema de jogo |
| `board` | Relação com a diretoria |
| `rivalry` | Rivalidades e clássicos |
| `injury` | Lesões no elenco |
| `season_goals` | Objetivos da temporada |
| `controversy` | Situações polêmicas (arbitragem, vestiário) |

### Tom da Pergunta

Cada pergunta tem um **tom** que influencia como os efeitos são calculados:
- Agressivo
- Neutro
- Amigável
- Provocativo

O tom é determinado pelo perfil do jornalista (cada um tem um bias) e pelo template da pergunta.

---

## Respostas

O treinador escolhe uma resposta entre 5 tons possíveis, cada um com 3 variantes de texto:

| Tom | Moral | Torcida | Diretoria | Mídia |
|-----|-------|---------|-----------|-------|
| **Elogiar (praise)** | +3 | +2 | +1 | -1 |
| **Defensivo (defensive)** | 0 | -1 | 0 | +1 |
| **Crítico (critical)** | -4 | -2 | +1 | +3 |
| **Diplomático (diplomatic)** | +1 | +1 | +2 | -2 |
| **Desviar (deflect)** | -1 | -2 | -1 | +2 |

---

## Modificadores Contextuais

| Situação | Modificador |
|-----------|-------------|
| Crítico a pergunta agressiva/provocativa | +2 pressão midiática, -1 humor da torcida |
| Diplomático a pergunta agressiva | -1 pressão midiática, +1 diretoria |
| Evasivo a pergunta agressiva | +2 pressão midiática |
| Elogiar em resposta a pergunta amigável | +2 moral extra, +1 humor da torcida |
| Elogiar jogador específico (player_form) | +2 moral extra para aquele jogador (isolado) |
| Criticar jogador específico (player_form) | -3 moral extra para aquele jogador (isolado) |
| Postura firme em clássico (rivalry: elogiar/crítico) | +2 humor da torcida |
| Diplomático em pergunta sobre diretoria (board) | +2 diretoria extra |
| Crítico em pergunta sobre diretoria (board) | -3 diretoria |
| Crítico em pergunta de controvérsia | +3 pressão midiática, +1 humor da torcida |
| Evasivo em pergunta de controvérsia | +1 pressão midiática |

---

## Efeitos Totais

- Os efeitos de cada resposta são **somados e limitados a ±10** por coletiva.
- Ao concluir, uma **manchete** é gerada automaticamente baseada no tom geral das respostas.
- A **satisfação da diretoria** (`boardSatisfaction`) é clampada no range **-100 a 100** (não 0-100).

---

## Pular Coletiva

Pular uma coletiva gera **+3 de pressão midiática** (a mídia interpreta como falta de transparência).

---

## Humor da Torcida (Fan Mood)

- Valor de **0 a 100** (50 = neutro)
- **Sentimentos:**

| Range | Sentimento |
|-------|------------|
| 85+ | Eufórica |
| 70+ | Feliz |
| 55+ | Satisfeita |
| 45+ | Neutra |
| 30+ | Preocupada |
| 15+ | Irritada |
| < 15 | Furiosa |

- **Tendência:** subindo, estável, caindo

### Decaimento Semanal

Resultados recentes afetam o humor:

| Resultado | Efeito |
|-----------|--------|
| 3+ vitórias | +3 |
| 2 vitórias | +1 |
| 3+ derrotas | -5 |
| 2 derrotas | -2 |

**Regressão à média:** > 70: -1; < 30: +2

### Impacto Financeiro

- Torcida feliz: aumenta receita de bilheteria em até **+20%**
- Torcida brava: reduz receita de bilheteria em até **-15%**
- Calculado por `getFanMoodRevenueModifier`

---

## Pressão Midiática (Media Pressure)

- Valor de **0 a 100** (**20 = inicial**)
- **Níveis:**

| Range | Nível |
|-------|-------|
| < 25 | Baixa |
| 25-49 | Moderada |
| 50-74 | Alta |
| 75+ | Intensa |

- **Valor inicial do jogo:** 20 (baixa)

### Decaimento Semanal

- **-2 por semana** (a pressão diminui naturalmente sem novos incidentes)

### Impacto no Desempenho

| Nível | Modificador de Força |
|-------|---------------------|
| Intensa (75+) | -5% na força do time |
| Alta (50-74) | -3% |
| Moderada (25-49) | -1% |

Calculado por `getMediaPressurePerformanceModifier`.

---

## Integração com advanceWeek

A cada avanço de semana, `processWeeklyPressDecay` é chamado ao final do processamento para:
1. Atualizar o humor da torcida (baseado na forma recente)
2. Reduzir a pressão midiática (-2)
