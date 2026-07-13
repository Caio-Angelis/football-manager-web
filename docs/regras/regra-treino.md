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

O ganho de atributos por sessão é de **0.05 a 0.25** pontos (`baseTrainingGain`), multiplicado pelo multiplicador de idade. Para um sub-21 (×2.0), o ganho efetivo por sessão é **0.1 a 0.5** pontos. Com até 21 sessões semanais, um jogador jovem pode ganhar até ~10 pontos em um atributo por semana no cenário mais extremo — ainda acelerado, mas significativamente mais controlado que o sistema anterior (0.2–1.0 base).

### Calibração

- **Base reduzida** de 0.2–1.0 para 0.05–0.25 (80% de redução)
- **Multiplicador de idade definitivo**: sub-21 ×2.0, auge ×0.45, transição ×0.2, declínio ×0.1
- **CA respeita teto de PA** e é limitado a 200
- **Moral baixa (< 30)** reverte ganho de CA (fator -0.5)
- **Declínio físico mensal** (31+) contrabalança ganhos em jogadores veteranos

### Notas

- Jogadores jovens ainda evoluem rapidamente, mas o teto de PA e a curva de idade garantem que a progressão desacelera naturalmente
- Com 3 temporadas (114 semanas), o sistema de base juvenil tem tempo limitado para dar retorno — o foco deve ser em jogadores sub-21 com PA alto
- O declínio físico mensal (31+) e a estagnação no treino (×0.1) garantem que veteranos não progridem indefinidamente
