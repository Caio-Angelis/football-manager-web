import React from 'react';

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
  
  const getColor = (val: number) => {
    if (val >= 80) return '#4CAF50';
    if (val >= 60) return '#8BC34A';
    if (val >= 40) return '#FFC107';
    if (val >= 20) return '#FF9800';
    return '#F44336';
  };

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
            backgroundColor: getColor(value),
          }}
        />
      </div>
    </div>
  );
};
