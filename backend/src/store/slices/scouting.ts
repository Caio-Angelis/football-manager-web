import type { GameStore, Player } from '../../types/game';
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
      .filter(p => !state.scoutReports.some(r => r.playerId === p.id))
      .slice(0, 3);

    if (candidates.length === 0) return false;

    const newReports = candidates.map(generateScoutReport);
    set({ scoutReports: [...state.scoutReports, ...newReports] });
    return true;
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
