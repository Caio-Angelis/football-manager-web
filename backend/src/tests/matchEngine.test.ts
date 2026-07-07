import { describe, it, expect } from 'vitest';
import { useGameStore } from '../store/gameStore.js';
import { simulateFullMatch } from '../store/helpers/matchEngine.js';

// Calibração do motor passo a passo: médias sobre muitas partidas entre
// times reais do initGame devem cair em faixas realistas de futebol.
describe('Match engine calibration', () => {
  it('produces realistic match averages', () => {
    useGameStore.getState().initGame();
    const teams = useGameStore.getState().teams;
    expect(teams.length).toBeGreaterThan(3);

    const N = 100;
    let goals = 0;
    let shots = 0;
    let onTarget = 0;
    let passes = 0;
    let accuracy = 0;
    let homePoss = 0;
    let cards = 0;
    let xg = 0;
    let addedOk = 0;

    for (let i = 0; i < N; i++) {
      const home = teams[i % teams.length];
      let awayIdx = (i * 7 + 3) % teams.length;
      if (awayIdx === i % teams.length) awayIdx = (awayIdx + 1) % teams.length;
      const away = teams[awayIdx];

      const r = simulateFullMatch(home, away);
      goals += r.homeGoals + r.awayGoals;
      shots += r.stats.homeShots + r.stats.awayShots;
      onTarget += r.stats.homeShotsOnTarget + r.stats.awayShotsOnTarget;
      passes += r.stats.homePasses + r.stats.awayPasses;
      accuracy += (r.stats.homePassAccuracy + r.stats.awayPassAccuracy) / 2;
      homePoss += r.stats.homePossession;
      cards += r.events.filter(e => e.type === 'yellow' || e.type === 'red').length;
      xg += r.stats.homeXG + r.stats.awayXG;
      // Acréscimos: deve haver eventos possíveis após o 90 apenas se addedTime existiu
      if (r.events.every(e => e.minute <= 96)) addedOk++;
    }

    const avgGoals = goals / N;
    const avgShots = shots / N;            // ambos os times somados
    const avgPasses = passes / N;          // ambos os times somados
    const avgAccuracy = accuracy / N;
    const avgHomePoss = homePoss / N;
    const avgCards = cards / N;
    const avgXG = xg / N;

    // Gols: média real de ligas fica entre ~2.3 e ~3.1
    expect(avgGoals).toBeGreaterThan(1.8);
    expect(avgGoals).toBeLessThan(3.6);

    // Chutes: 8-17 por time
    expect(avgShots).toBeGreaterThan(14);
    expect(avgShots).toBeLessThan(36);

    // Chutes no alvo: 25-55% dos chutes
    expect(onTarget / shots).toBeGreaterThan(0.25);
    expect(onTarget / shots).toBeLessThan(0.55);

    // Passes: 200-450 por time
    expect(avgPasses).toBeGreaterThan(380);
    expect(avgPasses).toBeLessThan(950);

    // Precisão de passe: 70-92%
    expect(avgAccuracy).toBeGreaterThan(70);
    expect(avgAccuracy).toBeLessThan(92);

    // Vantagem de casa leve na posse média
    expect(avgHomePoss).toBeGreaterThan(44);
    expect(avgHomePoss).toBeLessThan(62);

    // Cartões: 2-7 por jogo
    expect(avgCards).toBeGreaterThan(1.5);
    expect(avgCards).toBeLessThan(8);

    // xG total coerente com os gols (mesma ordem de grandeza)
    expect(avgXG).toBeGreaterThan(avgGoals * 0.5);
    expect(avgXG).toBeLessThan(avgGoals * 2.2);

    // Nenhum evento além de 90+6
    expect(addedOk).toBe(N);
  });

  it('home advantage: stronger home side wins more than it loses', () => {
    useGameStore.getState().initGame();
    const teams = useGameStore.getState().teams;
    const N = 80;
    let homeWins = 0;
    let awayWins = 0;
    for (let i = 0; i < N; i++) {
      const home = teams[i % teams.length];
      const away = teams[(i + 1) % teams.length];
      const r = simulateFullMatch(home, away);
      if (r.homeGoals > r.awayGoals) homeWins++;
      else if (r.awayGoals > r.homeGoals) awayWins++;
    }
    // Com times variados, mando de campo deve pesar: casa vence mais que fora
    expect(homeWins).toBeGreaterThan(awayWins * 0.9);
  });
});
