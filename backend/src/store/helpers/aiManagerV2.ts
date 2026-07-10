// IA adversária v2 — Fase 8 da checklist do motor v2
// IA monta setup coerente (equilíbrio de duties, cobertura), escalando por effectiveStrength.
// IA lê o padrão do adversário e escolhe a contraposição da matriz da Seção 5.
// IA faz game management: recua ganhando, arrisca perdendo, substitui por fadiga/cartão/lesão.
// Curva de dificuldade: IA elite vence/empata fração respeitável; IA fraca perde para setup coerente.

import type { Team, Player, LiveMatchState } from '../../types/game';
import { effectiveStrength, ROLE_WEIGHTS, FORMATION_LAYOUT } from './roles';
import { computeZoneOccupancy, occupantsInZone, type ZoneOccupant } from './zones';
import { relationalModifier, deriveActiveInstruction, effectiveDuty } from './instructions';

// ============================================================
// 8.1 — IA monta setup coerente (equilíbrio de duties, cobertura)
// ============================================================

/**
 * Avalia a coerência de um setup tático.
 * Setup coerente tem: mistura de duties, cobertura de zonas, roles apropriados.
 */
export function evaluateSetupCoherence(team: Team): number {
  const roles = team.tacticsConfig?.playerRoles ?? [];
  if (roles.length === 0) return 0.5;

  const duties = roles.map(r => r.duty ?? 'balance');
  const attackCount = duties.filter(d => d === 'attack').length;
  const defendCount = duties.filter(d => d === 'defend').length;
  const supportCount = duties.filter(d => d === 'support').length;
  const total = duties.length;
  const balanceScore = total > 0
    ? 1 - (Math.abs(attackCount - supportCount) + Math.abs(defendCount - supportCount)) / (total * 2)
    : 0.5;
  const dutyScore = Math.max(0, Math.min(0.4, balanceScore * 0.4));

  const layout = FORMATION_LAYOUT[team.formation] ?? FORMATION_LAYOUT['4-3-3'];
  const coveredZones = new Set(layout.map(s => s.zone));
  const zoneCoverage = coveredZones.size / Math.max(layout.length, 1);
  const zoneScore = Math.max(0, Math.min(0.3, zoneCoverage * 0.3));

  let roleFitScore = 0;
  for (const role of roles) {
    const fam = ROLE_WEIGHTS[role.role]?.[role.duty ?? 'balance'] ? 1 : 0;
    roleFitScore += fam;
  }
  roleFitScore = (roleFitScore / Math.max(roles.length, 1)) * 0.3;

  return Math.max(0, Math.min(1, dutyScore + zoneScore + roleFitScore));
}

/**
 * IA monta um setup coerente para um time.
 */
export function buildCoherentSetup(team: Team): Team {
  const formation = team.formation;
  const layout = FORMATION_LAYOUT[formation] ?? FORMATION_LAYOUT['4-3-3'];
  const xi = team.startingXI;

  const roleByZone: Record<string, string> = {
    GK: 'goalkeeper',
    DL: 'fullBack', DR: 'fullBack',
    DC: 'centralDefender',
    DML: 'wingBack', DMR: 'wingBack',
    DMC: 'defensiveMidfielder',
    ML: 'winger', MR: 'winger',
    MC: 'centralMidfielder',
    AML: 'winger', AMR: 'winger',
    AMC: 'attackingMidfielder',
    FL: 'winger', FR: 'winger',
    FC: 'advancedForward',
  };

  const dutyByZone: Record<string, string> = {
    GK: 'defend',
    DL: 'defend', DR: 'defend', DC: 'defend',
    DML: 'support', DMR: 'support', DMC: 'defend',
    ML: 'support', MR: 'support', MC: 'support',
    AML: 'attack', AMR: 'attack', AMC: 'support',
    FL: 'attack', FR: 'attack', FC: 'attack',
  };

  const playerRoles = layout.map((slot, i) => {
    const playerId = xi[i] ?? '';
    return {
      playerId,
      slotIndex: i,
      role: roleByZone[slot.zone] ?? 'centralMidfielder',
      duty: dutyByZone[slot.zone] ?? 'balance',
    };
  }).filter(r => r.playerId);

  return {
    ...team,
    tacticsConfig: {
      ...team.tacticsConfig,
      playerRoles,
    },
  };
}

// ============================================================
// 8.2 — IA lê padrão do adversário e escolhe contraposição
// ============================================================

export function counterTactic(myTeam: Team, opponentTeam: Team): Team {
  const oppInstruction = deriveActiveInstruction(opponentTeam, true);
  let adjustedTeam = { ...myTeam };

  switch (oppInstruction) {
    case 'shortBuildup':
      adjustedTeam = { ...adjustedTeam, pressIntensity: 'high', engagementLine: 'high', defensiveLine: 'high' };
      break;
    case 'directBuildup':
      adjustedTeam = { ...adjustedTeam, pressIntensity: 'low', defensiveLine: 'low', tacklingStyle: 'contain' };
      break;
    case 'counterAttack':
      adjustedTeam = { ...adjustedTeam, defensiveLine: 'low', afterGainingPossession: 'retainStructure', passingStyle: 'short' };
      break;
    case 'wideAttack':
      adjustedTeam = { ...adjustedTeam, attackWidth: 'wide' };
      break;
    case 'centralAttack':
      adjustedTeam = { ...adjustedTeam, attackWidth: 'narrow' };
      break;
    case 'fastTempo':
      adjustedTeam = { ...adjustedTeam, tacklingStyle: 'contain', tempo: 'slow' };
      break;
    case 'slowTempo':
      adjustedTeam = { ...adjustedTeam, pressIntensity: 'high', tacklingStyle: 'aggressive', tempo: 'fast' };
      break;
  }

  return adjustedTeam;
}

