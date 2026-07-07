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
import { apiAction, apiPost, getActiveRoom } from '../api/client';
import { getFullName } from '../utils/player';
import type { ToastData } from '../types/game';
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
  freeAgents: [] as Player[],
  toasts: [] as ToastData[],
};

// ============================================================
// STORE
// ============================================================

function syncFromResponse(data: { result?: any; state: any }) {
  // No modo online, o time do jogador é fixo (o servidor pode ter focado outro
  // time durante o processamento). Forçamos selectedTeam = meu time para a UI.
  const room = getActiveRoom();
  if (room?.teamId) {
    useGameStore.setState({ ...data.state, selectedTeam: room.teamId });
  } else {
    useGameStore.setState(data.state);
  }
}

// Wrapper que mostra toast de erro em falha de API (C4)
function apiActionSafe(action: string, args: any[], errorMsg = 'Ação falhou'): Promise<any> {
  return apiAction(action, args)
    .then(data => { syncFromResponse(data); return data; })
    .catch(err => {
      const msg = err instanceof Error ? err.message : String(err);
      useGameStore.getState().pushToast(`${errorMsg}: ${msg}`, 'error');
      throw err;
    });
}

// Variante que não re-lança o erro (fire-and-forget com toast)
function apiActionSafeSilent(action: string, args: any[], errorMsg = 'Ação falhou'): void {
  apiActionSafe(action, args, errorMsg).catch(() => {});
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
    apiActionSafeSilent('getFinancialReport', [], 'Falha ao gerar relatório');
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
    apiPost('/init', {}).then(syncFromResponse).catch(err => { useGameStore.getState().pushToast(`Falha ao iniciar jogo: ${err instanceof Error ? err.message : String(err)}`, 'error'); });
  },

  deselectTeam: () => {
    apiActionSafeSilent('deselectTeam', [], 'Falha ao desselecionar time');
  },

  selectTeam: (teamId: string) => {
    apiActionSafeSilent('selectTeam', [teamId], 'Falha ao selecionar time');
  },

  // updateTeam: compute locally for instant UI feedback, sync to backend
  updateTeam: (teamId: string, updater: (team: Team) => Team) => {
    const state = get();
    const team = state.teams.find(t => t.id === teamId);
    if (!team) return;
    const newTeam = updater({ ...team });
    set({ teams: state.teams.map(t => (t.id === teamId ? newTeam : t)) });
    apiAction('updateTeam', [teamId, newTeam]).catch(err => { useGameStore.getState().pushToast(`Falha ao salvar time: ${err instanceof Error ? err.message : String(err)}`, 'error'); });
  },

  simulateMatch: (matchIndex: number) => {
    const injured = findInjuredInXI(get());
    if (injured) {
      set({ matchBlockMessage: `Partida não pode iniciar: ${getFullName(injured)} lesionado` });
      return;
    }
    set({ matchBlockMessage: null });
    apiActionSafeSilent('simulateMatch', [matchIndex], 'Falha ao simular partida');
  },

  advanceWeek: () => {
    if (get().isAdvancing) return;
    const injured = findInjuredInXI(get());
    if (injured) {
      set({ matchBlockMessage: `Partida não pode iniciar: ${getFullName(injured)} lesionado` });
      return;
    }
    set({ isAdvancing: true, matchBlockMessage: null });
    apiActionSafe('advanceWeek', [], 'Falha ao avançar semana')
      .then(() => set({ isAdvancing: false }))
      .catch(() => set({ isAdvancing: false }));
  },

  markAsRead: (messageId: string) => {
    apiActionSafeSilent('markAsRead', [messageId], 'Falha ao marcar mensagem');
  },

  removeMessage: (messageId: string) => {
    apiActionSafeSilent('removeMessage', [messageId], 'Falha ao remover mensagem');
  },

  updatePlayerAttributes: (playerId: string, trainingType: string) => {
    apiActionSafeSilent('updatePlayerAttributes', [playerId, trainingType], 'Falha ao atualizar atributos');
  },

  completeYouthIntake: () => {
    apiActionSafeSilent('completeYouthIntake', [], 'Falha na intake de jovens');
  },

  buyPlayer: (playerId: string, sellerTeamId: string) => {
    return apiActionSafe('buyPlayer', [playerId, sellerTeamId], 'Falha na transferência').then(data => data.result as boolean).catch(() => false) as any;
  },

  signFreeAgent: (playerId: string) => {
    return apiActionSafe('signFreeAgent', [playerId], 'Falha ao contratar agente livre').then(data => data.result as boolean).catch(() => false) as any;
  },

  makeOffer: (playerId: string, sellerTeamId: string, offerPrice: number, negotiationRound?: number) => {
    const args = negotiationRound ? [playerId, sellerTeamId, offerPrice, negotiationRound] : [playerId, sellerTeamId, offerPrice];
    return apiActionSafe('makeOffer', args, 'Falha na oferta').then(data => data.result as NegotiationResult).catch(() => undefined) as any;
  },

  acceptOffer: (playerId: string, sellerTeamId: string, offerPrice: number, agreedSalary: number) => {
    return apiActionSafe('acceptOffer', [playerId, sellerTeamId, offerPrice, agreedSalary], 'Falha ao aceitar oferta').then(data => data.result as boolean).catch(() => false) as any;
  },

  negotiatePlayerContract: (playerId: string, sellerTeamId: string, offeredSalary: number, negotiationRound: number) => {
    return apiActionSafe('negotiatePlayerContract', [playerId, sellerTeamId, offeredSalary, negotiationRound], 'Falha na negociação de contrato').then(data => data.result as ContractNegotiationResult).catch(() => undefined) as any;
  },

  acceptIncomingTransfer: (playerId: string) => {
    apiActionSafeSilent('acceptIncomingTransfer', [playerId], 'Falha ao aceitar transferência');
  },

  rejectIncomingTransfer: (playerId: string) => {
    apiActionSafeSilent('rejectIncomingTransfer', [playerId], 'Falha ao rejeitar transferência');
  },

  deferTransfer: (playerId: string) => {
    apiActionSafeSilent('deferTransfer', [playerId], 'Falha ao adiar transferência');
  },

  reinstateDeferredTransfer: (playerId: string) => {
    apiActionSafeSilent('reinstateDeferredTransfer', [playerId], 'Falha ao reinstaurar transferência');
  },

  rejectDeferredTransfer: (playerId: string) => {
    apiActionSafeSilent('rejectDeferredTransfer', [playerId], 'Falha ao rejeitar transferência adiada');
  },

  assignScout: (playerId?: string) => {
    return apiActionSafe('assignScout', playerId ? [playerId] : [], 'Falha ao designar olheiro').then(data => data.result as boolean).catch(() => false) as any;
  },

  setTrainingPlan: (plan: WeeklyTrainingPlan) => {
    apiActionSafeSilent('setTrainingPlan', [plan], 'Falha ao salvar plano de treino');
  },

  applyWeeklyTraining: (targetGroup?: 'all' | 'attackers' | 'midfielders' | 'defenders' | 'custom', customPlayerIds?: string[]) => {
    const args = targetGroup ? (customPlayerIds ? [targetGroup, customPlayerIds] : [targetGroup]) : [];
    apiActionSafeSilent('applyWeeklyTraining', args, 'Falha ao aplicar treino semanal');
  },

  handleInboxAction: (messageId: string, actionLabel: string) => {
    apiActionSafeSilent('handleInboxAction', [messageId, actionLabel], 'Falha ao processar ação do inbox');
  },

  applyMatchIntervention: (matchIndex: number, type: 'substitution' | 'shout') => {
    apiActionSafeSilent('applyMatchIntervention', [matchIndex, type], 'Falha na intervenção da partida');
  },

  substitutePlayer: (matchIndex: number, outId: string, inId: string) => {
    apiActionSafeSilent('substitutePlayer', [matchIndex, outId, inId], 'Falha na substituição');
  },

  applyShout: (matchIndex: number, shout: 'encourage' | 'demand' | 'praise' | 'calm') => {
    apiActionSafeSilent('applyShout', [matchIndex, shout], 'Falha na instrução');
  },

  negotiateCounterOffer: (playerId: string) => {
    return apiActionSafe('negotiateCounterOffer', [playerId], 'Falha na contraproposta').then(data => data.result as boolean).catch(() => false) as any;
  },

  payInstallment: (installmentId: string) => {
    return apiActionSafe('payInstallment', [installmentId], 'Falha ao pagar parcela').then(data => data.result as boolean).catch(() => false) as any;
  },

  checkBonuses: (playerId?: string) => {
    apiActionSafeSilent('checkBonuses', [playerId], 'Falha ao checar bônus');
  },

  claimBonus: (bonusId: string) => {
    apiActionSafeSilent('claimBonus', [bonusId], 'Falha ao resgatar bônus');
  },

  terminateTransferAgreement: (agreementId: string, reason?: string) => {
    const args = reason ? [agreementId, reason] : [agreementId];
    apiActionSafeSilent('terminateTransferAgreement', args, 'Falha ao encerrar acordo');
  },

  handleBoardReply: (messageId: string, optionId: string) => {
    apiActionSafeSilent('handleBoardReply', [messageId, optionId], 'Falha ao responder diretoria');
  },

  schedulePreventionSession: (session: PreventionSession) => {
    apiActionSafeSilent('schedulePreventionSession', [session], 'Falha ao agendar prevenção');
  },

  applyPreventionSession: () => {
    apiActionSafeSilent('applyPreventionSession', [], 'Falha ao aplicar prevenção');
  },

  updatePlayerLoad: (playerId: string, day: number, trainingType: string) => {
    apiActionSafeSilent('updatePlayerLoad', [playerId, day, trainingType], 'Falha ao atualizar carga');
  },

  recoverInjuredPlayer: (playerId: string) => {
    apiActionSafeSilent('recoverInjuredPlayer', [playerId], 'Falha ao recuperar jogador');
  },

  applyFatigueDecay: () => {
    apiActionSafeSilent('applyFatigueDecay', [], 'Falha ao aplicar decaimento de fadiga');
  },

  generateInjuryRecommendation: (playerId: string) => {
    apiActionSafeSilent('generateInjuryRecommendation', [playerId], 'Falha ao gerar recomendação');
  },

  applyPostInjuryCondition: (playerId: string) => {
    apiActionSafeSilent('applyPostInjuryCondition', [playerId], 'Falha ao aplicar condição pós-lesão');
  },

  acknowledgeRecommendation: (recommendationId: string) => {
    apiActionSafeSilent('acknowledgeRecommendation', [recommendationId], 'Falha ao reconhecer recomendação');
  },

  applyTrainingCooldown: (playerId: string, trainingType: string, day: number) => {
    apiActionSafeSilent('applyTrainingCooldown', [playerId, trainingType, day], 'Falha ao aplicar cooldown de treino');
  },

  updateDegradedConditions: () => {
    apiActionSafeSilent('updateDegradedConditions', [], 'Falha ao atualizar condições degradadas');
  },

  generateLiveMatchMinute: (matchIndex: number) => {
    apiActionSafeSilent('generateLiveMatchMinute', [matchIndex], 'Falha no minuto ao vivo');
  },

  finishMatch: (matchIndex: number) => {
    apiActionSafeSilent('finishMatch', [matchIndex], 'Falha ao finalizar partida');
  },

  captureWeeklyAttributeSnapshot: () => {
    apiActionSafeSilent('captureWeeklyAttributeSnapshot', [], 'Falha ao capturar snapshot');
  },

  generateSocialTree: () => {
    apiActionSafeSilent('generateSocialTree', [], 'Falha ao gerar árvore social');
  },

  updateSocialConnections: (playerIdA: string, playerIdB: string, strength: number) => {
    apiActionSafeSilent('updateSocialConnections', [playerIdA, playerIdB, strength], 'Falha ao atualizar conexões sociais');
  },

  updatePromiseCountdown: () => {
    apiActionSafeSilent('updatePromiseCountdown', [], 'Falha ao atualizar promessas');
  },

  adjustPlayerSalary: (playerId: string, newSalary: number) => {
    apiActionSafeSilent('adjustPlayerSalary', [playerId, newSalary], 'Falha ao ajustar salário');
  },

  saveGame: (slotNumber: 1 | 2) => {
    return apiAction('saveGame', [slotNumber]).then(syncFromResponse);
  },

  loadGame: (slotNumber: 1 | 2) => {
    return apiAction('loadGame', [slotNumber]).then(syncFromResponse);
  },

  deleteSave: (slotNumber: 1 | 2) => {
    apiActionSafeSilent('deleteSave', [slotNumber], 'Falha ao deletar save');
  },

  generateYouthPlayers: () => {
    apiActionSafeSilent('generateYouthPlayers', [], 'Falha ao gerar jovens');
  },

  promoteYouthPlayer: (playerId: string) => {
    apiActionSafeSilent('promoteYouthPlayer', [playerId], 'Falha ao promover jovem');
  },

  setAcademyTraining: (type: string) => {
    apiActionSafeSilent('setAcademyTraining', [type], 'Falha ao definir treino da academia');
  },

  addPlayerToReserve: (playerId: string) => {
    apiActionSafeSilent('addPlayerToReserve', [playerId], 'Falha ao mover para reserva');
  },

  promoteFromReserve: (playerId: string) => {
    apiActionSafeSilent('promoteFromReserve', [playerId], 'Falha ao promover da reserva');
  },

  setReserveTraining: (type: string) => {
    apiActionSafeSilent('setReserveTraining', [type], 'Falha ao definir treino da reserva');
  },

  assignScoutMission: (scoutId: string, targetId: string, weeks: number) => {
    return apiActionSafe('assignScoutMission', [scoutId, targetId, weeks], 'Falha ao designar missão de olheiro').then(data => data.result as boolean).catch(() => false) as any;
  },

  getScoutKnowledge: (playerId: string) => {
    return get().scoutKnowledge[playerId] ?? 0;
  },

  // Shortlist
  addToShortlist: (playerId: string, priority?: 'high' | 'medium' | 'low', notes?: string) => {
    const args = priority ? (notes ? [playerId, priority, notes] : [playerId, priority]) : [playerId];
    return apiActionSafe('addToShortlist', args, 'Falha ao adicionar à shortlist').then(data => data.result as boolean).catch(() => false) as any;
  },

  removeFromShortlist: (playerId: string) => {
    apiActionSafeSilent('removeFromShortlist', [playerId], 'Falha ao remover da shortlist');
  },

  getShortlist: () => {
    return get().shortlist ?? [];
  },

  // Empréstimos
  loanPlayer: (playerId: string, sellerTeamId: string, durationWeeks: number, loanFee: number, buyOptionFee?: number, buyOptionMandatory?: boolean) => {
    const args = buyOptionFee !== undefined
      ? (buyOptionMandatory !== undefined ? [playerId, sellerTeamId, durationWeeks, loanFee, buyOptionFee, buyOptionMandatory] : [playerId, sellerTeamId, durationWeeks, loanFee, buyOptionFee])
      : [playerId, sellerTeamId, durationWeeks, loanFee];
    return apiActionSafe('loanPlayer', args, 'Falha no empréstimo').then(data => data.result as boolean).catch(() => false) as any;
  },

  recallLoanedPlayer: (loanId: string) => {
    apiActionSafeSilent('recallLoanedPlayer', [loanId], 'Falha ao recall empréstimo');
  },

  buyLoanedPlayer: (loanId: string) => {
    return apiActionSafe('buyLoanedPlayer', [loanId], 'Falha ao comprar emprestado').then(data => data.result as boolean).catch(() => false) as any;
  },

  // Cláusula de rescisão
  activateReleaseClause: (playerId: string, sellerTeamId: string) => {
    return apiActionSafe('activateReleaseClause', [playerId, sellerTeamId], 'Falha ao ativar cláusula de rescisão').then(data => data.result as boolean).catch(() => false) as any;
  },

  // Guerra de ofertas
  raiseBid: (biddingWarId: string, newOffer: number) => {
    return apiActionSafe('raiseBid', [biddingWarId, newOffer], 'Falha ao aumentar oferta').then(data => data.result as boolean).catch(() => false) as any;
  },

  withdrawBid: (biddingWarId: string) => {
    apiActionSafeSilent('withdrawBid', [biddingWarId], 'Falha ao retirar oferta');
  },

  // Recomendações de scouts
  dismissScoutRecommendation: (recommendationId: string) => {
    apiActionSafeSilent('dismissScoutRecommendation', [recommendationId], 'Falha ao dispensar recomendação');
  },

  startNextSeason: () => {
    apiActionSafeSilent('startNextSeason', [], 'Falha ao iniciar nova temporada');
  },

  getPreMatchAnalysis: (matchIndex: number) => {
    return apiActionSafe('getPreMatchAnalysis', [matchIndex], 'Falha na análise pré-jogo').then(data => data.result as PreMatchAnalysis | null).catch(() => null) as any;
  },

  // Sistema de Coletiva de Imprensa
  generatePreMatchPressConference: (matchIndex: number) => {
    return apiActionSafe('generatePreMatchPressConference', [matchIndex], 'Falha ao gerar coletiva pré-jogo').then(data => data.result as PressConference | null).catch(() => null) as any;
  },

  generatePostMatchPressConference: (matchIndex: number) => {
    return apiActionSafe('generatePostMatchPressConference', [matchIndex], 'Falha ao gerar coletiva pós-jogo').then(data => data.result as PressConference | null).catch(() => null) as any;
  },

  answerPressQuestion: (conferenceId: string, questionId: string, tone: PressResponseTone, text: string) => {
    return apiActionSafe('answerPressQuestion', [conferenceId, questionId, tone, text], 'Falha ao responder pergunta');
  },

  skipPressConference: (conferenceId: string) => {
    apiActionSafeSilent('skipPressConference', [conferenceId], 'Falha ao pular coletiva');
  },

  getPendingPressConference: () => {
    return get().pressConferences?.find(c => c.status === 'pending') ?? null;
  },

  getPressConferenceHistory: () => {
    const all = get().pressConferences ?? [];
    return all.filter(c => c.status === 'completed' || c.status === 'skipped').sort((a, b) => b.week - a.week);
  },

  applyPressConferenceEffects: (conferenceId: string) => {
    apiActionSafeSilent('applyPressConferenceEffects', [conferenceId], 'Falha ao aplicar efeitos da coletiva');
  },

  processWeeklyPressDecay: () => {
    apiActionSafeSilent('processWeeklyPressDecay', [], 'Falha no decaimento semanal de imprensa');
  },

  generateInstallmentClause: (totalAmount: number, count: number) => {
    return apiActionSafe('generateInstallmentClause', [totalAmount, count], 'Falha ao gerar cláusula de parcelas').then(data => data.result).catch(() => undefined) as any;
  },

  generatePlayerBonus: (type: any, threshold: number, bonusAmount: number) => {
    return apiActionSafe('generatePlayerBonus', [type, threshold, bonusAmount], 'Falha ao gerar bônus').then(data => data.result).catch(() => undefined) as any;
  },

  setCoachTreatment: (playerId: string, treatment: any) => {
    apiActionSafeSilent('setCoachTreatment', [playerId, treatment], 'Falha ao definir tratamento do treinador');
  },

  setPlayerTrustLevel: (playerId: string, trustLevel: number) => {
    apiActionSafeSilent('setPlayerTrustLevel', [playerId, trustLevel], 'Falha ao definir nível de confiança');
  },

  setPlayerTrainingLoad: (playerId: string, trainingLoad: number) => {
    apiActionSafeSilent('setPlayerTrainingLoad', [playerId, trainingLoad], 'Falha ao definir carga de treino');
  },

  updateClubPerformance: (updates: any) => {
    apiActionSafeSilent('updateClubPerformance', [updates], 'Falha ao atualizar performance do clube');
  },

  updateLeagueForm: (result: 'W' | 'D' | 'L') => {
    apiActionSafeSilent('updateLeagueForm', [result], 'Falha ao atualizar forma recente');
  },

  setLeaguePosition: (position: number) => {
    apiActionSafeSilent('setLeaguePosition', [position], 'Falha ao atualizar posição');
  },

  pushToast: (message: string, type: ToastData['type']) => set(state => ({
    toasts: [...state.toasts, { id: `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`, message, type, timestamp: Date.now() }],
  })),

  dismissToast: (id: string) => set(state => ({
    toasts: state.toasts.filter(t => t.id !== id),
  })),
}));
