import type { Match, Team } from '../types/game';

// Calibration knobs — a live win-probability model is only as good as its prior.
const BASE = 1.35;      // per-team full-match expected goals at strength parity
const HOME_ADV = 1.15;  // home multiplier on expected goals
const MAX_GOALS = 8;    // Poisson truncation (P beyond this is negligible)

/**
 * Strength proxy: mean current ability of the starting XI (falls back to the
 * best 11 in the squad, then to reputation). This is the model's prior — tune
 * BASE/HOME_ADV against real results if the curve feels off.
 */
export function teamStrength(team: Team | undefined): number {
  if (!team) return 100;
  const byId = new Map(team.squad.map(p => [p.id, p]));
  const xi = team.startingXI.map(id => byId.get(id)).filter(Boolean) as Team['squad'];
  const pool = xi.length >= 7
    ? xi
    : [...team.squad].sort((a, b) => b.currentAbility - a.currentAbility).slice(0, 11);
  if (pool.length === 0) return Math.max(40, team.reputation * 2);
  return pool.reduce((s, p) => s + p.currentAbility, 0) / pool.length;
}

function poisson(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

export interface WinProb { home: number; draw: number; away: number }
export interface MomentumPoint extends WinProb { minute: number }
export interface GoalMark { minute: number; team: 'home' | 'away' }

/**
 * Live win probability from the current score, minute, and pre-match strengths.
 * Remaining goals are modelled as independent Poisson variables over the time
 * left, then summed with the current score into win/draw/loss outcomes.
 */
export function computeWinProb(gh: number, ga: number, minute: number, strH: number, strA: number): WinProb {
  const ratio = Math.sqrt(Math.max(strH, 1) / Math.max(strA, 1));
  const lamHFull = BASE * ratio * HOME_ADV;
  const lamAFull = (BASE / ratio) / HOME_ADV;
  const f = Math.min(Math.max((90 - minute) / 90, 0), 1);
  const lamH = lamHFull * f;
  const lamA = lamAFull * f;

  const ph = Array.from({ length: MAX_GOALS + 1 }, (_, i) => poisson(i, lamH));
  const pa = Array.from({ length: MAX_GOALS + 1 }, (_, j) => poisson(j, lamA));

  let pH = 0, pD = 0, pA = 0;
  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const prob = ph[i] * pa[j];
      const fh = gh + i, fa = ga + j;
      if (fh > fa) pH += prob;
      else if (fh < fa) pA += prob;
      else pD += prob;
    }
  }
  const total = pH + pD + pA || 1;
  return { home: (pH / total) * 100, draw: (pD / total) * 100, away: (pA / total) * 100 };
}

/** Extract the goal timeline (minute + side) from a match event list. */
export function goalsFromEvents(events: { type: string; minute: number; team: 'home' | 'away' }[] | undefined): GoalMark[] {
  return (events ?? [])
    .filter(e => e.type === 'goal')
    .map(e => ({ minute: e.minute, team: e.team }))
    .sort((a, b) => a.minute - b.minute);
}

/** Goal timeline for a match, preferring the precise engine goalDetails. */
export function goalsFromMatch(match: Match, live: boolean): GoalMark[] {
  const gd = match.liveMatchState?.goalDetails;
  if (gd && gd.length) {
    return gd.map(g => ({ minute: g.minute, team: g.team })).sort((a, b) => a.minute - b.minute);
  }
  return goalsFromEvents(live ? match.liveEvents : match.events);
}

/** Win-probability curve from minute 0 to `upto`, given the goal timeline. */
export function buildMomentum(goals: GoalMark[], strH: number, strA: number, upto = 90): MomentumPoint[] {
  const pts: MomentumPoint[] = [];
  for (let m = 0; m <= upto; m++) {
    let gh = 0, ga = 0;
    for (const g of goals) {
      if (g.minute <= m) { if (g.team === 'home') gh++; else ga++; }
    }
    pts.push({ minute: m, ...computeWinProb(gh, ga, m, strH, strA) });
  }
  return pts;
}
