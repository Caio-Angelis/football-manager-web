import React from 'react';
import { getStatColor } from '../../utils/playerDisplay';

interface StatBarProps {
  label: string;
  value: number;
  maxValue?: number;
  showValue?: boolean;
}

export const StatBar: React.FC<StatBarProps> = ({
  label,
  value,
  maxValue = 100,
  showValue = true,
}) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  return (
    <div className="fm-statbar">
      <div className="fm-statbar__label">
        <span>{label}</span>
        {showValue && <span className="fm-statbar__value">{value}</span>}
      </div>
      <div className="fm-statbar__track">
        <div
          className="fm-statbar__fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: getStatColor(value),
          }}
        />
      </div>
    </div>
  );
};
