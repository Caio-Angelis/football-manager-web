// Zonas & Duelos individuais — Fase 2 da checklist do motor v2
// Grade 3×3 = 9 zonas (3 corredores × 3 terços). Ocupação derivada de FORMATION_LAYOUT
// + role/duty (deslocam posição base). Resolução de duelo usa effectiveStrength + _matchRng.
//
// Este módulo é consumido pelo simulateTickV2 (Fase 3). Não altera o v1.

import type { Team, Player, LiveMatchState } from '../../types/game';
import { FORMATION_LAYOUT, effectiveStrength, positionFamiliarity, type SlotCoord } from './roles';

// ============================================================
// 2.1 — Mapa de zonas (grade 3×3 = 9 zonas)
// ============================================================

export type ZoneThird = 'defensive' | 'middle' | 'attacking';
export type ZoneFlank = 'left' | 'center' | 'right';

export interface ZoneId {
  third: ZoneThird;
  flank: ZoneFlank;
}

// Converte ballPos (0-1) em terço do campo relativo ao time atacante
function ballPosToThird(ballPos: number, attacksTowardOne: boolean): ZoneThird {
  const prog = attacksTowardOne ? ballPos : 1 - ballPos;
  if (prog < 0.33) return 'defensive';
  if (prog < 0.67) return 'middle';
  return 'attacking';
}

// Converte ballPosY (0-1) em corredor
function ballPosToFlank(ballPosY: number): ZoneFlank {
  if (ballPosY < 0.33) return 'left';
  if (ballPosY < 0.67) return 'center';
  return 'right';
}

/** Mapeia (ballPos, ballPosY) para uma zona da grade 3×3. */
export function ballToZone(ballPos: number, ballPosY: number, attacksTowardOne: boolean): ZoneId {
  return {
    third: ballPosToThird(ballPos, attacksTowardOne),
    flank: ballPosToFlank(ballPosY),
  };
}

// ============================================================
// 2.2 — Quem está em cada zona (ocupação derivada)
// ============================================================

export interface ZoneOccupant {
  player: Player;
  slotIndex: number;
  role: string;
  duty: string;
  effectiveX: number;  // posição efetiva em x (0-1)
  effectiveY: number;  // posição efetiva em y (0-1)
  strength: number;    // effectiveStrength neste par role/duty
}

// Deslocamento por duty no eixo x (profundidade)
const DUTY_X_SHIFT: Record<string, number> = {
  attack: 0.12,
  support: 0.04,
  defend: -0.08,
  balance: 0,
};

// Deslocamento por role no eixo y (lateralidade) — roles que cortam para dentro
const ROLE_Y_SHIFT: Record<string, number> = {
  invertedWinger: -0.15,   // corta para o centro
  invertedFullBack: -0.10,
  mezzala: 0.10,           // deriva para o lado
  falseNine: 0.0,          // recua para o centro
};

/**
 * Calcula a ocupação de zona de um time a partir da formação + roles + duties.
 * Retorna um array de ZoneOccupant com posição efetiva (x, y) e força.
 */
export function computeZoneOccupancy(team: Team, attacksTowardOne: boolean): ZoneOccupant[] {
  const formation = FORMATION_LAYOUT[team.formation] ?? FORMATION_LAYOUT['4-3-3'];
  const xi = team.startingXI;
  const roles = team.tacticsConfig?.playerRoles ?? [];

  const occupants: ZoneOccupant[] = [];

  for (let slot = 0; slot < Math.min(xi.length, formation.length); slot++) {
    const playerId = xi[slot];
    const player = team.squad.find(p => p.id === playerId);
    if (!player) continue;

    const slotCoord = formation[slot];
    const roleEntry = roles.find(r => r.slotIndex === slot);
    const role = roleEntry?.role ?? 'centralMidfielder';
    const duty = roleEntry?.duty ?? 'balance';

    // Posição efetiva: base da formação + deslocamento por duty + deslocamento por role
    let effX = slotCoord.x + (DUTY_X_SHIFT[duty] ?? 0);
    let effY = slotCoord.y + (ROLE_Y_SHIFT[role] ?? 0);

    // Se o time ataca rumo a 0 (away), inverter x
    if (!attacksTowardOne) {
      effX = 1 - effX;
    }

    // Clamp
    effX = Math.max(0.02, Math.min(0.98, effX));
    effY = Math.max(0.02, Math.min(0.98, effY));

    const strength = effectiveStrength(player, role, duty);

    occupants.push({
      player,
      slotIndex: slot,
      role,
      duty,
      effectiveX: effX,
      effectiveY: effY,
      strength,
    });
  }

  return occupants;
}

/**
 * Filtra ocupantes que estão próximos de uma zona específica.
 * "Próximo" = dentro de um raio de tolerância em x e y.
 */
export function occupantsInZone(occupants: ZoneOccupant[], zone: ZoneId, tolerance = 0.22): ZoneOccupant[] {
  const thirdMin = zone.third === 'defensive' ? 0 : zone.third === 'middle' ? 0.33 : 0.67;
  const thirdMax = zone.third === 'defensive' ? 0.33 : zone.third === 'middle' ? 0.67 : 1.0;
  const flankMin = zone.flank === 'left' ? 0 : zone.flank === 'center' ? 0.33 : 0.67;
  const flankMax = zone.flank === 'left' ? 0.33 : zone.flank === 'center' ? 0.67 : 1.0;

  const zoneCenterX = (thirdMin + thirdMax) / 2;
  const zoneCenterY = (flankMin + flankMax) / 2;

  return occupants.filter(o => {
    const dx = Math.abs(o.effectiveX - zoneCenterX);
    const dy = Math.abs(o.effectiveY - zoneCenterY);
    return dx <= tolerance && dy <= tolerance;
  });
}

