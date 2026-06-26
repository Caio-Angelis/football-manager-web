import React, { useCallback } from 'react';
import type { Team } from '../types/game';
import { useGameStore } from '../store/gameStore';
import { Button } from './ui/Button';

type TeamTier = 'elite' | 'strong' | 'average' | 'developing';

const getTeamTier = (reputation: number): TeamTier => {
  if (reputation >= 80) return 'elite';
  if (reputation >= 60) return 'strong';
  if (reputation >= 40) return 'average';
  return 'developing';
};

const getStrengthLabel = (rep: number): string => {
  if (rep >= 80) return 'Elite';
  if (rep >= 60) return 'Forte';
  if (rep >= 40) return 'Regular';
  return 'Emergente';
};

const getPlaystyleTag = (tactic: string): string => {
  const playstyleMap: Record<string, string> = {
    attacking: 'Atacante',
    defensive: 'Defensivo',
    balanced: 'Equilibrado',
    'very offensive': 'Ofensivo',
    'very defensive': 'Muito Defensivo',
    positive: 'Positivo',
    cautious: 'Cauteloso',
  };
  return playstyleMap[tactic] || 'Equilibrado';
};

const getExpectationLabel = (expectation: string): string => {
  const map: Record<string, string> = {
    relegation: 'Evitar rebaixamento',
    midtable: 'Meio da tabela',
    top4: 'G4',
    title: 'Título',
  };
  return map[expectation] || expectation;
};

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getCrestColors = (name: string, tier: TeamTier) => {
  const hash = hashString(name);
  const hues = [215, 145, 25, 340, 195, 265];
  const hue = hues[hash % hues.length];
  const primary = tier === 'elite' ? '#1a73e8' : `hsl(${hue} 42% 38%)`;
  const secondary = tier === 'elite' ? '#1557b0' : `hsl(${hue} 35% 28%)`;
  return { primary, secondary };
};

const TeamCrest: React.FC<{ name: string; tier: TeamTier }> = ({ name, tier }) => {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const { primary, secondary } = getCrestColors(name, tier);

  return (
    <div className="fm-team-crest" aria-hidden="true">
      <svg className="fm-team-crest__svg" viewBox="0 0 56 64" fill="none" role="img">
        <title>{name} escudo</title>
        <path
          d="M28 2 L52 14 L52 34 C52 48 41 58 28 62 C15 58 4 48 4 34 L4 14 Z"
          fill={primary}
          stroke={secondary}
          strokeWidth="2"
        />
        <path
          d="M28 10 L44 18 L44 33 C44 43 37 50 28 53 C19 50 12 43 12 33 L12 18 Z"
          fill={secondary}
          opacity="0.35"
        />
        <text
          x="28"
          y="36"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="14"
          fontWeight="700"
          fontFamily="var(--font-family)"
        >
          {initials}
        </text>
      </svg>
    </div>
  );
};

