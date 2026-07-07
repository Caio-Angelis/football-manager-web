import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import type { Player } from '../../types/game';
import { getFullName } from '../../utils/player';
import { useSortable } from '../../hooks/useSortable';
import { Globe, Users } from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';

type DynamicsSortKey = 'name' | 'playingTime' | 'contract' | 'morale' | 'performance' | 'squadStatus' | 'coachTreatment' | 'trustLevel';

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
  const navigate = useNavigate();
  const team = teams.find(t => t.id === selectedTeam);

  // E-22: Hooks devem ser chamados incondicionalmente (regra dos Hooks).
  const { sortState, toggleSort } = useSortable<DynamicsSortKey>('name', 'asc');

  const sortedSquad = useMemo(() => {
    const list = [...(team?.squad ?? [])];
    list.sort((a, b) => {
      let cmp: number;
      const sa = getSatisfaction(a);
      const sb = getSatisfaction(b);
      switch (sortState.key) {
        case 'name': cmp = getFullName(a).localeCompare(getFullName(b)); break;
        case 'playingTime': cmp = sa.playingTime - sb.playingTime; break;
        case 'contract': cmp = sa.contract - sb.contract; break;
        case 'morale': cmp = sa.morale - sb.morale; break;
        case 'performance': cmp = sa.performance - sb.performance; break;
        case 'squadStatus': cmp = (a.squadStatus || '').localeCompare(b.squadStatus || ''); break;
        case 'coachTreatment': cmp = (a.coachTreatment?.type || '').localeCompare(b.coachTreatment?.type || ''); break;
        case 'trustLevel': cmp = (a.coachTreatment?.trustLevel ?? 0) - (b.coachTreatment?.trustLevel ?? 0); break;
        default: cmp = 0;
      }
      return sortState.direction === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [team?.squad, sortState]);

  if (!team) {
    return <div className="fm-empty">Selecione um time para ver dinâmicas</div>;
  }

  const leaders = team.squad.filter(p => Number(p.mental?.leadership ?? 0) >= 15);
  const influential = team.squad.filter(p => {
    const l = Number(p.mental?.leadership ?? 0);
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
    <div className="fms-page">
      <PageHeader
        title="Dinâmica do Plantel"
        subtitle={team.name}
        teamName={team.name}
        teamReputation={team.reputation}
        actions={[
          { icon: <Globe size={15} />, title: 'Visão do Clube', onClick: () => navigate('/clube') },
          { icon: <Users size={15} />, title: 'Elenco', onClick: () => navigate('/elenco') },
        ]}
      />

      <div className="fms-body--scroll">

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
                      {getFullName(p)} ({p.position})
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
              <th className="fm-satisfaction-table__th--sortable" onClick={() => toggleSort('name')}>Jogador {sortState.key === 'name' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-satisfaction-table__th--sortable" onClick={() => toggleSort('playingTime')}>Tempo de Jogo {sortState.key === 'playingTime' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-satisfaction-table__th--sortable" onClick={() => toggleSort('contract')}>Contrato {sortState.key === 'contract' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-satisfaction-table__th--sortable" onClick={() => toggleSort('morale')}>Moral {sortState.key === 'morale' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-satisfaction-table__th--sortable" onClick={() => toggleSort('performance')}>Forma {sortState.key === 'performance' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-satisfaction-table__th--sortable" onClick={() => toggleSort('squadStatus')}>Status {sortState.key === 'squadStatus' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-satisfaction-table__th--sortable" onClick={() => toggleSort('coachTreatment')}>Trat. Treinador {sortState.key === 'coachTreatment' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-satisfaction-table__th--sortable" onClick={() => toggleSort('trustLevel')}>Confiança {sortState.key === 'trustLevel' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
            </tr>
          </thead>
          <tbody>
            {sortedSquad.map((player) => {
              const s = getSatisfaction(player);
              const ct = player.coachTreatment;
              return (
                <tr key={player.id}>
                  <td>{getFullName(player)}</td>
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
        <div className="fm-social-groups-grid">
          {Object.entries(socialGroups).map(([group, players], idx) => {
            const avgMorale = Math.round(players.reduce((s, p) => s + (p.morale ?? 50), 0) / players.length);
            const cohesionColor = avgMorale >= 70 ? 'high' : avgMorale >= 45 ? 'medium' : 'low';
            return (
              <div key={group} className="fm-social-group-card" data-group-index={idx}>
                <div className="fm-social-group-card__accent" />
                <div className="fm-social-group-card__header">
                  <div className="fm-social-group-card__title-row">
                    <span className="fm-social-group-card__avatar">
                      {players.length === 1 ? '👤' : '👥'}
                    </span>
                    <div className="fm-social-group-card__title-wrap">
                      <h3 className="fm-social-group-card__title">{group}</h3>
                      <span className="fm-social-group-card__count">{players.length} {players.length === 1 ? 'membro' : 'membros'}</span>
                    </div>
                  </div>
                  <div className={`fm-social-group-card__cohesion fm-social-group-card__cohesion--${cohesionColor}`} title={`Moral média: ${avgMorale}%`}>
                    <span className="fm-social-group-card__cohesion-label">Coesão</span>
                    <div className="fm-social-group-card__cohesion-bar">
                      <div className="fm-social-group-card__cohesion-fill" style={{ width: `${avgMorale}%` }} />
                    </div>
                    <span className="fm-social-group-card__cohesion-value">{avgMorale}%</span>
                  </div>
                </div>
                <div className="fm-social-group-card__members">
                  {players.map(p => {
                    const initials = (p.name?.charAt(0) ?? '') + (p.surname?.charAt(0) ?? '');
                    return (
                      <div key={p.id} className="fm-social-group-card__member">
                        <span className="fm-social-group-card__member-avatar" data-group-index={idx}>{initials || '?'}</span>
                        <span className="fm-social-group-card__member-name">{getFullName(p)}</span>
                        <div className="fm-social-group-card__member-badges">
                          <span className="fm-social-group-card__badge fm-social-group-card__badge--pos">{p.position}</span>
                          {p.squadStatus && (
                            <span className={`fm-social-group-card__badge fm-social-group-card__badge--${(p.squadStatus || '').toLowerCase().replace(/\s+/g, '-')}`}>{p.squadStatus}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
    </div>
  );
};