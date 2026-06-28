import { create } from 'zustand';
import type {
  GameStore, Player, Team, InjuryReport, FinancialReport,
  FatigueLogEntry, PlayerPromise,
  TransferAgreement, SocialTree,
  ReserveTeamPlayer, CompletedTransfer,
  PreventionSession, WeeklyTrainingPlan, BoardReply,
  NegotiationResult,
} from '../types/game';
import { apiAction, apiPost } from '../api/client';

// ============================================================
// HELPER FUNCTIONS (mirrored from backend for local getters)
// ============================================================

function calculateFatigueLevel(player: Player, currentWeek: number): number {
  const last3Days = (player.fatigueLog || []).filter(
    (entry: any) => entry.week === currentWeek && Math.abs(entry.day - player.lastTrainingDay) <= 3
  );
  const avgFatigue = last3Days.reduce((sum, entry: any) => sum + entry.fatigue, 0) / Math.max(last3Days.length, 1);
  return avgFatigue;
}

function calculatePlayerInjuryRisk(player: Player, facilitiesLevel: number, staffLevel: number, currentWeek: number): number {
  let risk = 0;
  risk += player.hidden.injuryProneness * 3;
  const consecutiveBonus = Math.pow(1.5, player.consecutivePhysicalDays) * 5;
  risk += consecutiveBonus;
  const loadPenalty = Math.max(0, player.cumulativeLoad - 5) * 3;
  risk += loadPenalty;
  if (player.fitness < 50) risk += (50 - player.fitness) * 0.3;
  if (player.recoveryNeeded) risk += 15;
  if (player.injury?.active) risk += 40;
  const previousInjuries = player.injuryHistory?.filter(ih => !ih.fullyRecovered).length || 0;
  risk += previousInjuries * 10;
  const fatigueLevel = calculateFatigueLevel(player, currentWeek);
  if (fatigueLevel > 60) risk += 15;
  else if (fatigueLevel > 40) risk += 8;
  if (player.degradedCondition) {
    if (player.degradedCondition === 'minimal') risk += 20;
    else if (player.degradedCondition === 'low') risk += 12;
    else if (player.degradedCondition === 'moderate') risk += 6;
  }
  const facilityReduction = Math.min(20, facilitiesLevel * 2);
  const staffReduction = Math.min(15, staffLevel * 1.5);
  risk = Math.max(0, risk - facilityReduction - staffReduction);
  return Math.min(100, risk);
}

function getRiskLevel(risk: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (risk >= 80) return 'critical';
  if (risk >= 60) return 'high';
  if (risk >= 30) return 'moderate';
  return 'low';
}

// ============================================================
// INITIAL STATE
// ============================================================

const INITIAL_STATE = {
  selectedTeam: null as string | null,
  currentWeek: 0,
  currentSeason: 1,
  matches: [] as any[],
  teams: [] as Team[],
  transfers: [] as any[],
  incomingTransfers: [] as any[],
  counterOffers: [] as any[],
  deferredTransfers: [] as any[],
  inbox: [] as any[],
  trainingPlan: null as WeeklyTrainingPlan | null,
  youthIntakeCompleted: false,
  scoutReports: [] as any[],
  pendingInstallments: [] as any[],
  incomingBonuses: [] as any[],
  transferAgreements: [] as TransferAgreement[],
  boardReplies: [] as BoardReply[],
  boardSatisfaction: 50,
  financialReports: [] as FinancialReport[],
  injuryHistory: [] as any[],
  preventionSessions: [] as PreventionSession[],
  fatigueLog: [] as FatigueLogEntry[],
  recommendations: [] as any[],
  degradedConditions: [] as any[],
  socialTree: null as SocialTree | null,
  leagueTable: [] as any[],
  saveSlots: [] as any[],
  youthAcademy: { players: [], level: 1, weeklySlots: 3, currentTraining: 'technical', graduationRate: 20 },
  reserveTeam: [] as ReserveTeamPlayer[],
  completedTransfers: [] as CompletedTransfer[],
};

// ============================================================
// STORE
// ============================================================

function syncFromResponse(data: { result?: any; state: any }) {
  useGameStore.setState(data.state);
}

