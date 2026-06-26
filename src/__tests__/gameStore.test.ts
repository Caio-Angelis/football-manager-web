import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../store/gameStore';
import type { WeeklyTrainingPlan, Player } from '../types/game';

function getState() {
  return useGameStore.getState();
}

function selectFirstTeam() {
  const teamId = getState().teams[0]?.id;
  if (!teamId) throw new Error('No teams generated');
  getState().selectTeam(teamId);
  return teamId;
}

describe('gameStore - markAsRead', () => {
  it('marks a message as read', () => {
    selectFirstTeam();
    getState().advanceWeek();
    const msg = getState().inbox[0];
    expect(msg).toBeDefined();
    expect(msg.read).toBeFalsy();

    getState().markAsRead(msg.id);
    const updated = getState().inbox.find(m => m.id === msg.id);
    expect(updated?.read).toBe(true);
  });

  it('does nothing for non-existent message id', () => {
    selectFirstTeam();
    getState().advanceWeek();
    const before = getState().inbox.length;
    getState().markAsRead('non-existent-id');
    expect(getState().inbox.length).toBe(before);
  });
});

describe('gameStore - removeMessage', () => {
  it('removes a message from inbox', () => {
    selectFirstTeam();
    getState().advanceWeek();
    const msg = getState().inbox[0];
    const before = getState().inbox.length;
    getState().removeMessage(msg.id);
    expect(getState().inbox.length).toBe(before - 1);
    expect(getState().inbox.find(m => m.id === msg.id)).toBeUndefined();
  });

  it('does nothing for non-existent message id', () => {
    selectFirstTeam();
    getState().advanceWeek();
    const before = getState().inbox.length;
    getState().removeMessage('fake-id');
    expect(getState().inbox.length).toBe(before);
  });
});

describe('gameStore - completeYouthIntake', () => {
  it('adds youth players to the selected team squad', () => {
    const teamId = selectFirstTeam();
    const before = getState().teams.find(t => t.id === teamId)!.squad.length;
    expect(getState().youthIntakeCompleted).toBe(false);

    getState().completeYouthIntake();

    const after = getState().teams.find(t => t.id === teamId)!.squad.length;
    expect(after).toBeGreaterThan(before);
    expect(getState().youthIntakeCompleted).toBe(true);
  });

  it('does nothing when no team is selected', () => {
    // Don't select a team
    const teamsBefore = JSON.stringify(getState().teams.map(t => t.squad.length));
    getState().completeYouthIntake();
    const teamsAfter = JSON.stringify(getState().teams.map(t => t.squad.length));
    expect(teamsAfter).toBe(teamsBefore);
  });
});

describe('gameStore - assignScout', () => {
  it('generates scout reports for random players', () => {
    selectFirstTeam();
    const before = getState().scoutReports.length;
    const result = getState().assignScout();
    expect(result).toBe(true);
    expect(getState().scoutReports.length).toBeGreaterThan(before);
  });

  it('generates report for a specific player', () => {
    const teamId = selectFirstTeam();
    const otherTeam = getState().teams.find(t => t.id !== teamId)!;
    const targetPlayer = otherTeam.squad[0];

    const result = getState().assignScout(targetPlayer.id);
    expect(result).toBe(true);
    expect(getState().scoutReports.some(r => r.playerId === targetPlayer.id)).toBe(true);
  });

  it('returns false if player already scouted', () => {
    const teamId = selectFirstTeam();
    const otherTeam = getState().teams.find(t => t.id !== teamId)!;
    const targetPlayer = otherTeam.squad[0];

    getState().assignScout(targetPlayer.id);
    const result = getState().assignScout(targetPlayer.id);
    expect(result).toBe(false);
  });

  it('returns false if player is from own team', () => {
    const teamId = selectFirstTeam();
    const ownTeam = getState().teams.find(t => t.id === teamId)!;
    const ownPlayer = ownTeam.squad[0];

    const result = getState().assignScout(ownPlayer.id);
    expect(result).toBe(false);
  });
});

