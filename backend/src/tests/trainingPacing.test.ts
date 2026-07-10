import { describe, it, expect } from 'vitest';
import {
  ageTrainingMultiplier,
  baseTrainingGain,
  applyMonthlyAgeDecline,
  updatePlayerAttributes,
} from '../store/helpers/training';
import type { Player } from '../types/game';

function stubPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    firstName: 'Test',
    lastName: 'Player',
    age: 20,
    position: 'MID',
    currentAbility: 100,
    potentialAbility: 150,
    morale: 70,
    form: 70,
    fitness: 80,
    technical: { passing: 12, technique: 12, finishing: 10, dribbling: 11, crossing: 10 } as any,
    mental: {} as any,
    physical: { speed: 14, stamina: 14, strength: 12, agility: 12, acceleration: 13 } as any,
    hidden: { injuryProneness: 3 } as any,
    injury: { active: false } as any,
    promises: [],
    consecutivePhysicalDays: 0,
    cumulativeLoad: 0,
    recoveryNeeded: false,
    ...overrides,
  } as Player;
}

describe('ageTrainingMultiplier', () => {
  it('acelera Sub-21', () => {
    expect(ageTrainingMultiplier(18)).toBe(2.0);
    expect(ageTrainingMultiplier(21)).toBe(2.0);
  });
  it('auge 22-28 é lento', () => {
    expect(ageTrainingMultiplier(22)).toBe(0.45);
    expect(ageTrainingMultiplier(28)).toBe(0.45);
  });
  it('declínio 31+', () => {
    expect(ageTrainingMultiplier(31)).toBe(0.1);
    expect(ageTrainingMultiplier(35)).toBe(0.1);
  });
});

describe('baseTrainingGain', () => {
  it('fica entre 0.05 e 0.25', () => {
    for (let i = 0; i < 50; i++) {
      const g = baseTrainingGain(() => i / 49);
      expect(g).toBeGreaterThanOrEqual(0.05);
      expect(g).toBeLessThanOrEqual(0.25);
    }
  });
});

describe('applyMonthlyAgeDecline', () => {
  it('não afeta Sub-31', () => {
    const p = stubPlayer({ age: 28 });
    const out = applyMonthlyAgeDecline(p, false, () => 0.5);
    expect(out.physical!.speed).toBe(14);
  });

  it('protege com médico/recuperação', () => {
    const p = stubPlayer({ age: 33 });
    const out = applyMonthlyAgeDecline(p, true, () => 0.5);
    expect(out.physical!.speed).toBe(14);
  });

  it('reduz speed/stamina em 31+ sem proteção', () => {
    const p = stubPlayer({ age: 33 });
    const out = applyMonthlyAgeDecline(p, false, () => 0.5); // loss = 0.2
    expect(out.physical!.speed).toBeCloseTo(13.8, 5);
    expect(out.physical!.stamina).toBeCloseTo(13.8, 5);
  });
});

describe('updatePlayerAttributes pacing', () => {
  it('jovem ganha mais CA que veterano no mesmo treino técnico', () => {
    const young = stubPlayer({ age: 19, currentAbility: 100 });
    const peak = stubPlayer({ age: 25, currentAbility: 100 });
    // Force deterministic-ish by running many and comparing averages
    let youngGain = 0;
    let peakGain = 0;
    for (let i = 0; i < 30; i++) {
      youngGain += updatePlayerAttributes(young, 'technical').currentAbility - 100;
      peakGain += updatePlayerAttributes(peak, 'technical').currentAbility - 100;
    }
    expect(youngGain).toBeGreaterThan(peakGain);
  });
});
