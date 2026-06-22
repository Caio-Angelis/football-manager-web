// Tipos base do jogo - Especificação Football Manager Web (Evoluído)

// ============================================================
// ATRIBUTOS DE JOGADOR (Escala 1-20)
// ============================================================

export interface PlayerAttribute {
  // Técnicos
  heading: number;        // Cabeceamento
  crossing: number;       // Cruzamentos
  tackling: number;       // Desarme
  technique: number;      // Técnica
  finishing: number;      // Finalização
  passing: number;        // Passe
  firstTouch: number;     // Primeiro Toque
  dribbling: number;      // Fintas
  marking: number;        // Marcação
  freeKicks: number;      // Livres
  longShots: number;      // Grandes Penalidades
  throwIns: number;       // Lançamentos Linha Lateral
  
  // Mentais
  aggression: number;     // Agressividade
  anticipation: number;   // Antecipação
  bravery: number;        // Bravura
  composure: number;      // Compostura
  concentration: number;  // Concentração
  decisions: number;      // Decisões
  determination: number;  // Determinação
  improvise: number;      // Imprevisto
  positioning: number;    // Posicionamento
  leadership: number;     // Liderança
  teamWork: number;       // Trabalho de Equipe
  vision: number;         // Visão de Jogo
  offBall: number;        // Sem Bola
  workRate: number;       // Índice de Trabalho
  
  // Físicos
  acceleration: number;   // Aceleração
  speed: number;          // Velocidade
  strength: number;       // Força
  stamina: number;        // Resistência
  agility: number;        // Agilidade
  naturalFitness: number; // Aptidão Física Natural
  jumping: number;        // Impulsão
  balance: number;        // Equilíbrio
}

// GK exclusivos
export interface GKAttributes {
  aerialReach: number;
  commandOfArea: number;
  communication: number;
  eccentricity: number;
  handballing: number;
  punching: number;
  throwing: number;
  reflexes: number;
  rushing: number;
  tendencyToCome: number;
  oneOnOne: number;
}

// Métricas ocultas de personalidade
export interface HiddenAttributes {
  consistency: number;      // 1-5
  injuryProneness: number;  // 1-10
  bigGameImportance: number;// 1-5
  dirtiness: number;        // 1-5
  adaptability: number;     // 1-5
  ambition: number;         // 1-5
  loyalty: number;          // 1-5
  pressure: number;         // 1-5
  professionalism: number;  // 1-5
  sportsmanship: number;    // 1-5
  temperament: number;      // 1-5
}

// Promessas ao jogador
export interface Promise {
  goal: string;
  deadline: number; // em semanas
  fulfilled: boolean;
}

// ============================================================
// JOGADOR
// ============================================================

export interface Player {
  id: string;
  name: string;
  surname: string;
  position: string; // 'GK', 'DEF', 'MID', 'FWD'
  secondaryPositions: string[]; // Posições secundárias
  positionProficiency: Record<string, number>; // 1-20 por posição
  
  age: number;
  nationality: string;
  country: string; // Para geração de nomes
  
  // Atributos 1-20
  technical: PlayerAttribute;
  mental: Partial<PlayerAttribute>; // Alguns mentais são comuns
  physical: Partial<PlayerAttribute>; // Alguns físicos são comuns
  
  // GK exclusivos
  goalkeeping?: GKAttributes;
  
  // Métricas ocultas
  hidden: HiddenAttributes;
  
  // CA e PA (1-200)
  currentAbility: number;
  potentialAbility: number; // Estático, nunca muda
  
  // Valor e contrato
  marketValue: number;      // em milhões
  salary: number;           // em milhares
  contractEnd: number;      // em semanas
  contractClause: number;   // cláusula de rescisão
  
  // Status
  morale: number;           // 0-100
  form: number;             // 0-100
  fitness: number;          // 0-100
  injury: { active: boolean; days: number } | null;
  
  // Hierarquia no plantel
  squadStatus: string;      // 'Key Player', 'Regular Starter', 'Rotation', 'Young Talent', 'Excess'
  
  // Dinâmica
  teamMates: string[];      // IDs de jogadores que se dão bem
  socialGroup: string | null; // ID do grupo social
  
  // Promessas ativas
  promises: Promise[];
  
  // Famosidade para scouting
  fame: number;             // 1-100
}

// ============================================================
// TIME
// ============================================================

export interface Team {
  id: string;
  name: string;
  division: string;
  league: string;
  reputation: number;       // 1-100 (reputação do clube)
  budget: number;           // orçamento em milhões
  wageBill: number;         // folha salarial
  facilitiesLevel: number;  // nível das instalações (1-10)
  youthFacilitiesLevel: number; // nível das camadas jovens
  scoutingLevel: number;    // nível do scouting
  
  // Estatísticas
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  
  // Elenco
  squad: Player[];
  formation: string; // '4-4-2', '4-3-3', '3-5-2', '5-2-2'
  tactic: string; // 'attacking', 'defensive', 'balanced'
  
