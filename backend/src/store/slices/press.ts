// Slice de Coletiva de Imprensa — Actions

import type { GameStore, Team, Match, LeagueStandings } from '../../types/game';
import type { PressConference, PressResponse, PressResponseTone, FanMood, MediaPressure } from '../../types/press';
import {
  generatePressConference,
  calculatePressConferenceEffects,
  updateFanMood,
  updateMediaPressure,
  weeklyFanMoodDecay,
  weeklyMediaPressureDecay,
} from '../helpers/press';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createPressSlice = (set: Set, get: Get) => ({
  // Gerar coletiva pré-jogo
  generatePreMatchPressConference: (matchIndex: number): PressConference | null => {
    const state = get();
    if (!state.selectedTeam) return null;

    const match = state.matches[matchIndex];
    if (!match) return null;

    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return null;

    const opponentId = match.homeTeam === state.selectedTeam ? match.awayTeam : match.homeTeam;
    const opponent = state.teams.find(t => t.id === opponentId);
    if (!opponent) return null;

    const conference = generatePressConference(
      'pre_match',
      state.currentWeek,
      state.currentSeason,
      team,
      opponent,
      undefined,
      state.leagueTable,
      match.homeTeam === state.selectedTeam,
    );

    set({
      pressConferences: [...state.pressConferences, conference],
    });

    return conference;
  },

  // Gerar coletiva pós-jogo
  generatePostMatchPressConference: (matchIndex: number): PressConference | null => {
    const state = get();
    if (!state.selectedTeam) return null;

    const match = state.matches[matchIndex];
    if (!match || !match.completed) return null;

    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return null;

    const opponentId = match.homeTeam === state.selectedTeam ? match.awayTeam : match.homeTeam;
    const opponent = state.teams.find(t => t.id === opponentId);
    if (!opponent) return null;

    const conference = generatePressConference(
      'post_match',
      state.currentWeek,
      state.currentSeason,
      team,
      opponent,
      match,
      state.leagueTable,
    );

    // Preencher nome do adversário no contexto
    if (conference.context.lastResult && opponent) {
      conference.context.lastResult.opponentName = opponent.name;
    }

    set({
      pressConferences: [...state.pressConferences, conference],
    });

    return conference;
  },

  // Responder pergunta da coletiva
  answerPressQuestion: (conferenceId: string, questionId: string, tone: PressResponseTone, text: string) => {
    const state = get();
    const conference = state.pressConferences.find(c => c.id === conferenceId);
    if (!conference || conference.status !== 'pending') return;

    const question = conference.questions.find(q => q.id === questionId);
    if (!question) return;

    // Verificar se já respondeu
    const alreadyAnswered = conference.responses.some(r => r.questionId === questionId);
    if (alreadyAnswered) return;

    const response: PressResponse = { questionId, tone, text };
    const updatedResponses = [...conference.responses, response];

    // Verificar se todas as perguntas foram respondidas
    const allAnswered = conference.questions.every(q =>
      updatedResponses.some(r => r.questionId === q.id),
    );

    const updatedConferences = state.pressConferences.map(c =>
      c.id === conferenceId
        ? { ...c, responses: updatedResponses, status: allAnswered ? 'completed' as const : 'pending' as const }
        : c,
    );

    set({ pressConferences: updatedConferences });

    // Se completou, aplicar efeitos
    if (allAnswered) {
      get().applyPressConferenceEffects(conferenceId);
    }
  },

  // Pular coletiva
  skipPressConference: (conferenceId: string) => {
    const state = get();
    const conference = state.pressConferences.find(c => c.id === conferenceId);
    if (!conference || conference.status !== 'pending') return;

    const updatedConferences = state.pressConferences.map(c =>
      c.id === conferenceId ? { ...c, status: 'skipped' as const } : c,
    );

    // Pular gera pequena pressão midiática
    const newMediaPressure = updateMediaPressure(state.mediaPressure, 3);

    set({
      pressConferences: updatedConferences,
      mediaPressure: newMediaPressure,
    });
  },

  // Aplicar efeitos da coletiva
  applyPressConferenceEffects: (conferenceId: string) => {
    const state = get();
    const conference = state.pressConferences.find(c => c.id === conferenceId);
    if (!conference || conference.status !== 'completed') return;

    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return;

    const effects = calculatePressConferenceEffects(
      conference,
      team,
      state.boardSatisfaction,
      state.fanMood,
      state.mediaPressure,
    );

    // Aplicar mudanças de moral: efeito global do elenco + delta específico do jogador citado
    const playerDeltas = effects.playerMoraleDeltas ?? {};
    let updatedTeams = state.teams;
    if (effects.moraleChange !== 0 || Object.keys(playerDeltas).length > 0) {
      updatedTeams = state.teams.map(t => {
        if (t.id !== state.selectedTeam) return t;
        return {
          ...t,
          squad: t.squad.map(p => {
            const moraleDelta = effects.moraleChange + (playerDeltas[p.id] ?? 0);
            if (moraleDelta === 0) return p;
            return {
              ...p,
              morale: Math.max(0, Math.min(100, (p.morale ?? 50) + moraleDelta)),
            };
          }),
        };
      });
    }

    // Atualizar humor da torcida
    const newFanMood = updateFanMood(state.fanMood, effects.fanMoodChange);
    // Atualizar pressão midiática
    const newMediaPressure = updateMediaPressure(state.mediaPressure, effects.mediaPressureChange);
    // Atualizar satisfação da diretoria
    const newBoardSat = Math.max(-100, Math.min(100, state.boardSatisfaction + effects.boardSatisfactionChange));

    // Salvar efeitos na coletiva
    const updatedConferences = state.pressConferences.map(c =>
      c.id === conferenceId ? { ...c, effects } : c,
    );

    set({
      teams: updatedTeams,
      fanMood: newFanMood,
      mediaPressure: newMediaPressure,
      boardSatisfaction: newBoardSat,
      pressConferences: updatedConferences,
    });
  },

  // Processar decaimento semanal (chamado em advanceWeek)
  processWeeklyPressDecay: () => {
    const state = get();
    if (!state.selectedTeam) return;

    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return;

    const newFanMood = weeklyFanMoodDecay(state.fanMood, team.leagueForm ?? []);
    const newMediaPressure = weeklyMediaPressureDecay(state.mediaPressure);

    set({
      fanMood: newFanMood,
      mediaPressure: newMediaPressure,
    });
  },

  // Obter coletiva pendente
  getPendingPressConference: (): PressConference | null => {
    const state = get();
    return state.pressConferences.find(c => c.status === 'pending') ?? null;
  },

  // Obter histórico de coletivas
  getPressConferenceHistory: (): PressConference[] => {
    const state = get();
    return state.pressConferences
      .filter(c => c.status === 'completed' || c.status === 'skipped')
      .sort((a, b) => b.week - a.week);
  },
});
