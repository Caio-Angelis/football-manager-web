import React from 'react';
import { useGameStore } from '../../store/gameStore';

export const FinanceView: React.FC = () => {
  const { selectedTeam, teams, currentSeason, currentWeek } = useGameStore();
  const team = teams.find(t => t.id === selectedTeam);

  if (!team) {
    return <div className="fm-empty">Selecione um time para ver finanças</div>;
  }

  const ticketRevenue = (team.reputation / 100) * 0.5 * team.played;
  const sponsorship = (team.reputation / 100) * 0.3 * Math.max(1, currentWeek);
  const facilityCosts = team.facilitiesLevel * 0.1;
  const weeklyWages = team.wageBill;
  const totalIncome = ticketRevenue + sponsorship;
  const totalExpenses = weeklyWages + facilityCosts;
  const balance = totalIncome - totalExpenses;

  const projection = Array.from({ length: 6 }, (_, i) => {
    const week = currentWeek + i + 1;
    const income = sponsorship / Math.max(currentWeek, 1) * week + ticketRevenue;
    const expenses = weeklyWages * (week / Math.max(currentWeek, 1));
    return { week, balance: team.budget + income - expenses };
  });

  return (
    <div className="fm-finance-view">
      <header className="fm-finance-view__header">
        <h1>Finanças</h1>
        <p>{team.name} — Temporada {currentSeason}, Semana {currentWeek}</p>
      </header>

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
        <h2>Receitas e Despesas</h2>
        <div className="fm-finance-ledger">
          <div className="fm-finance-ledger__row fm-finance-ledger__row--income">
            <span>Bilheteira (acumulado)</span>
            <span>+ R$ {ticketRevenue.toFixed(2)}M</span>
          </div>
          <div className="fm-finance-ledger__row fm-finance-ledger__row--income">
            <span>Patrocínio</span>
            <span>+ R$ {sponsorship.toFixed(2)}M</span>
          </div>
          <div className="fm-finance-ledger__row fm-finance-ledger__row--expense">
            <span>Salários</span>
            <span>- R$ {weeklyWages.toFixed(2)}M</span>
          </div>
          <div className="fm-finance-ledger__row fm-finance-ledger__row--expense">
            <span>Infraestruturas</span>
            <span>- R$ {facilityCosts.toFixed(2)}M</span>
          </div>
        </div>
      </section>

      <section className="fm-finance-view__section">
        <h2>Folha Salarial por Jogador</h2>
        <table className="fm-wages-table">
          <thead>
            <tr>
              <th>Jogador</th>
              <th>Posição</th>
              <th>Salário</th>
              <th>Cláusula</th>
              <th>Contrato</th>
            </tr>
          </thead>
          <tbody>
            {[...team.squad]
              .sort((a, b) => b.salary - a.salary)
              .map((player) => (
                <tr key={player.id}>
                  <td>{player.name} {player.surname}</td>
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
  );
};
