// Centro de Inteligência Pré-Jogo — Análise preditiva via Monte Carlo
// Roda N simulações rápidas (simulateMatchResult) para prever probabilidades,
// identifica key matchups entre titulares e gera recomendações táticas.

import type { Team, Player, PreMatchAnalysis, KeyMatchup, FormComparison, TacticalRecommendation } from '../../types/game';
import { simulateMatchResult, calculateTeamStrength, getTacticalBonus } from './matchEngine';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function startingXI(team: Team): Player[] {
  const ids = team.startingXI;
  if (ids && ids.length > 0) {
    const players = ids.map(id => team.squad.find(p => p.id === id)).filter(Boolean) as Player[];
    if (players.length > 0) return players;
  }
  return team.squad.slice(0, 11);
}

function avgDefined(values: (number | undefined)[]): number {
  let sum = 0;
  let count = 0;
  for (const v of values) {
    if (typeof v === 'number' && v > 0) { sum += v; count++; }
  }
  return count > 0 ? sum / count : 8;
}

function playerOverallRating(player: Player): number {
  const tech = avgDefined([
    player.technical?.passing, player.technical?.technique, player.technical?.finishing,
    player.technical?.dribbling, player.technical?.crossing, player.technical?.tackling,
    player.technical?.marking,
  ]);
  const mental = avgDefined([
    player.mental?.vision, player.mental?.decisions, player.mental?.composure,
    player.mental?.anticipation, player.mental?.positioning, player.mental?.leadership,
  ]);
  const phys = avgDefined([
    player.physical?.speed, player.physical?.stamina, player.physical?.strength,
    player.physical?.agility, player.physical?.acceleration,
  ]);
  const gk = player.goalkeeping
    ? avgDefined([player.goalkeeping.reflexes, player.goalkeeping.oneOnOne, player.goalkeeping.commandOfArea])
    : 0;

  let base = tech * 0.35 + mental * 0.25 + phys * 0.25;
  if (player.position === 'GK' && gk > 0) base = gk * 0.5 + mental * 0.2 + phys * 0.15;
  return clamp(Math.round((base / 20) * 100 + (player.currentAbility / 200) * 30), 1, 100);
}

function bestPlayerByPosition(team: Team, positions: string[]): Player | undefined {
  const xi = startingXI(team);
  const filtered = xi.filter(p => positions.includes(p.position));
  if (filtered.length === 0) return xi[0];
  return filtered.reduce((best, p) =>
    playerOverallRating(p) > playerOverallRating(best) ? p : best, filtered[0]);
}

function formScore(form: string[]): number {
  return form.reduce((s, r) => s + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);
}

