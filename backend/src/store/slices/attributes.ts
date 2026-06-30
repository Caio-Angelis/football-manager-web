import type { GameStore } from '../../types/game';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createAttributesSlice = (set: Set, get: Get) => ({
  captureWeeklyAttributeSnapshot: () => {
    const state = get();
    if (!state.selectedTeam) return;

    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };

    team.squad = team.squad.map(player => {
      const updated = { ...player };
      const snapshot = {
        week: state.currentWeek,
        technical: { ...updated.technical },
        mental: { ...updated.mental },
        physical: { ...updated.physical },
        currentAbility: updated.currentAbility,
        potentialAbility: updated.potentialAbility,
        morale: updated.morale,
        form: updated.form,
        fitness: updated.fitness,
      };
      updated.attributeHistory = [...(updated.attributeHistory || []), snapshot].slice(-20);
      return updated;
    });

    const updatedTeams = [...state.teams];
    updatedTeams[teamIdx] = team;
    set({ teams: updatedTeams });
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

    const from = (snapA as unknown as Record<string, number | undefined>)[attributeName] ?? 0;
    const to = (snapB as unknown as Record<string, number | undefined>)[attributeName] ?? 0;
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

      // Compare technical
      const techKeys = Object.keys(prev.technical || {});
      techKeys.forEach(key => {
        const from = (prev.technical as unknown as Record<string, number | undefined>)[key] ?? 0;
        const to = (curr.technical as unknown as Record<string, number | undefined>)[key] ?? 0;
        if (from !== to) changes[`technical_${key}`] = { from, to };
      });

      // Compare mental
      const mentalKeys = Object.keys(prev.mental || {});
      mentalKeys.forEach(key => {
        const from = (prev.mental as unknown as Record<string, number | undefined>)[key] ?? 0;
        const to = (curr.mental as unknown as Record<string, number | undefined>)[key] ?? 0;
        if (from !== to) changes[`mental_${key}`] = { from, to };
      });

      // Compare physical
      const physKeys = Object.keys(prev.physical || {});
      physKeys.forEach(key => {
        const from = (prev.physical as unknown as Record<string, number | undefined>)[key] ?? 0;
        const to = (curr.physical as unknown as Record<string, number | undefined>)[key] ?? 0;
        if (from !== to) changes[`physical_${key}`] = { from, to };
      });

      // Compare CA/PA and other stats
      if (prev.currentAbility !== curr.currentAbility) {
        changes['currentAbility'] = { from: prev.currentAbility, to: curr.currentAbility };
      }
      if (prev.morale !== curr.morale) {
        changes['morale'] = { from: prev.morale, to: curr.morale };
      }
      if (prev.form !== curr.form) {
        changes['form'] = { from: prev.form, to: curr.form };
      }
      if (prev.fitness !== curr.fitness) {
        changes['fitness'] = { from: prev.fitness, to: curr.fitness };
      }

      progression.push({
        week: curr.week,
        changes,
      });
    }

    return progression;
  },
});
