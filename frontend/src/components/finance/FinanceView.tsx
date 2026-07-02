import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { getFullName } from '../../utils/player';
import { calculateTicketRevenue, calculateSponsorshipRevenue, calculateBroadcastingRevenue, calculateFacilityCosts, calculateStaffCosts, weeklyWages, calculateWageLimit, calculateMatchPrizeMoney } from '../../utils/finance';
import { useSortable } from '../../hooks/useSortable';
import { Globe, Users } from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { MiniAreaChart } from '../charts/MiniAreaChart';

type WageSortKey = 'name' | 'position' | 'salary' | 'contractClause' | 'contractEnd';

export const FinanceView: React.FC = () => {
  const { selectedTeam, teams, currentSeason, currentWeek } = useGameStore();
  const navigate = useNavigate();
  const team = teams.find(t => t.id === selectedTeam);

  if (!team) {
    return <div className="fm-empty">Selecione um time para ver finanças</div>;
  }

  const { sortState, toggleSort } = useSortable<WageSortKey>('salary', 'desc');

  const sortedSquad = useMemo(() => {
    const list = [...team.squad];
    list.sort((a, b) => {
      let cmp: number;
      if (sortState.key === 'name') {
        cmp = getFullName(a).localeCompare(getFullName(b));
      } else if (sortState.key === 'position') {
        cmp = a.position.localeCompare(b.position);
      } else {
        cmp = (a as any)[sortState.key] - (b as any)[sortState.key];
      }
      return sortState.direction === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [team.squad, sortState]);

  const ticketRevenue = calculateTicketRevenue(team.reputation);
  const sponsorship = calculateSponsorshipRevenue(team.reputation);
  const broadcasting = calculateBroadcastingRevenue(team.reputation);
  const facilityCosts = calculateFacilityCosts(team.facilitiesLevel);
  const staffCosts = calculateStaffCosts(team.staffLevel);
  const weeklyWageCost = weeklyWages(team.wageBill);
  const avgPrizeMoney = parseFloat((
    calculateMatchPrizeMoney('win', team.reputation) * 0.4 +
    calculateMatchPrizeMoney('draw', team.reputation) * 0.3 +
    calculateMatchPrizeMoney('loss', team.reputation) * 0.3
  ).toFixed(2));
  const totalIncome = ticketRevenue + sponsorship + broadcasting + avgPrizeMoney;
  const totalExpenses = weeklyWageCost + facilityCosts + staffCosts;
  const balance = totalIncome - totalExpenses;
  const wageBudgetLimit = calculateWageLimit(team.reputation);

  const runway = balance < 0 ? Math.floor(team.budget / Math.abs(balance)) : Infinity;
  const runwayAlert = runway <= 10;

  const projection = Array.from({ length: 6 }, (_, i) => {
    const week = currentWeek + i + 1;
    const cumulativeNet = balance * (i + 1);
    return { week, balance: team.budget + cumulativeNet };
  });

  return (
    <div className="fms-page">
      <PageHeader
        title="Finanças"
        subtitle={`${team?.name ?? '—'} — Temporada ${currentSeason}, Semana ${currentWeek}`}
        teamName={team?.name}
        teamReputation={team?.reputation}
        actions={[
          { icon: <Globe size={15} />, title: 'Visão do Clube', onClick: () => navigate('/clube') },
          { icon: <Users size={15} />, title: 'Elenco', onClick: () => navigate('/elenco') },
        ]}
      />

      <div className="fms-body--scroll">

      <div className="fm-finance-view__summary">
        <div className="fm-finance-card fm-finance-card--highlight">
          <span className="fm-finance-card__label">Orçamento Atual</span>
          <span className="fm-finance-card__value">R$ {team.budget.toFixed(1)}M</span>
        </div>
        <div className="fm-finance-card">
          <span className="fm-finance-card__label">Folha Salarial</span>
          <span className="fm-finance-card__value">R$ {team.wageBill.toFixed(1)}M/sem</span>
        </div>
        <div className="fm-finance-card">
          <span className="fm-finance-card__label">Balanço Semanal</span>
          <span className={`fm-finance-card__value ${balance >= 0 ? 'fm-finance-card__value--positive' : 'fm-finance-card__value--negative'}`}>
            {balance >= 0 ? '+' : ''}R$ {balance.toFixed(2)}M
          </span>
        </div>
      </div>

      <section className="fm-finance-view__section">
        <h2>Controle da Folha Salarial</h2>
        <div className="fm-wage-control">
          <div className="fm-wage-control__meter">
            <div className="fm-wage-control__meter-labels">
              <span>Folha atual: R$ {team.wageBill.toFixed(1)}M/sem</span>
              <span>Limite sugerido: R$ {wageBudgetLimit.toFixed(1)}M</span>
            </div>
            <div className="fm-wage-control__track">
              <div
                className={`fm-wage-control__fill${team.wageBill > wageBudgetLimit ? ' fm-wage-control__fill--over' : ''}`}
                style={{ width: `${Math.min(100, (team.wageBill / Math.max(wageBudgetLimit, 0.1)) * 100)}%` }}
              />
            </div>
            {team.wageBill > wageBudgetLimit && (
              <p className="fm-wage-control__warning">Folha acima do limite recomendado — risco financeiro elevado.</p>
            )}
          </div>
        </div>
      </section>

      <section className="fm-finance-view__section">
        <h2>Extrato Semanal</h2>
        <div className="fm-finance-ledger">
          <div className="fm-finance-ledger__row fm-finance-ledger__row--income">
            <span>Bilheteira</span>
            <span>+ R$ {ticketRevenue.toFixed(2)}M</span>
          </div>
          <div className="fm-finance-ledger__row fm-finance-ledger__row--income">
            <span>Patrocínio</span>
            <span>+ R$ {sponsorship.toFixed(2)}M</span>
          </div>
          <div className="fm-finance-ledger__row fm-finance-ledger__row--income">
            <span>Transmissão</span>
            <span>+ R$ {broadcasting.toFixed(2)}M</span>
          </div>
          <div className="fm-finance-ledger__row fm-finance-ledger__row--income">
            <span>Prêmios por partida (média)</span>
            <span>+ R$ {avgPrizeMoney.toFixed(2)}M</span>
          </div>
          <div className="fm-finance-ledger__row fm-finance-ledger__row--expense">
            <span>Salários</span>
            <span>- R$ {weeklyWageCost.toFixed(2)}M</span>
          </div>
          <div className="fm-finance-ledger__row fm-finance-ledger__row--expense">
            <span>Infraestruturas</span>
            <span>- R$ {facilityCosts.toFixed(2)}M</span>
          </div>
          <div className="fm-finance-ledger__row fm-finance-ledger__row--expense">
            <span>Staff</span>
            <span>- R$ {staffCosts.toFixed(2)}M</span>
          </div>
          <div className="fm-finance-ledger__row fm-finance-ledger__row--total">
            <span>Saldo semanal</span>
            <span className={balance >= 0 ? 'fm-finance-ledger__value--positive' : 'fm-finance-ledger__value--negative'}>
              {balance >= 0 ? '+ ' : '- '}R$ {Math.abs(balance).toFixed(2)}M
            </span>
          </div>
        </div>
      </section>

      <section className="fm-finance-view__section">
        <h2>Folha Salarial por Jogador</h2>
        <table className="fm-wages-table">
          <thead>
            <tr>
              <th className="fm-wages-table__th--sortable" onClick={() => toggleSort('name')}>Jogador {sortState.key === 'name' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-wages-table__th--sortable" onClick={() => toggleSort('position')}>Posição {sortState.key === 'position' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-wages-table__th--sortable" onClick={() => toggleSort('salary')}>Salário {sortState.key === 'salary' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-wages-table__th--sortable" onClick={() => toggleSort('contractClause')}>Cláusula {sortState.key === 'contractClause' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-wages-table__th--sortable" onClick={() => toggleSort('contractEnd')}>Contrato {sortState.key === 'contractEnd' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
            </tr>
          </thead>
          <tbody>
            {sortedSquad.map((player) => (
                <tr key={player.id}>
                  <td>{getFullName(player)}</td>
                  <td>{player.position}</td>
                  <td>R$ {player.salary}K/sem</td>
                  <td>R$ {player.contractClause.toFixed(1)}M</td>
                  <td>{player.contractEnd} sem.</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      <section className="fm-finance-view__section">
        <h2>Fôlego (Runway)</h2>
        <div className={`fm-runway-card${runwayAlert ? ' fm-runway-card--alert' : ''}`}>
          {balance >= 0 ? (
            <>
              <span className="fm-runway-card__label">Saldo positivo</span>
              <span className="fm-runway-card__value fm-runway-card__value--positive">Saudável</span>
              <span className="fm-runway-card__detail">O caixa cresce R$ {balance.toFixed(2)}M por semana.</span>
            </>
          ) : (
            <>
              <span className="fm-runway-card__label">Semanas até esgotar o caixa</span>
              <span className={`fm-runway-card__value${runwayAlert ? ' fm-runway-card__value--alert' : ''}`}>
                {runway <= 0 ? '0' : runway} sem.
              </span>
              <span className="fm-runway-card__detail">
                {runway <= 0
                  ? 'Caixa esgotado — ação urgente necessária!'
                  : runwayAlert
                  ? `⚠ Atenção: o caixa dura apenas ${runway} semanas no ritmo atual.`
                  : `Queimando R$ ${Math.abs(balance).toFixed(2)}M por semana.`}
              </span>
            </>
          )}
        </div>
        <div className="fm-finance-chart">
          <MiniAreaChart
            data={projection}
            xKey="week"
            yKey="balance"
            color={balance >= 0 ? '#3fbf6b' : '#e25c52'}
            height={120}
            labelFormatter={(w) => `Semana ${w}`}
            valueFormatter={(v) => `R$ ${v.toFixed(1)}M`}
          />
        </div>
      </section>
      </div>
    </div>
  );
};
