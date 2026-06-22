import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { PlayerCard } from './PlayerCard';
import type { Player } from '../../types/game';

export const SquadView: React.FC = () => {
  const { selectedTeam, teams, currentWeek, currentSeason } = useGameStore();
  const team = teams.find(t => t.id === selectedTeam);

  const groupByPosition = (players: Player[]) => {
    return players.reduce((acc: Record<string, Player[]>, player) => {
      const position = player.position;
      if (!acc[position]) acc[position] = [];
      acc[position].push(player);
      return acc;
    }, {});
  };

  if (!team) {
    return <div className="fm-empty">Selecione um time para começar</div>;
  }

  const grouped = groupByPosition(team.squad);

  return (
    <div className="fm-squad-view">
      <header className="fm-squad-view__header">
        <h1>{team.name}</h1>
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

      <div className="fm-squad-view__positions">
        {Object.entries(grouped).map(([position, players]) => (
          <div key={position} className="fm-position-group">
            <h2 className="fm-position-group__title">{position}</h2>
            <div className="fm-position-group__cards">
              {players.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
