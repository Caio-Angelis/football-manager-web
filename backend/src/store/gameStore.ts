import { create } from 'zustand';
import type { GameStore } from '../types/game';

import { createCoreSlice } from './slices/core';
import { createMatchSlice } from './slices/match';
import { createTransferSlice } from './slices/transfer';
import { createTrainingSlice } from './slices/training';
import { createInjurySlice } from './slices/injury';
import { createInboxSlice } from './slices/inbox';
import { createFinancialSlice } from './slices/financial';
import { createScoutingSlice } from './slices/scouting';
import { createSocialSlice } from './slices/social';
import { createPromisesSlice } from './slices/promises';
import { createSavesSlice } from './slices/saves';
import { createYouthSlice } from './slices/youth';
import { createAttributesSlice } from './slices/attributes';

// ============================================================
// STORE — Composition Root
// Combina todos os slices num único create<GameStore>()
// ============================================================

export const useGameStore = create<GameStore>()(
  (set, get) => ({
    // --- Estado inicial ---
    selectedTeam: null,
    currentWeek: 0,
    currentSeason: 1,
    matches: [],
    teams: [],
    transfers: [],
    incomingTransfers: [],
    counterOffers: [],
    deferredTransfers: [],
    inbox: [],
    trainingPlan: null,
    youthIntakeCompleted: false,
    scoutReports: [],
    pendingInstallments: [],
    incomingBonuses: [],
    transferAgreements: [],
    boardReplies: [],
    boardSatisfaction: 50,
    financialReports: [],
    injuryHistory: [],
    preventionSessions: [],
    fatigueLog: [],
    recommendations: [],
    degradedConditions: [],
    socialTree: null,
    leagueTable: [],
    saveSlots: [],
    completedTransfers: [],
    scoutKnowledge: {},
    scoutMissions: [],
    youthAcademy: { players: [], level: 1, weeklySlots: 3, currentTraining: 'technical', graduationRate: 20 },
    reserveTeam: [],

    // --- Slices (actions) ---
    ...createCoreSlice(set, get),
    ...createMatchSlice(set, get),
    ...createTransferSlice(set, get),
    ...createTrainingSlice(set, get),
    ...createInjurySlice(set, get),
    ...createInboxSlice(set, get),
    ...createFinancialSlice(set, get),
    ...createScoutingSlice(set, get),
    ...createSocialSlice(set, get),
    ...createPromisesSlice(set, get),
    ...createSavesSlice(set, get),
    ...createYouthSlice(set, get),
    ...createAttributesSlice(set, get),
  }),
);
