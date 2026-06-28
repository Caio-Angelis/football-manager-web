import type { GameStore, MatchEvent, MatchStats } from '../../types/game';
import {
  simulateMinute, initLiveMatchState,
  calculatePlayerMatchRatings, applyMatchResultToTeams,
  generatePostMatchReport,
} from '../helpers/matchEngine';
import { calculateLeagueStandings } from '../helpers/league';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createMatchSlice = (set: Set, get: Get) => ({
  simulateMatch: (matchIndex: number) => {
    const state = get();
    const match = state.matches[matchIndex];
    if (!match || match.completed) return;

    // Inicializa o estado da partida ao vivo — simulação passo a passo
    const homeTeam = state.teams.find(t => t.id === match.homeTeam)!;
    const awayTeam = state.teams.find(t => t.id === match.awayTeam)!;
    const liveState = initLiveMatchState(homeTeam, awayTeam);

    const updatedMatches = [...state.matches];
    updatedMatches[matchIndex] = {
      ...match,
      isLive: true,
      completed: false,
      liveMinute: 0,
      homeGoals: 0,
      awayGoals: 0,
      liveEvents: [],
      liveActions: [],
      liveMatchState: liveState,
      liveStats: liveState.stats,
      events: undefined,
      stats: undefined,
      playerRatings: undefined,
      bestPlayer: undefined,
    };

    set({ matches: updatedMatches });
  },

  generateLiveMatchMinute: (matchIndex: number) => {
    const state = get();
    const match = state.matches[matchIndex];
    if (!match || !match.isLive || match.completed) return;
    if (!match.liveMatchState) return;

    const homeTeam = state.teams.find(t => t.id === match.homeTeam)!;
    const awayTeam = state.teams.find(t => t.id === match.awayTeam)!;
    const minute = Math.min(90, match.liveMinute + 1);

    // Simula 1 minuto de jogo passo a passo (cada passe, drible, chute)
    const newLiveState = simulateMinute(homeTeam, awayTeam, match.liveMatchState, minute);

    const updatedMatches = [...state.matches];

    if (minute >= 90) {
      // Finaliza a partida — calcula ratings e aplica resultado às equipes
      const events = newLiveState.events.sort((a, b) => a.minute - b.minute);
      const stats: MatchStats = {
        ...newLiveState.stats,
        homePossession: Math.max(25, Math.min(75, newLiveState.stats.homePossession)),
        awayPossession: 100 - Math.max(25, Math.min(75, newLiveState.stats.homePossession)),
      };

      const result = {
        homeGoals: newLiveState.homeGoals,
        awayGoals: newLiveState.awayGoals,
        events,
        stats,
        goalDetails: newLiveState.goalDetails,
      };
      const withRatings = calculatePlayerMatchRatings(homeTeam, awayTeam, result);
      const postMatchReport = generatePostMatchReport(homeTeam, awayTeam, result, newLiveState.actions);

      updatedMatches[matchIndex] = {
        ...match,
        isLive: false,
        completed: true,
        liveMinute: 90,
        homeGoals: newLiveState.homeGoals,
        awayGoals: newLiveState.awayGoals,
        liveEvents: events,
        liveActions: newLiveState.actions,
        liveStats: stats,
        liveMatchState: newLiveState,
        events: withRatings.events,
        stats: withRatings.stats,
        playerRatings: withRatings.playerRatings,
        bestPlayer: withRatings.bestPlayer,
        postMatchReport,
      };

      const updatedTeams = applyMatchResultToTeams(state.teams, match.homeTeam, match.awayTeam, result);
      const leagueStandings = calculateLeagueStandings(updatedTeams, updatedMatches, state.currentWeek);
      set({ matches: updatedMatches, teams: updatedTeams, leagueTable: leagueStandings });
      return;
    }

    updatedMatches[matchIndex] = {
      ...match,
      liveMinute: minute,
      homeGoals: newLiveState.homeGoals,
      awayGoals: newLiveState.awayGoals,
      liveEvents: newLiveState.events,
      liveActions: newLiveState.actions,
      liveStats: newLiveState.stats,
      liveMatchState: newLiveState,
    };

    set({ matches: updatedMatches });
  },

  applyMatchIntervention: (matchIndex: number, type: 'substitution' | 'shout') => {
    const state = get();
    const match = state.matches[matchIndex];
    if (!match || !state.selectedTeam) return;

    const isHome = match.homeTeam === state.selectedTeam;
    const minute = match.liveMinute;

    // Boost morale for shout
    if (type === 'shout') {
      const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
      const updatedTeams = [...state.teams];
      if (teamIdx !== -1) {
        updatedTeams[teamIdx] = {
          ...updatedTeams[teamIdx],
          squad: updatedTeams[teamIdx].squad.map(p => ({
            ...p,
            morale: Math.min(100, p.morale + 3),
          })),
        };
      }

      // Add intervention event to live match
      if (match.isLive && match.liveMatchState) {
        const interventionEvent: MatchEvent = {
          minute: minute + 1,
          type: 'foul',
          team: isHome ? 'home' : 'away',
          description: 'Gritos à equipa!',
        };
        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = {
          ...match,
          liveEvents: [...match.liveEvents, interventionEvent],
          liveMatchState: {
            ...match.liveMatchState,
            events: [...match.liveMatchState.events, interventionEvent],
            interventionBoost: { team: isHome ? 'home' : 'away', type: 'shout', untilMinute: minute + 15 },
          },
        };
        set({ matches: updatedMatches, teams: updatedTeams });
      } else {
        set({ teams: updatedTeams });
      }
      return;
    }

    // Substitution: check limit (5 per team) and apply boost
    if (match.isLive && match.liveMatchState) {
      const subCount = isHome ? match.homeSubstitutions : match.awaySubstitutions;
      if (subCount >= 5) return; // substitution limit reached

      const interventionEvent: MatchEvent = {
        minute: minute + 1,
        type: 'substitution',
        team: isHome ? 'home' : 'away',
        description: 'Substituição táctica',
      };
      const updatedMatches = [...state.matches];
      updatedMatches[matchIndex] = {
        ...match,
        homeSubstitutions: isHome ? match.homeSubstitutions + 1 : match.homeSubstitutions,
        awaySubstitutions: isHome ? match.awaySubstitutions : match.awaySubstitutions + 1,
        liveEvents: [...match.liveEvents, interventionEvent],
        liveMatchState: {
          ...match.liveMatchState,
          events: [...match.liveMatchState.events, interventionEvent],
          interventionBoost: { team: isHome ? 'home' : 'away', type: 'substitution', untilMinute: minute + 20 },
        },
      };
      set({ matches: updatedMatches });
    }
  },

  finishMatch: (matchIndex: number) => {
    const state = get();
    const match = state.matches[matchIndex];
    if (!match || !match.isLive || match.completed) return;
    if (!match.liveMatchState) return;

    // Simula os minutos restantes até 90 (passo a passo)
    const homeTeam = state.teams.find(t => t.id === match.homeTeam)!;
    const awayTeam = state.teams.find(t => t.id === match.awayTeam)!;
    let liveState = match.liveMatchState;

    for (let m = match.liveMinute + 1; m <= 90; m++) {
      liveState = simulateMinute(homeTeam, awayTeam, liveState, m);
    }

    const events = liveState.events.sort((a, b) => a.minute - b.minute);
    const stats: MatchStats = {
      ...liveState.stats,
      homePossession: Math.max(25, Math.min(75, liveState.stats.homePossession)),
      awayPossession: 100 - Math.max(25, Math.min(75, liveState.stats.homePossession)),
    };

    const result = {
      homeGoals: liveState.homeGoals,
      awayGoals: liveState.awayGoals,
      events,
      stats,
      goalDetails: liveState.goalDetails,
    };
    const withRatings = calculatePlayerMatchRatings(homeTeam, awayTeam, result);
    const postMatchReport = generatePostMatchReport(homeTeam, awayTeam, result, liveState.actions);

    const updatedMatches = [...state.matches];
    updatedMatches[matchIndex] = {
      ...match,
      isLive: false,
      liveMinute: 90,
      completed: true,
      homeGoals: liveState.homeGoals,
      awayGoals: liveState.awayGoals,
      liveEvents: events,
      liveActions: liveState.actions,
      liveStats: stats,
      liveMatchState: liveState,
      events: withRatings.events,
      stats: withRatings.stats,
      playerRatings: withRatings.playerRatings,
      bestPlayer: withRatings.bestPlayer,
      postMatchReport,
    };

    const updatedTeams = applyMatchResultToTeams(state.teams, match.homeTeam, match.awayTeam, result);
    const leagueStandings = calculateLeagueStandings(updatedTeams, updatedMatches, state.currentWeek);
    set({ matches: updatedMatches, teams: updatedTeams, leagueTable: leagueStandings });
  },
});
