import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { getActiveRoom } from '../../api/client';
import { Button } from '../ui/Button';
import { MatchPitch2D } from './MatchPitch2D';
import { MatchLiveView } from './MatchLiveView';
import { PostMatchReportView } from './PostMatchReportView';
import { PreMatchBriefing } from './PreMatchBriefing';
import { MomentumChart } from './MomentumChart';
import { teamStrength, buildMomentum, goalsFromMatch } from '../../utils/winProbability';
import { fmtMinute } from '../../utils/matchTime';
import type { MatchEvent, MatchStats, PlayerMatchRating, Team, Match } from '../../types/game';
import { Globe, Trophy, ArrowRight, PlayCircle, Eye, ClipboardList } from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { MatchEventIcon } from '../ui/MatchEventIcon';
import { TeamCrest } from '../ui/TeamCrest';
import './MatchCenter.css';

const StatBar: React.FC<{ label: string; homeValue: number; awayValue: number; format?: (v: number) => string }> = ({
  label, homeValue, awayValue, format,
}) => {
  const total = homeValue + awayValue;
  const homePct = total > 0 ? (homeValue / total) * 100 : 50;
  const awayPct = 100 - homePct;
  const fmt = format ?? ((v: number) => String(v));
  return (
    <div className="fm-stat-bar">
      <span className="fm-stat-bar__home-value">{fmt(homeValue)}</span>
      <div className="fm-stat-bar__center">
        <span className="fm-stat-bar__label">{label}</span>
        <div className="fm-stat-bar__track">
          <div className="fm-stat-bar__fill fm-stat-bar__fill--home" style={{ width: `${homePct}%` }} />
          <div className="fm-stat-bar__fill fm-stat-bar__fill--away" style={{ width: `${awayPct}%` }} />
        </div>
      </div>
      <span className="fm-stat-bar__away-value">{fmt(awayValue)}</span>
    </div>
  );
};

const MatchStatsDisplay: React.FC<{ stats: MatchStats; homeTeamName: string; awayTeamName: string }> = ({
  stats, homeTeamName, awayTeamName,
}) => (
  <div className="fm-match-stats">
    <h3>Estatísticas da Partida</h3>
    <div className="fm-match-stats__teams">
      <span className="fm-match-stats__team-name">{homeTeamName}</span>
      <span className="fm-match-stats__vs">VS</span>
      <span className="fm-match-stats__team-name">{awayTeamName}</span>
    </div>
    <div className="fm-match-stats__xg-row">
      <span className="fm-match-stats__xg fm-match-stats__xg--home">xG {stats.homeXG.toFixed(2)}</span>
      <span className="fm-match-stats__xg-label">Expected Goals</span>
      <span className="fm-match-stats__xg fm-match-stats__xg--away">xG {stats.awayXG.toFixed(2)}</span>
    </div>
    <div className="fm-match-stats__bars">
      <StatBar label="Posse" homeValue={stats.homePossession} awayValue={stats.awayPossession} format={(v) => `${v}%`} />
      <StatBar label="Chutes" homeValue={stats.homeShots} awayValue={stats.awayShots} />
      <StatBar label="No Alvo" homeValue={stats.homeShotsOnTarget} awayValue={stats.awayShotsOnTarget} />
      <StatBar label="Passes" homeValue={stats.homePasses} awayValue={stats.awayPasses} />
    </div>
  </div>
);

