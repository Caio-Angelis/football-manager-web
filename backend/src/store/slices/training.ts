import type { GameStore, WeeklyTrainingPlan } from '../../types/game';
import { updatePlayerAttributes } from '../helpers/training';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createTrainingSlice = (set: Set, get: Get) => ({
  updatePlayerAttributes: (playerId: string, trainingType: string) => {
    const state = get();
    const teamIdx = state.teams.findIndex(t => t.squad.some(p => p.id === playerId));
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };
    const playerIdx = team.squad.findIndex(p => p.id === playerId);
    team.squad = [...team.squad];
    team.squad[playerIdx] = updatePlayerAttributes(team.squad[playerIdx], trainingType);

    const updatedTeams = [...state.teams];
    updatedTeams[teamIdx] = team;
    set({ teams: updatedTeams });
  },

  setTrainingPlan: (plan: WeeklyTrainingPlan) => set({ trainingPlan: plan }),

  applyWeeklyTraining: () => {
    const state = get();
    if (!state.selectedTeam || !state.trainingPlan) return;

    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };
    const focus = state.trainingPlan.teamFocus;

    team.squad = team.squad.map(p => {
      if (p.injury?.active) return p;
      
      const updated = updatePlayerAttributes(p, focus);
      
      // Add fatigue log entry
      const fatigueLevel = Math.max(0, (updated.cumulativeLoad || 0) * 2 + (100 - updated.fitness));
      updated.fatigueLog = [
        ...(updated.fatigueLog || []),
        {
          week: state.currentWeek,
          day: 0,
          fatigue: Math.min(100, fatigueLevel),
          cumulativeLoad: updated.cumulativeLoad,
          trainingType: focus,
        },
      ];
      
      return updated;
    });

    const updatedTeams = [...state.teams];
    updatedTeams[teamIdx] = team;
    set({ teams: updatedTeams });
  },

  applyTrainingCooldown: (playerId: string, trainingType: string, day: number) => {
    const state = get();
    const teamIdx = state.teams.findIndex(t => t.squad.some(p => p.id === playerId));
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };
    const playerIdx = team.squad.findIndex(p => p.id === playerId);
    const player = team.squad[playerIdx];

    const updatedPlayer = { ...player };
    
    // Physical training has cooldown requirement
    if (trainingType === 'physical') {
      const fatigueLog = updatedPlayer.fatigueLog || [];
      const lastPhysicalDay = fatigueLog.reduce((last, entry) => {
        if (entry.trainingType === 'physical' && (!last || entry.day > last.day)) return entry;
        return last;
      }, null as { day: number } | null);
      
      // If last physical training was recent, increase risk
      if (lastPhysicalDay && Math.abs(lastPhysicalDay.day - day) <= 1) {
        updatedPlayer.consecutivePhysicalDays = (updatedPlayer.consecutivePhysicalDays || 0) + 2;
      }
    }
    
    team.squad[playerIdx] = updatedPlayer;
    const updatedTeams = [...state.teams];
    updatedTeams[teamIdx] = team;
    set({ teams: updatedTeams });
  },
});
