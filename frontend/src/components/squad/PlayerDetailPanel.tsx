import React from 'react';
import { StatBar } from '../ui/StatBar';
import type { Player } from '../../types/game';

interface PlayerDetailPanelProps {
  player: Player | null;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  'Key Player': 'Peça-chave',
  'Regular Starter': 'Titular',
  'Rotation': 'Rotação',
  'Young Talent': 'Promessa',
  'Excess': 'Outro',
};

const getBarColor = (val: number) => {
  if (val >= 80) return '#4CAF50';
  if (val >= 60) return '#8BC34A';
  if (val >= 40) return '#FFC107';
  if (val >= 20) return '#FF9800';
  return '#F44336';
};

const getOverall = (ca: number) => Math.round(ca / 2);

export const PlayerDetailPanel: React.FC<PlayerDetailPanelProps> = ({
  player,
  onClose,
}) => {
  if (!player) return null;

  const overall = getOverall(player.currentAbility);

  return (
    <div className="fm-player-detail-panel">
      <div className="fm-player-detail-panel__header">
        <button className="fm-player-detail-panel__close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </div>

      <div className="fm-player-detail-panel__identity">
        <div className="fm-player-detail-panel__position-badge" style={{ backgroundColor: player.position === 'GK' ? '#2196F3' : player.position === 'DEF' ? '#4CAF50' : player.position === 'MID' ? '#FF9800' : '#F44336' }}>
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
          <div className="fm-player-detail-panel__status-bar" style={{ backgroundColor: getBarColor(player.form) }}>
            {player.form}%
          </div>
        </div>
        <div className="fm-player-detail-panel__status-item">
          <span className="fm-player-detail-panel__status-label">Condição Física</span>
          <div className="fm-player-detail-panel__status-bar" style={{ backgroundColor: getBarColor(player.fitness) }}>
            {player.fitness}%
          </div>
        </div>
        <div className="fm-player-detail-panel__status-item">
          <span className="fm-player-detail-panel__status-label">Moral</span>
          <div className="fm-player-detail-panel__status-bar" style={{ backgroundColor: getBarColor(player.morale) }}>
            {player.morale}%
          </div>
        </div>
      </div>

      {player.injury?.active && (
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
              <StatBar label="Cabeceamento" value={player.technical.heading ?? null} maxValue={20} />
              <StatBar label="Cruzamentos" value={player.technical.crossing ?? null} maxValue={20} />
              <StatBar label="Drible" value={player.technical.dribbling ?? null} maxValue={20} />
            </div>
          </section>
        )}

        {player.mental && (
          <section className="fm-player-detail-panel__group">
            <h4 className="fm-player-detail-panel__group-title">Mental</h4>
            <div className="fm-player-detail-panel__stats-grid">
              <StatBar label="Visão" value={player.mental.vision ?? null} maxValue={20} />
              <StatBar label="Decisões" value={player.mental.decisions ?? null} maxValue={20} />
              <StatBar label="Compostura" value={player.mental.composure ?? null} maxValue={20} />
              <StatBar label="Liderança" value={player.mental.leadership ?? null} maxValue={20} />
              <StatBar label="Posicionamento" value={player.mental.positioning ?? null} maxValue={20} />
              <StatBar label="Trabalho de Bola" value={player.mental.workRate ?? null} maxValue={20} />
            </div>
          </section>
        )}

        {player.physical && (
          <section className="fm-player-detail-panel__group">
            <h4 className="fm-player-detail-panel__group-title">Físico</h4>
            <div className="fm-player-detail-panel__stats-grid">
              <StatBar label="Velocidade" value={player.physical.speed ?? null} maxValue={20} />
              <StatBar label="Força" value={player.physical.strength ?? null} maxValue={20} />
              <StatBar label="Resistência" value={player.physical.stamina ?? null} maxValue={20} />
              <StatBar label="Aceleração" value={player.physical.acceleration ?? null} maxValue={20} />
              <StatBar label="Agilidade" value={player.physical.agility ?? null} maxValue={20} />
              <StatBar label="Salto" value={player.physical.jumping ?? null} maxValue={20} />
            </div>
          </section>
        )}
      </div>

      <div className="fm-player-detail-panel__contract">
        <h3 className="fm-player-detail-panel__section-title">Contrato</h3>
        <div className="fm-player-detail-panel__contract-row">
          <span className="fm-player-detail-panel__contract-label">Valor de Mercado:</span>
          <span className="fm-player-detail-panel__contract-value">R$ {player.marketValue.toFixed(1)}M</span>
        </div>
        <div className="fm-player-detail-panel__contract-row">
          <span className="fm-player-detail-panel__contract-label">Salário:</span>
          <span className="fm-player-detail-panel__contract-value">R$ {(player.salary / 1000).toFixed(1)}K/semana</span>
        </div>
        <div className="fm-player-detail-panel__contract-row">
          <span className="fm-player-detail-panel__contract-label">Fim do Contrato:</span>
          <span className="fm-player-detail-panel__contract-value">Semana {player.contractEnd}</span>
        </div>
        {player.contractClause > 0 && (
          <div className="fm-player-detail-panel__contract-row">
            <span className="fm-player-detail-panel__contract-label">Cláusula de Rescisão:</span>
            <span className="fm-player-detail-panel__contract-value">R$ {player.contractClause.toFixed(1)}M</span>
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
