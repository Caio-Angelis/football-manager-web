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
const UP = '\u2191';
const DOWN = '\u2193';
const sortInd = (key: SortKey, sortKey: SortKey, dir: 'asc' | 'desc') =>
  key === sortKey ? (dir === 'asc' ? UP : DOWN) : '';

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
  teamName: _teamName,
  formation,
  tactic: _tactic,
  mentality,
  season: _season,
  week: _week,
  record: _record,
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
        cmp = (a.injury?.active ? a.injury.daysRemaining : 0) - (b.injury?.active ? b.injury.daysRemaining : 0);
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
    <div className="fms-content">
      <div className="fms-toolbar">
        <div className="fms-select">{formation} · {mentality}</div>
        <div className="fms-toolbar-spacer" />
        <input
          className="fms-input"
          type="text"
          placeholder="Buscar jogador…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 160 }}
        />
        <button
          className="fms-chip"
          onClick={() => setFilterPos(filterPos === '' ? 'GK' : filterPos === 'GK' ? 'DEF' : filterPos === 'DEF' ? 'MID' : filterPos === 'MID' ? 'FWD' : '')}
        >
          {filterPos || 'Posição'} ▾
        </button>
        <div style={{ position: 'relative' }}>
          <button className="fms-chip" onClick={() => setShowSortMenu(prev => !prev)}>
            {SORT_OPTIONS.find(o => o.key === sortKey)?.label ?? 'Ordenar'} ({sortDir === 'asc' ? '↑' : '↓'}) ▾
          </button>
          {showSortMenu && (
            <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10, background: 'var(--t-panel)', border: '1px solid var(--t-border-strong)', borderRadius: 6, padding: 4, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 140 }}>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  className={`fms-chip ${sortKey === opt.key ? 'fms-chip--active' : ''}`}
                  style={{ width: '100%', textAlign: 'left' }}
                  onClick={() => handleSort(opt.key)}
                >
                  {opt.label} {sortInd(opt.key, sortKey, sortDir)}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="fms-text-3" style={{ fontSize: 11 }}>{totalPlayers} jogadores</span>
      </div>

      <div className="fms-table-wrap">
        <table className="fms-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('position')}>Pos {sortInd('position', sortKey, sortDir)}</th>
              {!isNarrow && <th onClick={() => handleSort('name')}>Nome {sortInd('name', sortKey, sortDir)}</th>}
              {!isNarrow && <th onClick={() => handleSort('age')}>Idade {sortInd('age', sortKey, sortDir)}</th>}
              {!isNarrow && <th onClick={() => handleSort('currentAbility')}>CA {sortInd('currentAbility', sortKey, sortDir)}</th>}
              <th onClick={() => handleSort('form')}>Forma {sortInd('form', sortKey, sortDir)}</th>
              <th onClick={() => handleSort('fitness')}>Cond. {sortInd('fitness', sortKey, sortDir)}</th>
              {!isNarrow && <th onClick={() => handleSort('morale')}>Moral {sortInd('morale', sortKey, sortDir)}</th>}
              <th onClick={() => handleSort('squadStatus')}>Status {sortInd('squadStatus', sortKey, sortDir)}</th>
              {!isNarrow && <th onClick={() => handleSort('marketValue')}>Valor {sortInd('marketValue', sortKey, sortDir)}</th>}
              {!isNarrow && <th onClick={() => handleSort('salary')}>Salário {sortInd('salary', sortKey, sortDir)}</th>}
              <th onClick={() => handleSort('injury')}>Lesão {sortInd('injury', sortKey, sortDir)}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((player) => {
              const overall = getOverall(player.currentAbility);
              return (
                <tr
                  key={player.id}
                  className={selectedPlayerId === player.id ? 'fms-row--user' : ''}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onPlayerSelect(player.id)}
                >
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 20, borderRadius: 4, fontSize: 10, fontWeight: 700,
                      backgroundColor: player.position === 'GK' ? 'rgba(33,150,243,0.2)' : player.position === 'DEF' ? 'rgba(76,175,80,0.2)' : player.position === 'MID' ? 'rgba(255,152,0,0.2)' : 'rgba(244,67,54,0.2)',
                      color: player.position === 'GK' ? '#5aa3f0' : player.position === 'DEF' ? '#4caf50' : player.position === 'MID' ? '#ff9800' : '#f44336',
                    }}>
                      {player.position}
                    </span>
                  </td>
                  {!isNarrow && (
                    <td>
                      <span className="fms-bold">{getFullName(player)}</span>
                      <span className="fms-text-3" style={{ marginLeft: 8, fontSize: 10 }}>({overall})</span>
                    </td>
                  )}
                  {!isNarrow && <td className="fms-text-2">{player.age}</td>}
                  {!isNarrow && (
                    <td>
                      <span className="fms-bold">{player.currentAbility}</span>
                      <span className="fms-text-3" style={{ marginLeft: 6, fontSize: 10 }}>/{player.potentialAbility}</span>
                    </td>
                  )}
                  <td>
                    <div className="fms-bar"><div className="fms-bar__fill" style={{ width: `${player.form}%`, backgroundColor: getStatColor(player.form) }} /></div>
                  </td>
                  <td>
                    <div className="fms-bar"><div className="fms-bar__fill" style={{ width: `${player.fitness}%`, backgroundColor: getStatColor(player.fitness) }} /></div>
                  </td>
                  {!isNarrow && (
                    <td>
                      <div className="fms-bar"><div className="fms-bar__fill" style={{ width: `${player.morale}%`, backgroundColor: getStatColor(player.morale) }} /></div>
                    </td>
                  )}
                  <td><span className="fms-badge">{STATUS_LABELS[player.squadStatus] || player.squadStatus}</span></td>
                  {!isNarrow && <td className="fms-text-2">R$ {player.marketValue.toFixed(1)}M</td>}
                  {!isNarrow && <td className="fms-text-2">R$ {(player.salary / 1000).toFixed(1)}K</td>}
                  <td className="fms-center">
                    {player.injury?.active ? (
                      <span className="fms-badge fms-badge--red">🏥 {player.injury.daysRemaining}d</span>
                    ) : (
                      <span className="fms-text-green">✓</span>
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