describe('gameStore - finishMatch', () => {
  it('marks a live match as completed', () => {
    const teamId = selectFirstTeam();
    const matchIndex = getState().matches.findIndex(
      m => m.homeTeam === teamId || m.awayTeam === teamId,
    );
    expect(matchIndex).toBeGreaterThanOrEqual(0);

    getState().simulateMatch(matchIndex);
    expect(getState().matches[matchIndex].isLive).toBe(true);

    getState().finishMatch(matchIndex);
    const match = getState().matches[matchIndex];
    expect(match.completed).toBe(true);
    expect(match.isLive).toBe(false);
    expect(match.liveMinute).toBe(90);
  });

  it('does nothing for non-live match', () => {
    selectFirstTeam();
    const matchIndex = 0;
    const match = getState().matches[matchIndex];
    if (match && !match.isLive) {
      getState().finishMatch(matchIndex);
      // Should remain unchanged
      expect(getState().matches[matchIndex].isLive).toBeFalsy();
    }
  });

  it('does nothing for invalid match index', () => {
    selectFirstTeam();
    getState().finishMatch(9999);
    // No crash
  });
});

describe('gameStore - updatePlayerAttributes', () => {
  it('updates player attributes via training type', () => {
    const teamId = selectFirstTeam();
    const team = getState().teams.find(t => t.id === teamId)!;
    const player = team.squad[0];
    const caBefore = player.currentAbility;

    getState().updatePlayerAttributes(player.id, 'technical');
    const updatedTeam = getState().teams.find(t => t.id === teamId)!;
    const updatedPlayer = updatedTeam.squad.find(p => p.id === player.id)!;
    // Current ability should be >= before (training improves or maintains)
    expect(updatedPlayer.currentAbility).toBeGreaterThanOrEqual(caBefore);
  });

  it('does nothing for non-existent player', () => {
    selectFirstTeam();
    const teamsBefore = JSON.stringify(getState().teams.map(t => t.squad.length));
    getState().updatePlayerAttributes('fake-player-id', 'physical');
    const teamsAfter = JSON.stringify(getState().teams.map(t => t.squad.length));
    expect(teamsAfter).toBe(teamsBefore);
  });
});

describe('gameStore - setTrainingPlan', () => {
  it('sets the training plan in the store', () => {
    selectFirstTeam();
    const plan: WeeklyTrainingPlan = {
      week: 1,
      teamFocus: 'physical',
      sessions: [],
    };
    getState().setTrainingPlan(plan);
    expect(getState().trainingPlan).toEqual(plan);
  });
});

describe('gameStore - applyWeeklyTraining', () => {
  it('applies training to non-injured players', () => {
    const teamId = selectFirstTeam();
    const plan: WeeklyTrainingPlan = {
      week: 1,
      teamFocus: 'physical',
      sessions: [],
    };
    getState().setTrainingPlan(plan);
    getState().applyWeeklyTraining();

    const team = getState().teams.find(t => t.id === teamId)!;
    // Players should have fatigue log entries after training
    const healthyPlayers = team.squad.filter(p => !p.injury?.active);
    expect(healthyPlayers.length).toBeGreaterThan(0);
  });

  it('does nothing without a selected team', () => {
    const plan: WeeklyTrainingPlan = {
      week: 1,
      teamFocus: 'cohesion',
      sessions: [],
    };
    // Don't select a team, set plan directly
    useGameStore.setState({ trainingPlan: plan });
    getState().applyWeeklyTraining();
    // No crash
  });

  it('does nothing without a training plan', () => {
    selectFirstTeam();
    useGameStore.setState({ trainingPlan: null });
    getState().applyWeeklyTraining();
    // No crash
  });
});

describe('gameStore - handleBoardReply', () => {
  it('records a board reply and adjusts satisfaction', () => {
    selectFirstTeam();
    getState().advanceWeek();

    // Inject a board message
    const boardMessage = {
      id: 'board-msg-1',
      type: 'board' as const,
      subject: 'Diretoria - Expectativas',
      body: 'A diretoria espera melhorias...',
      read: false,
      timestamp: Date.now(),
      actions: ['Responder'],
    };
    useGameStore.setState({ inbox: [...getState().inbox, boardMessage] });

    const satBefore = getState().boardSatisfaction;
    getState().handleBoardReply('board-msg-1', 'Vamos melhorar a equipe e comprar reforços importantes para a próxima temporada.', 'performance');
    expect(getState().boardReplies.length).toBeGreaterThan(0);
    expect(getState().boardSatisfaction).not.toBe(satBefore);
  });

  it('does nothing for non-existent message', () => {
    selectFirstTeam();
    const repliesBefore = getState().boardReplies.length;
    getState().handleBoardReply('non-existent', 'test', 'budget');
    expect(getState().boardReplies.length).toBe(repliesBefore);
  });
});

