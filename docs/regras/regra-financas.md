# Regras de Finanças

## Visão Geral

O sistema financeiro simula a gestão econômica de um clube de futebol. A cada avanço de semana, o orçamento do clube é atualizado com receitas e despesas. Todas as fórmulas estão centralizadas em `backend/src/store/helpers/finance.ts` (backend) e espelhadas em `frontend/src/utils/finance.ts` (frontend).

---

## Valor de Mercado de Jogadores

Calculado por `calculateMarketValue` — escala exponencial baseada no overall (0-100):

| Overall | Fórmula | Faixa de Valor |
|---------|---------|----------------|
| < 60 | Aleatório | 0 a ~1M |
| 60-69 | `(o-60) × 0.8 + aleatório` | até ~8M |
| 70-77 | `(o-70) × 2.1 + 8 + aleatório` | até ~25M |
| 78-84 | `(o-78) × 3.5 + 25 + aleatório` | até ~50M |
| 85+ | `(o-85) × 5 + 35 + aleatório` | até ~80M |

---

## Salário de Jogadores

Calculado por `calculatePlayerSalary`:

```
Salário semanal = max(5, marketValue × 30 + aleatório)  // em milhares de R$ por semana
```

---

## Receitas Semanais

A cada avanço de semana, o clube recebe:

| Receita | Fórmula |
|---------|---------|
| Bilheteira | `(reputação/50)² × 1.5` por semana |
| Patrocínio | `(reputação/50)² × 1.2` por semana |
| Transmissão | `(reputação/50)² × 1.5` por semana |

**Total de receitas semanais:** `bilheteira + patrocínio + transmissão`

Um time médio (reputação 50) recebe ~4.2M por semana em receitas fixas.

### Modificador de Humor da Torcida

- Torcida feliz: aumenta receita de bilheteria em até **+20%**
- Torcida brava: reduz receita de bilheteria em até **-15%**
- Calculado por `getFanMoodRevenueModifier`

---

## Despesas Semanais

| Despesa | Fórmula |
|---------|---------|
| Salários (folha) | `wageBill` direto (milhões/semana = Σ salary / 1000) |
| Infraestruturas | `facilitiesLevel × 0.35` por semana |
| Staff | `staffLevel × 0.25` por semana |

**Balanço semanal:** `bilheteira + patrocínio + transmissão - salários - infraestruturas - staff`

**Piso de caixa:** Orçamento pode ir até -50M (dívida controlada), não mais `Math.max(0, …)`.

---

## Premiação por Partida

Cada partida disputada gera premiação baseada no resultado e reputação do clube (`calculateMatchPrizeMoney`):

| Resultado | Multiplicador |
|-----------|---------------|
| Vitória | base × 3.0 |
| Empate | base × 1.5 |
| Derrota | base × 0.5 |

**Base:** `(reputação/50)² × 0.2`

A premiação é creditada ao orçamento de **ambos os times** ao final da partida (em `applyMatchResultToTeams`). Times que vencem mais ganham significativamente mais.

Um time médio que vence 50% das 38 rodadas ganha ~15M adicionais na temporada.

---

## Prêmio por Colocação Final da Temporada

Ao final das 38 rodadas (`championshipEnded` em `advanceWeek`), cada time recebe um prêmio baseado na posição final na tabela (`calculateSeasonFinalPrize`):

- **Base:** `(reputação/50)² × 10`
- **Fator de posição:** `max(0.05, 1 - (posição - 1) / total de times)`
- Campeão (rep 90): ~R$32M | Último colocado: ~R$1.6M
- O prêmio é creditado ao orçamento antes do processamento da semana final.

---

## Orçamento e Limite Salarial

### Orçamento do Time

Calculado por `calculateTeamBudget`:

```
Orçamento = (reputação/30)² × 10 + aleatório  // em milhões
```

### Limite Salarial Recomendado

Calculado por `calculateWageLimit`:

```
Limite salarial = 60% da renda semanal estimada
Renda semanal = bilheteira + patrocínio + transmissão
```

Se a folha salarial exceder o limite, é exibido alerta "Folha acima do limite recomendado".

---

## Gestão Financeira

- **Orçamento (carteira única):** Usado para comprar jogadores e operar o clube. Reduz com compras à vista ou entrada de parceladas. Não há mais `transferBudget` separado.
- **Folha salarial:** Soma de todos os salários do elenco (`recalcWageBill`). Recalculada automaticamente após transferências.
- **Ajuste de salários:** O usuário pode ajustar o salário individual de cada jogador via slider na tela de Finanças.
- **Projeção:** O sistema projeta o balanço financeiro para as próximas 6 semanas.
- **Parcelas vencidas:** Se o orçamento não cobrir uma parcela, ela fica vencida e gera alerta no inbox.
- **Relatório financeiro** (`FinancialReport`): Inclui `facilityCosts`, `staffCosts` como campos distintos de despesa e `broadcastingRevenue` como campo de receita.

---

## Parcelas e Bônus

### Parcelas de Transferência

- Para transferências acima de **R$ 10M**, o pagamento pode ser parcelado em **3 a 6 vezes**, com vencimento a cada **4 semanas**.
- O pagamento é **automático** se houver orçamento; se não, a parcela fica vencida e gera alerta no inbox.
- Cada cláusula de parcelamento tem um campo `direction`:
  - `payable`: o usuário deve pagar (quando compra um jogador)
  - `receivable`: o usuário deve receber (quando vende um jogador e o comprador paga em parcelas)

### Bônus de Performance

Podem ser incluídos nas ofertas com 40% de chance. Tipos:

| Tipo | Condição de Disparo |
|------|---------------------|
| Gols | `seasonGoals >= threshold` |
| Assistências | `seasonAssists >= threshold` |
| Aparições | `team.played >= threshold` |
| Títulos | `league position == 1` |
| Performance | `form >= threshold` |

Os bônus são verificados a cada semana com base em **estatísticas reais** do jogador. Uma vez disparados, o usuário pode reclamá-los para receber o valor.

---

## Contratos

Cada transferência gera um **acordo contratual** completo:

- **Salário semanal:** 100-130% do salário anterior
- **Duração do contrato:** 1 a 4 anos (52 a 208 semanas)
- **Cláusula de rescisão:** Inicial = 150% do valor de mercado. Pós-transferência = 120-150% do valor da transferência
- **Bônus de performance:** 40% de chance de incluir
- **Histórico de alterações:** criação, término, etc.

### Decrementação de Contrato

`contractEnd` é decrementado semanalmente em `advanceWeek`. Inbox message gerada quando contrato expira (chega a 0).

---

## Economia — Pontos de Atenção

- **Injeção de dinheiro lenta para times pequenos:** 3 temporadas (114 semanas) muitas vezes não são suficientes para tirar um time pequeno da dívida.
- **Contratos longos perdem impacto:** Contratos de 4 anos (208 semanas) ultrapassam a vida útil total do save (114 semanas).
- **Recomendação:** Aumentar receitas de bilheteira com base em resultados, e reduzir duração máxima de contrato para 3 anos.
