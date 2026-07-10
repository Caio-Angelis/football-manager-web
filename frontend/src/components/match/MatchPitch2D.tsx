import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Team, Player, MatchEvent } from '../../types/game';
import { getFullName } from '../../utils/player';
import { getTeamDiscColor as getTeamColor } from '../../utils/teamColors';
import { fmtMinute } from '../../utils/matchTime';
import { MatchEventIcon } from '../ui/MatchEventIcon';
import './MatchPitch2D.css';

// ============================================================
// POSICIONAMENTO DOS DISCOS POR FORMAÇÃO
// Internal coords: x = length (0 home goal → 100 away), y = width
// ============================================================

interface DiscPos {
  player: Player;
  x: number;
  y: number;
  number: number;
}

const LINE_DEPTHS = { gk: 6, def: 21, mid: 35, fwd: 46 };

function buildPositions(team: Team, side: 'home' | 'away'): DiscPos[] {
  const ids = team.startingXI;
  let xi: Player[];
  if (ids && ids.length > 0) {
    xi = ids.map(id => team.squad.find(p => p.id === id)).filter(Boolean) as Player[];
    if (xi.length === 0) xi = team.squad.slice(0, 11);
  } else {
    xi = team.squad.slice(0, 11);
  }
  if (xi.length === 0) return [];

  const gk = xi.find(p => p.position === 'GK') ?? xi[0];
  const others = xi.filter(p => p !== gk);
  const def = others.filter(p => p.position === 'DEF' || p.position === 'GK');
  const fwd = others.filter(p => p.position === 'FWD');
  const mid = others.filter(p => p.position !== 'DEF' && p.position !== 'FWD' && p.position !== 'GK');

  const lines: { players: Player[]; depth: number }[] = [
    { players: [gk], depth: LINE_DEPTHS.gk },
    { players: def, depth: LINE_DEPTHS.def },
    { players: mid, depth: LINE_DEPTHS.mid },
    { players: fwd, depth: LINE_DEPTHS.fwd },
  ];

  const result: DiscPos[] = [];
  let number = 1;
  lines.forEach(line => {
    const n = line.players.length;
    line.players.forEach((p, i) => {
      const yFrac = n === 1 ? 0.5 : 0.14 + (i / (n - 1)) * 0.72;
      const xFrac = side === 'home' ? line.depth / 100 : 1 - line.depth / 100;
      result.push({ player: p, x: xFrac * 100, y: yFrac * 100, number });
      number += 1;
    });
  });
  return result;
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

const POS_RANGE: Record<string, { xMin: number; xMax: number; yMin: number; yMax: number }> = {
  GK: { xMin: 1, xMax: 14, yMin: 30, yMax: 70 },
  DEF: { xMin: 5, xMax: 60, yMin: 2, yMax: 98 },
  MID: { xMin: 18, xMax: 82, yMin: 2, yMax: 98 },
  FWD: { xMin: 30, xMax: 95, yMin: 5, yMax: 95 },
};

function computeShiftedPositions(
  base: DiscPos[],
  side: 'home' | 'away',
  ballX: number,
  ballY: number,
  hasBall: boolean,
): DiscPos[] {
  const attackDir = side === 'home' ? 1 : -1;
  const ballAttackProgress =
    side === 'home' ? ballX / 100 : (100 - ballX) / 100;

  const dists = base.map((d, i) => ({
    i,
    dist: Math.hypot(d.x - ballX, d.y - ballY),
  }));
  const sorted = [...dists].sort((a, b) => a.dist - b.dist);
  const closestIdx = sorted[0]?.i ?? 0;
  const secondClosestIdx = sorted[1]?.i ?? -1;

  return base.map((d, i) => {
    const pos = d.player.position;
    const range = POS_RANGE[pos] ?? POS_RANGE.MID;

    let blockShiftX: number;
    if (hasBall) {
      blockShiftX = attackDir * ballAttackProgress * 22;
    } else {
      blockShiftX = -attackDir * (1 - ballAttackProgress) * 20;
    }

    const blockShiftY = (ballY - 50) * 0.22;

    let indivX = 0;
    let indivY = 0;

    if (pos === 'GK') {
      indivY = (ballY - 50) * 0.25;
      if (!hasBall && ballAttackProgress < 0.2) {
        indivX = attackDir * 4;
      }
    } else if (pos === 'DEF') {
      if (hasBall) {
        indivX = attackDir * ballAttackProgress * 18;
        const sideFactor = d.y > 50 ? 1 : -1;
        if (Math.abs(d.y - 50) > 20) {
          indivY = sideFactor * ballAttackProgress * 8;
          indivX += attackDir * 6;
        }
      } else {
        indivX = -attackDir * (1 - ballAttackProgress) * 8;
        indivY = (ballY - d.y) * 0.15;
      }
    } else if (pos === 'MID') {
      if (hasBall) {
        indivX = attackDir * ballAttackProgress * 28;
        const ballSide = ballY > 50 ? 1 : -1;
        const playerSide = d.y > 50 ? 1 : -1;
        if (playerSide === ballSide) {
          indivY = ballSide * 6;
        }
      } else {
        indivX = -attackDir * (1 - ballAttackProgress) * 14;
        if (i === closestIdx) {
          indivX += (ballX - d.x) * 0.35;
          indivY += (ballY - d.y) * 0.35;
        }
      }
    } else if (pos === 'FWD') {
      if (hasBall) {
        indivX = attackDir * (ballAttackProgress * 10 + 8);
        const playerSide = d.y > 50 ? 1 : -1;
        indivY = playerSide * Math.sin(ballAttackProgress * Math.PI) * 5;
      } else {
        indivX = -attackDir * (1 - ballAttackProgress) * 25;
        if (i === closestIdx) {
          indivX += (ballX - d.x) * 0.4;
          indivY += (ballY - d.y) * 0.4;
        }
      }
    }

    if (i === closestIdx && pos !== 'GK') {
      const dx = ballX - d.x;
      const dy = ballY - d.y;
      const pursuit = hasBall ? 0.5 : 0.55;
      indivX += dx * pursuit;
      indivY += dy * pursuit;
    } else if (i === secondClosestIdx && !hasBall && pos !== 'GK') {
      const dx = ballX - d.x;
      const dy = ballY - d.y;
      indivX += dx * 0.25;
      indivY += dy * 0.25;
    }

    if (i !== closestIdx && i !== secondClosestIdx) {
      const ballSide = ballY > 50 ? 1 : -1;
      const playerSide = d.y > 50 ? 1 : -1;
      if (playerSide !== ballSide) {
        indivY -= ballSide * 4;
      }
    }

    indivX += (Math.random() - 0.5) * 2;
    indivY += (Math.random() - 0.5) * 2;

    const rawX = d.x + blockShiftX + indivX;
    const rawY = d.y + blockShiftY + indivY;

    const adjRange = side === 'home'
      ? range
      : { xMin: 100 - range.xMax, xMax: 100 - range.xMin, yMin: range.yMin, yMax: range.yMax };

    return {
      ...d,
      x: clamp(rawX, adjRange.xMin, adjRange.xMax),
      y: clamp(rawY, adjRange.yMin, adjRange.yMax),
    };
  });
}

/** Map internal (length, width) → CSS % for board (horizontal) or classic (vertical). */
function toScreen(x: number, y: number, classic: boolean): { left: number; top: number } {
  if (classic) {
    // Home attacks UP: length 0 (home goal) → bottom, length 100 → top
    return { left: y, top: 100 - x };
  }
  return { left: x, top: y };
}

const PitchMarkings: React.FC<{ classic?: boolean }> = ({ classic }) => {
  if (classic) {
    return (
      <svg className="fm-pitch2d__markings" viewBox="0 0 100 160" preserveAspectRatio="none">
        <g stroke="var(--pitch-line)" strokeWidth="0.7" fill="none">
          <rect x="2" y="2" width="96" height="156" />
          <line x1="2" y1="80" x2="98" y2="80" />
          <circle cx="50" cy="80" r="14" />
          <circle cx="50" cy="80" r="1" fill="var(--pitch-line)" stroke="none" />
          <rect x="22" y="2" width="56" height="26" />
          <rect x="34" y="2" width="32" height="12" />
          <path d="M34 28 A 14 14 0 0 0 66 28" />
          <rect x="22" y="132" width="56" height="26" />
          <rect x="34" y="146" width="32" height="12" />
          <path d="M34 132 A 14 14 0 0 1 66 132" />
          <rect x="42" y="0" width="16" height="2" fill="var(--pitch-line)" stroke="none" opacity="0.55" />
          <rect x="42" y="158" width="16" height="2" fill="var(--pitch-line)" stroke="none" opacity="0.55" />
        </g>
      </svg>
    );
  }

  return (
    <svg className="fm-pitch2d__markings" viewBox="0 0 160 100" preserveAspectRatio="none">
      <g stroke="var(--pitch-line)" strokeWidth="0.6" fill="none">
        <rect x="2" y="2" width="156" height="96" rx="2" />
        <line x1="80" y1="2" x2="80" y2="98" />
        <circle cx="80" cy="50" r="11" />
        <circle cx="80" cy="50" r="0.9" fill="var(--pitch-line)" stroke="none" />
        <rect x="2" y="26" width="20" height="48" />
        <rect x="2" y="38" width="8" height="24" />
        <path d="M22 39 A 12 12 0 0 1 22 61" />
        <rect x="138" y="26" width="20" height="48" />
        <rect x="150" y="38" width="8" height="24" />
        <path d="M138 39 A 12 12 0 0 0 138 61" />
        <rect x="0" y="42" width="2" height="16" fill="var(--pitch-line)" stroke="none" opacity="0.5" />
        <rect x="158" y="42" width="2" height="16" fill="var(--pitch-line)" stroke="none" opacity="0.5" />
      </g>
    </svg>
  );
};

const LINE_POSITIONS: Record<string, { engagement: number; defensive: number }> = {
  high: { engagement: 68, defensive: 58 },
  medium: { engagement: 50, defensive: 42 },
  low: { engagement: 32, defensive: 25 },
};

const TacticalLines: React.FC<{ homeTeam: Team; awayTeam: Team; isLive: boolean; classic?: boolean }> = ({
  homeTeam, awayTeam, isLive, classic,
}) => {
  const homeEng = homeTeam.engagementLine ?? 'medium';
  const homeDef = homeTeam.defensiveLine ?? 'medium';
  const awayEng = awayTeam.engagementLine ?? 'medium';
  const awayDef = awayTeam.defensiveLine ?? 'medium';

  if (classic) {
    const homeEngY = 160 - (LINE_POSITIONS[homeEng]?.engagement ?? 50) * 1.6;
    const homeDefY = 160 - (LINE_POSITIONS[homeDef]?.defensive ?? 42) * 1.6;
    const awayEngY = (LINE_POSITIONS[awayEng]?.engagement ?? 50) * 1.6;
    const awayDefY = (LINE_POSITIONS[awayDef]?.defensive ?? 42) * 1.6;
    return (
      <svg className="fm-pitch2d__tactical-lines" viewBox="0 0 100 160" preserveAspectRatio="none">
        <line x1="2" y1={homeEngY} x2="98" y2={homeEngY}
          stroke="#22c55e" strokeWidth="0.5" strokeDasharray="3 2" opacity={isLive ? 0.45 : 0.3} />
        <line x1="2" y1={homeDefY} x2="98" y2={homeDefY}
          stroke="#86efac" strokeWidth="0.5" strokeDasharray="2 2" opacity={isLive ? 0.35 : 0.22} />
        <line x1="2" y1={awayEngY} x2="98" y2={awayEngY}
          stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="3 2" opacity={isLive ? 0.45 : 0.3} />
        <line x1="2" y1={awayDefY} x2="98" y2={awayDefY}
          stroke="#93c5fd" strokeWidth="0.5" strokeDasharray="2 2" opacity={isLive ? 0.35 : 0.22} />
      </svg>
    );
  }

  const homeEngX = LINE_POSITIONS[homeEng]?.engagement ?? 50;
  const homeDefX = LINE_POSITIONS[homeDef]?.defensive ?? 42;
  const awayEngX = 160 - (LINE_POSITIONS[awayEng]?.engagement ?? 50);
  const awayDefX = 160 - (LINE_POSITIONS[awayDef]?.defensive ?? 42);

  return (
    <svg className="fm-pitch2d__tactical-lines" viewBox="0 0 160 100" preserveAspectRatio="none">
      <line x1={homeEngX} y1="2" x2={homeEngX} y2="98"
        stroke="#22c55e" strokeWidth="0.5" strokeDasharray="3 2" opacity={isLive ? 0.5 : 0.35} />
      <line x1={homeDefX} y1="2" x2={homeDefX} y2="98"
        stroke="#86efac" strokeWidth="0.5" strokeDasharray="2 2" opacity={isLive ? 0.4 : 0.25} />
      <line x1={awayEngX} y1="2" x2={awayEngX} y2="98"
        stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="3 2" opacity={isLive ? 0.5 : 0.35} />
      <line x1={awayDefX} y1="2" x2={awayDefX} y2="98"
        stroke="#93c5fd" strokeWidth="0.5" strokeDasharray="2 2" opacity={isLive ? 0.4 : 0.25} />
    </svg>
  );
};

export type MatchPitchVariant = 'board' | 'classic';

interface MatchPitch2DProps {
  homeTeam: Team;
  awayTeam: Team;
  homeGoals: number;
  awayGoals: number;
  minute: number;
  possession: number;
  events: MatchEvent[];
  isLive: boolean;
  ballPos?: number;
  ballPosY?: number;
  ballHolderId?: string;
  possessionSide?: 'home' | 'away';
  speed?: number;
  /** board = horizontal with chrome; classic = vertical FM-style field only */
  variant?: MatchPitchVariant;
  showTacticalLines?: boolean;
}

export const MatchPitch2D: React.FC<MatchPitch2DProps> = ({
  homeTeam, awayTeam, homeGoals, awayGoals, minute, possession, events, isLive,
  ballPos, ballPosY, ballHolderId, possessionSide, speed = 1,
  variant = 'board',
  showTacticalLines = true,
}) => {
  const classic = variant === 'classic';
  const homePositions = useMemo(() => buildPositions(homeTeam, 'home'), [homeTeam]);
  const awayPositions = useMemo(() => buildPositions(awayTeam, 'away'), [awayTeam]);

  const homeColor = getTeamColor(homeTeam.name, homeTeam.reputation);
  let awayColor = getTeamColor(awayTeam.name, awayTeam.reputation);
  if (awayColor === homeColor) awayColor = getTeamColor(awayTeam.name, awayTeam.reputation, 3);
  if (awayColor === homeColor) awayColor = '#d64545';

  const [ball, setBall] = useState({ x: 50, y: 50 });
  const [celebration, setCelebration] = useState<{ side: 'home' | 'away'; scorer?: string; minute: number } | null>(null);
  const [flashName, setFlashName] = useState<string | undefined>();
  const [homeDyn, setHomeDyn] = useState<DiscPos[]>(homePositions);
  const [awayDyn, setAwayDyn] = useState<DiscPos[]>(awayPositions);
  const scoreRef = useRef({ h: homeGoals, a: awayGoals });
  const celebratingRef = useRef(false);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => { setHomeDyn(homePositions); }, [homePositions]);
  useEffect(() => { setAwayDyn(awayPositions); }, [awayPositions]);

  useEffect(() => {
    if (!isLive) return;

    if (ballPos !== undefined) {
      const targetX = ballPos * 100;
      const targetY = ballPosY !== undefined ? ballPosY * 100 : 20 + Math.random() * 60;
      setBall({ x: targetX, y: targetY });
      const homeHasBall = possessionSide === 'home';
      setHomeDyn(computeShiftedPositions(homePositions, 'home', targetX, targetY, homeHasBall));
      setAwayDyn(computeShiftedPositions(awayPositions, 'away', targetX, targetY, !homeHasBall));
      return;
    }

    const homeBias = (possession || 50) / 100;
    const id = setInterval(() => {
      if (celebratingRef.current) return;
      const homeHasBall = Math.random() < homeBias;
      const positions = homeHasBall ? homePositions : awayPositions;
      if (positions.length === 0) return;

      let newBallX = 50;
      let newBallY = 50;
      const advance = Math.random();
      if (advance < 0.35) {
        newBallX = homeHasBall ? 88 + Math.random() * 8 : 4 + Math.random() * 8;
        newBallY = 30 + Math.random() * 40;
      } else {
        const sorted = [...positions].sort((a, b) =>
          homeHasBall ? b.x - a.x : a.x - b.x,
        );
        const pickPool = sorted.slice(0, Math.max(4, Math.ceil(sorted.length * 0.6)));
        const target = pickPool[Math.floor(Math.random() * pickPool.length)];
        if (target) {
          newBallX = target.x + (Math.random() * 4 - 2);
          newBallY = target.y + (Math.random() * 6 - 3);
        }
      }

      setBall({ x: newBallX, y: newBallY });
      setHomeDyn(computeShiftedPositions(homePositions, 'home', newBallX, newBallY, homeHasBall));
      setAwayDyn(computeShiftedPositions(awayPositions, 'away', newBallX, newBallY, !homeHasBall));
    }, 700 / speed);
    return () => clearInterval(id);
  }, [isLive, possession, homePositions, awayPositions, ballPos, ballPosY, possessionSide, speed]);

  useEffect(() => {
    const prev = scoreRef.current;
    if (homeGoals > prev.h || awayGoals > prev.a) {
      const side: 'home' | 'away' = homeGoals > prev.h ? 'home' : 'away';
      const goalEvents = eventsRef.current.filter(e => e.type === 'goal' && e.team === side);
      const last = goalEvents[goalEvents.length - 1];
      celebratingRef.current = true;
      const goalX = side === 'home' ? 97 : 3;
      setBall({ x: goalX, y: 50 });
      setCelebration({ side, scorer: last?.player, minute });
      setFlashName(last?.player);
      setHomeDyn(computeShiftedPositions(homePositions, 'home', goalX, 50, side === 'home'));
      setAwayDyn(computeShiftedPositions(awayPositions, 'away', goalX, 50, side === 'away'));
    }
    scoreRef.current = { h: homeGoals, a: awayGoals };
  }, [homeGoals, awayGoals, minute, homePositions, awayPositions]);

  useEffect(() => {
    if (!celebration) return;
    if (minute >= celebration.minute + 2) {
      celebratingRef.current = false;
      setCelebration(null);
      setFlashName(undefined);
      setBall({ x: 50, y: 50 });
      setHomeDyn(homePositions);
      setAwayDyn(awayPositions);
    }
  }, [minute, celebration, homePositions, awayPositions]);

  const lastEvent = events.length > 0 ? events[events.length - 1] : null;
  const awayPossession = 100 - Math.round(possession || 50);
  const homePossessionRounded = Math.round(possession || 50);
  const labeledId = ballHolderId
    ?? (lastEvent?.player
      ? [...homeDyn, ...awayDyn].find(d => d.player.name === lastEvent.player)?.player.id
      : undefined);

  const renderDiscs = (positions: DiscPos[], color: string) =>
    positions.map(d => {
      const isFlashing = flashName && d.player.name === flashName;
      const hasBall = isLive && ballHolderId === d.player.id;
      const showLabel = classic && labeledId === d.player.id;
      const screen = toScreen(d.x, d.y, classic);
      const discStyle = classic
        ? { left: `${screen.left}%`, top: `${screen.top}%`, background: color }
        : {
            left: `${screen.left}%`,
            top: `${screen.top}%`,
            background: `radial-gradient(circle at 35% 30%, ${color}, color-mix(in srgb, ${color} 70%, #000))`,
          };
      return (
        <div
          key={d.player.id}
          className={`fm-pitch2d__player${isFlashing ? ' fm-pitch2d__player--flash' : ''}${hasBall ? ' fm-pitch2d__player--ball' : ''}`}
          style={discStyle}
          title={`${getFullName(d.player)} (${d.player.position})`}
        >
          {d.number}
          {showLabel && (
            <span className="fm-pitch2d__player-label">{d.player.name.split(' ').pop()}</span>
          )}
        </div>
      );
    });

  const ballScreen = toScreen(ball.x, ball.y, classic);

  return (
    <div className={`fm-pitch2d${classic ? ' fm-pitch2d--classic' : ''}`}>
      {!classic && (
        <div className="fm-pitch2d__scoreboard">
          <div className="fm-pitch2d__team">
            <span className="fm-pitch2d__dot" style={{ background: homeColor }} />
            <span className="fm-pitch2d__team-name">{homeTeam.name}</span>
          </div>
          <div className="fm-pitch2d__center">
            <span className="fm-pitch2d__score">{homeGoals} - {awayGoals}</span>
            <span className={`fm-pitch2d__clock${isLive ? ' fm-pitch2d__clock--live' : ''}`}>
              {isLive && <span className="fm-pitch2d__pulse" />}
              {isLive ? `${fmtMinute(minute)}'` : 'Final'}
            </span>
          </div>
          <div className="fm-pitch2d__team fm-pitch2d__team--away">
            <span className="fm-pitch2d__dot" style={{ background: awayColor }} />
            <span className="fm-pitch2d__team-name">{awayTeam.name}</span>
          </div>
        </div>
      )}

      <div className="fm-pitch2d__field">
        <PitchMarkings classic={classic} />
        {showTacticalLines && !classic && (
          <TacticalLines homeTeam={homeTeam} awayTeam={awayTeam} isLive={isLive} classic={classic} />
        )}
        {renderDiscs(isLive ? homeDyn : homePositions, homeColor)}
        {renderDiscs(isLive ? awayDyn : awayPositions, awayColor)}
        <div className="fm-pitch2d__ball" style={{ left: `${ballScreen.left}%`, top: `${ballScreen.top}%` }} />
        {celebration && (
          <div className="fm-pitch2d__goal-flash">
            <span className="fm-pitch2d__goal-text">GOL!</span>
            {celebration.scorer && (
              <span className="fm-pitch2d__goal-scorer">{celebration.scorer}</span>
            )}
          </div>
        )}
      </div>

      {!classic && (
        <>
          <div className="fm-pitch2d__possession">
            <span>{homePossessionRounded}%</span>
            <div className="fm-pitch2d__possession-bar">
              <span className="fm-pitch2d__possession-fill" style={{ width: `${homePossessionRounded}%`, background: homeColor }} />
              <span className="fm-pitch2d__possession-fill" style={{ width: `${awayPossession}%`, background: awayColor }} />
            </div>
            <span>{awayPossession}%</span>
          </div>
          {lastEvent && (
            <div className="fm-pitch2d__ticker">
              <span className="fm-pitch2d__ticker-icon"><MatchEventIcon type={lastEvent.type} size={13} /></span>
              <span>{lastEvent.minute}' — {lastEvent.description ?? lastEvent.type}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
