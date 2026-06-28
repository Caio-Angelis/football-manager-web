// Atualização de Atributos de Jogador por Tipo de Treino

import type { Player } from '../../types/game';

export function updatePlayerAttributes(player: Player, trainingType: string): Player {
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
    
    // Injury probability now based on calculated risk
    const risk = 0.05 + (updated.hidden.injuryProneness * 0.01);
    const loadPenalty = (updated.cumulativeLoad || 0) * 0.005;
    const fitnessPenalty = updated.fitness < 40 ? 0.03 : 0;
    
    if (Math.random() < risk + loadPenalty + fitnessPenalty) {
      const days = updated.fitness < 40 ? 14 + Math.floor(Math.random() * 14) : 7 + Math.floor(Math.random() * 10);
      updated.injury = { active: true, days };
      
      // Record injury history
      updated.injuryHistory = [...(updated.injuryHistory || [])];
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
    
    // If injured, reduce injury duration
    if (updated.injury?.active) {
      updated.injury.days = Math.max(0, updated.injury.days - 2);
    }
  } else if (trainingType === 'light') {
    // Light recovery training
    updated.fitness = Math.min(100, updated.fitness + 3);
    updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - 5);
    updated.consecutivePhysicalDays = 0;
  }

  // Recalcular Current Ability baseado nos atributos atualizados
  const ageFactor = updated.age < 21 ? 1.5 : updated.age < 24 ? 1.2 : updated.age < 28 ? 0.8 : updated.age < 31 ? 0.4 : 0.1;
  const caGrowth = (improvement * 0.5) * ageFactor;
  updated.currentAbility = Math.min(200, Math.round((beforeCA + caGrowth) * 10) / 10);

  return updated;
}
