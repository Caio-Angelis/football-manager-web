// Motor de Partida — Cálculo de força, simulação e ratings

import type { Team, Match, MatchEvent, MatchStats, PlayerMatchRating, Player, MatchAction, LiveMatchState, HeatMapZone, TacticalInsight, AssistantAdvice, PostMatchReport, SetPiecesConfig } from '../../types/game';
import { calculateMatchPrizeMoney } from './finance';
import { generateInjuryForPlayer } from './injury';
import { isV2 } from './engineFlag';
import { simulateTickV2, resetPhaseState } from './phases';

// Re-export de símbolos da Fase 1 (roles.ts) — o spec TDD procura por effectiveStrength em matchEngine.ts
export { effectiveStrength, positionFamiliarity, ROLE_WEIGHTS, FORMATION_LAYOUT } from './roles';
export type { SlotCoord, AttrKey, RoleWeightMap } from './roles';

// Re-export de símbolos da Fase 2 (zones.ts)
export { ballToZone, computeZoneOccupancy, occupantsInZone, resolveDuel, pickZoneDefender, computeOverloadMod, resetDuelLog, logDuel, getDuelLog, duelStatsByPlayer } from './zones';
export type { ZoneId, ZoneThird, ZoneFlank, ZoneOccupant, DuelResult, DuelTracker } from './zones';

// Re-export de símbolos da Fase 3 (phases.ts)
export { determinePhase, calculateXG, simulateTickV2, resetPhaseState, transitionTicksForLoss, transitionMentalityExposure, lowBlockCompactness, possessionHunger } from './phases';

// Re-export de símbolos da Fase 5 (instructions.ts)
export { relationalModifier, v2TacticalModifier, mentalityRiskShift, effectiveDuty, mentalityActionMod, deriveActiveInstruction } from './instructions';
export type { RelationalMatchup } from './instructions';

// Re-export de símbolos da Fase 6 (dynamicState.ts)
export { fatigueProductionMod, combinedSwing, homeAdvantageMod, awayDisadvantageMod } from './dynamicState';

// Re-export de símbolos da Fase 7 (setPiecesV2.ts)
export { simulateCornerV2, simulateFreeKickV2, simulatePenaltyV2, foulChanceFromDuel, cardChanceFromFoul, reorganizeAfterRedCard } from './setPiecesV2';

// Re-export de símbolos da Fase 8 (aiManagerV2.ts)
export { evaluateSetupCoherence, buildCoherentSetup, counterTactic, gameManagementAdjust, aiSubstitutionDecisionV2, aiDecisionQuality, aiPreMatchSetup, aiInMatchAdjust } from './aiManagerV2';

// Re-export de símbolos da Fase 10 (postMatchReportV2.ts)
export { summarizeDuelsByZone, generateDuelInsights, summarizeChancesByOrigin, generateAssistantAdviceV2 } from './postMatchReportV2';
export type { ZoneDuelSummary, ChanceOriginSummary } from './postMatchReportV2';

// ============================================================
// PRNG DETERMINÍSTICA — mulberry32 (replay, testes, online seguro)
// ============================================================

export type Rng = () => number;

export function mulberry32(seed: number): Rng & { state: () => number } {
  let a = seed >>> 0;
  const rng = (() => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rng & { state: () => number };
  rng.state = () => a;
  return rng;
}

// RNG ativa do motor — substitui Math.random() em toda a simulação de partida
let _matchRng: Rng = Math.random;

// ============================================================
// CÁLCULO DE FORÇA DO TIME
// ============================================================

// C10: Helper para proteger contra atributos undefined/null/NaN
function attr(value: number | undefined | null, fallback = 10): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function getTacticalBonus(team: Team): number {
  let bonus = 0;
  if (team.tactic === 'attacking') bonus += 0.04;
  if (team.tactic === 'defensive') bonus += 0.08;
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
  const starting11 = startingXI(team);
  let totalStrength = 0;

  starting11.forEach(player => {
    let sum = 0;
    let count = 0;

    if (player.technical) {
      [player.technical.passing, player.technical.technique, player.technical.finishing,
        player.technical.dribbling, player.technical.crossing].forEach(v => {
        if (typeof v === 'number' && Number.isFinite(v)) { sum += v * 4; count++; }
      });
    }
    if (player.mental) {
      [player.mental.vision, player.mental.decisions, player.mental.composure,
        player.mental.anticipation, player.mental.positioning].forEach(v => {
        if (typeof v === 'number' && Number.isFinite(v)) { sum += v * 5; count++; }
      });
    }
    if (player.physical) {
      [player.physical.speed, player.physical.stamina, player.physical.strength,
        player.physical.agility, player.physical.acceleration].forEach(v => {
        if (typeof v === 'number' && Number.isFinite(v)) { sum += v * 3; count++; }
      });
    }

    const ca = attr(player.currentAbility, 50);
    const form = attr(player.form, 50);
    const fitness = attr(player.fitness, 50);
    const playerStrength = (ca * 0.6 + (sum / Math.max(count, 1)) * 5.5) * 1.2;
    totalStrength += playerStrength * (form / 100) * (fitness / 100) * getMoraleFactor(player);
  });

  const result = (totalStrength / Math.max(starting11.length, 1)) * (1 + getTacticalBonus(team));
  if (!Number.isFinite(result)) {
    console.warn(`[calculateTeamStrength] NaN detected for team ${team.id} (${team.name}). Using fallback 50.`);
    return 50;
  }
  return result;
}

export function getPossessionBias(home: Team, away: Team): number {
  const homePass = startingXI(home).reduce((s, p) => s + (p.technical?.passing ?? 10), 0);
  const awayPass = startingXI(away).reduce((s, p) => s + (p.technical?.passing ?? 10), 0);
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

// E-18: Rastreia jogadores expulsos durante a simulação atual.
let _matchSentOff: Set<string> = new Set();
let _matchInjured: Set<string> = new Set();

function startingXI(team: Team): Player[] {
  const ids = team.startingXI;
  if (ids && ids.length > 0) {
    const players = ids.map(id => team.squad.find(p => p.id === id)).filter(Boolean) as Player[];
    if (players.length > 0) {
      // E-18: Filtrar jogadores expulsos.
      const filtered = players.filter(p => !_matchSentOff.has(p.id) && !_matchInjured.has(p.id));
      if (filtered.length > 0) return filtered;
    }
  }
  return team.squad.slice(0, 11).filter(p => !_matchSentOff.has(p.id) && !_matchInjured.has(p.id));
}

// ============================================================
// EFEITOS DA MORAL NO MOTOR DE SIMULAÇÃO
// Moral baixa reduz atributos mentais (Compostura, Decisões, etc.)
// Moral alta dá bônus de desempenho — peso letal no resultado
// ============================================================

// Converte moral (0-100) em multiplicador de desempenho
// 50 = neutro (1.0), 0 = 0.75 (penalidade severa), 100 = 1.20 (bônus)
function getMoraleFactor(player: Player): number {
  const morale = player.morale ?? 50;
  return clamp(1.0 + ((morale - 50) / 50) * 0.25, 0.75, 1.20);
}

// Coesão do time baseada em moral + dinâmica social
// Capitão insatisfeito arrasta o grupo; grupos sociais infelzes penalizam o time
function getTeamMoraleCohesion(team: Team): number {
  const xi = startingXI(team);
  if (xi.length === 0) return 1.0;

  const avgMorale = xi.reduce((s, p) => s + (p.morale ?? 50), 0) / xi.length;
  let cohesion = 1.0 + ((avgMorale - 50) / 50) * 0.10;

  // Peso letal do capitão: maior liderança no XI
  const captain = xi.reduce((best, p) =>
    (p.mental?.leadership ?? 0) > (best.mental?.leadership ?? 0) ? p : best, xi[0]);

  if ((captain.morale ?? 50) < 40) {
    cohesion -= 0.08;
    // Cascata: aliados do capitão no XI com moral baixa amplificam
    const unhappyAllies = xi.filter(p =>
      p.id !== captain.id &&
      captain.teamMates?.includes(p.id) &&
      (p.morale ?? 50) < 50,
    ).length;
    cohesion -= unhappyAllies * 0.02;
  }

  // Grupo social infeliz: 2+ titulares do mesmo grupo com média < 40
  const groupMorale = new Map<string, { total: number; count: number }>();
  xi.forEach(p => {
    const group = p.socialGroup;
    if (group) {
      const cur = groupMorale.get(group) ?? { total: 0, count: 0 };
      groupMorale.set(group, { total: cur.total + (p.morale ?? 50), count: cur.count + 1 });
    }
  });
  groupMorale.forEach(({ total, count }) => {
    if (count >= 2 && total / count < 40) {
      cohesion -= 0.05;
    }
  });

  return clamp(cohesion, 0.75, 1.15);
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
    const cond = ((p.form ?? 70) / 100) * ((p.fitness ?? 90) / 100) * getMoraleFactor(p);
    const w = ATTACK_WEIGHT[p.position] ?? 1;
    sum += attackQuality(p) * w * cond;
    weight += w;
  });
  const base = sum / Math.max(weight, 1);
  // E-32: balanced deve ser neutro (1.0), nao 0.88 igual ao defensive.
  const tacticAttackMult =
    team.tactic === 'attacking' ? 1.12 :
    team.tactic === 'defensive' ? 0.88 : 1.0;
  return base * tacticAttackMult * (1 + getTacticalBonus(team) * 0.3) * getTeamMoraleCohesion(team);
}

// Força defensiva do time, ponderada por posição, forma e condição
function teamDefense(team: Team): number {
  const xi = startingXI(team);
  let sum = 0;
  let weight = 0;
  xi.forEach(p => {
    const cond = ((p.form ?? 70) / 100) * ((p.fitness ?? 90) / 100) * getMoraleFactor(p);
    const w = DEFENSE_WEIGHT[p.position] ?? 1;
    sum += defenseQuality(p) * w * cond;
    weight += w;
  });
  const base = sum / Math.max(weight, 1);
  // E-32: balanced deve ser neutro (1.0), nao 0.88.
  const tacticDefenseMult =
    team.tactic === 'attacking' ? 0.85 :
    team.tactic === 'defensive' ? 1.20 : 1.0;
  return base * tacticDefenseMult * (1 + getTacticalBonus(team) * 0.2) * getTeamMoraleCohesion(team);
}

// Amostra de uma distribuição de Poisson (número de gols)
function poissonSample(lambda: number): number {
  if (lambda <= 0) return 0;
  // Knuth's algorithm — returns k where P(X=k) is maximized
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k++; p *= _matchRng(); } while (p > L);
  return Math.min(k - 1, 10);
}

// Escolha ponderada de um item
function weightedPick<T>(items: T[], weights: number[]): T | undefined {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0 || items.length === 0) return items[0];
  let r = _matchRng() * total;
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

export function simulateMatchResult(homeTeam: Team, awayTeam: Team, homeBoost = 0, awayBoost = 0, seed?: number): MatchResult {
  if (seed !== undefined) {
    _matchRng = mulberry32(seed);
  } else {
    _matchRng = Math.random;
  }
  const HOME_ADVANTAGE = 1.12;
  // Calibrado contra o tick engine (simulateFullMatch) que produz ~2.85 gols/jogo.
  // Medido empiricamente: BASE_GOALS=2.2 → 4.88 gols; ratio 2.85/4.88 ≈ 0.58 → 1.28.
  // Ajustado iterativamente para 1.20 após runs de calibração (ver predictionCalibration.test.ts).
  const BASE_GOALS = 1.20;

  const homeAtt = teamAttack(homeTeam) * (1 + homeBoost);
  const awayAtt = teamAttack(awayTeam) * (1 + awayBoost);
  const homeDef = Math.max(1, teamDefense(homeTeam));
  const awayDef = Math.max(1, teamDefense(awayTeam));

  // Bônus de bolas paradas (set pieces)
  const homeSP = setPieceStrength(homeTeam);
  const awaySP = setPieceStrength(awayTeam);
  const homeSPBonus = clamp(homeSP.attack - awaySP.defense, -0.15, 0.25);
  const awaySPBonus = clamp(awaySP.attack - homeSP.defense, -0.15, 0.25);

  // Gols esperados: força ofensiva relativa à defesa adversária + bolas paradas
  const homeLambda = clamp(BASE_GOALS * Math.pow(homeAtt / awayDef, 1.15) * HOME_ADVANTAGE + homeSPBonus, 0.2, 5.0);
  const awayLambda = clamp(BASE_GOALS * Math.pow(awayAtt / homeDef, 1.15) + awaySPBonus, 0.15, 4.5);

  const homeGoals = poissonSample(homeLambda);
  const awayGoals = poissonSample(awayLambda);

  // Detalhes dos gols (autor + assistência) e minutos
  const goalDetails: GoalDetail[] = [];
  const buildGoals = (team: Team, count: number, side: 'home' | 'away') => {
    for (let i = 0; i < count; i++) {
      const minute = 1 + Math.floor(_matchRng() * 90);
      const scorer = pickScorer(team);
      const assister = _matchRng() < 0.62 ? pickAssister(team, scorer?.id) : undefined;
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
  const homeShotsOnTarget = homeGoals + Math.round(homeLambda * (0.7 + _matchRng() * 0.9));
  const awayShotsOnTarget = awayGoals + Math.round(awayLambda * (0.7 + _matchRng() * 0.9));
  const homeShots = homeShotsOnTarget + Math.round(homeLambda * 2 + _matchRng() * 5);
  const awayShots = awayShotsOnTarget + Math.round(awayLambda * 2 + _matchRng() * 5);
  const homePasses = Math.round(homePossession * (360 + _matchRng() * 160));
  const awayPasses = Math.round((1 - homePossession) * (360 + _matchRng() * 160));

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
    events.push({ minute: 1 + Math.floor(_matchRng() * 90), type: 'save', team: 'away', description: 'Boa defesa do guarda-redes!' });
  }
  for (let i = 0; i < awaySaves; i++) {
    events.push({ minute: 1 + Math.floor(_matchRng() * 90), type: 'save', team: 'home', description: 'Boa defesa do guarda-redes!' });
  }

  // Escanteios e faltas para enriquecer a narrativa
  const corners = Math.round((homeShots + awayShots) / 4);
  for (let i = 0; i < corners; i++) {
    events.push({ minute: 1 + Math.floor(_matchRng() * 90), type: 'corner', team: _matchRng() < homePossession ? 'home' : 'away', description: 'Escanteio' });
  }
  const fouls = 6 + Math.floor(_matchRng() * 9);
  for (let i = 0; i < fouls; i++) {
    events.push({ minute: 1 + Math.floor(_matchRng() * 90), type: 'foul', team: _matchRng() < 0.5 ? 'home' : 'away', description: 'Falta' });
  }

  events.sort((a, b) => a.minute - b.minute);

  const stats: MatchStats = {
    homeXG: Math.round((homeGoals * 0.65 + homeShotsOnTarget * 0.22 + _matchRng() * 0.3) * 100) / 100,
    awayXG: Math.round((awayGoals * 0.65 + awayShotsOnTarget * 0.22 + _matchRng() * 0.3) * 100) / 100,
    homePossession: Math.round(homePossession * 100),
    awayPossession: 100 - Math.round(homePossession * 100),
    homeShots,
    awayShots,
    homeShotsOnTarget,
    awayShotsOnTarget,
    homePasses,
    awayPasses,
    homePassAccuracy: Math.round(72 + _matchRng() * 18),
    awayPassAccuracy: Math.round(72 + _matchRng() * 18),
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

      // E-18: Limitar minutesPlayed para jogadores expulsos.
      const sentOffMinute = result.events.find(e => e.type === 'red' && e.player === player.name)?.minute;
      const minutesPlayed = sentOffMinute ?? 90;

      // Estatísticas cosméticas coerentes com a posição
      const rnd = (min: number, max: number) => min + Math.floor(_matchRng() * (max - min + 1));
      const shots = goals + (isFWD ? rnd(0, 4) : isMID ? rnd(0, 2) : isDEF ? rnd(0, 1) : 0);
      const shotsOnTarget = Math.min(shots, goals + (shots > goals && _matchRng() < 0.5 ? 1 : 0));
      const passes = isMID ? rnd(45, 85) : isDEF ? rnd(35, 70) : isGK ? rnd(15, 38) : rnd(22, 55);
      const passingAttr = player.technical?.passing ?? 10;
      const passAccuracy = clamp(Math.round(60 + (passingAttr - 10) * 1.6 + (_matchRng() * 12 - 4)), 55, 96);
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
      rating += ((player.morale ?? 50) - 50) * 0.008;
      rating += (_matchRng() - 0.5) * 0.5;

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
        minutesPlayed,
        isStarted: player.squadStatus !== 'Young Talent',
      });
    });
  };

  rateTeam(homeTeam, 'home');
  rateTeam(awayTeam, 'away');

  const bestPlayer = ratings.reduce((best, r) => (r.rating > best.rating ? r : best), ratings[0]);

  return { ...result, playerRatings: ratings, bestPlayer: bestPlayer?.playerId };
}

