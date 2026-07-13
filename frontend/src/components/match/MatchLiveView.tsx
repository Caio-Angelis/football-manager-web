import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Match, MatchEvent, MatchAction, Player, Team } from '../../types/game';
import { MatchPitch2D } from './MatchPitch2D';
import { TeamCrest } from '../ui/TeamCrest';
import { Button } from '../ui/Button';
import { fmtMinute } from '../../utils/matchTime';
import { getRatingColor } from '../../utils/statusColors';
import { getTeamDiscColor } from '../../utils/teamColors';
import { PlayCircle, X } from 'lucide-react';
import './MatchLiveView.css';

type ShoutKey = 'encourage' | 'demand' | 'praise' | 'calm';

const SHOUTS: { key: ShoutKey; label: string }[] = [
  { key: 'encourage', label: 'Incentivar' },
  { key: 'demand', label: 'Exigir mais' },
  { key: 'praise', label: 'Elogiar' },
  { key: 'calm', label: 'Acalmar' },
];

const MENTALITY_LABEL: Record<string, string> = {
  'very defensive': 'Muito defensiva',
  defensive: 'Defensiva',
  cautious: 'Cautelosa',
  balanced: 'Equilibrada',
  positive: 'Positiva',
  offensive: 'Ofensiva',
  'very offensive': 'Muito ofensiva',
};

const POS_SHORT: Record<string, string> = {
  GK: 'GK',
  DEF: 'DEF',
  MID: 'MID',
  FWD: 'ATA',
};

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Provisional live rating from events/actions — baseline 6.5, no full engine. */
function provisionalRating(
  player: Player,
  events: MatchEvent[],
  actions: MatchAction[],
): number {
  let r = 6.5;
  for (const e of events) {
    if (e.player !== player.name) continue;
    if (e.type === 'goal') r += 0.8;
    else if (e.type === 'shot') r += 0.1;
    else if (e.type === 'yellow') r -= 0.3;
    else if (e.type === 'red') r -= 1.2;
    else if (e.type === 'save') r += 0.25;
  }
  for (const a of actions) {
    if (a.playerId !== player.id && a.playerName !== player.name) continue;
    if (a.type === 'tackle' && a.success) r += 0.08;
    else if (a.type === 'interception' && a.success) r += 0.08;
    else if (a.type === 'pass' && a.success) r += 0.02;
    else if (a.type === 'shot' && a.success) r += 0.12;
    else if (!a.success && (a.type === 'pass' || a.type === 'dribble' || a.type === 'shot')) r -= 0.04;
  }
  return Math.max(4.0, Math.min(9.8, Math.round(r * 10) / 10));
}

function liveFitness(player: Player, fatigue?: Record<string, number>): number {
  const fat = fatigue?.[player.id] ?? 0;
  // fatigue is 0–0.6; map to ~0–40 fitness drain
  return Math.max(5, Math.round(player.fitness - fat * 65));
}

