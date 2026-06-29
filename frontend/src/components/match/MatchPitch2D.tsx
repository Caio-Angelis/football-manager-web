import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Team, Player, MatchEvent } from '../../types/game';
import { getFullName } from '../../utils/player';
import './MatchPitch2D.css';

// ============================================================
// CORES DETERMINÍSTICAS DO TIME (espelha TeamSelection)
// ============================================================

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const HUES = [215, 145, 25, 340, 195, 265];

const getTeamColor = (name: string, reputation: number, hueShift = 0): string => {
  const idx = (hashString(name) + hueShift) % HUES.length;
  const hue = HUES[idx];
  if (reputation >= 80 && hueShift === 0) return '#1a73e8';
  return `hsl(${hue} 55% 45%)`;
};

// ============================================================
// POSICIONAMENTO DOS DISCOS POR FORMAÇÃO
// ============================================================

interface DiscPos {
  player: Player;
  x: number; // 0-100 (% largura)
  y: number; // 0-100 (% altura)
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

// ============================================================
// MOVIMENTO DINÂMICO DOS JOGADORES — modelo tático realista
// ============================================================

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

// Limites de alcance por posição (em % do campo) — quão longe da base cada jogador pode ir
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
  // Progresso da bola no campo de ataque (0 = defesa própria, 1 = gol adversário)
  const ballAttackProgress =
    side === 'home' ? ballX / 100 : (100 - ballX) / 100;

  // Encontra os 2 jogadores mais próximos da bola (para pressing / suporte)
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

    // --- 1. Shift de bloco (toda a equipe se move junto) ---
    // Atacando: o time inteiro avança. Defendendo: recua.
    // A intensidade varia por quão avançada a bola está.
    let blockShiftX: number;
    if (hasBall) {
      // Atacando: avança proporcional ao progresso da bola
      blockShiftX = attackDir * ballAttackProgress * 22;
    } else {
      // Defendendo: recua proporcional ao quão perto a bola está do próprio gol
      blockShiftX = -attackDir * (1 - ballAttackProgress) * 20;
    }

    // Shift vertical do bloco: segue o lado da bola (esquerda/direita do campo)
    const blockShiftY = (ballY - 50) * 0.22;

    // --- 2. Comportamento individual por posição ---
    let indivX = 0;
    let indivY = 0;

    if (pos === 'GK') {
      // Goleiro: acompanha a bola lateralmente, sai um pouco se a bola chega na área
      indivY = (ballY - 50) * 0.25;
      if (!hasBall && ballAttackProgress < 0.2) {
        indivX = attackDir * 4; // sai um pouco do gol sob pressão
      }
    } else if (pos === 'DEF') {
      // Zagueiros: quando ataca, sobem bastante (até o meio-campo); quando defende, ficam na entrada da área
      if (hasBall) {
        indivX = attackDir * ballAttackProgress * 18;
        // Lateral correspondente ao lado da bola sobe mais
        const sideFactor = d.y > 50 ? 1 : -1;
        if (Math.abs(d.y - 50) > 20) {
          // É um lateral — sobe pela ponta
          indivY = sideFactor * ballAttackProgress * 8;
          indivX += attackDir * 6;
        }
      } else {
        // Defendendo: fecha na entrada da área, acompanha atacante
        indivX = -attackDir * (1 - ballAttackProgress) * 8;
        indivY = (ballY - d.y) * 0.15;
      }
    } else if (pos === 'MID') {
      // Meias: cobrem todo o meio-campo. Atacando, chegam na intermediária ou área.
      // Defendendo, voltam até a intermediária defensiva.
      if (hasBall) {
        indivX = attackDir * ballAttackProgress * 28;
        // Meia que está do lado da bola faz apoio pelo corredor
        const ballSide = ballY > 50 ? 1 : -1;
        const playerSide = d.y > 50 ? 1 : -1;
        if (playerSide === ballSide) {
          indivY = ballSide * 6;
        }
      } else {
        // Defendendo: marca na intermediária, fecha espaço
        indivX = -attackDir * (1 - ballAttackProgress) * 14;
        // Meia mais próximo da bola faz pressing
        if (i === closestIdx) {
          indivX += (ballX - d.x) * 0.35;
          indivY += (ballY - d.y) * 0.35;
        }
      }
    } else if (pos === 'FWD') {
      // Atacantes: quando ataca, ficam altos na ponta da área, fazem runs.
      // Quando defende, voltam até o meio-campo para pressionar.
      if (hasBall) {
        // Fica na ponta, faz movimento de diagonal run
        indivX = attackDir * (ballAttackProgress * 10 + 8);
        // Corredor: ataca pelo seu lado natural
        const playerSide = d.y > 50 ? 1 : -1;
        indivY = playerSide * Math.sin(ballAttackProgress * Math.PI) * 5;
      } else {
        // Defendendo: volta para pressionar a saída de bola adversária
        indivX = -attackDir * (1 - ballAttackProgress) * 25;
        // Atacante mais próximo faz pressing no adversário
        if (i === closestIdx) {
          indivX += (ballX - d.x) * 0.4;
          indivY += (ballY - d.y) * 0.4;
        }
      }
    }

