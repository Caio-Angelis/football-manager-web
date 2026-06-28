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

// Ação individual durante a partida (cada passe, drible, chute, etc.)
export interface MatchAction {
  minute: number;
  type: 'pass' | 'dribble' | 'shot' | 'tackle' | 'interception' | 'clearance' | 'cross' | 'foul' | 'kickoff' | 'goalKick' | 'throwIn';
  team: 'home' | 'away';
  playerId: string;
  playerName: string;
  success: boolean;
  description: string;
  ballPos: number; // 0-1 (0 = gol de casa, 1 = gol de fora)
}

// Estado da partida ao vivo — simulação passo a passo
export interface LiveMatchState {
  possession: 'home' | 'away';
  ballPos: number;        // 0 = home goal, 1 = away goal (casa ataca rumo a 1)
  ballHolderId: string;
  passChain: number;      // passes consecutivos bem-sucedidos na posse atual
  pressure: number;       // 0-1, pressão defensiva sobre o portador da bola
  homeGoals: number;
  awayGoals: number;
  stats: MatchStats;
  events: MatchEvent[];
  actions: MatchAction[];
  goalDetails: { team: 'home' | 'away'; minute: number; scorerId: string; scorerName: string; assistId?: string; assistName?: string }[];
  interventionBoost?: { team: 'home' | 'away'; type: string; untilMinute: number };
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

// ============================================================
// RELATÓRIO PÓS-JOGO — Análise tática, mapa de calor, conselhos
// ============================================================

export interface HeatMapZone {
  label: string;          // 'Defesa-Esq', 'Meio-Centro', 'Ataque-Dir', etc.
  third: 'defensive' | 'middle' | 'attacking';
  flank: 'left' | 'center' | 'right';
  intensity: number;      // 0-1, proporção de ações nesta zona
  actions: number;        // contagem absoluta de ações
}

export interface TacticalInsight {
  category: 'positive' | 'negative' | 'neutral';
  icon: string;
  title: string;
  description: string;
}

export interface AssistantAdvice {
  type: 'tactical' | 'player' | 'formation';
  message: string;
}

export interface PostMatchReport {
  summary: string;
  heatMapHome: HeatMapZone[];
  heatMapAway: HeatMapZone[];
  insights: TacticalInsight[];
  assistantComments: AssistantAdvice[];
  passBreakdown: {
    homeSuccessful: number;
    homeFailed: number;
    awaySuccessful: number;
    awayFailed: number;
  };
  attackZones: {
    home: { left: number; center: number; right: number };
    away: { left: number; center: number; right: number };
  };
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
  liveActions: MatchAction[]; // cada ação individual (passes, dribles, chutes, etc.)
  liveMatchState?: LiveMatchState; // estado da simulação passo a passo
  // Substitution limits (5 per team)
  homeSubstitutions: number;
  awaySubstitutions: number;
  // Previous events (from completed matches)
  events?: MatchEvent[];
  stats?: MatchStats;
  // Player ratings (Tarefa 2.2)
  playerRatings?: PlayerMatchRating[];
  bestPlayer?: string; // playerId of best rated player
  // Relatório pós-jogo (análise tática)
  postMatchReport?: PostMatchReport;
}
