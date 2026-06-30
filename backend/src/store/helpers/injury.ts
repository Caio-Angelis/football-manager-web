// Cálculo de Risco de Lesão, Geração, Cura e Fadiga

import type { Player } from '../../types/game';
import type { InjuryHistory } from '../../types/injury';

// ============================================================
// CONSTANTES
// ============================================================

const INJURY_TYPES = ['muscle', 'ligament', 'joint', 'ankle', 'knee', 'groin'] as const;
const INJURY_TYPE_LABELS: Record<string, string> = {
  muscle: 'Muscular',
  ligament: 'Ligamentar',
  joint: 'Articular',
  ankle: 'Tornozelo',
  knee: 'Joelho',
  groin: 'Adutores',
};

// ============================================================
// FADIGA
// ============================================================

export function calculateFatigueLevel(player: Player, currentWeek: number): number {
  const last3Days = (player.fatigueLog || []).filter(
    (entry) => entry.week === currentWeek && Math.abs(entry.day - player.lastTrainingDay) <= 3
  );
  if (last3Days.length === 0) return 50;
  const avgFatigue = last3Days.reduce((sum, entry) => sum + entry.fatigue, 0) / last3Days.length;
  return avgFatigue;
}

// ============================================================
// CÁLCULO DE RISCO
// ============================================================

