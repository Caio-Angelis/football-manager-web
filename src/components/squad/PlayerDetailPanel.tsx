import React from 'react';
import { StatBar } from '../ui/StatBar';
import type { Player } from '../../types/game';
import { getStatColor, getOverallRating, getPositionColor, STATUS_LABELS } from '../../utils/playerDisplay';

interface PlayerDetailPanelProps {
  player: Player | null;
  onClose: () => void;
}

export const PlayerDetailPanel: React.FC<PlayerDetailPanelProps> = ({
  player,
  onClose,
}) => {
  if (!player) return null;

  const overall = getOverallRating(player.currentAbility);

  return (
    <div className="fm-player-detail-panel">
      <div className="fm-player-detail-panel__header">
        <button className="fm-player-detail-panel__close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </div>

      <div className="fm-player-detail-panel__identity">
        <div className="fm-player-detail-panel__position-badge" style={{ backgroundColor: getPositionColor(player.position) }}>
          {player.position}
        </div>
        <div className="fm-player-detail-panel__name">
          <h2>{player.name} {player.surname}</h2>
          <span className="fm-player-detail-panel__meta">
            {player.age} anos • {player.nationality}
          </span>
          {player.secondaryPositions.length > 0 && (
            <span className="fm-player-detail-panel__alt-pos">
              Pos. alternativas: {player.secondaryPositions.join(', ')}
            </span>
          )}
        </div>
        <div className="fm-player-detail-panel__overall-badge">
          <span>{overall}</span>
        </div>
      </div>

      <div className="fm-player-detail-panel__status">
        <div className="fm-player-detail-panel__status-item">
          <span className="fm-player-detail-panel__status-label">Forma</span>
          <div className="fm-player-detail-panel__status-bar" style={{ backgroundColor: getStatColor(player.form) }}>
            {player.form}%
          </div>
        </div>
        <div className="fm-player-detail-panel__status-item">
          <span className="fm-player-detail-panel__status-label">Condição Física</span>
          <div className="fm-player-detail-panel__status-bar" style={{ backgroundColor: getStatColor(player.fitness) }}>
            {player.fitness}%
          </div>
        </div>
        <div className="fm-player-detail-panel__status-item">
          <span className="fm-player-detail-panel__status-label">Moral</span>
          <div className="fm-player-detail-panel__status-bar" style={{ backgroundColor: getStatColor(player.morale) }}>
            {player.morale}%
          </div>
        </div>
      </div>

      {player.injury && (
        <div className="fm-player-detail-panel__injury">
          <span>🏥 Lesão: {player.injury.days} dias restantes</span>
        </div>
      )}

      <div className="fm-player-detail-panel__attributes">
        <h3 className="fm-player-detail-panel__section-title">Atributos</h3>

        {player.goalkeeping && (
          <section className="fm-player-detail-panel__group">
            <h4 className="fm-player-detail-panel__group-title">Guarda-Redes</h4>
            <div className="fm-player-detail-panel__stats-grid">
              <StatBar label="Reflexos" value={player.goalkeeping.reflexes} maxValue={20} />
              <StatBar label="Comando de Área" value={player.goalkeeping.commandOfArea} maxValue={20} />
              <StatBar label="Alcance" value={player.goalkeeping.aerialReach} maxValue={20} />
            </div>
          </section>
        )}

        {player.technical && (
          <section className="fm-player-detail-panel__group">
            <h4 className="fm-player-detail-panel__group-title">Técnico</h4>
            <div className="fm-player-detail-panel__stats-grid">
              <StatBar label="Técnica" value={player.technical.technique} maxValue={20} />
              <StatBar label="Passe" value={player.technical.passing} maxValue={20} />
              <StatBar label="Finalização" value={player.technical.finishing} maxValue={20} />
              <StatBar label="Cabeceamento" value={player.technical.heading ?? 0} maxValue={20} />
              <StatBar label="Cruzamentos" value={player.technical.crossing ?? 0} maxValue={20} />
              <StatBar label="Drible" value={player.technical.dribbling ?? 0} maxValue={20} />
            </div>
          </section>
        )}

        {player.mental && (
          <section className="fm-player-detail-panel__group">
            <h4 className="fm-player-detail-panel__group-title">Mental</h4>
            <div className="fm-player-detail-panel__stats-grid">
              <StatBar label="Visão" value={player.mental.vision ?? 0} maxValue={20} />
              <StatBar label="Decisões" value={player.mental.decisions ?? 0} maxValue={20} />
              <StatBar label="Composure" value={player.mental.composure ?? 0} maxValue={20} />
              <StatBar label="Liderança" value={player.mental.leadership ?? 0} maxValue={20} />
              <StatBar label="Posicionamento" value={player.mental.positioning ?? 0} maxValue={20} />
              <StatBar label="Trabalho de Bola" value={player.mental.workRate ?? 0} maxValue={20} />
            </div>
          </section>
        )}

        {player.physical && (
          <section className="fm-player-detail-panel__group">
            <h4 className="fm-player-detail-panel__group-title">Físico</h4>
            <div className="fm-player-detail-panel__stats-grid">
              <StatBar label="Velocidade" value={player.physical.speed ?? 0} maxValue={20} />
              <StatBar label="Força" value={player.physical.strength ?? 0} maxValue={20} />
              <StatBar label="Resistência" value={player.physical.stamina ?? 0} maxValue={20} />
              <StatBar label="Aceleração" value={player.physical.acceleration ?? 0} maxValue={20} />
              <StatBar label="Agilidade" value={player.physical.agility ?? 0} maxValue={20} />
              <StatBar label="Salto" value={player.physical.jumping ?? 0} maxValue={20} />
            </div>
          </section>
        )}
      </div>

      <div className="fm-player-detail-panel__contract">
        <h3 className="fm-player-detail-panel__section-title">Contrato</h3>
        <div className="fm-player-detail-panel__contract-row">
          <span className="fm-player-detail-panel__contract-label">Valor de Mercado:</span>
          <span className="fm-player-detail-panel__contract-value">{player.marketValue >= 1000 ? `€${(player.marketValue / 1000).toFixed(1)}M` : `€${player.marketValue}K`}</span>
        </div>
        <div className="fm-player-detail-panel__contract-row">
          <span className="fm-player-detail-panel__contract-label">Salário:</span>
          <span className="fm-player-detail-panel__contract-value">€{(player.salary / 1000).toFixed(1)}K/semana</span>
        </div>
        <div className="fm-player-detail-panel__contract-row">
          <span className="fm-player-detail-panel__contract-label">Fim do Contrato:</span>
          <span className="fm-player-detail-panel__contract-value">Semana {player.contractEnd}</span>
        </div>
        {player.contractClause > 0 && (
          <div className="fm-player-detail-panel__contract-row">
            <span className="fm-player-detail-panel__contract-label">Cláusula de Rescisão:</span>
            <span className="fm-player-detail-panel__contract-value">€{player.contractClause}K</span>
          </div>
        )}
      </div>

      <div className="fm-player-detail-panel__squad-status">
        <h3 className="fm-player-detail-panel__section-title">Status no Plantel</h3>
        <div className="fm-player-detail-panel__status-full">
          <span className="fm-player-detail-panel__status-pill">{STATUS_LABELS[player.squadStatus] || player.squadStatus}</span>
        </div>
      </div>

      {player.promises.length > 0 && (
        <div className="fm-player-detail-panel__promises">
          <h3 className="fm-player-detail-panel__section-title">Promessas</h3>
          <div className="fm-player-detail-panel__promises-list">
            {player.promises.map((promise, index) => (
              <div key={`promise-${index}`} className="fm-player-detail-panel__promise-item">
                <span className="fm-player-detail-panel__promise-text">{promise.goal}</span>
                <span className="fm-player-detail-panel__promise-status">{promise.fulfilled ? '✓ Cumprida' : 'Pendente'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
