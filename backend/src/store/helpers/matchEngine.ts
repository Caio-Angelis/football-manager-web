// Motor de Partida — Cálculo de força, simulação e ratings

import type { Team, Match, MatchEvent, MatchStats, PlayerMatchRating, Player, PlayerAttribute, GKAttributes, MatchAction, LiveMatchState } from '../../types/game';

// ============================================================
// CÁLCULO DE FORÇA DO TIME
// ============================================================

export function getTacticalBonus(team: Team): number {
  let bonus = 0;
  if (team.tactic === 'attacking') bonus += 0.08;
  if (team.tactic === 'defensive') bonus += 0.05;
  if (team.teamMentality === 'offensive' || team.teamMentality === 'very offensive') bonus += 0.05;
  if (team.teamMentality === 'defensive' || team.teamMentality === 'very defensive') bonus += 0.04;

  const counterPress = team.afterLosingPossession === 'counterPress'
    || (!team.afterLosingPossession && team.counterPress);
  const counterAttack = team.afterGainingPossession === 'counterAttack';
  const highPress = team.pressIntensity === 'high'
    || (!team.pressIntensity && team.highPress);
  const highLine = team.engagementLine === 'high' || team.defensiveLine === 'high'
    || (!team.engagementLine && team.highLine);
  const aggressiveTackling = team.tacklingStyle === 'aggressive'
    || (!team.tacklingStyle && team.aggressiveTackling);

  if (highPress) bonus += 0.03;
  if (counterPress) bonus += 0.03;
  if (counterAttack) bonus += 0.04;
  if (highLine) bonus += 0.02;
  if (aggressiveTackling) bonus += 0.02;
  if (team.trapOffside) bonus += 0.01;
  if (team.workBallIntoBox) bonus += 0.02;
  if (team.tempo === 'fast') bonus += 0.03;
  if (team.passingStyle === 'short') bonus += 0.02;
  return bonus;
}

export function calculateTeamStrength(team: Team): number {
  const starting11 = team.squad.slice(0, 11);
  let totalStrength = 0;

  starting11.forEach(player => {
    let sum = 0;
    let count = 0;

    if (player.technical) {
      [player.technical.passing, player.technical.technique, player.technical.finishing,
        player.technical.dribbling, player.technical.crossing].forEach(v => {
        if (v) { sum += v * 4; count++; }
      });
    }
    if (player.mental) {
      [player.mental.vision, player.mental.decisions, player.mental.composure,
        player.mental.anticipation, player.mental.positioning].forEach(v => {
        if (v) { sum += v * 5; count++; }
      });
    }
    if (player.physical) {
      [player.physical.speed, player.physical.stamina, player.physical.strength,
        player.physical.agility, player.physical.acceleration].forEach(v => {
        if (v) { sum += v * 3; count++; }
      });
    }

    const playerStrength = (player.currentAbility * 0.6 + (sum / Math.max(count, 1)) * 5.5) * 1.2;
    totalStrength += playerStrength * (player.form / 100) * (player.fitness / 100);
  });

  return (totalStrength / Math.max(starting11.length, 1)) * (1 + getTacticalBonus(team));
}

export function getPossessionBias(home: Team, away: Team): number {
  const homePass = home.squad.slice(0, 11).reduce((s, p) => s + (p.technical?.passing ?? 10), 0);
  const awayPass = away.squad.slice(0, 11).reduce((s, p) => s + (p.technical?.passing ?? 10), 0);
  const homeTactic = home.passingStyle === 'short' ? 0.05 : home.passingStyle === 'direct' ? -0.03 : 0;
  const awayTactic = away.passingStyle === 'short' ? 0.05 : away.passingStyle === 'direct' ? -0.03 : 0;
  const total = homePass + awayPass + 1;
  return (homePass / total) + homeTactic - awayTactic + 0.02;
}

// ============================================================
// HELPERS DO MOTOR DE PARTIDA
// ============================================================

