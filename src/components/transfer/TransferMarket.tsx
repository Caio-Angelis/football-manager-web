import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PlayerCard } from '../squad/PlayerCard';
import { Button } from '../ui/Button';
import { ScoutReportCard } from './ScoutReportCard';
import type { IncomingTransfer, Player } from '../../types/game';

const SquadStatusOptions = ['Key Player', 'Regular Starter', 'Rotation', 'Young Talent', 'Excess'];

const TransferOfferCard: React.FC<{
  offer: IncomingTransfer;
  playerName: string;
  fromTeamName: string;
  onAccept: () => void;
  onReject: () => void;
  onDefer: () => void;
}> = ({ offer, playerName, fromTeamName, onAccept, onReject, onDefer }) => (
  <div className="fm-transfer-offer">
    <div className="fm-transfer-offer__header">
      <h3 className="fm-transfer-offer__player-name">{playerName}</h3>
      <span className="fm-transfer-offer__from-team">{fromTeamName}</span>
    </div>
    <div className="fm-transfer-offer__details">
      <div className="fm-transfer-offer__detail">
        <span className="fm-transfer-offer__detail-label">Proposta:</span>
        <span className="fm-transfer-offer__detail-value">R$ {offer.offerPrice}M</span>
      </div>
      <div className="fm-transfer-offer__detail">
        <span className="fm-transfer-offer__detail-label">Salário:</span>
        <span className="fm-transfer-offer__detail-value">R$ {offer.contractProposal.salary}K/mês</span>
      </div>
      <div className="fm-transfer-offer__detail">
        <span className="fm-transfer-offer__detail-label">Duração:</span>
        <span className="fm-transfer-offer__detail-value">{offer.contractProposal.duration} semanas</span>
      </div>
      <div className="fm-transfer-offer__detail">
        <span className="fm-transfer-offer__detail-label">Cláusula:</span>
        <span className="fm-transfer-offer__detail-value">R$ {offer.contractProposal.clause}M</span>
      </div>
      <div className="fm-transfer-offer__detail">
        <span className="fm-transfer-offer__detail-label">Parcelas:</span>
        <span className="fm-transfer-offer__detail-value">3x R$ {(offer.offerPrice / 3).toFixed(1)}M</span>
      </div>
      <div className="fm-transfer-offer__detail">
        <span className="fm-transfer-offer__detail-label">Bónus golos:</span>
        <span className="fm-transfer-offer__detail-value">R$ 50K/gol</span>
      </div>
    </div>
    <div className="fm-transfer-offer__actions">
      <Button variant="secondary" onClick={onDefer}>Adiar</Button>
      <Button variant="primary" onClick={onReject}>Recusar</Button>
      <Button variant="success" onClick={onAccept}>Aceitar</Button>
    </div>
  </div>
);

