import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Button';
import type { TrainingSession, WeeklyTrainingPlan } from '../../types/game';

const TRAINING_TYPES = [
  { id: 'physical', label: 'Físico', desc: 'Velocidade e resistência (+risco de lesão)', icon: '🏃' },
  { id: 'technical', label: 'Técnico', desc: 'Passe, técnica e finalização', icon: '⚽' },
  { id: 'cohesion', label: 'Coesão', desc: 'Moral e espírito de equipa', icon: '🤝' },
];

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const BLOCKS = ['morning', 'afternoon', 'evening'] as const;
const BLOCK_LABELS = { morning: 'Manhã', afternoon: 'Tarde', evening: 'Noite' };

function createEmptySession(day: number): TrainingSession {
  return {
    day,
    morning: { type: 'rest', focus: '' },
    afternoon: { type: 'rest', focus: '' },
    evening: { type: 'rest', focus: '' },
  };
}

export const TrainingView: React.FC = () => {
  const { selectedTeam, teams, currentWeek, trainingPlan, setTrainingPlan, applyWeeklyTraining } = useGameStore();
  const team = teams.find(t => t.id === selectedTeam);
  const [teamFocus, setTeamFocus] = useState(trainingPlan?.teamFocus ?? 'technical');

  if (!team) {
    return <div className="fm-empty">Selecione um time para configurar treinos</div>;
  }

  const sessions = trainingPlan?.sessions ?? DAYS.map((_, i) => createEmptySession(i));

  const updateSession = (dayIdx: number, block: typeof BLOCKS[number], type: string) => {
    const newSessions = sessions.map((s, i) => {
      if (i !== dayIdx) return s;
      return { ...s, [block]: { type, focus: type } };
    });
    const plan: WeeklyTrainingPlan = { week: currentWeek, teamFocus, sessions: newSessions };
    setTrainingPlan(plan);
  };

  const savePlan = () => {
    const plan: WeeklyTrainingPlan = {
      week: currentWeek,
      teamFocus,
      sessions: sessions.length ? sessions : DAYS.map((_, i) => createEmptySession(i)),
    };
    setTrainingPlan(plan);
  };

  return (
    <div className="fm-training-view">
      <header className="fm-training-view__header">
        <h1>Treino</h1>
        <p className="fm-training-view__subtitle">Semana {currentWeek} — {team.name}</p>
      </header>

      <section className="fm-training-view__section">
        <h2>Foco Semanal</h2>
        <div className="fm-training-view__types">
          {TRAINING_TYPES.map((t) => (
            <button
              key={t.id}
              className={`fm-training-type ${teamFocus === t.id ? 'fm-training-type--active' : ''}`}
              onClick={() => setTeamFocus(t.id)}
            >
              <span className="fm-training-type__icon">{t.icon}</span>
              <span className="fm-training-type__label">{t.label}</span>
              <span className="fm-training-type__desc">{t.desc}</span>
            </button>
          ))}
        </div>
        <div className="fm-training-view__actions">
          <Button onClick={savePlan}>Salvar Plano</Button>
          <Button variant="success" onClick={applyWeeklyTraining}>Aplicar Treino Agora</Button>
        </div>
      </section>

      <section className="fm-training-view__section">
        <h2>Calendário Semanal</h2>
        <div className="fm-training-calendar">
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="fm-training-day">
              <h3 className="fm-training-day__title">{day}</h3>
              {BLOCKS.map((block) => (
                <div key={block} className="fm-training-block">
                  <span className="fm-training-block__label">{BLOCK_LABELS[block]}</span>
                  <select
                    className="fm-training-block__select"
                    value={sessions[dayIdx]?.[block]?.type ?? 'rest'}
                    onChange={(e) => updateSession(dayIdx, block, e.target.value)}
                  >
                    <option value="rest">Descanso</option>
                    {TRAINING_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="fm-training-view__section">
        <h2>Monitor de Fadiga</h2>
        <div className="fm-fatigue-grid">
          {team.squad.map((player) => (
            <div key={player.id} className="fm-fatigue-card">
              <span className="fm-fatigue-card__name">{player.name}</span>
              <div className="fm-fatigue-card__bar">
                <div
                  className="fm-fatigue-card__fill"
                  style={{
                    width: `${player.fitness}%`,
                    backgroundColor: player.fitness >= 70 ? '#4CAF50' : player.fitness >= 40 ? '#FFC107' : '#F44336',
                  }}
                />
              </div>
              <span className="fm-fatigue-card__value">{player.fitness}%</span>
              {player.injury?.active && (
                <span className="fm-fatigue-card__injury">🏥 {player.injury.days}d</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
