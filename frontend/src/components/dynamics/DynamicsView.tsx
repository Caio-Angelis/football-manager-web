import React from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Player } from '../../types/game';

const HIERARCHY_LEVELS = [
  { key: 'Key Player', label: 'Líderes de Equipa' },
  { key: 'Regular Starter', label: 'Altamente Influentes' },
  { key: 'Rotation', label: 'Influentes' },
  { key: 'Young Talent', label: 'Jovens Promessas' },
  { key: 'Excess', label: 'Outros' },
];

function getSatisfaction(player: Player) {
  const playingTime =
    player.squadStatus === 'Key Player' ? 90 :
    player.squadStatus === 'Regular Starter' ? 75 :
    player.squadStatus === 'Rotation' ? 50 :
    player.squadStatus === 'Young Talent' ? 30 : 15;
  const contract =
    player.contractEnd > 52 ? 85 :
    player.contractEnd > 26 ? 70 :
    player.contractEnd > 10 ? 55 : 40;
  const morale = player.morale;
  const performance = player.form;
  return { playingTime, contract, morale, performance };
}

function getCoachTreatmentLabel(type: string): string {
  const labels: Record<string, string> = {
    starter: 'Titular',
    substitute: 'Suplente',
    bench: 'Banquilha',
    training: 'Treino',
    rest: 'Descanso',
  };
  return labels[type] || type;
}

function getFormRatingColor(rating: string): string {
  const colors: Record<string, string> = {
    excellent: '#22c32a',
    good: '#66b634',
    average: '#eab308',
    poor: '#f59e0b',
    terrible: '#ef4444',
  };
  return colors[rating] || '#eab308';
}

function getInfluenceColor(influence: number): string {
  if (influence >= 80) return '#22c32a';
  if (influence >= 60) return '#66b634';
  if (influence >= 40) return '#eab308';
  if (influence >= 20) return '#f59e0b';
  return '#ef4444';
}

