import type { GameStore, MatchEvent } from '../../types/game';
import {
  simulateMatchResult, calculatePlayerMatchRatings,
  applyMatchResultToTeams,
} from '../helpers/matchEngine';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createMatchSlice = (set: Set, get: Get) => ({
  simulateMatch: (matchIndex: number) => {
    const state = get();
    const match = state.matches[matchIndex];
    if (!match || match.completed) return;

    // Start live match instead of finishing immediately
    const updatedMatches = [...state.matches];
    updatedMatches[matchIndex] = {
      ...match,
      isLive: true,
      liveMinute: 1,
      liveEvents: [],
      liveStats: {
        homeXG: 0,
        awayXG: 0,
        homePossession: Math.round(match.liveStats?.homePossession || 50),
        awayPossession: 100 - (match.liveStats?.homePossession || 50),
        homeShots: 0,
        awayShots: 0,
        homeShotsOnTarget: 0,
        awayShotsOnTarget: 0,
        homePasses: 0,
        awayPasses: 0,
        homePassAccuracy: 70,
        awayPassAccuracy: 70,
      },
    };

    set({ matches: updatedMatches });
  },

  generateLiveMatchMinute: (matchIndex: number) => {
    const state = get();
    const match = state.matches[matchIndex];
    if (!match || !match.isLive || match.liveMinute >= 90) {
      // Finish the match if it hasn't been completed
      if (match && !match.completed && match.isLive) {
        const homeTeam = state.teams.find(t => t.id === match.homeTeam)!;
        const awayTeam = state.teams.find(t => t.id === match.awayTeam)!;
        const baseResult = simulateMatchResult(homeTeam, awayTeam);
        const result = calculatePlayerMatchRatings(homeTeam, awayTeam, baseResult);

        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = {
          ...match,
          completed: true,
          homeGoals: match.homeGoals + result.homeGoals,
          awayGoals: match.awayGoals + result.awayGoals,
          isLive: false,
          events: [...(match.events || []), ...match.liveEvents, ...result.events],
          stats: result.stats,
          playerRatings: result.playerRatings,
          bestPlayer: result.bestPlayer,
        };
        const updatedTeams = applyMatchResultToTeams(state.teams, match.homeTeam, match.awayTeam, result);
        set({ matches: updatedMatches, teams: updatedTeams });
      }
      return;
    }

    const homeTeam = state.teams.find(t => t.id === match.homeTeam)!;
    const awayTeam = state.teams.find(t => t.id === match.awayTeam)!;

    // Simulate one minute of live play
    const minute = match.liveMinute + 1;
    const homePossession = (match.liveStats?.homePossession || 50) / 100;
    const homeGoalChance = (homeTeam.reputation / 100) / (homeTeam.reputation / 100 + awayTeam.reputation / 100 + 0.12);
    const awayGoalChance = 1 - homeGoalChance;

    const newEvents = [...(match.liveEvents || [])];
    const newStats = { ...match.liveStats };

    // Generate events for this minute
    if (Math.random() < 0.05) {
      if (Math.random() < homePossession) {
        newStats.homeShots += Math.floor(Math.random() * 3) + 1;
        newStats.homePasses += Math.floor(Math.random() * 15) + 5;

        if (Math.random() < 0.15 * homeGoalChance) {
          newStats.homeShotsOnTarget++;
          if (Math.random() < 0.3) {
            const scorer = homeTeam.squad[Math.floor(Math.random() * Math.min(11, homeTeam.squad.length))];
            match.homeGoals++;
            newEvents.push({
              minute,
              type: 'goal',
              team: 'home',
              player: scorer?.name,
              description: `GOOOL! ${scorer?.name ?? homeTeam.name} marca!`,
            });
          } else {
            newEvents.push({ minute, type: 'shot', team: 'home', description: 'Chute perigoso' });
          }
        }
      } else {
        newStats.awayShots += Math.floor(Math.random() * 3) + 1;
        newStats.awayPasses += Math.floor(Math.random() * 15) + 5;

        if (Math.random() < 0.15 * awayGoalChance) {
          newStats.awayShotsOnTarget++;
          if (Math.random() < 0.3) {
            const scorer = awayTeam.squad[Math.floor(Math.random() * Math.min(11, awayTeam.squad.length))];
            match.awayGoals++;
            newEvents.push({
              minute,
              type: 'goal',
              team: 'away',
              player: scorer?.name,
              description: `GOOOL! ${scorer?.name ?? awayTeam.name} marca!`,
            });
          } else {
            newEvents.push({ minute, type: 'shot', team: 'away', description: 'Chute perigoso' });
          }
        }
      }
    }

    if (Math.random() < 0.05) {
      newEvents.push({
        minute,
        type: 'save',
        team: Math.random() < 0.5 ? 'away' : 'home',
        description: 'Grande defesa!',
      });
    }
    if (Math.random() < 0.06) {
      newEvents.push({
        minute,
        type: 'corner',
        team: Math.random() < 0.5 ? 'home' : 'away',
        description: 'Escanteio',
      });
    }
    if (Math.random() < 0.04) {
      newEvents.push({
        minute,
        type: 'foul',
        team: Math.random() < 0.5 ? 'home' : 'away',
        description: 'Falta',
      });
    }

    // Update stats
    const totalPossession = newStats.homePossession + newStats.awayPossession || 100;
    const homePct = Math.round((newStats.homePossession / totalPossession) * 100);
    newStats.homePossession = homePct;
    newStats.awayPossession = 100 - homePct;

    // Calculate xG
    newStats.homeXG = Math.round((match.homeGoals + newStats.homeShotsOnTarget * 0.3) * 100) / 100;
    newStats.awayXG = Math.round((match.awayGoals + newStats.awayShotsOnTarget * 0.3) * 100) / 100;

    const updatedMatches = [...state.matches];
    updatedMatches[matchIndex] = {
      ...match,
      liveMinute: minute,
      liveEvents: newEvents,
      liveStats: newStats,
    };

    set({ matches: updatedMatches });
  },

  applyMatchIntervention: (matchIndex: number, type: 'substitution' | 'shout') => {
    const state = get();
    const match = state.matches[matchIndex];
    if (!match || !match.isLive || !state.selectedTeam) {
      // Fallback to old behavior if match is not live
      if (!match || match.completed) return;

      const isHome = match.homeTeam === state.selectedTeam;
      const boost = type === 'shout' ? 0.08 : 0.04;

      const homeTeam = state.teams.find(t => t.id === match.homeTeam)!;
      const awayTeam = state.teams.find(t => t.id === match.awayTeam)!;
      const baseResult = simulateMatchResult(
        homeTeam,
        awayTeam,
        isHome ? boost : 0,
        isHome ? 0 : boost,
      );
      const result = calculatePlayerMatchRatings(
        homeTeam,
        awayTeam,
        baseResult,
      );

      const updatedMatches = [...state.matches];
      updatedMatches[matchIndex] = {
        ...match,
        homeGoals: result.homeGoals,
        awayGoals: result.awayGoals,
        completed: true,
        events: [
          ...result.events,
          {
            minute: 45,
            type: 'substitution',
            team: isHome ? 'home' : 'away',
            description: type === 'shout' ? 'Gritos à equipa!' : 'Substituição táctica',
          },
        ],
        stats: result.stats,
        playerRatings: result.playerRatings,
        bestPlayer: result.bestPlayer,
      };

      const updatedTeams = applyMatchResultToTeams(state.teams, match.homeTeam, match.awayTeam, result);

      if (type === 'shout') {
        const teamIdx = updatedTeams.findIndex(t => t.id === state.selectedTeam);
        if (teamIdx !== -1) {
          updatedTeams[teamIdx] = {
            ...updatedTeams[teamIdx],
            squad: updatedTeams[teamIdx].squad.map(p => ({
              ...p,
              morale: Math.min(100, p.morale + 3),
            })),
          };
        }
      }

      set({ matches: updatedMatches, teams: updatedTeams });
      return;
    }

    const isHome = match.homeTeam === state.selectedTeam;
    const minute = match.liveMinute;

    // Apply live intervention to ongoing match
    const updatedMatches = [...state.matches];
    const interventionEvent: MatchEvent = {
      minute: minute + 1,
      type: 'substitution',
      team: isHome ? 'home' : 'away',
      description: type === 'shout' ? 'Gritos à equipa!' : 'Substituição táctica',
    };

    // For substitution, simulate an extra shot/event
    if (type === 'substitution') {
      const stats = { ...updatedMatches[matchIndex].liveStats };
      if (isHome) {
        stats.homeShots += 2;
        stats.homeShotsOnTarget += 1;
      } else {
        stats.awayShots += 2;
        stats.awayShotsOnTarget += 1;
      }
      updatedMatches[matchIndex] = {
        ...updatedMatches[matchIndex],
        liveMinute: Math.min(90, minute + 5),
        liveEvents: [...updatedMatches[matchIndex].liveEvents, interventionEvent],
        liveStats: stats,
      };
    } else {
      // Shout boosts morale
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
      updatedMatches[matchIndex] = {
        ...updatedMatches[matchIndex],
        liveMinute: Math.min(90, minute + 3),
        liveEvents: [...updatedMatches[matchIndex].liveEvents, interventionEvent],
      };
      set({ matches: updatedMatches, teams: updatedTeams });
      return;
    }

    set({ matches: updatedMatches });
  },

  finishMatch: (matchIndex: number) => {
    const state = get();
    const match = state.matches[matchIndex];
    if (!match || !match.isLive || match.completed) return;

    // Simula o resultado final da partida
    const homeTeam = state.teams.find(t => t.id === match.homeTeam)!;
    const awayTeam = state.teams.find(t => t.id === match.awayTeam)!;
    const baseResult = simulateMatchResult(homeTeam, awayTeam);
    const result = calculatePlayerMatchRatings(homeTeam, awayTeam, baseResult);

    // Atualiza a partida para marcada como concluída
    const updatedMatches = [...state.matches];
    updatedMatches[matchIndex] = {
      ...match,
      isLive: false,
      liveMinute: 90,
      completed: true,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
      events: result.events,
      stats: result.stats,
      playerRatings: result.playerRatings,
      bestPlayer: result.bestPlayer,
    };
    
    // Atualiza as equipes com os resultados
    const updatedTeams = applyMatchResultToTeams(state.teams, match.homeTeam, match.awayTeam, result);
    set({ matches: updatedMatches, teams: updatedTeams });
  },
});
