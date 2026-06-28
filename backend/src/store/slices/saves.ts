import type { GameStore, SaveSlot } from '../../types/game';
import { persistSave, loadSaveFromDisk, deleteSaveFromDisk, listSaveSlotsFromDisk } from '../../services/saveService';
import { useGameStore } from '../gameStore';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createSavesSlice = (set: Set, get: Get) => ({
  saveGame: (slotNumber: 1 | 2) => {
    const state = get();
    if (!state.selectedTeam) return;

    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return;

    const timestamp = new Date().toISOString();

    const saveSlot: SaveSlot = {
      metadata: {
        slotNumber,
        teamName: team.name,
        currentWeek: state.currentWeek,
        currentSeason: state.currentSeason,
        savedAt: timestamp,
      },
      gameState: {
        selectedTeam: state.selectedTeam,
        currentWeek: state.currentWeek,
        currentSeason: state.currentSeason,
        matches: state.matches,
        teams: state.teams,
        transfers: state.transfers,
        incomingTransfers: state.incomingTransfers,
        counterOffers: state.counterOffers,
        inbox: state.inbox,
        trainingPlan: state.trainingPlan,
        youthIntakeCompleted: state.youthIntakeCompleted,
        scoutReports: state.scoutReports,
        pendingInstallments: state.pendingInstallments,
        incomingBonuses: state.incomingBonuses,
        transferAgreements: state.transferAgreements,
        boardReplies: state.boardReplies,
        boardSatisfaction: state.boardSatisfaction,
        financialReports: state.financialReports,
        injuryHistory: state.injuryHistory,
        preventionSessions: state.preventionSessions,
        fatigueLog: state.fatigueLog,
        recommendations: state.recommendations,
        degradedConditions: state.degradedConditions,
        socialTree: state.socialTree,
        leagueTable: state.leagueTable,
        saveSlots: state.saveSlots,
        deferredTransfers: state.deferredTransfers,
        youthAcademy: state.youthAcademy,
        reserveTeam: state.reserveTeam,
        completedTransfers: state.completedTransfers,
        scoutKnowledge: state.scoutKnowledge,
        scoutMissions: state.scoutMissions,
        seasonSummary: state.seasonSummary,
        gameOver: state.gameOver,
      },
    };

    const currentSlots = state.saveSlots ?? [];
    const filteredSlots = currentSlots.filter(s => s.metadata.slotNumber !== slotNumber);
    const newSlots = [...filteredSlots, saveSlot];

    set({ saveSlots: newSlots });

    // Persist to disk (fire-and-forget)
    persistSave(saveSlot).catch(err => {
      console.error(`[SAVE] Failed to persist slot ${slotNumber} to disk:`, err);
    });
  },

  loadGame: (slotNumber: 1 | 2) => {
    const state = get();
    const saveSlot = state.saveSlots?.find(s => s.metadata.slotNumber === slotNumber);

    if (!saveSlot) return;

    const gameState = saveSlot.gameState;
    set({
      selectedTeam: gameState.selectedTeam,
      currentWeek: gameState.currentWeek,
      currentSeason: gameState.currentSeason,
      matches: gameState.matches,
      teams: gameState.teams,
      transfers: gameState.transfers,
      incomingTransfers: gameState.incomingTransfers,
      counterOffers: gameState.counterOffers,
      inbox: gameState.inbox,
      trainingPlan: gameState.trainingPlan,
      youthIntakeCompleted: gameState.youthIntakeCompleted,
      scoutReports: gameState.scoutReports,
      pendingInstallments: gameState.pendingInstallments,
      incomingBonuses: gameState.incomingBonuses,
      transferAgreements: gameState.transferAgreements,
      boardReplies: gameState.boardReplies,
      boardSatisfaction: gameState.boardSatisfaction,
      financialReports: gameState.financialReports,
      injuryHistory: gameState.injuryHistory,
      preventionSessions: gameState.preventionSessions,
      fatigueLog: gameState.fatigueLog,
      recommendations: gameState.recommendations,
      degradedConditions: gameState.degradedConditions,
      socialTree: gameState.socialTree,
      leagueTable: gameState.leagueTable ?? [],
      deferredTransfers: gameState.deferredTransfers ?? [],
      youthAcademy: gameState.youthAcademy ?? { players: [], level: 1, weeklySlots: 3, currentTraining: 'technical', graduationRate: 20 },
      reserveTeam: gameState.reserveTeam ?? [],
      completedTransfers: gameState.completedTransfers ?? [],
      scoutKnowledge: gameState.scoutKnowledge ?? {},
      scoutMissions: gameState.scoutMissions ?? [],
      seasonSummary: gameState.seasonSummary ?? null,
      gameOver: gameState.gameOver ?? false,
      saveSlots: state.saveSlots,
    });
  },

  deleteSave: (slotNumber: 1 | 2) => {
    const state = get();
    const filteredSlots = (state.saveSlots ?? []).filter(s => s.metadata.slotNumber !== slotNumber);
    set({ saveSlots: filteredSlots });

    // Remove from disk (fire-and-forget)
    deleteSaveFromDisk(slotNumber).catch(err => {
      console.error(`[SAVE] Failed to delete slot ${slotNumber} from disk:`, err);
    });
  },

  getSaveSlots: () => {
    const state = get();
    return (state.saveSlots ?? []).map(s => s.metadata);
  },
});

// Call this on server startup to load saves from disk into the store
export async function hydrateSavesFromDisk(): Promise<void> {
  const slots = await listSaveSlotsFromDisk();
  const fullSlots: SaveSlot[] = [];
  for (const slotNumber of [1, 2] as const) {
    const save = await loadSaveFromDisk(slotNumber);
    if (save) fullSlots.push(save);
  }
  if (fullSlots.length > 0) {
    useGameStore.setState({ saveSlots: fullSlots });
  }
}
