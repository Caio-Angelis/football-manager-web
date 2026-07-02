import React, { useId } from 'react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, Tooltip,
} from 'recharts';

interface MiniAreaChartProps {
  data: Record<string, number>[];
  xKey: string;
  yKey: string;
  color: string;
  height?: number;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: number | string) => string;
}

/**
 * Shared sparkline-style area chart (gradient fill, no axes chrome) used across
 * Dashboard/Finance/Training projections so every chart in the app looks and animates the same.
 */
export const MiniAreaChart: React.FC<MiniAreaChartProps> = ({
  data, xKey, yKey, color, height = 80, valueFormatter, labelFormatter,
}) => {
  const gradientId = `mini-area-${useId().replace(/[:]/g, '')}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey={xKey} tick={{ fill: '#6b7080', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#1b1e26', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#9aa0ad' }}
          labelFormatter={(label: any) => (labelFormatter ? labelFormatter(label) : label)}
          formatter={(v: any) => [valueFormatter ? valueFormatter(v) : v, '']}
        />
        <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
};