    // --- 3. Pressing: jogador mais próximo da bola persegue ---
    if (i === closestIdx && pos !== 'GK') {
      const dx = ballX - d.x;
      const dy = ballY - d.y;
      const pursuit = hasBall ? 0.5 : 0.55;
      indivX += dx * pursuit;
      indivY += dy * pursuit;
    } else if (i === secondClosestIdx && !hasBall && pos !== 'GK') {
      // Segundo mais próximo: faz cobertura / dobra
      const dx = ballX - d.x;
      const dy = ballY - d.y;
      indivX += dx * 0.25;
      indivY += dy * 0.25;
    }

    // --- 4. Espaçamento: evita que todos se amontoem na bola ---
    // Puxa jogadores não-envolvidos para manter estrutura de equipe
    if (i !== closestIdx && i !== secondClosestIdx) {
      // Mantém espaçamento lateral: afasta-se levemente do lado da bola
      const ballSide = ballY > 50 ? 1 : -1;
      const playerSide = d.y > 50 ? 1 : -1;
      if (playerSide !== ballSide) {
        indivY -= ballSide * 4; // abre do outro lado
      }
    }

    // --- 5. Micro-jitter (movimento natural) ---
    indivX += (Math.random() - 0.5) * 2;
    indivY += (Math.random() - 0.5) * 2;

    // --- Aplica shifts e respeita limites por posição ---
    // Inverte X para away (ataca da direita para esquerda)
    const rawX = d.x + blockShiftX + indivX;
    const rawY = d.y + blockShiftY + indivY;

