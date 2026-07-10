import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Crown,
  GitBranch,
  Globe,
  Handshake,
  ShieldCheck,
  TrendingUp,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import type { Player } from '../../types/game';
import { getFullName } from '../../utils/player';
import { getRatingColor, STATUS_COLOR } from '../../utils/statusColors';
import { useSortable } from '../../hooks/useSortable';
import { PageHeader } from '../ui/PageHeader';
import './dynamics.css';

type DynamicsSortKey =
  | 'name'
  | 'playingTime'
  | 'contract'
  | 'morale'
  | 'performance'
  | 'squadStatus'
  | 'coachTreatment'
  | 'trustLevel';

const HIERARCHY_LEVELS = [
  { key: 'Key Player', label: 'Líderes de Equipa' },
  { key: 'Regular Starter', label: 'Altamente Influentes' },
  { key: 'Rotation', label: 'Influentes' },
  { key: 'Young Talent', label: 'Jovens Promessas' },
  { key: 'Excess', label: 'Outros' },
] as const;

const SQUAD_STATUS_LABELS: Record<string, string> = {
  'Key Player': 'Jogador-chave',
  'Regular Starter': 'Titular',
  Rotation: 'Rotação',
  'Young Talent': 'Jovem promessa',
  Excess: 'Excedentário',
};

const FORM_LABELS: Record<string, string> = {
  excellent: 'Excelente',
  good: 'Boa',
  average: 'Média',
  poor: 'Fraca',
  terrible: 'Péssima',
};

const FORM_VALUES: Record<string, number> = {
  excellent: 100,
  good: 75,
  average: 50,
  poor: 30,
  terrible: 10,
};

function getSatisfaction(player: Player) {
  const playingTime =
    player.squadStatus === 'Key Player' ? 90
    : player.squadStatus === 'Regular Starter' ? 75
    : player.squadStatus === 'Rotation' ? 50
    : player.squadStatus === 'Young Talent' ? 30
    : 15;
  const contract =
    player.contractEnd > 52 ? 85
    : player.contractEnd > 26 ? 70
    : player.contractEnd > 10 ? 55
    : 40;

  return {
    playingTime,
    contract,
    morale: player.morale,
    performance: player.form,
  };
}

function getCoachTreatmentLabel(type?: string): string {
  const labels: Record<string, string> = {
    starter: 'Titular',
    substitute: 'Suplente',
    bench: 'Banquilha',
    training: 'Treino',
    rest: 'Descanso',
  };
  return type ? labels[type] || type : 'Sem registo';
}

function getSquadStatusLabel(status?: string): string {
  return status ? SQUAD_STATUS_LABELS[status] || status : 'Sem estatuto';
}

function SectionTitle({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <header className="fmd-section-title">
      <span className="fmd-section-title__icon" aria-hidden="true"><Icon size={15} /></span>
      <div>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
    </header>
  );
}

function MetricBar({ value, label }: { value: number; label: string }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="fmd-meter" aria-label={`${label}: ${safeValue}%`}>
      <div className="fmd-meter__track">
        <span
          className="fmd-meter__fill"
          style={{ width: `${safeValue}%`, backgroundColor: getRatingColor(safeValue) }}
        />
      </div>
      <span className="fmd-meter__value">{safeValue}</span>
    </div>
  );
}