export interface GoalDetail {
  team: 'home' | 'away';
  minute: number;
  scorerId: string;
  scorerName: string;
  assistId?: string;
  assistName?: string;
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
  stats: MatchStats;
  goalDetails: GoalDetail[];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Média de atributos definidos (ignora ausentes/zeros), com fallback médio
function avgDefined(values: (number | undefined)[]): number {
  let sum = 0;
  let count = 0;
  for (const v of values) {
    if (typeof v === 'number' && v > 0) { sum += v; count++; }
  }
  return count > 0 ? sum / count : 8;
}

function startingXI(team: Team) {
  return team.squad.slice(0, 11);
}

// Qualidade ofensiva individual (escala ~0-100)
function attackQuality(p: Team['squad'][number]): number {
  const attr = avgDefined([
    p.technical?.finishing, p.technical?.technique, p.technical?.dribbling,
    p.technical?.longShots, p.mental?.composure, p.mental?.offBall, p.mental?.decisions,
  ]);
  return 0.5 * (attr * 5) + 0.5 * (p.currentAbility / 2);
}

// Qualidade defensiva individual (escala ~0-100)
function defenseQuality(p: Team['squad'][number]): number {
  if (p.position === 'GK') {
    const g = avgDefined([
      p.goalkeeping?.reflexes, p.goalkeeping?.oneOnOne, p.goalkeeping?.commandOfArea,
      p.goalkeeping?.handballing, p.mental?.positioning, p.mental?.concentration,
    ]);
    return 0.5 * (g * 5) + 0.5 * (p.currentAbility / 2);
  }
  const d = avgDefined([
    p.technical?.tackling, p.technical?.marking, p.mental?.positioning,
    p.mental?.anticipation, p.mental?.concentration, p.physical?.strength,
  ]);
  return 0.5 * (d * 5) + 0.5 * (p.currentAbility / 2);
}

const ATTACK_WEIGHT: Record<string, number> = { FWD: 3, MID: 2, DEF: 0.6, GK: 0.05 };
const DEFENSE_WEIGHT: Record<string, number> = { GK: 2.5, DEF: 3, MID: 1.5, FWD: 0.4 };

// Força ofensiva do time, ponderada por posição, forma e condição
function teamAttack(team: Team): number {
  const xi = startingXI(team);
  let sum = 0;
  let weight = 0;
  xi.forEach(p => {
    const cond = ((p.form ?? 70) / 100) * ((p.fitness ?? 90) / 100);
    const w = ATTACK_WEIGHT[p.position] ?? 1;
    sum += attackQuality(p) * w * cond;
    weight += w;
  });
  const base = sum / Math.max(weight, 1);
  return base * (1 + getTacticalBonus(team) * 0.6);
}

// Força defensiva do time, ponderada por posição, forma e condição
function teamDefense(team: Team): number {
  const xi = startingXI(team);
  let sum = 0;
  let weight = 0;
  xi.forEach(p => {
    const cond = ((p.form ?? 70) / 100) * ((p.fitness ?? 90) / 100);
    const w = DEFENSE_WEIGHT[p.position] ?? 1;
    sum += defenseQuality(p) * w * cond;
    weight += w;
  });
  const base = sum / Math.max(weight, 1);
  return base * (1 + getTacticalBonus(team) * 0.3);
}

// Amostra de uma distribuição de Poisson (número de gols)
function poissonSample(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return Math.min(k - 1, 8);
}

// Escolha ponderada de um item
function weightedPick<T>(items: T[], weights: number[]): T | undefined {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0 || items.length === 0) return items[0];
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Escolhe o autor do gol, ponderado por finalização e posição
function pickScorer(team: Team): Team['squad'][number] | undefined {
  const xi = startingXI(team);
  const weights = xi.map(p => {
    const finishing = Math.max(1, p.technical?.finishing ?? 5);
    const posW = p.position === 'FWD' ? 3.2 : p.position === 'MID' ? 1.5 : p.position === 'DEF' ? 0.45 : 0.02;
    return finishing * posW;
  });
  return weightedPick(xi, weights);
}

// Escolhe o autor da assistência, ponderado por passe/visão e posição
function pickAssister(team: Team, scorerId?: string): Team['squad'][number] | undefined {
  const xi = startingXI(team).filter(p => p.id !== scorerId && p.position !== 'GK');
  if (xi.length === 0) return undefined;
  const weights = xi.map(p => {
    const playmaking = Math.max(1, avgDefined([p.technical?.passing, p.mental?.vision, p.technical?.crossing]));
    const posW = p.position === 'MID' ? 2.2 : p.position === 'FWD' ? 1.4 : p.position === 'DEF' ? 0.7 : 1;
    return playmaking * posW;
  });
  return weightedPick(xi, weights);
}

// ============================================================
// MOTOR DE PARTIDA — modelo de gols esperados (xG) + Poisson
// ============================================================

export function simulateMatchResult(homeTeam: Team, awayTeam: Team, homeBoost = 0, awayBoost = 0): MatchResult {
  const HOME_ADVANTAGE = 1.12;
  const BASE_GOALS = 1.35;

  const homeAtt = teamAttack(homeTeam) * (1 + homeBoost);
  const awayAtt = teamAttack(awayTeam) * (1 + awayBoost);
  const homeDef = Math.max(1, teamDefense(homeTeam));
  const awayDef = Math.max(1, teamDefense(awayTeam));

  // Gols esperados: força ofensiva relativa à defesa adversária
  const homeLambda = clamp(BASE_GOALS * (homeAtt / awayDef) * HOME_ADVANTAGE, 0.15, 4.5);
  const awayLambda = clamp(BASE_GOALS * (awayAtt / homeDef), 0.1, 4.0);

  const homeGoals = poissonSample(homeLambda);
  const awayGoals = poissonSample(awayLambda);

  // Detalhes dos gols (autor + assistência) e minutos
  const goalDetails: GoalDetail[] = [];
  const buildGoals = (team: Team, count: number, side: 'home' | 'away') => {
    for (let i = 0; i < count; i++) {
      const minute = 1 + Math.floor(Math.random() * 90);
      const scorer = pickScorer(team);
      const assister = Math.random() < 0.62 ? pickAssister(team, scorer?.id) : undefined;
      goalDetails.push({
        team: side,
        minute,
        scorerId: scorer?.id ?? '',
        scorerName: scorer?.name ?? team.name,
        assistId: assister?.id,
        assistName: assister?.name,
      });
    }
  };
  buildGoals(homeTeam, homeGoals, 'home');
  buildGoals(awayTeam, awayGoals, 'away');

  // Estatísticas coerentes derivadas dos lambdas e gols
  const homePossession = clamp(getPossessionBias(homeTeam, awayTeam), 0.30, 0.70);
  const homeShotsOnTarget = homeGoals + Math.round(homeLambda * (0.7 + Math.random() * 0.9));
  const awayShotsOnTarget = awayGoals + Math.round(awayLambda * (0.7 + Math.random() * 0.9));
  const homeShots = homeShotsOnTarget + Math.round(homeLambda * 2 + Math.random() * 5);
  const awayShots = awayShotsOnTarget + Math.round(awayLambda * 2 + Math.random() * 5);
  const homePasses = Math.round(homePossession * (360 + Math.random() * 160));
  const awayPasses = Math.round((1 - homePossession) * (360 + Math.random() * 160));

  // Construção da linha do tempo de eventos
  const events: MatchEvent[] = [];
  goalDetails.forEach(g => {
    const team = g.team === 'home' ? homeTeam : awayTeam;
    events.push({
      minute: g.minute,
      type: 'goal',
      team: g.team,
      player: g.scorerName,
      description: g.assistName
        ? `GOOOL! ${g.scorerName} marca para o ${team.name}! (assist.: ${g.assistName})`
        : `GOOOL! ${g.scorerName} marca para o ${team.name}!`,
    });
  });

  // Defesas (chutes no alvo que não viraram gol)
  const homeSaves = Math.max(0, homeShotsOnTarget - homeGoals);
  const awaySaves = Math.max(0, awayShotsOnTarget - awayGoals);
  for (let i = 0; i < homeSaves; i++) {
    events.push({ minute: 1 + Math.floor(Math.random() * 90), type: 'save', team: 'away', description: 'Boa defesa do guarda-redes!' });
  }
  for (let i = 0; i < awaySaves; i++) {
    events.push({ minute: 1 + Math.floor(Math.random() * 90), type: 'save', team: 'home', description: 'Boa defesa do guarda-redes!' });
  }

  // Escanteios e faltas para enriquecer a narrativa
  const corners = Math.round((homeShots + awayShots) / 4);
  for (let i = 0; i < corners; i++) {
    events.push({ minute: 1 + Math.floor(Math.random() * 90), type: 'corner', team: Math.random() < homePossession ? 'home' : 'away', description: 'Escanteio' });
  }
  const fouls = 6 + Math.floor(Math.random() * 9);
  for (let i = 0; i < fouls; i++) {
    events.push({ minute: 1 + Math.floor(Math.random() * 90), type: 'foul', team: Math.random() < 0.5 ? 'home' : 'away', description: 'Falta' });
  }

  events.sort((a, b) => a.minute - b.minute);

  const stats: MatchStats = {
    homeXG: Math.round((homeGoals * 0.65 + homeShotsOnTarget * 0.22 + Math.random() * 0.3) * 100) / 100,
    awayXG: Math.round((awayGoals * 0.65 + awayShotsOnTarget * 0.22 + Math.random() * 0.3) * 100) / 100,
    homePossession: Math.round(homePossession * 100),
    awayPossession: 100 - Math.round(homePossession * 100),
    homeShots,
    awayShots,
    homeShotsOnTarget,
    awayShotsOnTarget,
    homePasses,
    awayPasses,
    homePassAccuracy: Math.round(72 + Math.random() * 18),
    awayPassAccuracy: Math.round(72 + Math.random() * 18),
  };

  return { homeGoals, awayGoals, events, stats, goalDetails };
}

// ============================================================
// CÁLCULO DE RATING DE JOGADORES (Tarefa 2.2)
// ============================================================

export function calculatePlayerMatchRatings(
  homeTeam: Team,
  awayTeam: Team,
  result: MatchResult,
): MatchResult & { playerRatings: PlayerMatchRating[]; bestPlayer?: string } {
  const ratings: PlayerMatchRating[] = [];

  const rateTeam = (team: Team, side: 'home' | 'away') => {
    const teamGoals = side === 'home' ? result.homeGoals : result.awayGoals;
    const concededGoals = side === 'home' ? result.awayGoals : result.homeGoals;
    const won = teamGoals > concededGoals;
    const lost = teamGoals < concededGoals;
    const cleanSheet = concededGoals === 0;

    startingXI(team).forEach(player => {
      const isGK = player.position === 'GK';
      const isDEF = player.position === 'DEF';
      const isMID = player.position === 'MID';
      const isFWD = player.position === 'FWD';

      const goals = result.goalDetails.filter(g => g.scorerId === player.id).length;
      const assists = result.goalDetails.filter(g => g.assistId === player.id).length;

      // Estatísticas cosméticas coerentes com a posição
      const rnd = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
      const shots = goals + (isFWD ? rnd(0, 4) : isMID ? rnd(0, 2) : isDEF ? rnd(0, 1) : 0);
      const shotsOnTarget = Math.min(shots, goals + (shots > goals && Math.random() < 0.5 ? 1 : 0));
      const passes = isMID ? rnd(45, 85) : isDEF ? rnd(35, 70) : isGK ? rnd(15, 38) : rnd(22, 55);
      const passingAttr = player.technical?.passing ?? 10;
      const passAccuracy = clamp(Math.round(60 + (passingAttr - 10) * 1.6 + (Math.random() * 12 - 4)), 55, 96);
      const tackles = isDEF ? rnd(2, 7) : isMID ? rnd(1, 5) : isGK ? 0 : rnd(0, 2);
      const interceptions = isDEF ? rnd(1, 5) : isMID ? rnd(0, 3) : rnd(0, 1);

      // Nota base + contribuição
      let rating = 6.3;
      rating += goals * 1.15 + assists * 0.65;

      if (isGK) {
        rating += cleanSheet ? 1.0 : 0;
        rating -= concededGoals * 0.4;
      } else if (isDEF) {
        rating += cleanSheet ? 0.6 : 0;
        rating -= concededGoals * 0.22;
        rating += tackles * 0.06 + interceptions * 0.05;
      } else if (isMID) {
        rating += teamGoals * 0.12 + assists * 0.2;
        rating += (passAccuracy - 75) * 0.012;
      } else if (isFWD) {
        rating += teamGoals * 0.05;
        if (goals === 0) rating -= 0.4;
      }

      if (won) rating += 0.4; else if (lost) rating -= 0.35;

      rating += ((player.form ?? 70) - 70) * 0.006;
      rating += ((player.fitness ?? 90) - 85) * 0.004;
      rating += (Math.random() - 0.5) * 0.5;

      // Teto de qualidade baseado no CA (exceção para grandes atuações)
      const ceiling = 6.5 + (player.currentAbility / 200) * 3.5;
      const effectiveCeiling = goals >= 2 ? Math.max(ceiling, 9.5) : ceiling;
      rating = Math.min(rating, effectiveCeiling);
      rating = clamp(Math.round(rating * 10) / 10, 4.0, 10);

      ratings.push({
        playerId: player.id,
        playerName: player.name,
        position: player.position,
        rating,
        goals,
        assists,
        shots,
        shotsOnTarget,
        passes,
        passAccuracy,
        tackles,
        interceptions,
        minutesPlayed: 90,
        isStarted: player.squadStatus !== 'Young Talent',
      });
    });
  };

  rateTeam(homeTeam, 'home');
  rateTeam(awayTeam, 'away');

  const bestPlayer = ratings.reduce((best, r) => (r.rating > best.rating ? r : best), ratings[0]);

  return { ...result, playerRatings: ratings, bestPlayer: bestPlayer?.playerId };
}

export function generateWeekMatches(teams: Team[], week: number): Match[] {
  const matches: Match[] = [];
  const shuffled = [...teams].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) {
      const day = (i / 2) % 5 + 1;
      matches.push({
        homeTeam: shuffled[i].id,
        awayTeam: shuffled[i + 1].id,
        homeGoals: 0,
        awayGoals: 0,
        date: `Semana ${week} - Dia ${day}`,
        completed: false,
        isLive: false,
        liveMinute: 0,
        liveEvents: [],
        liveActions: [],
        liveStats: {
          homeXG: 0,
          awayXG: 0,
          homePossession: 50,
          awayPossession: 50,
          homeShots: 0,
          awayShots: 0,
          homeShotsOnTarget: 0,
          awayShotsOnTarget: 0,
          homePasses: 0,
          awayPasses: 0,
          homePassAccuracy: 70,
          awayPassAccuracy: 70,
        },
        homeSubstitutions: 0,
        awaySubstitutions: 0,
        events: [],
        stats: undefined,
      });
    }
  }

  return matches;
}

