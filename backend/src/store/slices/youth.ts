import type { GameStore, YouthPlayer, ReserveTeamPlayer } from '../../types/game';
import { generateYouthIntake, generatePlayer } from '../../utils/playerGenerator';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createYouthSlice = (set: Set, get: Get) => ({
  generateYouthPlayers: () => {
    const state = get();
    const academy = state.youthAcademy;
    const newPlayers: YouthPlayer[] = generateYouthIntake(academy.level, 5).map((p, i) => ({
      id: `youth-${Date.now()}-${i}`,
      name: p.name,
      surname: p.surname,
      position: p.position,
      age: p.age,
      nationality: p.nationality,
      technical: p.technical,
      mental: p.mental,
      physical: p.physical,
      currentAbility: p.currentAbility,
      potentialAbility: p.potentialAbility,
      academyLevel: 1,
      weeksInAcademy: 0,
      trainingGrowth: 0.5 + Math.random() * 0.5,
      morale: 50,
      readyForPromotion: false,
    }));
    set({
      youthAcademy: {
        ...academy,
        players: [...academy.players, ...newPlayers],
      },
    });
  },

  promoteYouthPlayer: (playerId: string) => {
    const state = get();
    if (!state.selectedTeam) return;
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return;
    const youth = state.youthAcademy.players.find(p => p.id === playerId);
    if (!youth) return;
    const newPlayer = generatePlayer({
      teamReputation: team.reputation,
      position: youth.position,
      ageRange: [youth.age, youth.age],
    });
    newPlayer.id = `pro-${playerId}`;
    newPlayer.name = youth.name;
    newPlayer.surname = youth.surname;
    newPlayer.nationality = youth.nationality;
    newPlayer.currentAbility = youth.currentAbility;
    newPlayer.potentialAbility = youth.potentialAbility;
    newPlayer.technical = { ...newPlayer.technical, ...youth.technical };
    newPlayer.mental = { ...newPlayer.mental, ...youth.mental };
    newPlayer.physical = { ...newPlayer.physical, ...youth.physical };
    set({
      teams: state.teams.map(t =>
        t.id === team.id ? { ...t, squad: [...t.squad, newPlayer] } : t
      ),
      youthAcademy: {
        ...state.youthAcademy,
        players: state.youthAcademy.players.filter(p => p.id !== playerId),
      },
    });
  },

  setAcademyTraining: (type: string) => {
    const state = get();
    set({
      youthAcademy: { ...state.youthAcademy, currentTraining: type },
    });
  },

  getYouthPlayers: () => {
    return get().youthAcademy.players;
  },

  addPlayerToReserve: (playerId: string) => {
    const state = get();
    if (!state.selectedTeam) return;
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return;
    const player = team.squad.find(p => p.id === playerId);
    if (!player) return;
    const reserveEntry: ReserveTeamPlayer = {
      playerId,
      player,
      isStarter: false,
      reserveRank: state.reserveTeam.length + 1,
      weeksOnReserve: 0,
      readiness: 0,
    };
    set({
      reserveTeam: [...state.reserveTeam, reserveEntry],
      teams: state.teams.map(t =>
        t.id === team.id ? { ...t, squad: t.squad.filter(p => p.id !== playerId) } : t
      ),
    });
  },

  promoteFromReserve: (playerId: string) => {
    const state = get();
    if (!state.selectedTeam) return;
    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return;
    const reserve = state.reserveTeam.find(r => r.playerId === playerId);
    if (!reserve) return;
    set({
      teams: state.teams.map(t =>
        t.id === team.id ? { ...t, squad: [...t.squad, reserve.player] } : t
      ),
      reserveTeam: state.reserveTeam.filter(r => r.playerId !== playerId),
    });
  },

  getReserveTeam: () => {
    return get().reserveTeam;
  },

  setReserveTraining: (type: string) => {
    const state = get();
    set({
      reserveTeam: state.reserveTeam.map(r => ({ ...r, trainingType: type })),
    });
  },
});
