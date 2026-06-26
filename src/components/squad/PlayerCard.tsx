import React from 'react';
import type { Player } from '../../types/game';
import { StatBar } from '../ui/StatBar';
import { Button } from '../ui/Button';
import { getPositionColor, getOverallRating, getStatColor } from '../../utils/playerDisplay';

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
  const isGK = player.position === 'GK';

  return (
    <div className="fm-player-card">
      <div className="fm-player-card__header">
        <div className="fm-player-card__position" style={{ backgroundColor: getPositionColor(player.position) }}>
          {player.position}
        </div>
        <div className="fm-player-card__info">
          <h3 className="fm-player-card__name">{player.name} {player.surname}</h3>
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
            {getOverallRating(player.currentAbility)}
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
          <div className="fm-player-card__status-bar" style={{ backgroundColor: getStatColor(player.form) }}>
            {player.form}%
          </div>
        </div>
        <div className="fm-player-card__status-item">
          <span className="fm-player-card__status-label">Cond.:</span>
          <div className="fm-player-card__status-bar" style={{ backgroundColor: getStatColor(player.fitness) }}>
            {player.fitness}%
          </div>
        </div>
        <div className="fm-player-card__status-item">
          <span className="fm-player-card__status-label">Moral:</span>
          <div className="fm-player-card__status-bar" style={{ backgroundColor: getStatColor(player.morale) }}>
            {player.morale}%
          </div>
        </div>
      </div>

      {player.injury && (
        <div className="fm-player-card__injury">
          <span>🏥 Lesão: {player.injury.days} dias restantes</span>
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
              <StatBar label="Visão" value={player.mental.vision ?? 0} maxValue={20} />
              <StatBar label="Decisões" value={player.mental.decisions ?? 0} maxValue={20} />
              <StatBar label="Compostura" value={player.mental.composure ?? 0} maxValue={20} />
            </>
          )}
          
          {showAttributes === 'all' && player.physical && (
            <>
              <StatBar label="Velocidade" value={player.physical.speed ?? 0} maxValue={20} />
              <StatBar label="Força" value={player.physical.strength ?? 0} maxValue={20} />
              <StatBar label="Resistência" value={player.physical.stamina ?? 0} maxValue={20} />
            </>
          )}
        </div>
      )}

      <div className="fm-player-card__footer">
        <div className="fm-player-card__market-value">
          <span className="fm-player-card__label">Valor:</span>
          <span className="fm-player-card__value">R$ {player.marketValue}M</span>
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
