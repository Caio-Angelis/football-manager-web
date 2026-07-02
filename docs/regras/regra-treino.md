# Regras de Treino

## Plano Semanal

O usuário define um plano de treino semanal em uma grade de **7 dias × 3 períodos** (Manhã, Tarde, Noite). Até 21 sessões por semana.

---

## Tipos de Treino

| Tipo | Efeitos | Fadiga | Carga |
|------|---------|--------|-------|
| **Físico** | Melhora resistência e velocidade | Alta (-8 condição) | +8 por sessão |
| **Técnico** | Melhora passe, técnica e finalização | Moderada (-3 condição) | -4 por sessão |
| **Coesão** | Aumenta moral do jogador (+5) | Baixa (-2 condição) | -2 por sessão |
| **Médico/Recuperação** | Restaura condição física (+10), reduz carga, acelera recuperação de lesão (-2 dias) | — | -10 por sessão |
| **Leve** | Recuperação leve (+3 condição) | — | -5 por sessão |

---

## Progressão de Atributos e CA

A cada semana, o treino é aplicado a todos os jogadores **não-lesionados** dentro do `set()` batched de `advanceWeek`.

### Ganho de Atributos

- Melhoria aleatória de **0.2 a 1.0 pontos** por atributo afetado por sessão (`Math.random() * 0.8 + 0.2`)
- Limitado a **20** (teto da escala)

### Cálculo do CA (Current Ability)

Após cada sessão de treino, o CA é recalculado com base no ganho de atributos, modulado por um **fator de idade**:

| Idade | Fator | Descrição |
|-------|-------|-----------|
| < 21 anos | ×1.5 | Jovens evoluem 50% mais rápido |
| 21-23 anos | ×1.2 | Evolução acelerada |
| 24-27 anos | ×0.8 | Evolução moderada |
| 28-30 anos | ×0.4 | Evolução lenta |
| 31+ anos | ×0.1 | Praticamente estagnado |

**Fórmula:**
```
CA_novo = min(potentialAbility, 200, CA_anterior + (improvement × 0.5) × ageFactor)
```

O CA **respeita o teto de PA** (Potential Ability) do jogador.

### Fator de Moral

O CA também pode **diminuir** baseado na moral:
- Moral < 30: fator -0.5 (perde CA)
- Moral < 50: fator 0 (neutro)
- Moral ≥ 50: fator 1 (ganho normal)

Combinado com `ageFactor`, jogadores velhos com baixa moral perdem CA.

### Snapshots Semanais

Snapshots registram a progressão de atributos para visualização (limitado a 20 snapshots).

---

## Fadiga e Carga

### Carga Acumulada

| Treino | Efeito na Carga |
|--------|-----------------|
| Físico | +8 por sessão |
| Técnico | -4 por sessão |
| Coesão | -2 por sessão |
| Médico/Recuperação | -10 por sessão |
| Leve | -5 por sessão |

### Condição Física

| Treino | Efeito na Condição |
|--------|---------------------|
| Físico | -8 |
| Técnico | -3 |
| Coesão | -2 |
| Médico/Recuperação | +10 |
| Leve | +3 |

### Dias Físicos Consecutivos

Treinar físico em dias seguidos aumenta **exponencialmente** o risco de lesão.

---

## Decaimento Semanal de Fadiga

A cada avanço de semana, `applyFatigueDecayToPlayer` aplica recuperação natural:

| Atributo | Efeito |
|----------|--------|
| Condição física | +5 (recuperação durante descanso) |
| Carga acumulada | -5 |
| Dias físicos consecutivos | -1 |
| Recovery needed | Limpo se fitness > 30 e carga ≤ 20 |

Esta lógica é centralizada no helper `applyFatigueDecayToPlayer` (em `backend/src/store/helpers/injury.ts`), usado tanto por `advanceWeek` quanto por `applyFatigueDecay`.

---

## Recuperação por Treino

- Sessões **médico/recuperação** reduzem `daysRemaining` da lesão em **2 dias** (via `reduceInjuryFromRecoveryTraining`).
- Sessões médico no `applyPreventionSession` reduzem em **3 dias**.

---

## Ritmo de Evolução (Pacing)

### Estado Atual

O ganho de atributos por sessão é de 0.2 a 1.0 pontos. Com até 21 sessões por semana, um jogador pode ganhar até ~21 pontos em um único atributo por semana — **extremamente acelerado** em comparação com a realidade.

### Problemas

- O ritmo atual é ~20x mais rápido que a realidade
- Jogadores jovens atingem o teto (20) rapidamente, eliminando a progressão como mecânica de longo prazo
- Com apenas 3 temporadas (114 semanas), o sistema de base juvenil praticamente não dá retorno dentro da vida útil do save
