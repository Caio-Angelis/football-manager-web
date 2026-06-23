import React, { useState } from 'react';
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

export const TransferMarket: React.FC = () => {
  const {
    selectedTeam, teams, incomingTransfers, scoutReports,
    buyPlayer, assignScout, acceptIncomingTransfer, rejectIncomingTransfer, updateTeam,
    negotiateCounterOffer, pendingInstallments, incomingBonuses, payInstallment, checkBonuses, claimBonus,
    transferAgreements, terminateTransferAgreement,
  } = useGameStore();

  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'market' | 'scouting' | 'offers' | 'installments' | 'bonuses' | 'agreements'>('market');
  const [selectedStatus, setSelectedStatus] = useState('Rotation');
  const [buyFeedback, setBuyFeedback] = useState<string | null>(null);
  const [negotiateFeedback, setNegotiateFeedback] = useState<string | null>(null);
  const [installmentFeedback, setInstallmentFeedback] = useState<string | null>(null);
  const [bonusFeedback, setBonusFeedback] = useState<string | null>(null);
  const [terminateFeedback, setTerminateFeedback] = useState<string | null>(null);

  const team = teams.find(t => t.id === selectedTeam);

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

  const handleNegotiate = (playerId: string) => {
    const success = negotiateCounterOffer(playerId);
    if (success) {
      setNegotiateFeedback('Contra-oferta enviada com sucesso!');
    } else {
      setNegotiateFeedback('Não foi possível enviar contra-oferta.');
    }
    setTimeout(() => setNegotiateFeedback(null), 3000);
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

      <div className="fm-transfer-market__tabs">
        {(['market', 'scouting', 'offers', 'installments', 'bonuses', 'agreements'] as const).map((tab) => (
          <button
            key={tab}
            className={`fm-transfer-market__tab ${activeTab === tab ? 'fm-transfer-market__tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'market' ? 'Mercado' : tab === 'scouting' ? 'Scouting' : tab === 'offers' ? `Ofertas (${incomingTransfers.length})` : tab === 'installments' ? `Parcelas (${pendingInstallments.filter(i => i.status === 'active').length})` : tab === 'bonuses' ? `Bónus (${incomingBonuses.filter(b => !b.triggered).length})` : `Acordos (${transferAgreements.filter(a => a.status === 'active').length})`}
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
              {pendingInstallments.map((clause) => {
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
              {incomingBonuses.map((bonus, index) => {
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
    </div>
  );
};
