import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Button';
import type {
  PressConference, PressQuestion, PressResponseTone,
} from '../../types/game';
import { RESPONSE_OPTIONS } from '../../types/game';
import {
  Globe, Users, Circle, Clock, CheckCircle2, SkipForward, User, Newspaper,
  Megaphone, TrendingUp, TrendingDown, Minus, Mic,
} from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { STATUS_COLOR } from '../../utils/statusColors';

// ============================================================
// HELPERS
// ============================================================

const TONE_LABELS: Record<string, string> = {
  aggressive: 'Agressivo',
  neutral: 'Neutro',
  friendly: 'Amigável',
  provocative: 'Provocativo',
};

const TONE_COLORS: Record<string, string> = {
  aggressive: STATUS_COLOR.red,
  neutral: STATUS_COLOR.muted,
  friendly: STATUS_COLOR.green,
  provocative: STATUS_COLOR.amber,
};

const ToneDot: React.FC<{ tone: string }> = ({ tone }) => {
  const color = TONE_COLORS[tone] ?? STATUS_COLOR.muted;
  return <Circle size={9} fill={color} stroke={color} style={{ verticalAlign: -1 }} />;
};

const CATEGORY_LABELS: Record<string, string> = {
  match_preview: 'Pré-Jogo',
  match_review: 'Pós-Jogo',
  transfer: 'Transferências',
  player_form: 'Forma de Jogador',
  tactics: 'Táticas',
  board: 'Diretoria',
  rivalry: 'Rivalidade',
  injury: 'Lesões',
  season_goals: 'Objetivos',
  controversy: 'Polêmica',
};

const RESPONSE_TONE_LABELS: Record<PressResponseTone, string> = {
  praise: 'Elogiar',
  defensive: 'Defensivo',
  critical: 'Crítico',
  diplomatic: 'Diplomático',
  deflect: 'Desviar',
};

const RESPONSE_TONE_COLORS: Record<PressResponseTone, string> = {
  praise: 'fm-press__tone--praise',
  defensive: 'fm-press__tone--defensive',
  critical: 'fm-press__tone--critical',
  diplomatic: 'fm-press__tone--diplomatic',
  deflect: 'fm-press__tone--deflect',
};

const FAN_SENTIMENT_LABELS: Record<string, string> = {
  ecstatic: 'Eufórica',
  happy: 'Feliz',
  satisfied: 'Satisfeita',
  neutral: 'Neutra',
  concerned: 'Preocupada',
  angry: 'Irritada',
  furious: 'Furiosa',
};

const FAN_SENTIMENT_COLORS: Record<string, string> = {
  ecstatic: '#22c55e',
  happy: '#4ade80',
  satisfied: '#84cc16',
  neutral: '#eab308',
  concerned: '#f97316',
  angry: '#ef4444',
  furious: '#dc2626',
};

const MEDIA_LEVEL_LABELS: Record<string, string> = {
  low: 'Baixa',
  moderate: 'Moderada',
  high: 'Alta',
  intense: 'Intensa',
};

const MEDIA_LEVEL_COLORS: Record<string, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  high: '#f97316',
  intense: '#ef4444',
};

// ============================================================
// COMPONENT: FanMoodBar
// ============================================================

const SentimentBar: React.FC<{ label: string; value: number; max: number; color: string; sublabel?: string }> = ({
  label, value, max, color, sublabel,
}) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="fm-press__sentiment-bar">
      <div className="fm-press__sentiment-header">
        <span className="fm-press__sentiment-label">{label}</span>
        <span className="fm-press__sentiment-value" style={{ color }}>{sublabel ?? `${Math.round(value)}/${max}`}</span>
      </div>
      <div className="fm-press__sentiment-track">
        <div className="fm-press__sentiment-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

// ============================================================
// COMPONENT: PressConferenceCard
// ============================================================

