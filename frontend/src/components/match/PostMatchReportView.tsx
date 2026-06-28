import React from 'react';
import type { PostMatchReport, HeatMapZone } from '../../types/game';
import './PostMatchReportView.css';

const INTENSITY_LABELS = ['░', '▒', '▓', '█'];
const INTENSITY_COLORS = [
  'rgba(34, 197, 94, 0.15)',
  'rgba(34, 197, 94, 0.35)',
  'rgba(34, 197, 94, 0.60)',
  'rgba(34, 197, 94, 0.90)',
];

function intensityLevel(intensity: number): number {
  if (intensity < 0.25) return 0;
  if (intensity < 0.50) return 1;
  if (intensity < 0.75) return 2;
  return 3;
}

const HeatMapGrid: React.FC<{ zones: HeatMapZone[]; teamName: string; color: string }> = ({
  zones, teamName, color,
}) => {
  const thirds = ['defensive', 'middle', 'attacking'] as const;
  const flanks = ['left', 'center', 'right'] as const;
  const thirdLabels = ['Defesa', 'Meio-Campo', 'Ataque'];

  return (
    <div className="fm-heatmap">
      <h4 className="fm-heatmap__title">Mapa de Calor — {teamName}</h4>
      <div className="fm-heatmap__grid">
        {thirds.map((third, ti) => (
          <div key={third} className="fm-heatmap__row">
            <span className="fm-heatmap__row-label">{thirdLabels[ti]}</span>
            {flanks.map((flank) => {
              const zone = zones.find(z => z.third === third && z.flank === flank);
              const level = zone ? intensityLevel(zone.intensity) : 0;
              const colorOverride = color === 'away'
                ? INTENSITY_COLORS.map(c => c.replace('34, 197, 94', '59, 130, 246'))
                : INTENSITY_COLORS;
              return (
                <div
                  key={flank}
                  className="fm-heatmap__cell"
                  style={{ background: colorOverride[level] }}
                  title={zone ? `${zone.label}: ${zone.actions} ações (${Math.round(zone.intensity * 100)}%)` : ''}
                >
                  <span className="fm-heatmap__cell-icon">{INTENSITY_LABELS[level]}</span>
                  <span className="fm-heatmap__cell-count">{zone?.actions ?? 0}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="fm-heatmap__legend">
        <span>Menos</span>
        {INTENSITY_LABELS.map((l, i) => (
          <span key={i} className="fm-heatmap__legend-icon">{l}</span>
        ))}
        <span>Mais</span>
      </div>
    </div>
  );
};

const INSIGHT_CATEGORY_CLASS: Record<string, string> = {
  positive: 'fm-insight--positive',
  negative: 'fm-insight--negative',
  neutral: 'fm-insight--neutral',
};

const ADVICE_TYPE_ICON: Record<string, string> = {
  tactical: '📋',
  player: '👤',
  formation: '⚙️',
};

export const PostMatchReportView: React.FC<{
  report: PostMatchReport;
  homeTeamName: string;
  awayTeamName: string;
}> = ({ report, homeTeamName, awayTeamName }) => {
  return (
    <div className="fm-post-match-report">
      {/* Resumo */}
      <div className="fm-post-match-report__summary">
        <h3>📋 Relatório Pós-Jogo</h3>
        <p>{report.summary}</p>
      </div>

      {/* Mapas de Calor */}
      <div className="fm-post-match-report__heatmaps">
        <HeatMapGrid zones={report.heatMapHome} teamName={homeTeamName} color="home" />
        <HeatMapGrid zones={report.heatMapAway} teamName={awayTeamName} color="away" />
      </div>

      {/* Zonas de Ataque */}
      <div className="fm-post-match-report__attack-zones">
        <h4>Direção do Ataque</h4>
        <div className="fm-attack-zones__row">
          <div className="fm-attack-zones__team">
            <span className="fm-attack-zones__name">{homeTeamName}</span>
            <div className="fm-attack-zones__bars">
              <div className="fm-attack-zones__bar">
                <span>⬅ Esq</span>
                <div className="fm-attack-zones__bar-fill" style={{ width: `${report.attackZones.home.left}%` }} />
                <span>{report.attackZones.home.left}%</span>
              </div>
              <div className="fm-attack-zones__bar">
                <span>⬆ Centro</span>
                <div className="fm-attack-zones__bar-fill" style={{ width: `${report.attackZones.home.center}%` }} />
                <span>{report.attackZones.home.center}%</span>
              </div>
              <div className="fm-attack-zones__bar">
                <span>➡ Dir</span>
                <div className="fm-attack-zones__bar-fill" style={{ width: `${report.attackZones.home.right}%` }} />
                <span>{report.attackZones.home.right}%</span>
              </div>
            </div>
          </div>
          <div className="fm-attack-zones__team">
            <span className="fm-attack-zones__name">{awayTeamName}</span>
            <div className="fm-attack-zones__bars">
              <div className="fm-attack-zones__bar">
                <span>⬅ Esq</span>
                <div className="fm-attack-zones__bar-fill" style={{ width: `${report.attackZones.away.left}%` }} />
                <span>{report.attackZones.away.left}%</span>
              </div>
              <div className="fm-attack-zones__bar">
                <span>⬆ Centro</span>
                <div className="fm-attack-zones__bar-fill" style={{ width: `${report.attackZones.away.center}%` }} />
                <span>{report.attackZones.away.center}%</span>
              </div>
              <div className="fm-attack-zones__bar">
                <span>➡ Dir</span>
                <div className="fm-attack-zones__bar-fill" style={{ width: `${report.attackZones.away.right}%` }} />
                <span>{report.attackZones.away.right}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Análise de Passes */}
      <div className="fm-post-match-report__passes">
        <h4>Análise de Passes</h4>
        <div className="fm-passes__row">
          <div className="fm-passes__team">
            <span className="fm-passes__name">{homeTeamName}</span>
            <div className="fm-passes__stats">
              <span className="fm-passes__success">✓ {report.passBreakdown.homeSuccessful}</span>
              <span className="fm-passes__fail">✗ {report.passBreakdown.homeFailed}</span>
            </div>
          </div>
          <div className="fm-passes__team">
            <span className="fm-passes__name">{awayTeamName}</span>
            <div className="fm-passes__stats">
              <span className="fm-passes__success">✓ {report.passBreakdown.awaySuccessful}</span>
              <span className="fm-passes__fail">✗ {report.passBreakdown.awayFailed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights Táticos */}
      {report.insights.length > 0 && (
        <div className="fm-post-match-report__insights">
          <h4>🔍 Análise Tática</h4>
          <div className="fm-insights__list">
            {report.insights.map((insight, i) => (
              <div key={i} className={`fm-insight ${INSIGHT_CATEGORY_CLASS[insight.category]}`}>
                <span className="fm-insight__icon">{insight.icon}</span>
                <div className="fm-insight__content">
                  <span className="fm-insight__title">{insight.title}</span>
                  <span className="fm-insight__desc">{insight.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conselhos do Assistente */}
      {report.assistantComments.length > 0 && (
        <div className="fm-post-match-report__assistant">
          <h4>🧑‍💼 Conselhos do Assistente Técnico</h4>
          <div className="fm-assistant__list">
            {report.assistantComments.map((advice, i) => (
              <div key={i} className="fm-assistant__item">
                <span className="fm-assistant__icon">{ADVICE_TYPE_ICON[advice.type]}</span>
                <span className="fm-assistant__message">{advice.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
