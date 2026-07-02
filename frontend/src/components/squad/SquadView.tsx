import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { SquadTable } from './SquadTable';
import { PlayerDetailPanel } from './PlayerDetailPanel';
import { PageHeader } from '../ui/PageHeader';
import { Globe, Trophy } from 'lucide-react';

export const SquadView: React.FC = () => {
  const { selectedTeam, teams, currentWeek, currentSeason } = useGameStore();
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
      <PageHeader
        title="Elenco"
        subtitle={`${team.name} — ${team.formation} · ${team.teamMentality}`}
        teamName={team.name}
        teamReputation={team.reputation}
        actions={[
          { icon: <Globe size={15} />, title: 'Visão do Clube', onClick: () => navigate('/clube') },
          { icon: <Trophy size={15} />, title: 'Classificação', onClick: () => navigate('/classificacao') },
        ]}
      />

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
