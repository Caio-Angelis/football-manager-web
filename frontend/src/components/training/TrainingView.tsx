import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Button';
import type { TrainingSession, WeeklyTrainingPlan } from '../../types/game';
import {
  Activity,
  Camera,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  Globe,
  HeartPulse,
  Play,
  RotateCcw,
  Save,
  Shield,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { getInverseRatingColor, getRatingColor } from '../../utils/statusColors';

const TRAINING_TYPES = [
  { id: 'physical', label: 'Físico', desc: 'Velocidade e resistência; aumenta risco de lesão', Icon: Dumbbell },
  { id: 'technical', label: 'Técnico', desc: 'Passe, técnica e finalização', Icon: Target },
  { id: 'cohesion', label: 'Coesão', desc: 'Moral e espírito de equipa', Icon: Users },
  { id: 'medical', label: 'Médico', desc: 'Recuperação de lesões', Icon: HeartPulse },
  { id: 'recovery', label: 'Recuperação', desc: 'Restauração física', Icon: Activity },
  { id: 'light', label: 'Leve', desc: 'Aquecimento e mobilidade', Icon: RotateCcw },
] satisfies Array<{ id: string; label: string; desc: string; Icon: LucideIcon }>;

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

const TARGET_GROUPS = [
  { id: 'all', label: 'Todos', Icon: Users },
  { id: 'attackers', label: 'Atacantes', Icon: Zap },
  { id: 'midfielders', label: 'Meias', Icon: Target },
  { id: 'defenders', label: 'Defensores', Icon: Shield },
  { id: 'custom', label: 'Selecionados', Icon: CheckCircle2 },
] as const;

const POSITION_LABELS: Record<string, string> = {
  GK: 'GOL',
  DEF: 'DEF',
  MID: 'MEI',
  FWD: 'ATA',
};

export const TrainingView: React.FC = () => {
  const { selectedTeam, teams, currentWeek, trainingPlan, setTrainingPlan, applyWeeklyTraining, calculateInjuryRisk, schedulePreventionSession, applyPreventionSession, captureWeeklyAttributeSnapshot } = useGameStore();
  const navigate = useNavigate();
  const team = teams.find(t => t.id === selectedTeam);
  const [teamFocus, setTeamFocus] = useState(trainingPlan?.teamFocus ?? 'technical');
  const [showProgression, setShowProgression] = useState(false);
  const [targetGroup, setTargetGroup] = useState<'all' | 'attackers' | 'midfielders' | 'defenders' | 'custom'>('all');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isManualPlan, setIsManualPlan] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Escolha um foco, gere o calendário e ajuste sessões se necessário.');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    if (trainingPlan?.teamFocus) {
      setTeamFocus(trainingPlan.teamFocus);
    }
  }, [trainingPlan?.teamFocus]);

  if (!team) {
    return <div className="fm-empty">Selecione um time para configurar treinos</div>;
  }

  const sessions = trainingPlan?.sessions ?? DAYS.map((_, i) => createEmptySession(i));

  const persistPlan = (nextSessions: TrainingSession[], message: string) => {
    const plan: WeeklyTrainingPlan = { week: currentWeek, teamFocus, sessions: nextSessions };
    useGameStore.setState({ trainingPlan: plan });
    setTrainingPlan(plan);
    setStatusMessage(message);
  };

  const handleFocusChange = (focus: string) => {
    setTeamFocus(focus);
    setStatusMessage('Foco alterado. Gere um calendário sugerido ou guarde o plano manual atual.');
  };

  const generateFocusPlan = () => {
    const generatedSessions = generateWeeklySchedule(teamFocus);
    persistPlan(generatedSessions, 'Calendário gerado a partir do foco semanal.');
    setIsManualPlan(false);
  };

  const updateSession = (dayIdx: number, block: typeof BLOCKS[number], type: string) => {
    const newSessions = sessions.map((s, i) => {
      if (i !== dayIdx) return s;
      return { ...s, [block]: { type, focus: type } };
    });
    persistPlan(newSessions, 'Calendário editado manualmente. As alterações serão mantidas ao guardar ou aplicar.');
    setIsManualPlan(true);
  };

  const savePlan = () => {
    persistPlan(sessions, isManualPlan ? 'Plano manual guardado.' : 'Plano semanal guardado.');
  };

  const applyPlan = () => {
    setBusyAction('apply');
    persistPlan(sessions, 'Treino aplicado ao grupo selecionado.');
    applyWeeklyTraining(targetGroup, targetGroup === 'custom' ? selectedPlayerIds : undefined);
    window.setTimeout(() => setBusyAction(null), 400);
  };

  const runPrevention = (type: 'medical' | 'recovery' | 'light', targetPlayerIds: string[], effectiveness: number, message: string) => {
    setBusyAction(type);
    schedulePreventionSession({ type, targetPlayerIds, effectiveness, day: 0 });
    applyPreventionSession();
    setStatusMessage(message);
    window.setTimeout(() => setBusyAction(null), 400);
  };

  const getRiskColor = (risk: number) => getInverseRatingColor(risk, { high: 60, medium: 30 });

  const getRiskLabel = (risk: number) => {
    if (risk >= 80) return 'Crítico';
    if (risk >= 60) return 'Alto';
    if (risk >= 30) return 'Moderado';
    return 'Baixo';
  };

  const RISK_LEVELS = [
    { label: 'Crítico', min: 80, ref: 85 },
    { label: 'Alto', min: 60, ref: 65 },
    { label: 'Moderado', min: 30, ref: 40 },
    { label: 'Baixo', min: 0, ref: 10 },
  ] as const;

  const riskTally = RISK_LEVELS.map((lvl, i) => {
    const upper = i === 0 ? Infinity : RISK_LEVELS[i - 1].min;
    const count = team.squad.filter(p => {
      const r = calculateInjuryRisk(p.id);
      return r >= lvl.min && r < upper;
    }).length;
    return { ...lvl, count };
  });

  return (
    <div className="fms-page">
      <PageHeader
        title="Treino"
        subtitle={`Semana ${currentWeek} — ${team?.name ?? '—'}`}
        teamName={team?.name}
        teamReputation={team?.reputation}
        actions={[
          { icon: <Globe size={15} />, title: 'Visão do Clube', onClick: () => navigate('/clube') },
          { icon: <Users size={15} />, title: 'Elenco', onClick: () => navigate('/elenco') },
        ]}
      />

      <div className="fms-body--scroll fm-training-view">
      <div className="fm-training-shell">
      <div className="fm-training-plan-column">

      <section className="fms-section fm-training-view__section">
        <div className="fm-training-view__section-header">
          <h2 className="fms-section__title">Plano semanal</h2>
          <span className={`fms-badge ${isManualPlan ? 'fms-badge--amber' : 'fms-badge--accent'}`}>
            {isManualPlan ? 'Manual' : 'Gerado por foco'}
          </span>
        </div>
        <p className="fm-training-view__hint" role="status" aria-live="polite">{statusMessage}</p>
        <div className="fm-training-view__types">
          {TRAINING_TYPES.map((t) => (
            <button
              key={t.id}
              className={`fm-training-type ${teamFocus === t.id ? 'fm-training-type--active' : ''}`}
              onClick={() => handleFocusChange(t.id)}
              aria-pressed={teamFocus === t.id}
            >
              <span className="fm-training-type__icon" aria-hidden="true"><t.Icon size={18} /></span>
              <span className="fm-training-type__label">{t.label}</span>
              <span className="fm-training-type__desc">{t.desc}</span>
            </button>
          ))}
        </div>
        <div className="fm-training-view__target-group">
          <h3>Alvo do Treino</h3>
          <div className="fm-training-view__target-buttons">
            {TARGET_GROUPS.map((g) => (
              <button
                key={g.id}
                className={`fm-training-type fm-training-type--compact ${targetGroup === g.id ? 'fm-training-type--active' : ''}`}
                onClick={() => setTargetGroup(g.id)}
                aria-pressed={targetGroup === g.id}
              >
                <span className="fm-training-type__icon" aria-hidden="true"><g.Icon size={16} /></span>
                <span className="fm-training-type__label">{g.label}</span>
              </button>
            ))}
          </div>
        </div>

        {targetGroup === 'custom' && (
          <div className="fm-training-view__player-select">
            <h3>Selecionar Jogadores</h3>
            <div className="fm-training-view__player-list">
              {team.squad.map((player) => (
                <label key={player.id} className="fm-training-view__player-item">
                  <input
                    type="checkbox"
                    checked={selectedPlayerIds.includes(player.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPlayerIds([...selectedPlayerIds, player.id]);
                      } else {
                        setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== player.id));
                      }
                    }}
                  />
                  <span className="fm-training-view__player-name">{player.name}</span>
                  <span className="fm-training-view__player-pos">{POSITION_LABELS[player.position] ?? player.position}</span>
                  {player.injury?.active && <span className="fm-fatigue-card__injury">Lesão</span>}
                </label>
              ))}
            </div>
            <p className="fm-training-view__select-count">
              {selectedPlayerIds.length} jogador(es) selecionado(s)
            </p>
          </div>
        )}

        <div className="fm-training-view__actions">
          <Button variant="secondary" onClick={generateFocusPlan}>
            <ClipboardList size={14} /> Gerar calendário do foco
          </Button>
          <Button onClick={savePlan}>
            <Save size={14} /> Guardar plano atual
          </Button>
          <Button
            variant="success"
            disabled={targetGroup === 'custom' && selectedPlayerIds.length === 0}
            loading={busyAction === 'apply'}
            onClick={applyPlan}
          >
            <Play size={14} /> Aplicar treino agora
          </Button>
        </div>
      </section>

      <section className="fms-section fm-training-view__section">
        <div className="fm-training-view__section-header">
          <h2 className="fms-section__title">Calendário semanal</h2>
          <span className="fm-training-view__hint">Alterações manuais são preservadas ao guardar ou aplicar.</span>
        </div>
        <div className="fm-training-calendar">
          <div className="fm-training-calendar__head" aria-hidden="true">
            <span className="fm-training-calendar__corner" />
            {BLOCKS.map((block) => (
              <span key={block} className="fm-training-calendar__col-label">{BLOCK_LABELS[block]}</span>
            ))}
          </div>
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="fm-training-row">
              <span className="fm-training-row__day">{day}</span>
              {BLOCKS.map((block) => {
                const inputId = `training-session-${dayIdx}-${block}`;
                return (
                  <select
                    key={block}
                    id={inputId}
                    name={inputId}
                    aria-label={`${day} — ${BLOCK_LABELS[block]}`}
                    className={`fms-select fm-training-row__select ${(sessions[dayIdx]?.[block]?.type ?? 'rest') === 'rest' ? 'fm-training-row__select--rest' : ''}`}
                    value={sessions[dayIdx]?.[block]?.type ?? 'rest'}
                    onChange={(e) => updateSession(dayIdx, block, e.target.value)}
                  >
                    <option value="rest">Descanso</option>
                    {TRAINING_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                );
              })}
            </div>
          ))}
        </div>
      </section>
      </div>

      <div className="fm-training-monitor-column">
      <section className="fms-section fm-training-view__section">
        <div className="fm-training-view__section-header">
          <h2 className="fms-section__title">Monitor de fadiga e risco</h2>
          <div className="fm-risk-tally" role="status" aria-label="Resumo de risco do elenco">
            {riskTally.filter(l => l.count > 0).map(l => (
              <span
                key={l.label}
                className="fm-risk-tally__item"
                style={{ '--risk': getRiskColor(l.ref) } as React.CSSProperties}
              >
                <span className="fm-risk-tally__dot" aria-hidden="true" />
                {l.count} {l.label}
              </span>
            ))}
          </div>
        </div>
        <div className="fm-fatigue-grid">
          {[...team.squad]
            .map((player) => ({ player, risk: calculateInjuryRisk(player.id) }))
            .sort((a, b) => b.risk - a.risk)
            .map(({ player, risk }) => (
              <div
                key={player.id}
                className="fm-fatigue-card"
                style={{ '--risk': getRiskColor(risk) } as React.CSSProperties}
              >
                <div className="fm-fatigue-card__top">
                  <span className="fm-fatigue-card__name">{player.name}</span>
                  <span className="fm-fatigue-card__risk-chip">{getRiskLabel(risk)} · {risk}%</span>
                </div>
                <div className="fm-fatigue-card__bar" aria-label={`Fitness ${player.fitness}%`}>
                  <div
                    className="fm-fatigue-card__fill"
                    style={{
                      width: `${player.fitness}%`,
                      backgroundColor: getRatingColor(player.fitness, { high: 70, medium: 40 }),
                    }}
                  />
                </div>
                <div className="fm-fatigue-card__meta">
                  <span className="fm-fatigue-card__value">Fitness {player.fitness}%</span>
                  {player.injury?.active && (
                    <span className="fm-fatigue-card__injury">Lesão {player.injury.daysRemaining}d</span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="fms-section fm-training-view__section">
        <div className="fm-training-view__section-header">
          <h2 className="fms-section__title">Progressão de atributos</h2>
          <button
            className="fms-link-btn fm-training-view__toggle-btn"
            onClick={() => {
              setShowProgression(!showProgression);
            }}
            aria-expanded={showProgression}
            aria-controls="attribute-progression-panel"
          >
            {showProgression ? 'Ver atributos atuais' : 'Ver deltas semanais'}
          </button>
        </div>
        {!showProgression && (
          <div className="fm-attribute-progression" id="attribute-progression-panel">
            <p className="fm-attribute-progression__hint">
              Monitore o desenvolvimento dos jogadores ao longo das semanas.
              Treinos consistentes melhoram atributos técnicos e físicos.
            </p>
            {team.squad.length > 15 && (
              <p className="fm-attribute-progression__hint">Mostrando 15 de {team.squad.length} jogadores.</p>
            )}
            <div className="fm-attribute-progression-grid">
              {team?.squad.slice(0, 15).map((player) => (
                <div key={player.id} className="fm-attribute-progression-card">
                  <div className="fm-attribute-progression-card__header">
                    <span className="fm-attribute-progression-card__name">{player.name}</span>
                    <span className="fm-attribute-progression-card__position">{POSITION_LABELS[player.position] ?? player.position}</span>
                  </div>
                  <div className="fm-attribute-progression-card__body">
                    {[
                      { label: 'Técnica', value: Number(player.technical?.technique || 8) },
                      { label: 'Passe', value: Number(player.technical?.passing || 8) },
                      { label: 'Finalização', value: Number(player.technical?.finishing || 8) },
                      { label: 'Resistência', value: Number(player.physical?.stamina || 8) },
                      { label: 'Velocidade', value: Number(player.physical?.speed || 8) },
                    ].map(({ label, value }) => (
                      <div key={label} className="fm-attribute-progression-bar-row">
                        <span className="fm-attribute-progression-bar-label">{label}</span>
                        <div className="fm-attribute-progression-bar">
                          <div
                            className="fm-attribute-progression-bar-fill"
                            style={{
                              width: `${(value / 20) * 100}%`,
                              backgroundColor: getRatingColor((value / 20) * 100, { high: 70, medium: 40 }),
                            }}
                          />
                        </div>
                        <span className="fm-attribute-progression-bar-value">{value}</span>
                      </div>
                    ))}
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
          <div className="fm-attribute-progression" id="attribute-progression-panel">
            <div className="fm-attribute-progression__toolbar">
              <button
                className="fm-attribute-progression__capture-btn"
                onClick={() => {
                  captureWeeklyAttributeSnapshot();
                  setStatusMessage('Snapshot semanal capturado para comparar evolução.');
                }}
              >
                <Camera size={14} /> Capturar snapshot semanal
              </button>
              <p className="fm-attribute-progression__hint">
                Compare o último snapshot com a semana anterior. Capture um novo snapshot depois de aplicar treino.
              </p>
            </div>
            {team.squad.length > 15 && (
              <p className="fm-attribute-progression__hint">Mostrando 15 de {team.squad.length} jogadores.</p>
            )}
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
                      <span className="fm-attribute-progression-card__position">{POSITION_LABELS[player.position] ?? player.position}</span>
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
                              <span className={`fm-attribute-progression-delta-change fm-attribute-progression-delta-change--${(Number(latestSnapshot.technical.technique || 8) - Number(prevSnapshot.technical.technique || 8)) >= 0 ? 'positive' : 'negative'}`}>
                                {(Number(latestSnapshot.technical.technique || 8) - Number(prevSnapshot.technical.technique || 8)) >= 0 ? '+' : ''}
                                {(Number(latestSnapshot.technical.technique || 8) - Number(prevSnapshot.technical.technique || 8))}
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
                              <span className={`fm-attribute-progression-delta-change fm-attribute-progression-delta-change--${(Number(latestSnapshot.technical.passing || 8) - Number(prevSnapshot.technical.passing || 8)) >= 0 ? 'positive' : 'negative'}`}>
                                {(Number(latestSnapshot.technical.passing || 8) - Number(prevSnapshot.technical.passing || 8)) >= 0 ? '+' : ''}
                                {(Number(latestSnapshot.technical.passing || 8) - Number(prevSnapshot.technical.passing || 8))}
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
                              <span className={`fm-attribute-progression-delta-change fm-attribute-progression-delta-change--${(latestSnapshot.currentAbility - prevSnapshot.currentAbility) >= 0 ? 'positive' : 'negative'}`}>
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
                              <span className={`fm-attribute-progression-delta-change fm-attribute-progression-delta-change--${(latestSnapshot.fitness - prevSnapshot.fitness) >= 0 ? 'positive' : 'negative'}`}>
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

      <section className="fms-section fm-training-view__section">
        <h2 className="fms-section__title">Sessões de prevenção</h2>
        <div className="fm-prevention-section">
          <p className="fm-training-view__hint">Aplique uma sessão pontual para reduzir risco sem alterar o calendário semanal.</p>
          <div className="fm-prevention-buttons">
            <Button
              variant="secondary"
              loading={busyAction === 'medical'}
              onClick={() => runPrevention(
                'medical',
                team.squad.filter(p => calculateInjuryRisk(p.id) >= 60).map(p => p.id),
                50,
                'Sessão médica aplicada a jogadores com risco alto ou crítico.',
              )}
            >
              <HeartPulse size={14} /> Sessão médica
            </Button>
            <Button
              variant="secondary"
              loading={busyAction === 'recovery'}
              onClick={() => runPrevention(
                'recovery',
                team.squad.filter(p => p.fitness < 50 || p.recoveryNeeded).map(p => p.id),
                70,
                'Sessão de recuperação aplicada a jogadores com fitness baixo.',
              )}
            >
              <Activity size={14} /> Recuperação
            </Button>
            <Button
              variant="secondary"
              loading={busyAction === 'light'}
              onClick={() => runPrevention(
                'light',
                team.squad.filter(p => p.consecutivePhysicalDays >= 3).map(p => p.id),
                40,
                'Treino leve aplicado a jogadores com carga acumulada alta.',
              )}
            >
              <RotateCcw size={14} /> Treino leve
            </Button>
          </div>
        </div>
      </section>
      </div>
      </div>
      </div>
    </div>
  );
};