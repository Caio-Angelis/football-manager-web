// Barrel de Tipos — Ponto de Entrada Único
// Re-exporta todos os tipos de domínio para compatibilidade total

// Player
export type { PlayerAttribute, GKAttributes, HiddenAttributes, Promise, Player } from './player';

// Team & Tactics
export type { PlayerRole, PlayerInstruction, TeamTacticsConfig, Team, Scout } from './team';

// Match
export type { MatchEvent, MatchStats, MatchAction, LiveMatchState, PlayerMatchRating, Match } from './match';

// Transfer
export type {
  InstallmentPayment, InstallmentClause, PlayerBonus,
  ContractClause, TransferAgreement, TransferOffer,
  IncomingTransfer, CounterOffer, NegotiationResult,
  DeferredTransfer, CompletedTransfer, ScoutReport,
  ActiveScoutMission,
} from './transfer';

// Injury & Fatigue
export type {
  InjuryHistory, LoadManagement, PreventionSession, PlayerLoadState,
  FatigueLogEntry, Recommendation, DegradedCondition, InjuryReport,
} from './injury';

// Financial & Board
export type { FinancialReport, BoardReply } from './financial';

// Inbox
export type { InboxMessage } from './inbox';

// Training
export type { TrainingSession, WeeklyTrainingPlan } from './training';

// Social
export type { SocialNode, SocialTree } from './social';

// League
export type { FormResult, LeagueStandings } from './league';

// Saves
export type { SaveSlotMetadata, SaveSlot } from './saves';

// Youth & Reserve
export type { YouthPlayer, YouthAcademy, ReserveTeamPlayer } from './youth';

// ============================================================
// ESTADO GLOBAL DO JOGO
// ============================================================

import type { Match } from './match';
import type { Team } from './team';
import type { TransferOffer, IncomingTransfer, CounterOffer, DeferredTransfer, InstallmentClause, PlayerBonus, TransferAgreement, CompletedTransfer, ScoutReport, NegotiationResult, ActiveScoutMission } from './transfer';
import type { InboxMessage } from './inbox';
import type { BoardReply, FinancialReport } from './financial';
import type { WeeklyTrainingPlan } from './training';
import type { InjuryHistory, PreventionSession, FatigueLogEntry, Recommendation, DegradedCondition, InjuryReport } from './injury';
import type { SocialTree } from './social';
import type { LeagueStandings } from './league';
import type { SaveSlot, SaveSlotMetadata } from './saves';
import type { YouthAcademy, ReserveTeamPlayer, YouthPlayer } from './youth';
import type { Player } from './player';
import type { Promise as PlayerPromise } from './player';

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
  scoutKnowledge: Record<string, number>; // Player ID -> 0-100
  scoutMissions: ActiveScoutMission[];   // missões de observação ativas
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
  makeOffer: (playerId: string, sellerTeamId: string, offerPrice: number, negotiationRound?: number) => NegotiationResult;
  acceptOffer: (playerId: string, sellerTeamId: string, offerPrice: number) => boolean;
  acceptIncomingTransfer: (playerId: string) => void;
  rejectIncomingTransfer: (playerId: string) => void;
  deferTransfer: (playerId: string) => void;
  reinstateDeferredTransfer: (playerId: string) => void;
  rejectDeferredTransfer: (playerId: string) => void;
  assignScout: (playerId?: string) => boolean;
  setTrainingPlan: (plan: WeeklyTrainingPlan) => void;
  applyWeeklyTraining: () => void;
  handleInboxAction: (messageId: string, actionLabel: string) => void;
  applyMatchIntervention: (matchIndex: number, type: 'substitution' | 'shout') => void;
  negotiateCounterOffer: (playerId: string) => boolean;
  // Métodos para cláusulas parceladas e bónus
  payInstallment: (installmentId: string) => boolean;
  checkBonuses: (playerId?: string) => void;
  claimBonus: (bonusId: string) => void;
  // Métodos para cláusulas parceladas e bónus
  generateInstallmentClause: (totalAmount: number, count: number) => InstallmentClause;
  generatePlayerBonus: (type: PlayerBonus['type'], threshold: number, bonusAmount: number) => PlayerBonus;
  // Métodos para acordos contratuais (Item 7.10)
  terminateTransferAgreement: (agreementId: string, reason?: string) => void;
  getTransferAgreements: (playerId?: string) => TransferAgreement[];
  // Item 9.8.2 - Lesão: Ver Relatório
  getInjuryReport: (playerId: string) => InjuryReport | null;
  // Item 9.8.3 - Diretoria: Responder
  handleBoardReply: (messageId: string, response: string, category: BoardReply['category']) => void;
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
  saveGame: (slotNumber: 1 | 2) => void;
  loadGame: (slotNumber: 1 | 2) => void;
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
  // Scouting — designar olheiro a jogador
  assignScoutMission: (scoutId: string, targetId: string, weeks: number) => boolean;
  getScoutKnowledge: (playerId: string) => number;
}

export type GameStore = GameState & GameActions;
