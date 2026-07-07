import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { getActiveRoom } from '../../api/client';
import { TeamCrest } from './TeamCrest';

export interface PageHeaderAction {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  /** Name used to render the club crest fallback (pass the selected team's name). */
  teamName?: string | null;
  teamReputation?: number;
  /** Small custom control rendered right after the title block (e.g. Tactics' formation-cycle arrows). */
  titleExtra?: React.ReactNode;
  actions?: PageHeaderAction[];
  /** Extra condition (besides isAdvancing) that should disable "Continuar", e.g. a live match in progress. */
  continueDisabled?: boolean;
}

/**
 * Shared FM-style topbar: club crest, title/subtitle, quick-nav icon buttons,
 * season/week readout and the "Continuar" action. Used across every `fms-page` view
 * so header markup and behavior stay in one place.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  teamName,
  teamReputation,
  titleExtra,
  actions = [],
  continueDisabled = false,
}) => {
  const { currentSeason, currentWeek, advanceWeek, isAdvancing } = useGameStore();

  return (
    <header className="fms-topbar">
      <div className="fms-topbar__left">
        {teamName ? (
          <TeamCrest name={teamName} reputation={teamReputation} size={36} />
        ) : (
          <div className="fms-club-logo">?</div>
        )}
        <div className="fms-title-block">
          <span className="fms-title">{title}</span>
          <span className="fms-subtitle">{subtitle}</span>
        </div>
        {titleExtra}
      </div>
      <div className="fms-topbar__right">
        {actions.map((action, i) => (
          <button key={i} className="fms-icon-btn" title={action.title} onClick={action.onClick}>
            {action.icon}
          </button>
        ))}
        <div className="fms-date">
          <div className="fms-date__main">Temporada {currentSeason}</div>
          <div className="fms-date__sub">Semana {currentWeek}</div>
        </div>
        {/* E-16: Esconder botão Continuar no modo online (avanço é coordenado por ready-check) */}
        {!getActiveRoom() && (
          <button className="fms-continue" onClick={advanceWeek} disabled={isAdvancing || continueDisabled}>
            {isAdvancing ? 'Processando...' : 'Continuar'}
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </header>
  );
};
