import React from 'react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts';
import type { MomentumPoint, GoalMark } from '../../utils/winProbability';
import './MomentumChart.css';

const HOME = '#3d7bf5';
const DRAW = '#6b7080';
const AWAY = '#e25c52';

interface Props {
  homeName: string;
  awayName: string;
  points: MomentumPoint[];
  goals: GoalMark[];
  live?: boolean;
}

const ProbStat: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="fm-momentum__stat">
    <span className="fm-momentum__stat-value" style={{ color }}>{Math.round(value)}%</span>
    <span className="fm-momentum__stat-label" title={label}>{label}</span>
  </div>
);

const TooltipBox: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const get = (k: string) => Math.round(payload.find((p: any) => p.dataKey === k)?.value ?? 0);
  return (
    <div className="fm-momentum__tip">
      <div className="fm-momentum__tip-min">{label}&apos;</div>
      <div><i style={{ background: HOME }} />Casa {get('home')}%</div>
      <div><i style={{ background: DRAW }} />Empate {get('draw')}%</div>
      <div><i style={{ background: AWAY }} />Fora {get('away')}%</div>
    </div>
  );
};

/**
 * Broadcast-style live win-probability band. Home/draw/away stack to 100% and
 * swing minute-by-minute; goals are pinned to the timeline as the story of the match.
 */
export const MomentumChart: React.FC<Props> = ({ homeName, awayName, points, goals, live }) => {
  const cur = points[points.length - 1] ?? { home: 33.3, draw: 33.3, away: 33.3, minute: 0 };

  return (
    <div className="fm-momentum">
      <div className="fm-momentum__header">
        <h3 className="fm-momentum__title">
          <span className={`fm-momentum__pulse${live ? ' fm-momentum__pulse--live' : ''}`} />
          {live ? 'Central de Momentum' : 'História da Partida'}
        </h3>
        <div className="fm-momentum__readout">
          <ProbStat label={homeName} value={cur.home} color={HOME} />
          <ProbStat label="Empate" value={cur.draw} color={DRAW} />
          <ProbStat label={awayName} value={cur.away} color={AWAY} />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <AreaChart data={points} margin={{ top: 8, right: 10, bottom: 0, left: -22 }}>
          <defs>
            {[['home', HOME], ['draw', DRAW], ['away', AWAY]].map(([k, c]) => (
              <linearGradient key={k} id={`fm-mom-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={0.9} />
                <stop offset="100%" stopColor={c} stopOpacity={0.55} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="minute" type="number" domain={[0, 90]}
            ticks={[0, 15, 30, 45, 60, 75, 90]}
            tickFormatter={(m) => `${m}'`}
            tick={{ fill: '#6b7080', fontSize: 10 }} axisLine={false} tickLine={false}
          />
          <YAxis domain={[0, 100]} tick={{ fill: '#6b7080', fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
          <Tooltip content={<TooltipBox />} />
          <Area type="monotone" dataKey="home" stackId="1" stroke={HOME} strokeWidth={0} fill={`url(#fm-mom-home)`} isAnimationActive={false} />
          <Area type="monotone" dataKey="draw" stackId="1" stroke={DRAW} strokeWidth={0} fill={`url(#fm-mom-draw)`} isAnimationActive={false} />
          <Area type="monotone" dataKey="away" stackId="1" stroke={AWAY} strokeWidth={0} fill={`url(#fm-mom-away)`} isAnimationActive={false} />
          {goals.map((g, i) => (
            <ReferenceLine
              key={i} x={g.minute}
              stroke={g.team === 'home' ? HOME : AWAY}
              strokeWidth={1.5} strokeOpacity={0.9}
              label={{ value: '⚽', position: 'top', fontSize: 12 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
