import { describe, it, expect } from 'vitest';
import { useGameStore } from '../store/gameStore.js';
import { simulateMatchResult, simulateFullMatch } from '../store/helpers/matchEngine.js';

// Calibração do modelo Poisson (simulateMatchResult) contra o motor passo a
// passo (simulateFullMatch). Garante que as probabilidades exibidas ao jogador
// na pré-partida não são sistematicamente enviesadas em relação ao que o motor
// realmente produz.
describe('Prediction vs tick engine calibration', () => {
  it('Poisson avg goals within ±0.6 of tick engine', () => {
    useGameStore.getState().initGame();
    const teams = useGameStore.getState().teams;
    expect(teams.length).toBeGreaterThan(3);

    const N = 200;

    let tickGoals = 0;
    let poissonGoals = 0;

    for (let i = 0; i < N; i++) {
      const home = teams[i % teams.length];
      let awayIdx = (i * 7 + 3) % teams.length;
      if (awayIdx === i % teams.length) awayIdx = (awayIdx + 1) % teams.length;
      const away = teams[awayIdx];

      const tickResult = simulateFullMatch(home, away);
      tickGoals += tickResult.homeGoals + tickResult.awayGoals;

      const poissonResult = simulateMatchResult(home, away);
      poissonGoals += poissonResult.homeGoals + poissonResult.awayGoals;
    }

    const tickAvg = tickGoals / N;
    const poissonAvg = poissonGoals / N;
    const gap = Math.abs(poissonAvg - tickAvg);

    // A tolerância de ±0.6 acomoda a variância natural do tick engine (Math.random).
    // Com BASE_GOALS=1.20 o gap médio observado é ~0.15.
    expect(gap).toBeLessThan(0.6);
  });

  it('Poisson W/D/L percentages within ±12pp of tick engine', () => {
    useGameStore.getState().initGame();
    const teams = useGameStore.getState().teams;
    expect(teams.length).toBeGreaterThan(3);

    const N = 200;

    let tickHomeWins = 0, tickDraws = 0, tickAwayWins = 0;
    let poissonHomeWins = 0, poissonDraws = 0, poissonAwayWins = 0;

    for (let i = 0; i < N; i++) {
      const home = teams[i % teams.length];
      let awayIdx = (i * 7 + 3) % teams.length;
      if (awayIdx === i % teams.length) awayIdx = (awayIdx + 1) % teams.length;
      const away = teams[awayIdx];

      const tickResult = simulateFullMatch(home, away);
      if (tickResult.homeGoals > tickResult.awayGoals) tickHomeWins++;
      else if (tickResult.homeGoals < tickResult.awayGoals) tickAwayWins++;
      else tickDraws++;

      const poissonResult = simulateMatchResult(home, away);
      if (poissonResult.homeGoals > poissonResult.awayGoals) poissonHomeWins++;
      else if (poissonResult.homeGoals < poissonResult.awayGoals) poissonAwayWins++;
      else poissonDraws++;
    }

    const tickHomePct = (tickHomeWins / N) * 100;
    const tickDrawPct = (tickDraws / N) * 100;
    const tickAwayPct = (tickAwayWins / N) * 100;

    const poissonHomePct = (poissonHomeWins / N) * 100;
    const poissonDrawPct = (poissonDraws / N) * 100;
    const poissonAwayPct = (poissonAwayWins / N) * 100;

    // ±12 pontos percentuais — acomoda variância do tick engine com N=200.
    expect(Math.abs(poissonHomePct - tickHomePct)).toBeLessThan(12);
    expect(Math.abs(poissonDrawPct - tickDrawPct)).toBeLessThan(12);
    expect(Math.abs(poissonAwayPct - tickAwayPct)).toBeLessThan(12);
  });
});
