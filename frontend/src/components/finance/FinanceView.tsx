import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { getFullName } from '../../utils/player';
import { calculateTicketRevenue, calculateSponsorshipRevenue, calculateFacilityCosts, weeklyWages, calculateWageLimit } from '../../utils/finance';
import { useSortable } from '../../hooks/useSortable';
import { Globe, Users, ArrowRight } from 'lucide-react';

type WageSortKey = 'name' | 'position' | 'salary' | 'contractClause' | 'contractEnd';

export const FinanceView: React.FC = () => {
  const { selectedTeam, teams, currentSeason, currentWeek, advanceWeek, isAdvancing } = useGameStore();
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
  const facilityCosts = calculateFacilityCosts(team.facilitiesLevel);
  const weeklyWageCost = weeklyWages(team.wageBill);
  const totalIncome = ticketRevenue + sponsorship;
  const totalExpenses = weeklyWageCost + facilityCosts;
  const balance = totalIncome - totalExpenses;
  const wageBudgetLimit = calculateWageLimit(team.reputation);

  const projection = Array.from({ length: 6 }, (_, i) => {
    const week = currentWeek + i + 1;
    const cumulativeNet = balance * (i + 1);
    return { week, balance: team.budget + cumulativeNet };
  });

  return (
    <div className="fms-page">
      <header className="fms-topbar">
        <div className="fms-topbar__left">
          <div className="fms-club-logo">{(team?.name ?? '?').charAt(0)}</div>
          <div className="fms-title-block">
            <span className="fms-title">Finanças</span>
            <span className="fms-subtitle">{team?.name ?? '—'} — Temporada {currentSeason}, Semana {currentWeek}</span>
          </div>
        </div>
        <div className="fms-topbar__right">
          <button className="fms-icon-btn" title="Visão do Clube" onClick={() => navigate('/clube')}><Globe size={15} /></button>
          <button className="fms-icon-btn" title="Elenco" onClick={() => navigate('/elenco')}><Users size={15} /></button>
          <div className="fms-date">
            <div className="fms-date__main">Temporada {currentSeason}</div>
            <div className="fms-date__sub">Semana {currentWeek}</div>
          </div>
          <button className="fms-continue" onClick={advanceWeek} disabled={isAdvancing}>
            {isAdvancing ? 'Processando...' : 'Continuar'}
            <ArrowRight size={15} />
          </button>
        </div>
      </header>

      <div className="fms-body--scroll">

      <div className="fm-finance-view__summary">
        <div className="fm-finance-card fm-finance-card--highlight">
          <span className="fm-finance-card__label">Orçamento Atual</span>
          <span className="fm-finance-card__value">R$ {team.budget.toFixed(1)}M</span>
        </div>
        <div className="fm-finance-card">
          <span className="fm-finance-card__label">Orçamento Transferências</span>
          <span className="fm-finance-card__value">R$ {team.transferBudget.toFixed(1)}M</span>
        </div>
        <div className="fm-finance-card">
          <span className="fm-finance-card__label">Folha Salarial</span>
          <span className="fm-finance-card__value">R$ {team.wageBill.toFixed(1)}M/mês</span>
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
              <span>Folha atual: R$ {team.wageBill.toFixed(1)}M/mês</span>
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
        <h2>Receitas e Despesas</h2>
        <div className="fm-finance-ledger">
          <div className="fm-finance-ledger__row fm-finance-ledger__row--income">
            <span>Bilheteira (semanal)</span>
            <span>+ R$ {ticketRevenue.toFixed(2)}M</span>
          </div>
          <div className="fm-finance-ledger__row fm-finance-ledger__row--income">
            <span>Patrocínio (semanal)</span>
            <span>+ R$ {sponsorship.toFixed(2)}M</span>
          </div>
          <div className="fm-finance-ledger__row fm-finance-ledger__row--expense">
            <span>Salários (semanal)</span>
            <span>- R$ {weeklyWageCost.toFixed(2)}M</span>
          </div>
          <div className="fm-finance-ledger__row fm-finance-ledger__row--expense">
            <span>Infraestruturas (semanal)</span>
            <span>- R$ {facilityCosts.toFixed(2)}M</span>
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
                  <td>R$ {player.salary}K/mês</td>
                  <td>R$ {player.contractClause.toFixed(1)}M</td>
                  <td>{player.contractEnd} sem.</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      <section className="fm-finance-view__section">
        <h2>Projeção (6 semanas)</h2>
        <div className="fm-finance-chart">
          {projection.map((p) => (
            <div key={p.week} className="fm-finance-chart__bar-group">
              <div
                className="fm-finance-chart__bar"
                style={{ height: `${Math.min(100, (p.balance / Math.max(team.budget, 1)) * 50)}%` }}
                title={`Semana ${p.week}: R$ ${p.balance.toFixed(1)}M`}
              />
              <span className="fm-finance-chart__label">S{p.week}</span>
            </div>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
};
