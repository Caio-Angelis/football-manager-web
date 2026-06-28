import React, { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { SquadTable } from './SquadTable';
import { PlayerDetailPanel } from './PlayerDetailPanel';

export const SquadView: React.FC = () => {
  const { selectedTeam, teams, currentWeek, currentSeason } = useGameStore();
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
    return <div className="fm-empty">Selecione um time para começar</div>;
  }

  const selectedPlayer = selectedPlayerId ? team.squad.find(p => p.id === selectedPlayerId) || null : null;

  return (
    <div className="fm-squad-view">
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
