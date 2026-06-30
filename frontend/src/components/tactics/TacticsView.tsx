import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import type { Player, Team, SetPiecesConfig } from '../../types/game';
import {
  ChevronUp, ChevronDown, Plus, Download, Pencil, ListFilter,
  ThumbsUp, Star, Globe, Trophy, ArrowRight, Info,
} from 'lucide-react';
import './tactics-fm.css';

// ============================================================
// Formations — vertical pitch (y: 0 = ataque/topo, 1 = gol/fundo)
// line: 'gk' | 'def' | 'mid' | 'fwd'
// ============================================================
type Line = 'gk' | 'def' | 'mid' | 'fwd';
interface Slot { x: number; y: number; line: Line; code: string; }

const FORMATIONS: Record<string, Slot[]> = {
  '4-4-2': [
    { x: 0.5, y: 0.92, line: 'gk', code: 'GK' },
    { x: 0.16, y: 0.72, line: 'def', code: 'WB' }, { x: 0.38, y: 0.75, line: 'def', code: 'CD' },
    { x: 0.62, y: 0.75, line: 'def', code: 'CD' }, { x: 0.84, y: 0.72, line: 'def', code: 'WB' },
    { x: 0.16, y: 0.46, line: 'mid', code: 'WM' }, { x: 0.4, y: 0.48, line: 'mid', code: 'CM' },
    { x: 0.6, y: 0.48, line: 'mid', code: 'CM' }, { x: 0.84, y: 0.46, line: 'mid', code: 'WM' },
    { x: 0.38, y: 0.16, line: 'fwd', code: 'AF' }, { x: 0.62, y: 0.16, line: 'fwd', code: 'AF' },
  ],
  '4-3-3': [
    { x: 0.5, y: 0.92, line: 'gk', code: 'SK' },
    { x: 0.16, y: 0.72, line: 'def', code: 'WB' }, { x: 0.38, y: 0.75, line: 'def', code: 'BPD' },
    { x: 0.62, y: 0.75, line: 'def', code: 'BPD' }, { x: 0.84, y: 0.72, line: 'def', code: 'WB' },
    { x: 0.5, y: 0.58, line: 'mid', code: 'DLP' }, { x: 0.32, y: 0.44, line: 'mid', code: 'BtB' },
    { x: 0.68, y: 0.44, line: 'mid', code: 'Car' },
    { x: 0.2, y: 0.18, line: 'fwd', code: 'IF' }, { x: 0.8, y: 0.18, line: 'fwd', code: 'IF' },
    { x: 0.5, y: 0.13, line: 'fwd', code: 'PF' },
  ],
  '3-5-2': [
    { x: 0.5, y: 0.92, line: 'gk', code: 'GK' },
    { x: 0.3, y: 0.74, line: 'def', code: 'CD' }, { x: 0.5, y: 0.76, line: 'def', code: 'CD' },
    { x: 0.7, y: 0.74, line: 'def', code: 'CD' },
    { x: 0.1, y: 0.5, line: 'mid', code: 'WB' }, { x: 0.35, y: 0.5, line: 'mid', code: 'CM' },
    { x: 0.5, y: 0.55, line: 'mid', code: 'DLP' }, { x: 0.65, y: 0.5, line: 'mid', code: 'CM' },
    { x: 0.9, y: 0.5, line: 'mid', code: 'WB' },
    { x: 0.38, y: 0.16, line: 'fwd', code: 'AF' }, { x: 0.62, y: 0.16, line: 'fwd', code: 'AF' },
  ],
  '5-2-2': [
    { x: 0.5, y: 0.92, line: 'gk', code: 'GK' },
    { x: 0.1, y: 0.72, line: 'def', code: 'WB' }, { x: 0.3, y: 0.75, line: 'def', code: 'CD' },
    { x: 0.5, y: 0.76, line: 'def', code: 'CD' }, { x: 0.7, y: 0.75, line: 'def', code: 'CD' },
    { x: 0.9, y: 0.72, line: 'def', code: 'WB' },
    { x: 0.38, y: 0.5, line: 'mid', code: 'CM' }, { x: 0.62, y: 0.5, line: 'mid', code: 'CM' },
    { x: 0.3, y: 0.28, line: 'fwd', code: 'IF' }, { x: 0.7, y: 0.28, line: 'fwd', code: 'IF' },
    { x: 0.5, y: 0.14, line: 'fwd', code: 'PF' },
  ],
};

const FORMATION_KEYS = Object.keys(FORMATIONS);

const ROLE_ABBR: Record<string, string> = {
  goalkeeper: 'GK', sweeperKeeper: 'SK', fullBack: 'FB', wingBack: 'WB',
  centreBack: 'CD', ballPlayingDefender: 'BPD', invertedWingBack: 'IWB',
  defensiveMidfielder: 'DM', centralMidfielder: 'CM', boxToBoxMidfielder: 'BtB',
  deepLyingPlaymaker: 'DLP', advancedPlaymaker: 'AP', carrilero: 'Car',
  winger: 'W', wideMidfielder: 'WM', attackingMidfielder: 'AM',
  insideForward: 'IF', pressingForward: 'PF', advancedForward: 'AF',
  targetMan: 'TM', poacher: 'PO', completeForward: 'CF',
};

