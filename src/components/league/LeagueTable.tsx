import React from 'react';
import type { LeagueStandings } from '../../types/game';

interface LeagueTableProps {
  standings: LeagueStandings[];
}

const ZONE_ICONS: Record<string, string> = {
  title: '🏆',
  europe: '🌍',
  safe: '✅',
  relegation: '⬇️',
};

const ZONE_LABELS: Record<string, string> = {
  title: 'Libertadores',
  europe: 'Sul-Americana',
  safe: 'Segurança',
  relegation: 'Rebaixamento',
};

export const LeagueTable: React.FC<LeagueTableProps> = ({ standings }) => (
  <div className="fm-league-table">
    <h2>Classificação</h2>
    <table className="fm-league-table__grid">
      <thead>
        <tr>
          <th>#</th>
          <th>Time</th>
          <th>J</th>
          <th>V</th>
          <th>E</th>
          <th>D</th>
          <th>GP</th>
          <th>GC</th>
          <th>SG</th>
          <th>P</th>
          <th>Forma</th>
          <th>Zona</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((s) => {
          const zone = s.zone ?? 'safe';
          const isRelegated = s.isRelegated;
          return (
            <tr key={s.teamId} className={`fm-league-table__row--${zone}${isRelegated ? ' fm-league-table__row--relegated' : ''}`}>
              <td>{s.position}</td>
              <td>
                <div className="fm-league-table__team">
                  {s.teamName}
                  {isRelegated && <span className="fm-relegation-badge"> Rebaixado</span>}
                </div>
              </td>
              <td>{s.played}</td>
              <td>{s.wins}</td>
              <td>{s.draws}</td>
              <td>{s.losses}</td>
              <td>{s.goalsFor}</td>
              <td>{s.goalsAgainst}</td>
              <td>{s.goalDifference > 0 ? '+' : ''}{s.goalDifference}</td>
              <td className="fm-league-table__points">{s.points}</td>
              <td className="fm-league-table__form">
                {s.form.map((r, i) => (
                  <span key={i} className={`fm-form--${r === 'W' ? 'win' : r === 'D' ? 'draw' : 'loss'}`}>
                    {r}
                  </span>
                ))}
              </td>
              <td className="fm-league-table__zone">
                {ZONE_ICONS[zone]} {ZONE_LABELS[zone]}
                {isRelegated && <span className="fm-relegation-status"> ⚠️</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
