// Cálculo de Risco de Lesão, Fadiga e Carga

import type { Player } from '../../types/game';

export function calculateFatigueLevel(player: Player, currentWeek: number): number {
  const last3Days = (player.fatigueLog || []).filter(
    (entry) => entry.week === currentWeek && Math.abs(entry.day - player.lastTrainingDay) <= 3
  );
  const avgFatigue = last3Days.reduce((sum, entry) => sum + entry.fatigue, 0) / Math.max(last3Days.length, 1);
  return avgFatigue;
}

export function calculatePlayerInjuryRisk(player: Player, facilitiesLevel: number, staffLevel: number, currentWeek: number): number {
  let risk = 0;
  
  // Base risk from injuryProneness (1-10 maps to 0-30%)
  risk += player.hidden.injuryProneness * 3;
  
  // Consecutive physical training days increase risk exponentially
  const consecutiveBonus = Math.pow(1.5, player.consecutivePhysicalDays) * 5;
  risk += consecutiveBonus;
  
  // Cumulative load penalty
  const loadPenalty = Math.max(0, player.cumulativeLoad - 5) * 3;
  risk += loadPenalty;
  
  // Low fitness increases risk
  if (player.fitness < 50) {
    risk += (50 - player.fitness) * 0.3;
  }
  
  // Recovery needed penalty
  if (player.recoveryNeeded) {
    risk += 15;
  }
  
  // Active injury increases risk significantly
  if (player.injury?.active) {
    risk += 40;
  }
  
  // Previous injuries increase recurrence risk (especially if recent)
  const previousInjuries = player.injuryHistory?.filter(ih => !ih.fullyRecovered).length || 0;
  risk += previousInjuries * 10;
  
  // Fatigue accumulation risk (new)
  const fatigueLevel = calculateFatigueLevel(player, currentWeek);
  if (fatigueLevel > 60) {
    risk += 15;
  } else if (fatigueLevel > 40) {
    risk += 8;
  }
  
  // Degraded condition penalty (post-injury)
  if (player.degradedCondition) {
    if (player.degradedCondition === 'minimal') risk += 20;
    else if (player.degradedCondition === 'low') risk += 12;
    else if (player.degradedCondition === 'moderate') risk += 6;
  }
  
  // Facilities and staff reduce risk
  const facilityReduction = Math.min(20, facilitiesLevel * 2);
  const staffReduction = Math.min(15, staffLevel * 1.5);
  risk = Math.max(0, risk - facilityReduction - staffReduction);
  
  return Math.min(100, risk);
}

export function getRiskLevel(risk: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (risk >= 80) return 'critical';
  if (risk >= 60) return 'high';
  if (risk >= 30) return 'moderate';
  return 'low';
}
