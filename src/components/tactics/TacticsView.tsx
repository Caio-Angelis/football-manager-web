import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Button';

const FORMATIONS = [
  { name: '4-4-2', positions: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [0, 3], [1, 3]] },
  { name: '4-3-3', positions: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [3, 2], [0, 3], [1, 3]] },
  { name: '3-5-2', positions: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [0, 3], [1, 3], [2, 3]] },
  { name: '5-2-2', positions: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [0, 1], [1, 1], [0, 2], [1, 2], [0, 3], [1, 3], [2, 3]] },
];

const TACTICS = ['attacking', 'defensive', 'balanced'];

export const TacticsView: React.FC = () => {
  const { selectedTeam, teams } = useGameStore();
  const team = teams.find(t => t.id === selectedTeam);

  const updateFormation = (formation: string) => {
    // Atualizar formação do time
  };

  const updateTactic = (tactic: string) => {
    // Atualizar tática do time
  };

  if (!team) {
    return <div className="fm-empty">Selecione um time para configurar táticas</div>;
  }

  return (
    <div className="fm-tactics-view">
      <header className="fm-tactics-view__header">
        <h1>Configuração de Táticas</h1>
        <div className="fm-tactics-view__team-name">{team.name}</div>
      </header>

      <div className="fm-tactics-view__content">
        <div className="fm-tactics-view__section">
          <h2>Formação</h2>
          <div className="fm-tactics-view__formations">
            {FORMATIONS.map((formation) => (
              <div
                key={formation.name}
                className={`fm-formation ${team.formation === formation.name ? 'fm-formation--active' : ''}`}
                onClick={() => updateFormation(formation.name)}
              >
                <div className="fm-formation__name">{formation.name}</div>
                <div className="fm-formation__visual">
                  {formation.positions.map(([x, y], i) => (
                    <div key={i} className="fm-formation__player" style={{ left: `${x * 25}%`, top: `${y * 20}%` }}>
                      J
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="fm-tactics-view__section">
          <h2>Tática</h2>
          <div className="fm-tactics-view__tactics">
            {TACTICS.map((tactic) => (
              <button
                key={tactic}
                className={`fm-tactic ${team.tactic === tactic ? 'fm-tactic--active' : ''}`}
                onClick={() => updateTactic(tactic)}
              >
                {tactic.charAt(0).toUpperCase() + tactic.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