export const DynamicsView: React.FC = () => {
  const { selectedTeam, teams, socialTree, generateSocialTree, getActivePromises } = useGameStore();
  const navigate = useNavigate();
  const team = teams.find(candidate => candidate.id === selectedTeam);
  const { sortState, toggleSort } = useSortable<DynamicsSortKey>('name', 'asc');

  const sortedSquad = useMemo(() => {
    const list = [...(team?.squad ?? [])];
    list.sort((a, b) => {
      const sa = getSatisfaction(a);
      const sb = getSatisfaction(b);
      let comparison = 0;

      switch (sortState.key) {
        case 'name': comparison = getFullName(a).localeCompare(getFullName(b)); break;
        case 'playingTime': comparison = sa.playingTime - sb.playingTime; break;
        case 'contract': comparison = sa.contract - sb.contract; break;
        case 'morale': comparison = sa.morale - sb.morale; break;
        case 'performance': comparison = sa.performance - sb.performance; break;
        case 'squadStatus': comparison = (a.squadStatus || '').localeCompare(b.squadStatus || ''); break;
        case 'coachTreatment': comparison = (a.coachTreatment?.type || '').localeCompare(b.coachTreatment?.type || ''); break;
        case 'trustLevel': comparison = (a.coachTreatment?.trustLevel ?? 0) - (b.coachTreatment?.trustLevel ?? 0); break;
      }

      return sortState.direction === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [team?.squad, sortState]);

  if (!team) {
    return <div className="fm-empty">Selecione um time para ver dinâmicas</div>;
  }

  const leaders = team.squad.filter(player => Number(player.mental?.leadership ?? 0) >= 15);
  const influential = team.squad.filter(player => {
    const leadership = Number(player.mental?.leadership ?? 0);
    return leadership >= 12 && leadership < 15;
  });
  const averageMorale = Math.round(
    team.squad.reduce((total, player) => total + (player.morale ?? 50), 0) / Math.max(team.squad.length, 1),
  );
  const socialGroups = team.squad.reduce<Record<string, Player[]>>((groups, player) => {
    const group = player.socialGroup ?? 'Sem grupo';
    (groups[group] ??= []).push(player);
    return groups;
  }, {});
  const activePromises = getActivePromises();
  const formValue = FORM_VALUES[team.formRating] ?? 50;
  const rootNode = socialTree?.nodes.find(node => node.playerId === socialTree.rootNodeId);

  const sortableHeader = (key: DynamicsSortKey, label: string) => (
    <th aria-sort={sortState.key === key ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="fmd-sort" onClick={() => toggleSort(key)}>
        {label}
        <span aria-hidden="true">{sortState.key === key ? (sortState.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  );

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

      <main className="fms-body--scroll fmd-body">
        <section className="fmd-summary" aria-label="Resumo da dinâmica do plantel">
          <div className="fmd-summary__intro">
            <span className="fmd-summary__icon" aria-hidden="true"><Activity size={18} /></span>
            <div>
              <strong>Estado do balneário</strong>
              <span>
                {averageMorale >= 70 ? 'Ambiente positivo e estável'
                : averageMorale >= 40 ? 'Ambiente controlado, mas exige atenção'
                : 'Ambiente frágil — intervenha antes do próximo jogo'}
              </span>
            </div>
          </div>
          <dl className="fmd-summary__metrics">
            <div><dt>Moral média</dt><dd style={{ color: getRatingColor(averageMorale) }}>{averageMorale}%</dd></div>
            <div><dt>Líderes naturais</dt><dd>{leaders.length}</dd></div>
            <div><dt>Grupos sociais</dt><dd>{Object.keys(socialGroups).length}</dd></div>
            <div><dt>Promessas ativas</dt><dd className={activePromises.length > 0 ? 'fmd-text-warning' : ''}>{activePromises.length}</dd></div>
            <div><dt>Pedidos de saída</dt><dd className={team.squad.some(p => p.transferRequest?.active) ? 'fmd-text-warning' : ''}>{team.squad.filter(p => p.transferRequest?.active).length}</dd></div>
          </dl>
        </section>

        <div className="fmd-overview-grid">
          <section className="fmd-panel">
            <SectionTitle
              icon={Crown}
              title="Hierarquia do Balneário"
              detail="Influência formal e liderança natural no plantel."
            />
            <div className="fmd-hierarchy">
              {HIERARCHY_LEVELS.map((level, index) => {
                const players = team.squad.filter(player => player.squadStatus === level.key);
                return (
                  <div key={level.key} className={`fmd-hierarchy__level${players.length === 0 ? ' fmd-hierarchy__level--empty' : ''}`}>
                    <span className="fmd-hierarchy__rank">{index + 1}</span>
                    <div className="fmd-hierarchy__content">
                      <div className="fmd-hierarchy__heading">
                        <h3>{level.label}</h3>
                        <span>{players.length}</span>
                      </div>
                      <div className="fmd-hierarchy__players">
                        {players.length > 0
                          ? players.map(player => (
                              <span key={player.id}>{getFullName(player)} <small>{player.position}</small></span>
                            ))
                          : <em>Nenhum jogador neste nível</em>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {(leaders.length > 0 || influential.length > 0) && (
              <div className="fmd-leadership-note">
                <ShieldCheck size={15} aria-hidden="true" />
                <p>
                  <strong>Núcleo de liderança:</strong>{' '}
                  {[...leaders, ...influential].map(player => getFullName(player)).join(', ')}.
                </p>
              </div>
            )}
          </section>

          <section className="fmd-panel">
            <SectionTitle
              icon={TrendingUp}
              title="Contexto Competitivo"
              detail="A posição e a forma recente moldam o humor do grupo."
            />
            <div className="fmd-performance">
              <div className="fmd-performance__position">
                <span>Posição na liga</span>
                <strong>{team.leaguePosition}<sup>º</sup></strong>
              </div>
              <div className="fmd-performance__form">
                <span>Forma atual</span>
                <strong style={{ color: getRatingColor(formValue) }}>
                  {FORM_LABELS[team.formRating] ?? 'Média'}
                </strong>
              </div>
            </div>
            <div className="fmd-recent-form">
              <span>Últimos jogos</span>
              {team.leagueForm.length > 0 ? (
                <div className="fmd-form-sequence">
                  {team.leagueForm.map((result, index) => (
                    <span
                      key={`${result}-${index}`}
                      className={`fmd-result fmd-result--${result.toLowerCase()}`}
                      title={result === 'W' ? 'Vitória' : result === 'D' ? 'Empate' : 'Derrota'}
                    >
                      {result === 'W' ? 'V' : result === 'D' ? 'E' : 'D'}
                    </span>
                  ))}
                </div>
              ) : <em>Sem jogos disputados</em>}
            </div>
            <div className="fmd-context-note">
              <span>Leitura do momento</span>
              <p>
                {formValue >= 70
                  ? 'Os resultados sustentam a confiança do grupo e reforçam a liderança.'
                  : formValue >= 40
                    ? 'A equipa está num ponto de equilíbrio; consistência será decisiva.'
                    : 'A sequência recente aumenta a pressão sobre jogadores e treinador.'}
              </p>
            </div>
          </section>
        </div>

        <section className="fmd-panel">
          <SectionTitle
            icon={Activity}
            title="Satisfação do Plantel"
            detail="Compare expectativas, moral, forma e confiança no treinador."
          />
          <div className="fmd-table-wrap">
            <table className="fmd-table">
              <thead>
                <tr>
                  {sortableHeader('name', 'Jogador')}
                  {sortableHeader('playingTime', 'Tempo de jogo')}
                  {sortableHeader('contract', 'Contrato')}
                  {sortableHeader('morale', 'Moral')}
                  {sortableHeader('performance', 'Forma')}
                  {sortableHeader('squadStatus', 'Estatuto')}
                  {sortableHeader('coachTreatment', 'Tratamento')}
                  {sortableHeader('trustLevel', 'Confiança')}
                </tr>
              </thead>
              <tbody>
                {sortedSquad.map(player => {
                  const satisfaction = getSatisfaction(player);
                  const treatment = player.coachTreatment;
                  return (
                    <tr key={player.id}>
                      <td>
                        <button type="button" className="fmd-player-link" onClick={() => navigate('/elenco')}>
                          <strong>{getFullName(player)}</strong>
                          <span>{player.position}</span>
                        </button>
                      </td>
                      <td><MetricBar value={satisfaction.playingTime} label={`Tempo de jogo de ${getFullName(player)}`} /></td>
                      <td><MetricBar value={satisfaction.contract} label={`Contrato de ${getFullName(player)}`} /></td>
                      <td><MetricBar value={satisfaction.morale} label={`Moral de ${getFullName(player)}`} /></td>
                      <td><MetricBar value={satisfaction.performance} label={`Forma de ${getFullName(player)}`} /></td>
                      <td>
                        <span className="fmd-status">{getSquadStatusLabel(player.squadStatus)}</span>
                        {player.transferRequest?.active && <span className="fmd-status fmd-text-warning" style={{ marginLeft: 6 }}>Pediu saída</span>}
                      </td>
                      <td>{getCoachTreatmentLabel(treatment?.type)}</td>
                      <td><MetricBar value={treatment?.trustLevel ?? 0} label={`Confiança de ${getFullName(player)}`} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="fmd-panel">
          <SectionTitle
            icon={UsersRound}
            title="Grupos Sociais"
            detail="Relações internas e coesão média de cada núcleo do balneário."
          />
          <div className="fmd-groups">
            {Object.entries(socialGroups).map(([group, players]) => {
              const averageGroupMorale = Math.round(
                players.reduce((total, player) => total + (player.morale ?? 50), 0) / players.length,
              );
              return (
                <article key={group} className="fmd-group">
                  <header className="fmd-group__header">
                    <div>
                      <span className="fmd-group__icon" aria-hidden="true"><UsersRound size={15} /></span>
                      <div><h3>{group}</h3><p>{players.length} {players.length === 1 ? 'membro' : 'membros'}</p></div>
                    </div>
                    <MetricBar value={averageGroupMorale} label={`Coesão do grupo ${group}`} />
                  </header>
                  <ul className="fmd-group__members">
                    {players.map(player => (
                      <li key={player.id}>
                        <span className="fmd-initials" aria-hidden="true">
                          {(player.name?.charAt(0) ?? '') + (player.surname?.charAt(0) ?? '') || '?'}
                        </span>
                        <span className="fmd-group__name">{getFullName(player)}</span>
                        <span className="fmd-position">{player.position}</span>
                        <span className="fmd-status">{getSquadStatusLabel(player.squadStatus)}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
          {Object.keys(socialGroups).length <= 1 && (
            <p className="fmd-empty-note">Os grupos ainda não se formaram. Sessões de coesão no treino ajudam a criar ligações.</p>
          )}
        </section>

        <section className="fmd-panel">
          <div className="fmd-section-actions">
            <SectionTitle
              icon={GitBranch}
              title="Rede de Influência"
              detail="Centralidade, alcance e força das ligações entre jogadores."
            />
            <button
              type="button"
              className="fmd-primary-button"
              onClick={generateSocialTree}
              disabled={Boolean(socialTree)}
            >
              <GitBranch size={14} aria-hidden="true" />
              {socialTree ? `Gerada na sem. ${socialTree.generatedWeek}` : 'Gerar rede social'}
            </button>
          </div>

          {socialTree ? (
            <div className="fmd-network">
              {rootNode && (
                <div className="fmd-network__root">
                  <Crown size={17} aria-hidden="true" />
                  <div><span>Centralizador</span><strong>{rootNode.playerName}</strong></div>
                  <b>{rootNode.influence}% influência</b>
                </div>
              )}
              <div className="fmd-network__nodes">
                {socialTree.nodes.map(node => {
                  const isRoot = node.playerId === socialTree.rootNodeId;
                  return (
                    <article key={node.playerId} className={`fmd-node${isRoot ? ' fmd-node--root' : ''}`}>
                      <header>
                        <div><strong>{node.playerName}</strong><span>{node.position}</span></div>
                        {isRoot && <span className="fmd-central-badge">Central</span>}
                      </header>
                      <div className="fmd-node__influence">
                        <span>Influência</span>
                        <div><i style={{ width: `${node.influence}%`, backgroundColor: getRatingColor(node.influence) }} /></div>
                        <b>{node.influence}%</b>
                      </div>
                      <div className="fmd-node__depth">Alcance: <strong>{node.depth ?? 0} níveis</strong></div>
                      <div className="fmd-node__connections">
                        {node.connections.map(connectionId => {
                          const connectedNode = socialTree.nodes.find(candidate => candidate.playerId === connectionId);
                          const edge = socialTree.edges.find(candidate =>
                            (candidate.from === node.playerId && candidate.to === connectionId)
                            || (candidate.from === connectionId && candidate.to === node.playerId),
                          );
                          return connectedNode ? (
                            <span key={connectionId}>
                              {connectedNode.playerName} <b>{Math.round((edge?.strength ?? 0) * 100)}%</b>
                            </span>
                          ) : null;
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="fmd-empty-state">
              <GitBranch size={22} aria-hidden="true" />
              <div><strong>Rede ainda não mapeada</strong><p>Gere a análise para identificar o centro de influência e as ligações do grupo.</p></div>
            </div>
          )}
        </section>

        <section className="fmd-panel">
          <SectionTitle
            icon={Handshake}
            title="Promessas Ativas"
            detail="Compromissos assumidos com jogadores e tempo restante."
          />
          {activePromises.length === 0 ? (
            <div className="fmd-empty-state fmd-empty-state--success">
              <ShieldCheck size={22} aria-hidden="true" />
              <div><strong>Nenhuma promessa pendente</strong><p>Não existem compromissos ativos a pressionar a gestão do plantel.</p></div>
            </div>
          ) : (
            <div className="fmd-promises">
              {activePromises.map(({ player, promise, weeksLeft }) => {
                const progress = Math.max(
                  0,
                  Math.min(100, (weeksLeft / Math.max(promise.originalDeadline ?? weeksLeft, 1)) * 100),
                );
                const urgencyColor = weeksLeft <= 2 ? STATUS_COLOR.red : weeksLeft <= 5 ? STATUS_COLOR.amber : STATUS_COLOR.green;
                return (
                  <article key={`${player.id}-${promise.goal}`} className="fmd-promise">
                    <div className="fmd-promise__main">
                      <strong>{getFullName(player)}</strong>
                      <span>{promise.goal}</span>
                    </div>
                    <div className="fmd-promise__deadline">
                      <span>{weeksLeft <= 0 ? 'Prazo expirado' : `${weeksLeft} sem. restantes`}</span>
                      <div><i style={{ width: `${progress}%`, backgroundColor: urgencyColor }} /></div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