const DUTY_ABBR: Record<string, string> = {
  attack: 'At', defend: 'De', support: 'Su', balance: 'Au',
};

const MENTALITIES = [
  'very defensive', 'defensive', 'cautious', 'balanced', 'positive', 'offensive', 'very offensive',
];
const PASSING_STYLES = ['short', 'mixed', 'direct'];
const TEMPOS = ['slow', 'balanced', 'fast'];

const CORNER_DELIVERIES: { value: string; label: string }[] = [
  { value: 'near_post', label: '1º Poste' },
  { value: 'far_post', label: '2º Poste' },
  { value: 'penalty_area', label: 'Área' },
  { value: 'short', label: 'Curto' },
  { value: 'edge_of_box', label: 'Borda' },
];
const FREE_KICK_DELIVERIES: { value: string; label: string }[] = [
  { value: 'shot_on_goal', label: 'Tiro Direto' },
  { value: 'cross_into_box', label: 'Cruzamento' },
  { value: 'short', label: 'Curto' },
  { value: 'long_ball', label: 'Bola Longa' },
];
const THROW_IN_STYLES: { value: string; label: string }[] = [
  { value: 'short', label: 'Curto' },
  { value: 'long', label: 'Longo' },
  { value: 'quick', label: 'Rápido' },
];
const MARKING_STYLES: { value: string; label: string }[] = [
  { value: 'man_to_man', label: 'Individual' },
  { value: 'zonal', label: 'Zonal' },
  { value: 'mixed', label: 'Misto' },
];
const WALL_SIZES: { value: string; label: string }[] = [
  { value: 'small', label: 'Pequena' },
  { value: 'medium', label: 'Média' },
  { value: 'large', label: 'Grande' },
];
const DEFAULT_SET_PIECES: SetPiecesConfig = {
  corners: { delivery: 'penalty_area', takerId: '', targetId: '' },
  freeKicks: { delivery: 'cross_into_box', takerId: '' },
  throwIns: { style: 'short', takerId: '' },
  penalties: { takerId: '' },
  defensiveCorners: { marking: 'zonal', counterAttack: false },
  defensiveFreeKicks: { marking: 'zonal', wallSize: 'medium' },
};

const SUBTABS = ['Overview', 'Player', 'Opposition', 'Set pieces', 'Roles', 'Numbers'];

// ============================================================
// Small SVG helpers
// ============================================================
const ShirtIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M9 2 4 5 2 9l3 2 1-2v11h12V9l1 2 3-2-2-4-5-3a3 3 0 0 1-6 0Z" />
  </svg>
);

const PitchLines: React.FC = () => (
  <svg className="fmt-pitch__lines" viewBox="0 0 100 140" preserveAspectRatio="none">
    <g fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6">
      <rect x="3" y="3" width="94" height="134" />
      <line x1="3" y1="70" x2="97" y2="70" />
      <circle cx="50" cy="70" r="13" />
      <circle cx="50" cy="70" r="0.8" fill="rgba(255,255,255,0.18)" stroke="none" />
      {/* top box (ataque) */}
      <rect x="28" y="3" width="44" height="18" />
      <rect x="40" y="3" width="20" height="7" />
      {/* bottom box (defesa) */}
      <rect x="28" y="119" width="44" height="18" />
      <rect x="40" y="130" width="20" height="7" />
    </g>
  </svg>
);

