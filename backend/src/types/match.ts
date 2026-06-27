// Tipos de Partida e Eventos de Jogo

// ============================================================
// PARTIDA
// ============================================================

export interface MatchEvent {
  minute: number;
  type: 'shot' | 'goal' | 'save' | 'corner' | 'foul' | 'yellow' | 'red' | 'substitution';
  team: 'home' | 'away';
  player?: string;
  description?: string;
}

export interface MatchStats {
  homeXG: number;
  awayXG: number;
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homePasses: number;
  awayPasses: number;
  homePassAccuracy: number;
  awayPassAccuracy: number;
}

// ============================================================
// RATING DE JOGADORES POR PARTIDA (Tarefa 2.2)
// ============================================================

export interface PlayerMatchRating {
  playerId: string;
  playerName: string;
  position: string;
  rating: number; // 1-10
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passAccuracy: number;
  tackles: number;
  interceptions: number;
  minutesPlayed: number;
  isStarted: boolean;
}

export interface Match {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  date: string;
  completed: boolean;
  // Live match tracking
  isLive: boolean;
  liveMinute: number; // 0-90
  liveEvents: MatchEvent[];
  liveStats: MatchStats;
  // Substitution limits (5 per team)
  homeSubstitutions: number;
  awaySubstitutions: number;
  // Previous events (from completed matches)
  events?: MatchEvent[];
  stats?: MatchStats;
  // Player ratings (Tarefa 2.2)
  playerRatings?: PlayerMatchRating[];
  bestPlayer?: string; // playerId of best rated player
}
