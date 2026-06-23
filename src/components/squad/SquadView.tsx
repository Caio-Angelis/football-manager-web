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
      <header className="fm-squad-view__header">
        <h1>Elenco · {team.name}</h1>
        <div className="fm-squad-view__meta">
          <span>Formação: {team.formation}</span>
          <span>Tática: {team.tactic}</span>
          <span>Mentalidade: {team.teamMentality}</span>
        </div>
        <div className="fm-squad-view__season">
          <span>Temporada {currentSeason} - Semana {currentWeek}</span>
        </div>
        <div className="fm-squad-view__points">
          <span>Pontos: {team.points}</span>
          <span>Jogos: {team.played}</span>
          <span>V: {team.won}</span>
          <span>E: {team.drawn}</span>
          <span>D: {team.lost}</span>
        </div>
      </header>

      <SquadTable
        players={team.squad}
        selectedPlayerId={selectedPlayerId}
        onPlayerSelect={handlePlayerSelect}
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