// ============================================================
// Ability stars (currentAbility 1-200 -> 0-5)
// ============================================================
const AbilityStars: React.FC<{ ca: number }> = ({ ca }) => {
  const filled = Math.max(0, Math.min(5, Math.round((ca / 200) * 5)));
  return (
    <span className="fmt-stars">
      {[0, 1, 2, 3, 4].map(i => (
        <Star key={i} size={11} className={i < filled ? 'fmt-star--on' : ''} fill={i < filled ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
};

const moraleColor = (m: number) => (m >= 66 ? 'var(--t-green)' : m >= 40 ? 'var(--t-amber)' : 'var(--t-red)');
const conditionColor = (f: number) => (f >= 85 ? 'var(--t-green)' : f >= 65 ? 'var(--t-amber)' : 'var(--t-red)');

// ============================================================
// Main component
// ============================================================
export const TacticsView: React.FC = () => {
  const { teams, selectedTeam, currentWeek, currentSeason, matches, updateTeam, advanceWeek, isAdvancing, saveGame } = useGameStore();
  const navigate = useNavigate();
  const team = teams.find(t => t.id === selectedTeam) as Team | undefined;

  const [activeTab, setActiveTab] = useState('Overview');
  const [editOpen, setEditOpen] = useState(false);
  const [dragSlot, setDragSlot] = useState<number | null>(null);
  const [dragBenchIndex, setDragBenchIndex] = useState<number | null>(null);
  const [dragTableBenchId, setDragTableBenchId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [dragOverBench, setDragOverBench] = useState<number | null>(null);
  const [showAllSquad, setShowAllSquad] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  if (!team) {
    return (
      <div className="fm-tactics-fm">
        <div style={{ margin: 'auto', color: 'var(--t-text-2)' }}>Selecione um time para ver as táticas.</div>
      </div>
    );
  }

  const formation = FORMATIONS[team.formation] ? team.formation : '4-3-3';
  const slots = FORMATIONS[formation];

  // Map slot -> player
  const playerById = useMemo(() => {
    const m = new Map<string, Player>();
    team.squad.forEach(p => m.set(p.id, p));
    return m;
  }, [team.squad]);

  const roleBySlot = useMemo(() => {
    const m = new Map<number, { role: string; duty: string; playerId: string }>();
    (team.tacticsConfig?.playerRoles ?? []).forEach(r => m.set(r.slotIndex, r));
    return m;
  }, [team.tacticsConfig]);

  // starting XI ordered, fallback fill
  const starters: (Player | null)[] = useMemo(() => {
    const out: (Player | null)[] = slots.map((_, i) => {
      const r = roleBySlot.get(i);
      if (r?.playerId && playerById.has(r.playerId)) return playerById.get(r.playerId)!;
      return null;
    });
    // fill remaining from startingXI / squad order
    const used = new Set(out.filter(Boolean).map(p => p!.id));
    const pool = [
      ...(team.startingXI ?? []).map(id => playerById.get(id)).filter(Boolean) as Player[],
      ...team.squad,
    ];
    let pi = 0;
    for (let i = 0; i < out.length; i++) {
      if (out[i]) continue;
      while (pi < pool.length && used.has(pool[pi].id)) pi++;
      if (pi < pool.length) { out[i] = pool[pi]; used.add(pool[pi].id); pi++; }
    }
    return out;
  }, [slots, roleBySlot, playerById, team.startingXI, team.squad]);

  const benchPlayers = useMemo(() => {
    const startIds = new Set(starters.filter(Boolean).map(p => p!.id));
    return team.squad.filter(p => !startIds.has(p.id)).slice(0, 12);
  }, [starters, team.squad]);

  const tableBench = showAllSquad ? team.squad.filter(p => !starters.some(s => s?.id === p.id)) : benchPlayers;

  // next fixture
  const nextFixture = useMemo(() => {
    const m = matches.find((mt: any) => !mt.completed && (mt.homeTeam === team.id || mt.awayTeam === team.id));
    if (!m) return null;
    const isHome = m.homeTeam === team.id;
    const oppId = isHome ? m.awayTeam : m.homeTeam;
    const opp = teams.find(t => t.id === oppId);
    return { name: opp?.name ?? 'Adversário', isHome };
  }, [matches, teams, team.id]);

  const roleInfo = (i: number) => {
    const r = roleBySlot.get(i);
    const code = r?.role ? (ROLE_ABBR[r.role] ?? slots[i].code) : slots[i].code;
    const duty = r?.duty ? (DUTY_ABBR[r.duty] ?? 'Au') : (slots[i].line === 'fwd' ? 'At' : slots[i].line === 'mid' ? 'Su' : 'De');
    return { code, duty };
  };

  // --- actions ---
  const setFormation = (f: string) => {
    updateTeam(team.id, t => ({ ...t, formation: f }));
  };
  const setMentality = (m: string) => updateTeam(team.id, t => ({ ...t, teamMentality: m }));
  const setPassing = (p: string) => updateTeam(team.id, t => ({ ...t, passingStyle: p }));
  const setTempo = (tp: string) => updateTeam(team.id, t => ({ ...t, tempo: tp }));

  const updateSetPieces = (updater: (sp: SetPiecesConfig) => SetPiecesConfig) => {
    updateTeam(team.id, t => ({
      ...t,
      tacticsConfig: {
        ...t.tacticsConfig,
        setPieces: updater(t.tacticsConfig?.setPieces ?? DEFAULT_SET_PIECES),
      },
    }));
  };

  const cycleFormation = (dir: number) => {
    const idx = FORMATION_KEYS.indexOf(formation);
    const next = FORMATION_KEYS[(idx + dir + FORMATION_KEYS.length) % FORMATION_KEYS.length];
    setFormation(next);
  };

  const autoFillBestXI = () => {
    const lineToPos: Record<string, string> = { gk: 'GK', def: 'DEF', mid: 'MID', fwd: 'FWD' };
    const used = new Set<string>();
    const roles = slots.map((slot, i) => {
      const pos = lineToPos[slot.line];
      const candidates = team.squad
        .filter(p => !used.has(p.id) && (p.position === pos || (p.secondaryPositions ?? []).includes(pos)))
        .sort((a, b) => b.currentAbility - a.currentAbility);
      const best = candidates[0];
      if (best) {
        used.add(best.id);
        return { playerId: best.id, slotIndex: i, role: '', duty: '' };
      }
      const fallback = team.squad.filter(p => !used.has(p.id)).sort((a, b) => b.currentAbility - a.currentAbility)[0];
      if (fallback) {
        used.add(fallback.id);
        return { playerId: fallback.id, slotIndex: i, role: '', duty: '' };
      }
      return { playerId: '', slotIndex: i, role: '', duty: '' };
    });
    const xi = roles.map(r => r.playerId).filter(Boolean);
    updateTeam(team.id, t => ({
      ...t,
      startingXI: xi,
      tacticsConfig: { ...t.tacticsConfig, playerRoles: roles },
    }));
  };

  const handleSave = () => {
    setSaveStatus('Salvando...');
    saveGame(1).then(() => {
      setSaveStatus('Salvo!');
      setTimeout(() => setSaveStatus(null), 2000);
    }).catch(() => {
      setSaveStatus('Erro ao salvar');
      setTimeout(() => setSaveStatus(null), 2000);
    });
  };

  const swapSlots = (a: number, b: number) => {
    if (a === b) return;
    const pa = starters[a];
    const pb = starters[b];
    updateTeam(team.id, t => {
      const roles = [...(t.tacticsConfig?.playerRoles ?? [])];
      const upsert = (slotIndex: number, playerId: string | null) => {
        const idx = roles.findIndex(r => r.slotIndex === slotIndex);
        const slot = FORMATIONS[formation][slotIndex];
        if (!playerId) {
          if (idx >= 0) roles.splice(idx, 1);
          return;
        }
        const base = idx >= 0 ? roles[idx] : { slotIndex, role: '', duty: '' } as any;
        const merged = { ...base, slotIndex, playerId, line: slot.line };
        if (idx >= 0) roles[idx] = merged; else roles.push(merged);
      };
      upsert(a, pb ? pb.id : null);
      upsert(b, pa ? pa.id : null);
      // keep startingXI in sync
      const xi = FORMATIONS[formation].map((_, i) => {
        const rr = roles.find(r => r.slotIndex === i);
        return rr?.playerId ?? '';
      }).filter(Boolean);
      return { ...t, startingXI: xi, tacticsConfig: { ...t.tacticsConfig, playerRoles: roles } };
    });
  };

  const swapBenchToSlot = (benchPlayerId: string, slotIndex: number) => {
    updateTeam(team.id, t => {
      const roles = [...(t.tacticsConfig?.playerRoles ?? [])];
      const idx = roles.findIndex(r => r.slotIndex === slotIndex);
      const slot = FORMATIONS[formation][slotIndex];
      const base = idx >= 0 ? roles[idx] : { slotIndex, role: '', duty: '' } as any;
      const merged = { ...base, slotIndex, playerId: benchPlayerId, line: slot.line };
      if (idx >= 0) roles[idx] = merged; else roles.push(merged);
      const xi = FORMATIONS[formation].map((_, i) => {
        const rr = roles.find(r => r.slotIndex === i);
        return rr?.playerId ?? '';
      }).filter(Boolean);
      return { ...t, startingXI: xi, tacticsConfig: { ...t.tacticsConfig, playerRoles: roles } };
    });
  };

  return (
    <div className="fm-tactics-fm">
      {/* ============ TOP BAR ============ */}
      <header className="fmt-topbar">
        <div className="fmt-topbar__left">
          <div className="fmt-club-logo">{team.name.charAt(0)}</div>
          <div className="fmt-title-block">
            <span className="fmt-title">Táticas</span>
            <span className="fmt-subtitle">
              {nextFixture
                ? `Próximo jogo: ${nextFixture.name} (${nextFixture.isHome ? 'C' : 'F'}) — Liga`
                : `${team.name} — ${team.league}`}
            </span>
          </div>
          <div className="fmt-navarrows">
            <button title="Formação anterior" onClick={() => cycleFormation(-1)}><ChevronUp size={12} /></button>
            <button title="Próxima formação" onClick={() => cycleFormation(1)}><ChevronDown size={12} /></button>
          </div>
        </div>
        <div className="fmt-topbar__right">
          <button className="fmt-icon-btn" title="Visão do Clube" onClick={() => navigate('/clube')}><Globe size={15} /></button>
          <button className="fmt-icon-btn" title="Classificação" onClick={() => navigate('/classificacao')}><Trophy size={15} /></button>
          <div className="fmt-date">
            <div className="fmt-date__main">Temporada {currentSeason}</div>
            <div className="fmt-date__sub">Semana {currentWeek}</div>
          </div>
          <button className="fmt-continue" onClick={advanceWeek} disabled={isAdvancing}>
            {isAdvancing ? 'Processando...' : 'Continuar'}
            <ArrowRight size={15} />
          </button>
        </div>
      </header>

      {/* ============ SUB TABS ============ */}
      <nav className="fmt-subtabs">
        {SUBTABS.map(tab => (
          <button
            key={tab}
            className={`fmt-subtab ${activeTab === tab ? 'fmt-subtab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* ============ BODY ============ */}
      <div className="fmt-body">
        {/* ---- LEFT: PITCH ---- */}
        <section className="fmt-pitch-panel">
          <div className="fmt-pitch-toolbar">
            <button className="fmt-edit-tactic" onClick={() => setEditOpen(o => !o)}>
              <Pencil size={13} /> Editar tática
            </button>
            <button className="fmt-tool-icon" title="Auto-preencher escalão" onClick={autoFillBestXI}><Plus size={15} /></button>
            <button className="fmt-tool-icon" title="Salvar" onClick={handleSave}><Download size={15} /></button>
            {saveStatus && <span style={{ fontSize: 10, color: 'var(--t-text-3)', marginLeft: 4 }}>{saveStatus}</span>}
          </div>

          {editOpen && (
            <div className="fmt-edit-panel" style={{ marginBottom: 14 }}>
              <EditTacticPanel
                formation={formation}
                mentality={team.teamMentality}
                passing={team.passingStyle}
                tempo={team.tempo}
                onFormation={setFormation}
                onMentality={setMentality}
                onPassing={setPassing}
                onTempo={setTempo}
              />
            </div>
          )}

          <div className="fmt-pitch">
            <PitchLines />
            {slots.map((slot, i) => {
              const p = starters[i];
              const { code, duty } = roleInfo(i);
              return (
                <div
                  key={i}
                  className={`fmt-marker ${dragSlot === i ? 'fmt-marker--dragging' : ''} ${dragOverSlot === i ? 'fmt-marker--drop-target' : ''}`}
                  style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%` }}
                  draggable
                  onDragStart={() => setDragSlot(i)}
                  onDragOver={e => { e.preventDefault(); setDragOverSlot(i); }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={() => {
                    if (dragBenchIndex !== null && benchPlayers[dragBenchIndex]) {
                      swapBenchToSlot(benchPlayers[dragBenchIndex].id, i);
                    } else if (dragTableBenchId) {
                      swapBenchToSlot(dragTableBenchId, i);
                    } else if (dragSlot !== null) {
                      swapSlots(dragSlot, i);
                    }
                    setDragSlot(null); setDragBenchIndex(null); setDragTableBenchId(null); setDragOverSlot(null);
                  }}
                  onDragEnd={() => { setDragSlot(null); setDragBenchIndex(null); setDragTableBenchId(null); setDragOverSlot(null); }}
                >
                  <span className={`fmt-marker__role fmt-marker__role--${slot.line}`}>{code} - {duty}</span>
                  <ShirtIcon className={`fmt-marker__shirt ${p ? '' : 'fmt-marker__shirt--empty'}`} />
                  <span className={`fmt-marker__name ${p ? '' : 'fmt-marker__name--empty'}`}>
                    {p ? p.surname || p.name : 'Selecionar'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="fmt-pitch-meta">
            <div className="fmt-meta-item">
              <div className="fmt-meta-ring" />
              <span className="fmt-meta-label">Entrosamento</span>
            </div>
            <div className="fmt-meta-item">
              <div className="fmt-meta-ring" />
              <span className="fmt-meta-label">Intensidade</span>
            </div>
            <div className="fmt-meta-item">
              <div className="fmt-meta-ring" />
              <span className="fmt-meta-label">Resposta</span>
            </div>
            <ThumbsUp size={16} className="fmt-meta-thumb" />
          </div>
        </section>

        {/* ---- MIDDLE: BENCH ---- */}
        <aside className="fmt-bench">
          {Array.from({ length: 7 }).map((_, i) => {
            const p = benchPlayers[i];
            return (
              <div
                key={i}
                className={`fmt-bench-item ${dragBenchIndex === i ? 'fmt-bench-item--dragging' : ''} ${dragOverBench === i ? 'fmt-bench-item--drop-target' : ''}`}
                draggable={!!p}
                onDragStart={() => setDragBenchIndex(i)}
                onDragOver={e => { e.preventDefault(); setDragOverBench(i); }}
                onDragLeave={() => setDragOverBench(null)}
                onDrop={() => {
                  if (dragSlot !== null && p) {
                    swapBenchToSlot(p.id, dragSlot);
                  }
                  setDragSlot(null); setDragBenchIndex(null); setDragTableBenchId(null); setDragOverBench(null);
                }}
                onDragEnd={() => { setDragSlot(null); setDragBenchIndex(null); setDragTableBenchId(null); setDragOverBench(null); }}
              >
                <ShirtIcon className={`fmt-bench-item__shirt ${p ? '' : 'fmt-marker__shirt--empty'}`} />
                <span className="fmt-bench-item__label">{p ? (p.surname || p.name) : `Reserva ${String(i + 1).padStart(2, '0')}`}</span>
              </div>
            );
          })}
        </aside>

        {/* ---- RIGHT: TABLE ---- */}
        {(activeTab === 'Overview' || activeTab === 'Player') ? (
        <section className="fmt-table-panel">
          <div className="fmt-table-toolbar">
            <div className="fmt-select"><Info size={13} /> Informações da seleção <ChevronDown size={13} /></div>
            <div className="fmt-toolbar-spacer" />
            <button className="fmt-link-btn" onClick={autoFillBestXI}>Sugestão de seleção</button>
            <div className="fmt-select" style={{ cursor: 'pointer' }} onClick={autoFillBestXI}>Escolha rápida <ChevronDown size={13} /></div>
            <button className="fmt-tool-icon" title={showAllSquad ? 'Mostrar titulares' : 'Mostrar todo o elenco'} onClick={() => setShowAllSquad(s => !s)}><ListFilter size={15} /></button>
          </div>

          <div className="fmt-table-wrap">
            <table className="fmt-table">
              <thead>
                <tr>
                  <th>Instruções</th>
                  <th>Nac</th>
                  <th>Habilidade</th>
                  <th>Jogador</th>
                  <th>Posição</th>
                  <th className="fmt-center">Con</th>
                  <th className="fmt-center">Pre</th>
                  <th className="fmt-center">Mor</th>
                  <th className="fmt-center">Carga</th>
                  <th className="fmt-center">Desempenho</th>
                  <th className="fmt-center">Últ. 5</th>
                  <th className="fmt-center">Méd</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot, i) => {
                  const p = starters[i];
                  const { code, duty } = roleInfo(i);
                  return (
                    <tr key={`s-${i}`}>
                      <td>
                        <div className="fmt-instr-cell">
                          <span className={`fmt-row-bar fmt-row-bar--${slot.line}`} />
                          <span className="fmt-instr-icons"><ListFilter size={12} /></span>
                          <span className="fmt-role-block">
                            <span className="fmt-role-code">{code}</span>
                            <span className="fmt-role-duty">{duty === 'At' ? 'Ataque' : duty === 'De' ? 'Defesa' : duty === 'Su' ? 'Apoio' : 'Auto'}</span>
                          </span>
                        </div>
                      </td>
                      <td><span className="fmt-nat-flag" title={p?.nationality} /></td>
                      <td><AbilityStars ca={p?.currentAbility ?? 0} /></td>
                      <td><span className={`fmt-player-name ${p ? '' : 'fmt-player-name--empty'}`}>{p ? `${p.name} ${p.surname}`.trim() : 'Selecionar jogador'}</span></td>
                      <td>
                        <div className="fmt-pos-cell">
                          {p?.position ?? '-'}
                          <span className="fmt-pos-arrows"><ChevronUp size={9} /><ChevronDown size={9} /></span>
                        </div>
                      </td>
                      <td className="fmt-center">{p ? <span style={{ color: conditionColor(p.fitness) }}>{Math.round(p.fitness)}%</span> : <span className="fmt-dash">-</span>}</td>
                      <td className="fmt-center"><span className="fmt-dash">-</span></td>
                      <td className="fmt-center">{p ? <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: moraleColor(p.morale) }} title={`Moral ${Math.round(p.morale)}`} /> : <span className="fmt-dash">-</span>}</td>
                      <td className="fmt-center">{p ? <div className="fmt-load-bar"><div className="fmt-load-bar__fill" style={{ width: `${Math.round(p.fitness)}%`, background: conditionColor(p.fitness) }} /></div> : <span className="fmt-dash">-</span>}</td>
                      <td className="fmt-center"><div className="fmt-perf-bar" /></td>
                      <td className="fmt-center"><span className="fmt-dash">-</span></td>
                      <td className="fmt-center"><span className="fmt-dash">-</span></td>
                    </tr>
                  );
                })}
                {tableBench.map((p, i) => (
                  <tr
                    key={`b-${i}`}
                    className={`fmt-empty-row fmt-table-bench-row ${dragTableBenchId === p.id ? 'fmt-table-bench-row--dragging' : ''}`}
                    draggable
                    onDragStart={() => setDragTableBenchId(p.id)}
                    onDragEnd={() => { setDragTableBenchId(null); }}
                  >
                    <td>
                      <div className="fmt-instr-cell">
                        <span className="fmt-row-bar fmt-row-bar--empty" />
                        <span className="fmt-instr-icons"><ListFilter size={12} /></span>
                        <span className="fmt-role-block"><span className="fmt-role-duty">Reserva</span></span>
                      </div>
                    </td>
                    <td><span className="fmt-nat-flag" title={p.nationality} /></td>
                    <td><AbilityStars ca={p.currentAbility} /></td>
                    <td><span className="fmt-player-name">{`${p.name} ${p.surname}`.trim()}</span></td>
                    <td><div className="fmt-pos-cell">{p.position}</div></td>
                    <td className="fmt-center"><span style={{ color: conditionColor(p.fitness) }}>{Math.round(p.fitness)}%</span></td>
                    <td className="fmt-center"><span className="fmt-dash">-</span></td>
                    <td className="fmt-center"><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: moraleColor(p.morale) }} title={`Moral ${Math.round(p.morale)}`} /></td>
                    <td className="fmt-center"><span className="fmt-dash">-</span></td>
                    <td className="fmt-center"><div className="fmt-perf-bar" /></td>
                    <td className="fmt-center"><span className="fmt-dash">-</span></td>
                    <td className="fmt-center"><span className="fmt-dash">-</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        ) : activeTab === 'Opposition' ? (
          <section className="fmt-table-panel">
            <div className="fmt-table-toolbar">
              <div className="fmt-select"><Info size={13} /> Análise do adversário</div>
            </div>
            <div style={{ padding: 20, color: 'var(--t-text)' }}>
              {nextFixture ? (
                <>
                  <h3 style={{ margin: '0 0 8px' }}>{nextFixture.name}</h3>
                  <p style={{ color: 'var(--t-text-2)', margin: '0 0 12px' }}>
                    {nextFixture.isHome ? 'Em casa' : 'Fora de casa'} — Liga
                  </p>
                </>
              ) : (
                <p style={{ color: 'var(--t-text-2)' }}>Sem jogo agendado.</p>
              )}
            </div>
          </section>
        ) : activeTab === 'Roles' ? (
          <section className="fmt-table-panel">
            <div className="fmt-table-toolbar">
              <div className="fmt-select"><Info size={13} /> Papéis e funções</div>
            </div>
            <div className="fmt-table-wrap">
              <table className="fmt-table">
                <thead>
                  <tr><th>Slot</th><th>Posição</th><th>Papel</th><th>Função</th><th>Jogador</th></tr>
                </thead>
                <tbody>
                  {slots.map((slot, i) => {
                    const p = starters[i];
                    const { code, duty } = roleInfo(i);
                    return (
                      <tr key={`r-${i}`}>
                        <td>{i + 1}</td>
                        <td>{slot.code}</td>
                        <td>{code}</td>
                        <td>{duty === 'At' ? 'Ataque' : duty === 'De' ? 'Defesa' : duty === 'Su' ? 'Apoio' : 'Auto'}</td>
                        <td><span className={`fmt-player-name ${p ? '' : 'fmt-player-name--empty'}`}>{p ? `${p.name} ${p.surname}`.trim() : 'Selecionar jogador'}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : activeTab === 'Set pieces' ? (
          <SetPiecesPanel team={team} starters={starters} onUpdate={updateSetPieces} />
        ) : (
          <section className="fmt-table-panel">
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text-2)' }}>
              Numeração do elenco em breve.
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

// ============================================================
// Edit tactic compact panel
// ============================================================
const EditTacticPanel: React.FC<{
  formation: string; mentality: string; passing: string; tempo: string;
  onFormation: (f: string) => void; onMentality: (m: string) => void;
  onPassing: (p: string) => void; onTempo: (t: string) => void;
}> = ({ formation, mentality, passing, tempo, onFormation, onMentality, onPassing, onTempo }) => (
  <div className="fmt-editpanel">
    <div className="fmt-editpanel__group">
      <label>Formação</label>
      <div className="fmt-chip-row">
        {FORMATION_KEYS.map(f => (
          <button key={f} className={`fmt-chip ${f === formation ? 'fmt-chip--active' : ''}`} onClick={() => onFormation(f)}>{f}</button>
        ))}
      </div>
    </div>
    <div className="fmt-editpanel__group">
      <label>Mentalidade</label>
      <select value={mentality} onChange={e => onMentality(e.target.value)}>
        {MENTALITIES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
    <div className="fmt-editpanel__group">
      <label>Passe</label>
      <select value={passing} onChange={e => onPassing(e.target.value)}>
        {PASSING_STYLES.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
    <div className="fmt-editpanel__group">
      <label>Ritmo</label>
      <select value={tempo} onChange={e => onTempo(e.target.value)}>
        {TEMPOS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  </div>
);

// ============================================================
// Set Pieces — Bolas Paradas
// ============================================================
const SetPiecesPanel: React.FC<{
  team: Team;
  starters: (Player | null)[];
  onUpdate: (updater: (sp: SetPiecesConfig) => SetPiecesConfig) => void;
}> = ({ team, starters, onUpdate }) => {
  const sp = team.tacticsConfig?.setPieces ?? DEFAULT_SET_PIECES;
  const players = starters.filter(Boolean) as Player[];

  const playerSelect = (value: string, onChange: (id: string) => void, attr?: (p: Player) => string) => (
    <select className="fmt-sp-select" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Auto (melhor atributo)</option>
      {players.map(p => (
        <option key={p.id} value={p.id}>
          {p.name} {p.surname}{attr ? ` — ${attr(p)}` : ''}
        </option>
      ))}
    </select>
  );

  return (
    <section className="fmt-table-panel">
      <div className="fmt-table-toolbar">
        <div className="fmt-select"><Info size={13} /> Bolas Paradas</div>
      </div>
      <div className="fmt-setpieces">
        {/* ===== ATAQUE ===== */}
        <div className="fmt-sp-section">
          <h3 className="fmt-sp-section__title">Ataque</h3>

          {/* Escanteios */}
          <div className="fmt-sp-group">
            <span className="fmt-sp-group__label">Escanteios — Cobrança</span>
            <div className="fmt-chip-row">
              {CORNER_DELIVERIES.map(d => (
                <button key={d.value} className={`fmt-chip ${sp.corners.delivery === d.value ? 'fmt-chip--active' : ''}`}
                  onClick={() => onUpdate(s => ({ ...s, corners: { ...s.corners, delivery: d.value as any } }))}>
                  {d.label}
                </button>
              ))}
            </div>
            <span className="fmt-sp-group__label">Cobrador</span>
            {playerSelect(sp.corners.takerId, id => onUpdate(s => ({ ...s, corners: { ...s.corners, takerId: id } })), p => `Cr ${p.technical?.crossing ?? '-'}`)}
            <span className="fmt-sp-group__label">Alvo (cabeceador)</span>
            {playerSelect(sp.corners.targetId, id => onUpdate(s => ({ ...s, corners: { ...s.corners, targetId: id } })), p => `Cab ${p.technical?.heading ?? '-'} Imp ${p.physical?.jumping ?? '-'}`)}
          </div>

          {/* Faltas */}
          <div className="fmt-sp-group">
            <span className="fmt-sp-group__label">Faltas — Cobrança</span>
            <div className="fmt-chip-row">
              {FREE_KICK_DELIVERIES.map(d => (
                <button key={d.value} className={`fmt-chip ${sp.freeKicks.delivery === d.value ? 'fmt-chip--active' : ''}`}
                  onClick={() => onUpdate(s => ({ ...s, freeKicks: { ...s.freeKicks, delivery: d.value as any } }))}>
                  {d.label}
                </button>
              ))}
            </div>
            <span className="fmt-sp-group__label">Cobrador</span>
            {playerSelect(sp.freeKicks.takerId, id => onUpdate(s => ({ ...s, freeKicks: { ...s.freeKicks, takerId: id } })), p => `Fl ${p.technical?.freeKicks ?? '-'}`)}
          </div>

          {/* Laterais */}
          <div className="fmt-sp-group">
            <span className="fmt-sp-group__label">Laterais — Estilo</span>
            <div className="fmt-chip-row">
              {THROW_IN_STYLES.map(d => (
                <button key={d.value} className={`fmt-chip ${sp.throwIns.style === d.value ? 'fmt-chip--active' : ''}`}
                  onClick={() => onUpdate(s => ({ ...s, throwIns: { ...s.throwIns, style: d.value as any } }))}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pênaltis */}
          <div className="fmt-sp-group">
            <span className="fmt-sp-group__label">Pênaltis — Cobrador</span>
            {playerSelect(sp.penalties.takerId, id => onUpdate(s => ({ ...s, penalties: { takerId: id } })), p => `Fin ${p.technical?.finishing ?? '-'} Com ${p.mental?.composure ?? '-'}`)}
          </div>
        </div>

        {/* ===== DEFESA ===== */}
        <div className="fmt-sp-section">
          <h3 className="fmt-sp-section__title">Defesa</h3>

          {/* Escanteios Defensivos */}
          <div className="fmt-sp-group">
            <span className="fmt-sp-group__label">Escanteios — Marcação</span>
            <div className="fmt-chip-row">
              {MARKING_STYLES.map(d => (
                <button key={d.value} className={`fmt-chip ${sp.defensiveCorners.marking === d.value ? 'fmt-chip--active' : ''}`}
                  onClick={() => onUpdate(s => ({ ...s, defensiveCorners: { ...s.defensiveCorners, marking: d.value as any } }))}>
                  {d.label}
                </button>
              ))}
            </div>
            <span className="fmt-sp-group__label">Contra-ataque</span>
            <div className="fmt-chip-row">
              <button className={`fmt-chip ${sp.defensiveCorners.counterAttack ? 'fmt-chip--active' : ''}`}
                onClick={() => onUpdate(s => ({ ...s, defensiveCorners: { ...s.defensiveCorners, counterAttack: !s.defensiveCorners.counterAttack } }))}>
                {sp.defensiveCorners.counterAttack ? 'Sim' : 'Não'}
              </button>
            </div>
          </div>

          {/* Faltas Defensivas */}
          <div className="fmt-sp-group">
            <span className="fmt-sp-group__label">Faltas — Marcação</span>
            <div className="fmt-chip-row">
              {MARKING_STYLES.map(d => (
                <button key={d.value} className={`fmt-chip ${sp.defensiveFreeKicks.marking === d.value ? 'fmt-chip--active' : ''}`}
                  onClick={() => onUpdate(s => ({ ...s, defensiveFreeKicks: { ...s.defensiveFreeKicks, marking: d.value as any } }))}>
                  {d.label}
                </button>
              ))}
            </div>
            <span className="fmt-sp-group__label">Barreira</span>
            <div className="fmt-chip-row">
              {WALL_SIZES.map(d => (
                <button key={d.value} className={`fmt-chip ${sp.defensiveFreeKicks.wallSize === d.value ? 'fmt-chip--active' : ''}`}
                  onClick={() => onUpdate(s => ({ ...s, defensiveFreeKicks: { ...s.defensiveFreeKicks, wallSize: d.value as any } }))}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
