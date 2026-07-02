import { describe, it, expect } from 'vitest';
import { computeWinProb, buildMomentum } from '../utils/winProbability';

const sum = (p: { home: number; draw: number; away: number }) => p.home + p.draw + p.away;

describe('winProbability', () => {
  it('always sums to ~100%', () => {
    expect(sum(computeWinProb(0, 0, 0, 100, 100))).toBeCloseTo(100, 3);
    expect(sum(computeWinProb(1, 2, 55, 120, 90))).toBeCloseTo(100, 3);
  });

  it('at full time the leader is certain', () => {
    expect(computeWinProb(2, 1, 90, 100, 100).home).toBeCloseTo(100, 3);
    expect(computeWinProb(0, 3, 90, 100, 100).away).toBeCloseTo(100, 3);
    expect(computeWinProb(1, 1, 90, 100, 100).draw).toBeCloseTo(100, 3);
  });

  it('gives the home side an edge at kickoff when strengths are equal', () => {
    const p = computeWinProb(0, 0, 0, 100, 100);
    expect(p.home).toBeGreaterThan(p.away);
  });

  it('a goal swings probability toward the scorer', () => {
    const before = computeWinProb(0, 0, 30, 100, 100);
    const after = computeWinProb(1, 0, 30, 100, 100);
    expect(after.home).toBeGreaterThan(before.home);
  });

  it('builds a point per minute from the timeline', () => {
    const curve = buildMomentum([{ minute: 20, team: 'home' }], 100, 100, 90);
    expect(curve).toHaveLength(91);
    expect(curve[90].home).toBeGreaterThan(curve[0].home); // scored and held → higher
  });
});
