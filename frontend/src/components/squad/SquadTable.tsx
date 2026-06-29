import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Player } from '../../types/game';
import { getFullName } from '../../utils/player';
import { useSortable } from '../../hooks/useSortable';

interface SquadTableProps {
  players: Player[];
  selectedPlayerId: string | null;
  onPlayerSelect: (playerId: string) => void;
  teamName: string;
  formation: string;
  tactic: string;
  mentality: string;
  season: number;
  week: number;
  record: { points: number; played: number; won: number; drawn: number; lost: number };
}

type SortKey = 'position' | 'name' | 'age' | 'currentAbility' | 'form' | 'fitness' | 'morale' | 'squadStatus' | 'marketValue' | 'salary' | 'injury';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'position', label: 'Posição' },
  { key: 'name', label: 'Nome' },
  { key: 'age', label: 'Idade' },
  { key: 'currentAbility', label: 'Capacidade' },
  { key: 'form', label: 'Forma' },
  { key: 'fitness', label: 'Condição' },
  { key: 'morale', label: 'Moral' },
  { key: 'squadStatus', label: 'Status' },
  { key: 'marketValue', label: 'Valor' },
  { key: 'salary', label: 'Salário' },
  { key: 'injury', label: 'Lesão' },
];

const POSITION_ORDER: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

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
  teamName,
  formation,
  tactic,
  mentality,
  season,
  week,
  record,
}) => {
  const { sortState, toggleSort } = useSortable<SortKey>('position', 'asc');
  const sortKey = sortState.key;
  const sortDir = sortState.direction;
  const [search, setSearch] = useState('');
  const [filterPos, setFilterPos] = useState<string>('');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  const handleSort = useCallback((key: SortKey) => {
    toggleSort(key);
    setShowSortMenu(false);
  }, [toggleSort]);

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filtered = useMemo(() => {
    let list = [...players];
    if (filterPos) list = list.filter(p => p.position === filterPos);
    if (search) list = list.filter(p => {
      const name = getFullName(p).toLowerCase();
      return name.includes(search.toLowerCase());
    });
    return list.sort((a, b) => {
      let cmp: number;
      if (sortKey === 'name') {
        cmp = getFullName(a).localeCompare(getFullName(b));
      } else if (sortKey === 'position') {
        cmp = (POSITION_ORDER[a.position] ?? 99) - (POSITION_ORDER[b.position] ?? 99);
      } else if (sortKey === 'squadStatus') {
        cmp = (a.squadStatus || '').localeCompare(b.squadStatus || '');
      } else if (sortKey === 'injury') {
        cmp = (a.injury?.active ? a.injury.days : 0) - (b.injury?.active ? b.injury.days : 0);
      } else {
        const aVal = (a as any)[sortKey] as number;
        const bVal = (b as any)[sortKey] as number;
        cmp = aVal - bVal;
      }
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

  return (
    <div className="fm-squad-table">
      <header className="fm-squad-table__header">
        <h1 className="fm-squad-table__title">Elenco · {teamName}</h1>
        <div className="fm-squad-table__meta">
          <span className="fm-squad-table__chip">{formation}</span>
          <span className="fm-squad-table__chip">{tactic}</span>
          <span className="fm-squad-table__chip">{mentality}</span>
          <span className="fm-squad-table__chip">T{season} · S{week}</span>
          <span className="fm-squad-table__chip fm-squad-table__chip--accent">
            {record.points} pts · {record.won}V {record.drawn}E {record.lost}D
          </span>
        </div>
      </header>

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
          <div className="fm-squad-table__sort-wrapper">
            <button className="fm-squad-table__filter-btn"
              onClick={() => setShowSortMenu(prev => !prev)}
            >
              {SORT_OPTIONS.find(o => o.key === sortKey)?.label ?? 'Ordenar'} ({sortDir === 'asc' ? '↑' : '↓'}) ▾
            </button>
            {showSortMenu && (
              <div className="fm-squad-table__sort-menu">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    className={`fm-squad-table__sort-option${sortKey === opt.key ? ' fm-squad-table__sort-option--active' : ''}`}
                    onClick={() => handleSort(opt.key)}
                  >
                    {opt.label} {sortKey === opt.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="fm-squad-table__count">{totalPlayers} jogadores</div>
      </div>

      <div className="fm-squad-table__wrapper">
        <table className="fm-squad-table__grid">
          <thead>
            <tr>
              <th className="fm-squad-table__th fm-squad-table__th--sortable" onClick={() => handleSort('position')}>Pos {sortKey === 'position' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              {!isNarrow && <th className="fm-squad-table__th fm-squad-table__th--sortable" onClick={() => handleSort('name')}>Nome {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>}
              {!isNarrow && <th className="fm-squad-table__th fm-squad-table__th--sortable" onClick={() => handleSort('age')}>Idade {sortKey === 'age' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>}
              {!isNarrow && <th className="fm-squad-table__th fm-squad-table__th--sortable" onClick={() => handleSort('currentAbility')}>CA {sortKey === 'currentAbility' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>}
              <th className="fm-squad-table__th fm-squad-table__th--sortable" onClick={() => handleSort('form')}>Forma {sortKey === 'form' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="fm-squad-table__th fm-squad-table__th--sortable" onClick={() => handleSort('fitness')}>Cond. {sortKey === 'fitness' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              {!isNarrow && <th className="fm-squad-table__th fm-squad-table__th--sortable" onClick={() => handleSort('morale')}>Moral {sortKey === 'morale' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>}
              <th className="fm-squad-table__th fm-squad-table__th--sortable" onClick={() => handleSort('squadStatus')}>Status {sortKey === 'squadStatus' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              {!isNarrow && <th className="fm-squad-table__th fm-squad-table__th--sortable" onClick={() => handleSort('marketValue')}>Valor {sortKey === 'marketValue' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>}
              {!isNarrow && <th className="fm-squad-table__th fm-squad-table__th--sortable" onClick={() => handleSort('salary')}>Salário {sortKey === 'salary' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>}
              <th className="fm-squad-table__th fm-squad-table__th--sortable" onClick={() => handleSort('injury')}>Lesão {sortKey === 'injury' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
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
                      <span className="fm-squad-table__name-text">{getFullName(player)}</span>
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
                  {!isNarrow && <td className="fm-squad-table__value">R$ {player.marketValue.toFixed(1)}M</td>}
                  {!isNarrow && <td className="fm-squad-table__salary">R$ {(player.salary / 1000).toFixed(1)}K</td>}
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