const LiveDataHub: React.FC<{ stats?: MatchStats; events: MatchEvent[]; isLive: boolean; minute?: number }> = ({ stats, events, isLive, minute }) => {
  const goals = events.filter(e => e.type === 'goal').length;
  const shots = events.filter(e => e.type === 'shot' || e.type === 'goal').length;
  const lastEvent = events[events.length - 1];

  return (
    <div className="fm-live-data-hub">
      <h3>Live Data Hub</h3>
      <div className="fm-live-data-hub__indicators">
        <div className="fm-live-data-hub__indicator fm-live-data-hub__indicator--active">
          {isLive && <span className="fm-live-data-hub__pulse" />}
          <span>{isLive ? `⚡ Ao vivo - ${minute}'` : stats ? `${stats.homePossession}% posse casa` : 'Aguardando dados'}</span>
        </div>
        <div className="fm-live-data-hub__indicator">
          <span>Gols: {goals} | Chutes: {shots}</span>
        </div>
        <div className="fm-live-data-hub__indicator">
          <span>{lastEvent ? `${lastEvent.minute}' — ${lastEvent.description ?? lastEvent.type}` : 'Sem eventos'}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PLAYER RATING BADGE (Tarefa 2.2)
// ============================================================

const RATING_COLORS: Record<string, string> = {
  excellent: '#22c55e', // green - 9+
  good: '#84cc10',      // lime - 7-8
  average: '#eab308',   // yellow - 5-6
  poor: '#f9731b',      // orange - 3-4
  bad: '#ef4444',       // red - 1-2
};

const RATING_LABELS: Record<string, string> = {
  excellent: 'Excelente',
  good: 'Bom',
  average: 'Médio',
  poor: 'Fraco',
  bad: 'Mau',
};

const PlayerRatingBadge: React.FC<{ rating: PlayerMatchRating }> = ({ rating }) => {
  let colorClass = 'poor';
  if (rating.rating >= 9) colorClass = 'excellent';
  else if (rating.rating >= 7) colorClass = 'good';
  else if (rating.rating >= 5) colorClass = 'average';
  else if (rating.rating >= 3) colorClass = 'poor';

  return (
    <div className="fm-player-rating">
      <div className="fm-player-rating__badge" style={{ borderColor: RATING_COLORS[colorClass] }}>
        <span className="fm-player-rating__score" style={{ color: RATING_COLORS[colorClass] }}>
          {rating.rating.toFixed(1)}
        </span>
      </div>
      <div className="fm-player-rating__info">
        <span className="fm-player-rating__name">{rating.playerName}</span>
        <span className="fm-player-rating__position">{rating.position}</span>
        <span className="fm-player-rating__label">{RATING_LABELS[colorClass]}</span>
      </div>
      {rating.goals > 0 && (
        <span className="fm-player-rating__goal">⚽{rating.goals}</span>
      )}
    </div>
  );
};

const PlayerRatingsDisplay: React.FC<{ ratings: PlayerMatchRating[]; bestPlayerId?: string }> = ({
  ratings, bestPlayerId,
}) => {
  const sortedRatings = [...ratings].sort((a, b) => b.rating - a.rating);
  const bestPlayer = bestPlayerId ? sortedRatings.find(r => r.playerId === bestPlayerId) : null;

  return (
    <div className="fm-player-ratings">
      <h3>Classificação dos Jogadores</h3>
      {bestPlayer && (
        <div className="fm-player-ratings__best-player">
          <span>⭐ Jogador da Partida: {bestPlayer.playerName} ({bestPlayer.rating.toFixed(1)})</span>
        </div>
      )}
      <div className="fm-player-ratings__list">
        {sortedRatings.map((r) => (
          <PlayerRatingBadge key={r.playerId} rating={r} />
        ))}
      </div>
    </div>
  );
};

// ============================================================
// MATCH-DAY REDESIGN HELPERS
// ============================================================

const FORM_CLASS: Record<string, string> = { W: 'w', V: 'w', D: 'd', E: 'd', L: 'l' };

const FormDots: React.FC<{ form?: string[] }> = ({ form }) => {
  const last = (form ?? []).slice(-5);
  if (last.length === 0) return <span className="fm-form-dots fm-form-dots--empty">sem jogos</span>;
  return (
    <span className="fm-form-dots">
      {last.map((r, i) => (
        <span key={i} className={`fm-form-dot fm-form-dot--${FORM_CLASS[r] ?? 'd'}`} title={r}>{r}</span>
      ))}
    </span>
  );
};

const ordinal = (n: number) => (n > 0 ? `${n}º` : '—');

/** Compact fixture card for the rest of the round. */
const FixtureCard: React.FC<{ home: Team; away: Team; match: Match; onClick?: () => void }> = ({ home, away, match, onClick }) => {
  const done = match.completed;
  const live = match.isLive;
  const homeWin = done && match.homeGoals > match.awayGoals;
  const awayWin = done && match.awayGoals > match.homeGoals;
  return (
    <button
      type="button"
      className={`fm-fixture ${done ? 'fm-fixture--done' : ''} ${live ? 'fm-fixture--live' : ''}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <span className={`fm-fixture__status ${live ? 'fm-fixture__status--live' : ''}`}>
        {live ? `${fmtMinute(match.liveMinute)}'` : done ? 'Fim' : 'Agendado'}
      </span>
      <div className={`fm-fixture__row ${homeWin ? 'fm-fixture__row--win' : ''}`}>
        <TeamCrest name={home.name} reputation={home.reputation} size={20} />
        <span className="fm-fixture__name">{home.name}</span>
        <span className="fm-fixture__score">{done || live ? match.homeGoals : ''}</span>
      </div>
      <div className={`fm-fixture__row ${awayWin ? 'fm-fixture__row--win' : ''}`}>
        <TeamCrest name={away.name} reputation={away.reputation} size={20} />
        <span className="fm-fixture__name">{away.name}</span>
        <span className="fm-fixture__score">{done || live ? match.awayGoals : ''}</span>
      </div>
    </button>
  );
};

const commentaryLine = (e: MatchEvent, homeName: string, awayName: string): string => {
  const t = e.team === 'home' ? homeName : awayName;
  const who = e.player ? ` — ${e.player}` : '';
  switch (e.type) {
    case 'goal': return `GOL do ${t}!${who}`;
    case 'shot': return `Finalização do ${t}${who}`;
    case 'save': return `Grande defesa contra o ${t}`;
    case 'corner': return `Escanteio para o ${t}`;
    case 'foul': return `Falta marcada contra o ${t}`;
    case 'yellow': return `Cartão amarelo — ${t}${who}`;
    case 'red': return `VERMELHO! ${t} fica com um a menos${who}`;
    case 'substitution': return `Substituição no ${t}`;
    default: return e.description ?? '';
  }
};

/** Broadcast-style narration feed built from match events. */
const CommentaryFeed: React.FC<{ events: MatchEvent[]; homeName: string; awayName: string; live?: boolean }> = ({ events, homeName, awayName, live }) => (
  <div className="fm-commentary">
    <h3 className="fm-commentary__title">
      {live && <span className="fm-commentary__live-dot" />}
      Narração
    </h3>
    <div className="fm-commentary__feed">
      {events.length === 0 ? (
        <div className="fm-commentary__empty">{live ? 'A partida vai começar…' : 'Sem lances registrados.'}</div>
      ) : (
        [...events].reverse().map((e, i) => (
          <div key={i} className={`fm-commentary__line fm-commentary__line--${e.team} ${e.type === 'goal' ? 'fm-commentary__line--goal' : ''} ${e.type === 'red' ? 'fm-commentary__line--red' : ''}`}>
            <span className="fm-commentary__min">{fmtMinute(e.minute)}'</span>
            <span className="fm-commentary__icon"><MatchEventIcon type={e.type} /></span>
            <span className="fm-commentary__text">{commentaryLine(e, homeName, awayName)}</span>
          </div>
        ))
      )}
    </div>
  </div>
);

/** League order: points, then goal difference, then goals for. */
const standingsOrder = (a: Team, b: Team) =>
  b.points - a.points ||
  (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
  b.goalsFor - a.goalsFor;

const zoneFor = (index: number, total: number) =>
  index < 4 ? 'libertadores' : index < 6 ? 'sul-americana' : index >= total - 4 ? 'rebaixamento' : '';

export const MatchCenter: React.FC = () => {
  const { matches, teams, selectedTeam, currentWeek, simulateMatch, advanceWeek, substitutePlayer, applyShout, generateLiveMatchMinute, finishMatch } = useGameStore();
  const navigate = useNavigate();
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number | null>(null);
  /** Index of the match whose live sim timer is running (may continue in background). */
  const [liveMatchWatching, setLiveMatchWatching] = useState<number | null>(null);
  /** Fullscreen classic pitch overlay — opened only via "Ver partida". */
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [matchSpeed, setMatchSpeed] = useState<number>(1);
  const [briefingMatchIndex, setBriefingMatchIndex] = useState<number | null>(null);
  // Half-time: sim pauses at 45' until the manager resumes. Ref drives the
  // interval (avoids stale closure); state drives the panel render.
  const [halfTimeResumed, setHalfTimeResumed] = useState(false);
  const halfTimeResumedRef = useRef(false);
  const setHalfTime = (resumed: boolean) => { halfTimeResumedRef.current = resumed; setHalfTimeResumed(resumed); };

  const openMatchView = (index: number) => {
    setLiveMatchWatching(index);
    setFullscreenOpen(true);
  };

  // Reset selection when week changes (new matches are generated)
  useEffect(() => {
    setSelectedMatchIndex(null);
    setLiveMatchWatching(null);
    setFullscreenOpen(false);
    setMatchSpeed(1);
    setHalfTime(false);
    // E-34: Resetar briefingMatchIndex para nao apontar para jogo errado apos virar rodada.
    setBriefingMatchIndex(null);
  }, [currentWeek]);

  // Close fullscreen when the watched match ends
  useEffect(() => {
    if (liveMatchWatching === null) return;
    const m = matches[liveMatchWatching];
    if (m && !m.isLive && m.completed) {
      setFullscreenOpen(false);
    }
  }, [liveMatchWatching, matches]);

  // Live match auto-advance effect — stable interval via ref (C7).
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isMatchLive, setIsMatchLive] = useState(false);

  useEffect(() => {
    const watching = liveMatchWatching !== null;
    const live = watching && matches[liveMatchWatching]?.isLive;
    setIsMatchLive(!!live);
  }, [liveMatchWatching, matches]);

  useEffect(() => {
    if (liveMatchWatching === null || !isMatchLive) {
      if (liveTimerRef.current) { clearInterval(liveTimerRef.current); liveTimerRef.current = null; }
      return;
    }
    const timer = setInterval(() => {
      const cur = useGameStore.getState().matches[liveMatchWatching];
      if (!cur || !cur.isLive) return;
      // Pausa no intervalo (45') até o técnico iniciar o 2º tempo
      if (cur.liveMinute >= 45 && cur.liveMinute < 90 && !halfTimeResumedRef.current) return;
      generateLiveMatchMinute(liveMatchWatching);
    }, 2000 / matchSpeed);
    liveTimerRef.current = timer;
    return () => { clearInterval(timer); liveTimerRef.current = null; };
  }, [liveMatchWatching, isMatchLive, matchSpeed, generateLiveMatchMinute]);

  const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name ?? teamId;
  const isUserMatch = (match: typeof matches[0]) =>
    selectedTeam && (match.homeTeam === selectedTeam || match.awayTeam === selectedTeam);

  // `matches` accumulates the whole season (for standings); the current round is
  // the last block of fixtures the engine appends each week. Every round has
  // floor(teams/2) games, so the current round is the tail of that size.
  const roundSize = Math.max(1, Math.floor(teams.length / 2));
  const roundStart = Math.max(0, matches.length - roundSize);

  return (
    <div className="fms-page">
      <PageHeader
        title="Centro de Partidas"
        subtitle={`Semana ${currentWeek}`}
        teamName={teams.find(t => t.id === selectedTeam)?.name}
        teamReputation={teams.find(t => t.id === selectedTeam)?.reputation}
        continueDisabled={matches.some(m => m.isLive)}
        actions={[
          { icon: <Globe size={15} />, title: 'Visão do Clube', onClick: () => navigate('/clube') },
          { icon: <Trophy size={15} />, title: 'Classificação', onClick: () => navigate('/classificacao') },
        ]}
      />

      <div className="fms-body--scroll">
        {matches.length === 0 ? (
          <div className="fm-empty">Nenhuma partida agendada. Avance a semana para gerar partidas.</div>
        ) : (
          <>
            {(() => {
              const heroIdx = matches.findIndex((m, i) => i >= roundStart && isUserMatch(m));
              if (heroIdx === -1) return null;
              const m = matches[heroIdx];
              const home = teams.find(t => t.id === m.homeTeam);
              const away = teams.find(t => t.id === m.awayTeam);
              if (!home || !away) return null;
              const userIsHome = m.homeTeam === selectedTeam;
              const done = m.completed;
              const live = m.isLive;
              return (
                <section className={`fm-matchday ${live ? 'fm-matchday--live' : ''} ${done ? 'fm-matchday--done' : ''}`}>
                  <div className="fm-matchday__top">
                    <span className="fm-matchday__tag">
                      {live ? <><span className="fm-match__live-dot" /> Ao vivo · {fmtMinute(m.liveMinute)}'</> : done ? 'Sua partida · encerrada' : 'Sua próxima partida'}
                    </span>
                    <span className="fm-matchday__venue">{userIsHome ? 'Em casa' : 'Fora de casa'}</span>
                  </div>
                  <div className="fm-matchday__teams">
                    <div className="fm-matchday__team">
                      <TeamCrest name={home.name} reputation={home.reputation} size={56} />
                      <div className="fm-matchday__team-meta">
                        <span className="fm-matchday__team-name">{home.name}</span>
                        <span className="fm-matchday__team-pos">{ordinal(home.leaguePosition)} · casa</span>
                        <FormDots form={home.leagueForm} />
                      </div>
                    </div>
                    <div className="fm-matchday__center">
                      {done || live ? (
                        <div className="fm-matchday__score">{m.homeGoals}<span>·</span>{m.awayGoals}</div>
                      ) : (
                        <div className="fm-matchday__vs">VS</div>
                      )}
                    </div>
                    <div className="fm-matchday__team fm-matchday__team--away">
                      <TeamCrest name={away.name} reputation={away.reputation} size={56} />
                      <div className="fm-matchday__team-meta">
                        <span className="fm-matchday__team-name">{away.name}</span>
                        <span className="fm-matchday__team-pos">{ordinal(away.leaguePosition)} · fora</span>
                        <FormDots form={away.leagueForm} />
                      </div>
                    </div>
                  </div>
                  <div className="fm-matchday__actions">
                    {!done && !live && (
                      <>
                        <button className="fm-btn-ghost" onClick={() => setBriefingMatchIndex(heroIdx)}>
                          <ClipboardList size={16} /> Central de Inteligência
                        </button>
                        <Button onClick={() => { setHalfTime(false); simulateMatch(heroIdx); openMatchView(heroIdx); }}>
                          <PlayCircle size={16} /> Iniciar Partida
                        </Button>
                      </>
                    )}
                    {live && (
                      <>
                        <Button onClick={() => openMatchView(heroIdx)}>
                          <Eye size={16} /> Ver partida
                        </Button>
                        <button className="fm-btn-ghost" onClick={() => { finishMatch(heroIdx); setLiveMatchWatching(null); setFullscreenOpen(false); }}>
                          Simular até o fim
                        </button>
                      </>
                    )}
                    {done && (
                      <Button onClick={() => setSelectedMatchIndex(heroIdx)}>Ver Detalhes</Button>
                    )}
                  </div>
                </section>
              );
            })()}

            {matches.slice(roundStart).some(m => !isUserMatch(m)) && (
              <>
                <h2 className="fm-section-title">Outros jogos da rodada</h2>
                <div className="fm-fixtures-grid">
                  {matches.map((match, index) => {
                    if (index < roundStart) return null;
                    if (isUserMatch(match)) return null;
                    const home = teams.find(t => t.id === match.homeTeam);
                    const away = teams.find(t => t.id === match.awayTeam);
                    if (!home || !away) return null;
                    return (
                      <FixtureCard
                        key={index}
                        home={home}
                        away={away}
                        match={match}
                        onClick={match.completed ? () => setSelectedMatchIndex(index) : undefined}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

      {/* Fullscreen classic match view — opened via "Ver partida" */}
      {fullscreenOpen && liveMatchWatching !== null && matches[liveMatchWatching]?.isLive && (() => {
        const lm = matches[liveMatchWatching];
        const home = teams.find(t => t.id === lm.homeTeam);
        const away = teams.find(t => t.id === lm.awayTeam);
        if (!home || !away) return null;
        const userTeam = teams.find(t => t.id === selectedTeam) ?? null;
        return (
          <MatchLiveView
            match={lm}
            homeTeam={home}
            awayTeam={away}
            userTeam={userTeam}
            matchSpeed={matchSpeed}
            halfTimeResumed={halfTimeResumed}
            onClose={() => setFullscreenOpen(false)}
            onSetSpeed={setMatchSpeed}
            onResumeSecondHalf={() => setHalfTime(true)}
            onSub={(outId, inId) => substitutePlayer(liveMatchWatching, outId, inId)}
            onShout={(s) => applyShout(liveMatchWatching, s)}
            onFinish={() => {
              finishMatch(liveMatchWatching);
              setLiveMatchWatching(null);
              setFullscreenOpen(false);
            }}
          />
        );
      })()}

      {selectedMatchIndex !== null && matches[selectedMatchIndex]?.completed && (
        <div className="fm-match-details-modal">
          <div className="fm-match-details-modal__content">
            <button className="fm-match-details-modal__close" onClick={() => setSelectedMatchIndex(null)}>✕</button>
            <div className="fm-match-details-modal__header">
              <h2>Detalhes da Partida</h2>
              <div className="fm-match-details-modal__score">
                <span>{matches[selectedMatchIndex].homeGoals}</span>
                <span>-</span>
                <span>{matches[selectedMatchIndex].awayGoals}</span>
              </div>
            </div>
            {(() => {
              const dm = matches[selectedMatchIndex];
              const home = teams.find(t => t.id === dm.homeTeam);
              const away = teams.find(t => t.id === dm.awayTeam);
              if (!home || !away) return null;
              return (
                <div className="fm-match-details-modal__pitch">
                  <MatchPitch2D
                    homeTeam={home}
                    awayTeam={away}
                    homeGoals={dm.homeGoals}
                    awayGoals={dm.awayGoals}
                    minute={90}
                    possession={dm.stats?.homePossession ?? 50}
                    events={dm.events ?? []}
                    isLive={false}
                    variant="classic"
                    showTacticalLines={false}
                  />
                </div>
              );
            })()}
            {matches[selectedMatchIndex].events && matches[selectedMatchIndex].events!.length > 0 && (
              <CommentaryFeed
                events={matches[selectedMatchIndex].events ?? []}
                homeName={getTeamName(matches[selectedMatchIndex].homeTeam)}
                awayName={getTeamName(matches[selectedMatchIndex].awayTeam)}
              />
            )}
            {matches[selectedMatchIndex].stats && (
              <MatchStatsDisplay
                stats={matches[selectedMatchIndex].stats!}
                homeTeamName={getTeamName(matches[selectedMatchIndex].homeTeam)}
                awayTeamName={getTeamName(matches[selectedMatchIndex].awayTeam)}
              />
            )}
            <LiveDataHub
              stats={matches[selectedMatchIndex].stats}
              events={matches[selectedMatchIndex].events ?? []}
              isLive={false}
            />
            {(() => {
              const dm = matches[selectedMatchIndex];
              const strH = teamStrength(teams.find(t => t.id === dm.homeTeam));
              const strA = teamStrength(teams.find(t => t.id === dm.awayTeam));
              const goals = goalsFromMatch(dm, false);
              const points = buildMomentum(goals, strH, strA, 90);
              return (
                <MomentumChart
                  homeName={getTeamName(dm.homeTeam)}
                  awayName={getTeamName(dm.awayTeam)}
                  points={points}
                  goals={goals}
                />
              );
            })()}
            {matches[selectedMatchIndex].playerRatings && matches[selectedMatchIndex].playerRatings!.length > 0 && (
              <PlayerRatingsDisplay
                ratings={matches[selectedMatchIndex].playerRatings!}
                bestPlayerId={matches[selectedMatchIndex].bestPlayer}
              />
            )}
            {matches[selectedMatchIndex].postMatchReport && (
              <PostMatchReportView
                report={matches[selectedMatchIndex].postMatchReport!}
                homeTeamName={getTeamName(matches[selectedMatchIndex].homeTeam)}
                awayTeamName={getTeamName(matches[selectedMatchIndex].awayTeam)}
              />
            )}
          </div>
        </div>
      )}

      {/* E-16: Esconder botão Avançar Semana no modo online */}
      {!getActiveRoom() && (
        <div className="fm-match-center__controls">
          <Button onClick={advanceWeek} disabled={matches.some(m => m.isLive)}>
            Avançar Semana
          </Button>
        </div>
      )}

      <div className="fm-match-center__standings">
        <div className="fm-mini-standings__head">
          <h2 className="fm-section-title">Classificação</h2>
          <button className="fm-btn-ghost fm-btn-ghost--sm" onClick={() => navigate('/classificacao')}>
            Tabela completa <ArrowRight size={14} />
          </button>
        </div>
        {(() => {
          const sorted = [...teams].sort(standingsOrder);
          const userPos = sorted.findIndex(t => t.id === selectedTeam);
          const rows = sorted
            .map((t, i) => ({ t, i }))
            .filter(({ i }) => i < 6 || (userPos >= 6 && (i === userPos || i === userPos - 1 || i === userPos + 1)));
          let prev = -1;
          return (
            <table className="fm-mini-standings">
              <thead>
                <tr><th>#</th><th>Time</th><th>P</th><th>J</th><th>SG</th></tr>
              </thead>
              <tbody>
                {rows.map(({ t, i }) => {
                  const zone = zoneFor(i, sorted.length);
                  const gap = i - prev > 1;
                  prev = i;
                  return (
                    <React.Fragment key={t.id}>
                      {gap && <tr className="fm-mini-standings__gap"><td colSpan={5}>···</td></tr>}
                      <tr className={`${t.id === selectedTeam ? 'fm-mini-standings__row--user' : ''}`}>
                        <td><span className={`fm-mini-standings__pos ${zone ? `fm-mini-standings__pos--${zone}` : ''}`}>{i + 1}</span></td>
                        <td className="fm-mini-standings__name">
                          <TeamCrest name={t.name} reputation={t.reputation} size={18} />
                          {t.name}
                        </td>
                        <td className="fm-mini-standings__pts">{t.points}</td>
                        <td>{t.played}</td>
                        <td>{t.goalsFor - t.goalsAgainst}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          );
        })()}
        <div className="fm-standings-legend">
          <span className="fm-standings-legend__item"><span className="fm-standings-legend__dot fm-standings-legend__dot--libertadores" />Libertadores</span>
          <span className="fm-standings-legend__item"><span className="fm-standings-legend__dot fm-standings-legend__dot--sul-americana" />Sul-Americana</span>
          <span className="fm-standings-legend__item"><span className="fm-standings-legend__dot fm-standings-legend__dot--rebaixamento" />Rebaixamento</span>
        </div>
      </div>

      </div>

      {briefingMatchIndex !== null && matches[briefingMatchIndex] && (
        <PreMatchBriefing
          matchIndex={briefingMatchIndex}
          homeTeamName={getTeamName(matches[briefingMatchIndex].homeTeam)}
          awayTeamName={getTeamName(matches[briefingMatchIndex].awayTeam)}
          onClose={() => setBriefingMatchIndex(null)}
        />
      )}
    </div>
  );
};
