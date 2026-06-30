import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { PreMatchAnalysis, KeyMatchup } from '../../types/game';

const RISK_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#ef4444',
};

const FORM_BADGE_CLASS: Record<string, string> = {
  W: 'fm-pre-match__form-badge--win',
  D: 'fm-pre-match__form-badge--draw',
  L: 'fm-pre-match__form-badge--loss',
};

const FORM_LABEL: Record<string, string> = {
  W: 'V',
  D: 'E',
  L: 'D',
};

const MatchupRow: React.FC<{ matchup: KeyMatchup; homeTeamName: string; awayTeamName: string }> = ({
  matchup, homeTeamName, awayTeamName,
}) => {
  const advantageColor =
    matchup.advantage === 'home' ? '#3b82f6' :
    matchup.advantage === 'away' ? '#f59e0b' :
    '#6b7280';

  return (
    <div className="fm-pre-match__matchup">
      <div className="fm-pre-match__matchup-label">{matchup.label}</div>
      <div className="fm-pre-match__matchup-players">
        <div className={`fm-pre-match__matchup-player ${matchup.advantage === 'home' ? 'fm-pre-match__matchup-player--adv' : ''}`}>
          <span className="fm-pre-match__matchup-name">{matchup.homePlayer.name}</span>
          <span className="fm-pre-match__matchup-pos">{matchup.homePlayer.position}</span>
          <span className="fm-pre-match__matchup-rating" style={{ color: advantageColor }}>
            {matchup.homePlayer.rating}
          </span>
        </div>
        <span className="fm-pre-match__matchup-vs">VS</span>
        <div className={`fm-pre-match__matchup-player ${matchup.advantage === 'away' ? 'fm-pre-match__matchup-player--adv' : ''}`}>
          <span className="fm-pre-match__matchup-rating" style={{ color: advantageColor }}>
            {matchup.awayPlayer.rating}
          </span>
          <span className="fm-pre-match__matchup-pos">{matchup.awayPlayer.position}</span>
          <span className="fm-pre-match__matchup-name">{matchup.awayPlayer.name}</span>
        </div>
      </div>
      <div className="fm-pre-match__matchup-edge">
        {matchup.advantage === 'even'
          ? 'Equilibrado'
          : `Vantagem: ${matchup.advantage === 'home' ? homeTeamName : awayTeamName} (+${matchup.edge})`}
      </div>
    </div>
  );
};

const ProbabilityBar: React.FC<{ home: number; draw: number; away: number }> = ({ home, draw, away }) => (
  <div className="fm-pre-match__prob-bar">
    <div className="fm-pre-match__prob-segment fm-pre-match__prob-home" style={{ width: `${home}%` }}>
      {home > 8 ? `${home}%` : ''}
    </div>
    <div className="fm-pre-match__prob-segment fm-pre-match__prob-draw" style={{ width: `${draw}%` }}>
      {draw > 8 ? `${draw}%` : ''}
    </div>
    <div className="fm-pre-match__prob-segment fm-pre-match__prob-away" style={{ width: `${away}%` }}>
      {away > 8 ? `${away}%` : ''}
    </div>
  </div>
);

interface PreMatchBriefingProps {
  matchIndex: number;
  homeTeamName: string;
  awayTeamName: string;
  onClose: () => void;
}

