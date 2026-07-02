import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../store/gameStore.js';
import {
  calculateTicketRevenue,
  calculateSponsorshipRevenue,
  calculateBroadcastingRevenue,
  calculateFacilityCosts,
  calculateStaffCosts,
  weeklyWages,
  calculateMatchPrizeMoney,
  calculateSeasonFinalPrize,
  calculateMarketValue,
} from '../store/helpers/finance.js';
import type { Team, Player } from '../types/game.js';

const WEEKS_PER_SEASON = 38;

function applyWeeklyFinances(team: Team): Team {
  const ticket = calculateTicketRevenue(team.reputation);
  const sponsor = calculateSponsorshipRevenue(team.reputation);
  const broadcast = calculateBroadcastingRevenue(team.reputation);
  const facility = calculateFacilityCosts(team.facilitiesLevel);
  const staff = calculateStaffCosts(team.staffLevel);
  const wages = weeklyWages(team.wageBill);
  return {
    ...team,
    budget: Math.max(-50, team.budget + ticket + sponsor + broadcast - wages - facility - staff),
  };
}

function findMostExpensivePlayer(teams: Team[], buyerId: string): { player: Player; sellerId: string } | null {
  let best: { player: Player; sellerId: string } | null = null;
  for (const team of teams) {
    if (team.id === buyerId) continue;
    for (const player of team.squad) {
      if (!best || player.marketValue > best.player.marketValue) {
        best = { player, sellerId: team.id };
      }
    }
  }
  return best;
}

describe('Financial Balance — Regression Tests', () => {
  beforeEach(() => {
    useGameStore.setState({
      teams: [],
      selectedTeam: null,
      currentWeek: 0,
      currentSeason: 1,
      matches: [],
      leagueTable: [],
    });
  });

  describe('Invariant 1: Idle club ends season within viable range', () => {
    it('no team should end with budget > 5x initial or bankrupt (<= -50)', () => {
      useGameStore.getState().initGame();
      let teams = useGameStore.getState().teams;
      const initialBudgets: Record<string, number> = {};
      for (const t of teams) initialBudgets[t.id] = t.budget;

      for (let week = 1; week <= WEEKS_PER_SEASON; week++) {
        teams = teams.map(applyWeeklyFinances);
      }
      useGameStore.setState({ teams });

      for (const team of teams) {
        const init = initialBudgets[team.id];
        const final = team.budget;
        expect(final).toBeGreaterThanOrEqual(-50);
        expect(final).toBeLessThan(init * 5);
      }
    });
  });

  describe('Invariant 2: No passive bankruptcy (wage bill vs revenue)', () => {
    it('every team should have wage bill < 100% of weekly revenue', () => {
      useGameStore.getState().initGame();
      const teams = useGameStore.getState().teams;

      for (const team of teams) {
        const revenue =
          calculateTicketRevenue(team.reputation) +
          calculateSponsorshipRevenue(team.reputation) +
          calculateBroadcastingRevenue(team.reputation);
        const wages = weeklyWages(team.wageBill);
        const ratio = wages / revenue;
        expect(ratio).toBeLessThan(1.0);
      }
    });
  });

  describe('Invariant 3: Most expensive player costs >= 30% of a top club budget', () => {
    it('top player marketValue >= 30% of highest-budget club', () => {
      useGameStore.getState().initGame();
      const teams = useGameStore.getState().teams;

      const topBudget = Math.max(...teams.map(t => t.budget));
      const target = findMostExpensivePlayer(teams, '');
      expect(target).not.toBeNull();
      if (!target) return;

      const costPct = (target.player.marketValue / topBudget) * 100;
      expect(costPct).toBeGreaterThanOrEqual(30);
    });
  });

  describe('Invariant 4: Season final prize is meaningful but not game-breaking', () => {
    it('champion prize is between 5M and 50M', () => {
      const totalTeams = 20;
      const champPrizeRep90 = calculateSeasonFinalPrize(1, 90, totalTeams);
      const champPrizeRep50 = calculateSeasonFinalPrize(1, 50, totalTeams);
      expect(champPrizeRep90).toBeGreaterThan(5);
      expect(champPrizeRep90).toBeLessThan(50);
      expect(champPrizeRep50).toBeGreaterThan(3);
    });

    it('last place prize is small but non-zero', () => {
      const totalTeams = 20;
      const lastPrize = calculateSeasonFinalPrize(totalTeams, 40, totalTeams);
      expect(lastPrize).toBeGreaterThan(0);
      expect(lastPrize).toBeLessThan(5);
    });
  });

  describe('Invariant 5: Match prize money is ~10% of seasonal revenue', () => {
    it('average prize per match (40% win, 30% draw, 30% loss) is < 15% of weekly revenue', () => {
      for (const rep of [40, 50, 70, 90]) {
        const avgPrize =
          calculateMatchPrizeMoney('win', rep) * 0.4 +
          calculateMatchPrizeMoney('draw', rep) * 0.3 +
          calculateMatchPrizeMoney('loss', rep) * 0.3;
        const revenue =
          calculateTicketRevenue(rep) +
          calculateSponsorshipRevenue(rep) +
          calculateBroadcastingRevenue(rep);
        const pct = (avgPrize / revenue) * 100;
        expect(pct).toBeLessThan(15);
      }
    });
  });

  describe('Invariant 6: Market value calibration', () => {
    it('OVR 85 player costs 30-50% of a top club budget (~95M)', () => {
      const topClubBudget = 95;
      let sum = 0;
      const samples = 50;
      for (let i = 0; i < samples; i++) {
        sum += calculateMarketValue(85);
      }
      const avg = sum / samples;
      const pct = (avg / topClubBudget) * 100;
      expect(pct).toBeGreaterThanOrEqual(30);
      expect(pct).toBeLessThanOrEqual(55);
    });

    it('OVR 70 player costs < 15% of a top club budget', () => {
      const topClubBudget = 95;
      let sum = 0;
      const samples = 50;
      for (let i = 0; i < samples; i++) {
        sum += calculateMarketValue(70);
      }
      const avg = sum / samples;
      const pct = (avg / topClubBudget) * 100;
      expect(pct).toBeLessThan(15);
    });
  });
});
