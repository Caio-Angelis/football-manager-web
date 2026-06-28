// Helpers de Transferência — Scout, Incoming Transfers e Wage Bill

import type { Player, Team, ScoutReport, IncomingTransfer, InstallmentClause, PlayerBonus } from '../../types/game';
import { getFullName } from '../../utils/playerName';

export function generateScoutReport(player: Player): ScoutReport {
  const reliability = Math.min(5, Math.floor(Math.random() * 3) + 2);
  const fuzz = (val: number) => {
    const range = Math.max(2, 6 - reliability);
    return [Math.max(1, val - range), Math.min(20, val + range)] as [number, number];
  };

  return {
    playerId: player.id,
    playerName: getFullName(player),
    position: player.position,
    age: player.age,
    nationality: player.nationality,
    currentAbility: player.currentAbility,
    potentialAbility: player.potentialAbility,
    attributesRange: {
      passing: fuzz(player.technical.passing),
      technique: fuzz(player.technical.technique),
      finishing: fuzz(player.technical.finishing),
      speed: fuzz(player.physical.speed ?? 10),
      stamina: fuzz(player.physical.stamina ?? 10),
    },
    stars: Math.min(5, Math.ceil(player.potentialAbility / 40)),
    reliability,
  };
}

export function maybeGenerateIncomingTransfer(teams: Team[], selectedTeamId: string): IncomingTransfer | null {
  if (Math.random() > 0.35) return null;

  const userTeam = teams.find(t => t.id === selectedTeamId);
  if (!userTeam || userTeam.squad.length === 0) return null;

  const player = userTeam.squad[Math.floor(Math.random() * userTeam.squad.length)];
  const buyerTeams = teams.filter(t => t.id !== selectedTeamId);
  const buyer = buyerTeams[Math.floor(Math.random() * buyerTeams.length)];
  if (!buyer) return null;

  const offerPrice = Math.round(player.marketValue * (0.8 + Math.random() * 0.4) * 10) / 10;
  let paymentMethod: 'cash' | 'installments' = Math.random() < 0.6 ? 'cash' : 'installments';
  let installmentClause: InstallmentClause | undefined;
  let bonuses: PlayerBonus[] | undefined;

  if (paymentMethod === 'installments' && offerPrice > 10) {
    // Generate installment clause for expensive transfers
    const installmentCount = Math.min(6, Math.max(3, Math.floor(offerPrice / 5) + 1));
    const installmentAmount = Math.round(offerPrice / installmentCount * 10) / 10;

    installmentClause = {
      id: `ic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      totalAmount: offerPrice,
      installmentCount,
      installmentAmount,
      payments: [],
      status: 'active',
    };

    for (let i = 0; i < installmentCount; i++) {
      const amount = i === 0 ? Math.round((offerPrice - installmentAmount * (installmentCount - 1)) * 10) / 10 : installmentAmount;
      installmentClause.payments.push({
        installmentNumber: i + 1,
        amount,
        dueWeek: 1 + i * 4, // weeks from start
        paid: false,
      });
    }
  }

  // Generate random bonuses
  if (Math.random() < 0.5) {
    bonuses = [];
    const bonusTypes: PlayerBonus['type'][] = ['goals', 'appearances', 'assists', 'titles'];
    for (let i = 0; i < Math.floor(Math.random() * 2) + 1; i++) {
      bonuses.push({
        id: `bonus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`,
        playerId: player.id,
        type: bonusTypes[Math.floor(Math.random() * bonusTypes.length)],
        threshold: Math.floor(Math.random() * 30) + 10,
        bonusAmount: Math.floor(Math.random() * 200) + 50,
        triggered: false,
      });
    }
  }

  return {
    playerId: player.id,
    offerPrice,
    fromTeam: buyer.id,
    contractProposal: {
      salary: Math.round(player.salary * 1.1),
      duration: 52 + Math.floor(Math.random() * 104),
      clause: Math.round(player.marketValue * 1.5 * 10) / 10,
    },
    paymentMethod,
    installmentClause,
    bonuses,
  };
}

export function recalcWageBill(team: Team): number {
  return team.squad.reduce((sum, p) => sum + p.salary, 0) / 1000;
}
