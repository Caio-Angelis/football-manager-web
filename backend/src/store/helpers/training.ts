// Atualização de Atributos de Jogador por Tipo de Treino

import type { Player } from '../../types/game';
import { generateInjuryForPlayer, reduceInjuryFromRecoveryTraining } from './injury';

export function updatePlayerAttributes(player: Player, trainingType: string, currentWeek: number = 0, facilitiesLevel: number = 5, staffLevel: number = 5): Player {
  const updated = { ...player };
  const improvement = Math.random() * 0.8 + 0.2;

  const beforeCA = updated.currentAbility;

  if (trainingType === 'physical') {
    if (updated.physical) {
      updated.physical.stamina = Math.min(20, (updated.physical.stamina ?? 0) + improvement);
      updated.physical.speed = Math.min(20, (updated.physical.speed ?? 0) + improvement * 0.5);
    }
    updated.fitness = Math.max(0, updated.fitness - 8);
    updated.consecutivePhysicalDays = (updated.consecutivePhysicalDays || 0) + 1;
    updated.cumulativeLoad = (updated.cumulativeLoad || 0) + 8;
    updated.recoveryNeeded = updated.fitness < 30;
    
    // Injury chance based on risk factors: proneness, load, fitness
    const injuryChance = 0.03 + (updated.hidden.injuryProneness * 0.008) + Math.max(0, (updated.cumulativeLoad || 0) - 10) * 0.003 + (updated.fitness < 40 ? 0.04 : 0);
    
    if (Math.random() < injuryChance) {
      return generateInjuryForPlayer(updated, 'training', facilitiesLevel, staffLevel, currentWeek);
    }
  } else if (trainingType === 'technical') {
    if (updated.technical) {
      updated.technical.passing = Math.min(20, updated.technical.passing + improvement * 0.8);
      updated.technical.technique = Math.min(20, updated.technical.technique + improvement * 0.8);
      updated.technical.finishing = Math.min(20, updated.technical.finishing + improvement * 0.5);
    }
    updated.fitness = Math.max(0, updated.fitness - 3);
    updated.consecutivePhysicalDays = 0; // Reset consecutive physical days
    updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 4);
  } else if (trainingType === 'cohesion') {
    updated.morale = Math.min(100, updated.morale + 5);
    updated.fitness = Math.max(0, updated.fitness - 2);
    updated.consecutivePhysicalDays = 0;
    updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 2);
  } else if (trainingType === 'medical' || trainingType === 'recovery') {
    // Recovery sessions
    updated.fitness = Math.min(100, updated.fitness + 10);
    updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 10);
    updated.consecutivePhysicalDays = 0;
    updated.recoveryNeeded = false;
    
    // If injured, reduce injury duration via centralized helper
    if (updated.injury?.active) {
      return reduceInjuryFromRecoveryTraining(updated, 2);
    }
  } else if (trainingType === 'light') {
    // Light recovery training
    updated.fitness = Math.min(100, updated.fitness + 3);
    updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 5);
    updated.consecutivePhysicalDays = 0;
  }

  // Recalcular Current Ability baseado nos atributos atualizados
  const ageFactor = updated.age < 21 ? 1.5 : updated.age < 24 ? 1.2 : updated.age < 28 ? 0.8 : updated.age < 31 ? 0.4 : 0.1;
  const moraleFactor = updated.morale < 30 ? -0.5 : updated.morale < 50 ? 0 : 1;
  const caGrowth = (improvement * 0.5) * ageFactor * moraleFactor;
  updated.currentAbility = Math.max(1, Math.min(updated.potentialAbility, 200, Math.round((beforeCA + caGrowth) * 10) / 10));

  return updated;
}