// ============================================================
// 8.3 — Game management (recua ganhando, arrisca perdendo)
// ============================================================

export function gameManagementAdjust(
  team: Team,
  state: LiveMatchState,
  side: 'home' | 'away',
  minute: number,
): Team {
  const myGoals = side === 'home' ? state.homeGoals : state.awayGoals;
  const oppGoals = side === 'home' ? state.awayGoals : state.homeGoals;
  const goalDiff = myGoals - oppGoals;

  let adjusted = { ...team };

  if (minute >= 75) {
    if (goalDiff > 0) {
      adjusted = { ...adjusted, teamMentality: 'defensive', defensiveLine: 'low', afterLosingPossession: 'regroup' };
    } else if (goalDiff < 0) {
      adjusted = { ...adjusted, teamMentality: 'offensive', defensiveLine: 'high', afterGainingPossession: 'counterAttack', takeMoreRisks: true };
    }
  }

  if (minute <= 15) {
    adjusted = { ...adjusted, teamMentality: 'cautious' };
  }

  return adjusted;
}

export function aiSubstitutionDecisionV2(
  team: Team,
  state: LiveMatchState,
  side: 'home' | 'away',
  minute: number,
): { outId: string; inId: string } | null {
  const myGoals = side === 'home' ? state.homeGoals : state.awayGoals;
  const oppGoals = side === 'home' ? state.awayGoals : state.homeGoals;
  const goalDiff = myGoals - oppGoals;

  const xi = team.startingXI;
  const fatigue = state.fatigue ?? {};
  const cards = state.cards ?? {};
  const injuredIds = new Set((state.matchInjuries ?? []).filter(mi => mi.side === side).map(mi => mi.playerId));

  // Prioridade 1: lesionado
  for (const id of xi) {
    if (injuredIds.has(id)) {
      const bench = team.squad.filter(p => !xi.includes(p.id) && !p.injury?.active && !injuredIds.has(p.id));
      if (bench.length === 0) return null;
      const replacement = bench.reduce((best, p) => p.currentAbility > best.currentAbility ? p : best, bench[0]);
      return { outId: id, inId: replacement.id };
    }
  }

  // Prioridade 2: fadiga alta após minuto 60
  if (minute >= 60) {
    let mostFatigued: { id: string; fatigue: number } | null = null;
    for (const id of xi) {
      const f = fatigue[id] ?? 0;
      if (f > 0.42 && (!mostFatigued || f > mostFatigued.fatigue)) {
        mostFatigued = { id, fatigue: f };
      }
    }
    if (mostFatigued) {
      const bench = team.squad.filter(p => !xi.includes(p.id) && !p.injury?.active && !injuredIds.has(p.id));
      if (bench.length === 0) return null;
      const preferPos = goalDiff < 0 ? 'FWD' : goalDiff > 0 ? 'DEF' : undefined;
      const matching = preferPos ? bench.filter(p => p.position === preferPos) : [];
      const pool = matching.length > 0 ? matching : bench;
      const replacement = pool.reduce((best, p) => p.currentAbility > best.currentAbility ? p : best, pool[0]);
      return { outId: mostFatigued.id, inId: replacement.id };
    }
  }

  // Prioridade 3: cartão amarelo + fadiga moderada
  if (minute >= 65) {
    for (const id of xi) {
      if ((cards[id] ?? 0) >= 1 && (fatigue[id] ?? 0) > 0.25) {
        const bench = team.squad.filter(p => !xi.includes(p.id) && !p.injury?.active && !injuredIds.has(p.id));
        if (bench.length === 0) return null;
        const outPlayer = team.squad.find(p => p.id === id);
        const preferPos = outPlayer?.position;
        const matching = preferPos ? bench.filter(p => p.position === preferPos) : [];
        const pool = matching.length > 0 ? matching : bench;
        const replacement = pool.reduce((best, p) => p.currentAbility > best.currentAbility ? p : best, pool[0]);
        return { outId: id, inId: replacement.id };
      }
    }
  }

  return null;
}

// ============================================================
// 8.4 — Curva de dificuldade (IA elite vs IA fraca)
// ============================================================

export function aiDecisionQuality(team: Team): number {
  const reputation = team.reputation ?? 50;
  return 0.5 + (reputation / 100) * 0.5;
}

export function aiPreMatchSetup(team: Team, opponent: Team): Team {
  const quality = aiDecisionQuality(team);
  if (quality < 0.7) {
    return buildCoherentSetup(team);
  }
  const coherent = buildCoherentSetup(team);
  return counterTactic(coherent, opponent);
}

export function aiInMatchAdjust(
  team: Team,
  state: LiveMatchState,
  side: 'home' | 'away',
  minute: number,
): Team {
  const quality = aiDecisionQuality(team);
  if (quality < 0.65) return team;
  return gameManagementAdjust(team, state, side, minute);
}
