import type { GameStore, Player, PlayerPromise } from '../../types/game';
import { recalcWageBill } from '../helpers/transfer';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createPromisesSlice = (set: Set, get: Get) => ({
  updatePromiseCountdown: () => {
    const state = get();
    if (!state.selectedTeam) return;

    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return;

    const updatedTeam = { ...team };
    const updatedSquad = updatedTeam.squad.map(player => {
      const updatedPromises = player.promises.map(promise => {
        if (!promise.fulfilled && promise.deadline > 0) {
          const originalDeadline = promise.originalDeadline ?? promise.deadline;
          return { ...promise, deadline: promise.deadline - 1, originalDeadline };
        }
        return promise;
      });
      return { ...player, promises: updatedPromises };
    });

    updatedTeam.squad = updatedSquad;

    const updatedTeams = [...state.teams];
    const idx = updatedTeams.findIndex(t => t.id === team.id);
    updatedTeams[idx] = updatedTeam;
    set({ teams: updatedTeams });
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

  checkPromiseDeadlines: () => {
    const state = get();
    if (!state.selectedTeam) return { fulfilled: [], expired: [] };

    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return { fulfilled: [], expired: [] };

    const expired: PlayerPromise[] = [];
    team.squad.forEach(player => {
      player.promises.forEach(promise => {
        if (!promise.fulfilled && promise.deadline <= 0) {
          expired.push(promise);
        }
      });
    });

    return { fulfilled: [], expired };
  },

  adjustPlayerSalary: (playerId: string, newSalary: number) => {
    const state = get();
    if (!state.selectedTeam) return;

    const salary = Math.max(10, Math.min(500, Math.round(newSalary)));
    get().updateTeam(state.selectedTeam, (team) => ({
      ...team,
      squad: team.squad.map((p) =>
        p.id === playerId ? { ...p, salary } : p,
      ),
      wageBill: recalcWageBill({
        ...team,
        squad: team.squad.map((p) =>
          p.id === playerId ? { ...p, salary } : p,
        ),
      }),
    }));
  },

  // ============================================================
  // 11.4 - TRATAMENTO PELO TREINADOR
  // ============================================================

  setCoachTreatment: (playerId: string, treatment: {
    type: 'starter' | 'substitute' | 'bench' | 'training' | 'rest';
    minutesPerWeek: number;
    trustLevel: number;
    lastTrainingLoad: number;
  }) => {
    const state = get();
    if (!state.selectedTeam) return;

    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };
    team.squad = team.squad.map(p => p.id === playerId ? { ...p, coachTreatment: { ...p.coachTreatment, ...treatment } } : p);

    const updatedTeams = [...state.teams];
    updatedTeams[teamIdx] = team;
    set({ teams: updatedTeams });
  },

  setPlayerTrustLevel: (playerId: string, trustLevel: number) => {
    const state = get();
    if (!state.selectedTeam) return;

    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };
    team.squad = team.squad.map(p => p.id === playerId ? { ...p, coachTreatment: { ...p.coachTreatment, trustLevel: Math.max(0, Math.min(100, trustLevel)) } } : p);

    const updatedTeams = [...state.teams];
    updatedTeams[teamIdx] = team;
    set({ teams: updatedTeams });
  },

  setPlayerTrainingLoad: (playerId: string, trainingLoad: number) => {
    const state = get();
    if (!state.selectedTeam) return;

    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };
    team.squad = team.squad.map(p => p.id === playerId ? { ...p, coachTreatment: { ...p.coachTreatment, lastTrainingLoad: Math.max(0, Math.min(100, trainingLoad)) } } : p);

    const updatedTeams = [...state.teams];
    updatedTeams[teamIdx] = team;
    set({ teams: updatedTeams });
  },

  // ============================================================
  // 11.4 - PERFORMANCE DO CLUBE NA TABELA
  // ============================================================

  updateClubPerformance: (updates: {
    leaguePosition?: number;
    leagueForm?: string[];
    formRating?: 'excellent' | 'good' | 'average' | 'poor' | 'terrible';
  }) => {
    const state = get();
    if (!state.selectedTeam) return;

    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };

    if (updates.leaguePosition !== undefined) {
      team.leaguePosition = Math.max(1, Math.min(20, updates.leaguePosition));
    }
    if (updates.leagueForm !== undefined) {
      team.leagueForm = updates.leagueForm;
    }
    if (updates.formRating !== undefined) {
      team.formRating = updates.formRating;
    }

    const updatedTeams = [...state.teams];
    updatedTeams[teamIdx] = team;
    set({ teams: updatedTeams });
  },

  updateLeagueForm: (result: 'W' | 'D' | 'L') => {
    const state = get();
    if (!state.selectedTeam) return;

    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };
    const newForm = [...team.leagueForm, result].slice(-5); // Keep last 5
    team.leagueForm = newForm;

    // Update form rating based on recent form
    const wins = newForm.filter(f => f === 'W').length;
    const losses = newForm.filter(f => f === 'L').length;
    const total = newForm.length;

    let formRating: typeof team.formRating = 'average';
    if (total > 0 && wins / total >= 0.8) formRating = 'excellent';
    else if (total > 0 && wins / total >= 0.6) formRating = 'good';
    else if (total > 0 && losses / total >= 0.6) formRating = 'terrible';
    else if (total > 0 && losses / total >= 0.4) formRating = 'poor';

    team.formRating = formRating;

    const updatedTeams = [...state.teams];
    updatedTeams[teamIdx] = team;
    set({ teams: updatedTeams });
  },

  // NOTA: Esta ação é redundante pois advanceWeek sincroniza leaguePosition
  // automaticamente a partir de calculateLeagueStandings. Mantida por compatibilidade.
  setLeaguePosition: (position: number) => {
    const state = get();
    if (!state.selectedTeam) return;

    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };
    team.leaguePosition = Math.max(1, Math.min(20, position));

    const updatedTeams = [...state.teams];
    updatedTeams[teamIdx] = team;
    set({ teams: updatedTeams });
  },
});
