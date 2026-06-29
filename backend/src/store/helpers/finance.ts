// ============================================================
// HELPER FINANCEIRO COMPARTILHADO
// Fórmulas realistas para valor de mercado, salário, receitas e despesas
// ============================================================

/**
 * Calcula valor de mercado do jogador (em milhões de R$).
 * Usa curva exponencial por faixas para refletir a realidade:
 *   overall < 60: 0–1M
 *   overall 60–69: 1–8M
 *   overall 70–77: 8–30M
 *   overall 78–84: 30–95M
 *   overall 85+:   95–240M+
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
    value = (o - 70) * 3 + 8 + Math.random() * 4;
  } else if (o < 85) {
    value = (o - 78) * 10 + 30 + Math.random() * 10;
  } else {
    value = (o - 85) * 25 + 95 + Math.random() * 20;
  }
  return parseFloat(Math.max(0.1, value).toFixed(2));
}

/**
 * Calcula salário mensal do jogador (em milhares de R$).
 * Proporcional ao valor de mercado, com ruído aleatório.
 * @param marketValue valor de mercado em milhões
 */
export function calculatePlayerSalary(marketValue: number): number {
  return Math.max(5, Math.floor(marketValue * 20 + Math.random() * 30));
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
 */
export function calculateFacilityCosts(facilitiesLevel: number): number {
  return parseFloat((facilitiesLevel * 0.2).toFixed(2));
}

/**
 * Salários semanais a partir da folha mensal (em milhões de R$).
 * Converte mensal → semanal: wageBill * 12 / 52.
 */
export function weeklyWages(wageBillMonthly: number): number {
  return parseFloat((wageBillMonthly * (12 / 52)).toFixed(2));
}

/**
 * Limite recomendado para folha salarial mensal (em milhões de R$).
 * Baseado em 60% da receita mensal estimada.
 */
export function calculateWageLimit(reputation: number): number {
  const weeklyIncome = calculateTicketRevenue(reputation) + calculateSponsorshipRevenue(reputation);
  const monthlyIncome = weeklyIncome * 52 / 12;
  return parseFloat((monthlyIncome * 0.6).toFixed(2));
}

/**
 * Orçamento total inicial do clube (em milhões de R$).
 * Cresce quadraticamente com a reputação.
 */
export function calculateTeamBudget(reputation: number): number {
  return parseFloat((Math.pow(reputation / 30, 2) * 20 + Math.random() * 20).toFixed(1));
}

/**
 * Orçamento para transferências (em milhões de R$).
 * Parcela do orçamento total (40–60%).
 */
export function calculateTransferBudget(budget: number): number {
  return parseFloat((budget * (0.4 + Math.random() * 0.2)).toFixed(1));
}