export function applyMatchResultToTeams(
  teams: Team[],
  homeId: string,
  awayId: string,
  result: ReturnType<typeof simulateMatchResult>,
): Team[] {
  const updated = [...teams];
  const homeIdx = updated.findIndex(t => t.id === homeId);
  const awayIdx = updated.findIndex(t => t.id === awayId);
  if (homeIdx === -1 || awayIdx === -1) return teams;

  const homeTeam = { ...updated[homeIdx] };
  const awayTeam = { ...updated[awayIdx] };

  homeTeam.played++;
  awayTeam.played++;
  homeTeam.goalsFor += result.homeGoals;
  awayTeam.goalsFor += result.awayGoals;
  homeTeam.goalsAgainst += result.awayGoals;
  awayTeam.goalsAgainst += result.homeGoals;

  if (result.homeGoals > result.awayGoals) {
    homeTeam.points += 3;
    homeTeam.won++;
    awayTeam.lost++;
  } else if (result.homeGoals < result.awayGoals) {
    awayTeam.points += 3;
    awayTeam.won++;
    homeTeam.lost++;
  } else {
    homeTeam.points += 1;
    awayTeam.points += 1;
    homeTeam.drawn++;
    awayTeam.drawn++;
  }

  updated[homeIdx] = homeTeam;
  updated[awayIdx] = awayTeam;
  return updated;
}

