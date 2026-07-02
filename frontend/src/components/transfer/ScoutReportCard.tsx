import React from 'react';
import type { ScoutReport } from '../../types/game';
import { getGradeColor } from '../../utils/statusColors';

interface ScoutReportCardProps {
  report: ScoutReport;
  onBuy?: () => void;
}

export const ScoutReportCard: React.FC<ScoutReportCardProps> = ({ report, onBuy }) => {
  const stars = '★'.repeat(report.stars) + '☆'.repeat(5 - report.stars);
  const reliability = '●'.repeat(report.reliability) + '○'.repeat(5 - report.reliability);

  const gradeColor = getGradeColor(report.grade);

  return (
    <div className="fm-scout-report">
      <div className="fm-scout-report__header">
        <h3>{report.playerName}</h3>
        <span className="fm-scout-report__position">{report.position}</span>
        {report.grade && (
          <span className="fm-scout-report__grade" style={{ backgroundColor: gradeColor, color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
            {report.grade}
          </span>
        )}
      </div>

      <div className="fm-scout-report__meta">
        <span>{report.age} anos</span>
        <span>{report.nationality}</span>
      </div>

      <div className="fm-scout-report__ability">
        <div>
          <span className="fm-scout-report__label">CA estimado</span>
          <span className="fm-scout-report__value">{report.currentAbility}</span>
        </div>
        <div>
          <span className="fm-scout-report__label">PA estimado</span>
          <span className="fm-scout-report__value">{report.potentialAbility}</span>
        </div>
        <div>
          <span className="fm-scout-report__label">Potencial</span>
          <span className="fm-scout-report__stars">{stars}</span>
        </div>
      </div>

      <div className="fm-scout-report__fog">
        <h4>Atributos (nevoeiro)</h4>
        {Object.entries(report.attributesRange).map(([key, range]) => (
          <div key={key} className="fm-scout-report__attr">
            <span className="fm-scout-report__attr-name">{key}</span>
            <span className="fm-scout-report__attr-range">{range[0]} – {range[1]}</span>
            <div className="fm-scout-report__attr-bar">
              <div
                className="fm-scout-report__attr-fill"
                style={{ left: `${(range[0] / 20) * 100}%`, width: `${((range[1] - range[0]) / 20) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="fm-scout-report__footer">
        <span className="fm-scout-report__reliability">Confiabilidade: {reliability}</span>
        {onBuy && (
          <button className="fm-button fm-button--primary" onClick={onBuy}>
            Iniciar Negociação
          </button>
        )}
      </div>
    </div>
  );
};
