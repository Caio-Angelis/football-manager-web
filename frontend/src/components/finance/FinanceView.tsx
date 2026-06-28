import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export const FinanceView: React.FC = () => {
  const { selectedTeam, teams, currentSeason, currentWeek, adjustPlayerSalary } = useGameStore();
  const team = teams.find(t => t.id === selectedTeam);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [draftSalary, setDraftSalary] = useState(0);

  if (!team) {
    return <div className="fm-empty">Selecione um time para ver finanças</div>;
  }

  const ticketRevenue = (team.reputation / 100) * 0.5;
  const sponsorship = (team.reputation / 100) * 0.3;
  const facilityCosts = team.facilitiesLevel * 0.1;
  const weeklyWages = team.wageBill * (12 / 52);
  const totalIncome = ticketRevenue + sponsorship;
  const totalExpenses = weeklyWages + facilityCosts;
  const balance = totalIncome - totalExpenses;
  const wageBudgetLimit = team.budget * 0.4;

  const projection = Array.from({ length: 6 }, (_, i) => {
    const week = currentWeek + i + 1;
    const cumulativeNet = balance * (i + 1);
    return { week, balance: team.budget + cumulativeNet };
  });

  const startEditing = (playerId: string, salary: number) => {
    setEditingPlayerId(playerId);
    setDraftSalary(salary);
  };

  const commitSalary = (playerId: string) => {
    adjustPlayerSalary(playerId, draftSalary);
    setEditingPlayerId(null);
  };

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
            <span>- R$ {weeklyWages.toFixed(2)}M</span>
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
              <th>Jogador</th>
              <th>Posição</th>
              <th>Salário</th>
              <th>Ajuste</th>
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
                  <td>
                    {editingPlayerId === player.id ? (
                      <div className="fm-wage-control__editor">
                        <input
                          type="range"
                          min={10}
                          max={500}
                          step={5}
                          value={draftSalary}
                          onChange={(e) => setDraftSalary(Number(e.target.value))}
                          className="fm-wage-control__slider"
                        />
                        <span className="fm-wage-control__value">R$ {draftSalary}K</span>
                        <button type="button" className="fm-wage-control__btn" onClick={() => commitSalary(player.id)}>
                          OK
                        </button>
                        <button type="button" className="fm-wage-control__btn fm-wage-control__btn--cancel" onClick={() => setEditingPlayerId(null)}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="fm-wage-control__btn" onClick={() => startEditing(player.id, player.salary)}>
                        Ajustar
                      </button>
                    )}
                  </td>
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