// ============================================================
// MOTOR DE PARTIDA PASSO A PASSO — cada passe, drible, chute
// ============================================================

// Probabilidade base de sucesso de um passe (antes de atributos)
function passSuccessProb(passer: Player, receiver: Player, pressure: number, team: Team): number {
  const passing = passer.technical?.passing ?? 10;
  const technique = passer.technical?.technique ?? 10;
  const composure = passer.mental?.composure ?? 10;
  const vision = passer.mental?.vision ?? 10;
  const decisions = passer.mental?.decisions ?? 10;
  const firstTouch = receiver.technical?.firstTouch ?? 10;

  // Base 75% + atributos do passador (até +18%) - pressão (até -25%)
  let prob = 0.75;
  prob += (passing - 10) * 0.012;
  prob += (technique - 10) * 0.006;
  prob += (composure - 10) * 0.008;
  prob += (vision - 10) * 0.005;
  prob += (decisions - 10) * 0.005;
  prob += (firstTouch - 10) * 0.004; // receptor ajuda
  prob -= pressure * 0.25;

  // Estilo de passe curto aumenta precisão
  if (team.passingStyle === 'short') prob += 0.03;
  if (team.passingStyle === 'direct') prob -= 0.02;

  // Forma e condição física
  prob *= ((passer.form ?? 70) / 100) * 0.5 + 0.5;
  prob *= ((passer.fitness ?? 90) / 100) * 0.5 + 0.5;

  return clamp(prob, 0.45, 0.97);
}

// Probabilidade de sucesso de um drible
function dribbleSuccessProb(dribbler: Player, defender: Player, team: Team): number {
  const dribbling = dribbler.technical?.dribbling ?? 10;
  const technique = dribbler.technical?.technique ?? 10;
  const agility = dribbler.physical?.agility ?? 10;
  const speed = dribbler.physical?.speed ?? 10;
  const composure = dribbler.mental?.composure ?? 10;
  const bravery = dribbler.mental?.bravery ?? 10;

  const tackling = defender.technical?.tackling ?? 10;
  const marking = defender.technical?.marking ?? 10;
  const strength = defender.physical?.strength ?? 10;
  const anticipation = defender.mental?.anticipation ?? 10;

  // Base 50% + atributos do driblador - atributos do defensor
  let prob = 0.50;
  prob += (dribbling - 10) * 0.015;
  prob += (technique - 10) * 0.008;
  prob += (agility - 10) * 0.006;
  prob += (speed - 10) * 0.005;
  prob += (composure - 10) * 0.005;
  prob += (bravery - 10) * 0.003;
  prob -= (tackling - 10) * 0.012;
  prob -= (marking - 10) * 0.008;
  prob -= (strength - 10) * 0.005;
  prob -= (anticipation - 10) * 0.005;

  prob *= ((dribbler.form ?? 70) / 100) * 0.5 + 0.5;
  prob *= ((dribbler.fitness ?? 90) / 100) * 0.5 + 0.5;

  return clamp(prob, 0.20, 0.85);
}

