import { create } from 'zustand';
import type {
  GameStore, Player, Team, InjuryReport, FinancialReport,
  FatigueLogEntry, PlayerPromise,
  TransferAgreement, SocialTree,
  ReserveTeamPlayer, CompletedTransfer,
  PreventionSession, WeeklyTrainingPlan, BoardReply,
  NegotiationResult,
  ContractNegotiationResult,
  PreMatchAnalysis,
  PressConference, PressResponseTone,
} from '../types/game';
import { apiAction, apiPost } from '../api/client';
import { getFullName } from '../utils/player';
import { calculateTicketRevenue, calculateSponsorshipRevenue, calculateBroadcastingRevenue, calculateFacilityCosts, calculateStaffCosts, weeklyWages } from '../utils/finance';

// ============================================================
// HELPER FUNCTIONS (mirrored from backend for local getters)
// ============================================================

function calculateFatigueLevel(player: Player, currentWeek: number): number {
  const last3Days = (player.fatigueLog || []).filter(
    (entry: any) => entry.week === currentWeek && Math.abs(entry.day - player.lastTrainingDay) <= 3
  );
  if (last3Days.length === 0) return 50;
  const avgFatigue = last3Days.reduce((sum, entry: any) => sum + entry.fatigue, 0) / last3Days.length;
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
  scoutKnowledge: {} as Record<string, number>,
  scoutMissions: [] as any[],
  shortlist: [] as any[],
  scoutRecommendations: [] as any[],
  activeLoans: [] as any[],
  biddingWars: [] as any[],
  seasonSummary: null as any,
  gameOver: false,
  pressConferences: [] as any[],
  fanMood: { value: 50, trend: 'stable' as const, sentiment: 'neutral' as const },
  mediaPressure: { value: 50, level: 'low' as const },
  isAdvancing: false,
  matchBlockMessage: null as string | null,
};

// ============================================================
// STORE
// ============================================================

function syncFromResponse(data: { result?: any; state: any }) {
  useGameStore.setState(data.state);
}

