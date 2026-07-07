import React from 'react';
import type { PlayerBonus } from '../../types/game';

export const PlayerBonusDisplay: React.FC<{ bonus: PlayerBonus }> = ({ bonus }) => {
  const typeLabels: Record<PlayerBonus['type'], string> = {
    goals: 'Golos',
    appearances: 'Aparições',
    assists: 'Assistências',
    titles: 'Títulos',
    performance: 'Performance',
  };

  return (
    <div className={`fm-bonus-display ${bonus.triggered ? 'fm-bonus-display--triggered' : ''}`}>
      <span className="fm-bonus-display__type">{typeLabels[bonus.type]}</span>
      <span className="fm-bonus-display__threshold">{bonus.threshold}x</span>
      <span className="fm-bonus-display__amount">R$ {bonus.bonusAmount}K</span>
      {bonus.triggered && (
        <span className="fm-bonus-display__triggered">✓ Ativo</span>
      )}
    </div>
  );
};
