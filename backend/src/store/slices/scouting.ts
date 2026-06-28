import type { GameStore, Player, ShortlistEntry } from '../../types/game';
import { generateScoutReport, recalcWageBill } from '../helpers/transfer';
import { generateYouthIntake } from '../../utils/playerGenerator';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createScoutingSlice = (set: Set, get: Get) => ({
  assignScout: (playerId?: string) => {
    const state = get();
    if (!state.selectedTeam) return false;

    // Se um playerId foi fornecido, gera relatório apenas para esse jogador
    if (playerId) {
      const alreadyReported = state.scoutReports.some(r => r.playerId === playerId);
      if (alreadyReported) return false;

      // Encontra o jogador em qualquer equipe
      let player: Player | undefined;
      for (const t of state.teams) {
        if (t.id !== state.selectedTeam) {
          player = t.squad.find(p => p.id === playerId);
          if (player) break;
        }
      }
      if (!player) return false;

      const report = generateScoutReport(player);
      set({ scoutReports: [...state.scoutReports, report] });
      return true;
    }

    // Sem playerId: comportamento original — seleciona 3 jogadores aleatórios
    const candidates = state.teams
      .filter(t => t.id !== state.selectedTeam)
      .flatMap(t => t.squad)
      .filter(p => !state.scoutReports.some(r => r.playerId === p.id));

    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const selected = candidates.slice(0, 3);

    if (selected.length === 0) return false;

    const newReports = selected.map(generateScoutReport);
    set({ scoutReports: [...state.scoutReports, ...newReports] });
    return true;
  },

  assignScoutMission: (scoutId: string, targetId: string, weeks: number) => {
    const state = get();
    if (!state.selectedTeam) return false;

    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team || !team.scouts) return false;

    const scout = team.scouts.find(s => s.id === scoutId);
    if (!scout || scout.assigned) return false;

    // Não permitir missão duplicada para o mesmo jogador
    const existingMission = state.scoutMissions.find(m => m.targetId === targetId);
    if (existingMission) return false;

    const mission = {
      id: `mission_${Date.now()}_${scoutId}_${targetId}`,
      scoutId,
      targetId,
      weeksAssigned: weeks,
      weeksTotal: weeks,
    };

    // Marcar olheiro como ocupado
    const updatedTeams = state.teams.map(t =>
      t.id === state.selectedTeam
        ? {
            ...t,
            scouts: t.scouts.map(s => s.id === scoutId ? { ...s, assigned: true } : s),
          }
        : t,
    );

    set({
      scoutMissions: [...state.scoutMissions, mission],
      teams: updatedTeams,
    });
    return true;
  },

  getScoutKnowledge: (playerId: string) => {
    const state = get();
    return state.scoutKnowledge[playerId] ?? 0;
  },

  // ============================================================
  // SHORTLIST
  // ============================================================

  addToShortlist: (playerId: string, priority: 'high' | 'medium' | 'low' = 'medium', notes?: string) => {
    const state = get();
    const shortlist = state.shortlist ?? [];
    if (shortlist.some(e => e.playerId === playerId)) return false;

    const entry: ShortlistEntry = {
      playerId,
      addedAt: Date.now(),
      addedWeek: state.currentWeek,
      notes,
      priority,
    };

    set({ shortlist: [...shortlist, entry] });
    return true;
  },

  removeFromShortlist: (playerId: string) => {
    const state = get();
    set({ shortlist: (state.shortlist ?? []).filter(e => e.playerId !== playerId) });
  },

  getShortlist: () => {
    const state = get();
    return state.shortlist ?? [];
  },

  // ============================================================
  // RECOMENDAÇÕES DE SCOUTS
  // ============================================================

  dismissScoutRecommendation: (recommendationId: string) => {
    const state = get();
    set({
      scoutRecommendations: (state.scoutRecommendations ?? []).map(r =>
        r.id === recommendationId ? { ...r, dismissed: true } : r,
      ),
    });
  },

  completeYouthIntake: () => {
    const state = get();
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return;

    const youthPlayers = generateYouthIntake(team.youthFacilitiesLevel, 8);
    const newSquad = [...team.squad, ...youthPlayers];
    set({
      teams: state.teams.map(t =>
        t.id === state.selectedTeam
          ? { ...t, squad: newSquad, wageBill: recalcWageBill({ ...t, squad: newSquad }) }
          : t,
      ),
      youthIntakeCompleted: true,
    });
  },
});