export const PreMatchBriefing: React.FC<PreMatchBriefingProps> = ({
  matchIndex, homeTeamName, awayTeamName, onClose,
}) => {
  const getPreMatchAnalysis = useGameStore(s => s.getPreMatchAnalysis);
  const [analysis, setAnalysis] = useState<PreMatchAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getPreMatchAnalysis(matchIndex)
      .then(result => {
        setAnalysis(result);
        setLoading(false);
      })
      .catch(() => {
        setError('Falha ao gerar análise pré-jogo.');
        setLoading(false);
      });
  }, [matchIndex]);

  if (loading) {
    return (
      <div className="fm-pre-match__overlay">
        <div className="fm-pre-match__modal">
          <div className="fm-pre-match__loading">
            <div className="fm-pre-match__spinner" />
            <p>Analisando partida via simulação Monte Carlo (500 iterações)...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="fm-pre-match__overlay">
        <div className="fm-pre-match__modal">
          <p className="fm-pre-match__error">{error ?? 'Dados de análise indisponíveis.'}</p>
          <button className="fm-pre-match__close-btn" onClick={onClose}>Fechar</button>
        </div>
      </div>
    );
  }

  const { tacticalRecommendation: tac, formComparison: form, keyMatchups: matchups } = analysis;

  return (
    <div className="fm-pre-match__overlay" onClick={onClose}>
      <div className="fm-pre-match__modal" onClick={e => e.stopPropagation()}>
        <div className="fm-pre-match__header">
          <h2 className="fm-pre-match__title">Centro de Inteligência Pré-Jogo</h2>
          <button className="fm-pre-match__close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="fm-pre-match__teams">
          <span className="fm-pre-match__team-name">{homeTeamName}</span>
          <span className="fm-pre-match__vs">vs</span>
          <span className="fm-pre-match__team-name">{awayTeamName}</span>
        </div>

        <p className="fm-pre-match__summary">{analysis.summary}</p>

        {/* Win Probability */}
        <section className="fm-pre-match__section">
          <h3 className="fm-pre-match__section-title">Probabilidade de Resultado</h3>
          <div className="fm-pre-match__prob-labels">
            <span className="fm-pre-match__prob-label fm-pre-match__prob-home">{homeTeamName} {analysis.winProbability.home}%</span>
            <span className="fm-pre-match__prob-label fm-pre-match__prob-draw">Empate {analysis.winProbability.draw}%</span>
            <span className="fm-pre-match__prob-label fm-pre-match__prob-away">{awayTeamName} {analysis.winProbability.away}%</span>
          </div>
          <ProbabilityBar
            home={analysis.winProbability.home}
            draw={analysis.winProbability.draw}
            away={analysis.winProbability.away}
          />
          <div className="fm-pre-match__confidence">
            Nível de confiança: <strong>{analysis.confidenceLevel}%</strong>
          </div>
        </section>

        {/* Predicted Score & xG */}
        <section className="fm-pre-match__section fm-pre-match__section--grid">
          <div className="fm-pre-match__stat-card">
            <span className="fm-pre-match__stat-label">Placar Provável</span>
            <span className="fm-pre-match__stat-value fm-pre-match__score">
              {analysis.mostLikelyScore}
            </span>
          </div>
          <div className="fm-pre-match__stat-card">
            <span className="fm-pre-match__stat-label">Gols Esperados (xG)</span>
            <span className="fm-pre-match__stat-value">
              {analysis.expectedGoals.home} - {analysis.expectedGoals.away}
            </span>
          </div>
          <div className="fm-pre-match__stat-card">
            <span className="fm-pre-match__stat-label">Força do Time</span>
            <span className="fm-pre-match__stat-value">
              {analysis.homeStrength} vs {analysis.awayStrength}
            </span>
          </div>
          <div className="fm-pre-match__stat-card">
            <span className="fm-pre-match__stat-label">Vantagem Casa</span>
            <span className="fm-pre-match__stat-value">
              +{((analysis.homeAdvantage - 1) * 100).toFixed(0)}%
            </span>
          </div>
        </section>

        {/* Form Comparison */}
        <section className="fm-pre-match__section">
          <h3 className="fm-pre-match__section-title">Forma Recente</h3>
          <div className="fm-pre-match__form-row">
            <div className="fm-pre-match__form-team">
              <span className="fm-pre-match__form-team-name">{homeTeamName}</span>
              <div className="fm-pre-match__form-badges">
                {form.homeForm.slice(-5).map((r, i) => (
                  <span key={i} className={`fm-pre-match__form-badge ${FORM_BADGE_CLASS[r] ?? ''}`}>
                    {FORM_LABEL[r] ?? r}
                  </span>
                ))}
              </div>
              <span className="fm-pre-match__form-score">{form.homeFormScore} pts</span>
            </div>
            <div className="fm-pre-match__form-team">
              <span className="fm-pre-match__form-team-name">{awayTeamName}</span>
              <div className="fm-pre-match__form-badges">
                {form.awayForm.slice(-5).map((r, i) => (
                  <span key={i} className={`fm-pre-match__form-badge ${FORM_BADGE_CLASS[r] ?? ''}`}>
                    {FORM_LABEL[r] ?? r}
                  </span>
                ))}
              </div>
              <span className="fm-pre-match__form-score">{form.awayFormScore} pts</span>
            </div>
          </div>
        </section>

        {/* Key Matchups */}
        <section className="fm-pre-match__section">
          <h3 className="fm-pre-match__section-title">Duelos Decisivos</h3>
          <div className="fm-pre-match__matchups">
            {matchups.map((m, i) => (
              <MatchupRow key={i} matchup={m} homeTeamName={homeTeamName} awayTeamName={awayTeamName} />
            ))}
          </div>
        </section>

        {/* Tactical Recommendation */}
        <section className="fm-pre-match__section fm-pre-match__tactical">
          <h3 className="fm-pre-match__section-title">Recomendação Tática</h3>
          <div className="fm-pre-match__tac-card">
            <div className="fm-pre-match__tac-header">
              <span className="fm-pre-match__tac-mentality">{tac.mentality}</span>
              <span
                className="fm-pre-match__tac-risk"
                style={{ color: RISK_COLORS[tac.riskLevel] ?? '#6b7280' }}
              >
                Risco: {tac.riskLevel}
              </span>
            </div>
            <p className="fm-pre-match__tac-approach">{tac.approach}</p>
            <p className="fm-pre-match__tac-reason">{tac.reason}</p>
          </div>
        </section>
      </div>
    </div>
  );
};
