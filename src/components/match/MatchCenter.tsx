import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Button';

export const MatchCenter: React.FC = () => {
  const { matches, teams, selectedTeam, currentWeek } = useGameStore();
  
  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || teamId;
  };

  const isUserMatch = (match: typeof matches[0]) => {
    if (!selectedTeam) return false;
    return match.homeTeam === selectedTeam || match.awayTeam === selectedTeam;
  };

  return (
    <div className="fm-match-center">
      <header className="fm-match-center__header">
        <h1>Centro de Partidas</h1>
        <div className="fm-match-center__week">
          Semana: {currentWeek}
        </div>
      </header>

      <div className="fm-match-center__matches">
        <h2>Próximas Partidas</h2>
        {matches.length === 0 ? (
          <div className="fm-empty">Nenhuma partida agendada. Avance a semana para gerar partidas.</div>
        ) : (
          <div className="fm-match-list">
            {matches.map((match, index) => {
              const isUser = isUserMatch(match);
              const isCompleted = match.completed;
              
              return (
                <div key={index} className={`fm-match ${isUser ? 'fm-match--user' : ''} ${isCompleted ? 'fm-match--completed' : ''}`}>
                  <div className="fm-match__teams">
                    <div className="fm-match__team fm-match__team--home">
                      <div className="fm-match__team-name">{getTeamName(match.homeTeam)}</div>
                      <div className="fm-match__team-score">{isCompleted ? match.homeGoals : '-'}</div>
                    </div>
                    <div className="fm-match__vs">VS</div>
                    <div className="fm-match__team fm-match__team--away">
                      <div className="fm-match__team-name">{getTeamName(match.awayTeam)}</div>
                      <div className="fm-match__team-score">{isCompleted ? match.awayGoals : '-'}</div>
                    </div>
                  </div>
                  
                  {!isCompleted && isUser && (
                    <div className="fm-match__action">
                      <Button onClick={() => useGameStore.getState().simulateMatch(index)}>
                        Simular Partida
                      </Button>
                    </div>
                  )}
                  
                  {!isCompleted && !isUser && (
                    <div className="fm-match__simulated">
                      <Button disabled onClick={() => {}}>Partida não é sua</Button>
                    </div>
                  )}
                  
                  {isCompleted && (
                    <div className="fm-match__status">
                      <span className="fm-match__status-text">Finalizado</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="fm-match-center__controls">
        <Button onClick={() => useGameStore.getState().advanceWeek()}>
          Avançar Semana
        </Button>
      </div>

      <div className="fm-match-center__standings">
        <h2>Classificação</h2>
        <table className="fm-standings-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>P</th>
              <th>J</th>
              <th>V</th>
              <th>D</th>
              <th>E</th>
              <th>GM</th>
              <th>GS</th>
            </tr>
          </thead>
          <tbody>
            {useGameStore.getState().teams
              .sort((a, b) => b.points - a.points)
              .map((team) => (
                <tr key={team.id} className={team.id === selectedTeam ? 'fm-standings-table--user' : ''}>
                  <td>{team.name}</td>
                  <td>{team.points}</td>
                  <td>{team.played}</td>
                  <td>{team.won}</td>
                  <td>{team.drawn}</td>
                  <td>{team.lost}</td>
                  <td>{team.goalsFor}</td>
                  <td>{team.goalsAgainst}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
