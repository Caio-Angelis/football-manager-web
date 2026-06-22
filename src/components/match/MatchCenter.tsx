import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Button';
import type { MatchEvent, MatchStats } from '../../types/game';

const EVENT_ICONS: Record<string, string> = {
  goal: '⚽', shot: '👟', save: '🧤', corner: '🚩', foul: '🛑',
  yellow: '🟨', red: '🟥', substitution: '🔄',
};

const EVENT_LABELS: Record<string, string> = {
  goal: 'GOL', shot: 'Chute', save: 'Defesa', corner: 'Escanteio',
  foul: 'Falta', yellow: 'Cartão Amarelo', red: 'Cartão Vermelho', substitution: 'Substituição',
};

const MatchEventDisplay: React.FC<{ event: MatchEvent }> = ({ event }) => (
  <div className="fm-match-event">
    <span className="fm-match-event__icon">{EVENT_ICONS[event.type]}</span>
    <span className="fm-match-event__time">{event.minute}'</span>
    <span className="fm-match-event__content">
      <span className="fm-match-event__team-label">{event.team === 'home' ? 'Casa' : 'Fora'}</span>
      {' '}{EVENT_LABELS[event.type]}
      {event.player && <span className="fm-match-event__player"> - {event.player}</span>}
    </span>
  </div>
);