function clockLabel(minute: number, addedTime?: number): { main: string; added?: string } {
  if (minute > 90) {
    return { main: '90:00', added: `+${minute - 90} MINS` };
  }
  if (minute === 90 && addedTime && addedTime > 0) {
    return { main: '90:00', added: `+${addedTime} MINS` };
  }
  const m = Math.min(90, Math.floor(minute));
  const s = Math.floor((minute % 1) * 60);
  return { main: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` };
}

function commentaryText(events: MatchEvent[], actions: MatchAction[]): string {
  const lastAction = actions.length > 0 ? actions[actions.length - 1] : null;
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;
  if (lastAction && lastEvent) {
    // Prefer the more recent by minute
    if (lastAction.minute >= lastEvent.minute) return lastAction.description;
    return lastEvent.description ?? `${lastEvent.type}`;
  }
  if (lastAction) return lastAction.description;
  if (lastEvent) return lastEvent.description ?? `${fmtMinute(lastEvent.minute)}' — ${lastEvent.type}`;
  return 'A partida está em andamento…';
}

interface MatchLiveViewProps {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  userTeam: Team | null;
  matchSpeed: number;
  halfTimeResumed: boolean;
  onClose: () => void;
  onSetSpeed: (s: number) => void;
  onResumeSecondHalf: () => void;
  onSub: (outId: string, inId: string) => void;
  onShout: (s: ShoutKey) => void;
  onFinish: () => void;
}

export const MatchLiveView: React.FC<MatchLiveViewProps> = ({
  match,
  homeTeam,
  awayTeam,
  userTeam,
  matchSpeed,
  halfTimeResumed,
  onClose,
  onSetSpeed,
  onResumeSecondHalf,
  onSub,
  onShout,
  onFinish,
}) => {
  const [panel, setPanel] = useState<'none' | 'subs' | 'shouts'>('none');
  const [outId, setOutId] = useState('');
  const [inId, setInId] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock body scroll while fullscreen
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const isUserHome = userTeam?.id === match.homeTeam;
  const isUserAway = userTeam?.id === match.awayTeam;
  const userSideTeam = isUserHome ? homeTeam : isUserAway ? awayTeam : null;
  const events = match.liveEvents ?? [];
  const actions = match.liveActions ?? [];
  const fatigue = match.liveMatchState?.fatigue;
  const sentOff = userSideTeam
    ? ((isUserHome ? match.liveMatchState?.sentOff?.home : match.liveMatchState?.sentOff?.away) ?? [])
    : [];
  const subsUsed = isUserHome ? match.homeSubstitutions : isUserAway ? match.awaySubstitutions : 0;

  const xi = useMemo(() => {
    if (!userSideTeam) return [] as Player[];
    return userSideTeam.startingXI
      .map(id => userSideTeam.squad.find(p => p.id === id))
      .filter((p): p is Player => !!p && !sentOff.includes(p.id));
  }, [userSideTeam, sentOff]);

  const bench = useMemo(() => {
    if (!userSideTeam) return [] as Player[];
    return userSideTeam.squad.filter(p =>
      !userSideTeam.startingXI.includes(p.id) &&
      !sentOff.includes(p.id) &&
      !p.injury?.active,
    );
  }, [userSideTeam, sentOff]);

  const clock = clockLabel(match.liveMinute, match.liveMatchState?.addedTime);
  const comment = commentaryText(events, actions);
  const atHT = match.liveMinute >= 45 && match.liveMinute < 90 && !halfTimeResumed;
  const teamColor = userSideTeam
    ? getTeamDiscColor(userSideTeam.name, userSideTeam.reputation)
    : '#3d7bf5';
  const mentality = userSideTeam
    ? (MENTALITY_LABEL[userSideTeam.teamMentality] ?? userSideTeam.teamMentality)
    : '—';
  const formation = userSideTeam?.formation ?? '—';
  const canSub = subsUsed < 5 && !!outId && !!inId;

  return createPortal(
    <div className="fm-mlv" role="dialog" aria-modal="true" aria-label="Partida ao vivo">
      <div className="fm-mlv__stage">
      <div className="fm-mlv__pitch">
        <MatchPitch2D
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homeGoals={match.homeGoals}
          awayGoals={match.awayGoals}
          minute={match.liveMinute}
          possession={match.liveStats?.homePossession ?? 50}
          events={events}
          isLive={match.isLive}
          ballPos={match.liveMatchState?.ballPos}
          ballPosY={match.liveMatchState?.ballPosY}
          ballHolderId={match.liveMatchState?.ballHolderId}
          possessionSide={match.liveMatchState?.possession}
          speed={matchSpeed}
          actions={actions}
          paused={atHT}
          variant="classic"
          showTacticalLines={false}
        />
      </div>

      {/* Scoreboard overlay */}
      <div className="fm-mlv__scoreboard">
        <div className="fm-mlv__sb-teams">
          <TeamCrest name={homeTeam.name} reputation={homeTeam.reputation} size={28} />
          <span className="fm-mlv__sb-score">{match.homeGoals}-{match.awayGoals}</span>
          <TeamCrest name={awayTeam.name} reputation={awayTeam.reputation} size={28} />
        </div>
        <div className="fm-mlv__sb-clock">
          <span className="fm-mlv__sb-time">{clock.main}</span>
          {clock.added && <span className="fm-mlv__sb-added">{clock.added}</span>}
        </div>
      </div>

      {/* Top-right chrome */}
      <div className="fm-mlv__top-right">
        <div className="fm-mlv__speed" role="group" aria-label="Velocidade">
          {[1, 2, 4].map(s => (
            <button
              key={s}
              type="button"
              className={`fm-mlv__speed-btn${matchSpeed === s ? ' fm-mlv__speed-btn--active' : ''}`}
              onClick={() => onSetSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
        <button type="button" className="fm-mlv__finish" onClick={onFinish}>
          Simular até o fim
        </button>
        <button type="button" className="fm-mlv__close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
      </div>

      {/* Commentary bar */}
      <div className="fm-mlv__commentary" aria-live="polite">
        {comment}
      </div>

      {/* Bottom HUD */}
      <div className="fm-mlv__hud">
        <div className="fm-mlv__tactics">
          <div className="fm-mlv__tac-row">
            <span className="fm-mlv__tac-label">Formação</span>
            <span className="fm-mlv__tac-value">{formation}</span>
          </div>
          <div className="fm-mlv__tac-row">
            <span className="fm-mlv__tac-label">Mentalidade</span>
            <span className="fm-mlv__tac-value">{mentality}</span>
          </div>
          {userSideTeam && (
            <div className="fm-mlv__tac-actions">
              <button
                type="button"
                className={`fm-mlv__tac-btn${panel === 'shouts' ? ' fm-mlv__tac-btn--active' : ''}`}
                onClick={() => setPanel(p => (p === 'shouts' ? 'none' : 'shouts'))}
              >
                Gritos
              </button>
              <button
                type="button"
                className={`fm-mlv__tac-btn${panel === 'subs' ? ' fm-mlv__tac-btn--active' : ''}`}
                onClick={() => setPanel(p => (p === 'subs' ? 'none' : 'subs'))}
              >
                Substituição
              </button>
            </div>
          )}
        </div>

        <div className="fm-mlv__xi">
          {xi.map(p => {
            const fit = liveFitness(p, fatigue);
            const rating = provisionalRating(p, events, actions);
            return (
              <div key={p.id} className="fm-mlv__slot">
                <div className="fm-mlv__avatar" style={{ background: teamColor }}>
                  {initials(p.name)}
                </div>
                <span className="fm-mlv__pos">{POS_SHORT[p.position] ?? p.position}</span>
                <span className="fm-mlv__name">{shortName(p.name)}</span>
                <span className="fm-mlv__rating">{rating.toFixed(1)}</span>
                <div className="fm-mlv__fit" title={`Condição ${fit}%`}>
                  <div
                    className="fm-mlv__fit-fill"
                    style={{ width: `${fit}%`, background: getRatingColor(fit) }}
                  />
                </div>
              </div>
            );
          })}
          {!userSideTeam && (
            <span className="fm-mlv__xi-empty">Assista a partida do seu clube para ver o elenco.</span>
          )}
        </div>
      </div>

      {/* Half-time overlay */}
      {atHT && (
        <div className="fm-mlv__modal">
          <div className="fm-mlv__modal-card">
            <h3>Intervalo</h3>
            <p className="fm-mlv__modal-score">{match.homeGoals} – {match.awayGoals}</p>
            <p className="fm-mlv__modal-hint">Ajuste gritos e substituições antes de recomeçar.</p>
            <Button onClick={onResumeSecondHalf}>
              <PlayCircle size={16} /> Iniciar 2º tempo
            </Button>
          </div>
        </div>
      )}

      {/* Shouts / Subs panels */}
      {panel !== 'none' && userSideTeam && !atHT && (
        <div className="fm-mlv__panel" role="dialog" aria-label={panel === 'shouts' ? 'Gritos' : 'Substituições'}>
          <div className="fm-mlv__panel-head">
            <h4>{panel === 'shouts' ? 'Gritos à equipa' : `Substituições (${subsUsed}/5)`}</h4>
            <button type="button" className="fm-mlv__panel-close" onClick={() => setPanel('none')} aria-label="Fechar painel">
              <X size={14} />
            </button>
          </div>
          {panel === 'shouts' && (
            <div className="fm-mlv__shouts">
              {SHOUTS.map(s => (
                <button
                  key={s.key}
                  type="button"
                  className="fm-mlv__shout"
                  onClick={() => { onShout(s.key); setPanel('none'); }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {panel === 'subs' && (
            <div className="fm-mlv__sub">
              <select
                className="fm-mlv__select"
                value={outId}
                onChange={e => setOutId(e.target.value)}
                aria-label="Jogador que sai"
              >
                <option value="">Sai…</option>
                {xi.map(p => (
                  <option key={p.id} value={p.id}>{p.position} · {p.name}</option>
                ))}
              </select>
              <select
                className="fm-mlv__select"
                value={inId}
                onChange={e => setInId(e.target.value)}
                aria-label="Jogador que entra"
              >
                <option value="">Entra…</option>
                {bench.map(p => (
                  <option key={p.id} value={p.id}>{p.position} · {p.name}</option>
                ))}
              </select>
              <Button
                disabled={!canSub}
                onClick={() => {
                  onSub(outId, inId);
                  setOutId('');
                  setInId('');
                  setPanel('none');
                }}
              >
                Trocar
              </Button>
              {subsUsed >= 5 && <span className="fm-mlv__note">Limite de 5 substituições atingido.</span>}
            </div>
          )}
        </div>
      )}
      </div>
    </div>,
    document.body,
  );
};
