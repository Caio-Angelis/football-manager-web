import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
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
  const primary = tier === 'elite' ? '#3d7bf5' : `hsl(${hue} 42% 38%)`;
  const secondary = tier === 'elite' ? '#2a5fb0' : `hsl(${hue} 35% 28%)`;
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

const tierAccent: Record<TeamTier, string> = {
  elite: '#3d7bf5',
  strong: '#3fbf6b',
  average: '#e0b341',
  developing: '#e25c52',
};

const ReputationRing: React.FC<{ reputation: number; tier: TeamTier }> = ({ reputation, tier }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (reputation / 100) * circumference;
  const accent = tierAccent[tier];

  return (
    <div className="fm-team-card__ring" aria-hidden="true">
      <svg viewBox="0 0 72 72" fill="none">
        <circle cx="36" cy="36" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      <span className="fm-team-card__ring-value" style={{ color: accent }}>{reputation}</span>
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
      style={{ '--card-index': index, '--accent': tierAccent[tier] } as React.CSSProperties}
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
      <div className="fm-team-card__accent-bar" aria-hidden="true" />

      <div className="fm-team-card__hero">
        <TeamCrest name={team.name} tier={tier} />
        <div className="fm-team-card__hero-text">
          <h2 className="fm-team-card__name">{team.name}</h2>
          <span className="fm-team-card__division">{team.division} · {playstyle}</span>
        </div>
        <ReputationRing reputation={team.reputation} tier={tier} />
      </div>

      <div className="fm-team-card__metrics">
        <div className="fm-team-card__metric">
          <span className="fm-team-card__metric-label">Formação</span>
          <span className="fm-team-card__metric-value">{team.formation}</span>
        </div>
        <div className="fm-team-card__metric">
          <span className="fm-team-card__metric-label">Elenco</span>
          <span className="fm-team-card__metric-value">{team.squad.length}</span>
        </div>
        <div className="fm-team-card__metric">
          <span className="fm-team-card__metric-label">Orçamento</span>
          <span className="fm-team-card__metric-value fm-team-card__metric-value--money">
            R$ {team.budget.toFixed(1)}M
          </span>
        </div>
        <div className="fm-team-card__metric">
          <span className="fm-team-card__metric-label">Meta</span>
          <span className="fm-team-card__metric-value">{getExpectationLabel(team.boardExpectation)}</span>
        </div>
      </div>

      <div className="fm-team-card__action" onClick={(e) => e.stopPropagation()}>
        <button className="fm-team-card__select-btn" onClick={handleSelect}>
          Assumir comando
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 3 L11 8 L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </article>
  );
};

export const TeamSelection: React.FC = () => {
  const { teams, initGame, selectTeam } = useGameStore();
  const navigate = useNavigate();

  const handleSelectTeam = useCallback(
    (teamId: string) => {
      selectTeam(teamId);
      navigate('/elenco');
    },
    [selectTeam, navigate],
  );

  const sortedTeams = [...teams].sort((a, b) => b.reputation - a.reputation);
  const eliteCount = teams.filter((t) => getTeamTier(t.reputation) === 'elite').length;

  return (
    <div className="fm-team-selection">
      <header className="fm-team-selection__header">
        <div className="fm-team-selection__header-main">
          <div className="fm-team-selection__title-row">
            <Shield size={22} className="fm-team-selection__title-icon" />
            <h1 className="fm-team-selection__title">Escolha seu clube</h1>
          </div>
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
            <div className="fm-team-selection__empty-pitch" aria-hidden="true" />
            <div className="fm-team-selection__empty-glass">
              <svg className="fm-team-selection__empty-ball" viewBox="0 0 64 64" fill="none" role="img" aria-hidden="true">
                <circle cx="32" cy="32" r="30" fill="oklch(0.98 0.002 264)" stroke="oklch(0.22 0.005 264)" strokeWidth="2" />
                <path d="M32 8 L40 18 L36 30 L28 30 L24 18 Z" fill="oklch(0.22 0.005 264)" />
                <path d="M32 8 L32 2" stroke="oklch(0.22 0.005 264)" strokeWidth="2" strokeLinecap="round" />
                <path d="M40 18 L52 14" stroke="oklch(0.22 0.005 264)" strokeWidth="2" strokeLinecap="round" />
                <path d="M24 18 L12 14" stroke="oklch(0.22 0.005 264)" strokeWidth="2" strokeLinecap="round" />
                <path d="M36 30 L44 44" stroke="oklch(0.22 0.005 264)" strokeWidth="2" strokeLinecap="round" />
                <path d="M28 30 L20 44" stroke="oklch(0.22 0.005 264)" strokeWidth="2" strokeLinecap="round" />
                <path d="M32 56 L32 50" stroke="oklch(0.22 0.005 264)" strokeWidth="2" strokeLinecap="round" />
                <path d="M44 44 L52 50" stroke="oklch(0.22 0.005 264)" strokeWidth="2" strokeLinecap="round" />
                <path d="M20 44 L12 50" stroke="oklch(0.22 0.005 264)" strokeWidth="2" strokeLinecap="round" />
                <path d="M32 50 L20 44 L28 30 L36 30 L44 44 Z" fill="none" stroke="oklch(0.22 0.005 264)" strokeWidth="1.5" />
              </svg>
              <p className="fm-team-selection__empty-title">Nenhum clube gerado</p>
              <p className="fm-team-selection__empty-text">
                Gere uma nova liga para comparar clubes e iniciar sua carreira.
              </p>
              <Button onClick={initGame} className="fm-team-selection__empty-btn">Gerar clubes</Button>
            </div>
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
