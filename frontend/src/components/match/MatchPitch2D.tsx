import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Team, Player, MatchEvent, MatchAction } from '../../types/game';
import { getFullName } from '../../utils/player';
import { getTeamDiscColor as getTeamColor } from '../../utils/teamColors';
import { fmtMinute } from '../../utils/matchTime';
import { MatchEventIcon } from '../ui/MatchEventIcon';
import { PitchMotion, type MotionPlayer } from './pitchMotion';
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

const TRAIL_LEN = 6;

// ============================================================
// CAMADA DE ATORES — discos + bola (+ rastro).
// Renderizada uma vez (estável); ao vivo, o PitchMotion escreve left/top
// direto no DOM via refs, sem que o React reposicione (evita teleporte).
// ============================================================

interface PitchActorsProps {
  homePositions: DiscPos[];
  awayPositions: DiscPos[];
  homeColor: string;
  awayColor: string;
  classic: boolean;
  isLive: boolean;
  staticBall: { left: number; top: number };
  motion: PitchMotion;
  trailRefs: React.MutableRefObject<HTMLDivElement[]>;
}

const PitchActors: React.FC<PitchActorsProps> = React.memo(({
  homePositions, awayPositions, homeColor, awayColor, classic, isLive, staticBall, motion, trailRefs,
}) => {
  const renderTeam = (positions: DiscPos[], color: string) =>
    positions.map(d => {
      const screen = toScreen(d.x, d.y, classic);
      const style: React.CSSProperties = classic
        ? { background: color }
        : { background: `radial-gradient(circle at 35% 30%, ${color}, color-mix(in srgb, ${color} 70%, #000))` };
      if (!isLive) {
        style.left = `${screen.left}%`;
        style.top = `${screen.top}%`;
      }
      return (
        <div
          key={d.player.id}
          ref={isLive ? (el => motion.registerNode(d.player.id, el)) : undefined}
          className="fm-pitch2d__player"
          style={style}
          title={`${getFullName(d.player)} (${d.player.position})`}
        >
          {d.number}
        </div>
      );
    });

  return (
    <>
      {isLive && (
        <div className="fm-pitch2d__trail-layer">
          {Array.from({ length: TRAIL_LEN }).map((_, i) => (
            <div
              key={i}
              ref={el => { if (el) trailRefs.current[i] = el; }}
              className="fm-pitch2d__trail"
              style={{ opacity: 0 }}
            />
          ))}
        </div>
      )}
      {renderTeam(homePositions, homeColor)}
      {renderTeam(awayPositions, awayColor)}
      <div
        ref={isLive ? (el => motion.registerBall(el)) : undefined}
        className="fm-pitch2d__ball"
        style={isLive ? undefined : { left: `${staticBall.left}%`, top: `${staticBall.top}%` }}
      />
    </>
  );
}, (prev, next) =>
  prev.homePositions === next.homePositions &&
  prev.awayPositions === next.awayPositions &&
  prev.homeColor === next.homeColor &&
  prev.awayColor === next.awayColor &&
  prev.classic === next.classic &&
  prev.isLive === next.isLive &&
  prev.motion === next.motion &&
  (next.isLive || (prev.staticBall.left === next.staticBall.left && prev.staticBall.top === next.staticBall.top)),
);

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
  /** Sequência de ações do minuto (passes/dribles/chutes) — usada para animar a bola. */
  actions?: MatchAction[];
  /** Congela a animação (ex.: intervalo) — tudo para na tela. */
  paused?: boolean;
  /** board = horizontal with chrome; classic = vertical FM-style field only */
  variant?: MatchPitchVariant;
  showTacticalLines?: boolean;
}

