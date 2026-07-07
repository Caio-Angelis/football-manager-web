import { describe, it, expect } from 'vitest';
import { calculateTeamStrength } from '../store/helpers/matchEngine.js';
import type { Team, Player } from '../types/game.js';

describe('calculateTeamStrength — NaN guard (C10)', () => {
  it('returns finite value for player without physical block', () => {
    const player: Partial<Player> = {
      id: 'test1',
      currentAbility: 60,
      form: 80,
      fitness: 90,
      morale: 50,
      technical: { passing: 50, technique: 50, finishing: 50, dribbling: 50, crossing: 50 } as any,
      mental: { vision: 50, decisions: 50, composure: 50, anticipation: 50, positioning: 50 } as any,
      // physical: undefined — simula save antigo ou dado incompleto
    };
    const team: Partial<Team> = {
      id: 'test-team',
      name: 'Test FC',
      startingXI: ['test1'],
      squad: [player as Player],
    };
    const strength = calculateTeamStrength(team as Team);
    expect(Number.isFinite(strength)).toBe(true);
    expect(strength).toBeGreaterThan(0);
    expect(strength).toBeLessThan(2000);
  });

  it('returns finite value for player with undefined currentAbility', () => {
    const player: Partial<Player> = {
      id: 'test2',
      currentAbility: undefined as any,
      form: 80,
      fitness: 90,
      morale: 50,
      technical: { passing: 50, technique: 50, finishing: 50, dribbling: 50, crossing: 50 } as any,
      mental: { vision: 50, decisions: 50, composure: 50, anticipation: 50, positioning: 50 } as any,
      physical: { speed: 50, stamina: 50, strength: 50, agility: 50, acceleration: 50 } as any,
    };
    const team: Partial<Team> = {
      id: 'test-team2',
      name: 'Test FC 2',
      startingXI: ['test2'],
      squad: [player as Player],
    };
    const strength = calculateTeamStrength(team as Team);
    expect(Number.isFinite(strength)).toBe(true);
    expect(strength).toBeGreaterThan(0);
  });

  it('returns finite value for player with undefined form and fitness', () => {
    const player: Partial<Player> = {
      id: 'test3',
      currentAbility: 60,
      form: undefined as any,
      fitness: undefined as any,
      morale: 50,
      technical: { passing: 50, technique: 50, finishing: 50, dribbling: 50, crossing: 50 } as any,
      mental: { vision: 50, decisions: 50, composure: 50, anticipation: 50, positioning: 50 } as any,
      physical: { speed: 50, stamina: 50, strength: 50, agility: 50, acceleration: 50 } as any,
    };
    const team: Partial<Team> = {
      id: 'test-team3',
      name: 'Test FC 3',
      startingXI: ['test3'],
      squad: [player as Player],
    };
    const strength = calculateTeamStrength(team as Team);
    expect(Number.isFinite(strength)).toBe(true);
    expect(strength).toBeGreaterThan(0);
  });
});