const TeamDossier: React.FC<{
  team: Team;
  index: number;
  onSelect: (teamId: string) => void;
}> = ({ team, index, onSelect }) => {
  const tier = getTeamTier(team.reputation);
  const playstyle = getPlaystyleTag(team.tactic);
  const strengthLabel = getStrengthLabel(team.reputation);

  const handleSelect = useCallback(() => {
    onSelect(team.id);
  }, [onSelect, team.id]);

  return (
    <article
      className={`fm-team-card fm-team-card--${tier}`}
      style={{ '--card-index': index } as React.CSSProperties}
      tabIndex={0}
      role="button"
      aria-label={`${team.name} — ${strengthLabel} — ${team.formation}`}
      onClick={handleSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect();
        }
      }}
    >
      <div className="fm-team-card__top">
        <span className={`fm-team-card__tier fm-team-card__tier--${tier}`}>{strengthLabel}</span>
        <span className="fm-team-card__playstyle">{playstyle}</span>
      </div>

      <div className="fm-team-card__identity">
        <TeamCrest name={team.name} tier={tier} />
        <div className="fm-team-card__identity-text">
          <h2 className="fm-team-card__name">{team.name}</h2>
          <span className="fm-team-card__division">{team.division}</span>
        </div>
      </div>

      <div className="fm-team-card__reputation">
        <div className="fm-team-card__rep-header">
          <span className="fm-team-card__rep-label">Reputação</span>
          <span className="fm-team-card__rep-value">{team.reputation}</span>
        </div>
        <div
          className="fm-team-card__rep-track"
          role="progressbar"
          aria-valuenow={team.reputation}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Reputação ${team.reputation} de 100`}
        >
          <div className="fm-team-card__rep-fill" style={{ width: `${team.reputation}%` }} />
        </div>
      </div>

      <dl className="fm-team-card__stats">
        <div className="fm-team-card__stat">
          <dt>Formação</dt>
          <dd className="fm-team-card__stat-value">{team.formation}</dd>
        </div>
        <div className="fm-team-card__stat">
          <dt>Elenco</dt>
          <dd className="fm-team-card__stat-value">{team.squad.length}</dd>
        </div>
        <div className="fm-team-card__stat">
          <dt>Orçamento</dt>
          <dd className="fm-team-card__stat-value fm-team-card__stat-value--money">
            R$ {team.budget.toFixed(1)}M
          </dd>
        </div>
        <div className="fm-team-card__stat">
          <dt>Meta</dt>
          <dd className="fm-team-card__stat-value">{getExpectationLabel(team.boardExpectation)}</dd>
        </div>
      </dl>

      <div className="fm-team-card__action" onClick={(e) => e.stopPropagation()}>
        <Button onClick={handleSelect} className="fm-team-card__button">
          Assumir comando
        </Button>
      </div>
    </article>
  );
};

export const TeamSelection: React.FC = () => {
  const { teams, initGame, selectTeam } = useGameStore();

  const handleSelectTeam = useCallback(
    (teamId: string) => {
      selectTeam(teamId);
    },
    [selectTeam],
  );

  const sortedTeams = [...teams].sort((a, b) => b.reputation - a.reputation);
  const eliteCount = teams.filter((t) => getTeamTier(t.reputation) === 'elite').length;

  return (
    <div className="fm-team-selection">
      <header className="fm-team-selection__header">
        <div className="fm-team-selection__header-main">
          <h1 className="fm-team-selection__title">Escolha seu clube</h1>
          <p className="fm-team-selection__subtitle">
            Compare reputação, orçamento e expectativa da diretoria antes de assumir.
          </p>
        </div>
        {teams.length > 0 && (
          <div className="fm-team-selection__summary" aria-live="polite">
            <span>{teams.length} clubes</span>
            {eliteCount > 0 && <span>{eliteCount} elite</span>}
          </div>
        )}
      </header>

      <div className="fm-team-selection__teams">
        {teams.length === 0 ? (
          <div className="fm-team-selection__empty">
            <p className="fm-team-selection__empty-title">Nenhum clube gerado</p>
            <p className="fm-team-selection__empty-text">
              Gere uma nova liga para comparar clubes e iniciar sua carreira.
            </p>
            <Button onClick={initGame}>Gerar clubes</Button>
          </div>
        ) : (
          sortedTeams.map((team, index) => (
            <TeamDossier
              key={team.id}
              team={team}
              index={index}
              onSelect={handleSelectTeam}
            />
          ))
        )}
      </div>

      {teams.length > 0 && (
        <footer className="fm-team-selection__footer">
          <p className="fm-team-selection__footer-note">
            Quer outro sorteio de clubes? Gere uma nova liga — sua seleção atual será descartada.
          </p>
          <Button variant="secondary" onClick={initGame} className="fm-team-selection__new-game-btn">
            Gerar nova liga
          </Button>
        </footer>
      )}
    </div>
  );
};
