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
