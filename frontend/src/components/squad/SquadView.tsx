import React, { useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { SquadTable } from './SquadTable';
import { PlayerDetailPanel } from './PlayerDetailPanel';

export const SquadView: React.FC = () => {
  const { selectedTeam, teams, currentWeek, currentSeason } = useGameStore();
  const team = teams.find(t => t.id === selectedTeam);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  if (!team) {
    return <div className="fm-empty">Selecione um time para começar</div>;
  }

  const handlePlayerSelect = useCallback((playerId: string) => {
    setSelectedPlayerId(selectedPlayerId === playerId ? null : playerId);
  }, [selectedPlayerId]);

  const handleCloseDetail = useCallback(() => {
    setSelectedPlayerId(null);
  }, []);

  const selectedPlayer = selectedPlayerId ? team.squad.find(p => p.id === selectedPlayerId) || null : null;

  const pageWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const isNarrow = pageWidth < 1024;

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
