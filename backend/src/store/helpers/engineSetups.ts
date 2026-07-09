// Setups táticos de referência para o teste de upset (Seção 0.5 da checklist — Pilar C)
// REF_COESO: deveres equilibrados, cobertura de espaço, sem 2 playmakers na mesma zona.
// REF_INCOERENTE: todos em attack, dois playmakers na mesma zona, wing-backs Attack sem contenção.
// Gap de força fixo: time A (incoerente) = 130% da força efetiva de B (coerente).

import type { Team, PlayerRole, PlayerInstruction, TeamTacticsConfig } from '../../types/game';
import { createDefaultSetPiecesConfig } from '../../utils/playerGenerator';
import { UPSET_STRENGTH_GAP } from './engineInvariants';

// ============================================================
// ROLES POR SLOT — formação 4-3-3 (11 slots)
// Slot: 0=GK, 1-4=DEF, 5-7=MID, 8-10=FWD
// ============================================================

const REF_COESO_ROLES: Array<{ role: string; duty: string }> = [
  { role: 'goalkeeper',          duty: 'defend'  }, // 0  GK
  { role: 'fullBack',            duty: 'support' }, // 1  DL
  { role: 'centralDefender',     duty: 'defend'  }, // 2  DC
  { role: 'centralDefender',     duty: 'defend'  }, // 3  DC
  { role: 'fullBack',            duty: 'support' }, // 4  DR
  { role: 'centralMidfielder',   duty: 'defend'  }, // 5  MC (volante)
  { role: 'deepLyingPlaymaker',  duty: 'support' }, // 6  MC (único playmaker)
  { role: 'boxToBox',            duty: 'support' }, // 7  MC
  { role: 'winger',              duty: 'attack'  }, // 8  FL
  { role: 'advancedForward',     duty: 'attack'  }, // 9  FC
  { role: 'invertedWinger',      duty: 'attack'  }, // 10 FR
];

const REF_INCOERENTE_ROLES: Array<{ role: string; duty: string }> = [
  { role: 'sweeperKeeper',        duty: 'attack'  }, // 0  GK
  { role: 'wingBack',             duty: 'attack'  }, // 1  DL
  { role: 'ballPlayingDefender',  duty: 'attack'  }, // 2  DC (playmaker na zaga)
  { role: 'ballPlayingDefender',  duty: 'attack'  }, // 3  DC (segundo playmaker na zaga)
  { role: 'wingBack',             duty: 'attack'  }, // 4  DR
  { role: 'advancedPlaymaker',    duty: 'attack'  }, // 5  MC (playmaker)
  { role: 'advancedPlaymaker',    duty: 'attack'  }, // 6  MC (segundo playmaker — mesma zona!)
  { role: 'mezzala',              duty: 'attack'  }, // 7  MC
  { role: 'winger',               duty: 'attack'  }, // 8  FL
  { role: 'completeForward',      duty: 'attack'  }, // 9  FC
  { role: 'invertedWinger',       duty: 'attack'  }, // 10 FR
];

// ============================================================
// INSTRUÇÕES DE TIME POR SETUP
// ============================================================

interface TeamTacticSetup {
  formation: string;
  tactic: string;
  teamMentality: string;
  attackWidth: string;
  passingStyle: string;
  tempo: string;
  useFlank: string;
  workBallIntoBox: boolean;
  crossFromWide: boolean;
  takeMoreRisks: boolean;
  afterLosingPossession: 'counterPress' | 'regroup';
  afterGainingPossession: 'counterAttack' | 'retainStructure';
  engagementLine: 'high' | 'medium' | 'low';
  defensiveLine: 'high' | 'medium' | 'low';
  pressIntensity: 'low' | 'medium' | 'high';
  tacklingStyle: 'aggressive' | 'contain';
  trapOffside: boolean;
}

const REF_COESO_TACTICS: TeamTacticSetup = {
  formation: '4-3-3',
  tactic: 'balanced',
  teamMentality: 'balanced',
  attackWidth: 'balanced',
  passingStyle: 'mixed',
  tempo: 'balanced',
  useFlank: 'neither',
  workBallIntoBox: true,
  crossFromWide: false,
  takeMoreRisks: false,
  afterLosingPossession: 'regroup',
  afterGainingPossession: 'retainStructure',
  engagementLine: 'medium',
  defensiveLine: 'medium',
  pressIntensity: 'medium',
  tacklingStyle: 'contain',
  trapOffside: false,
};

const REF_INCOERENTE_TACTICS: TeamTacticSetup = {
  formation: '4-3-3',
  tactic: 'attacking',
  teamMentality: 'very offensive',
  attackWidth: 'wide',
  passingStyle: 'short',
  tempo: 'fast',
  useFlank: 'neither',
  workBallIntoBox: false,
  crossFromWide: true,
  takeMoreRisks: true,
  afterLosingPossession: 'counterPress',
  afterGainingPossession: 'counterAttack',
  engagementLine: 'high',
  defensiveLine: 'high',
  pressIntensity: 'high',
  tacklingStyle: 'aggressive',
  trapOffside: true,
};

