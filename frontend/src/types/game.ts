// Tipos base do jogo - Especificação Football Manager Web (Evoluído)

// ============================================================
// ATRIBUTOS DE JOGADOR (Escala 1-20)
// ============================================================

export type AttributeValue = number | string | null;

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  timestamp: number;
}

export interface PlayerAttribute {
  // Técnicos
  heading: AttributeValue;
  crossing: AttributeValue;
  tackling: AttributeValue;
  technique: AttributeValue;
  finishing: AttributeValue;
  passing: AttributeValue;
  firstTouch: AttributeValue;
  dribbling: AttributeValue;
  marking: AttributeValue;
  freeKicks: AttributeValue;
  longShots: AttributeValue;
  throwIns: AttributeValue;
  
  // Mentais
  aggression: AttributeValue;
  anticipation: AttributeValue;
  bravery: AttributeValue;
  composure: AttributeValue;
  concentration: AttributeValue;
  decisions: AttributeValue;
  determination: AttributeValue;
  improvise: AttributeValue;
  positioning: AttributeValue;
  leadership: AttributeValue;
  teamWork: AttributeValue;
  vision: AttributeValue;
  offBall: AttributeValue;
  workRate: AttributeValue;
  
  // Físicos
  acceleration: AttributeValue;
  speed: AttributeValue;
  strength: AttributeValue;
  stamina: AttributeValue;
  agility: AttributeValue;
  naturalFitness: AttributeValue;
  jumping: AttributeValue;
  balance: AttributeValue;
}

// GK exclusivos
export interface GKAttributes {
  aerialReach: AttributeValue;
  commandOfArea: AttributeValue;
  communication: AttributeValue;
  eccentricity: AttributeValue;
  handballing: AttributeValue;
  punching: AttributeValue;
  throwing: AttributeValue;
  reflexes: AttributeValue;
  rushing: AttributeValue;
  tendencyToCome: AttributeValue;
  oneOnOne: AttributeValue;
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
export interface PlayerPromise {
  goal: string;
  deadline: number; // em semanas restantes
  originalDeadline?: number; // prazo original (para barra de progresso)
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
  marketValue: number;      // em milhões de R$
  salary: number;           // em milhares de R$ por semana
  contractEnd: number;      // em semanas
  contractClause: number;   // cláusula de rescisão
  
  // Status
  morale: number;           // 0-100
  form: number;             // 0-100
  fitness: number;          // 0-100
  injury: {
    active: boolean;
    daysRemaining: number;
    totalDays: number;
    type: string;
    severity: 'minor' | 'moderate' | 'severe';
    source: 'training' | 'match' | 'random';
  } | null;
  
  // Hierarquia no plantel
  squadStatus: string;      // 'Key Player', 'Regular Starter', 'Rotation', 'Young Talent', 'Excess'
  
  // Dinâmica
  teamMates: string[];      // IDs de jogadores que se dão bem
  socialGroup: string | null; // ID do grupo social
  
  // Promessas ativas
  promises: PlayerPromise[];
  
  // Tratamento pelo treinador (11.4)
  coachTreatment: {
    type: 'starter' | 'substitute' | 'bench' | 'training' | 'rest';
    minutesPerWeek: number; // minutos semanais alocados
    trustLevel: number; // 1-100
    lastTrainingLoad: number; // 0-100
  };
  
  // Gestão de carga e prevenção de lesões
  consecutivePhysicalDays: number;
  cumulativeLoad: number;
  lastTrainingDay: number;
  recoveryNeeded: boolean;
  injuryRisk: number; // 0-100
  injuryHistory: InjuryHistory[];
  fatigueLog: FatigueLogEntry[]; // histórico de fadiga
  lastInjuryWeek?: number; // semana da última lesão (para tracking pós-lesão)
  degradedCondition?: 'minimal' | 'low' | 'moderate' | 'good' | 'excellent'; // condição pós-lesão
  
  // Progressão de atributos — histórico semanal (10.5)
  attributeHistory?: {
    week: number;
    technical: Partial<PlayerAttribute>;
    mental: Partial<PlayerAttribute>;
    physical: Partial<PlayerAttribute>;
    currentAbility: number;
    potentialAbility: number;
    morale: number;
    form: number;
    fitness: number;
  }[];
  
  // Famosidade para scouting
  fame: number;             // 1-100

  // Reputação do jogador (1-100) — reflete reconhecimento no futebol mundial
  reputation: number;       // 1-100

  // Estatísticas da temporada atual
  seasonGoals: number;      // gols na temporada atual
  seasonAssists: number;    // assistências na temporada atual

  // Agente livre (contrato expirado, sem clube)
  freeAgent?: boolean;

  /** Pedido público de transferência (moral destruída / promessas quebradas). */
  transferRequest?: {
    active: boolean;
    weekRequested: number;
    reason: 'low_morale' | 'broken_promise';
    /** Multiplicador do valor de mercado (ex: 0.75 = vende ~25% abaixo). */
    askingPriceDiscount: number;
  };
}

// ============================================================
// TIME
// ============================================================

export interface Scout {
  id: string;
  name: string;
  judgingAbility: number;    // 1-20
  judgingPotential: number;  // 1-20
  assigned: boolean;
  experience: number;        // pontos de experiência acumulados
  missionsCompleted: number; // missões concluídas
}

export interface Team {
  id: string;
  name: string;
  division: string;
  league: string;
  ownerId?: string | null;  // dono humano no modo online (null/ausente = IA)
  reputation: number;       // 1-100 (reputação do clube)
  budget: number;           // orçamento em milhões de R$
  wageBill: number;         // folha salarial em milhões de R$ por semana (= Σ salary / 1000)
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
  startingXI: string[]; // IDs dos 11 titulares (ordem = slot da formação)
  