// Probabilidade de sucesso de um chute (em gol)
function shotSuccessProb(shooter: Player, goalkeeper: Player, distance: number, team: Team): { onTarget: boolean; goal: boolean } {
  const finishing = shooter.technical?.finishing ?? 10;
  const technique = shooter.technical?.technique ?? 10;
  const longShots = shooter.technical?.longShots ?? 10;
  const composure = shooter.mental?.composure ?? 10;
  const decisions = shooter.mental?.decisions ?? 10;
  const offBall = shooter.mental?.offBall ?? 10;

  const reflexes = goalkeeper.goalkeeping?.reflexes ?? 10;
  const oneOnOne = goalkeeper.goalkeeping?.oneOnOne ?? 10;
  const positioning = goalkeeper.mental?.positioning ?? 10;
  const concentration = goalkeeper.mental?.concentration ?? 10;

  // Probabilidade de chutar no alvo
  let onTargetProb = 0.40;
  onTargetProb += (finishing - 10) * 0.015;
  onTargetProb += (technique - 10) * 0.008;
  onTargetProb += (composure - 10) * 0.006;
  onTargetProb += (decisions - 10) * 0.005;
  // Chutes de longa distância são menos precisos
  if (distance > 0.6) {
    onTargetProb += (longShots - 10) * 0.010;
    onTargetProb -= 0.12;
  } else if (distance < 0.25) {
    onTargetProb += 0.15; // na cara do gol
  }
  onTargetProb *= ((shooter.form ?? 70) / 100) * 0.5 + 0.5;

  const onTarget = Math.random() < clamp(onTargetProb, 0.15, 0.80);

  if (!onTarget) return { onTarget: false, goal: false };

  // Se no alvo, probabilidade de gol (vencer o goleiro)
  let goalProb = 0.45;
  goalProb += (finishing - 10) * 0.012;
  goalProb += (composure - 10) * 0.008;
  goalProb += (offBall - 10) * 0.005;
  goalProb -= (reflexes - 10) * 0.010;
  goalProb -= (oneOnOne - 10) * 0.008;
  goalProb -= (positioning - 10) * 0.006;
  goalProb -= (concentration - 10) * 0.004;

  // Chutes de perto são mais difíceis de defender
  if (distance < 0.25) goalProb += 0.20;
  if (distance > 0.6) goalProb -= 0.15;

  goalProb *= ((shooter.form ?? 70) / 100) * 0.5 + 0.5;

  const goal = Math.random() < clamp(goalProb, 0.10, 0.85);
  return { onTarget: true, goal };
}

// Probabilidade de um defensor fazer desarme
function tackleSuccessProb(defender: Player, attacker: Player, team: Team): number {
  const tackling = defender.technical?.tackling ?? 10;
  const marking = defender.technical?.marking ?? 10;
  const strength = defender.physical?.strength ?? 10;
  const anticipation = defender.mental?.anticipation ?? 10;
  const aggression = defender.mental?.aggression ?? 10;

  const dribbling = attacker.technical?.dribbling ?? 10;
  const technique = attacker.technical?.technique ?? 10;
  const agility = attacker.physical?.agility ?? 10;

  let prob = 0.45;
  prob += (tackling - 10) * 0.015;
  prob += (marking - 10) * 0.008;
  prob += (strength - 10) * 0.006;
  prob += (anticipation - 10) * 0.006;
  prob += (aggression - 10) * 0.004;
  prob -= (dribbling - 10) * 0.010;
  prob -= (technique - 10) * 0.005;
  prob -= (agility - 10) * 0.005;

  // Pressão alta aumenta chance de desarme
  if (team.pressIntensity === 'high') prob += 0.05;
  if (team.tacklingStyle === 'aggressive') prob += 0.04;

  prob *= ((defender.fitness ?? 90) / 100) * 0.5 + 0.5;

  return clamp(prob, 0.20, 0.75);
}

// Escolhe um jogador do time com posse, favorecendo os mais avançados quando atacando
function pickPlayerWithBall(team: Team, ballPos: number, excludeId?: string): Player {
  const xi = startingXI(team).filter(p => p.id !== excludeId);
  if (xi.length === 0) return team.squad[0];

  // ballPos: 0 = home goal, 1 = away goal. home attacks toward 1.
  // Players closer to the ball are more likely to be involved
  const weights = xi.map(p => {
    const pos = p.position;
    // Quando a bola está na defesa, zagueiros e goleiro têm mais chance
    // Quando está no ataque, atacantes e meias têm mais chance
    let w = 1;
    if (pos === 'GK') w = 0.05;
    else if (pos === 'DEF') w = ballPos < 0.4 ? 3 : ballPos > 0.7 ? 0.5 : 1.5;
    else if (pos === 'MID') w = 2; // meias sempre envolvidos
    else if (pos === 'FWD') w = ballPos > 0.5 ? 3 : ballPos < 0.3 ? 0.8 : 1.5;
    return w;
  });

  return weightedPick(xi, weights) ?? xi[0];
}

// Escolhe um defensor adversário para tentar desarme/interceptação
function pickDefender(defendingTeam: Team, ballPos: number): Player {
  const xi = startingXI(defendingTeam);
  // Quando a bola está perto do gol, zagueiros e goleiro são mais relevantes
  const weights = xi.map(p => {
    const pos = p.position;
    let w = 1;
    if (pos === 'GK') w = ballPos < 0.15 ? 2 : 0.1;
    else if (pos === 'DEF') w = ballPos < 0.5 ? 3 : 1.5;
    else if (pos === 'MID') w = 1.5;
    else if (pos === 'FWD') w = 0.3;
    return w;
  });
  return weightedPick(xi, weights) ?? xi[0];
}