export function calculatePlayerInjuryRisk(
  player: Player,
  facilitiesLevel: number,
  staffLevel: number,
  currentWeek: number,
): number {
  // Already injured — not at risk of new injury
  if (player.injury?.active) return 0;

  let risk = 0;

  // Base risk from injuryProneness (1-10 → 0-30)
  risk += player.hidden.injuryProneness * 3;

  // Consecutive physical training days — exponential growth
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

  // Previous unrecovered injuries increase recurrence risk
  const previousInjuries = player.injuryHistory?.filter(ih => !ih.fullyRecovered).length || 0;
  risk += previousInjuries * 10;

  // Fatigue accumulation risk
  const fatigueLevel = calculateFatigueLevel(player, currentWeek);
  if (fatigueLevel > 60) {
    risk += 15;
  } else if (fatigueLevel > 40) {
    risk += 8;
  }

  // Age factor — older players more prone
  if (player.age >= 32) {
    risk += 10;
  } else if (player.age >= 28) {
    risk += 5;
  }

  // Degraded condition penalty (post-injury recovery)
  // 'minimal' = minimal fitness (worst), 'good' = nearly full
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

// ============================================================
// GERAÇÃO DE LESÃO (CENTRALIZADA)
// ============================================================

export function generateInjuryForPlayer(
  player: Player,
  source: 'training' | 'match' | 'random',
  facilitiesLevel: number,
  staffLevel: number,
  currentWeek: number,
): Player {
  if (player.injury?.active) return player;

  const updated = { ...player };

  // Determine severity based on risk factors
  const risk = calculatePlayerInjuryRisk(player, facilitiesLevel, staffLevel, currentWeek);
  const proneness = player.hidden.injuryProneness;

  // Severity roll: higher risk & proneness → more likely severe
  const severityRoll = Math.random() * 100 + proneness * 5 + risk * 0.3;

  let severity: 'minor' | 'moderate' | 'severe';
  let baseDays: number;

  if (severityRoll < 50) {
    severity = 'minor';
    baseDays = 5 + Math.floor(Math.random() * 8); // 5-12 days
  } else if (severityRoll < 80) {
    severity = 'moderate';
    baseDays = 13 + Math.floor(Math.random() * 15); // 13-27 days
  } else {
    severity = 'severe';
    baseDays = 28 + Math.floor(Math.random() * 42); // 28-69 days
  }

  // Age penalty: older players take longer to heal (longer injury)
  if (player.age >= 32) baseDays = Math.floor(baseDays * 1.3);
  else if (player.age >= 28) baseDays = Math.floor(baseDays * 1.15);

  // Low fitness worsens injury duration
  if (player.fitness < 40) baseDays = Math.floor(baseDays * 1.2);

  // Staff & facilities reduce injury duration slightly (better immediate care)
  const careReduction = Math.floor(staffLevel * 0.5 + facilitiesLevel * 0.3);
  baseDays = Math.max(3, baseDays - careReduction);

  // Pick injury type
  const injuryType = INJURY_TYPES[Math.floor(Math.random() * INJURY_TYPES.length)];

  updated.injury = {
    active: true,
    daysRemaining: baseDays,
    totalDays: baseDays,
    type: injuryType,
    severity,
    source,
  };

  // Record injury history
  updated.injuryHistory = [...(updated.injuryHistory || [])];
  updated.injuryHistory.push({
    playerId: updated.id,
    injuryType,
    severity,
    daysOut: baseDays,
    occurredWeek: currentWeek,
    fullyRecovered: false,
  });

  // Set lastInjuryWeek for degraded condition tracking
  updated.lastInjuryWeek = currentWeek;

  // Set degraded condition based on severity
  // 'minimal' = minimal fitness (worst), 'moderate' = decent, 'good' = nearly full
  if (severity === 'severe') updated.degradedCondition = 'minimal';
  else if (severity === 'moderate') updated.degradedCondition = 'low';
  else updated.degradedCondition = 'moderate';

  // Drop fitness from the injury event
  updated.fitness = Math.max(0, updated.fitness - 15);

  return updated;
}

// ============================================================
// CURA SEMANAL (chamada no advanceWeek)
// ============================================================

export function healInjuryForPlayer(
  player: Player,
  facilitiesLevel: number,
  staffLevel: number,
): Player {
  if (!player.injury?.active) return player;

  const updated = { ...player };
  const injury = { ...updated.injury! };

  // Base healing: 7 days per week
  let healRate = 7;

  // Staff bonus: better medical staff → faster recovery
  healRate += Math.floor(staffLevel * 0.5);

  // Facilities bonus: better facilities → faster recovery
  healRate += Math.floor(facilitiesLevel * 0.3);

  // Age penalty: older players heal slower
  if (updated.age >= 32) healRate = Math.floor(healRate * 0.8);
  else if (updated.age >= 28) healRate = Math.floor(healRate * 0.9);

  // Severity penalty: severe injuries heal slower in early stages
  if (injury.severity === 'severe' && injury.daysRemaining > injury.totalDays * 0.5) {
    healRate = Math.floor(healRate * 0.7);
  } else if (injury.severity === 'moderate' && injury.daysRemaining > injury.totalDays * 0.5) {
    healRate = Math.floor(healRate * 0.85);
  }

  injury.daysRemaining = Math.max(0, injury.daysRemaining - healRate);

  if (injury.daysRemaining <= 0) {
    // Injury healed
    updated.injury = null;

    // Mark most recent unrecovered injury as recovered
    updated.injuryHistory = [...(updated.injuryHistory || [])];
    const lastUnrecoveredIdx = [...updated.injuryHistory].reverse().findIndex(
      ih => ih.playerId === updated.id && !ih.fullyRecovered
    );
    if (lastUnrecoveredIdx !== -1) {
      const actualIdx = updated.injuryHistory.length - 1 - lastUnrecoveredIdx;
      updated.injuryHistory[actualIdx] = { ...updated.injuryHistory[actualIdx], fullyRecovered: true };
    }

    // Partial fitness restoration on recovery
    updated.fitness = Math.min(100, updated.fitness + 15);
  } else {
    updated.injury = injury;
  }

  return updated;
}

// ============================================================
// DECAIMENTO DE FADIGA (semanal — chamado no advanceWeek)
// ============================================================

export function applyFatigueDecayToPlayer(player: Player): Player {
  const updated = { ...player };

  // Natural recovery: fitness increases during rest week
  const naturalRecovery = 5;
  const loadDecay = 5;

  updated.fitness = Math.min(100, updated.fitness + naturalRecovery);
  updated.cumulativeLoad = Math.max(0, (updated.cumulativeLoad || 0) - loadDecay);
  updated.consecutivePhysicalDays = Math.max(0, (updated.consecutivePhysicalDays || 0) - 1);

  // Clear recoveryNeeded if fitness restored above threshold
  if (updated.fitness > 30 && (updated.cumulativeLoad || 0) <= 20) {
    updated.recoveryNeeded = false;
  }

  return updated;
}

// ============================================================
// CONDIÇÃO DEGRADADA PÓS-LESÃO
// ============================================================

export function updateDegradedConditionForPlayer(player: Player, currentWeek: number): Player {
  const updated = { ...player };
  if (updated.degradedCondition && updated.lastInjuryWeek) {
    const weeksRecovering = currentWeek - updated.lastInjuryWeek;
    // Progression: minimal → low → moderate → good → cleared
    // 'minimal' = minimal fitness (worst), 'good' = nearly full
    if (weeksRecovering > 8) {
      updated.degradedCondition = undefined;
    } else if (weeksRecovering > 4 && updated.degradedCondition === 'minimal') {
      updated.degradedCondition = 'low';
    } else if (weeksRecovering > 2 && updated.degradedCondition === 'low') {
      updated.degradedCondition = 'moderate';
    } else if (weeksRecovering >= 1 && updated.degradedCondition === 'moderate') {
      updated.degradedCondition = 'good';
    }
  }
  return updated;
}

// ============================================================
// REDUÇÃO DE LESÃO POR TREINO DE RECUPERAÇÃO
// ============================================================

export function reduceInjuryFromRecoveryTraining(player: Player, daysReduced: number): Player {
  if (!player.injury?.active) return player;
  const updated = { ...player };
  const injury = { ...updated.injury! };
  injury.daysRemaining = Math.max(0, injury.daysRemaining - daysReduced);
  if (injury.daysRemaining <= 0) {
    updated.injury = null;
    updated.injuryHistory = [...(updated.injuryHistory || [])];
    const lastUnrecoveredIdx = [...updated.injuryHistory].reverse().findIndex(
      ih => ih.playerId === updated.id && !ih.fullyRecovered
    );
    if (lastUnrecoveredIdx !== -1) {
      const actualIdx = updated.injuryHistory.length - 1 - lastUnrecoveredIdx;
      updated.injuryHistory[actualIdx] = { ...updated.injuryHistory[actualIdx], fullyRecovered: true };
    }
    updated.fitness = Math.min(100, updated.fitness + 10);
  } else {
    updated.injury = injury;
  }
  return updated;
}

export { INJURY_TYPE_LABELS };