const MatchStatsDisplay: React.FC<{ stats: MatchStats; homeTeamName: string; awayTeamName: string }> = ({
  stats, homeTeamName, awayTeamName,
}) => (
  <div className="fm-match-stats">
    <h3>Estatísticas da Partida</h3>
    <div className="fm-stats-row">
      <div className="fm-stats-row__team">{homeTeamName}</div>
      <div className="fm-stats-row__bar">
        <span className="fm-stats-row__xg-value">xG: {stats.homeXG.toFixed(2)}</span>
        <div className="fm-stats-row__progress">
          <div className="fm-stats-row__progress-fill" style={{ width: `${stats.homePossession}%` }} />
        </div>
        <span className="fm-stats-row__xg-value">xG: {stats.awayXG.toFixed(2)}</span>
      </div>
      <div className="fm-stats-row__team">{awayTeamName}</div>
    </div>
    <div className="fm-stats-row">
      <span>Posse</span>
      <span>{stats.homePossession}% — {stats.awayPossession}%</span>
    </div>
    <div className="fm-stats-row">
      <span>Chutes</span>
      <span>{stats.homeShots} — {stats.awayShots}</span>
    </div>
    <div className="fm-stats-row">
      <span>No alvo</span>
      <span>{stats.homeShotsOnTarget} — {stats.awayShotsOnTarget}</span>
    </div>
    <div className="fm-stats-row">
      <span>Passes</span>
      <span>{stats.homePasses} — {stats.awayPasses}</span>
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

export const MatchCenter: React.FC = () => {
  const { matches, teams, selectedTeam, currentWeek, currentSeason, simulateMatch, advanceWeek, applyMatchIntervention, generateLiveMatchMinute } = useGameStore();
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number | null>(null);
  const [liveMatchWatching, setLiveMatchWatching] = useState<number | null>(null);
  const [liveMatchTimer, setLiveMatchTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  // Live match auto-advance effect
  useEffect(() => {
    if (liveMatchWatching !== null && matches[liveMatchWatching]?.isLive) {
      const timer = setInterval(() => {
        setLiveMatchTimer(timer);
        generateLiveMatchMinute(liveMatchWatching);
      }, 2000); // Advance every 2 seconds
      setLiveMatchTimer(timer);
      return () => clearInterval(timer);
    } else {
      // Match finished or no longer live
      setLiveMatchTimer(null);
    }
  }, [liveMatchWatching, liveMatchWatching !== null ? matches[liveMatchWatching]?.isLive : false]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (liveMatchTimer) {
        clearInterval(liveMatchTimer);
      }
    };
  }, [liveMatchTimer]);

  const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name ?? teamId;
  const isUserMatch = (match: typeof matches[0]) =>
    selectedTeam && (match.homeTeam === selectedTeam || match.awayTeam === selectedTeam);

  const userPendingMatch = matches.findIndex(m => isUserMatch(m) && !m.completed);

  const getMatchData = (match: typeof matches[0]) => {
    if (match.isLive) {
      return {
        isLive: true,
        minute: match.liveMinute,
        stats: match.liveStats,
        events: match.liveEvents,
      };
    }
    return {
      isLive: false,
      minute: null,
      stats: match.stats,
      events: match.events,
    };
  };

  return (
    <div className="fm-match-center">
      <header className="fm-match-center__header">
        <h1>Centro de Partidas</h1>
        <div className="fm-match-center__week">
          <span>Temporada {currentSeason} — Semana {currentWeek}</span>
        </div>
      </header>

      <div className="fm-match-center__matches">
        <h2>Próximas Partidas</h2>
        {matches.length === 0 ? (
          <div className="fm-empty">Nenhuma partida agendada. Avance a semana para gerar partidas.</div>
        ) : (
          <div className="fm-match-list">
            {matches.map((match, index) => {
              const isUser = isUserMatch(match);
              const isCompleted = match.completed;
              const { isLive: isMatchLive, minute: liveMin } = getMatchData(match);
              return (
                <div
                  key={index}
                  className={`fm-match ${isUser ? 'fm-match--user' : ''} ${isCompleted ? 'fm-match--completed' : ''} ${isMatchLive ? 'fm-match--live' : ''} ${selectedMatchIndex === index ? 'fm-match--selected' : ''}`}
                >
                  <div className="fm-match__teams">
                    <div className="fm-match__team">
                      <div className="fm-match__team-name">{getTeamName(match.homeTeam)}</div>
                      <div className="fm-match__team-score">{isCompleted || isMatchLive ? match.homeGoals : '-'}</div>
                    </div>
                    <div className="fm-match__vs">VS</div>
                    <div className="fm-match__team">
                      <div className="fm-match__team-name">{getTeamName(match.awayTeam)}</div>
                      <div className="fm-match__team-score">{isCompleted || isMatchLive ? match.awayGoals : '-'}</div>
                    </div>
                  </div>
                  {isMatchLive && (
                    <div className="fm-match__status">
                      <span className="fm-match__status-text">{liveMin}' — Ao Vivo</span>
                    </div>
                  )}
                  {!isCompleted && !isMatchLive && isUser && (
                    <div className="fm-match__action">
                      <Button onClick={() => {
                        simulateMatch(index);
                        setLiveMatchWatching(index);
                      }}>
                        {match.isLive ? 'Reativar Partida' : 'Simular Partida'}
                      </Button>
                    </div>
                  )}
                  {isCompleted && (
                    <button className="fm-match__details-btn" onClick={() => setSelectedMatchIndex(index)}>
                      Ver Detalhes
                    </button>
                  )}
                  {isMatchLive && (
                    <div className="fm-match__action">
                      <Button onClick={() => {
                        generateLiveMatchMinute(index);
                      }}>
                        Avançar Minuto
                      </Button>
                      <Button onClick={() => {
                        generateLiveMatchMinute(index);
                        setLiveMatchWatching(null);
                      }} style={{ marginLeft: 8 }}>
                        Finalizar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Match View */}
      {liveMatchWatching !== null && matches[liveMatchWatching]?.isLive && (
        <div className="fm-match-live-view">
          <div className="fm-match-live-view__content">
            <div className="fm-match-live-view__header">
              <h2>Partida ao Vivo</h2>
              <div className="fm-match-live-view__minute">
                <span>{matches[liveMatchWatching].liveMinute}' / 90'</span>
              </div>
            </div>
            <div className="fm-match-live-view__score">
              <span>{matches[liveMatchWatching].homeGoals}</span>
              <span>-</span>
              <span>{matches[liveMatchWatching].awayGoals}</span>
            </div>
            {matches[liveMatchWatching].liveEvents && matches[liveMatchWatching].liveEvents.length > 0 && (
              <div className="fm-match-live-view__events">
                <h3>Eventos da Partida</h3>
                <div className="fm-match-events-list">
                  {matches[liveMatchWatching].liveEvents!.map((event, i) => (
                    <MatchEventDisplay key={i} event={event} />
                  ))}
                </div>
              </div>
            )}
            {matches[liveMatchWatching].liveStats && (
              <MatchStatsDisplay
                stats={matches[liveMatchWatching].liveStats!}
                homeTeamName={getTeamName(matches[liveMatchWatching].homeTeam)}
                awayTeamName={getTeamName(matches[liveMatchWatching].awayTeam)}
              />
            )}
            <LiveDataHub
              stats={matches[liveMatchWatching].liveStats}
              events={matches[liveMatchWatching].liveEvents ?? []}
              isLive={true}
              minute={matches[liveMatchWatching].liveMinute}
            />
          </div>
        </div>
      )}

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
            {matches[selectedMatchIndex].events && (
              <div className="fm-match-details-modal__events">
                <h3>Eventos</h3>
                <div className="fm-match-events-list">
                  {matches[selectedMatchIndex].events!.map((event, i) => (
                    <MatchEventDisplay key={i} event={event} />
                  ))}
                </div>
              </div>
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
          </div>
        </div>
      )}

      {userPendingMatch !== -1 && !matches[userPendingMatch]?.isLive && (
        <div className="fm-match-center__intervention">
          <h3>Intervenção</h3>
          <div className="fm-match-center__intervention-buttons">
            <Button onClick={() => applyMatchIntervention(userPendingMatch, 'substitution')}>
              Substituição
            </Button>
            <Button onClick={() => applyMatchIntervention(userPendingMatch, 'shout')}>
              Gritos à Equipa
            </Button>
          </div>
        </div>
      )}

      <div className="fm-match-center__controls">
        <Button onClick={advanceWeek}>Avançar Semana</Button>
      </div>

      <div className="fm-match-center__standings">
        <h2>Classificação</h2>
        <table className="fm-standings-table">
          <thead>
            <tr>
              <th>#</th><th>Time</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th>
              <th>GM</th><th>GS</th><th>SG</th>
            </tr>
          </thead>
          <tbody>
            {[...teams].sort((a, b) => b.points - a.points).map((t, index) => (
              <tr key={t.id} className={t.id === selectedTeam ? 'fm-standings-table--user' : ''}>
                <td>{index + 1}</td><td>{t.name}</td><td>{t.points}</td><td>{t.played}</td>
                <td>{t.won}</td><td>{t.drawn}</td><td>{t.lost}</td>
                <td>{t.goalsFor}</td><td>{t.goalsAgainst}</td>
                <td>{t.goalsFor - t.goalsAgainst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
