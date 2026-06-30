import React from 'react';
import type { Player } from '../../types/game';
import { StatBar } from '../ui/StatBar';
import { Button } from '../ui/Button';
import { getFullName } from '../../utils/player';

interface PlayerCardProps {
  player: Player;
  onAction?: () => void;
  actionLabel?: string;
  showAttributes?: 'all' | 'technical' | 'mental' | 'physical';
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  onAction,
  actionLabel,
  showAttributes = 'all',
}) => {
  const getPositionColor = (pos: string) => {
    switch (pos) {
      case 'GK': return '#2196F3';
      case 'DEF': return '#4CAF50';
      case 'MID': return '#FF9800';
      case 'FWD': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getOverall = () => {
    // Calcular overall baseado em CA (1-200) convertido para escala 1-100
    return Math.round(player.currentAbility / 2);
  };

  const getFitnessColor = (fitness: number) => {
    if (fitness >= 80) return '#4CAF50';
    if (fitness >= 60) return '#8BC34A';
    if (fitness >= 40) return '#FFC107';
    return '#F44336';
  };

  const getFormColor = (form: number) => {
    if (form >= 80) return '#4CAF50';
    if (form >= 60) return '#8BC34A';
    if (form >= 40) return '#FFC107';
    return '#F44336';
  };

  const isGK = player.position === 'GK';

  return (
    <div className="fm-player-card">
      <div className="fm-player-card__header">
        <div className="fm-player-card__position" style={{ backgroundColor: getPositionColor(player.position) }}>
          {player.position}
        </div>
        <div className="fm-player-card__info">
          <h3 className="fm-player-card__name">{getFullName(player)}</h3>
          <p className="fm-player-card__meta">
            {player.age} anos • {player.nationality}
            {player.secondaryPositions.length > 0 && (
              <span className="fm-player-card__secondary-positions">
                ({player.secondaryPositions.join(', ')})
              </span>
            )}
          </p>
        </div>
        <div className="fm-player-card__overall">
          <div className="fm-player-card__overall-badge">
            {getOverall()}
          </div>
          <div className="fm-player-card__ca-pa">
            <span>CA: {player.currentAbility}</span>
            <span>PA: {player.potentialAbility}</span>
          </div>
        </div>
      </div>

      <div className="fm-player-card__status">
        <div className="fm-player-card__status-item">
          <span className="fm-player-card__status-label">Forma:</span>
          <div className="fm-player-card__status-bar" style={{ backgroundColor: getFormColor(player.form) }}>
            {player.form}%
          </div>
        </div>
        <div className="fm-player-card__status-item">
          <span className="fm-player-card__status-label">Cond.:</span>
          <div className="fm-player-card__status-bar" style={{ backgroundColor: getFitnessColor(player.fitness) }}>
            {player.fitness}%
          </div>
        </div>
        <div className="fm-player-card__status-item">
          <span className="fm-player-card__status-label">Moral:</span>
          <div className="fm-player-card__status-bar" style={{ backgroundColor: getFormColor(player.morale) }}>
            {player.morale}%
          </div>
        </div>
      </div>

      {player.injury?.active && (
        <div className="fm-player-card__injury">
          <span>🏥 Lesão: {player.injury.daysRemaining} dias restantes</span>
        </div>
      )}

      {showAttributes === 'all' && (
        <div className="fm-player-card__stats">
          {isGK && player.goalkeeping && (
            <>
              <StatBar label="Reflexos" value={player.goalkeeping.reflexes} maxValue={20} />
              <StatBar label="Comando" value={player.goalkeeping.commandOfArea} maxValue={20} />
              <StatBar label="Alcance" value={player.goalkeeping.aerialReach} maxValue={20} />
            </>
          )}
          
          {showAttributes === 'all' && player.technical && (
            <>
              <StatBar label="Técnica" value={player.technical.technique} maxValue={20} />
              <StatBar label="Passe" value={player.technical.passing} maxValue={20} />
              <StatBar label="Finalização" value={player.technical.finishing} maxValue={20} />
            </>
          )}
          
          {showAttributes === 'all' && player.mental && (
            <>
              <StatBar label="Visão" value={player.mental.vision ?? null} maxValue={20} />
              <StatBar label="Decisões" value={player.mental.decisions ?? null} maxValue={20} />
              <StatBar label="Compostura" value={player.mental.composure ?? null} maxValue={20} />
            </>
          )}
          
          {showAttributes === 'all' && player.physical && (
            <>
              <StatBar label="Velocidade" value={player.physical.speed ?? null} maxValue={20} />
              <StatBar label="Força" value={player.physical.strength ?? null} maxValue={20} />
              <StatBar label="Resistência" value={player.physical.stamina ?? null} maxValue={20} />
            </>
          )}
        </div>
      )}

      <div className="fm-player-card__footer">
        <div className="fm-player-card__market-value">
          <span className="fm-player-card__label">Valor:</span>
          <span className="fm-player-card__value">R$ {player.marketValue.toFixed(1)}M</span>
        </div>
        <div className="fm-player-card__salary">
          <span className="fm-player-card__label">Salário:</span>
          <span className="fm-player-card__value">R$ {(player.salary / 1000).toFixed(1)}K</span>
        </div>
      </div>

      {actionLabel && (
        <div className="fm-player-card__action">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </div>
  );
};