// ============================================================
// 2.3 — Resolução de duelo individual por zona
// ============================================================

export interface DuelResult {
  winner: 'attacker' | 'defender';
  attacker: ZoneOccupant;
  defender: ZoneOccupant;
  attackerRoll: number;
  defenderRoll: number;
}

/**
 * Resolve um duelo 1v1 na zona entre o atacante (portador) e o defensor mais próximo.
 * Usa effectiveStrength + _matchRng (determinismo preservado).
 *
 * P(attacker vence) = strength_attacker / (strength_attacker + strength_defender)
 * modulado por overload (superioridade numérica).
 */
export function resolveDuel(
  attacker: ZoneOccupant,
  defender: ZoneOccupant,
  rng: () => number,
  overloadMod: number = 1.0,
): DuelResult {
  const attStrength = attacker.strength * overloadMod;
  const defStrength = defender.strength;

  const total = attStrength + defStrength;
  const attProb = total > 0 ? attStrength / total : 0.5;

  const roll = rng();
  const attackerWins = roll < attProb;

  return {
    winner: attackerWins ? 'attacker' : 'defender',
    attacker,
    defender,
    attackerRoll: roll,
    defenderRoll: 1 - roll,
  };
}

/**
 * Seleciona o melhor defensor adversário numa zona (pelo effectiveStrength).
 * Se não houver ninguém na zona, usa o mais próximo global.
 */
export function pickZoneDefender(
  defendingOccupants: ZoneOccupant[],
  zone: ZoneId,
  rng: () => number,
): ZoneOccupant | null {
  const inZone = occupantsInZone(defendingOccupants, zone, 0.25);
  if (inZone.length === 0) {
    // Ninguém na zona — pega o mais próximo por distância euclidiana
    const thirdCenter = zone.third === 'defensive' ? 0.17 : zone.third === 'middle' ? 0.50 : 0.83;
    const flankCenter = zone.flank === 'left' ? 0.17 : zone.flank === 'center' ? 0.50 : 0.83;

    let closest: ZoneOccupant | null = null;
    let minDist = Infinity;
    for (const o of defendingOccupants) {
      const dx = o.effectiveX - thirdCenter;
      const dy = o.effectiveY - flankCenter;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closest = o;
      }
    }
    return closest;
  }

  // Seleção ponderada por strength (mais forte tem mais chance de ser o desafiante)
  const weights = inZone.map(o => o.strength);
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return inZone[0];

  let r = rng() * total;
  for (let i = 0; i < inZone.length; i++) {
    r -= weights[i];
    if (r <= 0) return inZone[i];
  }
  return inZone[inZone.length - 1];
}

// ============================================================
// 2.4 — Overloads (superioridade numérica na zona)
// ============================================================

/**
 * Calcula o modificador de overload para uma zona.
 * Se há mais atacantes que defensores na zona, o duelo pende para o ataque.
 * Se há mais defensores, pende para a defesa.
 *
 * overloadMod = 1 + (numAttackers - numDefenders) * 0.15
 * Limitado entre 0.7 e 1.6.
 */
export function computeOverloadMod(
  attackingOccupants: ZoneOccupant[],
  defendingOccupants: ZoneOccupant[],
  zone: ZoneId,
): number {
  const att = occupantsInZone(attackingOccupants, zone, 0.25).length;
  const def = occupantsInZone(defendingOccupants, zone, 0.25).length;

  const diff = att - def;
  const mod = 1 + diff * 0.15;

  return Math.max(0.7, Math.min(1.6, mod));
}

// ============================================================
// Helper: rastreia duelos por zona/jogador para relatório pós-jogo (Fase 10)
// ============================================================

export interface DuelTracker {
  zone: ZoneId;
  attackerId: string;
  defenderId: string;
  winner: 'attacker' | 'defender';
  minute: number;
}

// Acumulador global de duelos (resetado a cada partida)
let _duelLog: DuelTracker[] = [];

export function resetDuelLog(): void {
  _duelLog = [];
}

export function logDuel(entry: DuelTracker): void {
  _duelLog.push(entry);
}

export function getDuelLog(): DuelTracker[] {
  return _duelLog;
}

/**
 * Estatísticas de duelos por jogador: { playerId → { won, lost } }
 */
export function duelStatsByPlayer(): Record<string, { won: number; lost: number }> {
  const stats: Record<string, { won: number; lost: number }> = {};
  for (const d of _duelLog) {
    const attId = d.attackerId;
    const defId = d.defenderId;
    if (!stats[attId]) stats[attId] = { won: 0, lost: 0 };
    if (!stats[defId]) stats[defId] = { won: 0, lost: 0 };
    if (d.winner === 'attacker') {
      stats[attId].won++;
      stats[defId].lost++;
    } else {
      stats[defId].won++;
      stats[attId].lost++;
    }
  }
  return stats;
}