export const DynamicsView: React.FC = () => {
  const { selectedTeam, teams, socialTree, generateSocialTree, getActivePromises } = useGameStore();
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

  const activePromises = getActivePromises();

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
              <th>Trat. Treinador</th>
              <th>Confiança</th>
            </tr>
          </thead>
          <tbody>
            {team.squad.map((player) => {
              const s = getSatisfaction(player);
              const ct = player.coachTreatment;
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
                  <td>{getCoachTreatmentLabel(ct.type)}</td>
                  <td>
                    <div className="fm-promise-bar">
                      <div
                        className="fm-promise-bar__fill"
                        style={{
                          width: `${ct.trustLevel}%`,
                          backgroundColor: ct.trustLevel >= 70 ? '#22c32a' : ct.trustLevel >= 40 ? '#eab308' : '#ef4444',
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="fm-dynamics-view__section">
        <h2>Performance do Clube na Tabela</h2>
        <div className="fm-club-performance">
          <div className="fm-club-performance__header">
            <div className="fm-club-performance__stat">
              <span className="fm-club-performance__label">Posição</span>
              <span className="fm-club-performance__value">{team.leaguePosition}</span>
            </div>
            <div className="fm-club-performance__stat">
              <span className="fm-club-performance__label">Forma</span>
              <span
                className="fm-club-performance__value"
                style={{ color: getFormRatingColor(team.formRating) }}
              >
                {team.formRating === 'excellent' ? 'Excelente' :
                 team.formRating === 'good' ? 'Boa' :
                 team.formRating === 'average' ? 'Média' :
                 team.formRating === 'poor' ? 'Fraca' :
                 'Péssima'}
              </span>
            </div>
          </div>
          {team.leagueForm.length > 0 && (
            <div className="fm-club-performance__form">
              <span className="fm-club-performance__label">Últimos jogos:</span>
              <div className="fm-club-performance__form-badges">
                {team.leagueForm.map((result, i) => (
                  <span
                    key={i}
                    className={`fm-form-badge fm-form-badge--${result.toLowerCase()}`}
                    title={result === 'W' ? 'Vitória' : result === 'D' ? 'Empate' : 'Derrota'}
                  >
                    {result === 'W' ? 'V' : result === 'D' ? 'E' : 'D'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
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
        <h2>Árvore Social</h2>
        <div className="fm-social-tree-actions">
          <button
            className="fm-social-tree__generate-btn"
            onClick={generateSocialTree}
            disabled={!!socialTree}
          >
            {socialTree ? 'Árvore já gerada (sem. ' + socialTree.generatedWeek + ')' : 'Gerar Árvore Social'}
          </button>
        </div>

        {socialTree ? (
          <div className="fm-social-tree-display">
            {/* Root Node */}
            <div className="fm-social-tree__root">
              <div className="fm-social-tree__root-node">
                <span className="fm-social-tree__root-label">Centralizador</span>
                <div className="fm-social-tree__node-info">
                  {socialTree.nodes.find(n => n.playerId === socialTree.rootNodeId)?.playerName || 'Desconhecido'}
                </div>
                <div className="fm-social-tree__node-influence">
                  Influência: {socialTree.nodes.find(n => n.playerId === socialTree.rootNodeId)?.influence}%
                </div>
              </div>
            </div>

            {/* Nodes Grid */}
            <div className="fm-social-tree__nodes">
              {socialTree.nodes.map((node) => {
                const isRoot = node.playerId === socialTree.rootNodeId;
                return (
                  <div
                    key={node.playerId}
                    className={`fm-social-tree__node${isRoot ? ' fm-social-tree__node--root' : ''}`}
                    style={{
                      borderLeft: isRoot ? '4px solid #22c32a' : 'none',
                      paddingLeft: isRoot ? 8 : 4,
                    }}
                  >
                    <div className="fm-social-tree__node-header">
                      <span className="fm-social-tree__node-name">{node.playerName}</span>
                      <span className="fm-social-tree__node-position">{node.position}</span>
                    </div>
                    <div className="fm-social-tree__node-stats">
                      <div className="fm-social-tree__node-stat">
                        <span className="fm-social-tree__node-stat-label">Influência:</span>
                        <div className="fm-social-tree__node-stat-bar" style={{ background: getInfluenceColor(node.influence) }} />
                        <span className="fm-social-tree__node-stat-value">{node.influence}%</span>
                      </div>
                      <div className="fm-social-tree__node-stat">
                        <span className="fm-social-tree__node-stat-label">Profundidade:</span>
                        <span className="fm-social-tree__node-stat-value">{node.depth ?? 0} níveis</span>
                      </div>
                    </div>
                    <div className="fm-social-tree__node-connections">
                      {node.connections.map(connId => {
                        const connectedNode = socialTree.nodes.find(n => n.playerId === connId);
                        const edge = socialTree.edges.find(e =>
                          (e.from === node.playerId && e.to === connId) ||
                          (e.from === connId && e.to === node.playerId)
                        );
                        const strength = edge?.strength ?? 0;
                        const strengthClass =
                          strength >= 0.8 ? 'fm-social-tree__connection--strong' :
                          strength >= 0.6 ? 'fm-social-tree__connection--medium' :
                          'fm-social-tree__connection--weak';
                        return connectedNode ? (
                          <span key={connId} className={`fm-social-tree__connection ${strengthClass}`}>
                            {connectedNode.playerName} ({Math.round(strength * 100)}%)
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Edge Legend */}
            <div className="fm-social-tree__edges-legend">
              <h3>Força de Conexões</h3>
              <ul>
                <li>
                  <span className="fm-social-tree__edge-indicator fm-social-tree__edge-indicator--strong" />
                  <span>Fortíssima (≥0.8)</span>
                </li>
                <li>
                  <span className="fm-social-tree__edge-indicator fm-social-tree__edge-indicator--medium" />
                  <span>Forte (0.6-0.8)</span>
                </li>
                <li>
                  <span className="fm-social-tree__edge-indicator fm-social-tree__edge-indicator--weak" />
                  <span>Moderada (0.4-0.6)</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <p className="fm-dynamics-view__note">
            Clique em "Gerar Árvore Social" para visualizar a rede de influências do plantel.
          </p>
        )}
      </section>

      <section className="fm-dynamics-view__section">
        <h2>Promessas Ativas</h2>
        {activePromises.length === 0 ? (
          <p className="fm-dynamics-view__note">Nenhuma promessa ativa no momento.</p>
        ) : (
          <div className="fm-promises-list">
            {activePromises.map(({ player, promise, weeksLeft }) => (
              <div key={`${player.id}-${promise.goal}`} className="fm-promise-card">
                <span className="fm-promise-card__player">{player.name}</span>
                <span className="fm-promise-card__goal">{promise.goal}</span>
                <div className="fm-promise-bar">
                  <div
                    className="fm-promise-bar__fill"
                    style={{
                      width: `${Math.max(0, Math.min(100, (weeksLeft / Math.max(promise.originalDeadline ?? weeksLeft, 1)) * 100))}%`,
                      backgroundColor: weeksLeft <= 2 ? '#ef4444' : weeksLeft <= 5 ? '#eab308' : '#22c32a',
                    }}
                  />
                </div>
                <span className="fm-promise-card__deadline">
                  {weeksLeft} semana{weeksLeft !== 1 ? 's' : ''} restante{weeksLeft !== 1 ? 's' : ''}
                  {weeksLeft <= 0 ? ' — prazo expirado' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};