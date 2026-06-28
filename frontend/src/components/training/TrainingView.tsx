import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Button';
import type { TrainingSession, WeeklyTrainingPlan } from '../../types/game';

const TRAINING_TYPES = [
  { id: 'physical', label: 'Físico', desc: 'Velocidade e resistência (+risco de lesão)', icon: '🏃' },
  { id: 'technical', label: 'Técnico', desc: 'Passe, técnica e finalização', icon: '⚽' },
  { id: 'cohesion', label: 'Coesão', desc: 'Moral e espírito de equipa', icon: '🤝' },
  { id: 'medical', label: 'Médico', desc: 'Recuperação de lesões', icon: '🏥' },
  { id: 'recovery', label: 'Recuperação', desc: 'Restauração física', icon: '💆' },
  { id: 'light', label: 'Leve', desc: 'Aquecimento e mobilidade', icon: '🧘' },
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

type BlockType = { type: string; focus: string };
type DayPattern = [BlockType, BlockType, BlockType]; // morning, afternoon, evening

const FOCUS_PATTERNS: Record<string, DayPattern[]> = {
  physical: [
    [{ type: 'physical', focus: 'physical' }, { type: 'physical', focus: 'physical' }, { type: 'rest', focus: '' }],
    [{ type: 'physical', focus: 'physical' }, { type: 'technical', focus: 'technical' }, { type: 'rest', focus: '' }],
    [{ type: 'physical', focus: 'physical' }, { type: 'physical', focus: 'physical' }, { type: 'rest', focus: '' }],
    [{ type: 'recovery', focus: 'recovery' }, { type: 'light', focus: 'light' }, { type: 'rest', focus: '' }],
    [{ type: 'physical', focus: 'physical' }, { type: 'technical', focus: 'technical' }, { type: 'rest', focus: '' }],
    [{ type: 'light', focus: 'light' }, { type: 'rest', focus: '' }, { type: 'rest', focus: '' }],
    [{ type: 'rest', focus: '' }, { type: 'rest', focus: '' }, { type: 'rest', focus: '' }],
  ],
  technical: [
    [{ type: 'technical', focus: 'technical' }, { type: 'technical', focus: 'technical' }, { type: 'rest', focus: '' }],
    [{ type: 'technical', focus: 'technical' }, { type: 'cohesion', focus: 'cohesion' }, { type: 'rest', focus: '' }],
    [{ type: 'technical', focus: 'technical' }, { type: 'technical', focus: 'technical' }, { type: 'rest', focus: '' }],
    [{ type: 'technical', focus: 'technical' }, { type: 'light', focus: 'light' }, { type: 'rest', focus: '' }],
    [{ type: 'technical', focus: 'technical' }, { type: 'cohesion', focus: 'cohesion' }, { type: 'rest', focus: '' }],
    [{ type: 'light', focus: 'light' }, { type: 'rest', focus: '' }, { type: 'rest', focus: '' }],
    [{ type: 'rest', focus: '' }, { type: 'rest', focus: '' }, { type: 'rest', focus: '' }],
  ],
  cohesion: [
    [{ type: 'cohesion', focus: 'cohesion' }, { type: 'technical', focus: 'technical' }, { type: 'rest', focus: '' }],
    [{ type: 'cohesion', focus: 'cohesion' }, { type: 'cohesion', focus: 'cohesion' }, { type: 'rest', focus: '' }],
    [{ type: 'technical', focus: 'technical' }, { type: 'cohesion', focus: 'cohesion' }, { type: 'rest', focus: '' }],
    [{ type: 'cohesion', focus: 'cohesion' }, { type: 'light', focus: 'light' }, { type: 'rest', focus: '' }],
    [{ type: 'cohesion', focus: 'cohesion' }, { type: 'technical', focus: 'technical' }, { type: 'rest', focus: '' }],
    [{ type: 'light', focus: 'light' }, { type: 'rest', focus: '' }, { type: 'rest', focus: '' }],
    [{ type: 'rest', focus: '' }, { type: 'rest', focus: '' }, { type: 'rest', focus: '' }],
  ],
  medical: [
    [{ type: 'medical', focus: 'medical' }, { type: 'recovery', focus: 'recovery' }, { type: 'rest', focus: '' }],
    [{ type: 'medical', focus: 'medical' }, { type: 'light', focus: 'light' }, { type: 'rest', focus: '' }],
    [{ type: 'medical', focus: 'medical' }, { type: 'recovery', focus: 'recovery' }, { type: 'rest', focus: '' }],
    [{ type: 'medical', focus: 'medical' }, { type: 'light', focus: 'light' }, { type: 'rest', focus: '' }],
    [{ type: 'medical', focus: 'medical' }, { type: 'recovery', focus: 'recovery' }, { type: 'rest', focus: '' }],
    [{ type: 'light', focus: 'light' }, { type: 'rest', focus: '' }, { type: 'rest', focus: '' }],
    [{ type: 'rest', focus: '' }, { type: 'rest', focus: '' }, { type: 'rest', focus: '' }],
  ],
  recovery: [
    [{ type: 'recovery', focus: 'recovery' }, { type: 'light', focus: 'light' }, { type: 'rest', focus: '' }],
    [{ type: 'recovery', focus: 'recovery' }, { type: 'recovery', focus: 'recovery' }, { type: 'rest', focus: '' }],
    [{ type: 'light', focus: 'light' }, { type: 'recovery', focus: 'recovery' }, { type: 'rest', focus: '' }],
    [{ type: 'recovery', focus: 'recovery' }, { type: 'light', focus: 'light' }, { type: 'rest', focus: '' }],
    [{ type: 'recovery', focus: 'recovery' }, { type: 'light', focus: 'light' }, { type: 'rest', focus: '' }],
    [{ type: 'light', focus: 'light' }, { type: 'rest', focus: '' }, { type: 'rest', focus: '' }],
    [{ type: 'rest', focus: '' }, { type: 'rest', focus: '' }, { type: 'rest', focus: '' }],
  ],
  light: [
    [{ type: 'light', focus: 'light' }, { type: 'light', focus: 'light' }, { type: 'rest', focus: '' }],
    [{ type: 'light', focus: 'light' }, { type: 'light', focus: 'light' }, { type: 'rest', focus: '' }],
    [{ type: 'light', focus: 'light' }, { type: 'light', focus: 'light' }, { type: 'rest', focus: '' }],
    [{ type: 'light', focus: 'light' }, { type: 'light', focus: 'light' }, { type: 'rest', focus: '' }],
    [{ type: 'light', focus: 'light' }, { type: 'light', focus: 'light' }, { type: 'rest', focus: '' }],
    [{ type: 'light', focus: 'light' }, { type: 'rest', focus: '' }, { type: 'rest', focus: '' }],
    [{ type: 'rest', focus: '' }, { type: 'rest', focus: '' }, { type: 'rest', focus: '' }],
  ],
};

function generateWeeklySchedule(focus: string): TrainingSession[] {
  const pattern = FOCUS_PATTERNS[focus] ?? FOCUS_PATTERNS.technical;
  return pattern.map((day, i) => ({
    day: i,
    morning: day[0],
    afternoon: day[1],
    evening: day[2],
  }));
}

export const TrainingView: React.FC = () => {
  const { selectedTeam, teams, currentWeek, trainingPlan, setTrainingPlan, applyWeeklyTraining, calculateInjuryRisk, schedulePreventionSession, getInjuryRiskSummary, applyPreventionSession, captureWeeklyAttributeSnapshot, recoverInjuredPlayer } = useGameStore();
  const team = teams.find(t => t.id === selectedTeam);
  const [teamFocus, setTeamFocus] = useState(trainingPlan?.teamFocus ?? 'technical');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showInjuryRisk, setShowInjuryRisk] = useState(false);
  const [showProgression, setShowProgression] = useState(true);

  useEffect(() => {
    if (trainingPlan?.teamFocus) {
      setTeamFocus(trainingPlan.teamFocus);
    }
  }, [trainingPlan?.teamFocus]);

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
    useGameStore.setState({ trainingPlan: plan });
    setTrainingPlan(plan);
  };

  const savePlan = () => {
    const generatedSessions = generateWeeklySchedule(teamFocus);
    const plan: WeeklyTrainingPlan = {
      week: currentWeek,
      teamFocus,
      sessions: generatedSessions,
    };
    useGameStore.setState({ trainingPlan: plan });
    setTrainingPlan(plan);
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 80) return '#F44336'; // critical - red
    if (risk >= 60) return '#FF9800'; // high - orange
    if (risk >= 30) return '#FFC107'; // moderate - yellow
    return '#4CAF50'; // low - green
  };

  const getRiskLabel = (risk: number) => {
    if (risk >= 80) return 'Crítico';
    if (risk >= 60) return 'Alto';
    if (risk >= 30) return 'Moderado';
    return 'Baixo';
  };

  const riskSummary = showInjuryRisk ? getInjuryRiskSummary() : null;

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
          <Button variant="success" onClick={() => { savePlan(); applyWeeklyTraining(); }}>Aplicar Treino Agora</Button>
          <Button variant="secondary" onClick={() => setShowInjuryRisk(!showInjuryRisk)}>
            {showInjuryRisk ? 'Ocultar' : 'Mostrar'} Risco de Lesões
          </Button>
        </div>
      </section>

      {showInjuryRisk && riskSummary && (
        <section className="fm-training-view__section fm-injury-risk-section">
          <h2>🚨 Resumo de Risco de Lesões</h2>
          <div className="fm-injury-risk-grid">
            <div className="fm-injury-risk-category fm-injury-risk--critical">
              <h3>⚠️ Crítico ({riskSummary.critical.length})</h3>
              <ul>
                {riskSummary.critical.map(p => (
                  <li key={p.id} className="fm-injury-risk-item">
                    {p.name} — Risco: {calculateInjuryRisk(p.id)}%
                    <br />
                    <small>Carregamento: {p.cumulativeLoad} | Dias consecutivos: {p.consecutivePhysicalDays}</small>
                  </li>
                ))}
              </ul>
            </div>
            <div className="fm-injury-risk-category fm-injury-risk--high">
              <h3>🟠 Alto ({riskSummary.high.length})</h3>
              <ul>
                {riskSummary.high.map(p => (
                  <li key={p.id}>
                    {p.name} — Risco: {calculateInjuryRisk(p.id)}%
                  </li>
                ))}
              </ul>
            </div>
            <div className="fm-injury-risk-category fm-injury-risk--moderate">
              <h3>🟡 Moderado ({riskSummary.moderate.length})</h3>
              <ul>
                {riskSummary.moderate.map(p => (
                  <li key={p.id}>
                    {p.name} — Risco: {calculateInjuryRisk(p.id)}%
                  </li>
                ))}
              </ul>
            </div>
            <div className="fm-injury-risk-category fm-injury-risk--low">
              <h3>🟢 Baixo ({riskSummary.low.length})</h3>
              <ul>
                {riskSummary.low.map(p => (
                  <li key={p.id}>
                    {p.name} — Risco: {calculateInjuryRisk(p.id)}%
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

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
                    id={`training-session-${dayIdx}-${block}`}
                    name={`training-session-${dayIdx}-${block}`}
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
        <h2>Monitor de Fadiga e Risco</h2>
        <div className="fm-fatigue-grid">
          {team.squad.map((player) => {
            const risk = calculateInjuryRisk(player.id);
            return (
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
                <div className="fm-fatigue-card__risk">
                  <span style={{ color: getRiskColor(risk) }}>
                    ⚠️ Risco: {risk}% ({getRiskLabel(risk)})
                  </span>
                </div>
                <div className="fm-fatigue-card__actions">
                  {player.injury?.active && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (selectedPlayerId === player.id) {
                          setSelectedPlayerId(null);
                        } else {
                          setSelectedPlayerId(player.id);
                          recoverInjuredPlayer(player.id);
                        }
                      }}
                    >
                      {selectedPlayerId === player.id ? 'Cancelar' : 'Recuperar'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="fm-training-view__section">
        <div className="fm-training-view__section-header">
          <h2>Progressão de Atributos</h2>
          <button
            className="fm-training-view__toggle-btn"
            onClick={() => {
              setShowProgression(!showProgression);
            }}
          >
            {showProgression ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {!showProgression && (
          <div className="fm-attribute-progression">
            <p className="fm-attribute-progression__hint">
              Monitore o desenvolvimento dos jogadores ao longo das semanas.
              Treinos consistentes melhoram atributos técnicos e físicos.
            </p>
            <div className="fm-attribute-progression-grid">
              {team?.squad.slice(0, 15).map((player) => (
                <div key={player.id} className="fm-attribute-progression-card">
                  <div className="fm-attribute-progression-card__header">
                    <span className="fm-attribute-progression-card__name">{player.name}</span>
                    <span className="fm-attribute-progression-card__position">{player.position}</span>
                  </div>
                  <div className="fm-attribute-progression-card__body">
                    <div className="fm-attribute-progression-bar-row">
                      <span className="fm-attribute-progression-bar-label">Técnica</span>
                      <div className="fm-attribute-progression-bar">
                        <div
                          className="fm-attribute-progression-bar-fill fm-attribute-progression-bar-fill--technical"
                          style={{ width: `${((player.technical?.technique || 8) / 20) * 100}%` }}
                        />
                      </div>
                      <span className="fm-attribute-progression-bar-value">{player.technical?.technique || 8}</span>
                    </div>
                    <div className="fm-attribute-progression-bar-row">
                      <span className="fm-attribute-progression-bar-label">Passe</span>
                      <div className="fm-attribute-progression-bar">
                        <div
                          className="fm-attribute-progression-bar-fill fm-attribute-progression-bar-fill--technical"
                          style={{ width: `${((player.technical?.passing || 8) / 20) * 100}%` }}
                        />
                      </div>
                      <span className="fm-attribute-progression-bar-value">{player.technical?.passing || 8}</span>
                    </div>
                    <div className="fm-attribute-progression-bar-row">
                      <span className="fm-attribute-progression-bar-label">Finalização</span>
                      <div className="fm-attribute-progression-bar">
                        <div
                          className="fm-attribute-progression-bar-fill fm-attribute-progression-bar-fill--technical"
                          style={{ width: `${((player.technical?.finishing || 8) / 20) * 100}%` }}
                        />
                      </div>
                      <span className="fm-attribute-progression-bar-value">{player.technical?.finishing || 8}</span>
                    </div>
                    <div className="fm-attribute-progression-bar-row">
                      <span className="fm-attribute-progression-bar-label">Resistência</span>
                      <div className="fm-attribute-progression-bar">
                        <div
                          className="fm-attribute-progression-bar-fill fm-attribute-progression-bar-fill--physical"
                          style={{ width: `${((player.physical?.stamina || 8) / 20) * 100}%` }}
                        />
                      </div>
                      <span className="fm-attribute-progression-bar-value">{player.physical?.stamina || 8}</span>
                    </div>
                    <div className="fm-attribute-progression-bar-row">
                      <span className="fm-attribute-progression-bar-label">Velocidade</span>
                      <div className="fm-attribute-progression-bar">
                        <div
                          className="fm-attribute-progression-bar-fill fm-attribute-progression-bar-fill--physical"
                          style={{ width: `${((player.physical?.speed || 8) / 20) * 100}%` }}
                        />
                      </div>
                      <span className="fm-attribute-progression-bar-value">{player.physical?.speed || 8}</span>
                    </div>
                    <div className="fm-attribute-progression-stats">
                      <span className="fm-attribute-progression-stats__item">
                        CA: <strong>{player.currentAbility}</strong>
                      </span>
                      <span className="fm-attribute-progression-stats__item">
                        PA: <strong>{player.potentialAbility}</strong>
                      </span>
                      <span className="fm-attribute-progression-stats__item">
                        Fitness: <strong>{player.fitness}%</strong>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {showProgression && (
          <div className="fm-attribute-progression">
            <div className="fm-attribute-progression__toolbar">
              <button
                className="fm-attribute-progression__capture-btn"
                onClick={() => captureWeeklyAttributeSnapshot()}
              >
                📷 Capturar Snapshot Semanal
              </button>
              <p className="fm-attribute-progression__hint">
                Visualize as mudanças nos atributos dos jogadores ao longo das semanas.
              </p>
            </div>
            <div className="fm-attribute-progression-grid">
              {team?.squad.slice(0, 15).map((player) => {
                const historyLength = player.attributeHistory?.length ?? 0;
                const prevSnapshot = historyLength >= 2 ? player.attributeHistory![historyLength - 2] : undefined;
                const latestSnapshot = historyLength >= 1 ? player.attributeHistory![historyLength - 1] : undefined;
                const hasHistory = historyLength >= 2;

                return (
                  <div key={player.id} className="fm-attribute-progression-card">
                    <div className="fm-attribute-progression-card__header">
                      <span className="fm-attribute-progression-card__name">{player.name}</span>
                      <span className="fm-attribute-progression-card__position">{player.position}</span>
                      {hasHistory && (
                        <span className="fm-attribute-progression-card__weeks">
                          {historyLength - 1} semanas
                        </span>
                      )}
                    </div>
                    <div className="fm-attribute-progression-card__body">
                      {hasHistory && latestSnapshot && prevSnapshot ? (
                        <div className="fm-attribute-progression-deltas">
                          <div className="fm-attribute-progression-delta-row">
                            <span className="fm-attribute-progression-delta-label">Técnica</span>
                            <div className="fm-attribute-progression-delta-values">
                              <span className="fm-attribute-progression-delta-old">
                                {prevSnapshot.technical.technique || 8}
                              </span>
                              <span className="fm-attribute-progression-delta-arrow">→</span>
                              <span className="fm-attribute-progression-delta-new">
                                {latestSnapshot.technical.technique || 8}
                              </span>
                              <span className={`fm-attribute-progression-delta-change ${((latestSnapshot.technical.technique || 8) - (prevSnapshot.technical.technique || 8)) >= 0 ? 'positive' : 'negative'}`}>
                                {((latestSnapshot.technical.technique || 8) - (prevSnapshot.technical.technique || 8)) >= 0 ? '+' : ''}
                                {((latestSnapshot.technical.technique || 8) - (prevSnapshot.technical.technique || 8))}
                              </span>
                            </div>
                          </div>
                          <div className="fm-attribute-progression-delta-row">
                            <span className="fm-attribute-progression-delta-label">Passe</span>
                            <div className="fm-attribute-progression-delta-values">
                              <span className="fm-attribute-progression-delta-old">
                                {prevSnapshot.technical.passing || 8}
                              </span>
                              <span className="fm-attribute-progression-delta-arrow">→</span>
                              <span className="fm-attribute-progression-delta-new">
                                {latestSnapshot.technical.passing || 8}
                              </span>
                              <span className={`fm-attribute-progression-delta-change ${((latestSnapshot.technical.passing || 8) - (prevSnapshot.technical.passing || 8)) >= 0 ? 'positive' : 'negative'}`}>
                                {((latestSnapshot.technical.passing || 8) - (prevSnapshot.technical.passing || 8)) >= 0 ? '+' : ''}
                                {((latestSnapshot.technical.passing || 8) - (prevSnapshot.technical.passing || 8))}
                              </span>
                            </div>
                          </div>
                          <div className="fm-attribute-progression-delta-row">
                            <span className="fm-attribute-progression-delta-label">CA</span>
                            <div className="fm-attribute-progression-delta-values">
                              <span className="fm-attribute-progression-delta-old">
                                {prevSnapshot.currentAbility}
                              </span>
                              <span className="fm-attribute-progression-delta-arrow">→</span>
                              <span className="fm-attribute-progression-delta-new">
                                {latestSnapshot.currentAbility}
                              </span>
                              <span className={`fm-attribute-progression-delta-change ${(latestSnapshot.currentAbility - prevSnapshot.currentAbility) >= 0 ? 'positive' : 'negative'}`}>
                                {(latestSnapshot.currentAbility - prevSnapshot.currentAbility) >= 0 ? '+' : ''}
                                {(latestSnapshot.currentAbility - prevSnapshot.currentAbility)}
                              </span>
                            </div>
                          </div>
                          <div className="fm-attribute-progression-delta-row">
                            <span className="fm-attribute-progression-delta-label">Fitness</span>
                            <div className="fm-attribute-progression-delta-values">
                              <span className="fm-attribute-progression-delta-old">
                                {prevSnapshot.fitness}%
                              </span>
                              <span className="fm-attribute-progression-delta-arrow">→</span>
                              <span className="fm-attribute-progression-delta-new">
                                {latestSnapshot.fitness}%
                              </span>
                              <span className={`fm-attribute-progression-delta-change ${(latestSnapshot.fitness - prevSnapshot.fitness) >= 0 ? 'positive' : 'negative'}`}>
                                {(latestSnapshot.fitness - prevSnapshot.fitness) >= 0 ? '+' : ''}
                                {Math.round(latestSnapshot.fitness - prevSnapshot.fitness)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="fm-attribute-progression-no-history">
                          <p>
                            {!hasHistory
                              ? 'Nenhum snapshot capturado ainda. Capture um snapshot para começar a monitorar a progressão.'
                              : 'Apenas um snapshot disponível. Capture mais para comparar.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="fm-training-view__section">
        <h2>Sessões de Prevenção</h2>
        <div className="fm-prevention-section">
          <p>Agendar sessão para reduzir risco de lesões:</p>
          <div className="fm-prevention-buttons">
            <Button
              variant="secondary"
              onClick={() => {
              const session = {
                type: 'medical' as const,
                targetPlayerIds: team.squad.filter(p => calculateInjuryRisk(p.id) >= 60).map(p => p.id),
                effectiveness: 50,
                day: 0,
              };
              schedulePreventionSession(session);
              applyPreventionSession();
            }}
            >
              🏥 Sessão Médica (Jogadores Críticos)
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
              const session = {
                type: 'recovery' as const,
                targetPlayerIds: team.squad.filter(p => p.fitness < 50 || p.recoveryNeeded).map(p => p.id),
                effectiveness: 70,
                day: 0,
              };
              schedulePreventionSession(session);
              applyPreventionSession();
            }}
            >
              💆 Sessão de Recuperação (Fitness Baixo)
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
              const session = {
                type: 'light' as const,
                targetPlayerIds: team.squad.filter(p => p.consecutivePhysicalDays >= 3).map(p => p.id),
                effectiveness: 40,
                day: 0,
              };
              schedulePreventionSession(session);
              applyPreventionSession();
            }}
            >
              🧘 Treino Leve (Carga Alta)
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};