export const useGameStore = create<GameStore>()((set, get) => ({
  ...INITIAL_STATE,

  // ============================================================
  // GETTERS — computed locally from state
  // ============================================================

  getSaveSlots: () => {
    return (get().saveSlots ?? []).map((s: any) => s.metadata);
  },

  calculateInjuryRisk: (playerId: string): number => {
    const state = get();
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return 0;
    const player = team.squad.find(p => p.id === playerId);
    if (!player) return 0;
    return calculatePlayerInjuryRisk(player, team.facilitiesLevel, team.staffLevel, state.currentWeek);
  },

  getInjuryRiskSummary: () => {
    const state = get();
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return { critical: [], high: [], moderate: [], low: [] };
    const summary = { critical: [] as Player[], high: [] as Player[], moderate: [] as Player[], low: [] as Player[] };
    team.squad.forEach(player => {
      const risk = calculatePlayerInjuryRisk(player, team.facilitiesLevel, team.staffLevel, state.currentWeek);
      const level = getRiskLevel(risk);
      if (level === 'critical') summary.critical.push(player);
      else if (level === 'high') summary.high.push(player);
      else if (level === 'moderate') summary.moderate.push(player);
      else summary.low.push(player);
    });
    return summary;
  },

  getActivePromises: () => {
    const state = get();
    if (!state.selectedTeam) return [];
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return [];
    const activePromises: { player: Player; promise: PlayerPromise; weeksLeft: number }[] = [];
    team.squad.forEach(player => {
      player.promises.forEach(promise => {
        if (!promise.fulfilled && promise.deadline > 0) {
          activePromises.push({ player, promise, weeksLeft: promise.deadline });
        }
      });
    });
    return activePromises;
  },

  getTransferAgreements: (playerId?: string) => {
    const state = get();
    if (playerId) return state.transferAgreements.filter(a => a.playerId === playerId);
    return state.transferAgreements;
  },

  getSocialTree: () => get().socialTree ?? null,

  getYouthPlayers: () => get().youthAcademy.players,

  getReserveTeam: () => get().reserveTeam,

  getCompletedTransfers: () => get().completedTransfers,

  getFatigueHistory: (playerId: string) => {
    const state = get();
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return [];
    const player = team.squad.find(p => p.id === playerId);
    return player?.fatigueLog || [];
  },

  getAttributeDelta: (playerId: string, attributeName: string, weekA: number, weekB: number) => {
    const state = get();
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return 0;
    const player = team.squad.find(p => p.id === playerId);
    if (!player || !player.attributeHistory) return 0;
    const snapA = player.attributeHistory.find(h => h.week === weekA);
    const snapB = player.attributeHistory.find(h => h.week === weekB);
    if (!snapA || !snapB) return 0;
    const from = (snapA as any)[attributeName] ?? 0;
    const to = (snapB as any)[attributeName] ?? 0;
    return Math.round((to - from) * 100) / 100;
  },

  getPlayerAttributeProgression: (playerId: string) => {
    const state = get();
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team || !team.squad) return [];
    const player = team.squad.find(p => p.id === playerId);
    if (!player || !player.attributeHistory) return [];
    const progression: { week: number; changes: Record<string, { from: number; to: number }> }[] = [];
    for (let i = 1; i < player.attributeHistory.length; i++) {
      const prev = player.attributeHistory[i - 1];
      const curr = player.attributeHistory[i];
      const changes: Record<string, { from: number; to: number }> = {};
      const techKeys = Object.keys(prev.technical || {});
      techKeys.forEach(key => {
        const from = (prev.technical as any)[key] ?? 0;
        const to = (curr.technical as any)[key] ?? 0;
        if (from !== to) changes[`technical_${key}`] = { from, to };
      });
      const mentalKeys = Object.keys(prev.mental || {});
      mentalKeys.forEach(key => {
        const from = (prev.mental as any)[key] ?? 0;
        const to = (curr.mental as any)[key] ?? 0;
        if (from !== to) changes[`mental_${key}`] = { from, to };
      });
      const physKeys = Object.keys(prev.physical || {});
      physKeys.forEach(key => {
        const from = (prev.physical as any)[key] ?? 0;
        const to = (curr.physical as any)[key] ?? 0;
        if (from !== to) changes[`physical_${key}`] = { from, to };
      });
      if (prev.currentAbility !== curr.currentAbility) changes['currentAbility'] = { from: prev.currentAbility, to: curr.currentAbility };
      if (prev.morale !== curr.morale) changes['morale'] = { from: prev.morale, to: curr.morale };
      if (prev.form !== curr.form) changes['form'] = { from: prev.form, to: curr.form };
      if (prev.fitness !== curr.fitness) changes['fitness'] = { from: prev.fitness, to: curr.fitness };
      progression.push({ week: curr.week, changes });
    }
    return progression;
  },

  getInjuryReport: (playerId: string): InjuryReport | null => {
    const state = get();
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return null;
    const player = team.squad.find(p => p.id === playerId);
    if (!player || !player.injury?.active) return null;
    const injuryTypes = ['muscle', 'ligament', 'joint', 'ankle', 'knee', 'groin'];
    const hash = playerId.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const injuryType = injuryTypes[hash % injuryTypes.length];
    const days = player.injury.days;
    const severity: InjuryReport['severity'] = days <= 7 ? 'minor' : days <= 21 ? 'moderate' : 'severe';
    const treatments = {
      minor: 'Descanso e gelo. Retorno ao treino gradual.',
      moderate: 'Fisioterapia e descanso. Sem participação em partidas.',
      severe: 'Possível necessidade de cirurgia. Longo afastamento.',
    };
    const prognoses = {
      minor: 'Recuperação completa esperada em breve.',
      moderate: 'Recuperação completa, mas com risco de recorrência.',
      severe: 'Recuperação longa. Risco de sequelas.',
    };
    return {
      playerId,
      playerName: `${player.name} ${player.surname}`,
      position: player.position,
      injuryType,
      severity,
      daysOut: days,
      recoveryProgress: Math.max(0, 100 - (days * 5)),
      treatment: treatments[severity],
      prognosis: prognoses[severity],
      injuryProneness: player.hidden.injuryProneness,
    };
  },

  generateFinancialReport: (): FinancialReport | null => {
    const state = get();
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return null;
    const ticketRevenue = (team.reputation / 100) * 0.5;
    const sponsorship = (team.reputation / 100) * 0.3;
    const totalIncome = ticketRevenue + sponsorship;
    const totalExpenses = team.wageBill * (12 / 52);
    const profit = totalIncome - totalExpenses;
    const transferSpending = state.transferAgreements
      .filter(a => a.toTeamId === state.selectedTeam)
      .reduce((sum, a) => sum + a.transferFee, 0);
    const transferIncome = state.transferAgreements
      .filter(a => a.fromTeamId === state.selectedTeam)
      .reduce((sum, a) => sum + a.transferFee, 0);
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
      set({ financialReports: [report, ...state.financialReports].slice(0, 50) });
      apiAction('getFinancialReport', []);
    }
    return report;
  },

  checkPromiseDeadlines: () => {
    const state = get();
    if (!state.selectedTeam) return { fulfilled: [], expired: [] };
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return { fulfilled: [], expired: [] };
    const expired: PlayerPromise[] = [];
    team.squad.forEach(player => {
      player.promises.forEach(promise => {
        if (!promise.fulfilled && promise.deadline <= 0) expired.push(promise);
      });
    });
    return { fulfilled: [], expired };
  },

  // ============================================================
  // MUTATIONS — delegated to backend API
  // ============================================================

  initGame: () => {
    apiPost('/init', {}).then(syncFromResponse);
  },

  deselectTeam: () => {
    apiAction('deselectTeam', []).then(syncFromResponse);
  },

  selectTeam: (teamId: string) => {
    apiAction('selectTeam', [teamId]).then(syncFromResponse);
  },

  // updateTeam: compute locally for instant UI feedback, sync to backend
  updateTeam: (teamId: string, updater: (team: Team) => Team) => {
    const state = get();
    const team = state.teams.find(t => t.id === teamId);
    if (!team) return;
    const newTeam = updater({ ...team });
    set({ teams: state.teams.map(t => (t.id === teamId ? newTeam : t)) });
    apiAction('updateTeam', [teamId, newTeam]);
  },

  simulateMatch: (matchIndex: number) => {
    apiAction('simulateMatch', [matchIndex]).then(syncFromResponse);
  },

  advanceWeek: () => {
    apiAction('advanceWeek', []).then(syncFromResponse);
  },

  markAsRead: (messageId: string) => {
    apiAction('markAsRead', [messageId]).then(syncFromResponse);
  },

  removeMessage: (messageId: string) => {
    apiAction('removeMessage', [messageId]).then(syncFromResponse);
  },

  updatePlayerAttributes: (playerId: string, trainingType: string) => {
    apiAction('updatePlayerAttributes', [playerId, trainingType]).then(syncFromResponse);
  },

  completeYouthIntake: () => {
    apiAction('completeYouthIntake', []).then(syncFromResponse);
  },

  buyPlayer: (playerId: string, sellerTeamId: string) => {
    return apiAction('buyPlayer', [playerId, sellerTeamId]).then(data => {
      syncFromResponse(data);
      return data.result as boolean;
    }) as any;
  },

  makeOffer: (playerId: string, sellerTeamId: string, offerPrice: number, negotiationRound?: number) => {
    const args = negotiationRound ? [playerId, sellerTeamId, offerPrice, negotiationRound] : [playerId, sellerTeamId, offerPrice];
    return apiAction('makeOffer', args).then(data => {
      syncFromResponse(data);
      return data.result as NegotiationResult;
    }) as any;
  },

  acceptOffer: (playerId: string, sellerTeamId: string, offerPrice: number) => {
    return apiAction('acceptOffer', [playerId, sellerTeamId, offerPrice]).then(data => {
      syncFromResponse(data);
      return data.result as boolean;
    }) as any;
  },

  acceptIncomingTransfer: (playerId: string) => {
    apiAction('acceptIncomingTransfer', [playerId]).then(syncFromResponse);
  },

  rejectIncomingTransfer: (playerId: string) => {
    apiAction('rejectIncomingTransfer', [playerId]).then(syncFromResponse);
  },

  deferTransfer: (playerId: string) => {
    apiAction('deferTransfer', [playerId]).then(syncFromResponse);
  },

  reinstateDeferredTransfer: (playerId: string) => {
    apiAction('reinstateDeferredTransfer', [playerId]).then(syncFromResponse);
  },

  rejectDeferredTransfer: (playerId: string) => {
    apiAction('rejectDeferredTransfer', [playerId]).then(syncFromResponse);
  },

  assignScout: (playerId?: string) => {
    return apiAction('assignScout', playerId ? [playerId] : []).then(data => {
      syncFromResponse(data);
      return data.result as boolean;
    }) as any;
  },

  setTrainingPlan: (plan: WeeklyTrainingPlan) => {
    apiAction('setTrainingPlan', [plan]).then(syncFromResponse);
  },

  applyWeeklyTraining: () => {
    apiAction('applyWeeklyTraining', []).then(syncFromResponse);
  },

  handleInboxAction: (messageId: string, actionLabel: string) => {
    apiAction('handleInboxAction', [messageId, actionLabel]).then(syncFromResponse);
  },

  applyMatchIntervention: (matchIndex: number, type: 'substitution' | 'shout') => {
    apiAction('applyMatchIntervention', [matchIndex, type]).then(syncFromResponse);
  },

  negotiateCounterOffer: (playerId: string) => {
    return apiAction('negotiateCounterOffer', [playerId]).then(data => {
      syncFromResponse(data);
      return data.result as boolean;
    }) as any;
  },

  payInstallment: (installmentId: string) => {
    return apiAction('payInstallment', [installmentId]).then(data => {
      syncFromResponse(data);
      return data.result as boolean;
    }) as any;
  },

  checkBonuses: (playerId?: string) => {
    apiAction('checkBonuses', [playerId]).then(syncFromResponse);
  },

  claimBonus: (bonusId: string) => {
    apiAction('claimBonus', [bonusId]).then(syncFromResponse);
  },

  terminateTransferAgreement: (agreementId: string, reason?: string) => {
    apiAction('terminateTransferAgreement', [agreementId, reason]).then(syncFromResponse);
  },

  handleBoardReply: (messageId: string, response: string, category: BoardReply['category']) => {
    apiAction('handleBoardReply', [messageId, response, category]).then(syncFromResponse);
  },

  schedulePreventionSession: (session: PreventionSession) => {
    apiAction('schedulePreventionSession', [session]).then(syncFromResponse);
  },

  applyPreventionSession: () => {
    apiAction('applyPreventionSession', []).then(syncFromResponse);
  },

  updatePlayerLoad: (playerId: string, day: number, trainingType: string) => {
    apiAction('updatePlayerLoad', [playerId, day, trainingType]).then(syncFromResponse);
  },

  recoverInjuredPlayer: (playerId: string) => {
    apiAction('recoverInjuredPlayer', [playerId]).then(syncFromResponse);
  },

  applyFatigueDecay: () => {
    apiAction('applyFatigueDecay', []).then(syncFromResponse);
  },

  generateInjuryRecommendation: (playerId: string) => {
    apiAction('generateInjuryRecommendation', [playerId]).then(syncFromResponse);
  },

  applyPostInjuryCondition: (playerId: string) => {
    apiAction('applyPostInjuryCondition', [playerId]).then(syncFromResponse);
  },

  acknowledgeRecommendation: (recommendationId: string) => {
    apiAction('acknowledgeRecommendation', [recommendationId]).then(syncFromResponse);
  },

  applyTrainingCooldown: (playerId: string, trainingType: string, day: number) => {
    apiAction('applyTrainingCooldown', [playerId, trainingType, day]).then(syncFromResponse);
  },

  updateDegradedConditions: () => {
    apiAction('updateDegradedConditions', []).then(syncFromResponse);
  },

  generateLiveMatchMinute: (matchIndex: number) => {
    apiAction('generateLiveMatchMinute', [matchIndex]).then(syncFromResponse);
  },

  finishMatch: (matchIndex: number) => {
    apiAction('finishMatch', [matchIndex]).then(syncFromResponse);
  },

  captureWeeklyAttributeSnapshot: () => {
    apiAction('captureWeeklyAttributeSnapshot', []).then(syncFromResponse);
  },

  generateSocialTree: () => {
    apiAction('generateSocialTree', []).then(syncFromResponse);
  },

  updateSocialConnections: (playerIdA: string, playerIdB: string, strength: number) => {
    apiAction('updateSocialConnections', [playerIdA, playerIdB, strength]).then(syncFromResponse);
  },

  updatePromiseCountdown: () => {
    apiAction('updatePromiseCountdown', []).then(syncFromResponse);
  },

  adjustPlayerSalary: (playerId: string, newSalary: number) => {
    apiAction('adjustPlayerSalary', [playerId, newSalary]).then(syncFromResponse);
  },

  saveGame: (slotNumber: 1 | 2) => {
    apiAction('saveGame', [slotNumber]).then(syncFromResponse);
  },

  loadGame: (slotNumber: 1 | 2) => {
    apiAction('loadGame', [slotNumber]).then(syncFromResponse);
  },

  deleteSave: (slotNumber: 1 | 2) => {
    apiAction('deleteSave', [slotNumber]).then(syncFromResponse);
  },

  generateYouthPlayers: () => {
    apiAction('generateYouthPlayers', []).then(syncFromResponse);
  },

  promoteYouthPlayer: (playerId: string) => {
    apiAction('promoteYouthPlayer', [playerId]).then(syncFromResponse);
  },

  setAcademyTraining: (type: string) => {
    apiAction('setAcademyTraining', [type]).then(syncFromResponse);
  },

  addPlayerToReserve: (playerId: string) => {
    apiAction('addPlayerToReserve', [playerId]).then(syncFromResponse);
  },

  promoteFromReserve: (playerId: string) => {
    apiAction('promoteFromReserve', [playerId]).then(syncFromResponse);
  },

  setReserveTraining: (type: string) => {
    apiAction('setReserveTraining', [type]).then(syncFromResponse);
  },
}));
