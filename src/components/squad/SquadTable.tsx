import React, { useState, useMemo } from 'react';
import type { Player } from '../../types/game';

interface SquadTableProps {
  players: Player[];
  selectedPlayerId: string | null;
  onPlayerSelect: (playerId: string) => void;
}

type SortKey = keyof Player;
type SortDirection = 'asc' | 'desc';

const STATUS_LABELS: Record<string, string> = {
  'Key Player': 'Peça-chave',
  'Regular Starter': 'Titular',
  'Rotation': 'Rotação',
  'Young Talent': 'Promessa',
  'Excess': 'Outro',
};

export const SquadTable: React.FC<SquadTableProps> = ({
  players,
  selectedPlayerId,
  onPlayerSelect,
}) => {
  const [sortKey] = useState<SortKey>('position');
  const [sortDir] = useState<SortDirection>('asc');
  const [search, setSearch] = useState('');
  const [filterPos, setFilterPos] = useState<string>('');

  const filtered = useMemo(() => {
    let list = [...players];
    if (filterPos) list = list.filter(p => p.position === filterPos);
    if (search) list = list.filter(p => {
      const name = `${p.name} ${p.surname}`.toLowerCase();
      return name.includes(search.toLowerCase());
    });
    return list.sort((a, b) => {
      const aVal = typeof a[sortKey] === 'string' ? a[sortKey] : '';
      const bVal = typeof b[sortKey] === 'string' ? b[sortKey] : '';
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [players, filterPos, search, sortKey, sortDir]);

  const getStatColor = (val: number) => {
    if (val >= 80) return 'var(--color-success)';
    if (val >= 60) return '#8BC34A';
    if (val >= 40) return '#FFC107';
    if (val >= 20) return '#FF9800';
    return '#F44336';
  };

  const getOverall = (ca: number) => Math.round(ca / 2);

  const totalPlayers = filtered.length;
  const pageWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const isNarrow = pageWidth < 1024;

  return (
    <div className="fm-squad-table">
      <div className="fm-squad-table__toolbar">
        <div className="fm-squad-table__search">
          <input
            className="fm-squad-table__search-input"
            type="text"
            placeholder="Buscar jogador…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="fm-squad-table__filters">
          <button
            className="fm-squad-table__filter-btn"
            onClick={() => setFilterPos(filterPos === '' ? 'GK' : filterPos === 'GK' ? 'DEF' : filterPos === 'DEF' ? 'MID' : filterPos === 'MID' ? 'FWD' : '')}
          >
            {filterPos || 'Posição'} ▾
          </button>
          <button className="fm-squad-table__filter-btn" onClick={() => onPlayerSelect('')}>
            Ordenar ▾
          </button>
        </div>
        <div className="fm-squad-table__count">{totalPlayers} jogadores</div>
      </div>

      <div className="fm-squad-table__wrapper">
        <table className="fm-squad-table__grid">
          <thead>
            <tr>
              <th className="fm-squad-table__th">Pos</th>
              {!isNarrow && <th className="fm-squad-table__th">Nome</th>}
              {!isNarrow && <th className="fm-squad-table__th">Idade</th>}
              {!isNarrow && <th className="fm-squad-table__th">CA</th>}
              <th className="fm-squad-table__th">Forma</th>
              <th className="fm-squad-table__th">Cond.</th>
              {!isNarrow && <th className="fm-squad-table__th">Moral</th>}
              <th className="fm-squad-table__th">Status</th>
              {!isNarrow && <th className="fm-squad-table__th">Valor</th>}
              {!isNarrow && <th className="fm-squad-table__th">Salário</th>}
              <th className="fm-squad-table__th">Lesão</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((player) => {
              const overall = getOverall(player.currentAbility);
              return (
                <tr
                  key={player.id}
                  className={`fm-squad-table__row${selectedPlayerId === player.id ? ' fm-squad-table__row--selected' : ''}`}
                  onClick={() => onPlayerSelect(player.id)}
                >
                  <td className="fm-squad-table__pos">
                    <span className="fm-squad-table__pos-badge" style={{ backgroundColor: player.position === 'GK' ? '#2196F3' : player.position === 'DEF' ? '#4CAF50' : player.position === 'MID' ? '#FF9800' : '#F44336' }}>
                      {player.position}
                    </span>
                  </td>
                  {!isNarrow && (
                    <td className="fm-squad-table__name">
                      <span className="fm-squad-table__name-text">{player.name} {player.surname}</span>
                      <span className="fm-squad-table__name-overall">{overall}</span>
                    </td>
                  )}
                  {!isNarrow && <td className="fm-squad-table__age">{player.age}</td>}
                  {!isNarrow && (
                    <td className="fm-squad-table__ca">
                      <span>{player.currentAbility}</span>
                      <span className="fm-squad-table__ca-pa">{player.potentialAbility}</span>
                    </td>
                  )}
                  <td className="fm-squad-table__form">
                    <div className="fm-squad-table__bar" style={{ width: `${player.form}%`, backgroundColor: getStatColor(player.form) }} />
                  </td>
                  <td className="fm-squad-table__fitness">
                    <div className="fm-squad-table__bar" style={{ width: `${player.fitness}%`, backgroundColor: getStatColor(player.fitness) }} />
                  </td>
                  {!isNarrow && (
                    <td className="fm-squad-table__morale">
                      <div className="fm-squad-table__bar" style={{ width: `${player.morale}%`, backgroundColor: getStatColor(player.morale) }} />
                    </td>
                  )}
                  <td className="fm-squad-table__status">
                    <span className="fm-squad-table__status-badge">{STATUS_LABELS[player.squadStatus] || player.squadStatus}</span>
                  </td>
                  {!isNarrow && <td className="fm-squad-table__value">{player.marketValue >= 1000 ? `€${(player.marketValue / 1000).toFixed(1)}M` : `€${player.marketValue}K`}</td>}
                  {!isNarrow && <td className="fm-squad-table__salary">€{(player.salary / 1000).toFixed(1)}K</td>}
                  <td className="fm-squad-table__injury">
                    {player.injury?.active ? (
                      <span className="fm-squad-table__injury-badge">🏥 {player.injury.days}</span>
                    ) : (
                      <span className="fm-squad-table__injury-free">✓</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
