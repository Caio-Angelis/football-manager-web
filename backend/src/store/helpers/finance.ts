// ============================================================
// HELPER FINANCEIRO COMPARTILHADO
// Fórmulas realistas para valor de mercado, salário, receitas e despesas
// ============================================================
//
// CONVENÇÃO DE UNIDADES (válida para todo o sistema financeiro):
//   - Fluxo de caixa (receitas/despesas/orçamento): milhões de R$ por semana
//   - player.salary: milhares de R$ por semana
//   - team.wageBill: milhões de R$ por semana (= Σ salary / 1000)
//   - team.budget: milhões de R$
// ============================================================

/**
 * Calcula valor de mercado do jogador (em milhões de R$).
 * Usa curva exponencial por faixas para refletir a realidade:
 *   overall < 60: 0–1M
 *   overall 60–69: 1–8M
 *   overall 70–77: 8–25M
 *   overall 78–84: 25–50M
 *   overall 85+:   35–80M
 * Calibrado para que 1 craque (overall 85) custa ~35-50% do orçamento
 * de um clube grande (rep 90, budget ~90-100M).
 * @param overall100 overall do jogador na escala 0-100
 */
export function calculateMarketValue(overall100: number): number {
  const o = overall100;
  let value: number;
  if (o < 60) {
    value = Math.random() * 1;
  } else if (o < 70) {
    value = (o - 60) * 0.8 + Math.random() * 1.5;
  } else if (o < 78) {
    value = (o - 70) * 2.1 + 8 + Math.random() * 4;
  } else if (o < 85) {
    value = (o - 78) * 3.5 + 25 + Math.random() * 8;
  } else {
    value = (o - 85) * 5 + 35 + Math.random() * 8;
  }
  return parseFloat(Math.max(0.1, value).toFixed(2));
}

/**
 * Calcula salário semanal do jogador (em milhares de R$).
 * Proporcional ao valor de mercado, com ruído aleatório.
 * @param marketValue valor de mercado em milhões
 */
export function calculatePlayerSalary(marketValue: number): number {
  return Math.max(5, Math.floor(marketValue * 30 + Math.random() * 35));
}

/**
 * Receita semanal de bilheteira (em milhões de R$).
 * Cresce exponencialmente com a reputação do clube.
 */
export function calculateTicketRevenue(reputation: number): number {
  return parseFloat((Math.pow(reputation / 50, 2) * 1.5).toFixed(2));
}

/**
 * Receita semanal de patrocínio (em milhões de R$).
 */
export function calculateSponsorshipRevenue(reputation: number): number {
  return parseFloat((Math.pow(reputation / 50, 2) * 1.2).toFixed(2));
}

/**
 * Custo semanal de infraestruturas (em milhões de R$).
 * Inclui manutenção de estádio, centro de treino e instalações juvenis.
 */
export function calculateFacilityCosts(facilitiesLevel: number): number {
  return parseFloat((facilitiesLevel * 0.35).toFixed(2));
}

/**
 * Custo semanal de staff e comissão técnica (em milhões de R$).
 * Inclui comissão técnica, departamento médico, olheiros e pessoal administrativo.
 */
export function calculateStaffCosts(staffLevel: number): number {
  return parseFloat((staffLevel * 0.25).toFixed(2));
}

/**
 * Folha salarial semanal (em milhões de R$).
 * wageBill já está em milhões/semana (= Σ salary / 1000), então retorna direto.
 */
export function weeklyWages(wageBill: number): number {
  return parseFloat(wageBill.toFixed(2));
}

/**
 * Limite recomendado para folha salarial semanal (em milhões de R$).
 * Baseado em 60% da receita semanal estimada.
 */
export function calculateWageLimit(reputation: number): number {
  const weeklyIncome = calculateTicketRevenue(reputation) + calculateSponsorshipRevenue(reputation) + calculateBroadcastingRevenue(reputation);
  return parseFloat((weeklyIncome * 0.6).toFixed(2));
}

/**
 * Orçamento total inicial do clube (em milhões de R$).
 * Cresce quadraticamente com a reputação. Proporcional a ~1–2 craques.
 */
export function calculateTeamBudget(reputation: number): number {
  return parseFloat((Math.pow(reputation / 30, 2) * 10 + Math.random() * 10).toFixed(1));
}

/**
 * Receita semanal de direitos de transmissão (em milhões de R$).
 * Cresce quadraticamente com a reputação do clube.
 */
export function calculateBroadcastingRevenue(reputation: number): number {
  return parseFloat((Math.pow(reputation / 50, 2) * 1.5).toFixed(2));
}

/**
 * Premiação por partida (em milhões de R$), baseada no resultado e reputação.
 * Vitória: 3x base, Empate: 1.5x base, Derrota: 0.5x base.
 * Calibrada para ~10% da receita sazonal (não inflar superávit).
 * @param result 'win' | 'draw' | 'loss'
 * @param reputation reputação do clube (1-100)
 */
export function calculateMatchPrizeMoney(result: 'win' | 'draw' | 'loss', reputation: number): number {
  const base = Math.pow(reputation / 50, 2) * 0.2;
  const multiplier = result === 'win' ? 3.0 : result === 'draw' ? 1.5 : 0.5;
  return parseFloat((base * multiplier).toFixed(2));
}

/**
 * Prêmio por colocação final da temporada (em milhões de R$).
 * Pago ao final das 38 rodadas. Escala por posição e reputação.
 * 1º lugar: 100% do prêmio base; último: 5%.
 * @param position posição final na tabela (1-based)
 * @param reputation reputação do clube (1-100)
 * @param totalTeams número total de times na liga
 */
export function calculateSeasonFinalPrize(position: number, reputation: number, totalTeams: number): number {
  const base = Math.pow(reputation / 50, 2) * 10;
  const positionFactor = Math.max(0.05, 1 - (position - 1) / totalTeams);
  return parseFloat((base * positionFactor).toFixed(2));
}
