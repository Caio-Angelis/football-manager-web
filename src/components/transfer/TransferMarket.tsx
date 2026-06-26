import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PlayerCard } from '../squad/PlayerCard';
import { Button } from '../ui/Button';
import { ScoutReportCard } from './ScoutReportCard';
import type { IncomingTransfer, Player, InstallmentClause, PlayerBonus, TransferAgreement } from '../../types/game';

const SquadStatusOptions = ['Key Player', 'Regular Starter', 'Rotation', 'Young Talent', 'Excess'];

// Componente para exibir cláusula de pagamento parcelado
const InstallmentClauseDisplay: React.FC<{ clause: InstallmentClause }> = ({ clause }) => {
  const paidCount = clause.payments.filter(p => p.paid).length;

  return (
    <div className="fm-installments-display">
      <div className="fm-installments-display__header">
        <span className="fm-installments-display__label">Pagamentos Parcelados</span>
        <span className={`fm-installments-display__status fm-installments-display__status--${clause.status}`}>
          {clause.status === 'completed' ? 'Completo' : clause.status === 'defaulted' ? 'Inadimplente' : 'Ativo'}
        </span>
      </div>
      <div className="fm-installments-display__summary">
        <span className="fm-installments-display__total">Total: R$ {clause.totalAmount}M</span>
        <span className="fm-installments-display__progress">{paidCount}/{clause.installmentCount} pagos</span>
      </div>
      <div className="fm-installments-display__payments">
        {clause.payments.map(payment => (
          <div key={payment.installmentNumber} className={`fm-installment-payment ${payment.paid ? 'fm-installment-payment--paid' : ''}`}>
            <span className="fm-installment-payment__number">Parcela {payment.installmentNumber}</span>
            <span className="fm-installment-payment__amount">R$ {payment.amount}M</span>
            <span className="fm-installment-payment__status">
              {payment.paid ? '✓ Pago' : `Vencimento: Sem. ${payment.dueWeek}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente para exibir bónus
const PlayerBonusDisplay: React.FC<{ bonus: PlayerBonus }> = ({ bonus }) => {
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

// Componente para exibir acordo contratual de transferência (Item 7.10)
const TransferAgreementDisplay: React.FC<{
  agreement: TransferAgreement;
  onTerminate?: () => void;
}> = ({ agreement, onTerminate }) => {
  const contractWeeks = agreement.contract.contractWeeks;
  const years = Math.floor(contractWeeks / 52);
  const weeks = contractWeeks % 52;
  const durationText = years > 0 ? `${years} ano${years > 1 ? 's' : ''}${weeks > 0 ? ` e ${weeks} semana${weeks > 1 ? 's' : ''}` : ''}` : `${weeks} semana${weeks !== 1 ? 's' : ''}`;

  return (
    <div className="fm-transfer-agreement">
      <div className="fm-transfer-agreement__header">
        <h3 className="fm-transfer-agreement__player-name">{agreement.playerName}</h3>
        <span className={`fm-transfer-agreement__status fm-transfer-agreement__status--${agreement.status}`}>
          {agreement.status === 'active' ? 'Ativo' : agreement.status === 'terminated' ? 'Encerrado' : 'Expirado'}
        </span>
      </div>
      <div className="fm-transfer-agreement__details">
        <div className="fm-transfer-agreement__detail">
          <span className="fm-transfer-agreement__detail-label">Valor da Transferência:</span>
          <span className="fm-transfer-agreement__detail-value">R$ {agreement.transferFee}M</span>
        </div>
        <div className="fm-transfer-agreement__detail">
          <span className="fm-transfer-agreement__detail-label">Método de Pagamento:</span>
          <span className="fm-transfer-agreement__detail-value">
            {agreement.paymentMethod === 'installments' ? 'Parcelado' : 'À vista'}
          </span>
        </div>
        <div className="fm-transfer-agreement__detail">
          <span className="fm-transfer-agreement__detail-label">Contrato:</span>
          <span className="fm-transfer-agreement__detail-value">{durationText}</span>
        </div>
        <div className="fm-transfer-agreement__detail">
          <span className="fm-transfer-agreement__detail-label">Salário Semanal:</span>
          <span className="fm-transfer-agreement__detail-value">R$ {agreement.contract.weeklySalary}K</span>
        </div>
        <div className="fm-transfer-agreement__detail">
          <span className="fm-transfer-agreement__detail-label">Cláusula de Rescisão:</span>
          <span className="fm-transfer-agreement__detail-value">R$ {agreement.contract.releaseClause}M</span>
        </div>
        {agreement.contract.performanceBonuses && agreement.contract.performanceBonuses.length > 0 ? (
          <div className="fm-transfer-agreement__bonuses">
            <span className="fm-transfer-agreement__detail-label">Bónus de Performance:</span>
            <div className="fm-transfer-agreement__bonuses-list">
              {agreement.contract.performanceBonuses.map((bonus, index) => {
                const typeLabels: Record<PlayerBonus['type'], string> = {
                  goals: 'Golos',
                  appearances: 'Aparições',
                  assists: 'Assistências',
                  titles: 'Títulos',
                  performance: 'Performance',
                };
                return (
                  <span key={index} className="fm-transfer-agreement__bonus-tag">
                    {typeLabels[bonus.type]}: {bonus.threshold}x → R$ {bonus.bonusAmount}K
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}
        {agreement.installmentClause && agreement.status === 'active' ? (
          <div className="fm-transfer-agreement__installments">
            <span className="fm-transfer-agreement__detail-label">Pagamentos Pendentes:</span>
            <div className="fm-transfer-agreement__installments-summary">
              <span>
                Pagos: {agreement.installmentClause.payments.filter(p => p.paid).length}/{agreement.installmentClause.installmentCount}
              </span>
              <span>
                Restante: R$ {agreement.installmentClause.payments.filter(p => !p.paid).reduce((sum, p) => sum + p.amount, 0)}M
              </span>
            </div>
          </div>
        ) : null}
      </div>
      <div className="fm-transfer-agreement__history">
        <span className="fm-transfer-agreement__history-label">Data de Assinatura:</span>
        <span className="fm-transfer-agreement__history-value">
          {new Date(agreement.agreementDate).toLocaleDateString('pt-BR')}
        </span>
      </div>
      {onTerminate && agreement.status === 'active' && (
        <div className="fm-transfer-agreement__actions">
          <Button variant="secondary" onClick={onTerminate}>Encerrar Acordo</Button>
        </div>
      )}
    </div>
  );
};

const TransferOfferCard: React.FC<{
  offer: IncomingTransfer;
  playerName: string;
  fromTeamName: string;
  onAccept: () => void;
  onReject: () => void;
  onDefer: () => void;
  onNegotiate: () => void;
}> = ({ offer, playerName, fromTeamName, onAccept, onReject, onDefer, onNegotiate }) => (
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
      {offer.paymentMethod === 'installments' && offer.installmentClause ? (
        <div className="fm-transfer-offer__installments">
          <span className="fm-transfer-offer__detail-label">Pagamentos:</span>
          <InstallmentClauseDisplay clause={offer.installmentClause} />
        </div>
      ) : (
        <div className="fm-transfer-offer__detail">
          <span className="fm-transfer-offer__detail-label">Pagamento:</span>
          <span className="fm-transfer-offer__detail-value">À vista</span>
        </div>
      )}
      {offer.bonuses && offer.bonuses.length > 0 ? (
        <div className="fm-transfer-offer__bonuses">
          <span className="fm-transfer-offer__detail-label">Bónus Incluídos:</span>
          <div className="fm-transfer-offer__bonuses-list">
            {offer.bonuses.map((bonus, index) => (
              <PlayerBonusDisplay key={index} bonus={bonus} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
    <div className="fm-transfer-offer__actions">
      <Button variant="secondary" onClick={onDefer}>Adiar</Button>
      <Button variant="primary" onClick={onReject}>Recusar</Button>
      <Button variant="primary" onClick={onNegotiate}>Negociar</Button>
      <Button variant="success" onClick={onAccept}>Aceitar</Button>
    </div>
  </div>
);

export const TransferMarket: React.FC<{
  addToast?: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}> = ({ addToast }) => {
  const {
    selectedTeam, teams, incomingTransfers, scoutReports, deferredTransfers,
    buyPlayer, assignScout, acceptIncomingTransfer, rejectIncomingTransfer, deferTransfer, reinstateDeferredTransfer, rejectDeferredTransfer, updateTeam,
    negotiateCounterOffer, pendingInstallments, incomingBonuses, payInstallment, checkBonuses, claimBonus,
    transferAgreements, terminateTransferAgreement, completedTransfers, getCompletedTransfers,
  } = useGameStore();

  const [filter, setFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  // Item 9: Persistência da aba selecionada no localStorage
  const [activeTab, setActiveTab] = useState<'market' | 'scouting' | 'offers' | 'deferred' | 'installments' | 'bonuses' | 'agreements' | 'completed'>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('fm_activeTab') : null;
    const validTabs: Record<string, boolean> = { market: true, scouting: true, offers: true, deferred: true, installments: true, bonuses: true, agreements: true, completed: true };
    return (saved && validTabs[saved]) ? saved : 'market';
  });
  const [selectedStatus, setSelectedStatus] = useState('Rotation');
  const [positionFilter, setPositionFilter] = useState('');
  const [sortBy, setSortBy] = useState<'marketValue' | 'position' | 'name'>('marketValue');
  const [sortDesc, setSortDesc] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [buyFeedback, setBuyFeedback] = useState<string | null>(null);
  const [negotiateFeedback, setNegotiateFeedback] = useState<string | null>(null);
  const [installmentFeedback, setInstallmentFeedback] = useState<string | null>(null);
  const [bonusFeedback, setBonusFeedback] = useState<string | null>(null);
  const [terminateFeedback, setTerminateFeedback] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [scoutFeedback, setScoutFeedback] = useState<string | null>(null);
  const [marketPage, setMarketPage] = useState(1);
  const MARKET_ITEMS_PER_PAGE = 24;

  // Item 8: Debounce de 300ms na busca de jogadores
  const filterRef = useRef(debouncedFilter);
  useEffect(() => {
    filterRef.current = debouncedFilter;
  }, [debouncedFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilter(filterRef.current);
    }, 300);
    return () => clearTimeout(timer);
  }, [filter]);

  // Item 7: Ordenação para listas de transferências/parcelas/bónus
  const sortByDateDesc = <T extends { deferredAt?: number; agreementDate?: string }>(a: T, b: T) =>
    ((b as any).deferredAt ?? b.agreementDate ?? '') < ((a as any).deferredAt ?? a.agreementDate ?? '')
      ? 1 : -1;

  const sortByActivationDesc = (a: PlayerBonus, b: PlayerBonus) =>
    (a.triggered ? 0 : 1) - (b.triggered ? 0 : 1);

  const sortByNextPaymentAsc = (a: InstallmentClause, b: InstallmentClause) => {
    const nextA = a.payments.find(p => !p.paid);
    const nextB = b.payments.find(p => !p.paid);
    if (!nextA && !nextB) return 0;
    if (!nextA) return 1;
    if (!nextB) return -1;
    return nextA.dueWeek - nextB.dueWeek;
  };

  const team = teams.find(t => t.id === selectedTeam);

  const marketPlayers: { player: Player; teamId: string; teamName: string }[] = teams
    .filter(t => t.id !== selectedTeam)
    .flatMap(t => t.squad.map(player => ({ player, teamId: t.id, teamName: t.name })));

  const positionOrder: Record<string, number> = { GK: 1, DEF: 2, MID: 3, FWD: 4 };

  const sortedPlayers = marketPlayers
    .filter(({ player }) => {
      // Position filter
      if (positionFilter && player.position !== positionFilter) return false;
      // Name filter
      if (debouncedFilter) {
        return `${player.name} ${player.surname}`.toLowerCase().includes(debouncedFilter.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      const diff = sortBy === 'marketValue' ? a.player.marketValue - b.player.marketValue
        : sortBy === 'position' ? positionOrder[a.player.position] - positionOrder[b.player.position]
        : a.player.name.localeCompare(b.player.name);
      return sortDesc ? -diff : diff;
    });

  const filteredPlayers = sortedPlayers;

  const getPlayerName = (playerId: string) => {
    for (const t of teams) {
      const p = t.squad.find(pl => pl.id === playerId);
      if (p) return `${p.name} ${p.surname}`;
    }
    return `Jogador Vendido (${playerId.slice(0, 8)})`;
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
      addToast?.('Jogador contratado com sucesso!', 'success');
    } else {
      setBuyFeedback('Orçamento insuficiente para esta contratação.');
      addToast?.('Orçamento insuficiente para esta contratação.', 'warning');
    }
    setTimeout(() => setBuyFeedback(null), 3000);
  };

  const handleNegotiate = (playerId: string) => {
    const success = negotiateCounterOffer(playerId);
    if (success) {
      setNegotiateFeedback('Contra-oferta enviada com sucesso!');
    } else {
      setNegotiateFeedback('Não foi possível enviar contra-oferta.');
    }
    setTimeout(() => setNegotiateFeedback(null), 3000);
  };

  const handleAssignScout = (playerId?: string) => {
    const success = assignScout(playerId);
    if (success) {
      setScoutFeedback(playerId ? 'Relatório de scouting atribuído!' : 'Relatórios gerados para 3 jogadores.');
    } else {
      setScoutFeedback('Não foi possível gerar relatório — jogador já tem relatório ou não existe.');
    }
    setTimeout(() => setScoutFeedback(null), 3000);
  };

  const handleAcceptTransfer = (playerId: string) => {
    acceptIncomingTransfer(playerId);
    addToast?.('Transferência aceita com sucesso!', 'success');
  };

  const handleRejectTransfer = (playerId: string) => {
    rejectIncomingTransfer(playerId);
    addToast?.('Transferência recusada.', 'warning');
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
      {negotiateFeedback && <div className="fm-transfer-market__feedback">{negotiateFeedback}</div>}
      {scoutFeedback && <div className="fm-transfer-market__feedback">{scoutFeedback}</div>}

      <div className="fm-transfer-market__tabs">
        <button onClick={() => setShowAll(v => !v)} className="fm-transfer-market__tab fm-transfer-market__tab--toggle">
          {showAll ? 'Mostrar Pendentes' : 'Mostrar Todos'}
        </button>
        {([...('market' as const), 'scouting', 'offers', 'deferred', 'installments', 'bonuses', 'agreements', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            className={`fm-transfer-market__tab ${activeTab === tab ? 'fm-transfer-market__tab--active' : ''}`}
            onClick={() => {
              setActiveTab(tab);
              if (typeof window !== 'undefined') localStorage.setItem('fm_activeTab', tab);
            }}
          >
            {tab === 'market' ? 'Mercado' : tab === 'scouting' ? 'Scouting' : tab === 'offers' ? `Ofertas (${showAll ? incomingTransfers.length : incomingTransfers.filter(o => !deferredTransfers.find(d => d.playerId === o.playerId)).length})` : tab === 'deferred' ? `Adiados (${showAll ? deferredTransfers.length : deferredTransfers.length})` : tab === 'installments' ? `Parcelas (${showAll ? pendingInstallments.length : pendingInstallments.filter(i => i.status === 'active').length})` : tab === 'bonuses' ? `Bónus (${showAll ? incomingBonuses.length : incomingBonuses.filter(b => !b.triggered).length})` : tab === 'agreements' ? `Acordos (${transferAgreements.filter(a => a.status === 'active').length})` : `Realizados (${completedTransfers.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'market' && (
        <>
          <div className="fm-transfer-market__filters">
            <input
              id="transfer-search"
              name="transfer-search"
              type="text"
              placeholder="Buscar jogador..."
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setMarketPage(1); setPositionFilter(''); }}
              className="fm-transfer-market__search"
            />
            <select
              id="transfer-position-filter"
              name="transfer-position-filter"
              className="fm-transfer-market__position-select"
              value={positionFilter}
              onChange={(e) => { setPositionFilter(e.target.value); setMarketPage(1); }}
            >
              <option value="">Todas as Posições</option>
              <option value="GK">Guarda-Redes (GK)</option>
              <option value="DEF">Defesa (DEF)</option>
              <option value="MID">Médio (MID)</option>
              <option value="FWD">Avançado (FWD)</option>
            </select>
            <select
              id="transfer-status-filter"
              name="transfer-status-filter"
              className="fm-transfer-market__status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {SquadStatusOptions.map((s) => (
                <option key={s} value={s}>Estatuto: {s}</option>
              ))}
            </select>
            <select
              id="transfer-sort-select"
              name="transfer-sort-select"
              className="fm-transfer-market__sort-select"
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setMarketPage(1); }}
            >
              <option value="marketValue">Ordenar: Valor de Mercado</option>
              <option value="position">Ordenar: Posição</option>
              <option value="name">Ordenar: Nome</option>
            </select>
            <button
              id="transfer-sort-toggle"
              className="fm-transfer-market__sort-toggle"
              onClick={() => { setSortDesc(v => !v); setMarketPage(1); }}
              title={sortDesc ? 'Crescente' : 'Decrescente'}
            >
              {sortDesc ? '↓' : '↑'}
            </button>
          </div>
          {selectedPlayerId && (
            <div className="fm-transfer-market__selection-bar">
              <span>
                Jogador selecionado:{' '}
                {marketPlayers.find(m => m.player.id === selectedPlayerId)?.player.name}{' '}
                {(marketPlayers.find(m => m.player.id === selectedPlayerId)?.player.surname)}
              </span>
              <Button onClick={() => handleAssignScout(selectedPlayerId)}>Confirmar</Button>
              <Button variant="secondary" onClick={() => setSelectedPlayerId(null)}>Cancelar</Button>
            </div>
          )}
          <div className="fm-transfer-market__players">
            {filteredPlayers.length === 0 ? (
              <div className="fm-empty">Nenhum jogador disponível no mercado.</div>
            ) : (
              <div className="fm-player-grid">
                {filteredPlayers.slice(0, marketPage * MARKET_ITEMS_PER_PAGE).map(({ player, teamId, teamName }) => {
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
                          <Button onClick={() => {
                            if (selectedPlayerId === player.id) {
                              setSelectedPlayerId(null);
                            } else {
                              setSelectedPlayerId(player.id);
                            }
                          }}>
                            {selectedPlayerId === player.id ? 'Deselecionar' : 'Atribuir Olheiro'}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {filteredPlayers.length > MARKET_ITEMS_PER_PAGE && (
            <div className="fm-transfer-market__load-more">
              <span>
                Mostrando {Math.min(marketPage * MARKET_ITEMS_PER_PAGE, filteredPlayers.length)} de {filteredPlayers.length} jogadores
              </span>
              <Button
                variant="secondary"
                onClick={() => setMarketPage(p => p + 1)}
              >
                Carregar Mais
              </Button>
            </div>
          )}
        </>
      )}

      {activeTab === 'scouting' && (
        <div className="fm-scouting-section">
          <div className="fm-scouting-section__header">
            <h2>Relatórios de Scouting</h2>
            {selectedPlayerId ? (
              <Button onClick={() => handleAssignScout(selectedPlayerId)}>Confirmar Seleção</Button>
            ) : (
              <Button onClick={() => handleAssignScout()}>Gerar Relatórios (3)</Button>
            )}
          </div>
          <div className="fm-scouting-section__reports">
            {scoutReports.length === 0 ? (
              <div className="fm-empty">Nenhum relatório. Atribua olheiros para começar.</div>
            ) : (
              <div className="fm-scout-reports-grid">
                {scoutReports.slice().sort((a, b) => a.playerId.localeCompare(b.playerId)).map((report) => {
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
              {incomingTransfers.slice().sort((a, b) => a.playerId.localeCompare(b.playerId)).map((offer) => (
                <TransferOfferCard
                  key={offer.playerId}
                  offer={offer}
                  playerName={getPlayerName(offer.playerId)}
                  fromTeamName={teams.find(t => t.id === offer.fromTeam)?.name ?? offer.fromTeam}
                  onAccept={() => handleAcceptTransfer(offer.playerId)}
                  onReject={() => handleRejectTransfer(offer.playerId)}
                  onDefer={() => deferTransfer(offer.playerId)}
                  onNegotiate={() => handleNegotiate(offer.playerId)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'deferred' && (
        <div className="fm-deferred-section">
          <h2>Transferências Adiadas</h2>
          {deferredTransfers.length === 0 ? (
            <div className="fm-empty">Nenhuma transferência adiada. Adie ofertas para revisitar depois.</div>
          ) : (
            <div className="fm-deferred-list">
              {deferredTransfers.slice().sort(sortByDateDesc).map((offer) => (
                <TransferOfferCard
                  key={offer.playerId}
                  offer={offer}
                  playerName={getPlayerName(offer.playerId)}
                  fromTeamName={teams.find(t => t.id === offer.fromTeam)?.name ?? offer.fromTeam}
                  onAccept={() => reinstateDeferredTransfer(offer.playerId)}
                  onReject={() => rejectDeferredTransfer(offer.playerId)}
                  onDefer={() => {}}
                  onNegotiate={() => handleNegotiate(offer.playerId)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'installments' && (
        <div className="fm-installments-section">
          <div className="fm-installments-section__header">
            <h2>Pagamentos Parcelados</h2>
            <Button onClick={() => {
              setInstallmentFeedback('A verificar pagamentos...');
              setTimeout(() => setInstallmentFeedback(null), 1000);
            }}>Verificar Pagamentos</Button>
          </div>
          {pendingInstallments.length === 0 ? (
            <div className="fm-empty">Nenhum pagamento parcelado pendente.</div>
          ) : (
            <div className="fm-installments-list">
              {pendingInstallments.slice().sort(sortByNextPaymentAsc).map((clause) => {
                const unpaidPayments = clause.payments.filter(p => !p.paid);
                const totalUnpaid = unpaidPayments.reduce((sum, p) => sum + p.amount, 0);
                const nextDue = unpaidPayments.sort((a, b) => a.dueWeek - b.dueWeek)[0];
                return (
                  <div key={clause.totalAmount + clause.status} className="fm-installment-clause-card">
                    <div className="fm-installment-clause-card__header">
                      <span className="fm-installment-clause-card__total">R$ {clause.totalAmount}M</span>
                      <span className={`fm-installment-clause-card__status fm-installment-clause-card__status--${clause.status}`}>
                        {clause.status === 'completed' ? 'Completo' : clause.status === 'defaulted' ? 'Inadimplente' : 'Ativo'}
                      </span>
                    </div>
                    {clause.status === 'active' && (
                      <div className="fm-installment-clause-card__summary">
                        <span>Restam: R$ {totalUnpaid}M</span>
                        {nextDue && (
                          <span className="fm-installment-clause-card__next-payment">
                            Próximo vencimento: Semana {nextDue.dueWeek} (R$ {nextDue.amount}M)
                          </span>
                        )}
                      </div>
                    )}
                    {clause.status === 'active' && (
                      <div className="fm-installment-clause-card__actions">
                        <Button variant="primary" onClick={() => {
                          // Pay next pending installment
                          const nextPending = clause.payments.find(p => !p.paid);
                          if (nextPending) {
                            const success = payInstallment(nextPending.installmentNumber.toString());
                            if (success) {
                              setInstallmentFeedback(`Parcela ${nextPending.installmentNumber} paga com sucesso!`);
                            } else {
                              setInstallmentFeedback('Orçamento insuficiente para pagar esta parcela.');
                            }
                          }
                        }}>Pagar Próxima Parcela</Button>
                      </div>
                    )}
                    <div className="fm-installment-clause-card__payments">
                      {clause.payments.map(payment => (
                        <div key={payment.installmentNumber} className={`fm-payment-item ${payment.paid ? 'fm-payment-item--paid' : ''}`}>
                          <span className="fm-payment-item__number">{payment.paid ? '✓' : `P${payment.installmentNumber}`}</span>
                          <span className="fm-payment-item__amount">R$ {payment.amount}M</span>
                          <span className="fm-payment-item__status">
                            {payment.paid ? 'Pago' : `Venc: Sem. ${payment.dueWeek}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'bonuses' && (
        <div className="fm-bonuses-section">
          <div className="fm-bonuses-section__header">
            <h2>Bónus de Transferência</h2>
            <Button onClick={() => {
              checkBonuses();
              setBonusFeedback('Bónus verificados!');
              setTimeout(() => setBonusFeedback(null), 2000);
            }}>Verificar Todos</Button>
          </div>
          {incomingBonuses.length === 0 ? (
            <div className="fm-empty">Nenhum bónus pendente.</div>
          ) : (
            <div className="fm-bonuses-list">
              {incomingBonuses.slice().sort(sortByActivationDesc).map((bonus, index) => {
                const typeLabels: Record<PlayerBonus['type'], string> = {
                  goals: 'Golos',
                  appearances: 'Aparições',
                  assists: 'Assistências',
                  titles: 'Títulos',
                  performance: 'Performance',
                };
                return (
                  <div key={index} className={`fm-bonus-card ${bonus.triggered ? 'fm-bonus-card--triggered' : ''}`}>
                    <div className="fm-bonus-card__header">
                      <span className="fm-bonus-card__type">{typeLabels[bonus.type]}</span>
                      <span className="fm-bonus-card__status">
                        {bonus.triggered ? '✓ Ativo' : 'Pendente'}
                      </span>
                    </div>
                    <div className="fm-bonus-card__details">
                      <span>Meta: {bonus.threshold}x</span>
                      <span className="fm-bonus-card__amount">R$ {bonus.bonusAmount}K</span>
                    </div>
                    {bonus.triggered && (
                      <div className="fm-bonus-card__actions">
                        <Button variant="success" onClick={() => {
                          claimBonus(bonus.playerId);
                          setBonusFeedback('Bónus reclamado!');
                          setTimeout(() => setBonusFeedback(null), 2000);
                        }}>Reclamar Bónus</Button>
                      </div>
                    )}
                    <div className="fm-bonus-card__progress">
                      <span>{bonus.triggered ? 'Ativado na semana ' + (bonus.triggeredWeek ?? '?') : 'A aguardar...'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {installmentFeedback && <div className="fm-transfer-market__feedback">{installmentFeedback}</div>}
      {bonusFeedback && <div className="fm-transfer-market__feedback">{bonusFeedback}</div>}
      {terminateFeedback && <div className="fm-transfer-market__feedback">{terminateFeedback}</div>}

      {activeTab === 'agreements' && (
        <div className="fm-agreements-section">
          <div className="fm-agreements-section__header">
            <h2>Acordos Contratuais</h2>
            <span className="fm-agreements-section__count">
              {transferAgreements.filter(a => a.status === 'active').length} ativos
            </span>
          </div>
          {transferAgreements.length === 0 ? (
            <div className="fm-empty">Nenhum acordo contratual. Compre jogadores no Mercado para criar acordos.</div>
          ) : (
            <div className="fm-agreements-list">
              {transferAgreements.map((agreement) => (
                <TransferAgreementDisplay
                  key={agreement.id}
                  agreement={agreement}
                  onTerminate={agreement.status === 'active' ? () => {
                    terminateTransferAgreement(agreement.id, 'Encerrado pelo usuário');
                    setTerminateFeedback('Acordo encerrado com sucesso!');
                    setTimeout(() => setTerminateFeedback(null), 3000);
                  } : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="fm-completed-section">
          <div className="fm-completed-section__header">
            <h2>Transferências Realizadas</h2>
            <span className="fm-completed-section__count">
              {completedTransfers.length} transferência{completedTransfers.length !== 1 ? 's' : ''}
            </span>
          </div>
          {completedTransfers.length === 0 ? (
            <div className="fm-empty">Nenhuma transferência realizada ainda. Compre jogadores no Mercado para ver o histórico.</div>
          ) : (
            <div className="fm-completed-list">
              {completedTransfers.slice().sort((a, b) => b.transferDate - a.transferDate).map((transfer) => (
                <div key={transfer.id} className="fm-completed-transfer-card">
                  <div className="fm-completed-transfer-card__header">
                    <h3 className="fm-completed-transfer-card__player-name">{transfer.playerName}</h3>
                    <span className={`fm-completed-transfer-card__status fm-completed-transfer-card__status--${transfer.paymentMethod}`}>
                      {transfer.paymentMethod === 'cash' ? 'À vista' : 'Parcelado'}
                    </span>
                  </div>
                  <div className="fm-completed-transfer-card__details">
                    <div className="fm-completed-transfer-card__detail">
                      <span className="fm-completed-transfer-card__detail-label">Posição:</span>
                      <span className="fm-completed-transfer-card__detail-value">{transfer.position}</span>
                    </div>
                    <div className="fm-completed-transfer-card__detail">
                      <span className="fm-completed-transfer-card__detail-label">Idade:</span>
                      <span className="fm-completed-transfer-card__detail-value">{transfer.age} anos</span>
                    </div>
                    <div className="fm-completed-transfer-card__detail">
                      <span className="fm-completed-transfer-card__detail-label">Nacionalidade:</span>
                      <span className="fm-completed-transfer-card__detail-value">{transfer.nationality}</span>
                    </div>
                    <div className="fm-completed-transfer-card__detail">
                      <span className="fm-completed-transfer-card__detail-label">De:</span>
                      <span className="fm-completed-transfer-card__detail-value">{transfer.fromTeamName}</span>
                    </div>
                    <div className="fm-completed-transfer-card__detail">
                      <span className="fm-completed-transfer-card__detail-label">Valor:</span>
                      <span className="fm-completed-transfer-card__detail-value">R$ {transfer.transferFee}M</span>
                    </div>
                    <div className="fm-completed-transfer-card__detail">
                      <span className="fm-completed-transfer-card__detail-label">Contrato:</span>
                      <span className="fm-completed-transfer-card__detail-value">{Math.floor(transfer.contractWeeks / 52)} ano{Math.floor(transfer.contractWeeks / 52) > 1 ? 's' : ''}</span>
                    </div>
                    <div className="fm-completed-transfer-card__detail">
                      <span className="fm-completed-transfer-card__detail-label">Salário:</span>
                      <span className="fm-completed-transfer-card__detail-value">R$ {transfer.weeklySalary}K/semana</span>
                    </div>
                  </div>
                  <div className="fm-completed-transfer-card__meta">
                    <span className="fm-completed-transfer-card__meta-label">Data:</span>
                    <span className="fm-completed-transfer-card__meta-value">
                      Semana {transfer.transferWeek}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