// Calcula pressão defensiva sobre o portador da bola (0-1)
function calculatePressure(attackingTeam: Team, defendingTeam: Team, ballPos: number): number {
  let pressure = 0.3;
  // Mais perto do gol adversário = mais pressão (defensores se concentram)
  pressure += Math.abs(ballPos - 0.5) * 0.4;
  // Pressão alta tática
  if (defendingTeam.pressIntensity === 'high') pressure += 0.15;
  if (defendingTeam.pressIntensity === 'low') pressure -= 0.10;
  // Contra-pressão
  if (defendingTeam.afterLosingPossession === 'counterPress') pressure += 0.08;
  // Linha alta
  if (defendingTeam.engagementLine === 'high') pressure += 0.05;
  return clamp(pressure, 0.10, 0.85);
}

// Inicializa o estado da partida ao vivo
export function initLiveMatchState(homeTeam: Team, awayTeam: Team): LiveMatchState {
  const possessionBias = getPossessionBias(homeTeam, awayTeam);
  const homeStarts = Math.random() < possessionBias;

  // Escolhe o primeiro portador da bola
  const startingTeam = homeStarts ? homeTeam : awayTeam;
  const firstHolder = pickPlayerWithBall(startingTeam, 0.5);

  return {
    possession: homeStarts ? 'home' : 'away',
    ballPos: 0.5,
    ballHolderId: firstHolder.id,
    passChain: 0,
    pressure: 0.3,
    homeGoals: 0,
    awayGoals: 0,
    stats: {
      homeXG: 0,
      awayXG: 0,
      homePossession: 50,
      awayPossession: 50,
      homeShots: 0,
      awayShots: 0,
      homeShotsOnTarget: 0,
      awayShotsOnTarget: 0,
      homePasses: 0,
      awayPasses: 0,
      homePassAccuracy: 0,
      awayPassAccuracy: 0,
    },
    events: [],
    actions: [],
    goalDetails: [],
  };
}