  // Táticas avançadas
  teamMentality: string; // 'very defensive', 'defensive', 'cautious', 'balanced', 'positive', 'offensive', 'very offensive'
  attackWidth: string; // 'narrow', 'balanced', 'wide'
  passingStyle: string; // 'short', 'mixed', 'direct'
  tempo: string; // 'slow', 'balanced', 'fast'
  playOutOfWidth: boolean;
  useFlank: string; // 'neither', 'left', 'right'
  workBallIntoBox: boolean;
  crossFromWide: boolean;
  takeMoreRisks: boolean;
  highPress: boolean;
  counterPress: boolean;
  highLine: boolean;
  aggressiveTackling: boolean;
  trapOffside: boolean;
  
  // Diretoria
  boardExpectation: string; // 'relegation', 'midtable', 'top4', 'title'
  transferBudget: number;
  staffLevel: number;
  
  // Promessas da diretoria
  boardPromises: { goal: string; deadline: number; fulfilled: boolean }[];
  
  // Configuração tática avançada
  tacticsConfig: TeamTacticsConfig;
}

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
}

// ============================================================
// TRANSFERÊNCIAS E MENSAGENS
// ============================================================

export interface TransferOffer {
  playerId: string;
  offerPrice: number;
  fromTeam: string;
}

export interface IncomingTransfer {
  playerId: string;
  offerPrice: number;
  fromTeam: string;
  contractProposal: {
    salary: number;
    duration: number; // em semanas
    clause: number;
  };
}

export interface ScoutReport {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  nationality: string;
  currentAbility: number;
  potentialAbility: number;
  attributesRange: Partial<Record<keyof PlayerAttribute, [number, number]>>;
  stars: number; // 1-5 para PA
  reliability: number; // 1-5 para consistência do reporte
}

export interface InboxMessage {
  id: string;
  type: 'transfer' | 'injury' | 'suggestion' | 'board' | 'youth' | 'training' | 'financial';
  subject: string;
  body: string;
  timestamp: number;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  relatedPlayerId?: string;
  relatedTeamId?: string;
}

// ============================================================
// TÁTICAS E TÁTICAS INDIVIDUAIS
// ============================================================

export interface PlayerRole {
  position: string; // 'GK', 'DEF', 'MID', 'FWD'
  slotIndex: number; // índice na formação (0-10 para 4-4-2, 0-14 para 4-3-3, etc.)
  role: string; // valor do role (ex: 'sweeperKeeper', 'wingBack', 'centralMidfielder')
  duty: string; // 'attack', 'defend', 'balance'
}

export interface PlayerInstruction {
  playerId: string;
  // Instruções de posse
  passMore: boolean;
  passLess: boolean;
  shootMore: boolean;
  shootLess: boolean;
  dribbMore: boolean;
  dribbLess: boolean;
  goGoal: boolean;
  stayBack: boolean;
  // Instruções de cruzamento
  crossMore: boolean;
  crossLess: boolean;
  // Instruções de movimento
  cutInside: boolean;
  RunThrough: boolean;
  // Instruções de jogo
  playSlower: boolean;
  playFaster: boolean;
  throwInMore: boolean;
  takeMoreRisks: boolean;
  // Instruções de defesa
  tackleMore: boolean;
  tackleLess: boolean;
  beMoreAggressive: boolean;
  beFairer: boolean;
}

export interface TeamTacticsConfig {
  playerRoles: PlayerRole[];
  playerInstructions: PlayerInstruction[];
}

// ============================================================
// TREINO
// ============================================================

export interface TrainingSession {
  day: number; // 0-6 (seg-dom)
  morning: { type: string; focus: string };
  afternoon: { type: string; focus: string };
  evening: { type: string; focus: string };
}

export interface WeeklyTrainingPlan {
  week: number;
  sessions: TrainingSession[];
  teamFocus: string; // 'attack', 'defense', 'physical', 'cohesion'
}

// ============================================================
// ESTADO GLOBAL DO JOGO
// ============================================================

export interface GameState {
  selectedTeam: string | null;
  currentWeek: number;
  currentSeason: number;
  matches: Match[];
  teams: Team[];
  transfers: TransferOffer[];
  incomingTransfers: IncomingTransfer[];
  inbox: InboxMessage[];
  trainingPlan: WeeklyTrainingPlan | null;
  youthIntakeCompleted: boolean;
  scoutReports: ScoutReport[];
}

export interface GameActions {
  initGame: () => void;
  selectTeam: (teamId: string) => void;
  simulateMatch: (matchIndex: number) => void;
  advanceWeek: () => void;
  markAsRead: (messageId: string) => void;
  removeMessage: (messageId: string) => void;
  updatePlayerAttributes: (playerId: string, trainingType: string) => void;
  completeYouthIntake: () => void;
  updateTeam: (teamId: string, updater: (team: Team) => Team) => void;
  buyPlayer: (playerId: string, sellerTeamId: string) => boolean;
  acceptIncomingTransfer: (playerId: string) => void;
  rejectIncomingTransfer: (playerId: string) => void;
  assignScout: () => void;
  setTrainingPlan: (plan: WeeklyTrainingPlan) => void;
  applyWeeklyTraining: () => void;
  handleInboxAction: (messageId: string, actionLabel: string) => void;
  applyMatchIntervention: (matchIndex: number, type: 'substitution' | 'shout') => void;
}

export type GameStore = GameState & GameActions;