const PressConferenceCard: React.FC<{
  conference: PressConference;
}> = ({ conference }) => {
  const { answerPressQuestion, skipPressConference } = useGameStore();
  const [selectedTone, setSelectedTone] = useState<Record<string, PressResponseTone>>({});
  const [selectedText, setSelectedText] = useState<Record<string, string>>({});
  // E-35: Track de questão sendo respondida para evitar double-click.
  const [answeringId, setAnsweringId] = useState<string | null>(null);

  const answeredIds = new Set(conference.responses.map(r => r.questionId));
  const allAnswered = conference.questions.every(q => answeredIds.has(q.id));
  const isPending = conference.status === 'pending';
  const isCompleted = conference.status === 'completed';
  const isSkipped = conference.status === 'skipped';

  const handleAnswer = async (question: PressQuestion) => {
    const tone = selectedTone[question.id];
    const text = selectedText[question.id];
    if (!tone || !text || answeringId) return;
    // E-35: Desabilitar botao enquanto a resposta esta pendente.
    setAnsweringId(question.id);
    try {
      await answerPressQuestion(conference.id, question.id, tone, text);
    } finally {
      setAnsweringId(null);
    }
  };

  const typeLabel = conference.type === 'pre_match' ? 'Pré-Jogo' : conference.type === 'post_match' ? 'Pós-Jogo' : 'Geral';

  return (
    <div className={`fm-press__card fm-press__card--${conference.status}`}>
      <div className="fm-press__card-header">
        <div className="fm-press__card-title">
          <span className="fm-press__card-type-badge">{typeLabel}</span>
          <span className="fm-press__card-week">Semana {conference.week} · Temporada {conference.season}</span>
        </div>
        <div className="fm-press__card-status">
          {isPending && <span className="fm-press__status fm-press__status--pending"><Clock size={13} /> Pendente</span>}
          {isCompleted && <span className="fm-press__status fm-press__status--completed"><CheckCircle2 size={13} /> Concluída</span>}
          {isSkipped && <span className="fm-press__status fm-press__status--skipped"><SkipForward size={13} /> Pulada</span>}
        </div>
      </div>

      {conference.context.opponentName && (
        <div className="fm-press__card-context">
          {conference.type === 'pre_match' && `Adversário: ${conference.context.opponentName} (${conference.context.isHome ? 'Em casa' : 'Fora'})`}
          {conference.type === 'post_match' && conference.context.lastResult && (
            <>Resultado: {conference.context.lastResult.homeGoals} x {conference.context.lastResult.awayGoals} vs {conference.context.lastResult.opponentName}</>
          )}
        </div>
      )}

      <div className="fm-press__questions">
        {conference.questions.map((question, qIdx) => {
          const isAnswered = answeredIds.has(question.id);
          const response = conference.responses.find(r => r.questionId === question.id);

          return (
            <div key={question.id} className={`fm-press__question ${isAnswered ? 'fm-press__question--answered' : ''}`}>
              <div className="fm-press__question-header">
                <span className="fm-press__question-number">P{qIdx + 1}</span>
                <span className="fm-press__question-meta">
                  <span className="fm-press__category-badge">{CATEGORY_LABELS[question.category] ?? question.category}</span>
                  <span className="fm-press__tone-badge" title={TONE_LABELS[question.tone] ?? question.tone}>
                    <ToneDot tone={question.tone} /> {TONE_LABELS[question.tone] ?? question.tone}
                  </span>
                </span>
              </div>

              <div className="fm-press__question-body">
                <div className="fm-press__journalist">
                  <strong>{question.journalistName}</strong>
                  <span className="fm-press__outlet">{question.outlet}</span>
                </div>
                <p className="fm-press__question-text">"{question.question}"</p>
                {question.relatedPlayerName && (
                  <span className="fm-press__related-player"><User size={12} /> {question.relatedPlayerName}</span>
                )}
              </div>

              {isAnswered && response ? (
                <div className={`fm-press__answer ${RESPONSE_TONE_COLORS[response.tone]}`}>
                  <span className="fm-press__answer-tone">{RESPONSE_TONE_LABELS[response.tone]}</span>
                  <p className="fm-press__answer-text">"{response.text}"</p>
                </div>
              ) : isPending ? (
                <div className="fm-press__response-options">
                  {(Object.keys(RESPONSE_OPTIONS) as PressResponseTone[]).map(tone => (
                    <div key={tone} className={`fm-press__response-group ${RESPONSE_TONE_COLORS[tone]}`}>
                      <button
                        className={`fm-press__tone-btn ${selectedTone[question.id] === tone ? 'fm-press__tone-btn--active' : ''}`}
                        onClick={() => {
                          setSelectedTone(prev => ({ ...prev, [question.id]: tone }));
                          setSelectedText(prev => ({ ...prev, [question.id]: RESPONSE_OPTIONS[tone][0].text }));
                        }}
                      >
                        {RESPONSE_TONE_LABELS[tone]}
                      </button>
                      {selectedTone[question.id] === tone && (
                        <div className="fm-press__response-variants">
                          {RESPONSE_OPTIONS[tone].map((opt, i) => (
                            <button
                              key={i}
                              className={`fm-press__variant-btn ${selectedText[question.id] === opt.text ? 'fm-press__variant-btn--active' : ''}`}
                              onClick={() => setSelectedText(prev => ({ ...prev, [question.id]: opt.text }))}
                            >
                              {opt.label}
                            </button>
                          ))}
                          <Button
                            className="fm-press__submit-btn"
                            onClick={() => handleAnswer(question)}
                            disabled={answeringId === question.id}
                          >
                            {answeringId === question.id ? 'Enviando...' : 'Responder'}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {isPending && !allAnswered && (
        <div className="fm-press__card-footer">
          <Button variant="secondary" onClick={() => skipPressConference(conference.id)}>
            ⏭️ Pular Coletiva
          </Button>
        </div>
      )}

      {isCompleted && conference.effects && (
        <div className="fm-press__effects">
          <div className="fm-press__headline"><Newspaper size={14} /> {conference.effects.headline}</div>
          <div className="fm-press__effects-grid">
            <div className={`fm-press__effect ${conference.effects.moraleChange >= 0 ? 'fm-press__effect--positive' : 'fm-press__effect--negative'}`}>
              <span className="fm-press__effect-label">Moral</span>
              <span className="fm-press__effect-value">{conference.effects.moraleChange >= 0 ? '+' : ''}{conference.effects.moraleChange}</span>
            </div>
            <div className={`fm-press__effect ${conference.effects.boardSatisfactionChange >= 0 ? 'fm-press__effect--positive' : 'fm-press__effect--negative'}`}>
              <span className="fm-press__effect-label">Diretoria</span>
              <span className="fm-press__effect-value">{conference.effects.boardSatisfactionChange >= 0 ? '+' : ''}{conference.effects.boardSatisfactionChange}</span>
            </div>
            <div className={`fm-press__effect ${conference.effects.fanMoodChange >= 0 ? 'fm-press__effect--positive' : 'fm-press__effect--negative'}`}>
              <span className="fm-press__effect-label">Torcida</span>
              <span className="fm-press__effect-value">{conference.effects.fanMoodChange >= 0 ? '+' : ''}{conference.effects.fanMoodChange}</span>
            </div>
            <div className={`fm-press__effect ${conference.effects.mediaPressureChange <= 0 ? 'fm-press__effect--positive' : 'fm-press__effect--negative'}`}>
              <span className="fm-press__effect-label">Mídia</span>
              <span className="fm-press__effect-value">{conference.effects.mediaPressureChange >= 0 ? '+' : ''}{conference.effects.mediaPressureChange}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const PressCenter: React.FC = () => {
  const {
    pressConferences, fanMood, mediaPressure,
    matches, selectedTeam, teams,
    generatePreMatchPressConference, generatePostMatchPressConference,
  } = useGameStore();
  const navigate = useNavigate();
  const userTeam = teams.find(t => t.id === selectedTeam);

  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const pendingConferences = useMemo(() =>
    (pressConferences ?? []).filter(c => c.status === 'pending'),
    [pressConferences],
  );

  const historyConferences = useMemo(() =>
    (pressConferences ?? [])
      .filter(c => c.status === 'completed' || c.status === 'skipped')
      .sort((a, b) => b.week - a.week),
    [pressConferences],
  );

  // Encontrar próxima partida do usuário (pendente)
  const userMatch = useMemo(() => {
    if (!selectedTeam) return null;
    return (matches ?? []).findIndex(m =>
      !m.completed && (m.homeTeam === selectedTeam || m.awayTeam === selectedTeam),
    );
  }, [matches, selectedTeam]);

  // Encontrar última partida completada do usuário
  const lastCompletedMatchIdx = useMemo(() => {
    if (!selectedTeam) return -1;
    let lastIdx = -1;
    (matches ?? []).forEach((m, i) => {
      if (m.completed && (m.homeTeam === selectedTeam || m.awayTeam === selectedTeam)) {
        lastIdx = i;
      }
    });
    return lastIdx;
  }, [matches, selectedTeam]);

  const hasPendingConference = pendingConferences.length > 0;

  return (
    <div className="fms-page">
      <PageHeader
        title="Centro de Imprensa"
        subtitle={userTeam?.name ?? '—'}
        teamName={userTeam?.name}
        teamReputation={userTeam?.reputation}
        actions={[
          { icon: <Globe size={15} />, title: 'Visão do Clube', onClick: () => navigate('/clube') },
          { icon: <Users size={15} />, title: 'Elenco', onClick: () => navigate('/elenco') },
        ]}
      />

      <div className="fms-body--scroll">

      {/* Painel de Sentimento */}
      <div className="fm-press__dashboard">
        <div className="fm-press__dashboard-card">
          <h3 className="fm-press__dashboard-title"><Megaphone size={15} /> Humor da Torcida</h3>
          <SentimentBar
            label="Sentimento"
            value={fanMood?.value ?? 50}
            max={100}
            color={FAN_SENTIMENT_COLORS[fanMood?.sentiment ?? 'neutral']}
            sublabel={FAN_SENTIMENT_LABELS[fanMood?.sentiment ?? 'neutral']}
          />
          <div className="fm-press__trend">
            Tendência:{' '}
            <span className={`fm-press__trend-badge fm-press__trend--${fanMood?.trend ?? 'stable'}`}>
              {fanMood?.trend === 'rising' ? <><TrendingUp size={13} /> Subindo</> : fanMood?.trend === 'falling' ? <><TrendingDown size={13} /> Caindo</> : <><Minus size={13} /> Estável</>}
            </span>
          </div>
        </div>

        <div className="fm-press__dashboard-card">
          <h3 className="fm-press__dashboard-title"><Newspaper size={15} /> Pressão Midiática</h3>
          <SentimentBar
            label="Pressão"
            value={mediaPressure?.value ?? 30}
            max={100}
            color={MEDIA_LEVEL_COLORS[mediaPressure?.level ?? 'moderate']}
            sublabel={MEDIA_LEVEL_LABELS[mediaPressure?.level ?? 'moderate']}
          />
          <div className="fm-press__trend-note">
            {mediaPressure?.level === 'intense' && '⚠️ A mídia está cobrando duro! Isso pode afetar o desempenho do time.'}
            {mediaPressure?.level === 'high' && '⚠️ A pressão midiática está alta.'}
            {mediaPressure?.level === 'moderate' && 'A pressão midiática está sob controle.'}
            {mediaPressure?.level === 'low' && 'A mídia está tranquila.'}
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="fm-press__actions">
        {userMatch !== null && userMatch >= 0 && (
          <Button
            onClick={() => generatePreMatchPressConference(userMatch)}
            disabled={hasPendingConference}
            className="fm-press__action-btn"
          >
            <Mic size={15} /> Coletiva Pré-Jogo
          </Button>
        )}
        {lastCompletedMatchIdx >= 0 && (
          <Button
            variant="secondary"
            onClick={() => generatePostMatchPressConference(lastCompletedMatchIdx)}
            disabled={hasPendingConference}
            className="fm-press__action-btn"
          >
            <Mic size={15} /> Coletiva Pós-Jogo
          </Button>
        )}
        {hasPendingConference && (
          <span className="fm-press__notice">
            ⚠️ Você tem uma coletiva pendente. Responda ou pule antes de iniciar outra.
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="fm-press__tabs">
        <button
          className={`fm-press__tab ${activeTab === 'pending' ? 'fm-press__tab--active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pendentes {pendingConferences.length > 0 && `(${pendingConferences.length})`}
        </button>
        <button
          className={`fm-press__tab ${activeTab === 'history' ? 'fm-press__tab--active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Histórico ({historyConferences.length})
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      <div className="fm-press__content">
        {activeTab === 'pending' && (
          <div className="fm-press__pending-list">
            {pendingConferences.length === 0 ? (
              <div className="fm-press__empty">
                <p>Nenhuma coletiva pendente.</p>
                <p className="fm-press__empty-hint">Inicie uma coletiva pré-jogo ou pós-jogo usando os botões acima.</p>
              </div>
            ) : (
              pendingConferences.map(conf => (
                <PressConferenceCard key={conf.id} conference={conf} />
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="fm-press__history-list">
            {historyConferences.length === 0 ? (
              <div className="fm-press__empty">
                <p>Nenhuma coletiva no histórico.</p>
              </div>
            ) : (
              historyConferences.map(conf => (
                <PressConferenceCard key={conf.id} conference={conf} />
              ))
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
