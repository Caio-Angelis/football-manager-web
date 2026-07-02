import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import type { LeagueStandings } from '../../types/game';
import { useSortable } from '../../hooks/useSortable';
import { Globe, Users } from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { ZoneIcon } from '../ui/ZoneIcon';

type StandingsSortKey = 'position' | 'teamName' | 'played' | 'wins' | 'draws' | 'losses' | 'goalsFor' | 'goalsAgainst' | 'goalDifference' | 'points';

interface LeagueTableProps {
  standings: LeagueStandings[];
  userTeamId?: string | null;
}

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
  r === 'W' ? 'fms-badge--green' : r === 'D' ? 'fms-badge--amber' : 'fms-badge--red';

const UP = '\u2191';
const DOWN = '\u2193';
const sortInd = (key: StandingsSortKey, sk: StandingsSortKey, dir: 'asc' | 'desc') =>
  key === sk ? (dir === 'asc' ? UP : DOWN) : '';

export const LeagueTable: React.FC<LeagueTableProps> = ({ standings, userTeamId }) => {
  const { sortState, toggleSort } = useSortable<StandingsSortKey>('position', 'asc');
  const navigate = useNavigate();
  const { currentSeason, teams } = useGameStore();
  const userTeam = teams.find(t => t.id === userTeamId);

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
  <div className="fms-page">
    <PageHeader
      title="Classificação"
      subtitle={`${standings.length} times — Temporada ${currentSeason}`}
      teamName={userTeam?.name}
      teamReputation={userTeam?.reputation}
      actions={[
        { icon: <Globe size={15} />, title: 'Visão do Clube', onClick: () => navigate('/clube') },
        { icon: <Users size={15} />, title: 'Elenco', onClick: () => navigate('/elenco') },
      ]}
    />

    <div className="fms-content">
      <div className="fms-table-wrap">
        <table className="fms-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort('position')}># {sortInd('position', sortState.key, sortState.direction)}</th>
              <th onClick={() => toggleSort('teamName')}>Time {sortInd('teamName', sortState.key, sortState.direction)}</th>
              <th onClick={() => toggleSort('played')}>J {sortInd('played', sortState.key, sortState.direction)}</th>
              <th onClick={() => toggleSort('wins')}>V {sortInd('wins', sortState.key, sortState.direction)}</th>
              <th onClick={() => toggleSort('draws')}>E {sortInd('draws', sortState.key, sortState.direction)}</th>
              <th onClick={() => toggleSort('losses')}>D {sortInd('losses', sortState.key, sortState.direction)}</th>
              <th onClick={() => toggleSort('goalsFor')}>GP {sortInd('goalsFor', sortState.key, sortState.direction)}</th>
              <th onClick={() => toggleSort('goalsAgainst')}>GC {sortInd('goalsAgainst', sortState.key, sortState.direction)}</th>
              <th onClick={() => toggleSort('goalDifference')}>SG {sortInd('goalDifference', sortState.key, sortState.direction)}</th>
              <th onClick={() => toggleSort('points')}>P {sortInd('points', sortState.key, sortState.direction)}</th>
              <th className="fms-th--nosort">Forma</th>
              <th className="fms-th--nosort">Zona</th>
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((s) => {
              const zone = s.zone ?? 'safe';
              const isUser = s.teamId === userTeamId;
              return (
                <tr key={s.teamId} className={isUser ? 'fms-row--user' : ''}>
                  <td className="fms-bold">{s.position}</td>
                  <td>
                    <span className="fms-bold">{s.teamName}</span>
                    {isUser && <span className="fms-badge fms-badge--accent" style={{ marginLeft: 8 }}>Seu clube</span>}
                    {s.isRelegated && <span className="fms-badge fms-badge--red" style={{ marginLeft: 8 }}>Rebaixado</span>}
                  </td>
                  <td className="fms-center">{s.played}</td>
                  <td className="fms-center">{s.wins}</td>
                  <td className="fms-center">{s.draws}</td>
                  <td className="fms-center">{s.losses}</td>
                  <td className="fms-center">{s.goalsFor}</td>
                  <td className="fms-center">{s.goalsAgainst}</td>
                  <td className="fms-center">{s.goalDifference > 0 ? '+' : ''}{s.goalDifference}</td>
                  <td className="fms-center fms-bold">{s.points}</td>
                  <td>
                    <div className="fms-flex fms-gap-4">
                      {s.form.map((r, i) => (
                        <span key={i} className={`fms-badge ${formClass(r)}`} style={{ padding: '2px 5px', fontSize: 9 }}>
                          {FORM_LABELS[r] ?? r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`fms-badge ${zone === 'title' ? 'fms-badge--accent' : zone === 'europe' ? 'fms-badge--green' : zone === 'relegation' ? 'fms-badge--red' : ''}`}>
                      <ZoneIcon zone={zone} /> {ZONE_LABELS[zone]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="fms-toolbar">
        <div className="fms-toolbar-spacer" />
        {(Object.keys(ZONE_LABELS) as Array<keyof typeof ZONE_LABELS>).map((zone) => (
          <span key={zone} className={`fms-badge ${zone === 'title' ? 'fms-badge--accent' : zone === 'europe' ? 'fms-badge--green' : zone === 'relegation' ? 'fms-badge--red' : ''}`}>
            <ZoneIcon zone={zone} /> {ZONE_LABELS[zone]}
          </span>
        ))}
      </div>
    </div>
  </div>
  );
};
