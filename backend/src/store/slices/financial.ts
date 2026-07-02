import type { GameStore, FinancialReport } from '../../types/game';
import { calculateTicketRevenue, calculateSponsorshipRevenue, calculateBroadcastingRevenue, calculateFacilityCosts, calculateStaffCosts, weeklyWages } from '../helpers/finance';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createFinancialSlice = (set: Set, get: Get) => ({
  generateFinancialReport: (): FinancialReport | null => {
    const state = get();
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return null;

    // Calculate revenue and expenses using shared helpers
    const ticketRevenue = calculateTicketRevenue(team.reputation);
    const sponsorship = calculateSponsorshipRevenue(team.reputation);
    const broadcasting = calculateBroadcastingRevenue(team.reputation);
    const facilityCosts = calculateFacilityCosts(team.facilitiesLevel);
    const staffCosts = calculateStaffCosts(team.staffLevel);
    const weeklyWageCost = weeklyWages(team.wageBill);
    const totalIncome = ticketRevenue + sponsorship + broadcasting;
    const totalExpenses = weeklyWageCost + facilityCosts + staffCosts;
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
      broadcastingRevenue: broadcasting,
      totalIncome,
      facilityCosts,
      staffCosts,
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