// ============================================================
// APLICADORES — modificam um Team (retorna cópia)
// ============================================================

function buildRoles(team: Team, roleDefs: Array<{ role: string; duty: string }>): PlayerRole[] {
  const xi = team.startingXI;
  return roleDefs.map((def, i) => ({
    playerId: xi[i] ?? team.squad[i]?.id ?? '',
    slotIndex: i,
    role: def.role,
    duty: def.duty,
  }));
}

function buildInstructions(team: Team): PlayerInstruction[] {
  return team.startingXI.slice(0, 11).map(id => ({
    playerId: id,
    passMore: false, passLess: false, shootMore: false, shootLess: false,
    dribbMore: false, dribbLess: false, goGoal: false, stayBack: false,
    crossMore: false, crossLess: false, cutInside: false, RunThrough: false,
    playSlower: false, playFaster: false, throwInMore: false, takeMoreRisks: false,
    tackleMore: false, tackleLess: false, beMoreAggressive: false, beFairer: false,
  }));
}

function applyTacticSetup(team: Team, tactics: TeamTacticSetup, roleDefs: Array<{ role: string; duty: string }>): Team {
  const roles = buildRoles(team, roleDefs);
  const instructions = buildInstructions(team);
  const setPieces = team.tacticsConfig?.setPieces ?? createDefaultSetPiecesConfig();
  const tacticsConfig: TeamTacticsConfig = {
    playerRoles: roles,
    playerInstructions: instructions,
    setPieces,
  };
  return {
    ...team,
    formation: tactics.formation,
    tactic: tactics.tactic,
    teamMentality: tactics.teamMentality,
    attackWidth: tactics.attackWidth,
    passingStyle: tactics.passingStyle,
    tempo: tactics.tempo,
    useFlank: tactics.useFlank,
    workBallIntoBox: tactics.workBallIntoBox,
    crossFromWide: tactics.crossFromWide,
    takeMoreRisks: tactics.takeMoreRisks,
    afterLosingPossession: tactics.afterLosingPossession,
    afterGainingPossession: tactics.afterGainingPossession,
    engagementLine: tactics.engagementLine,
    defensiveLine: tactics.defensiveLine,
    pressIntensity: tactics.pressIntensity,
    tacklingStyle: tactics.tacklingStyle,
    trapOffside: tactics.trapOffside,
    highPress: false,
    counterPress: tactics.afterLosingPossession === 'counterPress',
    highLine: tactics.defensiveLine === 'high',
    aggressiveTackling: tactics.tacklingStyle === 'aggressive',
    tacticsConfig,
  };
}

/** Aplica o setup coerente a um time. */
export function applyRefCoeso(team: Team): Team {
  return applyTacticSetup(team, REF_COESO_TACTICS, REF_COESO_ROLES);
}

/** Aplica o setup incoerente a um time. */
export function applyRefIncoerente(team: Team): Team {
  return applyTacticSetup(team, REF_INCOERENTE_TACTICS, REF_INCOERENTE_ROLES);
}

// ============================================================
// ESCALONADOR DE FORÇA — cria gap fixo para o teste de upset
// ============================================================

/** Escala o currentAbility e atributos de todos os jogadores do elenco por um fator. */
export function scaleTeamStrength(team: Team, factor: number): Team {
  const scaleAttr = (v: number | undefined): number | undefined => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return v;
    return Math.round(Math.min(20, v * factor));
  };

  const scaleGroup = <T extends object>(group: T): T => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(group)) {
      out[k] = scaleAttr(v as number);
    }
    return out as T;
  };

  const scaledSquad = team.squad.map(p => ({
    ...p,
    currentAbility: Math.round(Math.min(200, p.currentAbility * factor)),
    technical: scaleGroup(p.technical),
    mental: p.mental ? scaleGroup(p.mental) : p.mental,
    physical: p.physical ? scaleGroup(p.physical) : p.physical,
    goalkeeping: p.goalkeeping ? scaleGroup(p.goalkeeping) : p.goalkeeping,
  }));
  return { ...team, squad: scaledSquad };
}

/**
 * Cria o par de confronto do teste de upset a partir de um time base.
 * Retorna [timeA (incoerente, 130% força), timeB (coerente, 100% força)].
 */
export function buildUpsetMatchup(baseTeam: Team): { teamA: Team; teamB: Team } {
  const teamB = applyRefCoeso(baseTeam);
  const teamA = applyRefIncoerente(scaleTeamStrength(baseTeam, UPSET_STRENGTH_GAP));
  return { teamA, teamB };
}