// ============================================================
// RELATÓRIO PÓS-JOGO — Análise tática, mapa de calor, conselhos
// ============================================================

const ZONE_DEFS: { label: string; third: 'defensive' | 'middle' | 'attacking'; flank: 'left' | 'center' | 'right' }[] = [
  { label: 'Defesa-Esq', third: 'defensive', flank: 'left' },
  { label: 'Defesa-Centro', third: 'defensive', flank: 'center' },
  { label: 'Defesa-Dir', third: 'defensive', flank: 'right' },
  { label: 'Meio-Esq', third: 'middle', flank: 'left' },
  { label: 'Meio-Centro', third: 'middle', flank: 'center' },
  { label: 'Meio-Dir', third: 'middle', flank: 'right' },
  { label: 'Ataque-Esq', third: 'attacking', flank: 'left' },
  { label: 'Ataque-Centro', third: 'attacking', flank: 'center' },
  { label: 'Ataque-Dir', third: 'attacking', flank: 'right' },
];

function distributeFlank(team: Team): number {
  const r = _matchRng();
  if (team.useFlank === 'left') return r < 0.50 ? 0 : r < 0.80 ? 1 : 2;
  if (team.useFlank === 'right') return r < 0.50 ? 2 : r < 0.80 ? 1 : 0;
  if (team.attackWidth === 'narrow') return r < 0.60 ? 1 : r < 0.80 ? 0 : 2;
  if (team.attackWidth === 'wide') return r < 0.35 ? 1 : r < 0.68 ? 0 : 2;
  return r < 0.40 ? 1 : r < 0.70 ? 0 : 2;
}

