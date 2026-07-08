import { describe, it, expect } from 'vitest';
import { mulberry32, simulateFullMatch } from '../store/helpers/matchEngine.js';
import { useGameStore } from '../store/gameStore.js';

describe('PRNG determinism', () => {
  it('mulberry32 produces uniform [0,1) values', () => {
    const rng = mulberry32(42);
    let sum = 0;
    const N = 10000;
    for (let i = 0; i < N; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    // Mean should be ~0.5
    const mean = sum / N;
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
  });

  it('same seed produces same match', () => {
    useGameStore.getState().initGame();
    const teams = useGameStore.getState().teams;
    const home = teams[0];
    const away = teams[1];

    const r1 = simulateFullMatch(home, away, 0, 0, 12345);
    const r2 = simulateFullMatch(home, away, 0, 0, 12345);

    expect(r1.homeGoals).toBe(r2.homeGoals);
    expect(r1.awayGoals).toBe(r2.awayGoals);
    expect(r1.events.length).toBe(r2.events.length);
  });

  it('different seeds produce different matches', () => {
    useGameStore.getState().initGame();
    const teams = useGameStore.getState().teams;
    const home = teams[0];
    const away = teams[1];

    const r1 = simulateFullMatch(home, away, 0, 0, 111);
    const r2 = simulateFullMatch(home, away, 0, 0, 222);

    // Very unlikely that both goals and events are identical with different seeds
    const same = r1.homeGoals === r2.homeGoals && r1.awayGoals === r2.awayGoals;
    expect(same).toBe(false);
  });
});