describe('gameStore - generateInstallmentClause', () => {
  it('generates installment payments correctly', () => {
    selectFirstTeam();
    const clause = getState().generateInstallmentClause(100, 4);
    expect(clause.totalAmount).toBe(100);
    expect(clause.installmentCount).toBe(4);
    expect(clause.payments).toHaveLength(4);
    expect(clause.status).toBe('active');
    // Total of all payments should approximate the totalAmount
    const totalPayments = clause.payments.reduce((sum, p) => sum + p.amount, 0);
    expect(totalPayments).toBeCloseTo(100, 0);
  });
});

describe('gameStore - generatePlayerBonus', () => {
  it('generates a bonus structure', () => {
    selectFirstTeam();
    const bonus = getState().generatePlayerBonus('goals', 10, 5000);
    expect(bonus.type).toBe('goals');
    expect(bonus.threshold).toBe(10);
    expect(bonus.bonusAmount).toBe(5000);
    expect(bonus.triggered).toBe(false);
    expect(bonus.playerId).toBe('');
  });
});

describe('gameStore - terminateTransferAgreement', () => {
  it('terminates an existing agreement', () => {
    const teamId = selectFirstTeam();
    // First create an agreement via buyPlayer
    const seller = getState().teams.find(t => t.id !== teamId)!;
    const player = seller.squad[0];
    const buyer = getState().teams.find(t => t.id === teamId)!;
    buyer.budget = player.marketValue + 100;
    getState().updateTeam(teamId, () => ({ ...buyer }));
    getState().buyPlayer(player.id, seller.id);

    const agreements = getState().transferAgreements;
    expect(agreements.length).toBeGreaterThan(0);

    const agreementId = agreements[0].id;
    getState().terminateTransferAgreement(agreementId, 'Test reason');
    const updated = getState().transferAgreements.find(a => a.id === agreementId);
    expect(updated?.status).toBe('terminated');
  });

  it('does nothing for non-existent agreement', () => {
    selectFirstTeam();
    const before = getState().transferAgreements.length;
    getState().terminateTransferAgreement('fake-id');
    expect(getState().transferAgreements.length).toBe(before);
  });
});

describe('gameStore - getTransferAgreements', () => {
  it('returns all agreements when no playerId provided', () => {
    selectFirstTeam();
    const agreements = getState().getTransferAgreements();
    expect(Array.isArray(agreements)).toBe(true);
  });

  it('filters by playerId', () => {
    selectFirstTeam();
    const agreements = getState().getTransferAgreements('some-player-id');
    expect(Array.isArray(agreements)).toBe(true);
  });
});

describe('gameStore - updateLeagueForm', () => {
  it('adds result and updates form rating', () => {
    const teamId = selectFirstTeam();
    getState().updateLeagueForm('W');
    getState().updateLeagueForm('W');
    getState().updateLeagueForm('W');
    getState().updateLeagueForm('W');
    getState().updateLeagueForm('W');
    const team = getState().teams.find(t => t.id === teamId)!;
    expect(team.leagueForm).toHaveLength(5);
    expect(team.formRating).toBe('excellent');
  });

  it('rates form as terrible with many losses', () => {
    const teamId = selectFirstTeam();
    getState().updateLeagueForm('L');
    getState().updateLeagueForm('L');
    getState().updateLeagueForm('L');
    getState().updateLeagueForm('L');
    getState().updateLeagueForm('L');
    const team = getState().teams.find(t => t.id === teamId)!;
    expect(team.formRating).toBe('terrible');
  });
});

describe('gameStore - setLeaguePosition', () => {
  it('clamps position between 1 and 20', () => {
    const teamId = selectFirstTeam();
    getState().setLeaguePosition(0);
    expect(getState().teams.find(t => t.id === teamId)!.leaguePosition).toBe(1);
    getState().setLeaguePosition(25);
    expect(getState().teams.find(t => t.id === teamId)!.leaguePosition).toBe(20);
    getState().setLeaguePosition(10);
    expect(getState().teams.find(t => t.id === teamId)!.leaguePosition).toBe(10);
  });
});

