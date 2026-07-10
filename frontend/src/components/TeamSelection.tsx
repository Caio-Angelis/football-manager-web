import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import type { Team } from '../types/game';
import { useGameStore } from '../store/gameStore';
import { Button } from './ui/Button';
import { TeamCrest } from './ui/TeamCrest';
import { getTeamTier, TIER_ACCENT, type TeamTier } from '../utils/teamColors';

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

const ReputationRing: React.FC<{ reputation: number; tier: TeamTier }> = ({ reputation, tier }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (reputation / 100) * circumference;
  const accent = TIER_ACCENT[tier];

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
      style={{ '--card-index': index, '--accent': TIER_ACCENT[tier] } as React.CSSProperties}
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
              <img
                className="fm-team-selection__empty-ball"
                src="/brand/empty-clubs.png"
                alt=""
                width={88}
                height={88}
                decoding="async"
              />
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