export const TransferMarket: React.FC = () => {
  const {
    selectedTeam, teams, incomingTransfers, scoutReports,
    buyPlayer, assignScout, acceptIncomingTransfer, rejectIncomingTransfer, updateTeam,
  } = useGameStore();

  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'market' | 'scouting' | 'offers'>('market');
  const [selectedStatus, setSelectedStatus] = useState('Rotation');
  const [buyFeedback, setBuyFeedback] = useState<string | null>(null);

  const team = teams.find(t => t.id === selectedTeam);
  const myPlayerIds = new Set(team?.squad.map(p => p.id) ?? []);

  const marketPlayers: { player: Player; teamId: string; teamName: string }[] = teams
    .filter(t => t.id !== selectedTeam)
    .flatMap(t => t.squad.map(player => ({ player, teamId: t.id, teamName: t.name })));

  const filteredPlayers = filter
    ? marketPlayers.filter(({ player }) =>
        `${player.name} ${player.surname}`.toLowerCase().includes(filter.toLowerCase()),
      )
    : marketPlayers;

  const getPlayerName = (playerId: string) => {
    for (const t of teams) {
      const p = t.squad.find(pl => pl.id === playerId);
      if (p) return `${p.name} ${p.surname}`;
    }
    return playerId;
  };

  const handleBuy = (playerId: string, sellerTeamId: string) => {
    if (!team) return;
    const success = buyPlayer(playerId, sellerTeamId);
    if (success) {
      updateTeam(team.id, (t) => ({
        ...t,
        squad: t.squad.map(p =>
          p.id === playerId ? { ...p, squadStatus: selectedStatus } : p,
        ),
      }));
      setBuyFeedback('Jogador contratado com sucesso!');
    } else {
      setBuyFeedback('Orçamento insuficiente para esta contratação.');
    }
    setTimeout(() => setBuyFeedback(null), 3000);
  };

  return (
    <div className="fm-transfer-market">
      <header className="fm-transfer-market__header">
        <h1>Mercado de Transferências</h1>
        {team && (
          <div className="fm-transfer-market__budget">
            <span className="fm-transfer-market__label">Orçamento:</span>
            <span className="fm-transfer-market__value">R$ {team.budget.toFixed(1)}M</span>
          </div>
        )}
      </header>

      {buyFeedback && <div className="fm-transfer-market__feedback">{buyFeedback}</div>}

      <div className="fm-transfer-market__tabs">
        {(['market', 'scouting', 'offers'] as const).map((tab) => (
          <button
            key={tab}
            className={`fm-transfer-market__tab ${activeTab === tab ? 'fm-transfer-market__tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'market' ? 'Mercado' : tab === 'scouting' ? 'Scouting' : `Ofertas (${incomingTransfers.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'market' && (
        <>
          <div className="fm-transfer-market__filters">
            <input
              type="text"
              placeholder="Buscar jogador..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="fm-transfer-market__search"
            />
            <select
              className="fm-transfer-market__status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {SquadStatusOptions.map((s) => (
                <option key={s} value={s}>Estatuto: {s}</option>
              ))}
            </select>
          </div>
          <div className="fm-transfer-market__players">
            {filteredPlayers.length === 0 ? (
              <div className="fm-empty">Nenhum jogador disponível no mercado.</div>
            ) : (
              <div className="fm-player-grid">
                {filteredPlayers.slice(0, 24).map(({ player, teamId, teamName }) => {
                  const report = scoutReports.find(r => r.playerId === player.id);
                  const scouted = !!report;
                  return (
                    <div key={player.id} className="fm-transfer-player-wrap">
                      {!scouted && (
                        <div className="fm-transfer-fog">🔍 Atribua olheiro para ver atributos</div>
                      )}
                      {scouted ? (
                        <PlayerCard
                          player={player}
                          actionLabel={`Comprar (R$ ${player.marketValue}M)`}
                          onAction={() => handleBuy(player.id, teamId)}
                        />
                      ) : (
                        <div className="fm-transfer-fog-card">
                          <h3>??? Jogador</h3>
                          <p>{player.position} — {teamName}</p>
                          <p>Idade: {player.age} | {player.nationality}</p>
                          <Button onClick={assignScout}>Atribuir Olheiro</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'scouting' && (
        <div className="fm-scouting-section">
          <div className="fm-scouting-section__header">
            <h2>Relatórios de Scouting</h2>
            <Button onClick={assignScout}>Atribuir Olheiro</Button>
          </div>
          <div className="fm-scouting-section__reports">
            {scoutReports.length === 0 ? (
              <div className="fm-empty">Nenhum relatório. Atribua olheiros para começar.</div>
            ) : (
              <div className="fm-scout-reports-grid">
                {scoutReports.map((report) => {
                  const seller = marketPlayers.find(m => m.player.id === report.playerId);
                  return (
                    <ScoutReportCard
                      key={report.playerId}
                      report={report}
                      onBuy={seller ? () => handleBuy(report.playerId, seller.teamId) : undefined}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'offers' && (
        <div className="fm-offers-section">
          <h2>Ofertas Recebidas</h2>
          {incomingTransfers.length === 0 ? (
            <div className="fm-empty">Nenhuma oferta recebida. Avance semanas para receber propostas.</div>
          ) : (
            <div className="fm-offers-list">
              {incomingTransfers.map((offer) => (
                <TransferOfferCard
                  key={offer.playerId}
                  offer={offer}
                  playerName={getPlayerName(offer.playerId)}
                  fromTeamName={teams.find(t => t.id === offer.fromTeam)?.name ?? offer.fromTeam}
                  onAccept={() => acceptIncomingTransfer(offer.playerId)}
                  onReject={() => rejectIncomingTransfer(offer.playerId)}
                  onDefer={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
