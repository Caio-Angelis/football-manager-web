import React from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Player } from '../../types/game';

const HIERARCHY_LEVELS = [
  { key: 'Key Player', label: 'Líderes de Equipa', minLeadership: 15 },
  { key: 'Regular Starter', label: 'Altamente Influentes', minLeadership: 12 },
  { key: 'Rotation', label: 'Influentes', minLeadership: 0 },
  { key: 'Young Talent', label: 'Jovens Promessas', minLeadership: -1 },
  { key: 'Excess', label: 'Outros', minLeadership: -1 },
];

function getSatisfaction(player: Player) {
  const playingTime = player.squadStatus === 'Key Player' ? 90 : player.squadStatus === 'Regular Starter' ? 75 : 50;
  const contract = player.salary > 100 ? 80 : 60;
  const morale = player.morale;
  const performance = player.form;
  return { playingTime, contract, morale, performance };
}

export const DynamicsView: React.FC = () => {
  const { selectedTeam, teams } = useGameStore();
  const team = teams.find(t => t.id === selectedTeam);

  if (!team) {
    return <div className="fm-empty">Selecione um time para ver dinâmicas</div>;
  }

  const leaders = team.squad.filter(p => (p.mental?.leadership ?? 0) >= 15);
  const influential = team.squad.filter(p => {
    const l = p.mental?.leadership ?? 0;
    return l >= 12 && l < 15;
  });

  const socialGroups: Record<string, Player[]> = {};
  team.squad.forEach(p => {
    const group = p.socialGroup ?? 'Sem grupo';
    if (!socialGroups[group]) socialGroups[group] = [];
    socialGroups[group].push(p);
  });

  const playersWithPromises = team.squad.filter(p => p.promises.length > 0);

  return (
    <div className="fm-dynamics-view">
      <header className="fm-dynamics-view__header">
        <h1>Dinâmica do Plantel</h1>
        <p>{team.name}</p>
      </header>

      <section className="fm-dynamics-view__section">
        <h2>Pirâmide de Hierarquia</h2>
        <div className="fm-hierarchy">
          {HIERARCHY_LEVELS.map((level) => {
            const players = team.squad.filter(p => p.squadStatus === level.key);
            if (players.length === 0) return null;
            return (
              <div key={level.key} className="fm-hierarchy__level">
                <h3>{level.label}</h3>
                <div className="fm-hierarchy__players">
                  {players.map(p => (
                    <span key={p.id} className="fm-hierarchy__player">
                      {p.name} {p.surname} ({p.position})
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {leaders.length > 0 && (
          <p className="fm-dynamics-view__note">
            Líderes naturais (Liderança ≥15): {leaders.map(p => p.name).join(', ')}
          </p>
        )}
        {influential.length > 0 && (
          <p className="fm-dynamics-view__note">
            Influentes (Liderança 12-14): {influential.map(p => p.name).join(', ')}
          </p>
        )}
      </section>

      <section className="fm-dynamics-view__section">
        <h2>Satisfação do Plantel</h2>
        <table className="fm-satisfaction-table">
          <thead>
            <tr>
              <th>Jogador</th>
              <th>Tempo de Jogo</th>
              <th>Contrato</th>
              <th>Moral</th>
              <th>Forma</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {team.squad.map((player) => {
              const s = getSatisfaction(player);
              return (
                <tr key={player.id}>
                  <td>{player.name} {player.surname}</td>
                  <td>
                    <div className="fm-promise-bar">
                      <div className="fm-promise-bar__fill" style={{ width: `${s.playingTime}%` }} />
                    </div>
                  </td>
                  <td>{s.contract}%</td>
                  <td>{s.morale}%</td>
                  <td>{s.performance}%</td>
                  <td>{player.squadStatus}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="fm-dynamics-view__section">
        <h2>Grupos Sociais</h2>
        <div className="fm-social-tree">
          {Object.entries(socialGroups).map(([group, players]) => (
            <div key={group} className="fm-social-group">
              <h3>{group}</h3>
              <ul>
                {players.map(p => (
                  <li key={p.id}>{p.name} {p.surname}</li>
                ))}
              </ul>
            </div>
          ))}
          {Object.keys(socialGroups).length <= 1 && (
            <p className="fm-dynamics-view__note">
              Panelinhas ainda não formadas — coesão de equipa no treino ajuda a criar grupos.
            </p>
          )}
        </div>
      </section>

      <section className="fm-dynamics-view__section">
        <h2>Promessas Ativas</h2>
        {playersWithPromises.length === 0 ? (
          <p className="fm-dynamics-view__note">Nenhuma promessa ativa no momento.</p>
        ) : (
          <div className="fm-promises-list">
            {playersWithPromises.map((player) =>
              player.promises.map((promise, i) => (
                <div key={`${player.id}-${i}`} className="fm-promise-card">
                  <span className="fm-promise-card__player">{player.name}</span>
                  <span className="fm-promise-card__goal">{promise.goal}</span>
                  <div className="fm-promise-bar">
                    <div
                      className="fm-promise-bar__fill"
                      style={{ width: `${Math.max(0, 100 - promise.deadline * 5)}%` }}
                    />
                  </div>
                  <span className="fm-promise-card__deadline">{promise.deadline} semanas restantes</span>
                </div>
              )),
            )}
          </div>
        )}
      </section>
    </div>
  );
};
