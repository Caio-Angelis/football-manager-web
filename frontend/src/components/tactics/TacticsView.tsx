import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import type { Player, Team, SetPiecesConfig } from '../../types/game';
import {
  ChevronUp, ChevronDown, Pencil, ListFilter,
  Globe, Trophy, Save, Ambulance,
} from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { getRatingColor } from '../../utils/statusColors';
import './tactics-fm.css';

// ============================================================
// Formations — vertical pitch (y: 0 = ataque/topo, 1 = gol/fundo)
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

const ROLE_LABEL: Record<string, string> = {
  GK: 'Goleiro', SK: 'Goleiro líbero', FB: 'Lateral', WB: 'Ala',
  CD: 'Zagueiro', BPD: 'Zagueiro construtor', IWB: 'Lateral invertido',
  DM: 'Volante', CM: 'Meio-campo', BtB: 'Box-to-box', DLP: 'Armador recuado',
  AP: 'Armador avançado', Car: 'Carrilero', W: 'Ponta', WM: 'Meia aberto',
  AM: 'Meia-atacante', IF: 'Ponta invertida', PF: 'Centroavante de pressão',
  AF: 'Centroavante avançado', TM: 'Homem-alvo', PO: 'Finalizador', CF: 'Atacante completo',
};

const DUTY_ABBR: Record<string, string> = {
  attack: 'At', defend: 'De', support: 'Su', balance: 'Au',
};

const DUTY_LABEL: Record<string, string> = {
  At: 'Ataque', De: 'Defesa', Su: 'Apoio', Au: 'Automático',
};

const MENTALITIES: { value: string; label: string }[] = [
  { value: 'very defensive', label: 'Muito defensiva' },
  { value: 'defensive', label: 'Defensiva' },
  { value: 'cautious', label: 'Cautelosa' },
  { value: 'balanced', label: 'Equilibrada' },
  { value: 'positive', label: 'Positiva' },
  { value: 'offensive', label: 'Ofensiva' },
  { value: 'very offensive', label: 'Muito ofensiva' },
];
const PASSING_STYLES: { value: string; label: string }[] = [
  { value: 'short', label: 'Curto' },
  { value: 'mixed', label: 'Misto' },
  { value: 'direct', label: 'Direto' },
];
const TEMPOS: { value: string; label: string }[] = [
  { value: 'slow', label: 'Lento' },
  { value: 'balanced', label: 'Equilibrado' },
  { value: 'fast', label: 'Rápido' },
];
const TACTIC_LABEL: Record<string, string> = {
  attacking: 'Ofensivo',
  defensive: 'Defensivo',
  balanced: 'Equilibrado',
};

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

type SubTab = 'escalacao' | 'adversario' | 'bolas';
const SUBTABS: { id: SubTab; label: string }[] = [
  { id: 'escalacao', label: 'Escalação' },
  { id: 'adversario', label: 'Adversário' },
  { id: 'bolas', label: 'Bolas Paradas' },
];

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
      <rect x="28" y="3" width="44" height="18" />
      <rect x="40" y="3" width="20" height="7" />
      <rect x="28" y="119" width="44" height="18" />
      <rect x="40" y="130" width="20" height="7" />
    </g>
  </svg>
);

const AbilityStars: React.FC<{ ca: number }> = ({ ca }) => {
  const filled = Math.max(0, Math.min(5, Math.round((ca / 200) * 5)));
  return (
    <span className="fmt-stars" title={`Habilidade atual: ${ca}`}>
      {[0, 1, 2, 3, 4].map(i => (
        <span key={i} className={i < filled ? 'fmt-star fmt-star--on' : 'fmt-star'} aria-hidden="true">★</span>
      ))}
    </span>
  );
};

const moraleColor = (m: number) => getRatingColor(m, { high: 66, medium: 40 });
const conditionColor = (f: number) => getRatingColor(f, { high: 85, medium: 65 });

const dutyLabel = (duty: string) => DUTY_LABEL[duty] ?? duty;
const roleTitle = (code: string, duty: string) =>
  `${ROLE_LABEL[code] ?? code} — ${dutyLabel(duty)}`;