function buildKeyMatchups(home: Team, away: Team): KeyMatchup[] {
  const matchups: KeyMatchup[] = [];

  const homeFwd = bestPlayerByPosition(home, ['FWD']);
  const awayDef = bestPlayerByPosition(away, ['DEF']);
  if (homeFwd && awayDef) {
    const hRating = playerOverallRating(homeFwd);
    const aRating = playerOverallRating(awayDef);
    matchups.push({
      label: 'Ataque vs Defesa',
      homePlayer: { id: homeFwd.id, name: homeFwd.name, position: homeFwd.position, rating: hRating },
      awayPlayer: { id: awayDef.id, name: awayDef.name, position: awayDef.position, rating: aRating },
      advantage: hRating > aRating + 5 ? 'home' : aRating > hRating + 5 ? 'away' : 'even',
      edge: Math.abs(hRating - aRating),
    });
  }

  const homeMid = bestPlayerByPosition(home, ['MID']);
  const awayMid = bestPlayerByPosition(away, ['MID']);
  if (homeMid && awayMid) {
    const hRating = playerOverallRating(homeMid);
    const aRating = playerOverallRating(awayMid);
    matchups.push({
      label: 'Meio-Campo',
      homePlayer: { id: homeMid.id, name: homeMid.name, position: homeMid.position, rating: hRating },
      awayPlayer: { id: awayMid.id, name: awayMid.name, position: awayMid.position, rating: aRating },
      advantage: hRating > aRating + 5 ? 'home' : aRating > hRating + 5 ? 'away' : 'even',
      edge: Math.abs(hRating - aRating),
    });
  }

  const homeGK = bestPlayerByPosition(home, ['GK']);
  const awayFwd = bestPlayerByPosition(away, ['FWD']);
  if (homeGK && awayFwd) {
    const hRating = playerOverallRating(homeGK);
    const aRating = playerOverallRating(awayFwd);
    matchups.push({
      label: 'Goleiro vs Atacante',
      homePlayer: { id: homeGK.id, name: homeGK.name, position: homeGK.position, rating: hRating },
      awayPlayer: { id: awayFwd.id, name: awayFwd.name, position: awayFwd.position, rating: aRating },
      advantage: hRating > aRating + 5 ? 'home' : aRating > hRating + 5 ? 'away' : 'even',
      edge: Math.abs(hRating - aRating),
    });
  }

  const homeDef = bestPlayerByPosition(home, ['DEF']);
  const awayAtt = bestPlayerByPosition(away, ['FWD', 'MID']);
  if (homeDef && awayAtt) {
    const hRating = playerOverallRating(homeDef);
    const aRating = playerOverallRating(awayAtt);
    matchups.push({
      label: 'Defesa vs Contra-Ataque',
      homePlayer: { id: homeDef.id, name: homeDef.name, position: homeDef.position, rating: hRating },
      awayPlayer: { id: awayAtt.id, name: awayAtt.name, position: awayAtt.position, rating: aRating },
      advantage: hRating > aRating + 5 ? 'home' : aRating > hRating + 5 ? 'away' : 'even',
      edge: Math.abs(hRating - aRating),
    });
  }

  return matchups;
}

function buildTacticalRecommendation(
  home: Team, away: Team,
  probs: { home: number; draw: number; away: number },
  isUserHome: boolean,
): TacticalRecommendation {
  const userTeam = isUserHome ? home : away;
  const oppTeam = isUserHome ? away : home;
  const userWinProb = isUserHome ? probs.home : probs.away;
  const oppWinProb = isUserHome ? probs.away : probs.home;

  const userStr = calculateTeamStrength(userTeam);
  const oppStr = calculateTeamStrength(oppTeam);
  const strengthDiff = userStr - oppStr;

  const userForm = formScore(userTeam.leagueForm ?? []);
  const oppForm = formScore(oppTeam.leagueForm ?? []);

  if (strengthDiff > 15 && userWinProb > 50) {
    return {
      mentality: 'Ofensivo',
      approach: 'Pressão alta, linha defensiva alta, ritmo rápido. Aproveite a superioridade para cercar o adversário.',
      reason: `Seu time é ${strengthDiff.toFixed(0)} pontos mais forte e tem ${userWinProb.toFixed(0)}% de chance de vitória. Ataque com confiança.`,
      riskLevel: 'low',
    };
  }

  if (strengthDiff < -15 && oppWinProb > 50) {
    return {
      mentality: 'Defensivo',
      approach: 'Linha defensiva baixa, contra-ataque, pressão contida. Espere o erro do adversário e explore espaços.',
      reason: `O adversário é ${Math.abs(strengthDiff).toFixed(0)} pontos mais forte com ${oppWinProb.toFixed(0)}% de chance de vitória. Respeite a hierarquia.`,
      riskLevel: 'medium',
    };
  }

  if (Math.abs(strengthDiff) <= 15 && userWinProb > 35 && userWinProb < 50) {
    if (userForm > oppForm) {
      return {
        mentality: 'Positivo',
        approach: 'Mentalidade positiva com contra-pressionamento. Sua forma recente é superior — pressione alto nos primeiros 20 minutos.',
        reason: `Times equilibrados em força, mas sua forma recente (${userForm} pts vs ${oppForm} pts) é superior. Pressione cedo.`,
        riskLevel: 'medium',
      };
    }
    return {
      mentality: 'Equilibrado',
      approach: 'Mentalidade equilibrada, passe curto, posse de bola. Controle o ritmo e evite riscos desnecessários.',
      reason: `Times equilibrados em força (${userStr.toFixed(0)} vs ${oppStr.toFixed(0)}). Forma similar. Jogo de paciência.`,
      riskLevel: 'low',
    };
  }

  if (oppTeam.tactic === 'attacking' && oppWinProb > 45) {
    return {
      mentality: 'Cauteloso',
      approach: 'Linha defensiva média, contra-ataque ativo, armadilha de impedimento. O adversário ataca muito — explore os espaços deixados.',
      reason: `O adversário joga no ataque (${oppTeam.tactic}). Contra-ataque é a arma ideal contra times ofensivos.`,
      riskLevel: 'high',
    };
  }

  return {
    mentality: 'Equilibrado',
    approach: 'Postura equilibrada com flexibilidade tática. Ajuste conforme o desenrolar da partida.',
    reason: 'Cenário neutro — sem vantagem clara para nenhum lado. Mantenha disciplina tática.',
    riskLevel: 'low',
  };
}

