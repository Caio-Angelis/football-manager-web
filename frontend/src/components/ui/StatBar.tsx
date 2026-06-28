import React from 'react';
import type { AttributeValue } from '../../types/game';

interface StatBarProps {
  label: string;
  value: AttributeValue;
  maxValue?: number;
  showValue?: boolean;
}

export const StatBar: React.FC<StatBarProps> = ({
  label,
  value,
  maxValue = 100,
  showValue = true,
}) => {
  const isNull = value === null || value === undefined;
  const isRange = typeof value === 'string';

  let displayValue: string;
  let numericForColor: number;
  let percentage: number;

  if (isNull) {
    displayValue = '?';
    numericForColor = 0;
    percentage = 0;
  } else if (isRange) {
    displayValue = value as string;
    const parts = (value as string).split('-');
    const min = parseInt(parts[0], 10) || 0;
    const max = parseInt(parts[1], 10) || 0;
    numericForColor = (min + max) / 2;
    percentage = Math.min((numericForColor / maxValue) * 100, 100);
  } else {
    const numVal = value as number;
    displayValue = String(numVal);
    numericForColor = numVal;
    percentage = Math.min((numVal / maxValue) * 100, 100);
  }

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
        {showValue && <span className="fm-statbar__value" style={{ opacity: isNull ? 0.4 : 1 }}>{displayValue}</span>}
      </div>
      <div className="fm-statbar__track">
        {isNull ? (
          <div className="fm-statbar__fill" style={{ width: '100%', backgroundColor: '#444', opacity: 0.3 }} />
        ) : (
          <div
            className="fm-statbar__fill"
            style={{
              width: `${percentage}%`,
              backgroundColor: getColor(numericForColor),
            }}
          />
        )}
      </div>
    </div>
  );
};