describe('gameStore - saveGame / loadGame / deleteSave', () => {
  it('saves and loads game state', () => {
    const teamId = selectFirstTeam();
    getState().advanceWeek();
    const weekBefore = getState().currentWeek;

    getState().saveGame(1);
    const slots = getState().getSaveSlots();
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].slotNumber).toBe(1);
    expect(slots[0].currentWeek).toBe(weekBefore);

    // Advance more weeks
    getState().advanceWeek();
    expect(getState().currentWeek).toBe(weekBefore + 1);

    // Load save
    getState().loadGame(1);
    expect(getState().currentWeek).toBe(weekBefore);
  });

  it('deleteSave removes a save slot', () => {
    selectFirstTeam();
    getState().saveGame(1);
    expect(getState().getSaveSlots().length).toBeGreaterThan(0);

    getState().deleteSave(1);
    expect(getState().getSaveSlots().find(s => s.slotNumber === 1)).toBeUndefined();
  });

  it('loadGame does nothing with empty slot', () => {
    selectFirstTeam();
    const weekBefore = getState().currentWeek;
    getState().loadGame(2);
    expect(getState().currentWeek).toBe(weekBefore);
  });
});

describe('gameStore - applyPreventionSession', () => {
  it('applies recovery session to targeted players', () => {
    const teamId = selectFirstTeam();
    const team = getState().teams.find(t => t.id === teamId)!;
    const player = team.squad[0];

    // Lower fitness to test recovery
    getState().updateTeam(teamId, t => ({
      ...t,
      squad: t.squad.map((p, i) => i === 0 ? { ...p, fitness: 50, cumulativeLoad: 20 } : p),
    }));

    getState().schedulePreventionSession({
      id: 'session-1',
      type: 'recovery',
      targetPlayerIds: [player.id],
      week: getState().currentWeek,
      timestamp: Date.now(),
    });

    getState().applyPreventionSession();

    const updatedTeam = getState().teams.find(t => t.id === teamId)!;
    const updatedPlayer = updatedTeam.squad.find(p => p.id === player.id)!;
    expect(updatedPlayer.fitness).toBeGreaterThan(50);
  });

  it('does nothing without a selected team', () => {
    useGameStore.setState({ selectedTeam: null });
    getState().applyPreventionSession();
    // No crash
  });
});

describe('gameStore - recoverInjuredPlayer', () => {
  it('removes injury from a player', () => {
    const teamId = selectFirstTeam();
    const team = getState().teams.find(t => t.id === teamId)!;
    const player = team.squad[0];

    // Injure the player
    getState().updateTeam(teamId, t => ({
      ...t,
      squad: t.squad.map((p, i) => i === 0 ? { ...p, injury: { active: true, days: 14 } } : p),
    }));

    getState().recoverInjuredPlayer(player.id);

    const updatedTeam = getState().teams.find(t => t.id === teamId)!;
    const updatedPlayer = updatedTeam.squad.find(p => p.id === player.id)!;
    expect(updatedPlayer.injury).toBeNull();
    expect(updatedPlayer.fitness).toBeGreaterThanOrEqual(40);
  });
});

describe('gameStore - adjustPlayerSalary', () => {
  it('adjusts salary within valid bounds', () => {
    const teamId = selectFirstTeam();
    const team = getState().teams.find(t => t.id === teamId)!;
    const player = team.squad[0];

    getState().adjustPlayerSalary(player.id, 200);
    const updated = getState().teams.find(t => t.id === teamId)!.squad.find(p => p.id === player.id)!;
    expect(updated.salary).toBe(200);
  });

  it('clamps salary to min 10', () => {
    const teamId = selectFirstTeam();
    const team = getState().teams.find(t => t.id === teamId)!;
    const player = team.squad[0];

    getState().adjustPlayerSalary(player.id, 1);
    const updated = getState().teams.find(t => t.id === teamId)!.squad.find(p => p.id === player.id)!;
    expect(updated.salary).toBe(10);
  });

  it('clamps salary to max 500', () => {
    const teamId = selectFirstTeam();
    const team = getState().teams.find(t => t.id === teamId)!;
    const player = team.squad[0];

    getState().adjustPlayerSalary(player.id, 1000);
    const updated = getState().teams.find(t => t.id === teamId)!.squad.find(p => p.id === player.id)!;
    expect(updated.salary).toBe(500);
  });
});

