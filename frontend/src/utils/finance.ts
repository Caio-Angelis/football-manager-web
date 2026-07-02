// ============================================================
// HELPER FINANCEIRO (mirror do backend para uso no frontend)
// Fórmulas realistas para receitas, despesas e limite salarial
// ============================================================
//
// CONVENÇÃO DE UNIDADES:
//   - Fluxo de caixa (receitas/despesas/orçamento): milhões de R$ por semana
//   - player.salary: milhares de R$ por semana
//   - team.wageBill: milhões de R$ por semana (= Σ salary / 1000)
//   - team.budget: milhões de R$
// ============================================================

export function calculateTicketRevenue(reputation: number): number {
  return parseFloat((Math.pow(reputation / 50, 2) * 1.5).toFixed(2));
}

export function calculateSponsorshipRevenue(reputation: number): number {
  return parseFloat((Math.pow(reputation / 50, 2) * 1.2).toFixed(2));
}

export function calculateFacilityCosts(facilitiesLevel: number): number {
  return parseFloat((facilitiesLevel * 0.35).toFixed(2));
}

export function calculateStaffCosts(staffLevel: number): number {
  return parseFloat((staffLevel * 0.25).toFixed(2));
}

export function weeklyWages(wageBill: number): number {
  return parseFloat(wageBill.toFixed(2));
}

export function calculateWageLimit(reputation: number): number {
  const weeklyIncome = calculateTicketRevenue(reputation) + calculateSponsorshipRevenue(reputation) + calculateBroadcastingRevenue(reputation);
  return parseFloat((weeklyIncome * 0.6).toFixed(2));
}

export function calculateBroadcastingRevenue(reputation: number): number {
  return parseFloat((Math.pow(reputation / 50, 2) * 1.5).toFixed(2));
}

export function calculateMatchPrizeMoney(result: 'win' | 'draw' | 'loss', reputation: number): number {
  const base = Math.pow(reputation / 50, 2) * 0.2;
  const multiplier = result === 'win' ? 3.0 : result === 'draw' ? 1.5 : 0.5;
  return parseFloat((base * multiplier).toFixed(2));
}

export function calculateSeasonFinalPrize(position: number, reputation: number, totalTeams: number): number {
  const base = Math.pow(reputation / 50, 2) * 10;
  const positionFactor = Math.max(0.05, 1 - (position - 1) / totalTeams);
  return parseFloat((base * positionFactor).toFixed(2));
}