// Simula uma sequência de ações dentro de 1 minuto de jogo
// Retorna o estado atualizado + novas ações + novos eventos
export function simulateMinute(
  homeTeam: Team,
  awayTeam: Team,
  state: LiveMatchState,
  minute: number,
): LiveMatchState {
  const attackingTeam = state.possession === 'home' ? homeTeam : awayTeam;
  const defendingTeam = state.possession === 'home' ? awayTeam : homeTeam;
  const side = state.possession;

  // Direção de ataque: home ataca rumo a ballPos=1, away rumo a ballPos=0
  const attackDir = side === 'home' ? 1 : -1;
  const currentBallPos = state.ballPos;

  // Calcula pressão
  let pressure = calculatePressure(attackingTeam, defendingTeam, currentBallPos);

  // Pega o portador atual da bola
  const holder = attackingTeam.squad.find(p => p.id === state.ballHolderId) ?? attackingTeam.squad[0];

  // Decide a ação: passe, drible, ou chute
  // Quanto mais perto do gol, maior a chance de chutar
  const attackProgress = side === 'home' ? currentBallPos : 1 - currentBallPos; // 0 = defesa, 1 = gol adversário
  let shotChance = attackProgress > 0.7 ? 0.20 : attackProgress > 0.5 ? 0.08 : 0.02;
  let dribbleChance = pressure > 0.5 ? 0.25 : 0.12;

  // Aplica boost de intervenção (gritos/substituição)
  const boost = state.interventionBoost;
  if (boost && minute <= boost.untilMinute) {
    if (boost.team === side) {
      // Time atacante com boost: mais chance de chutar e driblar
      shotChance *= 1.08;
      dribbleChance *= 1.05;
      pressure *= 0.92; // menos pressão sentida
    } else {
      // Time defensor com boost: mais pressão
      pressure *= 1.06;
    }
  }

  const roll = Math.random();
  const newActions: MatchAction[] = [];
  const newEvents: MatchEvent[] = [];
  let newState: LiveMatchState = { ...state, pressure };

  // Acumula passes para stats
  let homePasses = state.stats.homePasses;
  let awayPasses = state.stats.awayPasses;

  if (roll < shotChance) {
    // === CHUTE ===
    const goalkeeper = defendingTeam.squad.find(p => p.position === 'GK') ?? defendingTeam.squad[0];
    const distance = attackProgress; // 0 = longe, 1 = perto do gol
    const result = shotSuccessProb(holder, goalkeeper, distance, attackingTeam);

    // xG acumulado
    const xgContribution = clamp(0.05 + attackProgress * 0.15 + (holder.technical?.finishing ?? 10) / 200, 0.03, 0.45);

    newActions.push({
      minute,
      type: 'shot',
      team: side,
      playerId: holder.id,
      playerName: holder.name,
      success: result.goal,
      description: result.goal
        ? `GOL! ${holder.name} finaliza com precisão!`
        : result.onTarget
          ? `${holder.name} chuta no alvo — defesa do goleiro!`
          : `${holder.name} finaliza para fora`,
      ballPos: currentBallPos,
    });

    if (side === 'home') {
      newState.stats = { ...newState.stats, homeShots: state.stats.homeShots + 1, homeXG: Math.round((state.stats.homeXG + xgContribution) * 100) / 100 };
      if (result.onTarget) newState.stats.homeShotsOnTarget = state.stats.homeShotsOnTarget + 1;
    } else {
      newState.stats = { ...newState.stats, awayShots: state.stats.awayShots + 1, awayXG: Math.round((state.stats.awayXG + xgContribution) * 100) / 100 };
      if (result.onTarget) newState.stats.awayShotsOnTarget = state.stats.awayShotsOnTarget + 1;
    }

    if (result.goal) {
      // GOL!
      if (side === 'home') newState.homeGoals = state.homeGoals + 1;
      else newState.awayGoals = state.awayGoals + 1;

      // Assistência?
      const assister = Math.random() < 0.62 ? pickAssister(attackingTeam, holder.id) : undefined;

      newEvents.push({
        minute,
        type: 'goal',
        team: side,
        player: holder.name,
        description: assister
          ? `GOOOL! ${holder.name} marca para o ${attackingTeam.name}! (assist.: ${assister.name})`
          : `GOOOL! ${holder.name} marca para o ${attackingTeam.name}!`,
      });

      newState.goalDetails = [...state.goalDetails, {
        team: side,
        minute,
        scorerId: holder.id,
        scorerName: holder.name,
        assistId: assister?.id,
        assistName: assister?.name,
      }];

      // Reinicia do meio-campo (posse para o time que sofreu o gol)
      const losingTeam = side === 'home' ? awayTeam : homeTeam;
      const newHolder = pickPlayerWithBall(losingTeam, 0.5);
      newState.possession = side === 'home' ? 'away' : 'home';
      newState.ballPos = 0.5;
      newState.ballHolderId = newHolder.id;
      newState.passChain = 0;
    } else if (result.onTarget) {
      // Defesa do goleiro — posse para o time defensor
      newEvents.push({
        minute,
        type: 'save',
        team: side === 'home' ? 'away' : 'home',
        description: `Boa defesa de ${goalkeeper.name}!`,
      });
      const newHolder = pickPlayerWithBall(defendingTeam, currentBallPos);
      newState.possession = side === 'home' ? 'away' : 'home';
      newState.ballHolderId = newHolder.id;
      newState.passChain = 0;
      // Bola rebate para a defesa
      newState.ballPos = side === 'home' ? clamp(currentBallPos - 0.3, 0, 1) : clamp(currentBallPos + 0.3, 0, 1);
    } else {
      // Chute para fora — posse para o time defensor (tiro de meta)
      const newHolder = pickPlayerWithBall(defendingTeam, side === 'home' ? 0.1 : 0.9);
      newState.possession = side === 'home' ? 'away' : 'home';
      newState.ballHolderId = newHolder.id;
      newState.passChain = 0;
      newState.ballPos = side === 'home' ? 0.1 : 0.9;
    }
  } else if (roll < shotChance + dribbleChance) {
    // === DRIBLE ===
    const defender = pickDefender(defendingTeam, currentBallPos);
    const success = Math.random() < dribbleSuccessProb(holder, defender, attackingTeam);

    newActions.push({
      minute,
      type: 'dribble',
      team: side,
      playerId: holder.id,
      playerName: holder.name,
      success,
      description: success
        ? `${holder.name} dribla ${defender.name}!`
        : `${defender.name} desarma ${holder.name}!`,
      ballPos: currentBallPos,
    });

    if (success) {
      // Drible bem-sucedido — avança a bola
      const advance = 0.08 + Math.random() * 0.10;
      newState.ballPos = clamp(currentBallPos + advance * attackDir, 0, 1);
      newState.passChain = state.passChain + 1;
      // Pressão diminui após drible bem-sucedido
      newState.pressure = clamp(pressure - 0.15, 0.1, 0.85);
    } else {
      // Desarme — posse para o adversário
      // Possível falta
      if (Math.random() < 0.25) {
        newEvents.push({
          minute,
          type: 'foul',
          team: side === 'home' ? 'away' : 'home',
          player: defender.name,
          description: `Falta de ${defender.name} em ${holder.name}`,
        });
        // Cartão amarelo ocasional
        if (Math.random() < 0.15) {
          newEvents.push({
            minute,
            type: 'yellow',
            team: side === 'home' ? 'away' : 'home',
            player: defender.name,
            description: `Cartão amarelo para ${defender.name}`,
          });
        }
        // Posse mantida pelo atacante (falta)
        newState.ballPos = currentBallPos;
        newState.passChain = 0;
      } else {
        // Desarme limpo — posse para o defensor
        newState.possession = side === 'home' ? 'away' : 'home';
        newState.ballHolderId = defender.id;
        newState.passChain = 0;
        // Bola pode ir para qualquer direção
        newState.ballPos = clamp(currentBallPos + (Math.random() - 0.5) * 0.15, 0, 1);
      }
    }
  } else {
    // === PASSE ===
    // Escolhe receptor (não pode ser o próprio passador, não pode ser GK a menos que seja recuo)
    const receiver = pickPlayerWithBall(attackingTeam, currentBallPos, holder.id);
    const success = Math.random() < passSuccessProb(holder, receiver, pressure, attackingTeam);

    // Atualiza stats de passes
    if (side === 'home') {
      homePasses++;
    } else {
      awayPasses++;
    }

    newActions.push({
      minute,
      type: 'pass',
      team: side,
      playerId: holder.id,
      playerName: holder.name,
      success,
      description: success
        ? `${holder.name} passa para ${receiver.name}`
        : `${holder.name} erra o passe! ${receiver.name} não alcança`,
      ballPos: currentBallPos,
    });

    if (success) {
      // Passe bem-sucedido — bola vai para o receptor, avança um pouco
      const advance = 0.04 + Math.random() * 0.08;
      // Receptor pode estar mais à frente ou mais atrás
      const receiverPosBias = (Math.random() - 0.35) * 0.10; // tendência a avançar
      newState.ballPos = clamp(currentBallPos + (advance + receiverPosBias) * attackDir, 0, 1);
      newState.ballHolderId = receiver.id;
      newState.passChain = state.passChain + 1;

      // Cruzamento se a bola está na ponta e o receptor é da ponta
      if (attackProgress > 0.6 && Math.random() < 0.15) {
        const crosser = holder;
        const targetFwd = startingXI(attackingTeam).find(p => p.position === 'FWD') ?? receiver;
        const crossSuccess = Math.random() < ((crosser.technical?.crossing ?? 10) / 25);
        newActions.push({
          minute,
          type: 'cross',
          team: side,
          playerId: crosser.id,
          playerName: crosser.name,
          success: crossSuccess,
          description: crossSuccess
            ? `${crosser.name} cruza para ${targetFwd.name}!`
            : `${crosser.name} cruza mas a zaga afasta`,
          ballPos: newState.ballPos,
        });
        if (crossSuccess) {
          newState.ballHolderId = targetFwd.id;
          newState.ballPos = clamp(newState.ballPos + 0.10 * attackDir, 0, 1);
          newState.passChain = state.passChain + 2;
        } else {
          // Zaga afasta — interceptação
          const defender = pickDefender(defendingTeam, newState.ballPos);
          newState.possession = side === 'home' ? 'away' : 'home';
          newState.ballHolderId = defender.id;
          newState.passChain = 0;
          newState.ballPos = clamp(newState.ballPos - 0.20 * attackDir, 0, 1);
        }
      }
    } else {
      // Passe errado — interceptação ou bola perdida
      const defender = pickDefender(defendingTeam, currentBallPos);
      const interception = Math.random() < 0.55;

      if (interception) {
        newActions.push({
          minute,
          type: 'interception',
          team: side === 'home' ? 'away' : 'home',
          playerId: defender.id,
          playerName: defender.name,
          success: true,
          description: `${defender.name} intercepta o passe!`,
          ballPos: currentBallPos,
        });
        newState.possession = side === 'home' ? 'away' : 'home';
        newState.ballHolderId = defender.id;
      } else {
        // Bola solta — disputa
        const homeWins = Math.random() < 0.5;
        const winningTeam = homeWins ? homeTeam : awayTeam;
        const winner = pickPlayerWithBall(winningTeam, currentBallPos);
        newActions.push({
          minute,
          type: 'clearance',
          team: homeWins ? 'home' : 'away',
          playerId: winner.id,
          playerName: winner.name,
          success: true,
          description: `Bola solta — ${winner.name} fica com a posse`,
          ballPos: currentBallPos,
        });
        newState.possession = homeWins ? 'home' : 'away';
        newState.ballHolderId = winner.id;
      }
      newState.passChain = 0;
      // Bola pode se mover um pouco
      newState.ballPos = clamp(currentBallPos + (Math.random() - 0.5) * 0.20, 0, 1);
    }
  }

  // Atualiza posse de bola (baseada em quem terminou com a bola)
  // Cálculo incremental: conta quem teve mais ações neste minuto
  const homeActionsThisMinute = newActions.filter(a => a.team === 'home').length;
  const awayActionsThisMinute = newActions.filter(a => a.team === 'away').length;
  const totalActions = state.actions.length + newActions.length;
  const homeActionsTotal = state.actions.filter(a => a.team === 'home').length + homeActionsThisMinute;
  const awayActionsTotal = state.actions.filter(a => a.team === 'away').length + awayActionsThisMinute;

  if (totalActions > 0) {
    newState.stats = {
      ...newState.stats,
      homePossession: Math.round((homeActionsTotal / totalActions) * 100),
      awayPossession: Math.round((awayActionsTotal / totalActions) * 100),
    };
  }

  // Atualiza passes e precisão
  if (side === 'home') {
    const homeSuccessful = state.actions.filter(a => a.team === 'home' && a.type === 'pass' && a.success).length + newActions.filter(a => a.team === 'home' && a.type === 'pass' && a.success).length;
    newState.stats.homePasses = homePasses;
    newState.stats.homePassAccuracy = homePasses > 0 ? Math.round((homeSuccessful / homePasses) * 100) : 0;
  } else {
    const awaySuccessful = state.actions.filter(a => a.team === 'away' && a.type === 'pass' && a.success).length + newActions.filter(a => a.team === 'away' && a.type === 'pass' && a.success).length;
    newState.stats.awayPasses = awayPasses;
    newState.stats.awayPassAccuracy = awayPasses > 0 ? Math.round((awaySuccessful / awayPasses) * 100) : 0;
  }

  // Combina ações e eventos
  newState.actions = [...state.actions, ...newActions];
  newState.events = [...state.events, ...newEvents];

  // Escanteios ocasionais
  if (Math.random() < 0.04) {
    const cornerSide = Math.random() < 0.5 ? 'home' : 'away';
    newEvents.push({
      minute,
      type: 'corner',
      team: cornerSide,
      description: 'Escanteio',
    });
    newState.events = [...newState.events, {
      minute,
      type: 'corner' as const,
      team: cornerSide as 'home' | 'away',
      description: 'Escanteio',
    }];
  }

  return newState;
}