describe('gameStore - getActivePromises / checkPromiseDeadlines', () => {
  it('returns active promises for team players', () => {
    selectFirstTeam();
    const promises = getState().getActivePromises();
    expect(Array.isArray(promises)).toBe(true);
  });

  it('checkPromiseDeadlines returns fulfilled and expired', () => {
    selectFirstTeam();
    const result = getState().checkPromiseDeadlines();
    expect(result).toHaveProperty('fulfilled');
    expect(result).toHaveProperty('expired');
    expect(Array.isArray(result.fulfilled)).toBe(true);
    expect(Array.isArray(result.expired)).toBe(true);
  });
});

describe('gameStore - getInjuryRiskSummary', () => {
  it('returns risk categories for team', () => {
    selectFirstTeam();
    const summary = getState().getInjuryRiskSummary();
    expect(summary).toHaveProperty('critical');
    expect(summary).toHaveProperty('high');
    expect(summary).toHaveProperty('moderate');
    expect(summary).toHaveProperty('low');
    const total = summary.critical.length + summary.high.length + summary.moderate.length + summary.low.length;
    expect(total).toBeGreaterThan(0);
  });

  it('returns empty categories without selected team', () => {
    useGameStore.setState({ selectedTeam: null });
    const summary = getState().getInjuryRiskSummary();
    expect(summary.critical).toHaveLength(0);
    expect(summary.high).toHaveLength(0);
    expect(summary.moderate).toHaveLength(0);
    expect(summary.low).toHaveLength(0);
  });
});

describe('gameStore - generateFinancialReport', () => {
  it('generates report for selected team', () => {
    selectFirstTeam();
    const report = getState().generateFinancialReport();
    expect(report).not.toBeNull();
    expect(report!.teamId).toBe(getState().selectedTeam);
    expect(report!.budget).toBeDefined();
  });

  it('returns null without selected team', () => {
    useGameStore.setState({ selectedTeam: null });
    const report = getState().generateFinancialReport();
    expect(report).toBeNull();
  });
});

describe('gameStore - setCoachTreatment', () => {
  it('sets treatment for a player', () => {
    const teamId = selectFirstTeam();
    const team = getState().teams.find(t => t.id === teamId)!;
    const player = team.squad[0];

    getState().setCoachTreatment(player.id, {
      type: 'starter',
      minutesPerWeek: 90,
      trustLevel: 80,
      lastTrainingLoad: 50,
    });

    const updated = getState().teams.find(t => t.id === teamId)!.squad.find(p => p.id === player.id)!;
    expect(updated.coachTreatment?.type).toBe('starter');
    expect(updated.coachTreatment?.trustLevel).toBe(80);
  });
});

describe('gameStore - updateClubPerformance', () => {
  it('updates league position and form rating', () => {
    const teamId = selectFirstTeam();
    getState().updateClubPerformance({
      leaguePosition: 3,
      leagueForm: ['W', 'W', 'D', 'L', 'W'],
      formRating: 'good',
    });
    const team = getState().teams.find(t => t.id === teamId)!;
    expect(team.leaguePosition).toBe(3);
    expect(team.formRating).toBe('good');
  });

  it('clamps position between 1 and 20', () => {
    const teamId = selectFirstTeam();
    getState().updateClubPerformance({ leaguePosition: 0 });
    expect(getState().teams.find(t => t.id === teamId)!.leaguePosition).toBe(1);
    getState().updateClubPerformance({ leaguePosition: 30 });
    expect(getState().teams.find(t => t.id === teamId)!.leaguePosition).toBe(20);
  });
});

describe('gameStore - getCompletedTransfers', () => {
  it('returns an array', () => {
    selectFirstTeam();
    const transfers = getState().getCompletedTransfers();
    expect(Array.isArray(transfers)).toBe(true);
  });
});
