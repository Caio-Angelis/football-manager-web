// Tipos de Lesão, Fadiga, Carga e Recomendações

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
