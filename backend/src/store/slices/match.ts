import type { GameStore, MatchEvent, MatchStats } from '../../types/game';
import {
  simulateMinute, initLiveMatchState,
  calculatePlayerMatchRatings, applyMatchResultToTeams,
  generatePostMatchReport,
} from '../helpers/matchEngine';
import { calculateLeagueStandings } from '../helpers/league';
import { generatePreMatchAnalysis } from '../helpers/preMatchAnalysis';
import { getFullName } from '../../utils/playerName';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createMatchSlice = (set: Set, get: Get) => ({
  simulateMatch: (matchIndex: number) => {
    const state = get();
    const match = state.matches[matchIndex];
    if (!match || match.completed) return;

    // Inicializa o estado da partida ao vivo — simulação passo a passo
    const homeTeam = state.teams.find(t => t.id === match.homeTeam);
    const awayTeam = state.teams.find(t => t.id === match.awayTeam);
    if (!homeTeam || !awayTeam) return;

    // Bloqueia início da partida se o time do usuário tiver jogadores lesionados no XI
    if (state.selectedTeam) {
      const userTeam = state.selectedTeam === match.homeTeam ? homeTeam : awayTeam;
      const injuredInXI = (userTeam.startingXI ?? [])
        .map(id => userTeam.squad.find(p => p.id === id))
        .find(p => p?.injury?.active);
      if (injuredInXI) {
        console.warn(`Partida não pode iniciar: ${getFullName(injuredInXI)} lesionado`);
        return;
      }
    }

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

    const homeTeam = state.teams.find(t => t.id === match.homeTeam);
    const awayTeam = state.teams.find(t => t.id === match.awayTeam);
    if (!homeTeam || !awayTeam) return;
    // Tempo total = 90 + acréscimos (definidos pelo motor aos 89')
    const fullTime = 90 + (match.liveMatchState.addedTime ?? 0);
    const minute = Math.min(fullTime, match.liveMinute + 1);

    // Simula 1 minuto de jogo passo a passo (cada passe, drible, chute)
    const newLiveState = simulateMinute(homeTeam, awayTeam, match.liveMatchState, minute);

    const updatedMatches = [...state.matches];

    if (minute >= 90 + (newLiveState.addedTime ?? 0)) {
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
        liveMinute: minute,
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
          type: 'shout',
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

  // Substituição real: troca outId por inId no startingXI do time do usuário.
  // Como generateLiveMatchMinute lê state.teams a cada minuto, o novo XI passa
  // a jogar imediatamente.
  substitutePlayer: (matchIndex: number, outId: string, inId: string) => {
    const state = get();
    const match = state.matches[matchIndex];
    if (!match || !state.selectedTeam || !match.isLive || !match.liveMatchState) return;

    const isHome = match.homeTeam === state.selectedTeam;
    const userSide: 'home' | 'away' = isHome ? 'home' : 'away';
    const subCount = isHome ? match.homeSubstitutions : match.awaySubstitutions;
    if (subCount >= 5) return; // limite de 5 substituições

    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;
    const team = state.teams[teamIdx];
    if (!team.startingXI.includes(outId)) return;        // quem sai precisa estar em campo
    if (team.startingXI.includes(inId)) return;          // quem entra precisa estar no banco
    if (!team.squad.some(p => p.id === inId)) return;     // e existir no elenco
    if ((match.liveMatchState.sentOff?.[userSide] ?? []).includes(inId)) return; // não pode ter sido expulso
    // C7: Validações adicionais — não pode entrar lesionado nem sair expulso
    if ((match.liveMatchState.sentOff?.[userSide] ?? []).includes(outId)) return; // expulso não pode "sair"
    const inPlayer = team.squad.find(p => p.id === inId);
    if (inPlayer?.injury?.active) return; // lesionado não pode entrar

    const outName = team.squad.find(p => p.id === outId)?.name ?? 'jogador';
    const inName = team.squad.find(p => p.id === inId)?.name ?? 'jogador';
    const newXI = team.startingXI.map(id => (id === outId ? inId : id));

    const updatedTeams = [...state.teams];
    updatedTeams[teamIdx] = { ...team, startingXI: newXI };

    const minute = match.liveMinute;
    const subEvent: MatchEvent = {
      minute: minute + 1,
      type: 'substitution',
      team: userSide,
      player: inName,
      description: `Substituição: sai ${outName}, entra ${inName}`,
    };
    const ballHolderId = match.liveMatchState.ballHolderId === outId ? inId : match.liveMatchState.ballHolderId;

    const updatedMatches = [...state.matches];
    updatedMatches[matchIndex] = {
      ...match,
      homeSubstitutions: isHome ? match.homeSubstitutions + 1 : match.homeSubstitutions,
      awaySubstitutions: isHome ? match.awaySubstitutions : match.awaySubstitutions + 1,
      liveEvents: [...match.liveEvents, subEvent],
      liveMatchState: {
        ...match.liveMatchState,
        ballHolderId,
        events: [...match.liveMatchState.events, subEvent],
      },
    };
    set({ matches: updatedMatches, teams: updatedTeams });
  },

  // Grito com tipo: cada tipo dá um efeito de moral + boost de intervenção distinto.
  applyShout: (matchIndex: number, shout: 'encourage' | 'demand' | 'praise' | 'calm') => {
    const state = get();
    const match = state.matches[matchIndex];
    if (!match || !state.selectedTeam) return;

    const isHome = match.homeTeam === state.selectedTeam;
    const userSide: 'home' | 'away' = isHome ? 'home' : 'away';
    const minute = match.liveMinute;
    const cfg = ({
      encourage: { morale: 4, dur: 12, label: 'Incentiva a equipa — mais intensidade!' },
      demand: { morale: 1, dur: 15, label: 'Exige mais! Cobrança na marcação.' },
      praise: { morale: 6, dur: 10, label: 'Elogia a equipa — confiança lá em cima.' },
      calm: { morale: 3, dur: 8, label: 'Pede calma e controle de bola.' },
    } as const)[shout];

    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    const updatedTeams = [...state.teams];
    if (teamIdx !== -1) {
      updatedTeams[teamIdx] = {
        ...updatedTeams[teamIdx],
        squad: updatedTeams[teamIdx].squad.map(p => ({ ...p, morale: Math.max(1, Math.min(100, p.morale + cfg.morale)) })),
      };
    }

    if (match.isLive && match.liveMatchState) {
      const ev: MatchEvent = { minute: minute + 1, type: 'shout', team: userSide, description: cfg.label };
      const updatedMatches = [...state.matches];
      updatedMatches[matchIndex] = {
        ...match,
        liveEvents: [...match.liveEvents, ev],
        liveMatchState: {
          ...match.liveMatchState,
          events: [...match.liveMatchState.events, ev],
          interventionBoost: { team: userSide, type: shout, untilMinute: minute + cfg.dur },
        },
      };
      set({ matches: updatedMatches, teams: updatedTeams });
    } else {
      set({ teams: updatedTeams });
    }
  },

  finishMatch: (matchIndex: number) => {
    const state = get();
    const match = state.matches[matchIndex];
    if (!match || !match.isLive || match.completed) return;
    if (!match.liveMatchState) return;

    // Simula os minutos restantes até 90 (passo a passo)
    const homeTeam = state.teams.find(t => t.id === match.homeTeam);
    const awayTeam = state.teams.find(t => t.id === match.awayTeam);
    if (!homeTeam || !awayTeam) return;
    let liveState = match.liveMatchState;

    // 90 + acréscimos (o motor define addedTime aos 89')
    for (let m = match.liveMinute + 1; m <= 90 + (liveState.addedTime ?? 0); m++) {
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

  getPreMatchAnalysis: (matchIndex: number) => {
    const state = get();
    const match = state.matches[matchIndex];
    if (!match) return null;

    const homeTeam = state.teams.find(t => t.id === match.homeTeam);
    const awayTeam = state.teams.find(t => t.id === match.awayTeam);
    if (!homeTeam || !awayTeam) return null;

    return generatePreMatchAnalysis(homeTeam, awayTeam, state.selectedTeam);
  },
});
