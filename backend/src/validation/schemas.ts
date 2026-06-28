import { z } from 'zod';

const zString = z.string().min(1);
const zNumber = z.number();
const zNumberNonNeg = z.number().nonnegative();
const zMatchIndex = z.number().int().nonnegative();
const zEmpty = z.array(z.unknown()).length(0);
const zSlot = z.union([z.literal(1), z.literal(2)]);

export const actionSchemas: Record<string, z.ZodTypeAny> = {
  // Core
  initGame: zEmpty,
  deselectTeam: zEmpty,
  selectTeam: z.tuple([zString]),
  updateTeam: z.tuple([zString, z.any()]),
  advanceWeek: zEmpty,

  // Match
  simulateMatch: z.tuple([zMatchIndex]),
  generateLiveMatchMinute: z.tuple([zMatchIndex]),
  applyMatchIntervention: z.tuple([zMatchIndex, z.enum(['substitution', 'shout'])]),
  finishMatch: z.tuple([zMatchIndex]),

  // Inbox
  markAsRead: z.tuple([zString]),
  removeMessage: z.tuple([zString]),
  handleInboxAction: z.tuple([zString, zString]),
  handleBoardReply: z.tuple([zString, zString, z.enum(['performance', 'budget', 'expectation', 'general'])]),

  // Training
  updatePlayerAttributes: z.tuple([zString, zString]),
  setTrainingPlan: z.tuple([z.any()]),
  applyWeeklyTraining: zEmpty,
  applyTrainingCooldown: z.tuple([zString, zString, zNumber.int().nonnegative()]),

  // Transfer
  buyPlayer: z.union([z.tuple([zString, zString]), z.tuple([zString, zString, z.boolean()])]),
  makeOffer: z.union([z.tuple([zString, zString, zNumberNonNeg]), z.tuple([zString, zString, zNumberNonNeg, zNumber.int().positive()])]),
  acceptOffer: z.tuple([zString, zString, zNumberNonNeg, zNumberNonNeg]),
  negotiatePlayerContract: z.tuple([zString, zString, zNumberNonNeg, zNumber.int().positive()]),
  acceptIncomingTransfer: z.tuple([zString]),
  rejectIncomingTransfer: z.tuple([zString]),
  deferTransfer: z.tuple([zString]),
  reinstateDeferredTransfer: z.tuple([zString]),
  rejectDeferredTransfer: z.tuple([zString]),
  negotiateCounterOffer: z.tuple([zString]),
  assignScout: z.union([z.tuple([zString.optional()]), zEmpty]),
  generateInstallmentClause: z.tuple([zNumberNonNeg, zNumber.int().positive()]),
  generatePlayerBonus: z.tuple([z.enum(['goals', 'appearances', 'assists', 'titles', 'performance']), zNumber, zNumber]),
  payInstallment: z.tuple([zString]),
  checkBonuses: z.union([z.tuple([zString.optional()]), zEmpty]),
  claimBonus: z.tuple([zString]),
  terminateTransferAgreement: z.union([z.tuple([zString]), z.tuple([zString, zString])]),
  getTransferAgreements: z.union([z.tuple([zString.optional()]), zEmpty]),
  getCompletedTransfers: zEmpty,

  // Scouting & Youth
  assignScoutMission: z.tuple([zString, zString, zNumber.int().positive()]),
  getScoutKnowledge: z.tuple([zString]),
  completeYouthIntake: zEmpty,
  generateYouthPlayers: zEmpty,
  promoteYouthPlayer: z.tuple([zString]),
  setAcademyTraining: z.tuple([zString]),
  getYouthPlayers: zEmpty,
  addPlayerToReserve: z.tuple([zString]),
  promoteFromReserve: z.tuple([zString]),
  getReserveTeam: zEmpty,
  setReserveTraining: z.tuple([zString]),

  // Injury & Fatigue
  getInjuryReport: z.tuple([zString]),
  schedulePreventionSession: z.tuple([z.any()]),
  applyPreventionSession: zEmpty,
  updatePlayerLoad: z.tuple([zString, zNumber.int().nonnegative(), zString]),
  calculateInjuryRisk: z.tuple([zString]),
  recoverInjuredPlayer: z.tuple([zString]),
  getInjuryRiskSummary: zEmpty,
  applyFatigueDecay: zEmpty,
  generateInjuryRecommendation: z.tuple([zString]),
  applyPostInjuryCondition: z.tuple([zString]),
  acknowledgeRecommendation: z.tuple([zString]),
  getFatigueHistory: z.tuple([zString]),
  updateDegradedConditions: zEmpty,

  // Financial
  generateFinancialReport: zEmpty,
  getFinancialReport: zEmpty,

  // Social
  generateSocialTree: zEmpty,
  getSocialTree: zEmpty,
  updateSocialConnections: z.tuple([zString, zString, zNumber.min(0).max(1)]),

  // Promises
  updatePromiseCountdown: zEmpty,
  getActivePromises: zEmpty,
  checkPromiseDeadlines: zEmpty,
  adjustPlayerSalary: z.tuple([zString, zNumber]),
  setCoachTreatment: z.tuple([zString, z.object({
    type: z.enum(['starter', 'substitute', 'bench', 'training', 'rest']),
    minutesPerWeek: zNumber,
    trustLevel: zNumber,
    lastTrainingLoad: zNumber,
  })]),
  setPlayerTrustLevel: z.tuple([zString, zNumber]),
  setPlayerTrainingLoad: z.tuple([zString, zNumber]),
  updateClubPerformance: z.tuple([z.object({
    leaguePosition: zNumber.int().min(1).max(20).optional(),
    leagueForm: z.array(z.enum(['W', 'D', 'L'])).optional(),
    formRating: z.enum(['excellent', 'good', 'average', 'poor', 'terrible']).optional(),
  })]),
  updateLeagueForm: z.tuple([z.enum(['W', 'D', 'L'])]),
  setLeaguePosition: z.tuple([zNumber.int().min(1).max(20)]),

  // Attributes
  captureWeeklyAttributeSnapshot: zEmpty,
  getAttributeDelta: z.tuple([zString, zString, zNumber.int(), zNumber.int()]),
  getPlayerAttributeProgression: z.tuple([zString]),

  // Saves
  saveGame: z.tuple([zSlot]),
  loadGame: z.tuple([zSlot]),
  deleteSave: z.tuple([zSlot]),
  getSaveSlots: zEmpty,
};