export const MatchPitch2D: React.FC<MatchPitch2DProps> = ({
  homeTeam, awayTeam, homeGoals, awayGoals, minute, possession, events, isLive,
  ballPos, ballPosY, ballHolderId, possessionSide, speed = 1, actions, paused = false,
  variant = 'board',
  showTacticalLines = true,
}) => {
  const classic = variant === 'classic';

  // Posições base ESTÁVEIS por referência (só recomputa em troca real de escalação).
  const homeSig = `${homeTeam.id}|${(homeTeam.startingXI ?? []).join(',')}`;
  const awaySig = `${awayTeam.id}|${(awayTeam.startingXI ?? []).join(',')}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const homePositions = useMemo(() => buildPositions(homeTeam, 'home'), [homeSig]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const awayPositions = useMemo(() => buildPositions(awayTeam, 'away'), [awaySig]);

  const homeColor = getTeamColor(homeTeam.name, homeTeam.reputation);
  let awayColor = getTeamColor(awayTeam.name, awayTeam.reputation);
  if (awayColor === homeColor) awayColor = getTeamColor(awayTeam.name, awayTeam.reputation, 3);
  if (awayColor === homeColor) awayColor = '#d64545';

  const [celebration, setCelebration] = useState<{ scorer?: string } | null>(null);
  const scoreRef = useRef({ h: homeGoals, a: awayGoals });
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const motionRef = useRef<PitchMotion | null>(null);
  if (!motionRef.current) motionRef.current = new PitchMotion(classic);
  const motion = motionRef.current;
  const trailRefs = useRef<HTMLDivElement[]>([]);
  const processedRef = useRef(0);
  const goalScoreRef = useRef({ h: homeGoals, a: awayGoals });

  // Sincroniza variante/escalação e posiciona tudo ANTES do primeiro paint
  // (layout effect) — evita flash em 0,0 e garante que setPlayers preceda snapAll.
  useLayoutEffect(() => {
    motion.setClassic(classic);
    if (!isLive) return;
    const players: MotionPlayer[] = [
      ...homePositions.map(d => ({ id: d.player.id, side: 'home' as const, baseX: d.x, baseY: d.y, position: d.player.position })),
      ...awayPositions.map(d => ({ id: d.player.id, side: 'away' as const, baseX: d.x, baseY: d.y, position: d.player.position })),
    ];
    motion.setPlayers(players);
    motion.registerTrail(trailRefs.current.slice(0, TRAIL_LEN));
    motion.snapAll();
  }, [motion, classic, isLive, homePositions, awayPositions]);

  // Liga/desliga o loop de animação conforme a partida está ao vivo (e não pausada).
  useEffect(() => {
    if (!isLive || paused) { motion.stop(); return; }
    motion.start();
    return () => motion.stop();
  }, [motion, isLive, paused]);

  // Cada minuto do motor → alimenta o controlador com os toques do lance.
  useEffect(() => {
    if (!isLive) return;
    const acts = actions ?? [];
    const fresh = acts.length >= processedRef.current ? acts.slice(processedRef.current) : acts;
    processedRef.current = acts.length;

    const pv = goalScoreRef.current;
    let goal: 'home' | 'away' | undefined;
    if (homeGoals > pv.h) goal = 'home';
    else if (awayGoals > pv.a) goal = 'away';
    goalScoreRef.current = { h: homeGoals, a: awayGoals };

    motion.pushTick({
      possession: possessionSide ?? 'home',
      ballHolderId,
      ballX: ballPos !== undefined ? ballPos * 100 : 50,
      ballY: ballPosY !== undefined ? ballPosY * 100 : 50,
      touches: fresh.map(a => ({ playerId: a.playerId, side: a.team, x: Math.max(1, Math.min(99, a.ballPos * 100)) })),
      durationMs: Math.max(300, (2000 / (speed || 1)) * 1.15),
      goal,
    });
  }, [motion, isLive, minute, ballPos, ballPosY, ballHolderId, possessionSide, speed, actions, homeGoals, awayGoals]);

  // Celebração de gol (overlay) — não mexe nos discos; o rAF continua.
  // Deps só do placar (NÃO de `events`, que muda todo tick e cancelaria o
  // timeout que esconde o "GOL!", deixando-o preso na tela).
  useEffect(() => {
    const prev = scoreRef.current;
    if (homeGoals > prev.h || awayGoals > prev.a) {
      const side: 'home' | 'away' = homeGoals > prev.h ? 'home' : 'away';
      const goalEvents = eventsRef.current.filter(e => e.type === 'goal' && e.team === side);
      const last = goalEvents[goalEvents.length - 1];
      const scorer = last?.player;
      scoreRef.current = { h: homeGoals, a: awayGoals };
      // atrasa um pouco para o "GOL!" aparecer quando a bola chega à rede
      const t1 = setTimeout(() => setCelebration({ scorer }), 420);
      const t2 = setTimeout(() => setCelebration(null), 420 + 2400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    scoreRef.current = { h: homeGoals, a: awayGoals };
  }, [homeGoals, awayGoals]);

  const lastEvent = events.length > 0 ? events[events.length - 1] : null;
  const awayPossession = 100 - Math.round(possession || 50);
  const homePossessionRounded = Math.round(possession || 50);

  const staticBall = useMemo(() => {
    const bx = ballPos !== undefined ? ballPos * 100 : 50;
    const by = ballPosY !== undefined ? ballPosY * 100 : 50;
    return toScreen(bx, by, classic);
  }, [ballPos, ballPosY, classic]);

  return (
    <div className={`fm-pitch2d${classic ? ' fm-pitch2d--classic' : ''}${isLive ? ' fm-pitch2d--anim' : ''}`}>
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
        <PitchActors
          homePositions={homePositions}
          awayPositions={awayPositions}
          homeColor={homeColor}
          awayColor={awayColor}
          classic={classic}
          isLive={isLive}
          staticBall={staticBall}
          motion={motion}
          trailRefs={trailRefs}
        />
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