export function generatePostMatchReport(
  homeTeam: Team,
  awayTeam: Team,
  result: MatchResult,
  actions?: MatchAction[],
): PostMatchReport {
  const stats = result.stats;
  const homeWon = result.homeGoals > result.awayGoals;
  const awayWon = result.awayGoals > result.homeGoals;
  const draw = !homeWon && !awayWon;

  // === MAPA DE CALOR ===
  const homeZones = new Array(9).fill(0);
  const awayZones = new Array(9).fill(0);

  if (actions && actions.length > 0) {
    for (const a of actions) {
      const isHome = a.team === 'home';
      const bp = a.ballPos;
      const team = isHome ? homeTeam : awayTeam;

      // Terço: para casa, bp alto = ataque; para fora, bp baixo = ataque
      let thirdIdx: number;
      if (isHome) {
        thirdIdx = bp < 0.33 ? 0 : bp < 0.66 ? 1 : 2;
      } else {
        thirdIdx = bp > 0.66 ? 0 : bp > 0.33 ? 1 : 2;
      }

      const flankIdx = distributeFlank(team);
      const zoneIdx = thirdIdx * 3 + flankIdx;
      if (isHome) homeZones[zoneIdx]++;
      else awayZones[zoneIdx]++;
    }
  } else {
    // Fallback: distribui proporcionalmente à posse e estilo
    const homeAttBias = stats.homePossession / 100;
    const awayAttBias = stats.awayPossession / 100;
    for (let i = 0; i < 9; i++) {
      const third = Math.floor(i / 3);
      const base = 10 + _matchRng() * 15;
      homeZones[i] = Math.round(base * (third === 2 ? homeAttBias : third === 0 ? 1 - homeAttBias : 1));
      awayZones[i] = Math.round(base * (third === 0 ? awayAttBias : third === 2 ? 1 - awayAttBias : 1));
    }
  }

  const maxHome = Math.max(...homeZones, 1);
  const maxAway = Math.max(...awayZones, 1);

  const heatMapHome: HeatMapZone[] = ZONE_DEFS.map((z, i) => ({
    label: z.label,
    third: z.third,
    flank: z.flank,
    actions: homeZones[i],
    intensity: homeZones[i] / maxHome,
  }));

  const heatMapAway: HeatMapZone[] = ZONE_DEFS.map((z, i) => ({
    label: z.label,
    third: z.third,
    flank: z.flank,
    actions: awayZones[i],
    intensity: awayZones[i] / maxAway,
  }));

  // === PASS BREAKDOWN ===
  let homeSuccessful = 0, homeFailed = 0, awaySuccessful = 0, awayFailed = 0;
  if (actions && actions.length > 0) {
    // Cada lance de passe representa uma troca curta de 2 passes (mesmo peso do motor)
    for (const a of actions) {
      if (a.type === 'pass') {
        if (a.team === 'home') {
          if (a.success) homeSuccessful += 2; else homeFailed += 2;
        } else {
          if (a.success) awaySuccessful += 2; else awayFailed += 2;
        }
      }
    }
  } else {
    homeSuccessful = Math.round(stats.homePasses * stats.homePassAccuracy / 100);
    homeFailed = stats.homePasses - homeSuccessful;
    awaySuccessful = Math.round(stats.awayPasses * stats.awayPassAccuracy / 100);
    awayFailed = stats.awayPasses - awaySuccessful;
  }

  // === ATTACK ZONES (left/center/right no terço de ataque) ===
  const hAtt = { left: 0, center: 0, right: 0 };
  const aAtt = { left: 0, center: 0, right: 0 };
  heatMapHome.forEach(z => { if (z.third === 'attacking') hAtt[z.flank] += z.actions; });
  heatMapAway.forEach(z => { if (z.third === 'attacking') aAtt[z.flank] += z.actions; });
  const hTotal = hAtt.left + hAtt.center + hAtt.right || 1;
  const aTotal = aAtt.left + aAtt.center + aAtt.right || 1;
  const attackZones = {
    home: {
      left: Math.round(hAtt.left / hTotal * 100),
      center: Math.round(hAtt.center / hTotal * 100),
      right: Math.round(hAtt.right / hTotal * 100),
    },
    away: {
      left: Math.round(aAtt.left / aTotal * 100),
      center: Math.round(aAtt.center / aTotal * 100),
      right: Math.round(aAtt.right / aTotal * 100),
    },
  };

  // === INSIGHTS TÁTICOS ===
  const insights: TacticalInsight[] = [];
  const homePassTotal = homeSuccessful + homeFailed;
  const awayPassTotal = awaySuccessful + awayFailed;
  const homePassErr = homePassTotal > 0 ? homeFailed / homePassTotal : 0;
  const awayPassErr = awayPassTotal > 0 ? awayFailed / awayPassTotal : 0;

  // Posse vs resultado
  if (stats.homePossession >= 60 && !homeWon) {
    insights.push({
      category: 'negative',
      icon: '⚠️',
      title: 'Posse sem efetividade',
      description: `${homeTeam.name} dominou a posse (${stats.homePossession}%) mas ${homeWon ? 'não venceu' : draw ? 'empatou' : 'perdeu'}. Muita circulação de bola sem penetração no terço final.`,
    });
  }
  if (stats.awayPossession >= 60 && !awayWon) {
    insights.push({
      category: 'negative',
      icon: '⚠️',
      title: 'Posse sem efetividade',
      description: `${awayTeam.name} dominou a posse (${stats.awayPossession}%) mas não converteu em resultado. Controle de bola estéril no meio-campo.`,
    });
  }

  // Estilo de passe vs erros
  if (homeTeam.passingStyle === 'direct' && homePassErr > 0.25) {
    insights.push({
      category: 'negative',
      icon: '🎯',
      title: 'Passes diretos geraram perdas',
      description: `O estilo de passe "Direto" do ${homeTeam.name} resultou em ${homeFailed} passes errados (${Math.round(homePassErr * 100)}% de erro). Bolas longas foram interceptadas pela defesa adversária no terço final.`,
    });
  }
  if (awayTeam.passingStyle === 'direct' && awayPassErr > 0.25) {
    insights.push({
      category: 'negative',
      icon: '🎯',
      title: 'Passes diretos geraram perdas',
      description: `O estilo de passe "Direto" do ${awayTeam.name} resultou em ${awayFailed} passes errados (${Math.round(awayPassErr * 100)}% de erro). Bolas longas perdidas no terço final.`,
    });
  }
  if (homeTeam.passingStyle === 'short' && homePassErr < 0.15 && homePassTotal > 50) {
    insights.push({
      category: 'positive',
      icon: '🔹',
      title: 'Passe curto preciso',
      description: `O ${homeTeam.name} completou ${homeSuccessful} passes com ${Math.round((1 - homePassErr) * 100)}% de precisão. O estilo de passe curto funcionou bem para manter a posse.`,
    });
  }
  if (awayTeam.passingStyle === 'short' && awayPassErr < 0.15 && awayPassTotal > 50) {
    insights.push({
      category: 'positive',
      icon: '🔹',
      title: 'Passe curto preciso',
      description: `O ${awayTeam.name} completou ${awaySuccessful} passes com ${Math.round((1 - awayPassErr) * 100)}% de precisão. Circulação de bola eficaz.`,
    });
  }

  // Linha de engajamento
  if (homeTeam.engagementLine === 'high' && stats.awayShots > stats.homeShots) {
    insights.push({
      category: 'negative',
      icon: '⬆️',
      title: 'Linha alta deixou espaço',
      description: `A linha de engajamento alta do ${homeTeam.name} permitiu ${stats.awayShots} chutes do adversário. O press alto não recuperou a bola a tempo e o time ficou exposto nas costas.`,
    });
  }
  if (awayTeam.engagementLine === 'high' && stats.homeShots > stats.awayShots) {
    insights.push({
      category: 'negative',
      icon: '⬆️',
      title: 'Linha alta deixou espaço',
      description: `A linha de engajamento alta do ${awayTeam.name} permitiu ${stats.homeShots} chutes do adversário. Pressão alta foi batida por lançamentos longos.`,
    });
  }
  if (homeTeam.engagementLine === 'low' && stats.homePossession < 45) {
    insights.push({
      category: 'neutral',
      icon: '⬇️',
      title: 'Bloco baixo e contido',
      description: `${homeTeam.name} jogou com linha de engajamento baixa, cedendo a posse (${stats.homePossession}%) e esperando o adversário. Estratégia defensiva que ${homeWon ? 'funcionou' : 'não foi suficiente'}.`,
    });
  }

  // Contra-ataque
  if (homeTeam.afterGainingPossession === 'counterAttack' && homeWon) {
    insights.push({
      category: 'positive',
      icon: '🚀',
      title: 'Contra-ataque letal',
      description: `A estratégia de contra-ataque do ${homeTeam.name} foi decisiva. Recuperou a bola e criou ${stats.homeShots} oportunidades com transições rápidas.`,
    });
  }
  if (awayTeam.afterGainingPossession === 'counterAttack' && awayWon) {
    insights.push({
      category: 'positive',
      icon: '🚀',
      title: 'Contra-ataque letal',
      description: `O ${awayTeam.name} venceu com contra-ataques eficientes. ${stats.awayShots} chutes criados a partir de transições rápidas pós-recuperação.`,
    });
  }

  // xG vs gols
  const homeOverperform = result.homeGoals - stats.homeXG;
  const awayOverperform = result.awayGoals - stats.awayXG;
  if (homeOverperform > 0.8) {
    insights.push({
      category: 'positive',
      icon: '📈',
      title: 'Finalização acima do esperado',
      description: `${homeTeam.name} marcou ${result.homeGoals} gols com xG de apenas ${stats.homeXG.toFixed(2)}. Aproveitamento excepcional das chances criadas.`,
    });
  }
  if (awayOverperform > 0.8) {
    insights.push({
      category: 'positive',
      icon: '📈',
      title: 'Finalização acima do esperado',
      description: `${awayTeam.name} marcou ${result.awayGoals} gols com xG de apenas ${stats.awayXG.toFixed(2)}. Eficiência clínica na finalização.`,
    });
  }
  if (homeOverperform < -0.8) {
    insights.push({
      category: 'negative',
      icon: '📉',
      title: 'Gols esperados não convertidos',
      description: `${homeTeam.name} criou chances suficientes para ${stats.homeXG.toFixed(2)} gols mas marcou apenas ${result.homeGoals}. Falta de frieza na finalização.`,
    });
  }
  if (awayOverperform < -0.8) {
    insights.push({
      category: 'negative',
      icon: '📉',
      title: 'Gols esperados não convertidos',
      description: `${awayTeam.name} teve xG de ${stats.awayXG.toFixed(2)} mas marcou só ${result.awayGoals}. Chutes no alvo não suficientes para vencer o goleiro.`,
    });
  }

  // Conversão de chutes
  const homeConv = stats.homeShots > 0 ? result.homeGoals / stats.homeShots : 0;
  const awayConv = stats.awayShots > 0 ? result.awayGoals / stats.awayShots : 0;
  if (stats.homeShots > 12 && homeConv < 0.08) {
    insights.push({
      category: 'negative',
      icon: '👟',
      title: 'Muitos chutes, poucos gols',
      description: `${homeTeam.name} teve ${stats.homeShots} chutes mas converteu apenas ${result.homeGoals}. Baixa precisão ofensiva — apenas ${stats.homeShotsOnTarget} no alvo.`,
    });
  }
  if (stats.awayShots > 12 && awayConv < 0.08) {
    insights.push({
      category: 'negative',
      icon: '👟',
      title: 'Muitos chutes, poucos gols',
      description: `${awayTeam.name} teve ${stats.awayShots} chutes mas converteu apenas ${result.awayGoals}. Apenas ${stats.awayShotsOnTarget} no alvo — finalização improdutiva.`,
    });
  }

  // Pressão alta
  if (homeTeam.pressIntensity === 'high' && homeWon) {
    const homeTackles = actions?.filter(a => a.team === 'home' && a.type === 'tackle' && a.success).length ?? 0;
    if (homeTackles > 5) {
      insights.push({
        category: 'positive',
        icon: '🔥',
        title: 'Pressão alta efetiva',
        description: `A pressão alta do ${homeTeam.name} recuperou a bola frequentemente (${homeTackles} desarmes bem-sucedidos). O adversário não conseguiu sair jogando.`,
      });
    }
  }

  // Zonas de ataque
  const hDominantFlank = attackZones.home.left > attackZones.home.right ? 'esquerda' : attackZones.home.right > attackZones.home.left ? 'direita' : 'ambas as pontas';
  if (attackZones.home.center > 50) {
    insights.push({
      category: 'neutral',
      icon: '📐',
      title: 'Ataque centralizado',
      description: `${homeTeam.name} atacou ${attackZones.home.center}% pelo centro. ${hDominantFlank === 'ambas as pontas' ? 'Pouca variação pelas pontas.' : `Pouca exploração pela ${hDominantFlank}.`}`,
    });
  } else if (Math.abs(attackZones.home.left - attackZones.home.right) > 25) {
    const side = attackZones.home.left > attackZones.home.right ? 'esquerda' : 'direita';
    insights.push({
      category: 'neutral',
      icon: '📐',
      title: `Ataque concentrado pela ${side}`,
      description: `${homeTeam.name} atacou ${Math.max(attackZones.home.left, attackZones.home.right)}% pela ${side}. O adversário pode fechar esse corredor no próximo jogo.`,
    });
  }

  // Defesa
  if (result.awayGoals === 0 && homeWon) {
    insights.push({
      category: 'positive',
      icon: '🛡️',
      title: 'Defesa sólida',
      description: `${homeTeam.name} manteve os zeros e não sofreu gols. ${homeTeam.defensiveLine === 'low' ? 'Bloco baixo e compacto dificultou a aproximação.' : 'Organização defensiva eficaz.'}`,
    });
  }
  if (result.homeGoals === 0 && awayWon) {
    insights.push({
      category: 'positive',
      icon: '🛡️',
      title: 'Defesa sólida',
      description: `${awayTeam.name} não sofreu gols. ${awayTeam.defensiveLine === 'low' ? 'Bloco baixo e compacto anulou o ataque adversário.' : 'Marcação organizada e segura.'}`,
    });
  }

  // === CONSELHOS DO ASSISTENTE ===
  const assistantComments: AssistantAdvice[] = [];

  // Aconselhamento baseado em erros de passe
  if (homePassErr > 0.25) {
    if (homeTeam.passingStyle === 'direct') {
      assistantComments.push({
        type: 'tactical',
        message: `O estilo de passe direto gerou ${Math.round(homePassErr * 100)}% de erros. Considere mudar para "Misto" ou "Curto" contra times que pressionam alto.`,
      });
    } else {
      assistantComments.push({
        type: 'tactical',
        message: `A precisão de passes foi baixa (${Math.round((1 - homePassErr) * 100)}%). Treinar circulação de bola ou reduzir o ritmo pode ajudar.`,
      });
    }
  }
  if (awayPassErr > 0.25) {
    if (awayTeam.passingStyle === 'direct') {
      assistantComments.push({
        type: 'tactical',
        message: `O ${awayTeam.name} errou muitos passes com estilo direto (${Math.round(awayPassErr * 100)}%). Recomendo ajustar para "Misto" na próxima partida.`,
      });
    }
  }

  // Aconselhamento sobre linha de engajamento
  if (homeTeam.engagementLine === 'high' && stats.awayShotsOnTarget > 5) {
    assistantComments.push({
      type: 'tactical',
      message: `A linha de engajamento alta permitiu ${stats.awayShotsOnTarget} chutes no alvo do adversário. Contra times rápidos, considere recuar a linha para "Média".`,
    });
  }
  if (homeTeam.engagementLine === 'low' && stats.homePossession < 40) {
    assistantComments.push({
      type: 'tactical',
      message: `Com linha baixa, o time teve apenas ${stats.homePossession}% de posse. Se o objetivo é vencer, experimente subir a linha de engajamento para pressionar mais alto.`,
    });
  }

  // Aconselhamento sobre finalização
  if (stats.homeShots > 10 && stats.homeShotsOnTarget < stats.homeShots * 0.3) {
    assistantComments.push({
      type: 'tactical',
      message: `Apenas ${stats.homeShotsOnTarget} de ${stats.homeShots} chutes foram no alvo. Trabalhar finalização ou criar chances mais claras (levar a bola à área) pode melhorar o aproveitamento.`,
    });
  }

  // Aconselhamento sobre flancos
  if (attackZones.home.center > 55) {
    assistantComments.push({
      type: 'tactical',
      message: `O time atacou ${attackZones.home.center}% pelo centro. Usar as pontas (${attackZones.home.left}% esq, ${attackZones.home.right}% dir) pode criar mais espaços e dificultar a marcação adversária.`,
    });
  }

  // Aconselhamento sobre contra-pressão
  if (homeTeam.afterLosingPossession === 'regroup' && stats.homePossession < 45) {
    assistantComments.push({
      type: 'tactical',
      message: `O time recuou após perder a posse e teve apenas ${stats.homePossession}% de bola. Contra-pressionar pode recuperar a bola mais rápido e aumentar a posse.`,
    });
  }

  // Aconselhamento sobre tempo
  if (homeTeam.tempo === 'fast' && homePassErr > 0.20) {
    assistantComments.push({
      type: 'tactical',
      message: `O ritmo rápido causou ${homeFailed} passes errados. Reduzir para "Equilibrado" pode melhorar a precisão sem perder muita intensidade.`,
    });
  }

  // === RESUMO ===
  let summary: string;
  const winner = homeWon ? homeTeam : awayWon ? awayTeam : null;
  const loser = homeWon ? awayTeam : awayWon ? homeTeam : null;
  const winnerGoals = homeWon ? result.homeGoals : awayWon ? result.awayGoals : result.homeGoals;
  const loserGoals = homeWon ? result.awayGoals : awayWon ? result.homeGoals : result.awayGoals;

  if (draw) {
    summary = `Empate em ${result.homeGoals}-${result.awayGoals}. `;
    if (stats.homePossession > stats.awayPossession) {
      summary += `${homeTeam.name} teve mais posse (${stats.homePossession}%) mas não conseguiu superar o ${awayTeam.name}. `;
    } else {
      summary += `${awayTeam.name} teve mais posse (${stats.awayPossession}%) mas o ${homeTeam.name} equilibrou as ações. `;
    }
    summary += `xG: ${stats.homeXG.toFixed(2)} vs ${stats.awayXG.toFixed(2)}.`;
  } else {
    summary = `${winner!.name} venceu por ${winnerGoals}-${loserGoals}. `;
    if (winner === homeTeam) {
      if (stats.homePossession > 55) {
        summary += `Dominou a posse (${stats.homePossession}%) e criou ${stats.homeShots} chances (xG ${stats.homeXG.toFixed(2)}). `;
      } else if (stats.homePossession < 45) {
        summary += `Vitória com apenas ${stats.homePossession}% de posse — eficiência em contra-ataques. `;
      }
      if (result.awayGoals === 0) summary += `Defesa inviolável. `;
    } else {
      if (stats.awayPossession > 55) {
        summary += `Controlou o jogo fora de casa (${stats.awayPossession}% posse, ${stats.awayShots} chutes). `;
      } else if (stats.awayPossession < 45) {
        summary += `Venceu como visitante com ${stats.awayPossession}% de posse — letal nos contra-ataques. `;
      }
      if (result.homeGoals === 0) summary += `Manteve o zero na defesa. `;
    }
    if (loser && (winnerGoals - loserGoals) >= 2) {
      summary += `Vitória convincente por margem de ${winnerGoals - loserGoals} gols.`;
    }
  }

  return {
    summary,
    heatMapHome,
    heatMapAway,
    insights,
    assistantComments,
    passBreakdown: { homeSuccessful, homeFailed, awaySuccessful, awayFailed },
    attackZones,
  };
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

// Aplica lesões geradas durante a partida aos jogadores no squad do time
export function applyMatchInjuries(
  teams: Team[],
  homeId: string,
  awayId: string,
  matchInjuries: { playerId: string; side: 'home' | 'away' }[],
  currentWeek: number,
): Team[] {
  if (!matchInjuries || matchInjuries.length === 0) return teams;
  const updated = [...teams];
  const homeIdx = updated.findIndex(t => t.id === homeId);
  const awayIdx = updated.findIndex(t => t.id === awayId);

  for (const mi of matchInjuries) {
    const teamIdx = mi.side === 'home' ? homeIdx : awayIdx;
    if (teamIdx === -1) continue;
    const team = { ...updated[teamIdx] };
    const playerIdx = team.squad.findIndex(p => p.id === mi.playerId);
    if (playerIdx === -1) continue;
    const player = team.squad[playerIdx];
    if (player.injury?.active) continue;
    const injuredPlayer = generateInjuryForPlayer(player, 'match', team.facilitiesLevel, team.staffLevel, currentWeek);
    team.squad = [...team.squad];
    team.squad[playerIdx] = injuredPlayer;
    updated[teamIdx] = team;
  }
  return updated;
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

  // Track goals and assists per player for the season
  const goalDetails = result.goalDetails || [];
  const applyPlayerStats = (team: Team, side: 'home' | 'away') => {
    team.squad = team.squad.map(player => {
      let goals = 0;
      let assists = 0;
      goalDetails.forEach(g => {
        if (g.team !== side) return;
        if (g.scorerId === player.id) goals++;
        if (g.assistId === player.id) assists++;
      });
      if (goals === 0 && assists === 0) return player;
      return {
        ...player,
        seasonGoals: (player.seasonGoals ?? 0) + goals,
        seasonAssists: (player.seasonAssists ?? 0) + assists,
      };
    });
  };
  applyPlayerStats(homeTeam, 'home');
  applyPlayerStats(awayTeam, 'away');

  // Atualiza forma recente (últimos 5) para ambos os times — consumida por moral, IA e análise pré-jogo
  const pushForm = (team: Team, r: 'W' | 'D' | 'L') => {
    team.leagueForm = [...(team.leagueForm ?? []), r].slice(-5);
  };

  if (result.homeGoals > result.awayGoals) {
    homeTeam.points += 3;
    homeTeam.won++;
    awayTeam.lost++;
    pushForm(homeTeam, 'W');
    pushForm(awayTeam, 'L');
    homeTeam.budget = parseFloat((homeTeam.budget + calculateMatchPrizeMoney('win', homeTeam.reputation)).toFixed(2));
    awayTeam.budget = parseFloat((awayTeam.budget + calculateMatchPrizeMoney('loss', awayTeam.reputation)).toFixed(2));
  } else if (result.homeGoals < result.awayGoals) {
    awayTeam.points += 3;
    awayTeam.won++;
    homeTeam.lost++;
    pushForm(awayTeam, 'W');
    pushForm(homeTeam, 'L');
    awayTeam.budget = parseFloat((awayTeam.budget + calculateMatchPrizeMoney('win', awayTeam.reputation)).toFixed(2));
    homeTeam.budget = parseFloat((homeTeam.budget + calculateMatchPrizeMoney('loss', homeTeam.reputation)).toFixed(2));
  } else {
    homeTeam.points += 1;
    awayTeam.points += 1;
    homeTeam.drawn++;
    awayTeam.drawn++;
    pushForm(homeTeam, 'D');
    pushForm(awayTeam, 'D');
    homeTeam.budget = parseFloat((homeTeam.budget + calculateMatchPrizeMoney('draw', homeTeam.reputation)).toFixed(2));
    awayTeam.budget = parseFloat((awayTeam.budget + calculateMatchPrizeMoney('draw', awayTeam.reputation)).toFixed(2));
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

  // Base 80% + atributos do passador (até +18%) - pressão (até -25%)
  let prob = 0.80;
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
  prob *= getMoraleFactor(passer);

  return clamp(prob, 0.45, 0.97);
}

// Probabilidade de sucesso de um drible
function dribbleSuccessProb(dribbler: Player, defender: Player, _team: Team): number {
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
  prob *= getMoraleFactor(dribbler);

  return clamp(prob, 0.20, 0.85);
}

// Probabilidade de sucesso de um chute (em gol)
// wide: 0 = centro do gol, 1 = linha lateral (ângulo ruim); fatigue: multiplicador 0-1
// Retorna também o xG real do lance (probabilidade de gol antes do sorteio)
function shotSuccessProb(
  shooter: Player, goalkeeper: Player, distance: number, _team: Team,
  wide = 0, fatigue = 1,
): { onTarget: boolean; goal: boolean; xg: number } {
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
  let onTargetProb = 0.28;
  onTargetProb += (finishing - 10) * 0.015;
  onTargetProb += (technique - 10) * 0.008;
  onTargetProb += (composure - 10) * 0.006;
  onTargetProb += (decisions - 10) * 0.005;
  // Chutes de longa distância são menos precisos
  if (distance > 0.6) {
    onTargetProb += (longShots - 10) * 0.010;
    onTargetProb -= 0.12;
  } else if (distance < 0.25) {
    onTargetProb += 0.10; // na cara do gol
  }
  onTargetProb *= ((shooter.form ?? 70) / 100) * 0.5 + 0.5;
  onTargetProb *= getMoraleFactor(shooter);
  onTargetProb -= wide * 0.10; // ângulo fechado dificulta acertar o alvo
  onTargetProb *= fatigue;

  const onTargetP = clamp(onTargetProb, 0.12, 0.80);

  // Se no alvo, probabilidade de gol (vencer o goleiro)
  // Calibrado para ~2.5-2.9 gols/jogo no motor passo a passo (ver matchEngine.test.ts)
  let goalProb = 0.19;
  goalProb += (finishing - 10) * 0.012;
  goalProb += (composure - 10) * 0.008;
  goalProb += (offBall - 10) * 0.005;
  goalProb -= (reflexes - 10) * 0.010;
  goalProb -= (oneOnOne - 10) * 0.008;
  goalProb -= (positioning - 10) * 0.006;
  goalProb -= (concentration - 10) * 0.004;

  // Chutes de perto são mais difíceis de defender
  if (distance < 0.25) goalProb += 0.12;
  if (distance > 0.6) goalProb -= 0.15;

  goalProb *= ((shooter.form ?? 70) / 100) * 0.5 + 0.5;
  goalProb *= getMoraleFactor(shooter);
  goalProb -= wide * 0.12; // do bico, quase não há gol
  goalProb *= fatigue;

  const goalP = clamp(goalProb, 0.08, 0.85);
  // xG = probabilidade real de gol deste lance (alvo × conversão)
  const xg = Math.round(onTargetP * goalP * 100) / 100;

  const onTarget = _matchRng() < onTargetP;
  if (!onTarget) return { onTarget: false, goal: false, xg };

  const goal = _matchRng() < goalP;
  return { onTarget: true, goal, xg };
}

// Escolhe um jogador do time com posse, favorecendo os mais avançados quando atacando.
// attacksTowardOne: true se o time ataca rumo a ballPos=1 (home), false se rumo a 0 (away).
function pickPlayerWithBall(team: Team, ballPos: number, attacksTowardOne: boolean, excludeId?: string): Player {
  const xi = startingXI(team).filter(p => p.id !== excludeId);
  if (xi.length === 0) return team.squad[0];

  // prog relativo ao ataque do time: 0 = próprio gol, 1 = gol adversário
  const prog = attacksTowardOne ? ballPos : 1 - ballPos;
  const weights = xi.map(p => {
    const pos = p.position;
    // Quando a bola está na defesa, zagueiros e goleiro têm mais chance
    // Quando está no ataque, atacantes e meias têm mais chance
    let w = 1;
    if (pos === 'GK') w = 0.05;
    else if (pos === 'DEF') w = prog < 0.4 ? 3 : prog > 0.7 ? 0.5 : 1.5;
    else if (pos === 'MID') w = 2; // meias sempre envolvidos
    else if (pos === 'FWD') w = prog > 0.5 ? 3 : prog < 0.3 ? 0.8 : 1.5;
    return w;
  });

  return weightedPick(xi, weights) ?? xi[0];
}

// Escolhe um defensor adversário para tentar desarme/interceptação.
// attacksTowardOne: direção de ataque do time DEFENSOR (para localizar seu próprio gol).
function pickDefender(defendingTeam: Team, ballPos: number, attacksTowardOne: boolean): Player {
  const xi = startingXI(defendingTeam);
  // prog relativo ao defensor: 0 = próprio gol do defensor (onde zaga/GK são relevantes)
  const prog = attacksTowardOne ? ballPos : 1 - ballPos;
  const weights = xi.map(p => {
    const pos = p.position;
    let w = 1;
    if (pos === 'GK') w = prog < 0.15 ? 2 : 0.1;
    else if (pos === 'DEF') w = prog < 0.5 ? 3 : 1.5;
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

// ============================================================
// BOLAS PARADAS (Set Pieces) — Simulação
// ============================================================

function defaultSetPiecesConfig(): SetPiecesConfig {
  return {
    corners: { delivery: 'penalty_area', takerId: '', targetId: '' },
    freeKicks: { delivery: 'cross_into_box', takerId: '' },
    throwIns: { style: 'short', takerId: '' },
    penalties: { takerId: '' },
    defensiveCorners: { marking: 'zonal', counterAttack: false },
    defensiveFreeKicks: { marking: 'zonal', wallSize: 'medium' },
  };
}

function getSetPiecesConfig(team: Team): SetPiecesConfig {
  return team.tacticsConfig?.setPieces ?? defaultSetPiecesConfig();
}

function autoSelectCornerTaker(team: Team): Player {
  const xi = startingXI(team).filter(p => p.position !== 'GK');
  if (xi.length === 0) return team.squad[0];
  return xi.reduce((best, p) =>
    (p.technical?.crossing ?? 0) > (best.technical?.crossing ?? 0) ? p : best, xi[0]);
}

function autoSelectCornerTarget(team: Team): Player {
  const xi = startingXI(team);
  if (xi.length === 0) return team.squad[0];
  return xi.reduce((best, p) => {
    const score = (p.technical?.heading ?? 0) + (p.physical?.jumping ?? 0);
    const bestScore = (best.technical?.heading ?? 0) + (best.physical?.jumping ?? 0);
    return score > bestScore ? p : best;
  }, xi[0]);
}

function autoSelectFreeKickTaker(team: Team): Player {
  const xi = startingXI(team).filter(p => p.position !== 'GK');
  if (xi.length === 0) return team.squad[0];
  return xi.reduce((best, p) =>
    (p.technical?.freeKicks ?? 0) > (best.technical?.freeKicks ?? 0) ? p : best, xi[0]);
}

function autoSelectPenaltyTaker(team: Team): Player {
  const xi = startingXI(team).filter(p => p.position !== 'GK');
  if (xi.length === 0) return team.squad[0];
  return xi.reduce((best, p) => {
    const score = (p.technical?.finishing ?? 0) + (p.mental?.composure ?? 0);
    const bestScore = (best.technical?.finishing ?? 0) + (best.mental?.composure ?? 0);
    return score > bestScore ? p : best;
  }, xi[0]);
}

function bestAerialDefender(team: Team): Player {
  const xi = startingXI(team);
  if (xi.length === 0) return team.squad[0];
  return xi.reduce((best, p) => {
    const score = (p.technical?.heading ?? 0) + (p.physical?.jumping ?? 0) + (p.technical?.marking ?? 0);
    const bestScore = (best.technical?.heading ?? 0) + (best.physical?.jumping ?? 0) + (best.technical?.marking ?? 0);
    return score > bestScore ? p : best;
  }, xi[0]);
}

interface SetPieceResult {
  state: LiveMatchState;
  actions: MatchAction[];
  events: MatchEvent[];
}

// Simula cobrança de escanteio
function simulateCornerKick(
  attackingTeam: Team,
  defendingTeam: Team,
  state: LiveMatchState,
  minute: number,
  side: 'home' | 'away',
  ballPos: number,
): SetPieceResult {
  const config = getSetPiecesConfig(attackingTeam);
  const defConfig = getSetPiecesConfig(defendingTeam);
  const xi = startingXI(attackingTeam);
  const defXi = startingXI(defendingTeam);

  const taker = xi.find(p => p.id === config.corners.takerId) ?? autoSelectCornerTaker(attackingTeam);
  const target = xi.find(p => p.id === config.corners.targetId) ?? autoSelectCornerTarget(attackingTeam);
  const goalkeeper = defXi.find(p => p.position === 'GK') ?? defXi[0];
  const bestDef = bestAerialDefender(defendingTeam);

  // Qualidade do cruzamento
  const crossing = taker.technical?.crossing ?? 10;
  const deliveryMods: Record<string, number> = {
    near_post: 1.2, far_post: 0.9, penalty_area: 1.0, short: 1.3, edge_of_box: 0.8,
  };
  const deliveryQuality = (crossing / 20) * deliveryMods[config.corners.delivery];

  // Qualidade do alvo aéreo
  const heading = target.technical?.heading ?? 10;
  const jumping = target.physical?.jumping ?? 10;
  const targetQuality = ((heading + jumping) / 2) / 20;

  // Qualidade defensiva
  const defQuality = ((bestDef.technical?.heading ?? 10) + (bestDef.physical?.jumping ?? 10) + (bestDef.technical?.marking ?? 10)) / 3 / 20;

  // Modificador de marcação defensiva
  const markingMods: Record<string, number> = { man_to_man: 1.15, zonal: 1.0, mixed: 1.08 };
  const markingMod = markingMods[defConfig.defensiveCorners.marking];

  // Goleiro (comando de área + alcance aéreo)
  const gkQuality = ((goalkeeper.goalkeeping?.commandOfArea ?? 10) + (goalkeeper.goalkeeping?.aerialReach ?? 10)) / 2 / 20;

  // Probabilidade de criar chance
  let chanceProb = 0.12;
  chanceProb += deliveryQuality * 0.18;
  chanceProb += targetQuality * 0.22;
  chanceProb -= defQuality * 0.12 * markingMod;
  chanceProb -= gkQuality * 0.08;

  // Tipo de cobrança
  const deliveryChanceMods: Record<string, number> = {
    near_post: 1.15, far_post: 0.85, penalty_area: 1.0, short: 0.6, edge_of_box: 0.9,
  };
  chanceProb *= deliveryChanceMods[config.corners.delivery];

  if (defConfig.defensiveCorners.counterAttack) chanceProb -= 0.03;
  chanceProb = clamp(chanceProb, 0.03, 0.45);

  const actions: MatchAction[] = [];
  const events: MatchEvent[] = [];
  let newState = { ...state };

  events.push({ minute, type: 'corner', team: side, player: taker.name, description: `Escanteio cobrado por ${taker.name}` });
  actions.push({
    minute, type: 'cornerKick', team: side, playerId: taker.id, playerName: taker.name,
    success: _matchRng() < chanceProb,
    description: `${taker.name} cobra o escanteio (${config.corners.delivery.replace(/_/g, ' ')})`, ballPos,
  });

  if (_matchRng() < chanceProb) {
    // Chance criada — cabeceada do alvo
    const shotResult = shotSuccessProb(target, goalkeeper, 0.3, attackingTeam);

    actions.push({
      minute, type: 'header', team: side, playerId: target.id, playerName: target.name,
      success: shotResult.goal,
      description: shotResult.goal
        ? `${target.name} cabeceia para o gol!`
        : shotResult.onTarget
          ? `${target.name} cabeceia no alvo — defesa!`
          : `${target.name} cabeceia para fora`,
      ballPos,
    });

    if (side === 'home') {
      newState.stats = { ...newState.stats, homeShots: newState.stats.homeShots + 1, homeXG: Math.round((newState.stats.homeXG + shotResult.xg) * 100) / 100 };
      if (shotResult.onTarget) newState.stats.homeShotsOnTarget = newState.stats.homeShotsOnTarget + 1;
    } else {
      newState.stats = { ...newState.stats, awayShots: newState.stats.awayShots + 1, awayXG: Math.round((newState.stats.awayXG + shotResult.xg) * 100) / 100 };
      if (shotResult.onTarget) newState.stats.awayShotsOnTarget = newState.stats.awayShotsOnTarget + 1;
    }

    if (shotResult.goal) {
      if (side === 'home') newState.homeGoals = newState.homeGoals + 1;
      else newState.awayGoals = newState.awayGoals + 1;

      events.push({
        minute, type: 'goal', team: side, player: target.name,
        description: `GOOOL! ${target.name} marca de cabeça em escanteio de ${taker.name}!`,
      });
      newState.goalDetails = [...newState.goalDetails, {
        team: side, minute, scorerId: target.id, scorerName: target.name, assistId: taker.id, assistName: taker.name,
      }];

      const losingTeam = side === 'home' ? defendingTeam : attackingTeam;
      const newHolder = pickPlayerWithBall(losingTeam, 0.5, side !== 'home');
      newState.possession = side === 'home' ? 'away' : 'home';
      newState.ballPos = 0.5;
      newState.ballHolderId = newHolder.id;
      newState.passChain = 0;
    } else if (shotResult.onTarget) {
      events.push({ minute, type: 'save', team: side === 'home' ? 'away' : 'home', description: `Boa defesa de ${goalkeeper.name} no escanteio!` });
      const newHolder = pickPlayerWithBall(defendingTeam, ballPos, side !== 'home');
      newState.possession = side === 'home' ? 'away' : 'home';
      newState.ballHolderId = newHolder.id;
      newState.passChain = 0;
    } else {
      // E-17: Inverter constantes — o time que defende reinicia perto do próprio gol.
      const newHolder = pickPlayerWithBall(defendingTeam, side === 'home' ? 0.9 : 0.1, side !== 'home');
      newState.possession = side === 'home' ? 'away' : 'home';
      newState.ballHolderId = newHolder.id;
      newState.passChain = 0;
      newState.ballPos = side === 'home' ? 0.9 : 0.1;
    }
  } else {
    // Cruzamento afastado
    const clearer = bestAerialDefender(defendingTeam);
    actions.push({
      minute, type: 'clearance', team: side === 'home' ? 'away' : 'home',
      playerId: clearer.id, playerName: clearer.name, success: true,
      description: `${clearer.name} afasta o escanteio`, ballPos,
    });

    if (defConfig.defensiveCorners.counterAttack && _matchRng() < 0.6) {
      const counterPlayer = pickPlayerWithBall(defendingTeam, side === 'home' ? 0.3 : 0.7, side !== 'home');
      newState.possession = side === 'home' ? 'away' : 'home';
      newState.ballHolderId = counterPlayer.id;
      newState.passChain = 0;
      newState.ballPos = clamp(ballPos + (_matchRng() - 0.3) * 0.3, 0, 1);
    } else {
      const homeWins = _matchRng() < 0.5;
      const winningTeam = homeWins ? defendingTeam : attackingTeam;
      const winner = pickPlayerWithBall(winningTeam, ballPos, homeWins ? side !== 'home' : side === 'home');
      newState.possession = homeWins ? (side === 'home' ? 'away' : 'home') : side;
      newState.ballHolderId = winner.id;
      newState.passChain = 0;
      newState.ballPos = clamp(ballPos + (_matchRng() - 0.5) * 0.2, 0, 1);
    }
  }

  return { state: newState, actions, events };
}

// Simula cobrança de falta
function simulateFreeKick(
  attackingTeam: Team,
  defendingTeam: Team,
  state: LiveMatchState,
  minute: number,
  side: 'home' | 'away',
  ballPos: number,
): SetPieceResult {
  const config = getSetPiecesConfig(attackingTeam);
  const defConfig = getSetPiecesConfig(defendingTeam);
  const xi = startingXI(attackingTeam);
  const defXi = startingXI(defendingTeam);

  const taker = xi.find(p => p.id === config.freeKicks.takerId) ?? autoSelectFreeKickTaker(attackingTeam);
  const goalkeeper = defXi.find(p => p.position === 'GK') ?? defXi[0];

  // Distância do gol (baseada em ballPos)
  const attackProgress = side === 'home' ? ballPos : 1 - ballPos;
  const distance = 1 - attackProgress; // 0 = perto, 1 = longe

  // Atributos do cobrador
  const freeKicks = taker.technical?.freeKicks ?? 10;
  const technique = taker.technical?.technique ?? 10;
  const finishing = taker.technical?.finishing ?? 10;
  const longShots = taker.technical?.longShots ?? 10;
  const crossing = taker.technical?.crossing ?? 10;
  const composure = taker.mental?.composure ?? 10;

  // Goleiro
  const gkReflexes = goalkeeper.goalkeeping?.reflexes ?? 10;
  const gkPositioning = goalkeeper.mental?.positioning ?? 10;

  // Modificador de barreira
  const wallMods: Record<string, number> = { small: 1.15, medium: 1.0, large: 0.85 };

  // Modificador de marcação defensiva
  const markingMods: Record<string, number> = { man_to_man: 1.1, zonal: 1.0, mixed: 1.05 };
  const markingMod = markingMods[defConfig.defensiveFreeKicks.marking];

  const actions: MatchAction[] = [];
  const events: MatchEvent[] = [];
  let newState = { ...state };

  events.push({ minute, type: 'foul', team: side, player: taker.name, description: `Falta cobrada por ${taker.name}` });
  actions.push({
    minute, type: 'freeKick', team: side, playerId: taker.id, playerName: taker.name,
    success: false, description: `${taker.name} prepara a falta (${config.freeKicks.delivery.replace(/_/g, ' ')})`, ballPos,
  });

  if (config.freeKicks.delivery === 'shot_on_goal') {
    // Tiro direto
    let shotProb = 0.15;
    shotProb += (freeKicks / 20) * 0.20;
    shotProb += (technique / 20) * 0.10;
    shotProb += (finishing / 20) * 0.08;
    shotProb += (longShots / 20) * 0.05;
    shotProb += (composure / 20) * 0.05;
    shotProb -= (gkReflexes / 20) * 0.10;
    shotProb -= (gkPositioning / 20) * 0.06;
    shotProb *= wallMods[defConfig.defensiveFreeKicks.wallSize];
    // Faltas mais distantes são mais difíceis
    shotProb *= (1 - distance * 0.3);
    shotProb = clamp(shotProb, 0.03, 0.40);

    const goal = _matchRng() < shotProb;

    actions.push({
      minute, type: 'shot', team: side, playerId: taker.id, playerName: taker.name,
      success: goal,
      description: goal ? `${taker.name} acerta o tiro livre — GOL!` : `${taker.name} cobra direto — bola passa rente!`,
      ballPos,
    });

    const fkXG = Math.round(shotProb * 100) / 100;
    if (side === 'home') {
      newState.stats = { ...newState.stats, homeShots: newState.stats.homeShots + 1, homeXG: Math.round((newState.stats.homeXG + fkXG) * 100) / 100 };
      if (goal) newState.stats.homeShotsOnTarget = newState.stats.homeShotsOnTarget + 1;
    } else {
      newState.stats = { ...newState.stats, awayShots: newState.stats.awayShots + 1, awayXG: Math.round((newState.stats.awayXG + fkXG) * 100) / 100 };
      if (goal) newState.stats.awayShotsOnTarget = newState.stats.awayShotsOnTarget + 1;
    }

    if (goal) {
      if (side === 'home') newState.homeGoals = newState.homeGoals + 1;
      else newState.awayGoals = newState.awayGoals + 1;
      events.push({ minute, type: 'goal', team: side, player: taker.name, description: `GOOOL! ${taker.name} marca de falta!` });
      newState.goalDetails = [...newState.goalDetails, {
        team: side, minute, scorerId: taker.id, scorerName: taker.name,
      }];
      const losingTeam = side === 'home' ? defendingTeam : attackingTeam;
      const newHolder = pickPlayerWithBall(losingTeam, 0.5, side !== 'home');
      newState.possession = side === 'home' ? 'away' : 'home';
      newState.ballPos = 0.5;
      newState.ballHolderId = newHolder.id;
      newState.passChain = 0;
    } else {
      // Defesa ou para fora
      if (_matchRng() < 0.5) {
        events.push({ minute, type: 'save', team: side === 'home' ? 'away' : 'home', description: `${goalkeeper.name} defende a falta!` });
      }
      // E-17: Inverter constantes — o time que defende reinicia perto do próprio gol.
      const newHolder = pickPlayerWithBall(defendingTeam, side === 'home' ? 0.85 : 0.15, side !== 'home');
      newState.possession = side === 'home' ? 'away' : 'home';
      newState.ballHolderId = newHolder.id;
      newState.passChain = 0;
      newState.ballPos = side === 'home' ? 0.85 : 0.15;
    }
  } else if (config.freeKicks.delivery === 'cross_into_box' || config.freeKicks.delivery === 'long_ball') {
    // Cruzamento ou bola longa na área
    const target = autoSelectCornerTarget(attackingTeam);
    const bestDef = bestAerialDefender(defendingTeam);

    let crossProb = 0.15;
    crossProb += (crossing / 20) * 0.15;
    crossProb += (freeKicks / 20) * 0.10;
    crossProb += ((target.technical?.heading ?? 10) + (target.physical?.jumping ?? 10)) / 2 / 20 * 0.18;
    crossProb -= ((bestDef.technical?.heading ?? 10) + (bestDef.physical?.jumping ?? 10)) / 2 / 20 * 0.10 * markingMod;
    crossProb -= ((goalkeeper.goalkeeping?.commandOfArea ?? 10) + (goalkeeper.goalkeeping?.aerialReach ?? 10)) / 2 / 20 * 0.06;
    crossProb = clamp(crossProb, 0.03, 0.35);

    const success = _matchRng() < crossProb;

    actions.push({
      minute, type: 'cross', team: side, playerId: taker.id, playerName: taker.name,
      success,
      description: success ? `${taker.name} cruza na área para ${target.name}!` : `${taker.name} cruza mas a zaga afasta`,
      ballPos,
    });

    if (success) {
      const shotResult = shotSuccessProb(target, goalkeeper, 0.3, attackingTeam);
      actions.push({
        minute, type: 'header', team: side, playerId: target.id, playerName: target.name,
        success: shotResult.goal,
        description: shotResult.goal ? `${target.name} cabeceia para o gol!` : `${target.name} não consegue finalizar`,
        ballPos,
      });

      if (side === 'home') {
        newState.stats = { ...newState.stats, homeShots: newState.stats.homeShots + 1 };
        if (shotResult.onTarget) newState.stats.homeShotsOnTarget = newState.stats.homeShotsOnTarget + 1;
      } else {
        newState.stats = { ...newState.stats, awayShots: newState.stats.awayShots + 1 };
        if (shotResult.onTarget) newState.stats.awayShotsOnTarget = newState.stats.awayShotsOnTarget + 1;
      }

      if (shotResult.goal) {
        if (side === 'home') newState.homeGoals = newState.homeGoals + 1;
        else newState.awayGoals = newState.awayGoals + 1;
        events.push({ minute, type: 'goal', team: side, player: target.name, description: `GOOOL! ${target.name} marca em falta cobrada por ${taker.name}!` });
        newState.goalDetails = [...newState.goalDetails, {
          team: side, minute, scorerId: target.id, scorerName: target.name, assistId: taker.id, assistName: taker.name,
        }];
        const losingTeam = side === 'home' ? defendingTeam : attackingTeam;
        const newHolder = pickPlayerWithBall(losingTeam, 0.5, side !== 'home');
        newState.possession = side === 'home' ? 'away' : 'home';
        newState.ballPos = 0.5;
        newState.ballHolderId = newHolder.id;
        newState.passChain = 0;
      } else {
        const newHolder = pickPlayerWithBall(defendingTeam, ballPos, side !== 'home');
        newState.possession = side === 'home' ? 'away' : 'home';
        newState.ballHolderId = newHolder.id;
        newState.passChain = 0;
      }
    } else {
      const clearer = bestAerialDefender(defendingTeam);
      actions.push({
        minute, type: 'clearance', team: side === 'home' ? 'away' : 'home',
        playerId: clearer.id, playerName: clearer.name, success: true,
        description: `${clearer.name} afasta o cruzamento`, ballPos,
      });
      newState.possession = side === 'home' ? 'away' : 'home';
      newState.ballHolderId = clearer.id;
      newState.passChain = 0;
      newState.ballPos = clamp(ballPos + (_matchRng() - 0.5) * 0.2, 0, 1);
    }
  } else {
    // Short — passe curto para criar chance
    const receiver = pickPlayerWithBall(attackingTeam, ballPos, side === 'home', taker.id);
    const passSuccess = _matchRng() < 0.75;
    actions.push({
      minute, type: 'pass', team: side, playerId: taker.id, playerName: taker.name,
      success: passSuccess,
      description: passSuccess ? `${taker.name} passa curto para ${receiver.name}` : `${taker.name} erra o passe curto`,
      ballPos,
    });

    if (passSuccess) {
      newState.ballHolderId = receiver.id;
      newState.passChain = 1;
      newState.ballPos = clamp(ballPos + 0.05 * (side === 'home' ? 1 : -1), 0, 1);
    } else {
      const defender = pickDefender(defendingTeam, ballPos, side !== 'home');
      newState.possession = side === 'home' ? 'away' : 'home';
      newState.ballHolderId = defender.id;
      newState.passChain = 0;
    }
  }

  return { state: newState, actions, events };
}

// Simula pênalti
function simulatePenalty(
  attackingTeam: Team,
  defendingTeam: Team,
  state: LiveMatchState,
  minute: number,
  side: 'home' | 'away',
): SetPieceResult {
  const config = getSetPiecesConfig(attackingTeam);
  const xi = startingXI(attackingTeam);
  const defXi = startingXI(defendingTeam);

  const taker = xi.find(p => p.id === config.penalties.takerId) ?? autoSelectPenaltyTaker(attackingTeam);
  const goalkeeper = defXi.find(p => p.position === 'GK') ?? defXi[0];

  const finishing = taker.technical?.finishing ?? 10;
  const composure = taker.mental?.composure ?? 10;
  const technique = taker.technical?.technique ?? 10;

  const reflexes = goalkeeper.goalkeeping?.reflexes ?? 10;
  const oneOnOne = goalkeeper.goalkeeping?.oneOnOne ?? 10;

  // Pênaltis têm conversão alta (~75%)
  let goalProb = 0.76;
  goalProb += (finishing / 20) * 0.08;
  goalProb += (composure / 20) * 0.06;
  goalProb += (technique / 20) * 0.04;
  goalProb -= (reflexes / 20) * 0.05;
  goalProb -= (oneOnOne / 20) * 0.04;
  goalProb = clamp(goalProb, 0.55, 0.92);

  const goal = _matchRng() < goalProb;
  const actions: MatchAction[] = [];
  const events: MatchEvent[] = [];
  let newState = { ...state };

  actions.push({
    minute, type: 'penalty', team: side, playerId: taker.id, playerName: taker.name,
    success: goal,
    description: goal ? `${taker.name} converte o pênalti!` : `${taker.name} perde o pênalti!`,
    ballPos: side === 'home' ? 0.95 : 0.05,
  });

  const penXG = Math.round(goalProb * 100) / 100;
  if (side === 'home') {
    newState.stats = { ...newState.stats, homeShots: newState.stats.homeShots + 1, homeXG: Math.round((newState.stats.homeXG + penXG) * 100) / 100 };
    if (goal) newState.stats.homeShotsOnTarget = newState.stats.homeShotsOnTarget + 1;
  } else {
    newState.stats = { ...newState.stats, awayShots: newState.stats.awayShots + 1, awayXG: Math.round((newState.stats.awayXG + penXG) * 100) / 100 };
    if (goal) newState.stats.awayShotsOnTarget = newState.stats.awayShotsOnTarget + 1;
  }

  if (goal) {
    if (side === 'home') newState.homeGoals = newState.homeGoals + 1;
    else newState.awayGoals = newState.awayGoals + 1;
    events.push({ minute, type: 'goal', team: side, player: taker.name, description: `GOOOL! ${taker.name} converte o pênalti!` });
    newState.goalDetails = [...newState.goalDetails, {
      team: side, minute, scorerId: taker.id, scorerName: taker.name,
    }];
    const losingTeam = side === 'home' ? defendingTeam : attackingTeam;
    const newHolder = pickPlayerWithBall(losingTeam, 0.5, side !== 'home');
    newState.possession = side === 'home' ? 'away' : 'home';
    newState.ballPos = 0.5;
    newState.ballHolderId = newHolder.id;
    newState.passChain = 0;
  } else {
    events.push({ minute, type: 'save', team: side === 'home' ? 'away' : 'home', description: `${goalkeeper.name} defende o pênalti!` });
    // E-17: Inverter constantes — o time que defende reinicia perto do próprio gol.
    const newHolder = pickPlayerWithBall(defendingTeam, side === 'home' ? 0.85 : 0.15, side !== 'home');
    newState.possession = side === 'home' ? 'away' : 'home';
    newState.ballHolderId = newHolder.id;
    newState.passChain = 0;
    newState.ballPos = side === 'home' ? 0.85 : 0.15;
  }

  return { state: newState, actions, events };
}

// Calcula força de bolas paradas de um time (para simulação rápida)
function setPieceStrength(team: Team): { attack: number; defense: number } {
  const config = getSetPiecesConfig(team);
  const xi = startingXI(team);
  if (xi.length === 0) return { attack: 0, defense: 0 };

  // Força ofensiva de bolas paradas
  const cornerTaker = xi.find(p => p.id === config.corners.takerId) ?? autoSelectCornerTaker(team);
  const cornerTarget = xi.find(p => p.id === config.corners.targetId) ?? autoSelectCornerTarget(team);
  const fkTaker = xi.find(p => p.id === config.freeKicks.takerId) ?? autoSelectFreeKickTaker(team);
  const penTaker = xi.find(p => p.id === config.penalties.takerId) ?? autoSelectPenaltyTaker(team);

  const cornerAttack = ((cornerTaker.technical?.crossing ?? 10) + (cornerTarget.technical?.heading ?? 10) + (cornerTarget.physical?.jumping ?? 10)) / 3;
  const fkAttack = (fkTaker.technical?.freeKicks ?? 10) + (fkTaker.technical?.technique ?? 10);
  const penAttack = ((penTaker.technical?.finishing ?? 10) + (penTaker.mental?.composure ?? 10)) / 2;

  // Bônus por tipo de cobrança de escanteio
  const deliveryBonus: Record<string, number> = {
    near_post: 0.5, far_post: 1.0, penalty_area: 0.8, short: 0.3, edge_of_box: 0.7,
  };
  const cornerBonus = deliveryBonus[config.corners.delivery] ?? 0.5;

  const attack = (cornerAttack * 0.5 + fkAttack * 0.3 + penAttack * 0.2) / 20 + cornerBonus * 0.02;

  // Força defensiva de bolas paradas
  const bestDef = bestAerialDefender(team);
  const gk = xi.find(p => p.position === 'GK') ?? xi[0];
  const defMarkingMod: Record<string, number> = { man_to_man: 1.1, zonal: 1.0, mixed: 1.05 };
  const markingMod = defMarkingMod[config.defensiveCorners.marking] ?? 1.0;

  const defStrength = ((bestDef.technical?.heading ?? 10) + (bestDef.physical?.jumping ?? 10) + (bestDef.technical?.marking ?? 10)) / 3;
  const gkStrength = ((gk.goalkeeping?.commandOfArea ?? 10) + (gk.goalkeeping?.aerialReach ?? 10)) / 2;
  const defense = ((defStrength * 0.6 + gkStrength * 0.4) / 20) * markingMod;

  return { attack, defense };
}

// Inicializa o estado da partida ao vivo — v1 (implementação original)
export function initLiveMatchStateV1(homeTeam: Team, awayTeam: Team, seed?: number): LiveMatchState {
  const rng = seed !== undefined ? mulberry32(seed) : null;
  _matchRng = rng ?? Math.random;
  _matchSentOff = new Set();
  _matchInjured = new Set();
  const possessionBias = getPossessionBias(homeTeam, awayTeam);
  const homeStarts = _matchRng() < possessionBias;

  // Escolhe o primeiro portador da bola
  const startingTeam = homeStarts ? homeTeam : awayTeam;
  const firstHolder = pickPlayerWithBall(startingTeam, 0.5, homeStarts);

  return {
    possession: homeStarts ? 'home' : 'away',
    ballPos: 0.5,
    ballPosY: 0.5,
    ballHolderId: firstHolder.id,
    passChain: 0,
    pressure: 0.3,
    momentum: 0,
    fatigue: {},
    passTotals: { homeAtt: 0, homeCmp: 0, awayAtt: 0, awayCmp: 0 },
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
    cards: {},
    sentOff: { home: [], away: [] },
    matchInjuries: [],
    ...(rng ? { seed, rngState: rng.state() } : {}),
  };
}

// Inicializa o estado da partida ao vivo — v2 (stub: delega para v1 até fases futuras)
export function initLiveMatchStateV2(homeTeam: Team, awayTeam: Team, seed?: number): LiveMatchState {
  return initLiveMatchStateV1(homeTeam, awayTeam, seed);
}

// Wrapper público — delega para v1 ou v2 conforme flag MATCH_ENGINE
export function initLiveMatchState(homeTeam: Team, awayTeam: Team, seed?: number): LiveMatchState {
  return isV2
    ? initLiveMatchStateV2(homeTeam, awayTeam, seed)
    : initLiveMatchStateV1(homeTeam, awayTeam, seed);
}

// ============================================================
// HELPERS DE REALISMO — fadiga, momentum, largura do campo
// ============================================================

// Densidade de lances por minuto conforme o ritmo tático das equipes
function ticksPerMinute(home: Team, away: Team): number {
  let t = 4.5;
  for (const team of [home, away]) {
    if (team.tempo === 'fast') t += 0.75;
    else if (team.tempo === 'slow') t -= 0.5;
  }
  return Math.round(clamp(t, 3, 6));
}

// Fadiga acumulada reduz a qualidade das ações (0.6 de fadiga = -21%)
function fatigueMod(state: LiveMatchState, p: Player): number {
  return 1 - (state.fatigue?.[p.id] ?? 0) * 0.35;
}

// Acumula fadiga por minuto: pressão alta e ritmo rápido desgastam mais;
// resistência (stamina) alta desgasta menos. Substituto entra descansado (sem entrada no mapa).
function nextFatigue(home: Team, away: Team, state: LiveMatchState): Record<string, number> {
  const f = { ...(state.fatigue ?? {}) };
  for (const team of [home, away]) {
    const intensity =
      (team.pressIntensity === 'high' ? 1.25 : team.pressIntensity === 'low' ? 0.9 : 1.0) *
      (team.tempo === 'fast' ? 1.15 : team.tempo === 'slow' ? 0.9 : 1.0);
    for (const p of startingXI(team)) {
      const stamina = p.physical?.stamina ?? 10;
      f[p.id] = clamp((f[p.id] ?? 0) + 0.005 * intensity * (1.3 - stamina / 40), 0, 0.6);
    }
  }
  return f;
}

// Alvo lateral (Y) do ataque conforme a tática; espelhado para o visitante
function flankTargetY(team: Team, side: 'home' | 'away'): number {
  let y: number;
  if (team.useFlank === 'left') y = 0.2;
  else if (team.useFlank === 'right') y = 0.8;
  else if (team.attackWidth === 'wide') y = _matchRng() < 0.5 ? 0.15 : 0.85;
  else if (team.attackWidth === 'narrow') y = 0.5;
  else y = 0.25 + _matchRng() * 0.5;
  return side === 'away' ? 1 - y : y;
}

// ============================================================
// LESÕES DURANTE A PARTIDA — faltas duras, fadiga, tática agressiva
// ============================================================

// Probabilidade de lesão por falta dura (3% base)
// Tática aggressive (+4%), tempo fast (+1%), fadiga alta (+2-5%), proneness (>5: +1%/ponto)
function foulInjuryChance(foulingTeam: Team, victimFatigue: number, victimProneness: number): number {
  let chance = 0.03;
  if (foulingTeam.tacklingStyle === 'aggressive' || (!foulingTeam.tacklingStyle && foulingTeam.aggressiveTackling)) chance += 0.04;
  if (foulingTeam.tempo === 'fast') chance += 0.01;
  if (victimFatigue > 0.35) chance += 0.02;
  if (victimFatigue > 0.45) chance += 0.03;
  if (victimProneness > 5) chance += (victimProneness - 5) * 0.01;
  return chance;
}

// Probabilidade de lesão por fadiga acumulada (por jogador por minuto)
// Só verifica se fadiga > 0.35; tempo fast (+0.01%), proneness > 5 (+0.005%/ponto)
// Base ~0.01% — com 22 jogadores × 90 min ≈ 0.2 lesões/partida
function fatigueInjuryChance(playerFatigue: number, teamTempo: string | undefined, proneness: number): number {
  if (playerFatigue <= 0.35) return 0;
  let chance = 0.0001;
  if (playerFatigue > 0.45) chance += 0.0002;
  if (teamTempo === 'fast') chance += 0.0001;
  if (proneness > 5) chance += (proneness - 5) * 0.00005;
  return chance;
}

// Registra lesão na partida: adiciona ao matchInjuries, _matchInjured e emite evento
function triggerMatchInjury(
  victim: Player,
  side: 'home' | 'away',
  minute: number,
  state: LiveMatchState,
  foulerName?: string,
): { event: MatchEvent; state: LiveMatchState } {
  _matchInjured.add(victim.id);
  const matchInjuries = [...(state.matchInjuries ?? []), { playerId: victim.id, side }];
  const event: MatchEvent = {
    minute,
    type: 'injury',
    team: side,
    player: victim.name,
    description: foulerName
      ? `🏥 ${victim.name} se lesiona após falta de ${foulerName}! Precisa deixar o campo.`
      : `🏥 ${victim.name} se lesiona! Precisa deixar o campo.`,
  };
  return { event, state: { ...state, matchInjuries } };
}

// Simula UM lance (passe, drible ou chute) — chamado várias vezes por minuto.
// Retorna o estado atualizado + novas ações + novos eventos.
function simulateTick(
  homeTeam: Team,
  awayTeam: Team,
  state: LiveMatchState,
  minute: number,
): LiveMatchState {
  // E-18: Sincronizar jogadores expulsos para filtragem em startingXI.
  _matchSentOff = new Set([...(state.sentOff?.home ?? []), ...(state.sentOff?.away ?? [])]);
  _matchInjured = new Set((state.matchInjuries ?? []).map(mi => mi.playerId));

  const attackingTeam = state.possession === 'home' ? homeTeam : awayTeam;
  const defendingTeam = state.possession === 'home' ? awayTeam : homeTeam;
  const side = state.possession;

  // Direção de ataque: home ataca rumo a ballPos=1, away rumo a ballPos=0
  const attackDir = side === 'home' ? 1 : -1;
  const currentBallPos = state.ballPos;

  // Calcula pressão
  let pressure = calculatePressure(attackingTeam, defendingTeam, currentBallPos);

  // Largura do campo (0 = topo, 1 = base) — define ângulo de chute e jogo de flanco
  const currentBallY = state.ballPosY ?? 0.5;

  // Pega o portador atual da bola
  const holder = attackingTeam.squad.find(p => p.id === state.ballHolderId) ?? attackingTeam.squad[0];
  const holderFatigue = fatigueMod(state, holder);

  // Momentum do lado atacante (-1..1): time embalado cria mais
  const mSide = side === 'home' ? (state.momentum ?? 0) : -(state.momentum ?? 0);

  // Decide a ação: passe, drible, ou chute
  // Quanto mais perto do gol, maior a chance de chutar
  // ponytail: valores por tick calibrados em matchEngine.test.ts (~2.7 gols/jogo)
  const attackProgress = side === 'home' ? currentBallPos : 1 - currentBallPos; // 0 = defesa, 1 = gol adversário
  let shotChance = (attackProgress > 0.75 ? 0.12 : attackProgress > 0.55 ? 0.035 : 0.004) * (1 + mSide * 0.25);
  if (state.passChain >= 4) shotChance *= 1.25; // jogada trabalhada gera chance melhor
  shotChance *= side === 'home' ? 1.10 : 0.97;  // vantagem de mando (torcida)
  let dribbleChance = pressure > 0.5 ? 0.20 : 0.10;

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

  // Efeito de expulsões: time com menos jogadores cria menos e sofre mais
  const homeDown = state.sentOff?.home.length ?? 0;
  const awayDown = state.sentOff?.away.length ?? 0;
  const attDown = side === 'home' ? homeDown : awayDown;
  const defDown = side === 'home' ? awayDown : homeDown;
  if (attDown > 0 || defDown > 0) {
    shotChance = clamp(shotChance * (1 - attDown * 0.12) * (1 + defDown * 0.14), 0.005, 0.5);
    dribbleChance = clamp(dribbleChance * (1 - attDown * 0.08), 0.02, 0.5);
    pressure = clamp(pressure * (1 + attDown * 0.06) * (1 - defDown * 0.05), 0.1, 0.95);
  }

  const roll = _matchRng();
  const newActions: MatchAction[] = [];
  const newEvents: MatchEvent[] = [];
  let newState: LiveMatchState = { ...state, pressure };

  // Books a foul: yellow accumulates (2nd = red), plus a small straight-red chance.
  // Realistic per-foul odds — card cadence comes from foul volume, not inflated odds.
  const bookOffender = (offender: Player, foulSide: 'home' | 'away', teamName: string) => {
    const cards = { ...(newState.cards ?? {}) };
    const sentOff = {
      home: [...(newState.sentOff?.home ?? [])],
      away: [...(newState.sentOff?.away ?? [])],
    };
    if (sentOff[foulSide].includes(offender.id)) return;
    const cardRoll = _matchRng();
    if (cardRoll < 0.012) {
      sentOff[foulSide].push(offender.id);
      newEvents.push({ minute, type: 'red', team: foulSide, player: offender.name, description: `VERMELHO direto para ${offender.name}! ${teamName} com um a menos` });
    } else if (cardRoll < 0.22) {
      const yc = (cards[offender.id] ?? 0) + 1;
      cards[offender.id] = yc;
      if (yc >= 2) {
        sentOff[foulSide].push(offender.id);
        newEvents.push({ minute, type: 'red', team: foulSide, player: offender.name, description: `Segundo amarelo — ${offender.name} está expulso! ${teamName} com um a menos` });
      } else {
        newEvents.push({ minute, type: 'yellow', team: foulSide, player: offender.name, description: `Cartão amarelo para ${offender.name}` });
      }
    }
    newState.cards = cards;
    newState.sentOff = sentOff;
    // E-18: Atualizar filtro de expulsos para as funções de seleção.
    _matchSentOff = new Set([...sentOff.home, ...sentOff.away]);
  };

  // Faltas esparsas (fora das disputas de drible), para dar volume realista
  // de cartões. Só emite evento quando há cartão. 0.03/tick ≈ 0.12/minuto.
  if (_matchRng() < 0.03) {
    const foulSide2: 'home' | 'away' = _matchRng() < 0.5 ? 'home' : 'away';
    const team2 = foulSide2 === 'home' ? homeTeam : awayTeam;
    const outfield = startingXI(team2).filter(p => p.position !== 'GK');
    if (outfield.length > 0) {
      const offender = outfield[Math.floor(_matchRng() * outfield.length)];
      bookOffender(offender, foulSide2, team2.name);
      // Verificar lesão no jogador adversário que sofreu a falta
      const victimSide = foulSide2 === 'home' ? 'away' : 'home';
      const victimTeam = victimSide === 'home' ? homeTeam : awayTeam;
      const victims = startingXI(victimTeam).filter(p => p.position !== 'GK');
      if (victims.length > 0) {
        const victim = victims[Math.floor(_matchRng() * victims.length)];
        const vFatigue = state.fatigue?.[victim.id] ?? 0;
        const vProneness = victim.hidden?.injuryProneness ?? 5;
        if (_matchRng() < foulInjuryChance(team2, vFatigue, vProneness)) {
          const result = triggerMatchInjury(victim, victimSide, minute, newState, offender.name);
          newEvents.push(result.event);
          newState = result.state;
        }
      }
    }
  }

  // Totais de passes (cada tick de passe representa uma troca curta — peso 2)
  const passTotals = { ...(state.passTotals ?? {
    homeAtt: state.stats.homePasses,
    homeCmp: Math.round(state.stats.homePasses * (state.stats.homePassAccuracy || 80) / 100),
    awayAtt: state.stats.awayPasses,
    awayCmp: Math.round(state.stats.awayPasses * (state.stats.awayPassAccuracy || 80) / 100),
  }) };
  newState.passTotals = passTotals;

  if (roll < shotChance) {
    // === CHUTE ===
    const goalkeeper = defendingTeam.squad.find(p => p.position === 'GK') ?? defendingTeam.squad[0];
    const distance = 1 - attackProgress; // 1 = longe do gol, 0 = perto do gol (shotSuccessProb: >0.6 = chute de longe)
    const wide = clamp(Math.abs(currentBallY - 0.5) * 2, 0, 1); // ângulo: da lateral é bem mais difícil
    const result = shotSuccessProb(holder, goalkeeper, distance, attackingTeam, wide, holderFatigue);

    // xG real do lance (probabilidade de gol calculada, não fórmula arbitrária)
    const xgContribution = result.xg;

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

      // Gol vira o momentum fortemente para quem marcou
      newState.momentum = clamp((state.momentum ?? 0) * 0.4 + (side === 'home' ? 0.45 : -0.45), -1, 1);

      // Assistência?
      const assister = _matchRng() < 0.62 ? pickAssister(attackingTeam, holder.id) : undefined;

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
      const newHolder = pickPlayerWithBall(losingTeam, 0.5, side !== 'home');
      newState.possession = side === 'home' ? 'away' : 'home';
      newState.ballPos = 0.5;
      newState.ballPosY = 0.5;
      newState.ballHolderId = newHolder.id;
      newState.passChain = 0;
    } else if (result.onTarget) {
      // Defesa do goleiro — chute perigoso ainda embala o time atacante
      newState.momentum = clamp((state.momentum ?? 0) + (side === 'home' ? 0.06 : -0.06), -1, 1);
      newEvents.push({
        minute,
        type: 'save',
        team: side === 'home' ? 'away' : 'home',
        description: `Boa defesa de ${goalkeeper.name}!`,
      });
      // 20% chance de escanteio após defesa (goleiro espalma para fora)
      if (_matchRng() < 0.20) {
        const cornerResult = simulateCornerKick(attackingTeam, defendingTeam, newState, minute, side, currentBallPos);
        newActions.push(...cornerResult.actions);
        newEvents.push(...cornerResult.events);
        Object.assign(newState, cornerResult.state);
        newState.ballPosY = 0.35 + _matchRng() * 0.3;
      } else {
        // Reposição do goleiro
        newState.possession = side === 'home' ? 'away' : 'home';
        newState.ballHolderId = goalkeeper.id;
        newState.passChain = 0;
        newState.ballPos = side === 'home' ? clamp(currentBallPos - 0.3, 0, 1) : clamp(currentBallPos + 0.3, 0, 1);
        newState.ballPosY = 0.4 + _matchRng() * 0.2;
      }
    } else {
      // Chute para fora
      if (attackProgress > 0.6 && _matchRng() < 0.35) {
        // Escanteio para o time atacante
        const cornerResult = simulateCornerKick(attackingTeam, defendingTeam, newState, minute, side, currentBallPos);
        newActions.push(...cornerResult.actions);
        newEvents.push(...cornerResult.events);
        Object.assign(newState, cornerResult.state);
        newState.ballPosY = 0.35 + _matchRng() * 0.3;
      } else {
        // Tiro de meta — posse para o time defensor
        // E-17: Inverter constantes — o time que defende reinicia perto do próprio gol.
        const newHolder = pickPlayerWithBall(defendingTeam, side === 'home' ? 0.9 : 0.1, side !== 'home');
        newState.possession = side === 'home' ? 'away' : 'home';
        newState.ballHolderId = newHolder.id;
        newState.passChain = 0;
        newState.ballPos = side === 'home' ? 0.9 : 0.1;
        newState.ballPosY = 0.35 + _matchRng() * 0.3;
      }
    }
  } else if (roll < shotChance + dribbleChance) {
    // === DRIBLE ===
    const defender = pickDefender(defendingTeam, currentBallPos, side !== 'home');
    const success = _matchRng() < dribbleSuccessProb(holder, defender, attackingTeam) * holderFatigue;

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
      const advance = 0.08 + _matchRng() * 0.10;
      newState.ballPos = clamp(currentBallPos + advance * attackDir, 0.02, 0.98);
      newState.ballPosY = clamp(currentBallY + (_matchRng() - 0.5) * 0.16, 0.04, 0.96);
      newState.passChain = state.passChain + 1;
      // Pressão diminui após drible bem-sucedido
      newState.pressure = clamp(pressure - 0.15, 0.1, 0.85);
    } else {
      // Desarme — posse para o adversário
      // Possível falta
      if (_matchRng() < 0.25) {
        newEvents.push({
          minute,
          type: 'foul',
          team: side === 'home' ? 'away' : 'home',
          player: defender.name,
          description: `Falta de ${defender.name} em ${holder.name}`,
        });
        // Cartão pela falta no drible (amarelo acumula, 2º = vermelho)
        bookOffender(defender, side === 'home' ? 'away' : 'home', defendingTeam.name);
        // Verificar lesão no atacante que sofreu a falta
        const hFatigue = state.fatigue?.[holder.id] ?? 0;
        const hProneness = holder.hidden?.injuryProneness ?? 5;
        if (_matchRng() < foulInjuryChance(defendingTeam, hFatigue, hProneness)) {
          const injResult = triggerMatchInjury(holder, side, minute, newState, defender.name);
          newEvents.push(injResult.event);
          newState = injResult.state;
        }
        // Verifica se a falta é em posição perigosa
        if (attackProgress > 0.9 && _matchRng() < 0.08) {
          // Pênalti!
          newEvents.push({ minute, type: 'foul', team: side, description: 'Pênalti marcado!' });
          const penaltyResult = simulatePenalty(attackingTeam, defendingTeam, newState, minute, side);
          newActions.push(...penaltyResult.actions);
          newEvents.push(...penaltyResult.events);
          Object.assign(newState, penaltyResult.state);
        } else if (attackProgress > 0.65) {
          // Falta em posição perigosa — cobrança de falta
          const fkResult = simulateFreeKick(attackingTeam, defendingTeam, newState, minute, side, currentBallPos);
          newActions.push(...fkResult.actions);
          newEvents.push(...fkResult.events);
          Object.assign(newState, fkResult.state);
        } else {
          // Falta comum — posse mantida pelo atacante
          newState.ballPos = currentBallPos;
          newState.passChain = 0;
        }
      } else {
        // Desarme limpo — posse para o defensor
        newState.possession = side === 'home' ? 'away' : 'home';
        newState.ballHolderId = defender.id;
        newState.passChain = 0;
        // Bola pode ir para qualquer direção
        newState.ballPos = clamp(currentBallPos + (_matchRng() - 0.5) * 0.15, 0, 1);
      }
    }
  } else {
    // === PASSE ===
    // Escolhe receptor (não pode ser o próprio passador, não pode ser GK a menos que seja recuo)
    const receiver = pickPlayerWithBall(attackingTeam, currentBallPos, side === 'home', holder.id);
    const success = _matchRng() < passSuccessProb(holder, receiver, pressure, attackingTeam) * holderFatigue;

    // ponytail: cada tick de passe representa uma troca curta de 2 passes — dá volume
    // realista às estatísticas (~250-350 passes/time) sem inflar o feed de lances
    if (side === 'home') {
      passTotals.homeAtt += 2;
      if (success) passTotals.homeCmp += 2;
    } else {
      passTotals.awayAtt += 2;
      if (success) passTotals.awayCmp += 2;
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
      let advance = 0.04 + _matchRng() * 0.08;
      // Transição rápida: contra-ataque nos primeiros passes após recuperar a bola
      if (attackingTeam.afterGainingPossession === 'counterAttack' && state.passChain <= 2) advance *= 1.7;
      if (attackingTeam.passingStyle === 'direct') advance *= 1.2;
      if (attackingTeam.tempo === 'slow') advance *= 0.85;
      // Receptor pode estar mais à frente ou mais atrás
      const receiverPosBias = (_matchRng() - 0.35) * 0.10; // tendência a avançar
      newState.ballPos = clamp(currentBallPos + (advance + receiverPosBias) * attackDir, 0.02, 0.98);
      // Largura: a bola deriva rumo ao flanco preferido da tática
      const targetY = flankTargetY(attackingTeam, side);
      newState.ballPosY = clamp(currentBallY + (targetY - currentBallY) * 0.3 + (_matchRng() - 0.5) * 0.12, 0.04, 0.96);
      newState.ballHolderId = receiver.id;
      newState.passChain = state.passChain + 1;

      // Cruzamento se a bola está aberta na ponta, no terço final
      if (attackProgress > 0.6 && Math.abs(newState.ballPosY - 0.5) > 0.24 && _matchRng() < 0.30) {
        const crosser = holder;
        const targetFwd = startingXI(attackingTeam).find(p => p.position === 'FWD') ?? receiver;
        const crossSuccess = _matchRng() < ((crosser.technical?.crossing ?? 10) / 25);
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
          newState.ballPos = clamp(newState.ballPos + 0.10 * attackDir, 0.02, 0.98);
          newState.ballPosY = 0.42 + _matchRng() * 0.16; // cruzamento cai na área central
          newState.passChain = state.passChain + 2;
        } else {
          // Zaga afasta — interceptação
          const defender = pickDefender(defendingTeam, newState.ballPos, side !== 'home');
          newState.possession = side === 'home' ? 'away' : 'home';
          newState.ballHolderId = defender.id;
          newState.passChain = 0;
          newState.ballPos = clamp(newState.ballPos - 0.20 * attackDir, 0, 1);
        }
      }
    } else {
      // Passe errado — interceptação ou bola perdida
      const defender = pickDefender(defendingTeam, currentBallPos, side !== 'home');
      const interception = _matchRng() < 0.55;

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
        const homeWins = _matchRng() < 0.5;
        const winningTeam = homeWins ? homeTeam : awayTeam;
        const winner = pickPlayerWithBall(winningTeam, currentBallPos, homeWins);
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
      newState.ballPos = clamp(currentBallPos + (_matchRng() - 0.5) * 0.20, 0.02, 0.98);
      newState.ballPosY = clamp(currentBallY + (_matchRng() - 0.5) * 0.20, 0.04, 0.96);
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

  // Atualiza passes e precisão a partir dos totais acumulados
  newState.stats.homePasses = passTotals.homeAtt;
  newState.stats.awayPasses = passTotals.awayAtt;
  newState.stats.homePassAccuracy = passTotals.homeAtt > 0 ? Math.round((passTotals.homeCmp / passTotals.homeAtt) * 100) : 0;
  newState.stats.awayPassAccuracy = passTotals.awayAtt > 0 ? Math.round((passTotals.awayCmp / passTotals.awayAtt) * 100) : 0;

  // Laterais ocasionais (throw-ins) — 0.015/tick ≈ 0.07/minuto
  if (_matchRng() < 0.015) {
    const throwSide = _matchRng() < 0.5 ? 'home' : 'away';
    const throwTeam = throwSide === 'home' ? homeTeam : awayTeam;
    const throwConfig = getSetPiecesConfig(throwTeam);
    const xi = startingXI(throwTeam);
    const throwTaker = xi.find(p => p.id === throwConfig.throwIns.takerId)
      ?? xi.find(p => p.position === 'DEF' || p.position === 'MID') ?? xi[0];
    const throwPos = 0.3 + _matchRng() * 0.4;
    newActions.push({
      minute,
      type: 'throwIn',
      team: throwSide,
      playerId: throwTaker.id,
      playerName: throwTaker.name,
      success: true,
      description: `${throwTaker.name} cobra o lateral (${throwConfig.throwIns.style})`,
      ballPos: throwPos,
    });
    newState.possession = throwSide;
    newState.ballHolderId = throwTaker.id;
    newState.passChain = 0;
    newState.ballPos = throwPos;
    newState.ballPosY = _matchRng() < 0.5 ? 0.04 : 0.96; // bola sai pela linha lateral
  }

  // Combina ações e eventos
  newState.actions = [...state.actions, ...newActions];
  newState.events = [...state.events, ...newEvents];

  return newState;
}

// ============================================================
// SUBSTITUIÇÕES AUTOMÁTICAS DA IA — fadiga, cartões, tática
// ============================================================

const AI_SUB_MINUTE = 58;
const AI_SUB_MAX = 5;
const FATIGUE_SUB_THRESHOLD = 0.42;
const YELLOW_FATIGUE_THRESHOLD = 0.25;
const TACTICAL_SUB_MINUTES = [60, 68, 76];

function getBenchPlayers(team: Team, state: LiveMatchState, side: 'home' | 'away'): Player[] {
  const sentOff = new Set(state.sentOff?.[side] ?? []);
  const matchInjured = new Set((state.matchInjuries ?? []).map(mi => mi.playerId));
  return team.squad.filter(p =>
    !team.startingXI.includes(p.id) &&
    !sentOff.has(p.id) &&
    !matchInjured.has(p.id) &&
    !p.injury?.active,
  );
}

function findBestReplacement(bench: Player[], preferPosition?: string): Player | null {
  if (bench.length === 0) return null;
  const matching = preferPosition ? bench.filter(p => p.position === preferPosition) : [];
  const pool = matching.length > 0 ? matching : bench;
  return pool.reduce((best, p) =>
    p.currentAbility > best.currentAbility ? p : best,
  );
}

function countSubs(state: LiveMatchState, side: 'home' | 'away'): number {
  return state.events.filter(e => e.type === 'substitution' && e.team === side).length;
}

function tryAISub(
  team: Team,
  side: 'home' | 'away',
  state: LiveMatchState,
  minute: number,
  ownGoals: number,
  opponentGoals: number,
): { team: Team; state: LiveMatchState } | null {
  if (countSubs(state, side) >= AI_SUB_MAX) return null;

  const xi = startingXI(team);
  const fatigue = state.fatigue ?? {};
  const cards = state.cards ?? {};
  const injuredIds = new Set((state.matchInjuries ?? []).filter(mi => mi.side === side).map(mi => mi.playerId));
  const bench = getBenchPlayers(team, state, side);
  if (bench.length === 0 || xi.length === 0) return null;

  const goalDiff = ownGoals - opponentGoals;

  let bestCandidate: { player: Player; priority: number; preferPos?: string } | null = null;

  // Prioridade 4: jogador lesionado durante a partida — substituição imediata
  for (const p of xi) {
    if (injuredIds.has(p.id)) {
      bestCandidate = { player: p, priority: 4, preferPos: p.position };
      break;
    }
  }

  // Lesionado é emergência — ignora minuto mínimo e probGate
  if (bestCandidate && bestCandidate.priority === 4) {
    const replacement = findBestReplacement(bench, bestCandidate.preferPos);
    if (!replacement) return null;
    const outPlayer = bestCandidate.player;
    const newXI = team.startingXI.map(id => id === outPlayer.id ? replacement.id : id);
    const newTeam = { ...team, startingXI: newXI };
    const subEvent: MatchEvent = {
      minute,
      type: 'substitution',
      team: side,
      player: replacement.name,
      description: `Substituição da IA (lesão): sai ${outPlayer.name}, entra ${replacement.name}`,
    };
    const newState: LiveMatchState = {
      ...state,
      events: [...state.events, subEvent],
      ballHolderId: state.ballHolderId === outPlayer.id ? replacement.id : state.ballHolderId,
    };
    return { team: newTeam, state: newState };
  }

  // Demais critérios só a partir do minuto mínimo
  if (minute < AI_SUB_MINUTE) return null;

  for (const p of xi) {
    const pFatigue = fatigue[p.id] ?? 0;
    const pCards = cards[p.id] ?? 0;

    if (pFatigue > FATIGUE_SUB_THRESHOLD) {
      if (!bestCandidate || bestCandidate.priority < 3) {
        bestCandidate = { player: p, priority: 3, preferPos: p.position };
      }
      continue;
    }

    if (pCards >= 1 && pFatigue > YELLOW_FATIGUE_THRESHOLD) {
      if (!bestCandidate || bestCandidate.priority < 2) {
        bestCandidate = { player: p, priority: 2, preferPos: p.position };
      }
      continue;
    }
  }

  if (TACTICAL_SUB_MINUTES.includes(minute) && (!bestCandidate || bestCandidate.priority < 1)) {
    if (goalDiff <= -2) {
      const defs = xi.filter(p => p.position === 'DEF').sort((a, b) => a.currentAbility - b.currentAbility);
      if (defs.length > 2) {
        bestCandidate = { player: defs[0], priority: 1, preferPos: 'FWD' };
      }
    } else if (goalDiff >= 2) {
      const fwds = xi.filter(p => p.position === 'FWD').sort((a, b) => a.currentAbility - b.currentAbility);
      if (fwds.length > 1) {
        bestCandidate = { player: fwds[0], priority: 1, preferPos: 'DEF' };
      }
    }
  }

  if (!bestCandidate) return null;

  const probGate: Record<number, number> = { 1: 0.5, 2: 0.2, 3: 0.35 };
  if (_matchRng() > (probGate[bestCandidate.priority] ?? 0.3)) return null;

  const replacement = findBestReplacement(bench, bestCandidate.preferPos);
  if (!replacement) return null;

  const outPlayer = bestCandidate.player;
  const newXI = team.startingXI.map(id => id === outPlayer.id ? replacement.id : id);
  const newTeam = { ...team, startingXI: newXI };

  const subEvent: MatchEvent = {
    minute,
    type: 'substitution',
    team: side,
    player: replacement.name,
    description: `Substituição da IA: sai ${outPlayer.name}, entra ${replacement.name}`,
  };

  const newState: LiveMatchState = {
    ...state,
    events: [...state.events, subEvent],
    ballHolderId: state.ballHolderId === outPlayer.id ? replacement.id : state.ballHolderId,
  };

  return { team: newTeam, state: newState };
}

export function performAISubs(
  homeTeam: Team,
  awayTeam: Team,
  state: LiveMatchState,
  minute: number,
  sidesToManage: ('home' | 'away')[],
): { homeTeam: Team; awayTeam: Team; state: LiveMatchState } {
  let ht = homeTeam;
  let at = awayTeam;
  let st = state;

  if (sidesToManage.includes('home')) {
    const result = tryAISub(ht, 'home', st, minute, st.homeGoals, st.awayGoals);
    if (result) { ht = result.team; st = result.state; }
  }

  if (sidesToManage.includes('away')) {
    const result = tryAISub(at, 'away', st, minute, st.awayGoals, st.homeGoals);
    if (result) { at = result.team; st = result.state; }
  }

  const _rng = _matchRng as Rng & { state: () => number };
  if (typeof _rng.state === 'function') {
    st = { ...st, rngState: _rng.state() };
  }

  return { homeTeam: ht, awayTeam: at, state: st };
}

// Simula 1 minuto de jogo: vários lances (ticks) conforme o ritmo tático,
// com fadiga acumulada, momentum e acréscimos ao fim do tempo regulamentar.
// v1 (implementação original)
export function simulateMinuteV1(
  homeTeam: Team,
  awayTeam: Team,
  state: LiveMatchState,
  minute: number,
): LiveMatchState {
  // Restaura PRNG do estado da partida para continuação determinística
  if (state.seed !== undefined && state.rngState !== undefined) {
    const rng = mulberry32(state.rngState);
    _matchRng = rng;
  } else if (state.seed !== undefined) {
    const rng = mulberry32(state.seed);
    _matchRng = rng;
  } else {
    _matchRng = Math.random;
  }
  const _rng = _matchRng as Rng & { state: () => number };

  let st = state;
  // E-18: startingXI filtra expulsos via _matchSentOff — sincroniza antes da fadiga
  _matchSentOff = new Set([...(state.sentOff?.home ?? []), ...(state.sentOff?.away ?? [])]);
  _matchInjured = new Set((state.matchInjuries ?? []).map(mi => mi.playerId));

  // Recomeço do 2º tempo: bola volta ao centro
  if (minute === 46) {
    const homeKicks = _matchRng() < 0.5;
    const kickTeam = homeKicks ? homeTeam : awayTeam;
    const holder = pickPlayerWithBall(kickTeam, 0.5, homeKicks);
    st = { ...st, possession: homeKicks ? 'home' : 'away', ballPos: 0.5, ballPosY: 0.5, ballHolderId: holder.id, passChain: 0 };
  }

  // Fadiga acumula uma vez por minuto
  st = { ...st, fatigue: nextFatigue(homeTeam, awayTeam, st) };

  // Verificar lesões por fadiga acumulada (uma vez por minuto, por jogador em campo)
  const fatigueMap = st.fatigue ?? {};
  for (const team of [homeTeam, awayTeam]) {
    const side = team === homeTeam ? 'home' : 'away';
    for (const p of startingXI(team)) {
      if (_matchInjured.has(p.id)) continue;
      const pFatigue = fatigueMap[p.id] ?? 0;
      const pProneness = p.hidden?.injuryProneness ?? 5;
      if (_matchRng() < fatigueInjuryChance(pFatigue, team.tempo, pProneness)) {
        const injResult = triggerMatchInjury(p, side, minute, st);
        st = injResult.state;
        st.events = [...st.events, injResult.event];
      }
    }
  }

  const ticks = ticksPerMinute(homeTeam, awayTeam);
  for (let t = 0; t < ticks; t++) {
    st = simulateTick(homeTeam, awayTeam, st, minute);
    // Momentum decai naturalmente rumo ao equilíbrio
    st.momentum = clamp((st.momentum ?? 0) * 0.99, -1, 1);
  }

  // Acréscimos do 2º tempo: definidos aos 89' com base nos eventos que pararam o jogo
  if (minute >= 89 && st.addedTime === undefined) {
    const stoppages = st.events.filter(e =>
      e.minute > 45 && (e.type === 'goal' || e.type === 'red' || e.type === 'substitution')).length;
    st = { ...st, addedTime: Math.min(6, Math.max(1, Math.round(1 + stoppages * 0.5 + _matchRng() * 2))) };
  }

  // Salva estado do PRNG para próxima chamada
  if (typeof _rng.state === 'function') {
    st = { ...st, rngState: _rng.state() };
  }
  return st;
}

// Simula 1 minuto de jogo — v2 (Fase 3: progressão por fases)
export function simulateMinuteV2(
  homeTeam: Team,
  awayTeam: Team,
  state: LiveMatchState,
  minute: number,
): LiveMatchState {
  // Restaura PRNG do estado da partida para continuação determinística
  if (state.seed !== undefined && state.rngState !== undefined) {
    const rng = mulberry32(state.rngState);
    _matchRng = rng;
  } else if (state.seed !== undefined) {
    const rng = mulberry32(state.seed);
    _matchRng = rng;
  } else {
    _matchRng = Math.random;
  }
  const _rng = _matchRng as Rng & { state: () => number };

  let st = state;
  // E-18: startingXI filtra expulsos via _matchSentOff — sincroniza antes da fadiga
  _matchSentOff = new Set([...(state.sentOff?.home ?? []), ...(state.sentOff?.away ?? [])]);
  _matchInjured = new Set((state.matchInjuries ?? []).map(mi => mi.playerId));

  // Recomeço do 2º tempo: bola volta ao centro
  if (minute === 46) {
    const homeKicks = _matchRng() < 0.5;
    const kickTeam = homeKicks ? homeTeam : awayTeam;
    const holder = pickPlayerWithBall(kickTeam, 0.5, homeKicks);
    st = { ...st, possession: homeKicks ? 'home' : 'away', ballPos: 0.5, ballPosY: 0.5, ballHolderId: holder.id, passChain: 0 };
  }

  // Fadiga acumula uma vez por minuto
  st = { ...st, fatigue: nextFatigue(homeTeam, awayTeam, st) };

  // Verificar lesões por fadiga acumulada (uma vez por minuto, por jogador em campo)
  const fatigueMap = st.fatigue ?? {};
  for (const team of [homeTeam, awayTeam]) {
    const side = team === homeTeam ? 'home' : 'away';
    for (const p of startingXI(team)) {
      if (_matchInjured.has(p.id)) continue;
      const pFatigue = fatigueMap[p.id] ?? 0;
      const pProneness = p.hidden?.injuryProneness ?? 5;
      if (_matchRng() < fatigueInjuryChance(pFatigue, team.tempo, pProneness)) {
        const injResult = triggerMatchInjury(p, side, minute, st);
        st = injResult.state;
        st.events = [...st.events, injResult.event];
      }
    }
  }

  // Reset do log de duelos no início da partida
  if (minute === 1) {
    resetPhaseState();
  }

  const ticks = ticksPerMinute(homeTeam, awayTeam);
  for (let t = 0; t < ticks; t++) {
    st = simulateTickV2(homeTeam, awayTeam, st, minute, _matchRng);
    // Momentum decai naturalmente rumo ao equilíbrio
    st.momentum = clamp((st.momentum ?? 0) * 0.99, -1, 1);
  }

  // Acréscimos do 2º tempo: definidos aos 89' com base nos eventos que pararam o jogo
  if (minute >= 89 && st.addedTime === undefined) {
    const stoppages = st.events.filter(e =>
      e.minute > 45 && (e.type === 'goal' || e.type === 'red' || e.type === 'substitution')).length;
    st = { ...st, addedTime: Math.min(6, Math.max(1, Math.round(1 + stoppages * 0.5 + _matchRng() * 2))) };
  }

  // Salva estado do PRNG para próxima chamada
  if (typeof _rng.state === 'function') {
    st = { ...st, rngState: _rng.state() };
  }

  return st;
}

// Wrapper público — delega para v1 ou v2 conforme flag MATCH_ENGINE
export function simulateMinute(
  homeTeam: Team,
  awayTeam: Team,
  state: LiveMatchState,
  minute: number,
): LiveMatchState {
  return isV2
    ? simulateMinuteV2(homeTeam, awayTeam, state, minute)
    : simulateMinuteV1(homeTeam, awayTeam, state, minute);
}

// Simula uma partida completa (para AI vs AI e auto-finalizar)
// Roda 90 minutos de simulação passo a passo
// v1 (implementação original)
export function simulateFullMatchV1(homeTeam: Team, awayTeam: Team, homeBoost = 0, awayBoost = 0, seed?: number): MatchResult & { playerRatings: PlayerMatchRating[]; bestPlayer?: string; postMatchReport?: PostMatchReport; matchInjuries?: { playerId: string; side: 'home' | 'away' }[] } {
  let ht = homeTeam;
  let at = awayTeam;
  let state = initLiveMatchStateV1(ht, at, seed);

  // Aplica boosts de intervenção
  if (homeBoost > 0) {
    state.interventionBoost = { team: 'home', type: 'boost', untilMinute: 90 };
  }
  if (awayBoost > 0) {
    state.interventionBoost = { team: 'away', type: 'boost', untilMinute: 90 };
  }

  // 90 minutos + acréscimos (addedTime é definido pelo próprio motor aos 89')
  for (let minute = 1; minute <= 90 + (state.addedTime ?? 0); minute++) {
    state = simulateMinuteV1(ht, at, state, minute);
    const subResult = performAISubs(ht, at, state, minute, ['home', 'away']);
    ht = subResult.homeTeam;
    at = subResult.awayTeam;
    state = subResult.state;
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

  // E-18: Limpar sentOff para que calculatePlayerMatchRatings inclua expulsos (com minutesPlayed reduzido).
  _matchSentOff = new Set();
  _matchInjured = new Set();

  // Restaura PRNG do estado final para ratings e relatório determinísticos
  if (state.seed !== undefined && state.rngState !== undefined) {
    _matchRng = mulberry32(state.rngState);
  } else if (state.seed !== undefined) {
    _matchRng = mulberry32(state.seed);
  }

  const withRatings = calculatePlayerMatchRatings(ht, at, result);
  const postMatchReport = generatePostMatchReport(ht, at, result, state.actions);
  return { ...withRatings, postMatchReport, matchInjuries: state.matchInjuries ?? [] };
}

// Simula uma partida completa — v2 (Fase 3: progressão por fases)
export function simulateFullMatchV2(homeTeam: Team, awayTeam: Team, homeBoost = 0, awayBoost = 0, seed?: number): MatchResult & { playerRatings: PlayerMatchRating[]; bestPlayer?: string; postMatchReport?: PostMatchReport; matchInjuries?: { playerId: string; side: 'home' | 'away' }[] } {
  let ht = homeTeam;
  let at = awayTeam;
  let state = initLiveMatchStateV1(ht, at, seed);

  // Aplica boosts de intervenção
  if (homeBoost > 0) {
    state.interventionBoost = { team: 'home', type: 'boost', untilMinute: 90 };
  }
  if (awayBoost > 0) {
    state.interventionBoost = { team: 'away', type: 'boost', untilMinute: 90 };
  }

  // 90 minutos + acréscimos (addedTime é definido pelo próprio motor aos 89')
  for (let minute = 1; minute <= 90 + (state.addedTime ?? 0); minute++) {
    state = simulateMinuteV2(ht, at, state, minute);
    const subResult = performAISubs(ht, at, state, minute, ['home', 'away']);
    ht = subResult.homeTeam;
    at = subResult.awayTeam;
    state = subResult.state;
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
    stats,
    events,
    goalDetails: state.goalDetails,
  };

  // Restaura PRNG do estado final para ratings e relatório determinísticos
  if (state.seed !== undefined && state.rngState !== undefined) {
    _matchRng = mulberry32(state.rngState);
  } else if (state.seed !== undefined) {
    _matchRng = mulberry32(state.seed);
  }

  const withRatings = calculatePlayerMatchRatings(ht, at, result);
  const postMatchReport = generatePostMatchReport(ht, at, result, state.actions);
  return { ...withRatings, postMatchReport, matchInjuries: state.matchInjuries ?? [] };
}

// Wrapper público — delega para v1 ou v2 conforme flag MATCH_ENGINE
export function simulateFullMatch(homeTeam: Team, awayTeam: Team, homeBoost = 0, awayBoost = 0, seed?: number): MatchResult & { playerRatings: PlayerMatchRating[]; bestPlayer?: string; postMatchReport?: PostMatchReport; matchInjuries?: { playerId: string; side: 'home' | 'away' }[] } {
  return isV2
    ? simulateFullMatchV2(homeTeam, awayTeam, homeBoost, awayBoost, seed)
    : simulateFullMatchV1(homeTeam, awayTeam, homeBoost, awayBoost, seed);
}