function findInjuredInXI(state: GameStore): Player | null {
  if (!state.selectedTeam) return null;
  const team = state.teams.find(t => t.id === state.selectedTeam);
  if (!team) return null;
  return (team.startingXI ?? [])
    .map(id => team.squad.find(p => p.id === id))
    .find(p => p?.injury?.active) ?? null;
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
    const injuryType = player.injury.type || 'muscle';
    const days = player.injury.daysRemaining;
    const severity = player.injury.severity;
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
      playerName: getFullName(player),
      position: player.position,
      injuryType,
      severity,
      daysOut: days,
      recoveryProgress: player.injury.totalDays > 0
        ? Math.max(0, Math.round(100 - (days / player.injury.totalDays) * 100))
        : 100,
      treatment: treatments[severity],
      prognosis: prognoses[severity],
      injuryProneness: player.hidden.injuryProneness,
    };
  },

  generateFinancialReport: (): FinancialReport | null => {
    const state = get();
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return null;
    const ticketRevenue = calculateTicketRevenue(team.reputation);
    const sponsorship = calculateSponsorshipRevenue(team.reputation);
    const broadcasting = calculateBroadcastingRevenue(team.reputation);
    const facilityCosts = calculateFacilityCosts(team.facilitiesLevel);
    const staffCosts = calculateStaffCosts(team.staffLevel);
    const weeklyWageCost = weeklyWages(team.wageBill);
    const totalIncome = ticketRevenue + sponsorship + broadcasting;
    const totalExpenses = weeklyWageCost + facilityCosts + staffCosts;
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
      set({ financialReports: [report, ...state.financialReports].slice(0, 50) });
      apiAction('getFinancialReport', []).catch(err => console.error('API action failed:', err));
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
    apiPost('/init', {}).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  deselectTeam: () => {
    apiAction('deselectTeam', []).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  selectTeam: (teamId: string) => {
    apiAction('selectTeam', [teamId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  // updateTeam: compute locally for instant UI feedback, sync to backend
  updateTeam: (teamId: string, updater: (team: Team) => Team) => {
    const state = get();
    const team = state.teams.find(t => t.id === teamId);
    if (!team) return;
    const newTeam = updater({ ...team });
    set({ teams: state.teams.map(t => (t.id === teamId ? newTeam : t)) });
    apiAction('updateTeam', [teamId, newTeam]).catch(err => console.error('API action failed:', err));
  },

  simulateMatch: (matchIndex: number) => {
    const injured = findInjuredInXI(get());
    if (injured) {
      set({ matchBlockMessage: `Partida não pode iniciar: ${getFullName(injured)} lesionado` });
      return;
    }
    set({ matchBlockMessage: null });
    apiAction('simulateMatch', [matchIndex]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  advanceWeek: () => {
    if (get().isAdvancing) return;
    const injured = findInjuredInXI(get());
    if (injured) {
      set({ matchBlockMessage: `Partida não pode iniciar: ${getFullName(injured)} lesionado` });
      return;
    }
    set({ isAdvancing: true, matchBlockMessage: null });
    apiAction('advanceWeek', []).then(data => {
      syncFromResponse(data);
      set({ isAdvancing: false });
    }).catch(err => {
      console.error('API action "advanceWeek" failed:', err);
      set({ isAdvancing: false });
    });
  },

  markAsRead: (messageId: string) => {
    apiAction('markAsRead', [messageId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  removeMessage: (messageId: string) => {
    apiAction('removeMessage', [messageId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  updatePlayerAttributes: (playerId: string, trainingType: string) => {
    apiAction('updatePlayerAttributes', [playerId, trainingType]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  completeYouthIntake: () => {
    apiAction('completeYouthIntake', []).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  buyPlayer: (playerId: string, sellerTeamId: string) => {
    return apiAction('buyPlayer', [playerId, sellerTeamId]).then(data => {
      syncFromResponse(data);
      return data.result as boolean;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  makeOffer: (playerId: string, sellerTeamId: string, offerPrice: number, negotiationRound?: number) => {
    const args = negotiationRound ? [playerId, sellerTeamId, offerPrice, negotiationRound] : [playerId, sellerTeamId, offerPrice];
    return apiAction('makeOffer', args).then(data => {
      syncFromResponse(data);
      return data.result as NegotiationResult;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  acceptOffer: (playerId: string, sellerTeamId: string, offerPrice: number, agreedSalary: number) => {
    return apiAction('acceptOffer', [playerId, sellerTeamId, offerPrice, agreedSalary]).then(data => {
      syncFromResponse(data);
      return data.result as boolean;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  negotiatePlayerContract: (playerId: string, sellerTeamId: string, offeredSalary: number, negotiationRound: number) => {
    return apiAction('negotiatePlayerContract', [playerId, sellerTeamId, offeredSalary, negotiationRound]).then(data => {
      syncFromResponse(data);
      return data.result as ContractNegotiationResult;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  acceptIncomingTransfer: (playerId: string) => {
    apiAction('acceptIncomingTransfer', [playerId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  rejectIncomingTransfer: (playerId: string) => {
    apiAction('rejectIncomingTransfer', [playerId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  deferTransfer: (playerId: string) => {
    apiAction('deferTransfer', [playerId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  reinstateDeferredTransfer: (playerId: string) => {
    apiAction('reinstateDeferredTransfer', [playerId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  rejectDeferredTransfer: (playerId: string) => {
    apiAction('rejectDeferredTransfer', [playerId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  assignScout: (playerId?: string) => {
    return apiAction('assignScout', playerId ? [playerId] : []).then(data => {
      syncFromResponse(data);
      return data.result as boolean;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  setTrainingPlan: (plan: WeeklyTrainingPlan) => {
    apiAction('setTrainingPlan', [plan]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  applyWeeklyTraining: () => {
    apiAction('applyWeeklyTraining', []).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  handleInboxAction: (messageId: string, actionLabel: string) => {
    apiAction('handleInboxAction', [messageId, actionLabel]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  applyMatchIntervention: (matchIndex: number, type: 'substitution' | 'shout') => {
    apiAction('applyMatchIntervention', [matchIndex, type]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  substitutePlayer: (matchIndex: number, outId: string, inId: string) => {
    apiAction('substitutePlayer', [matchIndex, outId, inId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  applyShout: (matchIndex: number, shout: 'encourage' | 'demand' | 'praise' | 'calm') => {
    apiAction('applyShout', [matchIndex, shout]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  negotiateCounterOffer: (playerId: string) => {
    return apiAction('negotiateCounterOffer', [playerId]).then(data => {
      syncFromResponse(data);
      return data.result as boolean;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  payInstallment: (installmentId: string) => {
    return apiAction('payInstallment', [installmentId]).then(data => {
      syncFromResponse(data);
      return data.result as boolean;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  checkBonuses: (playerId?: string) => {
    apiAction('checkBonuses', [playerId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  claimBonus: (bonusId: string) => {
    apiAction('claimBonus', [bonusId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  terminateTransferAgreement: (agreementId: string, reason?: string) => {
    const args = reason ? [agreementId, reason] : [agreementId];
    apiAction('terminateTransferAgreement', args).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  handleBoardReply: (messageId: string, response: string, category: BoardReply['category']) => {
    apiAction('handleBoardReply', [messageId, response, category]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  schedulePreventionSession: (session: PreventionSession) => {
    apiAction('schedulePreventionSession', [session]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  applyPreventionSession: () => {
    apiAction('applyPreventionSession', []).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  updatePlayerLoad: (playerId: string, day: number, trainingType: string) => {
    apiAction('updatePlayerLoad', [playerId, day, trainingType]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  recoverInjuredPlayer: (playerId: string) => {
    apiAction('recoverInjuredPlayer', [playerId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  applyFatigueDecay: () => {
    apiAction('applyFatigueDecay', []).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  generateInjuryRecommendation: (playerId: string) => {
    apiAction('generateInjuryRecommendation', [playerId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  applyPostInjuryCondition: (playerId: string) => {
    apiAction('applyPostInjuryCondition', [playerId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  acknowledgeRecommendation: (recommendationId: string) => {
    apiAction('acknowledgeRecommendation', [recommendationId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  applyTrainingCooldown: (playerId: string, trainingType: string, day: number) => {
    apiAction('applyTrainingCooldown', [playerId, trainingType, day]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  updateDegradedConditions: () => {
    apiAction('updateDegradedConditions', []).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  generateLiveMatchMinute: (matchIndex: number) => {
    apiAction('generateLiveMatchMinute', [matchIndex]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  finishMatch: (matchIndex: number) => {
    apiAction('finishMatch', [matchIndex]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  captureWeeklyAttributeSnapshot: () => {
    apiAction('captureWeeklyAttributeSnapshot', []).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  generateSocialTree: () => {
    apiAction('generateSocialTree', []).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  updateSocialConnections: (playerIdA: string, playerIdB: string, strength: number) => {
    apiAction('updateSocialConnections', [playerIdA, playerIdB, strength]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  updatePromiseCountdown: () => {
    apiAction('updatePromiseCountdown', []).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  adjustPlayerSalary: (playerId: string, newSalary: number) => {
    apiAction('adjustPlayerSalary', [playerId, newSalary]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  saveGame: (slotNumber: 1 | 2) => {
    return apiAction('saveGame', [slotNumber]).then(syncFromResponse);
  },

  loadGame: (slotNumber: 1 | 2) => {
    apiAction('loadGame', [slotNumber]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  deleteSave: (slotNumber: 1 | 2) => {
    apiAction('deleteSave', [slotNumber]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  generateYouthPlayers: () => {
    apiAction('generateYouthPlayers', []).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  promoteYouthPlayer: (playerId: string) => {
    apiAction('promoteYouthPlayer', [playerId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  setAcademyTraining: (type: string) => {
    apiAction('setAcademyTraining', [type]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  addPlayerToReserve: (playerId: string) => {
    apiAction('addPlayerToReserve', [playerId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  promoteFromReserve: (playerId: string) => {
    apiAction('promoteFromReserve', [playerId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  setReserveTraining: (type: string) => {
    apiAction('setReserveTraining', [type]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  assignScoutMission: (scoutId: string, targetId: string, weeks: number) => {
    return apiAction('assignScoutMission', [scoutId, targetId, weeks]).then(data => {
      syncFromResponse(data);
      return data.result as boolean;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  getScoutKnowledge: (playerId: string) => {
    return get().scoutKnowledge[playerId] ?? 0;
  },

  // Shortlist
  addToShortlist: (playerId: string, priority?: 'high' | 'medium' | 'low', notes?: string) => {
    const args = priority ? (notes ? [playerId, priority, notes] : [playerId, priority]) : [playerId];
    return apiAction('addToShortlist', args).then(data => {
      syncFromResponse(data);
      return data.result as boolean;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  removeFromShortlist: (playerId: string) => {
    apiAction('removeFromShortlist', [playerId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  getShortlist: () => {
    return get().shortlist ?? [];
  },

  // Empréstimos
  loanPlayer: (playerId: string, sellerTeamId: string, durationWeeks: number, loanFee: number, buyOptionFee?: number, buyOptionMandatory?: boolean) => {
    const args = buyOptionFee !== undefined
      ? (buyOptionMandatory !== undefined ? [playerId, sellerTeamId, durationWeeks, loanFee, buyOptionFee, buyOptionMandatory] : [playerId, sellerTeamId, durationWeeks, loanFee, buyOptionFee])
      : [playerId, sellerTeamId, durationWeeks, loanFee];
    return apiAction('loanPlayer', args).then(data => {
      syncFromResponse(data);
      return data.result as boolean;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  recallLoanedPlayer: (loanId: string) => {
    apiAction('recallLoanedPlayer', [loanId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  buyLoanedPlayer: (loanId: string) => {
    return apiAction('buyLoanedPlayer', [loanId]).then(data => {
      syncFromResponse(data);
      return data.result as boolean;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  // Cláusula de rescisão
  activateReleaseClause: (playerId: string, sellerTeamId: string) => {
    return apiAction('activateReleaseClause', [playerId, sellerTeamId]).then(data => {
      syncFromResponse(data);
      return data.result as boolean;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  // Guerra de ofertas
  raiseBid: (biddingWarId: string, newOffer: number) => {
    return apiAction('raiseBid', [biddingWarId, newOffer]).then(data => {
      syncFromResponse(data);
      return data.result as boolean;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  withdrawBid: (biddingWarId: string) => {
    apiAction('withdrawBid', [biddingWarId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  // Recomendações de scouts
  dismissScoutRecommendation: (recommendationId: string) => {
    apiAction('dismissScoutRecommendation', [recommendationId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  startNextSeason: () => {
    apiAction('startNextSeason', []).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  getPreMatchAnalysis: (matchIndex: number) => {
    return apiAction('getPreMatchAnalysis', [matchIndex]).then(data => {
      return data.result as PreMatchAnalysis | null;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  // Sistema de Coletiva de Imprensa
  generatePreMatchPressConference: (matchIndex: number) => {
    return apiAction('generatePreMatchPressConference', [matchIndex]).then(data => {
      syncFromResponse(data);
      return data.result as PressConference | null;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  generatePostMatchPressConference: (matchIndex: number) => {
    return apiAction('generatePostMatchPressConference', [matchIndex]).then(data => {
      syncFromResponse(data);
      return data.result as PressConference | null;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  answerPressQuestion: (conferenceId: string, questionId: string, tone: PressResponseTone, text: string) => {
    apiAction('answerPressQuestion', [conferenceId, questionId, tone, text]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  skipPressConference: (conferenceId: string) => {
    apiAction('skipPressConference', [conferenceId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  getPendingPressConference: () => {
    return get().pressConferences?.find(c => c.status === 'pending') ?? null;
  },

  getPressConferenceHistory: () => {
    const all = get().pressConferences ?? [];
    return all.filter(c => c.status === 'completed' || c.status === 'skipped').sort((a, b) => b.week - a.week);
  },

  applyPressConferenceEffects: (conferenceId: string) => {
    apiAction('applyPressConferenceEffects', [conferenceId]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  processWeeklyPressDecay: () => {
    apiAction('processWeeklyPressDecay', []).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  generateInstallmentClause: (totalAmount: number, count: number) => {
    return apiAction('generateInstallmentClause', [totalAmount, count]).then(data => {
      syncFromResponse(data);
      return data.result;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  generatePlayerBonus: (type: any, threshold: number, bonusAmount: number) => {
    return apiAction('generatePlayerBonus', [type, threshold, bonusAmount]).then(data => {
      syncFromResponse(data);
      return data.result;
    }).catch(err => { console.error('API action failed:', err); }) as any;
  },

  setCoachTreatment: (playerId: string, treatment: any) => {
    apiAction('setCoachTreatment', [playerId, treatment]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  setPlayerTrustLevel: (playerId: string, trustLevel: number) => {
    apiAction('setPlayerTrustLevel', [playerId, trustLevel]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  setPlayerTrainingLoad: (playerId: string, trainingLoad: number) => {
    apiAction('setPlayerTrainingLoad', [playerId, trainingLoad]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  updateClubPerformance: (updates: any) => {
    apiAction('updateClubPerformance', [updates]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  updateLeagueForm: (result: 'W' | 'D' | 'L') => {
    apiAction('updateLeagueForm', [result]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },

  setLeaguePosition: (position: number) => {
    apiAction('setLeaguePosition', [position]).then(syncFromResponse).catch(err => console.error('API action failed:', err));
  },
}));