  // Performance na tabela de jogos (11.4)
  leaguePosition: number; // 1-20
  leagueForm: string[]; // últimos 5 jogos: 'W', 'D', 'L'
  formRating: 'excellent' | 'good' | 'average' | 'poor' | 'terrible'; // forma recente
  
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
  // Em Transição (8.5.2)
  afterLosingPossession: 'counterPress' | 'regroup';
  afterGainingPossession: 'counterAttack' | 'retainStructure';
  // Sem Posse (8.5.3)
  engagementLine: 'high' | 'medium' | 'low';
  defensiveLine: 'high' | 'medium' | 'low';
  pressIntensity: 'low' | 'medium' | 'high';
  tacklingStyle: 'aggressive' | 'contain';
  trapOffside: boolean;
  /** @deprecated use afterLosingPossession */
  highPress: boolean;
  /** @deprecated use afterLosingPossession */
  counterPress: boolean;
  /** @deprecated use engagementLine / defensiveLine */
  highLine: boolean;
  /** @deprecated use tacklingStyle */
  aggressiveTackling: boolean;
  
  // Diretoria
  boardExpectation: string; // 'relegation', 'midtable', 'top4', 'title'
  staffLevel: number;
  
  // Olheiros
  scouts: Scout[];
  
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

// Ação individual durante a partida (cada passe, drible, chute, etc.)
export interface MatchAction {
  minute: number;
  type: 'pass' | 'dribble' | 'shot' | 'tackle' | 'interception' | 'clearance' | 'cross' | 'foul' | 'kickoff' | 'goalKick' | 'throwIn' | 'cornerKick' | 'freeKick' | 'penalty' | 'header';
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
  ballPos: number;
  ballHolderId: string;
  passChain: number;
  pressure: number;
  homeGoals: number;
  awayGoals: number;
  stats: MatchStats;
  events: MatchEvent[];
  actions: MatchAction[];
  goalDetails: { team: 'home' | 'away'; minute: number; scorerId: string; scorerName: string; assistId?: string; assistName?: string }[];
  interventionBoost?: { team: 'home' | 'away'; type: string; untilMinute: number };
  cards?: Record<string, number>;
  sentOff?: { home: string[]; away: string[] };
  ballPosY?: number;      // 0-1 largura do campo (0 = topo, 1 = base)
  momentum?: number;      // -1..1, positivo = casa embalada
  fatigue?: Record<string, number>;
  addedTime?: number;     // acréscimos do 2º tempo (jogo termina em 90 + addedTime)
  passTotals?: { homeAtt: number; homeCmp: number; awayAtt: number; awayCmp: number };
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

export interface HeatMapZone {
  label: string;
  third: 'defensive' | 'middle' | 'attacking';
  flank: 'left' | 'center' | 'right';
  intensity: number;
  actions: number;
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

export interface KeyMatchup {
  label: string;
  homePlayer: { id: string; name: string; position: string; rating: number };
  awayPlayer: { id: string; name: string; position: string; rating: number };
  advantage: 'home' | 'away' | 'even';
  edge: number;
}

export interface FormComparison {
  homeForm: string[];
  awayForm: string[];
  homeFormScore: number;
  awayFormScore: number;
}

export interface TacticalRecommendation {
  mentality: string;
  approach: string;
  reason: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PreMatchAnalysis {
  homeTeam: string;
  awayTeam: string;
  homeStrength: number;
  awayStrength: number;
  winProbability: { home: number; draw: number; away: number };
  predictedScore: { home: number; away: number };
  mostLikelyScore: string;
  expectedGoals: { home: number; away: number };
  keyMatchups: KeyMatchup[];
  formComparison: FormComparison;
  tacticalRecommendation: TacticalRecommendation;
  homeAdvantage: number;
  confidenceLevel: number;
  summary: string;
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
  liveActions: MatchAction[];
  liveMatchState?: LiveMatchState;
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

// ============================================================
// TRANSFERÊNCIAS E MENSAGENS
// ============================================================

// ============================================================
// CLÁUSULAS PARCELADAS E BÓNUS DE TRANSFERÊNCIA
// ============================================================

export interface InstallmentPayment {
  installmentNumber: number;
  amount: number; // em milhões
  dueWeek: number; // semana em que deve ser pago
  paid: boolean;
  paidWeek?: number;
}

export interface InstallmentClause {
  id?: string; // ID único da cláusula
  totalAmount: number; // valor total da transferência parcelada
  installmentCount: number; // número de parcelas
  installmentAmount: number; // valor de cada parcela
  payments: InstallmentPayment[]; // histórico de pagamentos
  status: 'active' | 'completed' | 'defaulted';
}

export interface PlayerBonus {
  id?: string; // ID único do bónus
  playerId: string;
  type: 'goals' | 'appearances' | 'assists' | 'titles' | 'performance';
  threshold: number; // quantidade necessária para ativar o bónus
  bonusAmount: number; // valor do bónus em milhares (K)
  triggered: boolean;
  triggeredWeek?: number;
  claimed?: boolean; // se o bónus já foi reclamado
}

// ============================================================
// ACORDO CONTRATUAL DE TRANSFERÊNCIA (Item 7.10)
// ============================================================

export interface ContractClause {
  weeklySalary: number; // em milhares
  contractWeeks: number; // duração em semanas
  releaseClause: number; // cláusula de rescisão em milhões
  performanceBonuses?: {
    type: 'goals' | 'appearances' | 'assists' | 'titles';
    threshold: number;
    bonusAmount: number; // em milhares
  }[];
}

export interface TransferAgreement {
  id: string; // ID único do acordo
  playerId: string;
  playerName: string;
  fromTeamId: string;
  toTeamId: string;
  transferFee: number; // valor da transferência em milhões
  paymentMethod: 'cash' | 'installments';
  contract: ContractClause; // cláusulas contratuais do jogador
  signingBonus?: number; // bónus de assinatura em milhares
  agreementDate: number; // timestamp da data de assinatura
  status: 'active' | 'terminated' | 'expired';
  // Cláusulas parceladas associadas ao acordo
  installmentClause?: InstallmentClause;
  // Histórico de alterações
  history?: {
    action: string;
    timestamp: number;
    reason?: string;
  }[];
}

export interface TransferOffer {
  playerId: string;
  offerPrice: number;
  fromTeam: string;
  paymentMethod?: 'cash' | 'installments'; // método de pagamento
  installmentClause?: InstallmentClause; // cláusula de pagamento parcelado
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
  paymentMethod?: 'cash' | 'installments';
  installmentClause?: InstallmentClause;
  bonuses?: PlayerBonus[]; // bónus incluídos na oferta
}

export interface CounterOffer {
  originalPlayerId: string;
  originalFromTeam: string;
  counterPrice: number; // preço proposto pelo usuário
  counterSalary: number;
  counterDuration: number;
  counterClause: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  paymentMethod?: 'cash' | 'installments';
  installmentClause?: InstallmentClause;
  bonuses?: PlayerBonus[];
}

export interface NegotiationResult {
  status: 'accepted' | 'rejected' | 'countered' | 'walked_away';
  marketValue: number;
  offerPrice: number;
  counterPrice?: number;
  message: string;
  playerWillingness?: number; // 0-100, quanto o jogador quer mudar de clube
  willingnessLabel?: string; // descrição textual da vontagem do jogador
  negotiationRound?: number; // ronda atual de negociação
  maxRounds?: number; // máximo de rondas antes de o vendedor desistir
  contractPreview?: {
    estimatedSalary: number; // em milhares
    estimatedWeeks: number;
    estimatedReleaseClause: number; // em milhões
  };
}

export interface ContractNegotiationResult {
  status: 'accepted' | 'rejected' | 'countered';
  offeredSalary: number; // em milhares
  expectedSalary: number; // em milhares — what the player wants
  counterSalary?: number; // em milhares — if countered
  message: string;
  negotiationRound: number;
  maxRounds: number;
}

export interface DeferredTransfer {
  playerId: string;
  offerPrice: number;
  fromTeam: string;
  contractProposal: {
    salary: number;
    duration: number; // em semanas
    clause: number;
  };
  paymentMethod?: 'cash' | 'installments';
  installmentClause?: InstallmentClause;
  bonuses?: PlayerBonus[];
  deferredAt: number; // timestamp quando foi adiado
  deferredWeek: number; // semana em que foi adiado
}

// ============================================================
// HISTÓRICO DE TRANSFERÊNCIAS REALIZADAS (Item 12 - Checklist)
// ============================================================

export interface CompletedTransfer {
  id: string; // ID único da transferência
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  nationality: string;
  fromTeamId: string;
  fromTeamName: string;
  transferFee: number; // valor da transferência em milhões
  paymentMethod: 'cash' | 'installments';
  contractWeeks: number; // duração do contrato em semanas
  weeklySalary: number; // em milhares
  transferDate: number; // timestamp da data da transferência
  transferWeek: number; // semana em que foi realizada
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
  grade?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
}

export interface ActiveScoutMission {
  id: string;
  scoutId: string;
  targetId: string;
  weeksAssigned: number;
  weeksTotal: number;
}

// ============================================================
// SISTEMA DE EMPRÉSTIMOS (LOANS)
// ============================================================

export interface LoanDeal {
  id: string;
  playerId: string;
  playerName: string;
  fromTeamId: string;
  fromTeamName: string;
  toTeamId: string;
  toTeamName: string;
  loanFee: number;
  weeklyWageContribution: number;
  durationWeeks: number;
  remainingWeeks: number;
  buyOptionFee?: number;
  buyOptionMandatory: boolean;
  startDate: number;
  startWeek: number;
  status: 'active' | 'completed' | 'recalled' | 'bought';
}

// ============================================================
// SISTEMA DE SHORTLIST
// ============================================================

export interface ShortlistEntry {
  playerId: string;
  addedAt: number;
  addedWeek: number;
  notes?: string;
  priority: 'high' | 'medium' | 'low';
}

// ============================================================
// RECOMENDAÇÕES DE SCOUTS
// ============================================================

export interface ScoutRecommendation {
  id: string;
  scoutId: string;
  scoutName: string;
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  estimatedCA: number;
  estimatedPA: number;
  currentTeamName: string;
  estimatedValue: number;
  reason: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  week: number;
  dismissed: boolean;
}

// ============================================================
// GUERRA DE OFERTAS (BIDDING WARS)
// ============================================================

export interface BiddingWar {
  id: string;
  playerId: string;
  playerName: string;
  sellerTeamId: string;
  sellerTeamName: string;
  userOffer: number;
  aiOffers: { teamId: string; teamName: string; offerPrice: number }[];
  highestOffer: number;
  isUserWinning: boolean;
  round: number;
  maxRounds: number;
  status: 'active' | 'won' | 'lost' | 'withdrawn';
  week: number;
}

// ============================================================
// RELATÓRIO DE LESÃO (Item 9.8.2)
// ============================================================

export interface InjuryReport {
  playerId: string;
  playerName: string;
  position: string;
  injuryType: string; // 'muscle', 'ligament', 'joint', 'ankle', 'knee', 'groin'
  severity: 'minor' | 'moderate' | 'severe'; // gravidade
  daysOut: number; // dias de afastamento
  recoveryProgress: number; // 0-100
  treatment: string; // tipo de tratamento recomendado
  prognosis: string; // prognóstico
  injuryProneness: number; // propensão do jogador (1-10)
}

// ============================================================
// RELATÓRIO FINANCEIRO (Item 9.8.4)
// ============================================================

export interface FinancialReport {
  teamId: string;
  teamName: string;
  budget: number; // em milhões
  wageBill: number; // em milhões
  ticketRevenue: number; // em milhões
  sponsorshipRevenue: number; // em milhões
  broadcastingRevenue: number; // em milhões
  totalIncome: number; // em milhões
  facilityCosts: number; // em milhões (semanal)
  staffCosts: number; // em milhões (semanal)
  totalExpenses: number; // em milhões
  profit: number; // em milhões
  transferSpending: number; // em milhões
  transferIncome: number; // em milhões
  season: number;
  week: number;
  daysUntilDeadline: number; // dias até o fim do período
  currency: 'BRL';
}

// ============================================================
// RESPOSTA À DIRETORIA (Item 9.8.3)
// ============================================================

export interface BoardReplyEffect {
  satisfactionChange: number;
  budgetChange?: number;
  moraleChange?: number;
  transferBudgetChange?: number;
  fanMoodChange?: number;
  addBoardPromise?: { goal: string; deadline: number };
}

export interface BoardReplyOption {
  id: string;
  label: string;
  description: string;
  effects: BoardReplyEffect;
}

export interface BoardReply {
  messageId: string;
  subject: string;
  optionId: string;
  optionLabel: string;
  timestamp: number;
  sent: boolean;
  satisfactionChange: number;
  budgetChange?: number;
  moraleChange?: number;
  transferBudgetChange?: number;
  fanMoodChange?: number;
  category: 'budget' | 'transfer' | 'expectation' | 'performance' | 'general';
}

export interface InboxMessage {
  id: string;
  type: 'transfer' | 'injury' | 'suggestion' | 'board' | 'youth' | 'training' | 'financial' | 'news';
  subject: string;
  body: string;
  timestamp: number;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  relatedPlayerId?: string;
  relatedTeamId?: string;
  // Item 9.8.3 - Diretoria: Responder
  boardReply?: BoardReply;
  boardReplyOptions?: BoardReplyOption[];
}

// ============================================================
// TÁTICAS E TÁTICAS INDIVIDUAIS
// ============================================================

export interface PlayerRole {
  playerId: string; // ID do jogador (não posição, pois múltiplos jogadores podem ter a mesma posição)
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

// ============================================================
// BOLAS PARADAS (Set Pieces)
// ============================================================

export interface CornerSetPiece {
  delivery: 'near_post' | 'far_post' | 'penalty_area' | 'short' | 'edge_of_box';
  takerId: string;
  targetId: string;
}

export interface FreeKickSetPiece {
  delivery: 'shot_on_goal' | 'cross_into_box' | 'short' | 'long_ball';
  takerId: string;
}

export interface ThrowInSetPiece {
  style: 'short' | 'long' | 'quick';
  takerId: string;
}

export interface DefensiveCornerSetPiece {
  marking: 'man_to_man' | 'zonal' | 'mixed';
  counterAttack: boolean;
}

export interface DefensiveFreeKickSetPiece {
  marking: 'man_to_man' | 'zonal' | 'mixed';
  wallSize: 'small' | 'medium' | 'large';
}

export interface SetPiecesConfig {
  corners: CornerSetPiece;
  freeKicks: FreeKickSetPiece;
  throwIns: ThrowInSetPiece;
  penalties: { takerId: string };
  defensiveCorners: DefensiveCornerSetPiece;
  defensiveFreeKicks: DefensiveFreeKickSetPiece;
}

export interface TeamTacticsConfig {
  playerRoles: PlayerRole[];
  playerInstructions: PlayerInstruction[];
  setPieces?: SetPiecesConfig;
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
// PREVENÇÃO DE LESÕES
// ============================================================

export interface InjuryHistory {
  playerId: string;
  injuryType: string;
  severity: 'minor' | 'moderate' | 'severe';
  daysOut: number;
  occurredWeek: number;
  fullyRecovered: boolean;
}

export interface LoadManagement {
  playerId: string;
  consecutivePhysicalDays: number;
  cumulativeLoad: number;
  lastTrainingDay: number;
  recoveryNeeded: boolean;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
}

export interface PreventionSession {
  type: 'medical' | 'recovery' | 'light';
  targetPlayerIds: string[];
  effectiveness: number; // 0-100
  day: number;
}

export interface PlayerLoadState {
  trainingLoad: number;
  matchLoad: number;
  totalLoad: number;
  fatigueThreshold: number;
  injuryRisk: number; // 0-100
}

// ============================================================
// HISTÓRICO DE FADIGA E RECOMENDAÇÕES
// ============================================================

export interface FatigueLogEntry {
  week: number;
  day: number;
  fatigue: number;
  cumulativeLoad: number;
  trainingType: string;
}

export interface Recommendation {
  id: string;
  type: 'rest' | 'medical' | 'recovery' | 'light' | 'substitution';
  playerId: string;
  playerName: string;
  message: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  week: number;
  timestamp: number;
  acknowledged: boolean;
}

export interface DegradedCondition {
  playerId: string;
  playerName: string;
  conditionLevel: 'minimal' | 'low' | 'moderate' | 'good' | 'excellent';
  weeksSinceInjury: number;
  recoveryProgress: number; // 0-100
  status: 'recovering' | 'resting' | 'training' | 'match';
  weekTracked: number;
}

// ============================================================
// ÁRVORE SOCIAL (Item 11.5)
// ============================================================

export interface SocialNode {
  playerId: string;
  playerName: string;
  position: string;
  socialGroup: string;
  influence: number; // 0-100, baseado em liderança e squadStatus
  connections: string[]; // IDs de jogadores que se conectam diretamente
  depth?: number; // profundidade na hierarquia social
}

export interface SocialTree {
  rootNodeId: string | null; // jogador central da equipe
  nodes: SocialNode[];
  edges: { from: string; to: string; strength: number }[];
  generatedWeek: number; // semana em que foi gerada
}

// ============================================================
// ESTADO GLOBAL DO JOGO
// ============================================================

// ============================================================
// SISTEMA DE SAVES (Máximo 2 slots)
// ============================================================

export interface SaveSlotMetadata {
  slotNumber: 1 | 2;
  teamName: string;
  currentWeek: number;
  currentSeason: number;
  savedAt: string; // ISO date string
}

export interface SaveSlot {
  metadata: SaveSlotMetadata;
  gameState: GameState;
}

// ============================================================
// TIPOS DA TABELA DE CLASSIFICAÇÃO
// ============================================================

export type FormResult = 'W' | 'D' | 'L';

export interface LeagueStandings {
  teamId: string;
  teamName: string;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: FormResult[];
  zone?: 'title' | 'europe' | 'safe' | 'relegation';
  isRelegated?: boolean; // Item 1.2 — marca time rebaixado
}

// ============================================================
// ACADEMIA DE JOVENS (P6.1)
// ============================================================

export interface YouthPlayer {
  id: string;
  name: string;
  surname: string;
  position: string;
  age: number;
  nationality: string;
  technical: Partial<PlayerAttribute>;
  mental: Partial<PlayerAttribute>;
  physical: Partial<PlayerAttribute>;
  currentAbility: number;
  potentialAbility: number;
  academyLevel: number; // 1-5 (progressão na academia)
  weeksInAcademy: number;
  trainingGrowth: number; // taxa de crescimento semanal
  morale: number;
  readyForPromotion: boolean; // quando PA >= CA e academyLevel >= 4
}

export interface YouthAcademy {
  players: YouthPlayer[];
  level: number; // 1-10 (qualidade das instalações)
  weeklySlots: number; // vagas de treino na semana
  currentTraining: string; // 'technical', 'physical', 'tactical', 'mental'
  graduationRate: number; // 0-100 (probabilidade de promoção)
}

// ============================================================
// EQUIPE RESERVA (P6.2)
// ============================================================

export interface ReserveTeamPlayer {
  playerId: string;
  player: Player;
  isStarter: boolean;
  reserveRank: number; // 1-15 (posição no reserva)
  weeksOnReserve: number;
  readiness: number; // 0-100 (preparação para promoção)
}

// ============================================================
// RESUMO DE FIM DE TEMPORADA
// ============================================================

export interface SeasonSummary {
  season: number;
  teamName: string;
  position: number;
  zone: 'title' | 'europe' | 'safe' | 'relegation';
  zoneLabel: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  topScorer: { name: string; goals: number } | null;
  topAssister: { name: string; assists: number } | null;
  isFinalSeason: boolean;
}

// ============================================================
// SISTEMA DE COLETIVA DE IMPRENSA
// ============================================================

export type PressQuestionCategory =
  | 'match_preview' | 'match_review' | 'transfer' | 'player_form'
  | 'tactics' | 'board' | 'rivalry' | 'injury' | 'season_goals' | 'controversy';

export type PressTone = 'aggressive' | 'neutral' | 'friendly' | 'provocative';

export interface PressQuestion {
  id: string;
  category: PressQuestionCategory;
  tone: PressTone;
  journalistName: string;
  outlet: string;
  question: string;
  relatedPlayerId?: string;
  relatedPlayerName?: string;
  relatedTeamName?: string;
}

export type PressResponseTone = 'praise' | 'defensive' | 'critical' | 'diplomatic' | 'deflect';

export interface PressResponse {
  questionId: string;
  tone: PressResponseTone;
  text: string;
}

export type PressConferenceType = 'pre_match' | 'post_match' | 'general';

export interface PressConference {
  id: string;
  type: PressConferenceType;
  week: number;
  season: number;
  questions: PressQuestion[];
  responses: PressResponse[];
  status: 'pending' | 'completed' | 'skipped';
  context: {
    opponentName?: string;
    isHome?: boolean;
    lastResult?: { homeGoals: number; awayGoals: number; opponentName: string };
    leaguePosition?: number;
    recentForm?: string[];
  };
  effects?: PressConferenceEffects;
}

export interface PressConferenceEffects {
  moraleChange: number;
  boardSatisfactionChange: number;
  fanMoodChange: number;
  mediaPressureChange: number;
  affectedPlayerIds: string[];
  headline: string;
}

export interface FanMood {
  value: number;
  trend: 'rising' | 'stable' | 'falling';
  sentiment: 'ecstatic' | 'happy' | 'satisfied' | 'neutral' | 'concerned' | 'angry' | 'furious';
}

export interface MediaPressure {
  value: number;
  level: 'low' | 'moderate' | 'high' | 'intense';
  trendingTopic?: string;
}

export const RESPONSE_OPTIONS: Record<PressResponseTone, { label: string; text: string }[]> = {
  praise: [
    { label: 'Elogiar o time', text: 'O time está jogando muito bem. Tenho orgulho desses jogadores.' },
    { label: 'Mostrar confiança', text: 'Acredito totalmente no grupo. Estamos no caminho certo.' },
    { label: 'Valorizar o adversário', text: 'Respeitamos o adversário, mas confiamos no nosso trabalho.' },
  ],
  defensive: [
    { label: 'Postura defensiva', text: 'Não vou comentar sobre isso. O foco é a próxima partida.' },
    { label: 'Proteger o grupo', text: 'O grupo está unido. O que acontece no vestiário fica no vestiário.' },
    { label: 'Evitar polêmica', text: 'Prefiro não entrar nesse mérito. Cada um tem sua opinião.' },
  ],
  critical: [
    { label: 'Cobrar mais do time', text: 'O nível tem que subir. Não dá para aceitar esse padrão.' },
    { label: 'Crítica direta', text: 'Faltou atitude. Precamos corrigir isso urgentemente.' },
    { label: 'Assumir responsabilidade', text: 'A culpa é minha. Preciso fazer melhor como treinador.' },
  ],
  diplomatic: [
    { label: 'Resposta equilibrada', text: 'Entendo a pergunta, mas vejo de forma diferente. O futebol tem altos e baixos.' },
    { label: 'Diplomacia', text: 'Respeito todas as opiniões. Nosso trabalho fala por si dentro de campo.' },
    { label: 'Visão construtiva', text: 'Temos pontos a melhorar, mas também muita coisa positiva para valorizar.' },
  ],
  deflect: [
    { label: 'Desviar do assunto', text: 'Essa é uma pergunta para outra pessoa. Eu foco em campo.' },
    { label: 'Responder com ironia', text: 'Boa pergunta. Se eu tivesse a resposta, seria um homem muito feliz.' },
    { label: 'Focar no próximo jogo', text: 'Já olhamos para frente. O próximo jogo é o mais importante.' },
  ],
};

// ============================================================
// ESTADO DO JOGO
// ============================================================

export interface GameState {
  selectedTeam: string | null;
  currentWeek: number;
  currentSeason: number;
  matches: Match[];
  teams: Team[];
  transfers: TransferOffer[];
  incomingTransfers: IncomingTransfer[];
  counterOffers: CounterOffer[];
  deferredTransfers: DeferredTransfer[]; // transferências adiadas
  inbox: InboxMessage[];
  trainingPlan: WeeklyTrainingPlan | null;
  youthIntakeCompleted: boolean;
  scoutReports: ScoutReport[];
  // Cláusulas parceladas e bónus
  pendingInstallments: InstallmentClause[]; // parcelas a pagar pelo jogador
  incomingBonuses: PlayerBonus[]; // bónus a receber por jogadores
  // Acordos contratuais (Item 7.10)
  transferAgreements: TransferAgreement[]; // acordos de transferência ativos
  // Item 9.8.3 - Diretoria: Responder
  boardReplies: BoardReply[]; // respostas ao board
  boardSatisfaction: number; // satisfação da diretoria (-100 a 100)
  // Item 9.8.4 - Financeiro: Ver Relatório
  financialReports: FinancialReport[]; // relatórios financeiros
  // Prevenção de lesões
  injuryHistory: InjuryHistory[]; // histórico de lesões do time
  preventionSessions: PreventionSession[]; // sessões de prevenção
  fatigueLog: FatigueLogEntry[]; // histórico de fadiga por jogador
  recommendations: Recommendation[]; // recomendações automáticas
  degradedConditions: DegradedCondition[]; // condições degradadas pós-lesão
  // Item 11.5 - Árvore Social
  socialTree: SocialTree | null;
  // Tabela de Classificação (P1.1)
  leagueTable: LeagueStandings[];
  // Saves (Item 12)
  saveSlots?: SaveSlot[]; // máximo 2 saves (não persistido via middleware, gerenciado externamente)
  // P6.1 — Academia de Jovens
  youthAcademy: YouthAcademy;
  // P6.2 — Equipe Reserva
  reserveTeam: ReserveTeamPlayer[];
  // Item 12 - Checklist: Histórico de transferências realizadas
  completedTransfers: CompletedTransfer[];
  // Scouting — conhecimento do manager sobre jogadores
  scoutKnowledge: Record<string, number>;
  scoutMissions: ActiveScoutMission[];
  // Shortlist — jogadores marcados para acompanhamento
  shortlist: ShortlistEntry[];
  // Recomendações de scouts
  scoutRecommendations: ScoutRecommendation[];
  // Empréstimos ativos
  activeLoans: LoanDeal[];
  // Guerras de ofertas ativas
  biddingWars: BiddingWar[];
  // Resumo de fim de temporada
  seasonSummary: SeasonSummary | null;
  gameOver: boolean;
  // Sistema de Coletiva de Imprensa
  pressConferences: PressConference[];
  fanMood: FanMood;
  mediaPressure: MediaPressure;
  isAdvancing: boolean;
  matchBlockMessage: string | null;
  // Agentes livres (jogadores sem clube após expiração de contrato)
  freeAgents: Player[];
  // Toasts globais (C4)
  toasts: ToastData[];
}

export interface GameActions {
  initGame: () => void;
  deselectTeam: () => void;
  selectTeam: (teamId: string) => void;
  simulateMatch: (matchIndex: number) => void;
  advanceWeek: () => void;
  markAsRead: (messageId: string) => void;
  removeMessage: (messageId: string) => void;
  updatePlayerAttributes: (playerId: string, trainingType: string) => void;
  completeYouthIntake: () => void;
  updateTeam: (teamId: string, updater: (team: Team) => Team) => void;
  buyPlayer: (playerId: string, sellerTeamId: string) => boolean;
  signFreeAgent: (playerId: string) => boolean;
  makeOffer: (playerId: string, sellerTeamId: string, offerPrice: number, negotiationRound?: number) => Promise<NegotiationResult>;
  acceptOffer: (playerId: string, sellerTeamId: string, offerPrice: number, agreedSalary: number) => Promise<boolean>;
  negotiatePlayerContract: (playerId: string, sellerTeamId: string, offeredSalary: number, negotiationRound: number) => Promise<ContractNegotiationResult>;
  acceptIncomingTransfer: (playerId: string) => void;
  rejectIncomingTransfer: (playerId: string) => void;
  deferTransfer: (playerId: string) => void;
  reinstateDeferredTransfer: (playerId: string) => void;
  rejectDeferredTransfer: (playerId: string) => void;
  assignScout: (playerId?: string) => boolean;
  setTrainingPlan: (plan: WeeklyTrainingPlan) => void;
  applyWeeklyTraining: (targetGroup?: 'all' | 'attackers' | 'midfielders' | 'defenders' | 'custom', customPlayerIds?: string[]) => void;
  handleInboxAction: (messageId: string, actionLabel: string) => void;
  applyMatchIntervention: (matchIndex: number, type: 'substitution' | 'shout') => void;
  substitutePlayer: (matchIndex: number, outId: string, inId: string) => void;
  applyShout: (matchIndex: number, shout: 'encourage' | 'demand' | 'praise' | 'calm') => void;
  negotiateCounterOffer: (playerId: string) => boolean;
  // Métodos para cláusulas parceladas e bónus
  payInstallment: (installmentId: string) => Promise<boolean>;
  checkBonuses: (playerId?: string) => void;
  claimBonus: (bonusId: string) => void;
  generateInstallmentClause: (totalAmount: number, count: number) => InstallmentClause;
  generatePlayerBonus: (type: PlayerBonus['type'], threshold: number, bonusAmount: number) => PlayerBonus;
  // Métodos para acordos contratuais (Item 7.10)
  terminateTransferAgreement: (agreementId: string, reason?: string) => void;
  getTransferAgreements: (playerId?: string) => TransferAgreement[];
  // Item 9.8.2 - Lesão: Ver Relatório
  getInjuryReport: (playerId: string) => InjuryReport | null;
  // Item 9.8.3 - Diretoria: Responder
  handleBoardReply: (messageId: string, optionId: string) => void;
  // Item 9.8.4 - Financeiro: Ver Relatório
  getFinancialReport: () => FinancialReport | null;
  generateFinancialReport: () => FinancialReport | null;
  // Prevenção de lesões
  schedulePreventionSession: (session: PreventionSession) => void;
  applyPreventionSession: () => void;
  updatePlayerLoad: (playerId: string, day: number, trainingType: string) => void;
  calculateInjuryRisk: (playerId: string) => number;
  recoverInjuredPlayer: (playerId: string) => void;
  getInjuryRiskSummary: () => { critical: Player[]; high: Player[]; moderate: Player[]; low: Player[] };
  // Novos métodos de gestão de fadiga e recomendações
  applyFatigueDecay: () => void;
  generateInjuryRecommendation: (playerId: string) => void;
  applyPostInjuryCondition: (playerId: string) => void;
  acknowledgeRecommendation: (recommendationId: string) => void;
  getFatigueHistory: (playerId: string) => FatigueLogEntry[];
  applyTrainingCooldown: (playerId: string, trainingType: string, day: number) => void;
  updateDegradedConditions: () => void;
  generateLiveMatchMinute: (matchIndex: number) => void;
  // Finalizar partida ao vivo
  finishMatch: (matchIndex: number) => void;
  // Progressão de atributos (10.5)
  captureWeeklyAttributeSnapshot: () => void;
  getAttributeDelta: (playerId: string, attributeName: string, weekA: number, weekB: number) => number;
  getPlayerAttributeProgression: (playerId: string) => { week: number; changes: Record<string, { from: number; to: number }> }[];
  // Item 11.5 - Árvore Social
  generateSocialTree: () => void;
  getSocialTree: () => SocialTree | null;
  updateSocialConnections: (playerIdA: string, playerIdB: string, strength: number) => void;
  // Item 11.6 - Contador dinâmico de promessas
  updatePromiseCountdown: () => void;
  getActivePromises: () => { player: Player; promise: PlayerPromise; weeksLeft: number }[];
  checkPromiseDeadlines: () => { fulfilled: PlayerPromise[]; expired: PlayerPromise[] };
  adjustPlayerSalary: (playerId: string, newSalary: number) => void;
  // Item 11.4 - Tratamento pelo treinador
  setCoachTreatment: (playerId: string, treatment: {
    type: 'starter' | 'substitute' | 'bench' | 'training' | 'rest';
    minutesPerWeek: number;
    trustLevel: number;
    lastTrainingLoad: number;
  }) => void;
  setPlayerTrustLevel: (playerId: string, trustLevel: number) => void;
  setPlayerTrainingLoad: (playerId: string, trainingLoad: number) => void;
  // Item 11.4 - Performance do clube
  updateClubPerformance: (updates: {
    leaguePosition?: number;
    leagueForm?: string[];
    formRating?: 'excellent' | 'good' | 'average' | 'poor' | 'terrible';
  }) => void;
  updateLeagueForm: (result: 'W' | 'D' | 'L') => void;
  setLeaguePosition: (position: number) => void;
  // Sistema de Saves
  saveGame: (slotNumber: 1 | 2) => Promise<void>;
  loadGame: (slotNumber: 1 | 2) => Promise<void>;
  deleteSave: (slotNumber: 1 | 2) => void;
  getSaveSlots: () => SaveSlotMetadata[];
  // P6.1 — Academia de Jovens
  generateYouthPlayers: () => void;
  promoteYouthPlayer: (playerId: string) => void;
  setAcademyTraining: (type: string) => void;
  getYouthPlayers: () => YouthPlayer[];
  // P6.2 — Equipe Reserva
  addPlayerToReserve: (playerId: string) => void;
  promoteFromReserve: (playerId: string) => void;
  getReserveTeam: () => ReserveTeamPlayer[];
  setReserveTraining: (type: string) => void;
  // Item 12 - Checklist: Histórico de transferências realizadas
  getCompletedTransfers: () => CompletedTransfer[];
  // Scouting
  assignScoutMission: (scoutId: string, targetId: string, weeks: number) => boolean;
  getScoutKnowledge: (playerId: string) => number;
  // Shortlist
  addToShortlist: (playerId: string, priority?: 'high' | 'medium' | 'low', notes?: string) => boolean;
  removeFromShortlist: (playerId: string) => void;
  getShortlist: () => ShortlistEntry[];
  // Empréstimos
  loanPlayer: (playerId: string, sellerTeamId: string, durationWeeks: number, loanFee: number, buyOptionFee?: number, buyOptionMandatory?: boolean) => boolean;
  recallLoanedPlayer: (loanId: string) => void;
  buyLoanedPlayer: (loanId: string) => boolean;
  // Cláusula de rescisão
  activateReleaseClause: (playerId: string, sellerTeamId: string) => boolean;
  // Guerra de ofertas
  raiseBid: (biddingWarId: string, newOffer: number) => boolean;
  withdrawBid: (biddingWarId: string) => void;
  // Recomendações de scouts
  dismissScoutRecommendation: (recommendationId: string) => void;
  // Centro de Inteligência Pré-Jogo
  getPreMatchAnalysis: (matchIndex: number) => Promise<PreMatchAnalysis | null>;
  // Sistema de Coletiva de Imprensa
  generatePreMatchPressConference: (matchIndex: number) => Promise<PressConference | null>;
  generatePostMatchPressConference: (matchIndex: number) => Promise<PressConference | null>;
  answerPressQuestion: (conferenceId: string, questionId: string, tone: PressResponseTone, text: string) => Promise<void>;
  skipPressConference: (conferenceId: string) => void;
  applyPressConferenceEffects: (conferenceId: string) => void;
  processWeeklyPressDecay: () => void;
  getPendingPressConference: () => PressConference | null;
  getPressConferenceHistory: () => PressConference[];
  // Resumo de fim de temporada
  startNextSeason: () => void;
  // Toasts (C4)
  pushToast: (message: string, type: ToastData['type']) => void;
  dismissToast: (id: string) => void;
}

export type GameStore = GameState & GameActions;
