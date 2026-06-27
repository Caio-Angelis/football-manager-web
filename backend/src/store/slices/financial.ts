import type { GameStore, FinancialReport } from '../../types/game';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createFinancialSlice = (set: Set, get: Get) => ({
  generateFinancialReport: (): FinancialReport | null => {
    const state = get();
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return null;

    // Calculate revenue and expenses
    const ticketRevenue = (team.reputation / 100) * 0.5;
    const sponsorship = (team.reputation / 100) * 0.3;
    const totalIncome = ticketRevenue + sponsorship;
    const totalExpenses = team.wageBill * 0.01;
    const profit = totalIncome - totalExpenses;

    // Calculate transfer-related figures
    const transferSpending = state.transferAgreements
      .filter(a => a.toTeamId === state.selectedTeam)
      .reduce((sum, a) => sum + a.transferFee, 0);
    const transferIncome = state.transferAgreements
      .filter(a => a.fromTeamId === state.selectedTeam)
      .reduce((sum, a) => sum + a.transferFee, 0);

    // Days until deadline (end of season = 38 weeks)
    const daysUntilDeadline = Math.max(0, (38 - state.currentWeek) * 7);

    return {
      teamId: team.id,
      teamName: team.name,
      budget: team.budget,
      wageBill: team.wageBill,
      ticketRevenue,
      sponsorshipRevenue: sponsorship,
      totalIncome,
      totalExpenses,
      profit,
      transferSpending,
      transferIncome,
      season: state.currentSeason,
      week: state.currentWeek,
      daysUntilDeadline,
      currency: 'BRL',
    };
  },

  getFinancialReport: () => {
    const state = get();
    const report = state.generateFinancialReport();
    if (report) {
      set({
        financialReports: [report, ...state.financialReports].slice(0, 50),
      });
    }
    return report;
  },
});
