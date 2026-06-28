import React from 'react';
import type { SeasonSummary } from '../../types/game';
import { useGameStore } from '../../store/gameStore';

const ZONE_ICONS: Record<string, string> = {
  title: '🏆',
  europe: '🌍',
  safe: '✅',
  relegation: '⬇️',
};

const POSITION_SUFFIX = (pos: number) => {
  if (pos === 1) return '1º';
  if (pos === 2) return '2º';
  if (pos === 3) return '3º';
  return `${pos}º`;
};

export const SeasonSummaryModal: React.FC = () => {
  const { seasonSummary, startNextSeason } = useGameStore();

  if (!seasonSummary) return null;

  const s: SeasonSummary = seasonSummary;
  const isFinalSeason = s.isFinalSeason;

  return (
    <div className="fm-season-modal-overlay">
      <div className="fm-season-modal">
        <div className="fm-season-modal__header">
          <span className="fm-season-modal__season-icon">🏁</span>
          <h2>Fim da Temporada {s.season}</h2>
        </div>

        <div className="fm-season-modal__body">
          <div className="fm-season-modal__team-name">{s.teamName}</div>

          <div className="fm-season-modal__position-section">
            <div className="fm-season-modal__position">
              <span className="fm-season-modal__position-number">{POSITION_SUFFIX(s.position)}</span>
              <span className="fm-season-modal__position-label">Colocação</span>
            </div>
            <div className="fm-season-modal__zone">
              <span className={`fm-season-modal__zone-badge fm-season-modal__zone-badge--${s.zone}`}>
                {ZONE_ICONS[s.zone]} {s.zoneLabel}
              </span>
            </div>
          </div>

          <div className="fm-season-modal__stats-grid">
            <div className="fm-season-modal__stat">
              <span className="fm-season-modal__stat-value">{s.points}</span>
              <span className="fm-season-modal__stat-label">Pontos</span>
            </div>
            <div className="fm-season-modal__stat">
              <span className="fm-season-modal__stat-value">{s.wins}</span>
              <span className="fm-season-modal__stat-label">Vitórias</span>
            </div>
            <div className="fm-season-modal__stat">
              <span className="fm-season-modal__stat-value">{s.draws}</span>
              <span className="fm-season-modal__stat-label">Empates</span>
            </div>
            <div className="fm-season-modal__stat">
              <span className="fm-season-modal__stat-value">{s.losses}</span>
              <span className="fm-season-modal__stat-label">Derrotas</span>
            </div>
            <div className="fm-season-modal__stat">
              <span className="fm-season-modal__stat-value">{s.goalsFor}</span>
              <span className="fm-season-modal__stat-label">Gols Marcados</span>
            </div>
            <div className="fm-season-modal__stat">
              <span className="fm-season-modal__stat-value">{s.goalsAgainst}</span>
              <span className="fm-season-modal__stat-label">Gols Sofridos</span>
            </div>
          </div>

          <div className="fm-season-modal__awards">
            <div className="fm-season-modal__award">
              <span className="fm-season-modal__award-icon">⚽</span>
              <div className="fm-season-modal__award-info">
                <span className="fm-season-modal__award-label">Artilheiro do Time</span>
                {s.topScorer ? (
                  <span className="fm-season-modal__award-name">{s.topScorer.name} — {s.topScorer.goals} gols</span>
                ) : (
                  <span className="fm-season-modal__award-name">Sem gols marcados</span>
                )}
              </div>
            </div>

            <div className="fm-season-modal__award">
              <span className="fm-season-modal__award-icon">🅰️</span>
              <div className="fm-season-modal__award-info">
                <span className="fm-season-modal__award-label">Líder de Assistências</span>
                {s.topAssister ? (
                  <span className="fm-season-modal__award-name">{s.topAssister.name} — {s.topAssister.assists} assistências</span>
                ) : (
                  <span className="fm-season-modal__award-name">Sem assistências</span>
                )}
              </div>
            </div>
          </div>

          {isFinalSeason && (
            <div className="fm-season-modal__final-season">
              <h3>🏁 Fim da Carreira!</h3>
              <p>Você completou as 3 temporadas. Parabéns pelo seu desempenho!</p>
            </div>
          )}
        </div>

        <div className="fm-season-modal__footer">
          {isFinalSeason ? (
            <button
              className="fm-season-modal__btn fm-season-modal__btn--primary"
              onClick={() => {
                useGameStore.getState().deselectTeam();
              }}
            >
              Voltar ao Menu Principal
            </button>
          ) : (
            <button
              className="fm-season-modal__btn fm-season-modal__btn--primary"
              onClick={startNextSeason}
            >
              Iniciar Temporada {s.season + 1} ▶
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
