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

- Ganho base por sessão: **0.05 a 0.25** (`Math.random() * 0.2 + 0.05`)
- Multiplicado pela **curva de idade** (aplica-se aos atributos e ao CA)
- Limitado a **20** (teto da escala)

### Curva de Idade (multiplicador definitivo)

| Idade | Multiplicador | Descrição |
|-------|---------------|-----------|
| Sub-21 (< 22) | ×2.0 | Evolução acelerada — CA/atributos visíveis em ~4–6 semanas de foco |
| 22–28 (auge) | ×0.45 | Atributos estáveis, ganho lento; foco em manter forma |
| 29–30 | ×0.2 | Transição |
| 31+ | ×0.1 | Quase estagnado no treino |

**Fórmula:**
```
improvement = baseGain(0.05–0.25) × ageMult
CA_novo = min(potentialAbility, 200, CA_anterior + improvement × 0.5 × moraleFactor)
```

O CA **respeita o teto de PA** (Potential Ability) do jogador.

### Declínio físico mensal (31+)

A cada 4 semanas (`newWeek % 4 === 0`), jogadores com **31+ anos** perdem **0.1–0.3** em Velocidade e Resistência (e leve queda de aceleração/CA), **exceto** se o foco semanal do time for `medical` ou `recovery`.

### Fator de Moral

O CA também pode **diminuir** baseado na moral:
- Moral < 30: fator -0.5 (perde CA)
- Moral < 50: fator 0 (neutro)
- Moral ≥ 50: fator 1 (ganho normal)

Combinado com o multiplicador de idade, jogadores velhos com baixa moral perdem CA.

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
