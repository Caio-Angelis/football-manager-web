import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { SquadTable } from './SquadTable';
import { PlayerDetailPanel } from './PlayerDetailPanel';
import { Globe, Trophy, ArrowRight } from 'lucide-react';

export const SquadView: React.FC = () => {
  const { selectedTeam, teams, currentWeek, currentSeason, advanceWeek, isAdvancing } = useGameStore();
  const navigate = useNavigate();
  const team = teams.find(t => t.id === selectedTeam);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePlayerSelect = useCallback((playerId: string) => {
    setSelectedPlayerId(prev => prev === playerId ? null : playerId);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedPlayerId(null);
  }, []);

  if (!team) {
    return (
      <div className="fms-page">
        <div style={{ margin: 'auto', color: 'var(--t-text-2)' }}>Selecione um time para ver o elenco.</div>
      </div>
    );
  }

  const selectedPlayer = selectedPlayerId ? team.squad.find(p => p.id === selectedPlayerId) || null : null;

  return (
    <div className="fms-page">
      <header className="fms-topbar">
        <div className="fms-topbar__left">
          <div className="fms-club-logo">{team.name.charAt(0)}</div>
          <div className="fms-title-block">
            <span className="fms-title">Elenco</span>
            <span className="fms-subtitle">{team.name} — {team.formation} · {team.teamMentality}</span>
          </div>
        </div>
        <div className="fms-topbar__right">
          <button className="fms-icon-btn" title="Visão do Clube" onClick={() => navigate('/clube')}><Globe size={15} /></button>
          <button className="fms-icon-btn" title="Classificação" onClick={() => navigate('/classificacao')}><Trophy size={15} /></button>
          <div className="fms-date">
            <div className="fms-date__main">Temporada {currentSeason}</div>
            <div className="fms-date__sub">Semana {currentWeek}</div>
          </div>
          <button className="fms-continue" onClick={advanceWeek} disabled={isAdvancing}>
            {isAdvancing ? 'Processando...' : 'Continuar'}
            <ArrowRight size={15} />
          </button>
        </div>
      </header>

      <SquadTable
        players={team.squad}
        selectedPlayerId={selectedPlayerId}
        onPlayerSelect={handlePlayerSelect}
        teamName={team.name}
        formation={team.formation}
        tactic={team.tactic}
        mentality={team.teamMentality}
        season={currentSeason}
        week={currentWeek}
        record={{
          points: team.points,
          played: team.played,
          won: team.won,
          drawn: team.drawn,
          lost: team.lost,
        }}
      />

      {selectedPlayerId && (isNarrow ? (
        <div className="fm-player-detail-panel-overlay fm-player-detail-panel-overlay--mobile">
          <PlayerDetailPanel player={selectedPlayer} onClose={handleCloseDetail} />
        </div>
      ) : (
        <div className="fm-player-detail-panel-drawer">
          <PlayerDetailPanel player={selectedPlayer} onClose={handleCloseDetail} />
        </div>
      ))}
    </div>
  );
};