export function generatePreMatchAnalysis(
  home: Team,
  away: Team,
  userTeamId: string | null,
): PreMatchAnalysis {
  const SIM_COUNT = 500;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let totalHomeGoals = 0;
  let totalAwayGoals = 0;
  const scoreMap = new Map<string, number>();

  for (let i = 0; i < SIM_COUNT; i++) {
    const result = simulateMatchResult(home, away);
    totalHomeGoals += result.homeGoals;
    totalAwayGoals += result.awayGoals;

    const key = `${result.homeGoals}-${result.awayGoals}`;
    scoreMap.set(key, (scoreMap.get(key) ?? 0) + 1);

    if (result.homeGoals > result.awayGoals) homeWins++;
    else if (result.homeGoals < result.awayGoals) awayWins++;
    else draws++;
  }

  const winProbability = {
    home: Math.round((homeWins / SIM_COUNT) * 100),
    draw: Math.round((draws / SIM_COUNT) * 100),
    away: Math.round((awayWins / SIM_COUNT) * 100),
  };

  const expectedGoals = {
    home: Math.round((totalHomeGoals / SIM_COUNT) * 100) / 100,
    away: Math.round((totalAwayGoals / SIM_COUNT) * 100) / 100,
  };

  const predictedScore = {
    home: Math.round(expectedGoals.home),
    away: Math.round(expectedGoals.away),
  };

  let mostLikelyScore = `${predictedScore.home}-${predictedScore.away}`;
  let maxCount = 0;
  scoreMap.forEach((count, key) => {
    if (count > maxCount) {
      maxCount = count;
      mostLikelyScore = key;
    }
  });

  const homeStrength = Math.round(calculateTeamStrength(home));
  const awayStrength = Math.round(calculateTeamStrength(away));

  const keyMatchups = buildKeyMatchups(home, away);

  const formComparison: FormComparison = {
    homeForm: home.leagueForm ?? [],
    awayForm: away.leagueForm ?? [],
    homeFormScore: formScore(home.leagueForm ?? []),
    awayFormScore: formScore(away.leagueForm ?? []),
  };

  const isUserHome = userTeamId === home.id;
  const tacticalRecommendation = buildTacticalRecommendation(
    home, away, winProbability, isUserHome,
  );

  const homeAdvantage = 1.12;
  const maxProb = Math.max(winProbability.home, winProbability.draw, winProbability.away);
  const confidenceLevel = Math.round(maxProb);

  const favTeam = winProbability.home > winProbability.away ? home.name : away.name;
  const favProb = Math.max(winProbability.home, winProbability.away);
  const summary = favProb > 50
    ? `${favTeam} é favorito com ${favProb}% de probabilidade de vitória. Placar mais provável: ${mostLikelyScore}.`
    : `Partida equilibrada. ${home.name} tem ${winProbability.home}% vs ${away.name} ${winProbability.away}%. Empate tem ${winProbability.draw}% de chance.`;

  return {
    homeTeam: home.id,
    awayTeam: away.id,
    homeStrength,
    awayStrength,
    winProbability,
    predictedScore,
    mostLikelyScore,
    expectedGoals,
    keyMatchups,
    formComparison,
    tacticalRecommendation,
    homeAdvantage,
    confidenceLevel,
    summary,
  };
}
