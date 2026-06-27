// Tipos de Academia de Jovens (P6.1) e Equipe Reserva (P6.2)

import type { PlayerAttribute, Player } from './player';

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
