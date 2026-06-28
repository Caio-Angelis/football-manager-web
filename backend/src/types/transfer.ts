// Tipos de Transferências, Acordos e Cláusulas

import type { PlayerAttribute } from './player';

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

// ============================================================
// SCOUTING
// ============================================================

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
  grade?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; // nota de recomendação
}

export interface ActiveScoutMission {
  id: string;
  scoutId: string;
  targetId: string;       // Player ID do jogador sendo observado
  weeksAssigned: number;  // semanas restantes na missão
  weeksTotal: number;     // total de semanas designadas
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
  loanFee: number;          // taxa de empréstimo em milhões (paga upfront)
  weeklyWageContribution: number; // % do salário pago pelo clube cedente (0-100)
  durationWeeks: number;    // duração em semanas
  remainingWeeks: number;   // semanas restantes
  buyOptionFee?: number;    // cláusula de compra opcional em milhões
  buyOptionMandatory: boolean; // se a compra é obrigatória ao fim do empréstimo
  startDate: number;        // timestamp
  startWeek: number;        // semana do início
  status: 'active' | 'completed' | 'recalled' | 'bought';
}

// ============================================================
// SISTEMA DE SHORTLIST
// ============================================================

export interface ShortlistEntry {
  playerId: string;
  addedAt: number;          // timestamp
  addedWeek: number;        // semana em que foi adicionado
  notes?: string;           // notas do usuário
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
  reason: string;           // por que o scout recomenda este jogador
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  week: number;             // semana da recomendação
  dismissed: boolean;       // se o usuário dispensou a recomendação
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
  userOffer: number;        // oferta atual do usuário
  aiOffers: { teamId: string; teamName: string; offerPrice: number }[];
  highestOffer: number;     // maior oferta entre todas
  isUserWinning: boolean;   // se o usuário está liderando
  round: number;            // rodada atual de lances
  maxRounds: number;        // máximo de rodadas
  status: 'active' | 'won' | 'lost' | 'withdrawn';
  week: number;             // semana em que começou
}
