// Tipos de Time e Táticas

import type { Player } from './player';

// ============================================================
// OLHEIRO (Scout)
// ============================================================

export interface Scout {
  id: string;
  name: string;
  judgingAbility: number;    // 1-20 — capacidade de avaliar atributos atuais
  judgingPotential: number;  // 1-20 — capacidade de avaliar potencial
  assigned: boolean;         // se está em missão ativa
  experience: number;        // 0-100 — experiência acumulada (ganha ao completar missões)
  missionsCompleted: number; // total de missões concluídas
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
  transferBudget: number;
  staffLevel: number;

  // Olheiros
  scouts: Scout[];
  
  // Promessas da diretoria
  boardPromises: { goal: string; deadline: number; fulfilled: boolean }[];
  
  // Configuração tática avançada
  tacticsConfig: TeamTacticsConfig;
}