    // Converte limites para o lado correto
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

// ============================================================
// MARCAÇÕES DO CAMPO (SVG)
// ============================================================

const PitchMarkings: React.FC = () => (
  <svg className="fm-pitch2d__markings" viewBox="0 0 160 100" preserveAspectRatio="none">
    <g stroke="var(--pitch-line)" strokeWidth="0.6" fill="none">
      <rect x="2" y="2" width="156" height="96" rx="2" />
      <line x1="80" y1="2" x2="80" y2="98" />
      <circle cx="80" cy="50" r="11" />
      <circle cx="80" cy="50" r="0.9" fill="var(--pitch-line)" stroke="none" />
      {/* Área esquerda */}
      <rect x="2" y="26" width="20" height="48" />
      <rect x="2" y="38" width="8" height="24" />
      <path d="M22 39 A 12 12 0 0 1 22 61" />
      {/* Área direita */}
      <rect x="138" y="26" width="20" height="48" />
      <rect x="150" y="38" width="8" height="24" />
      <path d="M138 39 A 12 12 0 0 0 138 61" />
      {/* Gols */}
      <rect x="0" y="42" width="2" height="16" fill="var(--pitch-line)" stroke="none" opacity="0.5" />
      <rect x="158" y="42" width="2" height="16" fill="var(--pitch-line)" stroke="none" opacity="0.5" />
    </g>
  </svg>
);

const LINE_POSITIONS: Record<string, { engagement: number; defensive: number }> = {
  high: { engagement: 68, defensive: 58 },
  medium: { engagement: 50, defensive: 42 },
  low: { engagement: 32, defensive: 25 },
};

const TacticalLines: React.FC<{ homeTeam: Team; awayTeam: Team; isLive: boolean }> = ({
  homeTeam, awayTeam, isLive,
}) => {
  const homeEng = homeTeam.engagementLine ?? 'medium';
  const homeDef = homeTeam.defensiveLine ?? 'medium';
  const awayEng = awayTeam.engagementLine ?? 'medium';
  const awayDef = awayTeam.defensiveLine ?? 'medium';

  const homeEngX = LINE_POSITIONS[homeEng]?.engagement ?? 50;
  const homeDefX = LINE_POSITIONS[homeDef]?.defensive ?? 42;
  const awayEngX = 160 - (LINE_POSITIONS[awayEng]?.engagement ?? 50);
  const awayDefX = 160 - (LINE_POSITIONS[awayDef]?.defensive ?? 42);

  return (
    <svg className="fm-pitch2d__tactical-lines" viewBox="0 0 160 100" preserveAspectRatio="none">
      {/* Linha de engajamento - casa (verde) */}
      <line x1={homeEngX} y1="2" x2={homeEngX} y2="98"
        stroke="#22c55e" strokeWidth="0.5" strokeDasharray="3 2" opacity={isLive ? 0.5 : 0.35} />
      {/* Linha defensiva - casa (verde claro) */}
      <line x1={homeDefX} y1="2" x2={homeDefX} y2="98"
        stroke="#86efac" strokeWidth="0.5" strokeDasharray="2 2" opacity={isLive ? 0.4 : 0.25} />
      {/* Linha de engajamento - fora (azul) */}
      <line x1={awayEngX} y1="2" x2={awayEngX} y2="98"
        stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="3 2" opacity={isLive ? 0.5 : 0.35} />
      {/* Linha defensiva - fora (azul claro) */}
      <line x1={awayDefX} y1="2" x2={awayDefX} y2="98"
        stroke="#93c5fd" strokeWidth="0.5" strokeDasharray="2 2" opacity={isLive ? 0.4 : 0.25} />
    </svg>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

const EVENT_ICONS: Record<string, string> = {
  goal: '⚽', shot: '👟', save: '🧤', corner: '🚩', foul: '🛑',
  yellow: '🟨', red: '🟥', substitution: '🔄',
};

interface MatchPitch2DProps {
  homeTeam: Team;
  awayTeam: Team;
  homeGoals: number;
  awayGoals: number;
  minute: number;
  possession: number; // % de posse da casa
  events: MatchEvent[];
  isLive: boolean;
  ballPos?: number; // 0-1 do estado live (0 = gol casa, 1 = gol fora)
  possessionSide?: 'home' | 'away'; // quem está com a bola
  speed?: number; // 1, 2, 4 — multiplicador de velocidade da animação
}

export const MatchPitch2D: React.FC<MatchPitch2DProps> = ({
  homeTeam, awayTeam, homeGoals, awayGoals, minute, possession, events, isLive, ballPos, possessionSide, speed = 1,
}) => {
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

  // Movimento da bola enquanto a partida está ao vivo
  useEffect(() => {
    if (!isLive) return;

    // Se temos ballPos real do motor de simulação, usa ele
    if (ballPos !== undefined) {
      // ballPos: 0 = gol casa, 1 = gol fora → x no campo (0-100)
      const targetX = ballPos * 100;
      // Y aleatório dentro do campo
      const targetY = 20 + Math.random() * 60;
      setBall({ x: targetX, y: targetY });
      const homeHasBall = possessionSide === 'home';
      setHomeDyn(computeShiftedPositions(homePositions, 'home', targetX, targetY, homeHasBall));
      setAwayDyn(computeShiftedPositions(awayPositions, 'away', targetX, targetY, !homeHasBall));
      return;
    }

    // Fallback: movimento aleatório original
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
  }, [isLive, possession, homePositions, awayPositions, ballPos, possessionSide, speed]);

  // Detecta gol e dispara celebração (sem depender de events para não re-executar a cada tick)
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
  }, [homeGoals, awayGoals, minute]);

  // Limpa a celebração após 2 minutos/lances após o gol
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

  const renderDiscs = (positions: DiscPos[], color: string) =>
    positions.map(d => {
      const isFlashing = flashName && d.player.name === flashName;
      return (
        <div
          key={d.player.id}
          className={`fm-pitch2d__player${isFlashing ? ' fm-pitch2d__player--flash' : ''}`}
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            background: `radial-gradient(circle at 35% 30%, ${color}, color-mix(in srgb, ${color} 70%, #000))`,
          }}
          title={`${getFullName(d.player)} (${d.player.position})`}
        >
          {d.number}
        </div>
      );
    });

  return (
    <div className="fm-pitch2d">
      {/* Placar */}
      <div className="fm-pitch2d__scoreboard">
        <div className="fm-pitch2d__team">
          <span className="fm-pitch2d__dot" style={{ background: homeColor }} />
          <span className="fm-pitch2d__team-name">{homeTeam.name}</span>
        </div>
        <div className="fm-pitch2d__center">
          <span className="fm-pitch2d__score">{homeGoals} - {awayGoals}</span>
          <span className={`fm-pitch2d__clock${isLive ? ' fm-pitch2d__clock--live' : ''}`}>
            {isLive && <span className="fm-pitch2d__pulse" />}
            {isLive ? `${minute}'` : 'Final'}
          </span>
        </div>
        <div className="fm-pitch2d__team fm-pitch2d__team--away">
          <span className="fm-pitch2d__dot" style={{ background: awayColor }} />
          <span className="fm-pitch2d__team-name">{awayTeam.name}</span>
        </div>
      </div>

      {/* Campo */}
      <div className="fm-pitch2d__field">
        <PitchMarkings />
        <TacticalLines homeTeam={homeTeam} awayTeam={awayTeam} isLive={isLive} />
        {renderDiscs(isLive ? homeDyn : homePositions, homeColor)}
        {renderDiscs(isLive ? awayDyn : awayPositions, awayColor)}
        <div className="fm-pitch2d__ball" style={{ left: `${ball.x}%`, top: `${ball.y}%` }} />
        {celebration && (
          <div className="fm-pitch2d__goal-flash">
            <span className="fm-pitch2d__goal-text">GOL!</span>
            {celebration.scorer && (
              <span className="fm-pitch2d__goal-scorer">{celebration.scorer}</span>
            )}
          </div>
        )}
      </div>

      {/* Posse de bola */}
      <div className="fm-pitch2d__possession">
        <span>{homePossessionRounded}%</span>
        <div className="fm-pitch2d__possession-bar">
          <span className="fm-pitch2d__possession-fill" style={{ width: `${homePossessionRounded}%`, background: homeColor }} />
          <span className="fm-pitch2d__possession-fill" style={{ width: `${awayPossession}%`, background: awayColor }} />
        </div>
        <span>{awayPossession}%</span>
      </div>

      {/* Último lance */}
      {lastEvent && (
        <div className="fm-pitch2d__ticker">
          <span className="fm-pitch2d__ticker-icon">{EVENT_ICONS[lastEvent.type] ?? '•'}</span>
          <span>{lastEvent.minute}' — {lastEvent.description ?? lastEvent.type}</span>
        </div>
      )}
    </div>
  );
};
