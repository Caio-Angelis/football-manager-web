import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { PlayerCard } from '../squad/PlayerCard';
import { Button } from '../ui/Button';
import { ScoutReportCard } from './ScoutReportCard';
import { InstallmentClauseDisplay } from './InstallmentClauseDisplay';
import { PlayerBonusDisplay } from './PlayerBonusDisplay';
import { TransferAgreementDisplay } from './TransferAgreementDisplay';
import { getFullName } from '../../utils/player';
import type { IncomingTransfer, Player, InstallmentClause, PlayerBonus, NegotiationResult, ContractNegotiationResult, LoanDeal, ShortlistEntry, ScoutRecommendation, BiddingWar } from '../../types/game';
import { Globe, Users } from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';

const SquadStatusOptions = ['Key Player', 'Regular Starter', 'Rotation', 'Young Talent', 'Excess'];

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
        <span className="fm-transfer-offer__detail-value">R$ {offer.contractProposal.salary}K/sem</span>
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
    assignScout, acceptIncomingTransfer, rejectIncomingTransfer, deferTransfer, reinstateDeferredTransfer, rejectDeferredTransfer, updateTeam,
    negotiateCounterOffer, pendingInstallments, incomingBonuses, payInstallment, checkBonuses, claimBonus,
    transferAgreements, terminateTransferAgreement, completedTransfers,
    makeOffer, acceptOffer, negotiatePlayerContract,
    activeLoans, recallLoanedPlayer, buyLoanedPlayer, activateReleaseClause,
    shortlist, addToShortlist, removeFromShortlist,
    scoutRecommendations, dismissScoutRecommendation,
    biddingWars, raiseBid, withdrawBid,
  } = useGameStore();

  const [filter, setFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  // Item 9: Persistência da aba selecionada no localStorage
  const [activeTab, setActiveTab] = useState<'market' | 'scouting' | 'offers' | 'deferred' | 'installments' | 'bonuses' | 'agreements' | 'completed' | 'loans' | 'shortlist' | 'recommendations' | 'bidding'>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('fm_activeTab') : null;
    const validTabs: Record<string, boolean> = { market: true, scouting: true, offers: true, deferred: true, installments: true, bonuses: true, agreements: true, completed: true, loans: true, shortlist: true, recommendations: true, bidding: true };
    return (saved && validTabs[saved]) ? saved as 'market' | 'scouting' | 'offers' | 'deferred' | 'installments' | 'bonuses' | 'agreements' | 'completed' | 'loans' | 'shortlist' | 'recommendations' | 'bidding' : 'market';
  });
  const [selectedStatus, setSelectedStatus] = useState('Rotation');
  const [positionFilter, setPositionFilter] = useState('');
  const [sortBy, setSortBy] = useState<'marketValue' | 'position' | 'name'>('marketValue');
  const [sortDesc, setSortDesc] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [negotiateFeedback, setNegotiateFeedback] = useState<string | null>(null);
  const [installmentFeedback, setInstallmentFeedback] = useState<string | null>(null);
  const [bonusFeedback, setBonusFeedback] = useState<string | null>(null);
  const [terminateFeedback, setTerminateFeedback] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [scoutFeedback, setScoutFeedback] = useState<string | null>(null);
  const [marketPage, setMarketPage] = useState(1);
  const MARKET_ITEMS_PER_PAGE = 24;

  // Estado do modal de negociação
  const [negotiationModal, setNegotiationModal] = useState<{
    playerId: string;
    playerName: string;
    sellerTeamId: string;
    sellerTeamName: string;
    marketValue: number;
  } | null>(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [negotiationResult, setNegotiationResult] = useState<NegotiationResult | null>(null);
  const [negotiationLoading, setNegotiationLoading] = useState(false);
  const [negotiationRound, setNegotiationRound] = useState(1);
  const [negotiationHistory, setNegotiationHistory] = useState<{ round: number; offerPrice: number; result: NegotiationResult }[]>([]);

  // Estado da negociação de contrato com o jogador (salário)
  const [contractPhase, setContractPhase] = useState(false);
  const [contractNegotiationResult, setContractNegotiationResult] = useState<ContractNegotiationResult | null>(null);
  const [contractNegotiationRound, setContractNegotiationRound] = useState(1);
  const [contractHistory, setContractHistory] = useState<{ round: number; offeredSalary: number; result: ContractNegotiationResult }[]>([]);
  const [salaryOffer, setSalaryOffer] = useState('');

  // Item 8: Debounce de 300ms na busca de jogadores
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilter(filter);
    }, 300);
    return () => clearTimeout(timer);
  }, [filter]);

  // Item 7: Ordenação para listas de transferências/parcelas/bónus
  const sortByDateDesc = <T extends { deferredAt?: number; agreementDate?: string }>(a: T, b: T) => {
    const aDate = (a as any).deferredAt ?? a.agreementDate ?? 0;
    const bDate = (b as any).deferredAt ?? b.agreementDate ?? 0;
    return bDate - aDate;
  };

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

  const navigate = useNavigate();
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
        return getFullName(player).toLowerCase().includes(debouncedFilter.toLowerCase());
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
      if (p) return getFullName(p);
    }
    return `Jogador Vendido (${playerId.slice(0, 8)})`;
  };

  const openNegotiation = (playerId: string, sellerTeamId: string) => {
    const seller = teams.find(t => t.id === sellerTeamId);
    const player = seller?.squad.find(p => p.id === playerId);
    if (!seller || !player) return;
    setNegotiationModal({
      playerId,
      playerName: getFullName(player),
      sellerTeamId,
      sellerTeamName: seller.name,
      marketValue: player.marketValue,
    });
    setOfferAmount(String(player.marketValue));
    setNegotiationResult(null);
    setNegotiationRound(1);
    setNegotiationHistory([]);
    setContractPhase(false);
    setContractNegotiationResult(null);
    setContractNegotiationRound(1);
    setContractHistory([]);
    setSalaryOffer('');
  };

  const handleMakeOffer = async () => {
    if (!negotiationModal) return;
    const price = parseFloat(offerAmount);
    if (isNaN(price) || price <= 0) {
      addToast?.('Valor inválido.', 'warning');
      return;
    }
    setNegotiationLoading(true);
    try {
      const result = await makeOffer(negotiationModal.playerId, negotiationModal.sellerTeamId, price, negotiationRound);
      setNegotiationResult(result);
      setNegotiationHistory(prev => [...prev, { round: negotiationRound, offerPrice: price, result }]);
      addToast?.(result.message, result.status === 'rejected' || result.status === 'walked_away' ? 'warning' : 'info');
    } catch {
      addToast?.('Erro ao enviar proposta.', 'error');
    } finally {
      setNegotiationLoading(false);
    }
  };

  const handleQuickOffer = (percentage: number) => {
    if (!negotiationModal) return;
    const value = Math.round(negotiationModal.marketValue * percentage * 10) / 10;
    setOfferAmount(String(value));
  };

  const handleQuickSalaryOffer = (percentage: number) => {
    if (!negotiationModal) return;
    // E-36: Number.isFinite em vez de ?? (NaN ?? 50 ainda é NaN).
    const parsed = parseFloat(salaryOffer);
    const base = contractNegotiationResult?.expectedSalary ?? (Number.isFinite(parsed) ? parsed : 50);
    const value = Math.round(base * percentage);
    setSalaryOffer(String(value));
  };

  const handleNegotiateContract = async () => {
    if (!negotiationModal) return;
    const salary = parseFloat(salaryOffer);
    if (isNaN(salary) || salary <= 0) {
      addToast?.('Salário inválido.', 'warning');
      return;
    }
    setNegotiationLoading(true);
    try {
      const result = await negotiatePlayerContract(negotiationModal.playerId, negotiationModal.sellerTeamId, salary, contractNegotiationRound);
      setContractNegotiationResult(result);
      setContractHistory(prev => [...prev, { round: contractNegotiationRound, offeredSalary: salary, result }]);
      addToast?.(result.message, result.status === 'rejected' ? 'warning' : 'info');
    } catch {
      addToast?.('Erro ao negociar contrato.', 'error');
    } finally {
      setNegotiationLoading(false);
    }
  };

  const handleAcceptContractCounter = async () => {
    if (!negotiationModal || !contractNegotiationResult?.counterSalary) return;
    setSalaryOffer(String(contractNegotiationResult.counterSalary));
    setNegotiationLoading(true);
    try {
      const result = await negotiatePlayerContract(negotiationModal.playerId, negotiationModal.sellerTeamId, contractNegotiationResult.counterSalary, contractNegotiationRound);
      setContractNegotiationResult(result);
      setContractHistory(prev => [...prev, { round: contractNegotiationRound, offeredSalary: contractNegotiationResult.counterSalary!, result }]);
      addToast?.(result.message, result.status === 'rejected' ? 'warning' : 'info');
    } catch {
      addToast?.('Erro ao negociar contrato.', 'error');
    } finally {
      setNegotiationLoading(false);
    }
  };

  const handleFinalizeTransfer = async () => {
    if (!negotiationModal || !contractNegotiationResult) return;
    const price = parseFloat(offerAmount);
    const salary = contractNegotiationResult.offeredSalary;
    setNegotiationLoading(true);
    try {
      const success = await acceptOffer(negotiationModal.playerId, negotiationModal.sellerTeamId, price, salary);
      if (success) {
        const squadStatus: Record<string, string> = {};
        squadStatus[negotiationModal.playerId] = selectedStatus;
        updateTeam(selectedTeam!, (t) => ({
          ...t,
          squadStatus,
        }));
        addToast?.('Jogador contratado com sucesso!', 'success');
        closeNegotiation();
      } else {
        addToast?.('Orçamento insuficiente para esta contratação.', 'warning');
      }
    } catch {
      addToast?.('Erro ao contratar jogador.', 'error');
    } finally {
      setNegotiationLoading(false);
    }
  };

  const handleAcceptCounter = async () => {
    if (!negotiationModal || !negotiationResult?.counterPrice) return;
    setNegotiationLoading(true);
    try {
      const result = await makeOffer(negotiationModal.playerId, negotiationModal.sellerTeamId, negotiationResult.counterPrice, negotiationRound);
      if (result.status === 'accepted') {
        setNegotiationResult(result);
        setOfferAmount(String(negotiationResult.counterPrice));
        setNegotiationHistory(prev => [...prev, { round: negotiationRound, offerPrice: negotiationResult.counterPrice!, result }]);
        // Transition to contract negotiation phase
        const estSalary = result.contractPreview?.estimatedSalary ?? 50;
        setSalaryOffer(String(estSalary));
        setContractPhase(true);
        setContractNegotiationResult(null);
        setContractNegotiationRound(1);
        setContractHistory([]);
        addToast?.('Clube aceitou! Agora negocie o contrato com o jogador.', 'info');
      } else {
        setNegotiationResult(result);
        setNegotiationHistory(prev => [...prev, { round: negotiationRound, offerPrice: negotiationResult.counterPrice!, result }]);
        addToast?.(result.message, result.status === 'rejected' || result.status === 'walked_away' ? 'warning' : 'info');
      }
    } catch {
      addToast?.('Erro ao aceitar contra-oferta.', 'error');
    } finally {
      setNegotiationLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!negotiationModal || !negotiationResult) return;
    if (negotiationResult.status !== 'accepted') return;
    // Transition to contract negotiation phase using the already-accepted result
    const estSalary = negotiationResult.contractPreview?.estimatedSalary ?? 50;
    setSalaryOffer(String(estSalary));
    setContractPhase(true);
    setContractNegotiationResult(null);
    setContractNegotiationRound(1);
    setContractHistory([]);
    addToast?.('Clube aceitou! Agora negocie o contrato com o jogador.', 'info');
  };

  const closeNegotiation = () => {
    setNegotiationModal(null);
    setNegotiationResult(null);
    setOfferAmount('');
    setNegotiationRound(1);
    setNegotiationHistory([]);
    setContractPhase(false);
    setContractNegotiationResult(null);
    setContractNegotiationRound(1);
    setContractHistory([]);
    setSalaryOffer('');
  };

  const handleNegotiate = async (playerId: string) => {
    try {
      const success = await negotiateCounterOffer(playerId);
      if (success) {
        setNegotiateFeedback('Contra-oferta enviada com sucesso!');
      } else {
        setNegotiateFeedback('Não foi possível enviar contra-oferta.');
      }
    } catch {
      setNegotiateFeedback('Erro ao enviar contra-oferta. Tente novamente.');
    }
    setTimeout(() => setNegotiateFeedback(null), 3000);
  };

  const handleAssignScout = async (playerId?: string) => {
    try {
      const success = await assignScout(playerId);
      if (success) {
        setScoutFeedback(playerId ? 'Relatório de scouting atribuído!' : 'Relatórios gerados para 3 jogadores.');
      } else {
        setScoutFeedback('Não foi possível gerar relatório — jogador já tem relatório ou não existe.');
      }
    } catch {
      setScoutFeedback('Erro ao gerar relatório. Tente novamente.');
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
    <div className="fms-page">
      <PageHeader
        title="Mercado de Transferências"
        subtitle={`${team ? team.name : '—'} · Orçamento R$ ${(team?.budget ?? 0).toFixed(1)}M`}
        teamName={team?.name}
        teamReputation={team?.reputation}
        actions={[
          { icon: <Globe size={15} />, title: 'Visão do Clube', onClick: () => navigate('/clube') },
          { icon: <Users size={15} />, title: 'Elenco', onClick: () => navigate('/elenco') },
        ]}
      />

      <div className="fms-body--scroll">

      {negotiateFeedback && <div className="fm-transfer-market__feedback">{negotiateFeedback}</div>}
      {scoutFeedback && <div className="fm-transfer-market__feedback">{scoutFeedback}</div>}

      <div className="fm-transfer-market__tabs">
        <button onClick={() => setShowAll(v => !v)} className="fm-transfer-market__tab fm-transfer-market__tab--toggle">
          {showAll ? 'Mostrar Pendentes' : 'Mostrar Todos'}
        </button>
        {(['market', 'scouting', 'offers', 'deferred', 'installments', 'bonuses', 'agreements', 'completed', 'loans', 'shortlist', 'recommendations', 'bidding'] as const).map((tab) => (
          <button
            key={tab}
            className={`fm-transfer-market__tab ${activeTab === tab ? 'fm-transfer-market__tab--active' : ''}`}
            onClick={() => {
              setActiveTab(tab);
              if (typeof window !== 'undefined') localStorage.setItem('fm_activeTab', tab);
            }}
          >
            {tab === 'market' ? 'Mercado' : tab === 'scouting' ? 'Scouting' : tab === 'offers' ? `Ofertas (${showAll ? incomingTransfers.length : incomingTransfers.filter(o => !deferredTransfers.find(d => d.playerId === o.playerId)).length})` : tab === 'deferred' ? `Adiados (${showAll ? deferredTransfers.length : deferredTransfers.length})` : tab === 'installments' ? `Parcelas (${showAll ? pendingInstallments.length : pendingInstallments.filter(i => i.status === 'active').length})` : tab === 'bonuses' ? `Bónus (${showAll ? incomingBonuses.length : incomingBonuses.filter(b => !b.triggered).length})` : tab === 'agreements' ? `Acordos (${transferAgreements.filter(a => a.status === 'active').length})` : tab === 'completed' ? `Realizados (${completedTransfers.length})` : tab === 'loans' ? `Empréstimos (${(activeLoans ?? []).filter(l => l.status === 'active').length})` : tab === 'shortlist' ? `Shortlist (${(shortlist ?? []).length})` : tab === 'recommendations' ? `Recomendações (${(scoutRecommendations ?? []).filter(r => !r.dismissed).length})` : `Guerra (${(biddingWars ?? []).filter(w => w.status === 'active').length})`}
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
          {selectedPlayerId && (() => {
            const sel = marketPlayers.find(m => m.player.id === selectedPlayerId);
            if (!sel) { setSelectedPlayerId(null); return null; }
            return (
            <div className="fm-transfer-market__selection-bar">
              <span>
                Jogador selecionado:{' '}
                {getFullName(sel.player)}
              </span>
              <Button onClick={() => handleAssignScout(selectedPlayerId)}>Confirmar</Button>
              <Button variant="secondary" onClick={() => setSelectedPlayerId(null)}>Cancelar</Button>
            </div>
            );
          })()}
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
                      {scouted ? (
                        <PlayerCard
                          player={player}
                          actionLabel={`Comprar (R$ ${player.marketValue}M)`}
                          onAction={() => openNegotiation(player.id, teamId)}
                        />
                      ) : (
                        <div className="fm-transfer-fog-card">
                          <div className="fm-transfer-fog-card__blurred">
                            <h3>??? Jogador</h3>
                            <p>{player.position} — {teamName}</p>
                            <p>Idade: {player.age} | {player.nationality}</p>
                          </div>
                          <div className="fm-transfer-fog-card__overlay">
                            <span className="fm-transfer-fog-card__hint">🔍 Atribua um olheiro para ver atributos</span>
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
                        </div>
                      )}
                      <div className="fm-transfer-player-wrap__extra-actions">
                        {(shortlist ?? []).some(e => e.playerId === player.id) ? (
                          <Button variant="secondary" onClick={() => { removeFromShortlist(player.id); addToast?.('Removido da shortlist.', 'info'); }}>
                            ★ Remover da Shortlist
                          </Button>
                        ) : (
                          <Button variant="secondary" onClick={() => { addToShortlist(player.id); addToast?.('Adicionado à shortlist.', 'success'); }}>
                            ☆ Adicionar à Shortlist
                          </Button>
                        )}
                        {player.contractClause && player.contractClause > 0 && team && team.budget >= player.contractClause && (
                          <Button variant="primary" onClick={async () => {
                            const ok = await activateReleaseClause(player.id, teamId);
                            if (ok) addToast?.(`Cláusula ativada! ${getFullName(player)} contratado por R$ ${player.contractClause}M.`, 'success');
                            else addToast?.('Não foi possível ativar a cláusula.', 'warning');
                          }}>
                            Cláusula: R$ {player.contractClause}M
                          </Button>
                        )}
                      </div>
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
          {team && team.scouts && team.scouts.length > 0 && (
            <div className="fm-scouts-panel">
              <h3 className="fm-scouts-panel__title">Olheiros</h3>
              <div className="fm-scouts-panel__grid">
                {team.scouts.map(scout => (
                  <div key={scout.id} className={`fm-scout-card ${scout.assigned ? 'fm-scout-card--assigned' : ''}`}>
                    <div className="fm-scout-card__header">
                      <span className="fm-scout-card__name">{scout.name}</span>
                      {scout.assigned && <span className="fm-scout-card__badge">Em missão</span>}
                    </div>
                    <div className="fm-scout-card__stats">
                      <div className="fm-scout-card__stat">
                        <span className="fm-scout-card__stat-label">Julg. Habilidade</span>
                        <span className="fm-scout-card__stat-value">{scout.judgingAbility}/20</span>
                      </div>
                      <div className="fm-scout-card__stat">
                        <span className="fm-scout-card__stat-label">Julg. Potencial</span>
                        <span className="fm-scout-card__stat-value">{scout.judgingPotential}/20</span>
                      </div>
                      <div className="fm-scout-card__stat">
                        <span className="fm-scout-card__stat-label">Experiência</span>
                        <span className="fm-scout-card__stat-value">{scout.experience ?? 0} pts</span>
                      </div>
                      <div className="fm-scout-card__stat">
                        <span className="fm-scout-card__stat-label">Missões</span>
                        <span className="fm-scout-card__stat-value">{scout.missionsCompleted ?? 0}</span>
                      </div>
                    </div>
                    {(scout.experience ?? 0) > 0 && (
                      <div className="fm-scout-card__progress">
                        <div className="fm-scout-card__progress-bar" style={{ width: `${Math.min(100, (scout.experience ?? 0) % 100)}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
                      onBuy={seller ? () => openNegotiation(report.playerId, seller.teamId) : undefined}
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
                  onAccept={() => handleAcceptTransfer(offer.playerId)}
                  onReject={() => rejectDeferredTransfer(offer.playerId)}
                  onDefer={() => reinstateDeferredTransfer(offer.playerId)}
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
              {pendingInstallments.slice().sort(sortByNextPaymentAsc).map((clause, index) => {
                const unpaidPayments = clause.payments.filter(p => !p.paid);
                const totalUnpaid = unpaidPayments.reduce((sum, p) => sum + p.amount, 0);
                const nextDue = unpaidPayments.sort((a, b) => a.dueWeek - b.dueWeek)[0];
                return (
                  <div key={clause.id || `ic_${index}`} className="fm-installment-clause-card">
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
                        <Button variant="primary" onClick={async () => {
                          // Pay next pending installment
                          const nextPending = clause.payments.find(p => !p.paid);
                          if (nextPending) {
                            const success = await payInstallment(`${clause.id || ''}:${nextPending.installmentNumber}`);
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
                  <div key={index} className={`fm-bonus-card ${bonus.triggered ? 'fm-bonus-card--triggered' : ''} ${bonus.claimed ? 'fm-bonus-card--claimed' : ''}`}>
                    <div className="fm-bonus-card__header">
                      <span className="fm-bonus-card__type">{typeLabels[bonus.type]}</span>
                      <span className="fm-bonus-card__status">
                        {bonus.claimed ? '✓ Reclamado' : bonus.triggered ? '✓ Ativo' : 'Pendente'}
                      </span>
                    </div>
                    <div className="fm-bonus-card__details">
                      <span>Meta: {bonus.threshold}x</span>
                      <span className="fm-bonus-card__amount">R$ {bonus.bonusAmount}K</span>
                    </div>
                    {bonus.triggered && !bonus.claimed && (
                      <div className="fm-bonus-card__actions">
                        <Button variant="success" onClick={() => {
                          claimBonus(bonus.id || bonus.playerId);
                          setBonusFeedback('Bónus reclamado!');
                          setTimeout(() => setBonusFeedback(null), 2000);
                        }}>Reclamar Bónus</Button>
                      </div>
                    )}
                    <div className="fm-bonus-card__progress">
                      <span>{bonus.claimed ? 'Reclamado' : bonus.triggered ? 'Ativado na semana ' + (bonus.triggeredWeek ?? '?') : 'A aguardar...'}</span>
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

      {/* ============================================================ */}
      {/* ABA: EMPRÉSTIMOS                                              */}
      {/* ============================================================ */}
      {activeTab === 'loans' && (
        <div className="fm-loans-section">
          <h2>Empréstimos Ativos</h2>
          {(activeLoans ?? []).length === 0 ? (
            <div className="fm-empty">Nenhum empréstimo ativo no momento.</div>
          ) : (
            <div className="fm-loans-list">
              {(activeLoans ?? []).map((loan: LoanDeal) => (
                <div key={loan.id} className={`fm-loan-card fm-loan-card--${loan.status}`}>
                  <div className="fm-loan-card__header">
                    <h3 className="fm-loan-card__player-name">{loan.playerName}</h3>
                    <span className={`fm-loan-card__status fm-loan-card__status--${loan.status}`}>
                      {loan.status === 'active' ? 'Ativo' : loan.status === 'completed' ? 'Concluído' : loan.status === 'recalled' ? 'Recallado' : 'Comprado'}
                    </span>
                  </div>
                  <div className="fm-loan-card__details">
                    <div className="fm-loan-card__detail">
                      <span className="fm-loan-card__detail-label">De:</span>
                      <span className="fm-loan-card__detail-value">{loan.fromTeamName}</span>
                    </div>
                    <div className="fm-loan-card__detail">
                      <span className="fm-loan-card__detail-label">Taxa:</span>
                      <span className="fm-loan-card__detail-value">R$ {loan.loanFee}M</span>
                    </div>
                    <div className="fm-loan-card__detail">
                      <span className="fm-loan-card__detail-label">Semanas restantes:</span>
                      <span className="fm-loan-card__detail-value">{loan.remainingWeeks}/{loan.durationWeeks}</span>
                    </div>
                    {loan.buyOptionFee != null && (
                      <div className="fm-loan-card__detail">
                        <span className="fm-loan-card__detail-label">Opção de compra:</span>
                        <span className="fm-loan-card__detail-value">R$ {loan.buyOptionFee}M {loan.buyOptionMandatory ? '(obrigatória)' : '(opcional)'}</span>
                      </div>
                    )}
                  </div>
                  {loan.status === 'active' && (
                    <div className="fm-loan-card__actions">
                      <Button variant="secondary" onClick={() => { recallLoanedPlayer(loan.id); addToast?.(`${loan.playerName} recallado.`, 'info'); }}>
                        Recallar
                      </Button>
                      {loan.buyOptionFee != null && (
                        <Button variant="primary" onClick={async () => {
                          const ok = await buyLoanedPlayer(loan.id);
                          if (ok) addToast?.(`${loan.playerName} comprado por R$ ${loan.buyOptionFee}M!`, 'success');
                          else addToast?.('Saldo insuficiente para comprar.', 'warning');
                        }}>
                          Comprar por R$ {loan.buyOptionFee}M
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA: SHORTLIST                                                */}
      {/* ============================================================ */}
      {activeTab === 'shortlist' && (
        <div className="fm-shortlist-section">
          <h2>Shortlist</h2>
          {(shortlist ?? []).length === 0 ? (
            <div className="fm-empty">Nenhum jogador na shortlist. Adicione jogadores do Mercado.</div>
          ) : (
            <div className="fm-shortlist-list">
              {(shortlist ?? []).sort((a: ShortlistEntry, b: ShortlistEntry) => {
                const order = { high: 0, medium: 1, low: 2 };
                return order[a.priority] - order[b.priority];
              }).map((entry: ShortlistEntry) => {
                const allPlayers = teams.flatMap(t => t.squad);
                const player = allPlayers.find(p => p.id === entry.playerId);
                const playerTeam = teams.find(t => t.squad.some(p => p.id === entry.playerId));
                return (
                  <div key={entry.playerId} className={`fm-shortlist-card fm-shortlist-card--${entry.priority}`}>
                    <div className="fm-shortlist-card__header">
                      <h3 className="fm-shortlist-card__player-name">{player ? getFullName(player) : entry.playerId}</h3>
                      <span className={`fm-shortlist-card__priority fm-shortlist-card__priority--${entry.priority}`}>
                        {entry.priority === 'high' ? '🔴 Alta' : entry.priority === 'medium' ? '🟡 Média' : '🟢 Baixa'}
                      </span>
                    </div>
                    <div className="fm-shortlist-card__details">
                      {player && (
                        <>
                          <div className="fm-shortlist-card__detail">
                            <span className="fm-shortlist-card__detail-label">Posição:</span>
                            <span className="fm-shortlist-card__detail-value">{player.position}</span>
                          </div>
                          <div className="fm-shortlist-card__detail">
                            <span className="fm-shortlist-card__detail-label">Idade:</span>
                            <span className="fm-shortlist-card__detail-value">{player.age}</span>
                          </div>
                          <div className="fm-shortlist-card__detail">
                            <span className="fm-shortlist-card__detail-label">Valor:</span>
                            <span className="fm-shortlist-card__detail-value">R$ {player.marketValue}M</span>
                          </div>
                        </>
                      )}
                      {playerTeam && (
                        <div className="fm-shortlist-card__detail">
                          <span className="fm-shortlist-card__detail-label">Clube:</span>
                          <span className="fm-shortlist-card__detail-value">{playerTeam.name}</span>
                        </div>
                      )}
                      {entry.notes && (
                        <div className="fm-shortlist-card__notes">{entry.notes}</div>
                      )}
                    </div>
                    <div className="fm-shortlist-card__actions">
                      <Button variant="secondary" onClick={() => { removeFromShortlist(entry.playerId); addToast?.('Removido da shortlist.', 'info'); }}>
                        Remover
                      </Button>
                      {player && playerTeam && playerTeam.id !== selectedTeam && (
                        <Button variant="primary" onClick={() => {
                          setNegotiationModal({
                            playerId: player.id,
                            playerName: getFullName(player),
                            sellerTeamId: playerTeam.id,
                            sellerTeamName: playerTeam.name,
                            marketValue: player.marketValue,
                          });
                          setOfferAmount(String(Math.round(player.marketValue * 10) / 10));
                        }}>
                          Negociar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA: RECOMENDAÇÕES DE SCOUTS                                  */}
      {/* ============================================================ */}
      {activeTab === 'recommendations' && (
        <div className="fm-recommendations-section">
          <h2>Recomendações de Scouts</h2>
          {(scoutRecommendations ?? []).filter(r => !r.dismissed).length === 0 ? (
            <div className="fm-empty">Nenhuma recomendação ativa no momento. Seus scouts podem recomendar jogadores automaticamente.</div>
          ) : (
            <div className="fm-recommendations-list">
              {(scoutRecommendations ?? []).filter((r: ScoutRecommendation) => !r.dismissed).map((rec: ScoutRecommendation) => (
                <div key={rec.id} className={`fm-recommendation-card fm-recommendation-card--${rec.grade}`}>
                  <div className="fm-recommendation-card__header">
                    <h3 className="fm-recommendation-card__player-name">{rec.playerName}</h3>
                    <span className={`fm-recommendation-card__grade fm-recommendation-card__grade--${rec.grade}`}>
                      Nota {rec.grade}
                    </span>
                  </div>
                  <div className="fm-recommendation-card__details">
                    <div className="fm-recommendation-card__detail">
                      <span className="fm-recommendation-card__detail-label">Posição:</span>
                      <span className="fm-recommendation-card__detail-value">{rec.position}</span>
                    </div>
                    <div className="fm-recommendation-card__detail">
                      <span className="fm-recommendation-card__detail-label">Idade:</span>
                      <span className="fm-recommendation-card__detail-value">{rec.age}</span>
                    </div>
                    <div className="fm-recommendation-card__detail">
                      <span className="fm-recommendation-card__detail-label">CA estimado:</span>
                      <span className="fm-recommendation-card__detail-value">{rec.estimatedCA}</span>
                    </div>
                    <div className="fm-recommendation-card__detail">
                      <span className="fm-recommendation-card__detail-label">PA estimado:</span>
                      <span className="fm-recommendation-card__detail-value">{rec.estimatedPA}</span>
                    </div>
                    <div className="fm-recommendation-card__detail">
                      <span className="fm-recommendation-card__detail-label">Clube:</span>
                      <span className="fm-recommendation-card__detail-value">{rec.currentTeamName}</span>
                    </div>
                    <div className="fm-recommendation-card__detail">
                      <span className="fm-recommendation-card__detail-label">Valor estimado:</span>
                      <span className="fm-recommendation-card__detail-value">R$ {rec.estimatedValue}M</span>
                    </div>
                  </div>
                  <div className="fm-recommendation-card__reason">
                    <span className="fm-recommendation-card__reason-label">Motivo:</span>
                    <span className="fm-recommendation-card__reason-text">{rec.reason}</span>
                  </div>
                  <div className="fm-recommendation-card__meta">
                    <span>Scout: {rec.scoutName}</span>
                    <span>Semana {rec.week}</span>
                  </div>
                  <div className="fm-recommendation-card__actions">
                    <Button variant="secondary" onClick={() => { dismissScoutRecommendation(rec.id); addToast?.('Recomendação dispensada.', 'info'); }}>
                      Dispensar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA: GUERRA DE OFERTAS                                        */}
      {/* ============================================================ */}
      {activeTab === 'bidding' && (
        <div className="fm-bidding-section">
          <h2>Guerra de Ofertas</h2>
          {(biddingWars ?? []).length === 0 ? (
            <div className="fm-empty">Nenhuma guerra de ofertas ativa. Outros clubes podem competir quando você faz uma oferta.</div>
          ) : (
            <div className="fm-bidding-list">
              {(biddingWars ?? []).map((war: BiddingWar) => (
                <div key={war.id} className={`fm-bidding-card fm-bidding-card--${war.status}`}>
                  <div className="fm-bidding-card__header">
                    <h3 className="fm-bidding-card__player-name">{war.playerName}</h3>
                    <span className={`fm-bidding-card__status fm-bidding-card__status--${war.status}`}>
                      {war.status === 'active' ? 'Ativo' : war.status === 'won' ? 'Vencido' : war.status === 'lost' ? 'Perdido' : 'Retirado'}
                    </span>
                  </div>
                  <div className="fm-bidding-card__details">
                    <div className="fm-bidding-card__detail">
                      <span className="fm-bidding-card__detail-label">Vendedor:</span>
                      <span className="fm-bidding-card__detail-value">{war.sellerTeamName}</span>
                    </div>
                    <div className="fm-bidding-card__detail">
                      <span className="fm-bidding-card__detail-label">Sua oferta:</span>
                      <span className="fm-bidding-card__detail-value">R$ {war.userOffer}M</span>
                    </div>
                    <div className="fm-bidding-card__detail">
                      <span className="fm-bidding-card__detail-label">Maior oferta:</span>
                      <span className="fm-bidding-card__detail-value">R$ {war.highestOffer}M</span>
                    </div>
                    <div className="fm-bidding-card__detail">
                      <span className="fm-bidding-card__detail-label">Rodada:</span>
                      <span className="fm-bidding-card__detail-value">{war.round}/{war.maxRounds}</span>
                    </div>
                    <div className="fm-bidding-card__detail">
                      <span className="fm-bidding-card__detail-label">Status:</span>
                      <span className="fm-bidding-card__detail-value">
                        {war.isUserWinning ? 'Você está liderando' : 'Outro clube lidera'}
                      </span>
                    </div>
                  </div>
                  {war.aiOffers.length > 0 && (
                    <div className="fm-bidding-card__competitors">
                      <span className="fm-bidding-card__competitors-label">Competidores:</span>
                      {war.aiOffers.map(offer => (
                        <div key={offer.teamId} className="fm-bidding-card__competitor">
                          <span>{offer.teamName}</span>
                          <span>R$ {offer.offerPrice}M</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {war.status === 'active' && (
                    <div className="fm-bidding-card__actions">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Nova oferta (R$M)"
                        id={`bid-input-${war.id}`}
                      />
                      <Button variant="primary" onClick={async () => {
                        const input = document.getElementById(`bid-input-${war.id}`) as HTMLInputElement;
                        const val = parseFloat(input?.value || '0');
                        if (val > war.userOffer) {
                          const ok = await raiseBid(war.id, val);
                          if (ok) addToast?.(`Oferta aumentada para R$ ${val}M!`, 'success');
                          else addToast?.('Não foi possível aumentar a oferta.', 'warning');
                        } else {
                          addToast?.('A nova oferta deve ser maior que a atual.', 'warning');
                        }
                      }}>
                        Aumentar Oferta
                      </Button>
                      <Button variant="secondary" onClick={() => { withdrawBid(war.id); addToast?.('Oferta retirada.', 'info'); }}>
                        Retirar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {negotiationModal && (
        <div className="fm-negotiation-modal-overlay" onClick={closeNegotiation}>
          <div className="fm-negotiation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fm-negotiation-modal__header">
              <h2>Negociar Transferência</h2>
              <button className="fm-negotiation-modal__close" onClick={closeNegotiation}>×</button>
            </div>
            <div className="fm-negotiation-modal__body">
              <div className="fm-negotiation-modal__player-info">
                <h3>{negotiationModal.playerName}</h3>
                <p>Time vendedor: {negotiationModal.sellerTeamName}</p>
                <p>Valor de mercado: R$ {negotiationModal.marketValue}M</p>
                {team && (
                  <p>Seu orçamento: <span className={team.budget < parseFloat(offerAmount || '0') ? 'fm-negotiation-modal__budget-warning' : ''}>R$ {team.budget.toFixed(1)}M</span></p>
                )}
              </div>

              {negotiationHistory.length > 0 && (
                <div className="fm-negotiation-modal__history">
                  <h4>Histórico de Negociação</h4>
                  {negotiationHistory.map((h, i) => (
                    <div key={i} className="fm-negotiation-modal__history-item">
                      <span className="fm-negotiation-modal__history-round">R{h.round}</span>
                      <span className="fm-negotiation-modal__history-price">R$ {h.offerPrice}M</span>
                      <span className={`fm-negotiation-modal__history-status fm-negotiation-modal__history-status--${h.result.status}`}>
                        {h.result.status === 'accepted' ? '✅' : h.result.status === 'rejected' ? '❌' : h.result.status === 'countered' ? `🔄 R$ ${h.result.counterPrice}M` : '🚫'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!contractPhase && negotiationResult?.playerWillingness != null && (
                <div className="fm-negotiation-modal__willingness">
                  <div className="fm-negotiation-modal__willingness-header">
                    <span>Vontade do jogador: </span>
                    <span className="fm-negotiation-modal__willingness-label">{negotiationResult.willingnessLabel}</span>
                  </div>
                  <div className="fm-negotiation-modal__willingness-bar">
                    <div
                      className="fm-negotiation-modal__willingness-fill"
                      style={{ width: `${negotiationResult.playerWillingness}%` }}
                    />
                  </div>
                </div>
              )}

              {!contractPhase && negotiationResult?.maxRounds != null && (
                <div className="fm-negotiation-modal__rounds">
                  Ronda {negotiationResult.negotiationRound} de {negotiationResult.maxRounds}
                </div>
              )}

              {/* === FASE 1: NEGOCIAÇÃO COM O CLUBE === */}
              {!contractPhase && !negotiationResult && (
                <div className="fm-negotiation-modal__offer-form">
                  <label htmlFor="offer-amount">Sua proposta (R$ milhões):</label>
                  <div className="fm-negotiation-modal__quick-offers">
                    <button className="fm-negotiation-modal__quick-offer" onClick={() => handleQuickOffer(0.8)}>80%</button>
                    <button className="fm-negotiation-modal__quick-offer" onClick={() => handleQuickOffer(0.9)}>90%</button>
                    <button className="fm-negotiation-modal__quick-offer" onClick={() => handleQuickOffer(1.0)}>100%</button>
                    <button className="fm-negotiation-modal__quick-offer" onClick={() => handleQuickOffer(1.1)}>110%</button>
                  </div>
                  <input
                    id="offer-amount"
                    type="number"
                    min="0"
                    step="0.1"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    disabled={negotiationLoading}
                  />
                  {team && parseFloat(offerAmount) > team.budget && (
                    <p className="fm-negotiation-modal__budget-warning-text">⚠ Valor acima do seu orçamento!</p>
                  )}
                  <Button
                    variant="primary"
                    onClick={handleMakeOffer}
                    disabled={negotiationLoading}
                  >
                    {negotiationLoading ? 'Enviando...' : 'Enviar Proposta'}
                  </Button>
                </div>
              )}

              {!contractPhase && negotiationResult && (
                <div className="fm-negotiation-modal__result">
                  <div className={`fm-negotiation-modal__result-status fm-negotiation-modal__result-status--${negotiationResult.status}`}>
                    {negotiationResult.status === 'accepted' && '✅ Proposta Aceita!'}
                    {negotiationResult.status === 'rejected' && '❌ Proposta Recusada'}
                    {negotiationResult.status === 'countered' && '🔄 Contra-oferta Recebida'}
                    {negotiationResult.status === 'walked_away' && '🚫 Negociação Encerrada'}
                  </div>
                  <p className="fm-negotiation-modal__result-message">{negotiationResult.message}</p>

                  {negotiationResult.status === 'accepted' && negotiationResult.contractPreview && (
                    <div className="fm-negotiation-modal__contract-preview">
                      <h4>Prévia de Contrato</h4>
                      <div className="fm-negotiation-modal__contract-details">
                        <div><span>Salário estimado:</span><span>R$ {negotiationResult.contractPreview.estimatedSalary}K/sem</span></div>
                        <div><span>Duração:</span><span>{Math.floor(negotiationResult.contractPreview.estimatedWeeks / 52)} ano(s) e {negotiationResult.contractPreview.estimatedWeeks % 52} sem</span></div>
                        <div><span>Cláusula de rescisão:</span><span>R$ {negotiationResult.contractPreview.estimatedReleaseClause}M</span></div>
                      </div>
                    </div>
                  )}

                  {negotiationResult.status === 'accepted' && (
                    <Button
                      variant="success"
                      onClick={handleAcceptOffer}
                      disabled={negotiationLoading}
                    >
                      {negotiationLoading ? 'Processando...' : 'Continuar para Negociar Contrato'}
                    </Button>
                  )}

                  {negotiationResult.status === 'countered' && negotiationResult.counterPrice && (
                    <div className="fm-negotiation-modal__counter-actions">
                      <Button
                        variant="success"
                        onClick={handleAcceptCounter}
                        disabled={negotiationLoading}
                      >
                        {negotiationLoading ? 'Processando...' : `Aceitar R$ ${negotiationResult.counterPrice}M`}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setNegotiationResult(null);
                          setOfferAmount(String(negotiationResult.counterPrice));
                          setNegotiationRound(prev => prev + 1);
                        }}
                        disabled={negotiationLoading}
                      >
                        Renegociar
                      </Button>
                    </div>
                  )}

                  {negotiationResult.status === 'rejected' && (
                    <Button
                      variant="secondary"
                      onClick={() => { setNegotiationResult(null); setNegotiationRound(prev => prev + 1); }}
                      disabled={negotiationLoading}
                    >
                      Fazer Nova Proposta
                    </Button>
                  )}

                  {negotiationResult.status === 'walked_away' && (
                    <Button
                      variant="secondary"
                      onClick={closeNegotiation}
                      disabled={negotiationLoading}
                    >
                      Fechar
                    </Button>
                  )}
                </div>
              )}

              {/* === FASE 2: NEGOCIAÇÃO DE CONTRATO COM O JOGADOR === */}
              {contractPhase && (
                <div className="fm-negotiation-modal__contract-phase">
                  <div className="fm-negotiation-modal__phase-banner">
                    ✅ Clube aceitou a transferência de R$ {parseFloat(offerAmount)}M.
                    Agora negocie o salário com o jogador.
                  </div>

                  {contractHistory.length > 0 && (
                    <div className="fm-negotiation-modal__history">
                      <h4>Histórico de Negociação Salarial</h4>
                      {contractHistory.map((h, i) => (
                        <div key={i} className="fm-negotiation-modal__history-item">
                          <span className="fm-negotiation-modal__history-round">R{h.round}</span>
                          <span className="fm-negotiation-modal__history-price">R$ {h.offeredSalary}K/sem</span>
                          <span className={`fm-negotiation-modal__history-status fm-negotiation-modal__history-status--${h.result.status}`}>
                            {h.result.status === 'accepted' ? '✅' : h.result.status === 'rejected' ? '❌' : `🔄 R$ ${h.result.counterSalary}K/sem`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {contractNegotiationResult?.maxRounds != null && (
                    <div className="fm-negotiation-modal__rounds">
                      Ronda {contractNegotiationResult.negotiationRound} de {contractNegotiationResult.maxRounds}
                    </div>
                  )}

                  {!contractNegotiationResult && (
                    <div className="fm-negotiation-modal__offer-form">
                      <label htmlFor="salary-amount">Proposta de salário (R$ mil/semana):</label>
                      <div className="fm-negotiation-modal__quick-offers">
                        <button className="fm-negotiation-modal__quick-offer" onClick={() => handleQuickSalaryOffer(0.8)}>80%</button>
                        <button className="fm-negotiation-modal__quick-offer" onClick={() => handleQuickSalaryOffer(0.9)}>90%</button>
                        <button className="fm-negotiation-modal__quick-offer" onClick={() => handleQuickSalaryOffer(1.0)}>100%</button>
                        <button className="fm-negotiation-modal__quick-offer" onClick={() => handleQuickSalaryOffer(1.1)}>110%</button>
                      </div>
                      <input
                        id="salary-amount"
                        type="number"
                        min="0"
                        step="1"
                        value={salaryOffer}
                        onChange={(e) => setSalaryOffer(e.target.value)}
                        disabled={negotiationLoading}
                      />
                      <Button
                        variant="primary"
                        onClick={handleNegotiateContract}
                        disabled={negotiationLoading}
                      >
                        {negotiationLoading ? 'Enviando...' : 'Propor Salário'}
                      </Button>
                    </div>
                  )}

                  {contractNegotiationResult && (
                    <div className="fm-negotiation-modal__result">
                      <div className={`fm-negotiation-modal__result-status fm-negotiation-modal__result-status--${contractNegotiationResult.status}`}>
                        {contractNegotiationResult.status === 'accepted' && '✅ Contrato Aceito!'}
                        {contractNegotiationResult.status === 'rejected' && '❌ Contrato Recusado'}
                        {contractNegotiationResult.status === 'countered' && '🔄 Contra-oferta do Jogador'}
                      </div>
                      <p className="fm-negotiation-modal__result-message">{contractNegotiationResult.message}</p>

                      {contractNegotiationResult.status === 'accepted' && (
                        <Button
                          variant="success"
                          onClick={handleFinalizeTransfer}
                          disabled={negotiationLoading}
                        >
                          {negotiationLoading ? 'Processando...' : 'Finalizar Contratação'}
                        </Button>
                      )}

                      {contractNegotiationResult.status === 'countered' && contractNegotiationResult.counterSalary && (
                        <div className="fm-negotiation-modal__counter-actions">
                          <Button
                            variant="success"
                            onClick={handleAcceptContractCounter}
                            disabled={negotiationLoading}
                          >
                            {negotiationLoading ? 'Processando...' : `Aceitar R$ ${contractNegotiationResult.counterSalary}K/sem`}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setContractNegotiationResult(null);
                              setSalaryOffer(String(contractNegotiationResult.counterSalary));
                              setContractNegotiationRound(prev => prev + 1);
                            }}
                            disabled={negotiationLoading}
                          >
                            Renegociar
                          </Button>
                        </div>
                      )}

                      {contractNegotiationResult.status === 'rejected' && (
                        <Button
                          variant="secondary"
                          onClick={() => { setContractNegotiationResult(null); setContractNegotiationRound(prev => prev + 1); }}
                          disabled={negotiationLoading}
                        >
                          Fazer Nova Proposta
                        </Button>
                      )}
                    </div>
                  )}

                  <Button
                    variant="secondary"
                    onClick={closeNegotiation}
                    disabled={negotiationLoading}
                  >
                    Cancelar Negociação
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