export const TacticsView: React.FC = () => {
  const { teams, selectedTeam, matches, updateTeam, saveGame } = useGameStore();
  const navigate = useNavigate();
  const team = teams.find(t => t.id === selectedTeam) as Team | undefined;

  const [activeTab, setActiveTab] = useState<SubTab>('escalacao');
  const [editOpen, setEditOpen] = useState(false);
  const [dragSlot, setDragSlot] = useState<number | null>(null);
  const [dragBenchIndex, setDragBenchIndex] = useState<number | null>(null);
  const [dragTableBenchId, setDragTableBenchId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [dragOverBench, setDragOverBench] = useState<number | null>(null);
  const [showAllSquad, setShowAllSquad] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  if (!team) {
    return (
      <div className="fm-tactics-fm fms-page">
        <div style={{ margin: 'auto', color: 'var(--t-text-2)' }}>Selecione um time para ver as táticas.</div>
      </div>
    );
  }

  const formation = FORMATIONS[team.formation] ? team.formation : '4-3-3';
  const slots = FORMATIONS[formation];

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

  const starters: (Player | null)[] = useMemo(() => {
    const out: (Player | null)[] = slots.map((_, i) => {
      const r = roleBySlot.get(i);
      if (r?.playerId && playerById.has(r.playerId)) return playerById.get(r.playerId)!;
      return null;
    });
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

  const nextFixture = useMemo(() => {
    const m = matches.find((mt: any) => !mt.completed && (mt.homeTeam === team.id || mt.awayTeam === team.id));
    if (!m) return null;
    const isHome = m.homeTeam === team.id;
    const oppId = isHome ? m.awayTeam : m.homeTeam;
    const opp = teams.find(t => t.id === oppId);
    return {
      name: opp?.name ?? 'Adversário',
      isHome,
      formation: opp?.formation,
      mentality: opp?.teamMentality,
      tactic: opp?.tactic,
    };
  }, [matches, teams, team.id]);

  const roleInfo = (i: number) => {
    const r = roleBySlot.get(i);
    const code = r?.role ? (ROLE_ABBR[r.role] ?? slots[i].code) : slots[i].code;
    const duty = r?.duty ? (DUTY_ABBR[r.duty] ?? 'Au') : (slots[i].line === 'fwd' ? 'At' : slots[i].line === 'mid' ? 'Su' : 'De');
    return { code, duty };
  };

  const setFormation = (f: string) => updateTeam(team.id, t => ({ ...t, formation: f }));
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

  const injuredInXI = useMemo(() => starters.filter(p => p?.injury?.active).length, [starters]);

  const replaceInjured = () => {
    if (injuredInXI === 0) return;
    if (!window.confirm(`Substituir ${injuredInXI} lesionado(s) do XI por reservas aptos?`)) return;

    const lineToPos: Record<string, string> = { gk: 'GK', def: 'DEF', mid: 'MID', fwd: 'FWD' };
    const currentRoles = [...(team.tacticsConfig?.playerRoles ?? [])];
    const usedIds = new Set(starters.filter(Boolean).map(p => p!.id));
    let changed = false;

    const scoreAt = (p: Player, pos: string) => {
      const prof = p.positionProficiency?.[pos] ?? 0;
      return p.currentAbility * (0.4 + 0.6 * (prof / 20));
    };

    for (let i = 0; i < slots.length; i++) {
      const p = starters[i];
      if (!p || !p.injury?.active) continue;

      const pos = lineToPos[slots[i].line];
      const candidates = team.squad
        .filter(c => !usedIds.has(c.id) && !c.injury?.active && (c.fitness ?? 100) >= 60)
        .sort((a, b) => scoreAt(b, pos) - scoreAt(a, pos));

      const replacement =
        candidates.find(c => c.position === pos) ??
        candidates.find(c => (c.secondaryPositions ?? []).includes(pos)) ??
        candidates[0];

      if (replacement) {
        usedIds.delete(p.id);
        usedIds.add(replacement.id);
        const idx = currentRoles.findIndex(r => r.slotIndex === i);
        if (idx >= 0) {
          currentRoles[idx] = { ...currentRoles[idx], playerId: replacement.id };
        } else {
          currentRoles.push({ slotIndex: i, playerId: replacement.id, role: '', duty: '' });
        }
        changed = true;
      }
    }

    if (changed) {
      const xi = slots.map((_, idx) => {
        const r = currentRoles.find(rr => rr.slotIndex === idx);
        return r?.playerId ?? starters[idx]?.id ?? '';
      }).filter(Boolean);
      updateTeam(team.id, t => ({
        ...t,
        startingXI: xi,
        tacticsConfig: { ...t.tacticsConfig, playerRoles: currentRoles },
      }));
    }
  };

  const autoFillBestXI = () => {
    if (!window.confirm('Montar o melhor XI automaticamente? A escalação atual será substituída.')) return;

    const lineToPos: Record<string, string> = { gk: 'GK', def: 'DEF', mid: 'MID', fwd: 'FWD' };
    const used = new Set<string>();
    const roles = slots.map((_, i) => ({ playerId: '', slotIndex: i, role: '', duty: '' }));

    const scoreAt = (p: Player, pos: string) => {
      const prof = p.positionProficiency?.[pos] ?? 0;
      return p.currentAbility * (0.4 + 0.6 * (prof / 20));
    };

    const fillPass = (filterFn: (p: Player, pos: string) => boolean) => {
      for (let i = 0; i < slots.length; i++) {
        if (roles[i].playerId) continue;
        const pos = lineToPos[slots[i].line];
        const best = team.squad
          .filter(p => !used.has(p.id) && !p.injury?.active && (p.fitness ?? 100) >= 70 && filterFn(p, pos))
          .sort((a, b) => scoreAt(b, pos) - scoreAt(a, pos))[0];
        if (best) {
          roles[i].playerId = best.id;
          used.add(best.id);
        }
      }
    };

    fillPass((p, pos) => p.position === pos);
    fillPass((p, pos) => (p.secondaryPositions ?? []).includes(pos));
    fillPass(() => true);

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
      setSaveStatus('Erro ao salvar — tente de novo');
      setTimeout(() => setSaveStatus(null), 3000);
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
      const xi = starters.map((p, i) => {
        if (i === a) return pb?.id ?? '';
        if (i === b) return pa?.id ?? '';
        return p?.id ?? '';
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
      const xi = starters.map((p, i) => {
        if (i === slotIndex) return benchPlayerId;
        return p?.id ?? '';
      }).filter(Boolean);
      return { ...t, startingXI: xi, tacticsConfig: { ...t.tacticsConfig, playerRoles: roles } };
    });
  };

  const activateSlot = (i: number) => {
    if (selectedSlot === null) setSelectedSlot(i);
    else if (selectedSlot === i) setSelectedSlot(null);
    else { swapSlots(selectedSlot, i); setSelectedSlot(null); }
  };
  const activateBenchPlayer = (playerId: string) => {
    if (selectedSlot === null) return;
    swapBenchToSlot(playerId, selectedSlot);
    setSelectedSlot(null);
  };

  const mentalityLabel = MENTALITIES.find(m => m.value === team.teamMentality)?.label ?? team.teamMentality;

  return (
    <div className="fm-tactics-fm fms-page">
      <PageHeader
        title="Táticas"
        subtitle={
          nextFixture
            ? `${formation} · Próximo: ${nextFixture.name} (${nextFixture.isHome ? 'C' : 'F'})`
            : `${formation} · ${team.name} — ${team.league}`
        }
        teamName={team.name}
        teamReputation={team.reputation}
        titleExtra={
          <div className="fmt-navarrows">
            <button type="button" title="Formação anterior" onClick={() => cycleFormation(-1)}><ChevronUp size={12} /></button>
            <button type="button" title="Próxima formação" onClick={() => cycleFormation(1)}><ChevronDown size={12} /></button>
          </div>
        }
        actions={[
          { icon: <Globe size={15} />, title: 'Visão do Clube', onClick: () => navigate('/clube') },
          { icon: <Trophy size={15} />, title: 'Classificação', onClick: () => navigate('/classificacao') },
        ]}
      />

      <nav className="fmt-subtabs" aria-label="Seções de táticas">
        {SUBTABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`fmt-subtab ${activeTab === tab.id ? 'fmt-subtab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="fmt-body">
        <section className="fmt-pitch-panel">
          <div className="fmt-pitch-toolbar">
            <button type="button" className="fmt-edit-tactic" onClick={() => setEditOpen(o => !o)} aria-expanded={editOpen}>
              <Pencil size={13} /> {editOpen ? 'Fechar edição' : 'Editar tática'}
            </button>
            <button type="button" className="fmt-tool-text" onClick={autoFillBestXI}>Melhor XI</button>
            {injuredInXI > 0 && (
              <button type="button" className="fmt-tool-icon fmt-tool-icon--warn" title={`Substituir ${injuredInXI} lesionado(s)`} onClick={replaceInjured}>
                <Ambulance size={15} />
                <span className="fmt-badge">{injuredInXI}</span>
              </button>
            )}
            <button type="button" className="fmt-tool-icon" title="Salvar táticas" onClick={handleSave}><Save size={15} /></button>
            {saveStatus && <span className="fmt-save-status" role="status">{saveStatus}</span>}
          </div>

          {selectedSlot !== null && (
            <div className="fmt-select-hint" role="status">
              Posição selecionada — clique noutra posição ou num reserva para trocar.{' '}
              <button type="button" className="fmt-link-btn" onClick={() => setSelectedSlot(null)}>Cancelar</button>
            </div>
          )}

          {editOpen && (
            <div className="fmt-edit-panel">
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
                <button
                  key={i}
                  type="button"
                  className={`fmt-marker ${dragSlot === i ? 'fmt-marker--dragging' : ''} ${dragOverSlot === i ? 'fmt-marker--drop-target' : ''} ${selectedSlot === i ? 'fmt-marker--selected' : ''}`}
                  style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%` }}
                  aria-pressed={selectedSlot === i}
                  aria-label={`Posição ${roleTitle(code, duty)}${p ? `, ${p.surname || p.name}` : ', vazia'}. Selecionar para trocar.`}
                  title={roleTitle(code, duty)}
                  onClick={() => activateSlot(i)}
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
                  <span className={`fmt-marker__role fmt-marker__role--${slot.line}`}>{code} · {duty}</span>
                  <ShirtIcon className={`fmt-marker__shirt ${p ? '' : 'fmt-marker__shirt--empty'}`} />
                  <span className={`fmt-marker__name ${p ? '' : 'fmt-marker__name--empty'}`}>
                    {p ? p.surname || p.name : 'Selecionar'}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="fmt-pitch-summary">
            {formation} · {mentalityLabel}
            {injuredInXI > 0 ? ` · ${injuredInXI} lesionado(s) no XI` : ''}
          </p>
        </section>

        <aside className="fmt-bench" aria-label="Banco de reservas">
          {Array.from({ length: 7 }).map((_, i) => {
            const p = benchPlayers[i];
            return (
              <button
                key={i}
                type="button"
                className={`fmt-bench-item ${dragBenchIndex === i ? 'fmt-bench-item--dragging' : ''} ${dragOverBench === i ? 'fmt-bench-item--drop-target' : ''}`}
                disabled={!p}
                aria-label={p ? `Reserva: ${p.surname || p.name}. Selecionar para posicionar.` : `Reserva ${i + 1} vazia`}
                onClick={() => p && activateBenchPlayer(p.id)}
                draggable={!!p}
                onDragStart={() => setDragBenchIndex(i)}
                onDragOver={e => { e.preventDefault(); setDragOverBench(i); }}
                onDragLeave={() => setDragOverBench(null)}
                onDrop={() => {
                  if (dragSlot !== null && p) swapBenchToSlot(p.id, dragSlot);
                  setDragSlot(null); setDragBenchIndex(null); setDragTableBenchId(null); setDragOverBench(null);
                }}
                onDragEnd={() => { setDragSlot(null); setDragBenchIndex(null); setDragTableBenchId(null); setDragOverBench(null); }}
              >
                <ShirtIcon className={`fmt-bench-item__shirt ${p ? '' : 'fmt-marker__shirt--empty'}`} />
                <span className="fmt-bench-item__label">{p ? (p.surname || p.name) : `R${String(i + 1).padStart(2, '0')}`}</span>
              </button>
            );
          })}
        </aside>

        {activeTab === 'escalacao' ? (
          <section className="fmt-table-panel">
            <div className="fmt-table-toolbar">
              <span className="fmt-toolbar-title">Titulares e reservas</span>
              <div className="fmt-toolbar-spacer" />
              {injuredInXI > 0 && (
                <button type="button" className="fmt-link-btn fmt-link-btn--warn" onClick={replaceInjured}>
                  Substituir lesionados ({injuredInXI})
                </button>
              )}
              <button
                type="button"
                className="fmt-tool-icon"
                title={showAllSquad ? 'Mostrar só o banco curto' : 'Mostrar todo o elenco'}
                aria-pressed={showAllSquad}
                onClick={() => setShowAllSquad(s => !s)}
              >
                <ListFilter size={15} />
              </button>
            </div>

            <div className="fmt-table-wrap">
              <table className="fmt-table">
                <thead>
                  <tr>
                    <th scope="col">Papel</th>
                    <th scope="col">Nac</th>
                    <th scope="col">Hab</th>
                    <th scope="col">Jogador</th>
                    <th scope="col">Pos</th>
                    <th scope="col" className="fmt-center"><abbr title="Condição física">Con</abbr></th>
                    <th scope="col" className="fmt-center"><abbr title="Moral">Mor</abbr></th>
                    <th scope="col" className="fmt-center">Carga</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, i) => {
                    const p = starters[i];
                    const { code, duty } = roleInfo(i);
                    return (
                      <tr key={`s-${i}`} className={p?.injury?.active ? 'fmt-row--injured' : undefined}>
                        <td>
                          <div className="fmt-instr-cell">
                            <span className={`fmt-role-badge fmt-role-badge--${slot.line}`} title={roleTitle(code, duty)}>
                              <span className="fmt-role-code">{code}</span>
                              <span className="fmt-role-duty">{dutyLabel(duty)}</span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="fmt-nat" title={p?.nationality}>{p?.nationality ? p.nationality.slice(0, 3).toUpperCase() : '—'}</span>
                        </td>
                        <td><AbilityStars ca={p?.currentAbility ?? 0} /></td>
                        <td>
                          <span className={`fmt-player-name ${p ? '' : 'fmt-player-name--empty'}`}>
                            {p ? `${p.name} ${p.surname}`.trim() : 'Selecionar jogador'}
                            {p?.injury?.active ? <span className="fmt-injured-tag"> Lesionado</span> : null}
                          </span>
                        </td>
                        <td className="fmt-pos-cell">{p?.position ?? '—'}</td>
                        <td className="fmt-center">{p ? <span style={{ color: conditionColor(p.fitness) }}>{Math.round(p.fitness)}%</span> : <span className="fmt-dash">—</span>}</td>
                        <td className="fmt-center">{p ? <span className="fmt-morale"><span className="fmt-morale__dot" style={{ background: moraleColor(p.morale) }} aria-hidden="true" />{Math.round(p.morale)}</span> : <span className="fmt-dash">—</span>}</td>
                        <td className="fmt-center">{p ? <div className="fmt-load-bar" title={`Condição ${Math.round(p.fitness)}%`}><div className="fmt-load-bar__fill" style={{ width: `${Math.round(p.fitness)}%`, background: conditionColor(p.fitness) }} /></div> : <span className="fmt-dash">—</span>}</td>
                      </tr>
                    );
                  })}
                  {tableBench.map((p, i) => (
                    <tr
                      key={`b-${i}`}
                      className={`fmt-empty-row fmt-table-bench-row ${dragTableBenchId === p.id ? 'fmt-table-bench-row--dragging' : ''}`}
                      tabIndex={0}
                      role="button"
                      aria-label={`Reserva: ${p.name} ${p.surname}. Selecionar para posicionar.`}
                      onClick={() => activateBenchPlayer(p.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activateBenchPlayer(p.id); }
                      }}
                      draggable
                      onDragStart={() => setDragTableBenchId(p.id)}
                      onDragEnd={() => { setDragTableBenchId(null); }}
                    >
                      <td>
                        <span className="fmt-role-badge fmt-role-badge--bench">
                          <span className="fmt-role-duty">Reserva</span>
                        </span>
                      </td>
                      <td><span className="fmt-nat" title={p.nationality}>{p.nationality ? p.nationality.slice(0, 3).toUpperCase() : '—'}</span></td>
                      <td><AbilityStars ca={p.currentAbility} /></td>
                      <td><span className="fmt-player-name">{`${p.name} ${p.surname}`.trim()}</span></td>
                      <td className="fmt-pos-cell">{p.position}</td>
                      <td className="fmt-center"><span style={{ color: conditionColor(p.fitness) }}>{Math.round(p.fitness)}%</span></td>
                      <td className="fmt-center"><span className="fmt-morale"><span className="fmt-morale__dot" style={{ background: moraleColor(p.morale) }} aria-hidden="true" />{Math.round(p.morale)}</span></td>
                      <td className="fmt-center"><div className="fmt-load-bar"><div className="fmt-load-bar__fill" style={{ width: `${Math.round(p.fitness)}%`, background: conditionColor(p.fitness) }} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : activeTab === 'adversario' ? (
          <section className="fmt-table-panel">
            <div className="fmt-table-toolbar">
              <span className="fmt-toolbar-title">Próximo adversário</span>
            </div>
            <div className="fmt-opp">
              {nextFixture ? (
                <>
                  <h3 className="fmt-opp__name">{nextFixture.name}</h3>
                  <p className="fmt-opp__meta">
                    {nextFixture.isHome ? 'Em casa' : 'Fora de casa'}
                  </p>
                  <dl className="fmt-opp__facts">
                    {nextFixture.formation && (
                      <>
                        <dt>Formação</dt>
                        <dd>{nextFixture.formation}</dd>
                      </>
                    )}
                    {nextFixture.mentality && (
                      <>
                        <dt>Mentalidade</dt>
                        <dd>{MENTALITIES.find(m => m.value === nextFixture.mentality)?.label ?? nextFixture.mentality}</dd>
                      </>
                    )}
                    {nextFixture.tactic && (
                      <>
                        <dt>Estilo</dt>
                        <dd>{TACTIC_LABEL[nextFixture.tactic] ?? nextFixture.tactic}</dd>
                      </>
                    )}
                  </dl>
                  <p className="fmt-opp__note">Análise detalhada (duelos e recomendações) no briefing pré-jogo.</p>
                </>
              ) : (
                <p className="fmt-opp__empty">Sem jogo agendado nesta semana.</p>
              )}
            </div>
          </section>
        ) : (
          <SetPiecesPanel team={team} starters={starters} onUpdate={updateSetPieces} />
        )}
      </div>
    </div>
  );
};

const EditTacticPanel: React.FC<{
  formation: string; mentality: string; passing: string; tempo: string;
  onFormation: (f: string) => void; onMentality: (m: string) => void;
  onPassing: (p: string) => void; onTempo: (t: string) => void;
}> = ({ formation, mentality, passing, tempo, onFormation, onMentality, onPassing, onTempo }) => (
  <div className="fmt-editpanel">
    <div className="fmt-editpanel__group">
      <label htmlFor="fmt-formation">Formação</label>
      <div className="fmt-chip-row" id="fmt-formation">
        {FORMATION_KEYS.map(f => (
          <button key={f} type="button" className={`fmt-chip ${f === formation ? 'fmt-chip--active' : ''}`} onClick={() => onFormation(f)}>{f}</button>
        ))}
      </div>
    </div>
    <div className="fmt-editpanel__group">
      <label htmlFor="fmt-mentality">Mentalidade</label>
      <select id="fmt-mentality" value={mentality} onChange={e => onMentality(e.target.value)}>
        {MENTALITIES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
    </div>
    <div className="fmt-editpanel__group">
      <label htmlFor="fmt-passing">Passe</label>
      <select id="fmt-passing" value={passing} onChange={e => onPassing(e.target.value)}>
        {PASSING_STYLES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
    </div>
    <div className="fmt-editpanel__group">
      <label htmlFor="fmt-tempo">Ritmo</label>
      <select id="fmt-tempo" value={tempo} onChange={e => onTempo(e.target.value)}>
        {TEMPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
    </div>
  </div>
);

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
        <span className="fmt-toolbar-title">Bolas Paradas</span>
      </div>
      <div className="fmt-setpieces">
        <div className="fmt-sp-section">
          <h3 className="fmt-sp-section__title">Ataque</h3>

          <div className="fmt-sp-group">
            <span className="fmt-sp-group__label">Escanteios — Cobrança</span>
            <div className="fmt-chip-row">
              {CORNER_DELIVERIES.map(d => (
                <button key={d.value} type="button" className={`fmt-chip ${sp.corners.delivery === d.value ? 'fmt-chip--active' : ''}`}
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

          <div className="fmt-sp-group">
            <span className="fmt-sp-group__label">Faltas — Cobrança</span>
            <div className="fmt-chip-row">
              {FREE_KICK_DELIVERIES.map(d => (
                <button key={d.value} type="button" className={`fmt-chip ${sp.freeKicks.delivery === d.value ? 'fmt-chip--active' : ''}`}
                  onClick={() => onUpdate(s => ({ ...s, freeKicks: { ...s.freeKicks, delivery: d.value as any } }))}>
                  {d.label}
                </button>
              ))}
            </div>
            <span className="fmt-sp-group__label">Cobrador</span>
            {playerSelect(sp.freeKicks.takerId, id => onUpdate(s => ({ ...s, freeKicks: { ...s.freeKicks, takerId: id } })), p => `Fl ${p.technical?.freeKicks ?? '-'}`)}
          </div>

          <div className="fmt-sp-group">
            <span className="fmt-sp-group__label">Laterais — Estilo</span>
            <div className="fmt-chip-row">
              {THROW_IN_STYLES.map(d => (
                <button key={d.value} type="button" className={`fmt-chip ${sp.throwIns.style === d.value ? 'fmt-chip--active' : ''}`}
                  onClick={() => onUpdate(s => ({ ...s, throwIns: { ...s.throwIns, style: d.value as any } }))}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="fmt-sp-group">
            <span className="fmt-sp-group__label">Pênaltis — Cobrador</span>
            {playerSelect(sp.penalties.takerId, id => onUpdate(s => ({ ...s, penalties: { takerId: id } })), p => `Fin ${p.technical?.finishing ?? '-'} Com ${p.mental?.composure ?? '-'}`)}
          </div>
        </div>

        <div className="fmt-sp-section">
          <h3 className="fmt-sp-section__title">Defesa</h3>

          <div className="fmt-sp-group">
            <span className="fmt-sp-group__label">Escanteios — Marcação</span>
            <div className="fmt-chip-row">
              {MARKING_STYLES.map(d => (
                <button key={d.value} type="button" className={`fmt-chip ${sp.defensiveCorners.marking === d.value ? 'fmt-chip--active' : ''}`}
                  onClick={() => onUpdate(s => ({ ...s, defensiveCorners: { ...s.defensiveCorners, marking: d.value as any } }))}>
                  {d.label}
                </button>
              ))}
            </div>
            <span className="fmt-sp-group__label">Contra-ataque</span>
            <div className="fmt-chip-row">
              <button type="button" className={`fmt-chip ${sp.defensiveCorners.counterAttack ? 'fmt-chip--active' : ''}`}
                onClick={() => onUpdate(s => ({ ...s, defensiveCorners: { ...s.defensiveCorners, counterAttack: !s.defensiveCorners.counterAttack } }))}>
                {sp.defensiveCorners.counterAttack ? 'Sim' : 'Não'}
              </button>
            </div>
          </div>

          <div className="fmt-sp-group">
            <span className="fmt-sp-group__label">Faltas — Marcação</span>
            <div className="fmt-chip-row">
              {MARKING_STYLES.map(d => (
                <button key={d.value} type="button" className={`fmt-chip ${sp.defensiveFreeKicks.marking === d.value ? 'fmt-chip--active' : ''}`}
                  onClick={() => onUpdate(s => ({ ...s, defensiveFreeKicks: { ...s.defensiveFreeKicks, marking: d.value as any } }))}>
                  {d.label}
                </button>
              ))}
            </div>
            <span className="fmt-sp-group__label">Barreira</span>
            <div className="fmt-chip-row">
              {WALL_SIZES.map(d => (
                <button key={d.value} type="button" className={`fmt-chip ${sp.defensiveFreeKicks.wallSize === d.value ? 'fmt-chip--active' : ''}`}
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
