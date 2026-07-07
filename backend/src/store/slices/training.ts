import type { GameStore, WeeklyTrainingPlan } from '../../types/game';
import type { TrainingTargetGroup } from '../../types/training';
import { updatePlayerAttributes } from '../helpers/training';

const POSITION_MAP: Record<string, string> = {
  FWD: 'attackers',
  MID: 'midfielders',
  DEF: 'defenders',
};

function filterSquadByGroup(squad: import('../../types/game').Player[], targetGroup: TrainingTargetGroup, customPlayerIds?: string[]) {
  if (targetGroup === 'all') return squad;
  if (targetGroup === 'custom') {
    const idSet = new Set(customPlayerIds ?? []);
    return squad.filter(p => idSet.has(p.id));
  }
  return squad.filter(p => POSITION_MAP[p.position] === targetGroup);
}

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createTrainingSlice = (set: Set, get: Get) => ({
  updatePlayerAttributes: (playerId: string, trainingType: string) => {
    const state = get();
    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };
    const playerIdx = team.squad.findIndex(p => p.id === playerId);
    if (playerIdx === -1) return;
    team.squad = [...team.squad];
    team.squad[playerIdx] = updatePlayerAttributes(team.squad[playerIdx], trainingType, state.currentWeek);

    const updatedTeams = [...state.teams];
    updatedTeams[teamIdx] = team;
    set({ teams: updatedTeams });
  },

  setTrainingPlan: (plan: WeeklyTrainingPlan) => set({ trainingPlan: plan }),

  applyWeeklyTraining: (targetGroup: TrainingTargetGroup = 'all', customPlayerIds?: string[]) => {
    const state = get();
    if (!state.selectedTeam || !state.trainingPlan) return;

    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };
    const focus = state.trainingPlan.teamFocus;
    const targetIds = new Set(filterSquadByGroup(team.squad, targetGroup, customPlayerIds).map(p => p.id));

    team.squad = team.squad.map(p => {
      if (!targetIds.has(p.id)) return p;
      if (p.injury?.active) return p;
      
      const updated = updatePlayerAttributes(p, focus, state.currentWeek);
      
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
    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };
    const playerIdx = team.squad.findIndex(p => p.id === playerId);
    if (playerIdx === -1) return;
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
