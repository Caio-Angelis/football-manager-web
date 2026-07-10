// Atualização de Atributos de Jogador por Tipo de Treino
// Pacing calibrado para 3 temporadas: ganho base baixo + curva de idade definitiva.

import type { Player } from '../../types/game';
import { generateInjuryForPlayer, reduceInjuryFromRecoveryTraining } from './injury';

/** Ganho base por sessão: 0.05–0.25 (antes: 0.2–1.0). */
export function baseTrainingGain(rng: () => number = Math.random): number {
  return rng() * 0.2 + 0.05;
}

/**
 * Multiplicador definitivo de idade sobre ganho de atributos e CA.
 * Sub-21: acelerado (CA visível em ~4–6 semanas de foco).
 * 22–28: auge — ganho lento, atributos estáveis.
 * 31+: quase estagnado no treino; declínio físico mensal separado.
 */
export function ageTrainingMultiplier(age: number): number {
  if (age < 22) return 2.0;   // Sub-21
  if (age <= 28) return 0.45; // Auge
  if (age <= 30) return 0.2;  // Transição
  return 0.1;                 // Declínio
}

/** Perda mensal de físicos (31+) se não treinar médico/recuperação. */
export function monthlyPhysicalDecline(rng: () => number = Math.random): number {
  return rng() * 0.2 + 0.1; // 0.1–0.3
}

export function applyMonthlyAgeDecline(
  player: Player,
  protectedByMedical: boolean,
  rng: () => number = Math.random,
): Player {
  if (player.age < 31 || protectedByMedical || !player.physical) return player;

  const loss = monthlyPhysicalDecline(rng);
  const updated = { ...player, physical: { ...player.physical } };
  updated.physical.speed = Math.max(1, (updated.physical.speed ?? 1) - loss);
  updated.physical.stamina = Math.max(1, (updated.physical.stamina ?? 1) - loss);
  if (updated.physical.acceleration != null) {
    updated.physical.acceleration = Math.max(1, updated.physical.acceleration - loss * 0.8);
  }
  // CA acompanha o desgaste físico de forma leve
  updated.currentAbility = Math.max(1, Math.round((updated.currentAbility - loss * 0.3) * 10) / 10);
  return updated;
}

export function updatePlayerAttributes(
  player: Player,
  trainingType: string,
  currentWeek: number = 0,
  facilitiesLevel: number = 5,
  staffLevel: number = 5,
): Player {
  const updated = { ...player };
  const ageMult = ageTrainingMultiplier(updated.age);
  const improvement = baseTrainingGain() * ageMult;

  const beforeCA = updated.currentAbility;

  if (trainingType === 'physical') {
    if (updated.physical) {
      updated.physical = { ...updated.physical };
      updated.physical.stamina = Math.min(20, (updated.physical.stamina ?? 0) + improvement);
      updated.physical.speed = Math.min(20, (updated.physical.speed ?? 0) + improvement * 0.5);
    }
    updated.fitness = Math.max(0, updated.fitness - 8);
    updated.consecutivePhysicalDays = (updated.consecutivePhysicalDays || 0) + 1;
    updated.cumulativeLoad = (updated.cumulativeLoad || 0) + 8;
    updated.recoveryNeeded = updated.fitness < 30;

    const injuryChance =
      0.03 +
      (updated.hidden.injuryProneness * 0.008) +
      Math.max(0, (updated.cumulativeLoad || 0) - 10) * 0.003 +
      (updated.fitness < 40 ? 0.04 : 0);

    if (Math.random() < injuryChance) {
      return generateInjuryForPlayer(updated, 'training', facilitiesLevel, staffLevel, currentWeek);
    }
  } else if (trainingType === 'technical') {
    if (updated.technical) {
      updated.technical = { ...updated.technical };
      updated.technical.passing = Math.min(20, updated.technical.passing + improvement * 0.8);
      updated.technical.technique = Math.min(20, updated.technical.technique + improvement * 0.8);
      updated.technical.finishing = Math.min(20, updated.technical.finishing + improvement * 0.5);
    }
    updated.fitness = Math.max(0, updated.fitness - 3);
    updated.consecutivePhysicalDays = 0;
    updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 4);
  } else if (trainingType === 'cohesion') {
    updated.morale = Math.min(100, updated.morale + 5);
    updated.fitness = Math.max(0, updated.fitness - 2);
    updated.consecutivePhysicalDays = 0;
    updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 2);
  } else if (trainingType === 'medical' || trainingType === 'recovery') {
    updated.fitness = Math.min(100, updated.fitness + 10);
    updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 10);
    updated.consecutivePhysicalDays = 0;
    updated.recoveryNeeded = false;

    if (updated.injury?.active) {
      return reduceInjuryFromRecoveryTraining(updated, 2);
    }
  } else if (trainingType === 'light') {
    updated.fitness = Math.min(100, updated.fitness + 3);
    updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 5);
    updated.consecutivePhysicalDays = 0;
  }

  // CA: mesmo multiplicador de idade; moral baixa pode estagnar/reverter
  const moraleFactor = updated.morale < 30 ? -0.5 : updated.morale < 50 ? 0 : 1;
  const caGrowth = improvement * 0.5 * moraleFactor;
  updated.currentAbility = Math.max(
    1,
    Math.min(updated.potentialAbility, 200, Math.round((beforeCA + caGrowth) * 10) / 10),
  );

  return updated;
}
