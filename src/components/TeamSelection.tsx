import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Button } from './ui/Button';

export const TeamSelection: React.FC = () => {
  const { teams, initGame } = useGameStore();

  const handleSelectTeam = (teamId: string) => {
    useGameStore.getState().selectTeam(teamId);
  };

  const handleNewGame = () => {
    initGame();
  };

  return (
    <div className="fm-team-selection">
      <header className="fm-team-selection__header">
        <h1>Football Manager Web</h1>
        <p>Selecione um time para começar</p>
      </header>

      <div className="fm-team-selection__teams">
        {teams.map((team) => (
          <div key={team.id} className="fm-team-card">
            <h2 className="fm-team-card__name">{team.name}</h2>
            <div className="fm-team-card__info">
              <span className="fm-team-card__division">{team.division}</span>
              <span className="fm-team-card__formation">Formação: {team.formation}</span>
            </div>
            <div className="fm-team-card__squad-preview">
              <span>Elenco: {team.squad.length} jogadores</span>
              <span>Reputação: {team.reputation}</span>
            </div>
            <div className="fm-team-card__budget">
              <span>Orçamento: R$ {team.budget}M</span>
            </div>
            <div className="fm-team-card__action">
              <Button onClick={() => handleSelectTeam(team.id)}>
                Jogar
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="fm-team-selection__new-game">
        <Button onClick={handleNewGame}>
          Nova Partida (Gerar Times)
        </Button>
      </div>
    </div>
  );
};
