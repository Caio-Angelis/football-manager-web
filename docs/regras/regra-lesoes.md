# Regras de Lesões

## Estrutura da Lesão

A lesão de um jogador é representada no objeto `injury` com os seguintes campos:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `active` | boolean | Se a lesão está ativa |
| `daysRemaining` | number | Dias restantes para recuperação |
| `totalDays` | number | Duração total original (para cálculo de progresso) |
| `type` | string | Tipo: `muscle`, `ligament`, `joint`, `ankle`, `knee`, `groin` |
| `severity` | string | `minor`, `moderate` ou `severe` |
| `source` | string | Origem: `training`, `match`, `random` |

---

## Cálculo de Risco

O risco de lesão de cada jogador é calculado semanalmente via `calculatePlayerInjuryRisk`:

### Aumentos de Risco

| Fator | Aumento |
|-------|---------|
| Já lesionado | Retorna 0 (não sujeito a novas lesões) |
| Tendência a lesões (atributo oculto, 1-10) | 0-30% de risco base |
| Dias físicos consecutivos | `1.5^dias × 5%` (cresce exponencialmente) |
| Carga acumulada acima de 5 | +3% por ponto excedente |
| Condição física baixa (< 50) | +0.3% por ponto abaixo de 50 |
| Recuperação necessária | +15% |
| Lesões anteriores não recuperadas | +10% cada |
| Fadiga alta (> 60) | +15% |
| Fadiga moderada (> 40) | +8% |
| Idade ≥ 32 anos | +10% |
| Idade 28-31 anos | +5% |
| Condição degradada pós-lesão | +6% a +20% dependendo do nível |

### Redutores de Risco

| Fator | Redução |
|-------|---------|
| Nível das instalações | Até -20% (2% por nível) |
| Nível da equipe médica | Até -15% (1.5% por nível) |

---

## Níveis de Risco

| Nível | Range | Comportamento |
|-------|-------|---------------|
| Baixo | < 30% | Normal |
| Moderado | 30-59% | Normal |
| Alto | 60-79% | Gera alerta no inbox sugerindo descanso |
| Crítico | ≥ 80% | Gera alerta urgente sugerindo substituição imediata |

---

## Geração de Lesões (Centralizada)

Toda lesão é gerada pela função centralizada `generateInjuryForPlayer` (em `backend/src/store/helpers/injury.ts`), garantindo consistência entre treino, partida e eventos aleatórios.

### Severity Roll

Baseado em `Math.random() × 100 + proneness × 5 + risk × 0.3`:

| Roll | Severidade | Duração |
|------|------------|---------|
| < 50 | minor | 5-12 dias |
| 50-79 | moderate | 13-27 dias |
| ≥ 80 | severe | 28-69 dias |

### Multiplicadores de Duração

| Fator | Multiplicador |
|-------|---------------|
| Idade ≥ 32 | ×1.3 |
| Idade 28-31 | ×1.15 |
| Condição física < 40 | ×1.2 |
| Redução por staff/facilities | `staffLevel × 0.5 + facilitiesLevel × 0.3` (mínimo 3 dias) |

### Tipo de Lesão

Aleatório entre: `muscle`, `ligament`, `joint`, `ankle`, `knee`, `groin`

### Efeitos Colaterais

- Registra no `injuryHistory`
- Define `lastInjuryWeek`
- Aplica `degradedCondition` (severe→minimal, moderate→low, minor→moderate)
- Reduz fitness em 15

---

## Fontes de Lesão

| Fonte | Trigger | Função |
|-------|---------|--------|
| Treino físico | Chance baseada em proneness, carga e fitness | `generateInjuryForPlayer` com source `training` |
| Roll semanal (advanceWeek) | 2% base + `risk × 0.08%` por jogador não lesionado | `generateInjuryForPlayer` com source `random` |
| Inbox | **Não gera mais lesões** (case `injury` removido de `generateInboxMessage`) | — |

Lesões geradas pelo roll semanal geram mensagem no inbox com tipo, severidade e dias.

---

## Cura Semanal (Centralizada)

A cura de lesões é processada por `healInjuryForPlayer` durante `advanceWeek`:

### Taxa de Cura

| Componente | Valor |
|------------|-------|
| Taxa base | 7 dias por semana |
| Bônus de staff | `+staffLevel × 0.5` dias |
| Bônus de facilities | `+facilitiesLevel × 0.3` dias |

### Penalidades

| Fator | Penalidade |
|-------|------------|
| Idade ≥ 32 | ×0.8 |
| Idade 28-31 | ×0.9 |
| Severidade (primeira metade da lesão, `daysRemaining > totalDays × 0.5`) | severe ×0.7, moderate ×0.85 |

### Ao Curar

- Marca a lesão mais recente não recuperada no `injuryHistory` como `fullyRecovered: true`
- Restaura fitness em +15

---

## Recuperação por Treino

- Sessões **médico/recuperação** reduzem `daysRemaining` em **2 dias** (via `reduceInjuryFromRecoveryTraining`)
- Sessões médico no `applyPreventionSession` reduzem em **3 dias**

---

## Condição Degradada Pós-Lesão

Após a recuperação, o jogador tem uma **condição degradada** que melhora gradualmente:

### Progressão

```
minimal → low → moderate → good → removida
```

### Timeline

| Nível | Tempo para próximo nível |
|-------|--------------------------|
| minimal | Após 4+ semanas → low |
| low | Após 2+ semanas → moderate |
| moderate | Após 1+ semana → good |
| good | Após 8+ semanas → removida |

Centralizada em `updateDegradedConditionForPlayer` (em `backend/src/store/helpers/injury.ts`).

---

## Decaimento de Fadiga (Semanal)

A cada avanço de semana, `applyFatigueDecayToPlayer` aplica recuperação natural:

| Atributo | Efeito |
|----------|--------|
| Fitness | +5 (recuperação durante descanso) |
| Carga acumulada | -5 |
| Dias físicos consecutivos | -1 |
| Recovery needed | Limpo se fitness > 30 e carga ≤ 20 |

---

## Outras Regras

- Jogadores lesionados **não participam de treinos** e **não podem jogar**.
- Todas as ações de lesão e treino buscam jogadores **apenas no time selecionado** (`state.selectedTeam`).
- A recuperação acontece pela cura automática semanal e por sessões de treino médico/recuperação (botão "Recuperar" foi removido do Monitor de Fadiga).
- **`recoverInjuredPlayer`:** Marca apenas a lesão mais recente não recuperada no `injuryHistory` (não todas), e restaura fitness para mínimo 40 + 10.
- **`getInjuryReport`:** Usa os dados armazenados na lesão (`type`, `severity`, `daysRemaining`, `totalDays`). Progresso de recuperação calculado como `100 - (daysRemaining / totalDays × 100)`.
- **`applyPostInjuryCondition`:** Define `degradedCondition` baseado em severity: severe→minimal, moderate→low, minor→moderate.
