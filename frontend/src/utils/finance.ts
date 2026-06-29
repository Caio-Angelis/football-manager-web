// ============================================================
// HELPER FINANCEIRO (mirror do backend para uso no frontend)
// Fórmulas realistas para receitas, despesas e limite salarial
// ============================================================

export function calculateTicketRevenue(reputation: number): number {
  return parseFloat((Math.pow(reputation / 50, 2) * 1.5).toFixed(2));
}

export function calculateSponsorshipRevenue(reputation: number): number {
  return parseFloat((Math.pow(reputation / 50, 2) * 1.2).toFixed(2));
}

export function calculateFacilityCosts(facilitiesLevel: number): number {
  return parseFloat((facilitiesLevel * 0.2).toFixed(2));
}

export function weeklyWages(wageBillMonthly: number): number {
  return parseFloat((wageBillMonthly * (12 / 52)).toFixed(2));
}

export function calculateWageLimit(reputation: number): number {
  const weeklyIncome = calculateTicketRevenue(reputation) + calculateSponsorshipRevenue(reputation);
  const monthlyIncome = weeklyIncome * 52 / 12;
  return parseFloat((monthlyIncome * 0.6).toFixed(2));
}
