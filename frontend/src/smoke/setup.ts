import { beforeEach } from 'vitest';
import { useGameStore } from '../store/gameStore';

// Note: In the new architecture, tests need a running backend server.
// The frontend store proxies all mutations to the backend API.
// For unit tests, we call initGame via the store which triggers an API call.
// Tests should run with the backend server running on localhost:3001.

beforeEach(() => {
  localStorage.clear();
  useGameStore.setState({
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
    youthAcademy: { players: [], level: 1, weeklySlots: 3, currentTraining: 'technical', graduationRate: 20 },
    reserveTeam: [],
    completedTransfers: [],
  });
});