// Simula uma partida completa (para AI vs AI e auto-finalizar)
// Roda 90 minutos de simulação passo a passo
export function simulateFullMatch(homeTeam: Team, awayTeam: Team, homeBoost = 0, awayBoost = 0): MatchResult & { playerRatings: PlayerMatchRating[]; bestPlayer?: string } {
  let state = initLiveMatchState(homeTeam, awayTeam);

  // Aplica boosts de intervenção
  if (homeBoost > 0) {
    state.interventionBoost = { team: 'home', type: 'boost', untilMinute: 90 };
  }
  if (awayBoost > 0) {
    state.interventionBoost = { team: 'away', type: 'boost', untilMinute: 90 };
  }

  for (let minute = 1; minute <= 90; minute++) {
    state = simulateMinute(homeTeam, awayTeam, state, minute);
  }

  // Constrói o resultado no formato MatchResult
  const events: MatchEvent[] = state.events.sort((a, b) => a.minute - b.minute);

  // Ajusta posse final
  const stats: MatchStats = {
    ...state.stats,
    homePossession: clamp(state.stats.homePossession, 25, 75),
    awayPossession: 100 - clamp(state.stats.homePossession, 25, 75),
  };

  const result: MatchResult = {
    homeGoals: state.homeGoals,
    awayGoals: state.awayGoals,
    events,
    stats,
    goalDetails: state.goalDetails,
  };

  const withRatings = calculatePlayerMatchRatings(homeTeam, awayTeam, result);
  return withRatings;
}
