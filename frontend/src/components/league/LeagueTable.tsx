import React, { useMemo } from 'react';
import type { LeagueStandings } from '../../types/game';
import { useSortable } from '../../hooks/useSortable';

type StandingsSortKey = 'position' | 'teamName' | 'played' | 'wins' | 'draws' | 'losses' | 'goalsFor' | 'goalsAgainst' | 'goalDifference' | 'points';

interface LeagueTableProps {
  standings: LeagueStandings[];
  userTeamId?: string | null;
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

const FORM_LABELS: Record<string, string> = {
  W: 'V',
  D: 'E',
  L: 'D',
};

const formClass = (r: string) =>
  r === 'W' ? 'fm-form-badge--W' : r === 'D' ? 'fm-form-badge--D' : 'fm-form-badge--L';

export const LeagueTable: React.FC<LeagueTableProps> = ({ standings, userTeamId }) => {
  const { sortState, toggleSort } = useSortable<StandingsSortKey>('position', 'asc');

  const sortedStandings = useMemo(() => {
    const list = [...standings];
    list.sort((a, b) => {
      let cmp: number;
      switch (sortState.key) {
        case 'teamName': cmp = a.teamName.localeCompare(b.teamName); break;
        default: cmp = (a as any)[sortState.key] - (b as any)[sortState.key];
      }
      return sortState.direction === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [standings, sortState]);

  return (
  <div className="fm-league-view">
    <header className="fm-league-view__header">
      <h1>Classificação</h1>
      <span className="fm-league-view__count">{standings.length} times</span>
    </header>

    <div className="fm-league-table">
      <div className="fm-league-table__scroll">
        <table className="fm-league-table__grid">
          <thead>
            <tr>
              <th className="fm-league-table__th fm-league-table__th--pos fm-league-table__th--sortable" onClick={() => toggleSort('position')}># {sortState.key === 'position' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-league-table__th fm-league-table__th--team fm-league-table__th--sortable" onClick={() => toggleSort('teamName')}>Time {sortState.key === 'teamName' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-league-table__th fm-league-table__th--num fm-league-table__th--sortable" onClick={() => toggleSort('played')}>J {sortState.key === 'played' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-league-table__th fm-league-table__th--num fm-league-table__th--sortable" onClick={() => toggleSort('wins')}>V {sortState.key === 'wins' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-league-table__th fm-league-table__th--num fm-league-table__th--sortable" onClick={() => toggleSort('draws')}>E {sortState.key === 'draws' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-league-table__th fm-league-table__th--num fm-league-table__col--hide-sm fm-league-table__th--sortable" onClick={() => toggleSort('losses')}>D {sortState.key === 'losses' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-league-table__th fm-league-table__th--num fm-league-table__col--hide-sm fm-league-table__th--sortable" onClick={() => toggleSort('goalsFor')}>GP {sortState.key === 'goalsFor' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-league-table__th fm-league-table__th--num fm-league-table__col--hide-sm fm-league-table__th--sortable" onClick={() => toggleSort('goalsAgainst')}>GC {sortState.key === 'goalsAgainst' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-league-table__th fm-league-table__th--num fm-league-table__th--sortable" onClick={() => toggleSort('goalDifference')}>SG {sortState.key === 'goalDifference' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-league-table__th fm-league-table__th--pts fm-league-table__th--sortable" onClick={() => toggleSort('points')}>P {sortState.key === 'points' ? (sortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-league-table__th fm-league-table__th--form">Forma</th>
              <th className="fm-league-table__th fm-league-table__th--zone fm-league-table__col--hide-xs">Zona</th>
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((s) => {
              const zone = s.zone ?? 'safe';
              const isUser = s.teamId === userTeamId;
              const rowClass = [
                'fm-league-table__row',
                `fm-league-table__row--${zone}`,
                s.isRelegated ? 'fm-league-table__row--relegated' : '',
                isUser ? 'fm-league-table__row--user' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <tr key={s.teamId} className={rowClass}>
                  <td className="fm-league-table__pos">{s.position}</td>
                  <td className="fm-league-table__team-cell">
                    <div className="fm-league-table__team">
                      <span className="fm-league-table__team-name">{s.teamName}</span>
                      {isUser && <span className="fm-league-table__user-tag">Seu clube</span>}
                      {s.isRelegated && <span className="fm-relegation-badge">Rebaixado</span>}
                    </div>
                  </td>
                  <td className="fm-league-table__num">{s.played}</td>
                  <td className="fm-league-table__num">{s.wins}</td>
                  <td className="fm-league-table__num">{s.draws}</td>
                  <td className="fm-league-table__num fm-league-table__col--hide-sm">{s.losses}</td>
                  <td className="fm-league-table__num fm-league-table__col--hide-sm">{s.goalsFor}</td>
                  <td className="fm-league-table__num fm-league-table__col--hide-sm">{s.goalsAgainst}</td>
                  <td className="fm-league-table__num">
                    {s.goalDifference > 0 ? '+' : ''}
                    {s.goalDifference}
                  </td>
                  <td className="fm-league-table__points">{s.points}</td>
                  <td className="fm-league-table__form">
                    {s.form.map((r, i) => (
                      <span key={i} className={`fm-form-badge ${formClass(r)}`}>
                        {FORM_LABELS[r] ?? r}
                      </span>
                    ))}
                  </td>
                  <td className="fm-league-table__zone fm-league-table__col--hide-xs">
                    <span className={`fm-league-table__zone-badge fm-league-table__zone-badge--${zone}`}>
                      {ZONE_ICONS[zone]} {ZONE_LABELS[zone]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="fm-league-table__legend" aria-label="Legenda de zonas">
        {(Object.keys(ZONE_LABELS) as Array<keyof typeof ZONE_LABELS>).map((zone) => (
          <span key={zone} className={`fm-league-table__legend-item fm-league-table__legend-item--${zone}`}>
            {ZONE_ICONS[zone]} {ZONE_LABELS[zone]}
          </span>
        ))}
      </footer>
    </div>
  </div>
  );
};
