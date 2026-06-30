import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { getFullName } from '../../utils/player';
import {
  calculateTicketRevenue,
  calculateSponsorshipRevenue,
  calculateBroadcastingRevenue,
  calculateFacilityCosts,
  weeklyWages,
} from '../../utils/finance';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, Tooltip,
} from 'recharts';
import {
  Users, Calendar, BarChart3, ArrowLeftRight, ClipboardList,
  Dumbbell, Activity, Inbox, Wallet,
  ArrowRight, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Trophy, Heart, Zap, Target, Shield, Footprints,
} from 'lucide-react';

const FORM_LABELS: Record<string, string> = { W: 'V', D: 'E', L: 'D' };
const FORM_COLORS: Record<string, string> = { W: '#3fbf6b', D: '#e0b341', L: '#e25c52' };
const FORM_SCORE: Record<string, number> = { W: 3, D: 1, L: 0 };

const ZONE_COLORS: Record<string, string> = {
  title: '#6d5ef0',
  europe: '#e0b341',
  safe: '#3fbf6b',
  relegation: '#e25c52',
};

const EXPECTATION_LABELS: Record<string, string> = {
  relegation: 'Evitar rebaixamento',
  midtable: 'Meio da tabela',
  top4: 'G4',
  title: 'Título',
};

function Gauge({ value, max, label, color, icon }: { value: number; max: number; label: string; color: string; icon: React.ReactNode }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="fm-dash__gauge">
      <svg viewBox="0 0 72 72" className="fm-dash__gauge-svg">
        <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle
          cx="36" cy="36" r="28" fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="fm-dash__gauge-center">
        <span className="fm-dash__gauge-icon">{icon}</span>
        <span className="fm-dash__gauge-value">{Math.round(value)}</span>
      </div>
      <span className="fm-dash__gauge-label">{label}</span>
    </div>
  );
}

function FormBadge({ result }: { result: string }) {
  return (
    <span
      className="fm-dash__form-badge"
      style={{ background: FORM_COLORS[result] ?? '#555' }}
    >
      {FORM_LABELS[result] ?? result}
    </span>
  );
}

function StatBar({ label, homeValue, awayValue, homeLabel, awayLabel }: {
  label: string; homeValue: number; awayValue: number; homeLabel: string; awayLabel: string;
}) {
  const total = homeValue + awayValue || 1;
  const homePct = (homeValue / total) * 100;
  return (
    <div className="fm-dash__statbar">
      <span className="fm-dash__statbar-home">{homeLabel}</span>
      <div className="fm-dash__statbar-track">
        <div className="fm-dash__statbar-fill" style={{ width: `${homePct}%` }} />
        <span className="fm-dash__statbar-label">{label}</span>
      </div>
      <span className="fm-dash__statbar-away">{awayLabel}</span>
    </div>
  );
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    selectedTeam, teams, matches, leagueTable, currentWeek, currentSeason,
    advanceWeek, isAdvancing, inbox, fanMood, boardSatisfaction,
  } = useGameStore();

  const team = teams.find(t => t.id === selectedTeam);

  const data = useMemo(() => {
    if (!team) return null;

    const squad = team.squad;
    const avgMorale = squad.reduce((s, p) => s + p.morale, 0) / (squad.length || 1);
    const avgFitness = squad.reduce((s, p) => s + p.fitness, 0) / (squad.length || 1);
    const avgForm = squad.reduce((s, p) => s + p.form, 0) / (squad.length || 1);
    const injuredPlayers = squad.filter(p => p.injury?.active);
    const topScorers = [...squad].sort((a, b) => b.seasonGoals - a.seasonGoals).slice(0, 3);
    const topAssists = [...squad].sort((a, b) => b.seasonAssists - a.seasonAssists).slice(0, 3);
    const avgCA = squad.reduce((s, p) => s + p.currentAbility, 0) / (squad.length || 1);

    const ticketRev = calculateTicketRevenue(team.reputation);
    const sponsorRev = calculateSponsorshipRevenue(team.reputation);
    const broadcastRev = calculateBroadcastingRevenue(team.reputation);
    const facilityCosts = calculateFacilityCosts(team.facilitiesLevel);
    const wageCost = weeklyWages(team.wageBill);
    const weeklyIncome = ticketRev + sponsorRev + broadcastRev;
    const weeklyExpenses = wageCost + facilityCosts;
    const weeklyBalance = weeklyIncome - weeklyExpenses;

    const projection = Array.from({ length: 8 }, (_, i) => ({
      week: currentWeek + i,
      budget: parseFloat((team.budget + weeklyBalance * i).toFixed(2)),
    }));

    const userStandings = leagueTable.find(s => s.teamId === selectedTeam);
    const miniTable = leagueTable.slice(0, 5);
    if (userStandings && userStandings.position > 5) {
      miniTable.push(userStandings);
    }

    const nextMatch = matches.find(m =>
      !m.completed && (m.homeTeam === selectedTeam || m.awayTeam === selectedTeam)
    );
    const opponentId = nextMatch
      ? (nextMatch.homeTeam === selectedTeam ? nextMatch.awayTeam : nextMatch.homeTeam)
      : null;
    const opponent = opponentId ? teams.find(t => t.id === opponentId) : null;
    const isHome = nextMatch?.homeTeam === selectedTeam;

    const unreadInbox = inbox.filter(m => !m.read).length;

    return {
      team, squad, avgMorale, avgFitness, avgForm, avgCA,
      injuredPlayers, topScorers, topAssists,
      weeklyIncome, weeklyExpenses, weeklyBalance, projection,
      userStandings, miniTable, nextMatch, opponent, isHome,
      unreadInbox,
    };
  }, [team, leagueTable, matches, selectedTeam, teams, currentWeek, inbox]);

  if (!team || !data) {
    return (
      <div className="fms-page">
        <div style={{ margin: 'auto', color: 'var(--t-text-2)' }}>Selecione um time.</div>
      </div>
    );
  }

  const {
    avgMorale, avgFitness, avgForm, avgCA,
    injuredPlayers, topScorers, topAssists,
    weeklyIncome, weeklyExpenses, weeklyBalance, projection,
    userStandings, miniTable, nextMatch, opponent, isHome,
    unreadInbox,
  } = data;

  const formScore = (team.leagueForm ?? []).reduce((s, f) => s + (FORM_SCORE[f] ?? 0), 0);
  const formTrend = formScore >= 10 ? 'up' : formScore >= 5 ? 'flat' : 'down';
  const goalDiff = team.goalsFor - team.goalsAgainst;
  const expectationLabel = EXPECTATION_LABELS[team.boardExpectation] ?? team.boardExpectation;

  const userStrength = team.squad
    .filter(p => team.startingXI.includes(p.id))
    .reduce((s, p) => s + p.currentAbility, 0) / 11;
  const oppStrength = opponent
    ? opponent.squad
        .filter(p => opponent.startingXI.includes(p.id))
        .reduce((s, p) => s + p.currentAbility, 0) / 11
    : 0;

  return (
    <div className="fms-page">
      <header className="fms-topbar">
        <div className="fms-topbar__left">
          <div className="fms-club-logo">{team.name.charAt(0)}</div>
          <div className="fms-title-block">
            <span className="fms-title">Dashboard</span>
            <span className="fms-subtitle">{team.name} — {team.division}</span>
          </div>
        </div>
        <div className="fms-topbar__right">
          <div className="fms-date">
            <div className="fms-date__main">Temporada {currentSeason}</div>
            <div className="fms-date__sub">Semana {currentWeek}</div>
          </div>
          <button className="fms-continue" onClick={advanceWeek} disabled={isAdvancing}>
            {isAdvancing ? 'Processando...' : 'Continuar'}
            <ArrowRight size={15} />
          </button>
        </div>
      </header>

      <div className="fms-body--scroll fm-dash">
        {/* ===== ROW 1: Hero + Next Match + Quick Actions ===== */}
        <div className="fm-dash__row fm-dash__row--1">
          {/* Hero Card */}
          <div className="fm-dash__card fm-dash__hero">
            <div className="fm-dash__hero-top">
              <div className="fm-dash__hero-crest" style={{ borderColor: ZONE_COLORS[userStandings?.zone ?? 'safe'] }}>
                {team.name.charAt(0)}
              </div>
              <div className="fm-dash__hero-info">
                <h2 className="fm-dash__hero-name">{team.name}</h2>
                <span className="fm-dash__hero-meta">{team.formation} · {team.tactic} · {team.teamMentality}</span>
                <span className="fm-dash__hero-meta">Reputação {team.reputation}/100 · {expectationLabel}</span>
              </div>
            </div>
            <div className="fm-dash__hero-stats">
              <div className="fm-dash__hero-stat">
                <span className="fm-dash__hero-stat-value">{userStandings?.position ?? team.leaguePosition}º</span>
                <span className="fm-dash__hero-stat-label">Posição</span>
              </div>
              <div className="fm-dash__hero-stat">
                <span className="fm-dash__hero-stat-value">{team.points}</span>
                <span className="fm-dash__hero-stat-label">Pontos</span>
              </div>
              <div className="fm-dash__hero-stat">
                <span className="fm-dash__hero-stat-value">{team.played}</span>
                <span className="fm-dash__hero-stat-label">Jogos</span>
              </div>
              <div className="fm-dash__hero-stat">
                <span className="fm-dash__hero-stat-value" style={{ color: goalDiff >= 0 ? 'var(--t-green)' : 'var(--t-red)' }}>
                  {goalDiff >= 0 ? '+' : ''}{goalDiff}
                </span>
                <span className="fm-dash__hero-stat-label">Saldo</span>
              </div>
            </div>
            <div className="fm-dash__hero-form">
              {(team.leagueForm ?? []).length > 0 ? (
                <>
                  <span className="fm-dash__hero-form-label">Últimos jogos</span>
                  <div className="fm-dash__form-badges">
                    {(team.leagueForm ?? []).map((f, i) => <FormBadge key={i} result={f} />)}
                  </div>
                  <span className="fm-dash__hero-form-trend">
                    {formTrend === 'up' ? <TrendingUp size={14} style={{ color: 'var(--t-green)' }} />
                      : formTrend === 'down' ? <TrendingDown size={14} style={{ color: 'var(--t-red)' }} />
                      : <Minus size={14} style={{ color: 'var(--t-text-2)' }} />}
                    <span style={{ color: formTrend === 'up' ? 'var(--t-green)' : formTrend === 'down' ? 'var(--t-red)' : 'var(--t-text-2)' }}>
                      {formScore}/15 pts
                    </span>
                  </span>
                </>
              ) : (
                <span className="fm-dash__hero-form-empty">Sem jogos ainda</span>
              )}
            </div>
          </div>

          {/* Next Match Card */}
          <div className="fm-dash__card fm-dash__next-match">
            <h3 className="fm-dash__card-title">
              <Calendar size={14} /> Próxima Partida
            </h3>
            {nextMatch && opponent ? (
              <>
                <div className="fm-dash__match-teams">
                  <div className={`fm-dash__match-team ${isHome ? 'fm-dash__match-team--home' : ''}`}>
                    <span className="fm-dash__match-team-name">{isHome ? team.name : opponent.name}</span>
                    <span className="fm-dash__match-team-tag">{isHome ? 'Casa' : 'Fora'}</span>
                  </div>
                  <span className="fm-dash__match-vs">VS</span>
                  <div className={`fm-dash__match-team ${!isHome ? 'fm-dash__match-team--home' : ''}`}>
                    <span className="fm-dash__match-team-name">{isHome ? opponent.name : team.name}</span>
                    <span className="fm-dash__match-team-tag">{isHome ? 'Fora' : 'Casa'}</span>
                  </div>
                </div>
                <div className="fm-dash__match-strength">
                  <StatBar
                    label="Força (CA médio)"
                    homeValue={userStrength}
                    awayValue={oppStrength}
                    homeLabel={Math.round(userStrength).toString()}
                    awayLabel={Math.round(oppStrength).toString()}
                  />
                </div>
                <div className="fm-dash__match-opp-info">
                  <span>Formação: {opponent.formation}</span>
                  <span>Tática: {opponent.tactic}</span>
                  <span>Rep: {opponent.reputation}/100</span>
                </div>
                <button className="fm-dash__match-btn" onClick={() => navigate('/partidas')}>
                  Ir para Partidas <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <div className="fm-dash__next-match-empty">
                <Calendar size={32} style={{ opacity: 0.3 }} />
                <p>Nenhuma partida agendada</p>
                <button className="fm-dash__match-btn" onClick={advanceWeek} disabled={isAdvancing}>
                  Avançar Semana <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="fm-dash__card fm-dash__quick-actions">
            <h3 className="fm-dash__card-title">
              <Zap size={14} /> Ações Rápidas
            </h3>
            <div className="fm-dash__quick-grid">
              <button className="fm-dash__quick-btn" onClick={() => navigate('/elenco')}>
                <Users size={18} /> <span>Elenco</span>
              </button>
              <button className="fm-dash__quick-btn" onClick={() => navigate('/taticas')}>
                <ClipboardList size={18} /> <span>Táticas</span>
              </button>
              <button className="fm-dash__quick-btn" onClick={() => navigate('/transferencias')}>
                <ArrowLeftRight size={18} /> <span>Transferências</span>
              </button>
              <button className="fm-dash__quick-btn" onClick={() => navigate('/treino')}>
                <Dumbbell size={18} /> <span>Treino</span>
              </button>
              <button className="fm-dash__quick-btn" onClick={() => navigate('/classificacao')}>
                <BarChart3 size={18} /> <span>Tabela</span>
              </button>
              <button className="fm-dash__quick-btn fm-dash__quick-btn--badge" onClick={() => navigate('/caixa-de-entrada')}>
                <Inbox size={18} /> <span>Inbox</span>
                {unreadInbox > 0 && <span className="fm-dash__quick-badge">{unreadInbox}</span>}
              </button>
            </div>
          </div>
        </div>

        {/* ===== ROW 2: Squad Health + Financial + Mini Table ===== */}
        <div className="fm-dash__row fm-dash__row--2">
          {/* Squad Health */}
          <div className="fm-dash__card fm-dash__squad-health">
            <h3 className="fm-dash__card-title">
              <Heart size={14} /> Saúde do Elenco
            </h3>
            <div className="fm-dash__gauges">
              <Gauge value={avgMorale} max={100} label="Moral" color="#3fbf6b" icon={<Heart size={14} />} />
              <Gauge value={avgFitness} max={100} label="Físico" color="#3d7bf5" icon={<Zap size={14} />} />
              <Gauge value={avgForm} max={100} label="Forma" color="#e0b341" icon={<TrendingUp size={14} />} />
              <Gauge value={avgCA} max={200} label="CA Médio" color="#6d5ef0" icon={<Target size={14} />} />
            </div>
            <div className="fm-dash__squad-summary">
              <div className="fm-dash__squad-summary-item">
                <Users size={14} /> <span>{team.squad.length} jogadores</span>
              </div>
              <div className="fm-dash__squad-summary-item fm-dash__squad-summary-item--alert">
                <AlertTriangle size={14} /> <span>{injuredPlayers.length} lesionados</span>
              </div>
            </div>
          </div>

          {/* Financial Snapshot */}
          <div className="fm-dash__card fm-dash__finance">
            <h3 className="fm-dash__card-title">
              <Wallet size={14} /> Financeiro
            </h3>
            <div className="fm-dash__finance-summary">
              <div className="fm-dash__finance-stat">
                <span className="fm-dash__finance-value">R$ {team.budget.toFixed(1)}M</span>
                <span className="fm-dash__finance-label">Orçamento</span>
              </div>
              <div className="fm-dash__finance-stat">
                <span className="fm-dash__finance-value" style={{ color: weeklyBalance >= 0 ? 'var(--t-green)' : 'var(--t-red)' }}>
                  {weeklyBalance >= 0 ? '+' : ''}R$ {weeklyBalance.toFixed(2)}M/sem
                </span>
                <span className="fm-dash__finance-label">Balanço Semanal</span>
              </div>
            </div>
            <div className="fm-dash__finance-chart">
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={projection} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="dashFinanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={weeklyBalance >= 0 ? '#3fbf6b' : '#e25c52'} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={weeklyBalance >= 0 ? '#3fbf6b' : '#e25c52'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="week" tick={{ fill: '#6b7080', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1b1e26', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9aa0ad' }}
                    labelFormatter={(w) => `Semana ${w}`}
                    formatter={(v: any) => [`R$ ${v}M`, 'Orçamento']}
                  />
                  <Area
                    type="monotone" dataKey="budget" stroke={weeklyBalance >= 0 ? '#3fbf6b' : '#e25c52'}
                    strokeWidth={2} fill="url(#dashFinanceGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="fm-dash__finance-detail">
              <span>Receitas: R$ {weeklyIncome.toFixed(2)}M/sem</span>
              <span>Despesas: R$ {weeklyExpenses.toFixed(2)}M/sem</span>
            </div>
            <button className="fm-dash__card-link" onClick={() => navigate('/financas')}>
              Ver detalhes <ArrowRight size={12} />
            </button>
          </div>

          {/* Mini League Table */}
          <div className="fm-dash__card fm-dash__mini-table">
            <h3 className="fm-dash__card-title">
              <Trophy size={14} /> Classificação
            </h3>
            <table className="fm-dash__table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Time</th>
                  <th>P</th>
                  <th>J</th>
                  <th>SG</th>
                </tr>
              </thead>
              <tbody>
                {miniTable.map((s, i) => {
                  const isUser = s.teamId === selectedTeam;
                  const showGap = i > 0 && miniTable[i - 1].teamId !== s.teamId && s.position > 5;
                  return (
                    <React.Fragment key={s.teamId}>
                      {showGap && (
                        <tr className="fm-dash__table-gap"><td colSpan={5}>···</td></tr>
                      )}
                      <tr className={`fm-dash__table-row ${isUser ? 'fm-dash__table-row--user' : ''}`}>
                        <td>
                          <span className="fm-dash__table-pos" style={{ borderLeftColor: ZONE_COLORS[s.zone ?? 'safe'] }}>
                            {s.position}
                          </span>
                        </td>
                        <td className="fm-dash__table-name">{s.teamName}</td>
                        <td>{s.points}</td>
                        <td>{s.played}</td>
                        <td style={{ color: s.goalDifference >= 0 ? 'var(--t-green)' : 'var(--t-red)' }}>
                          {s.goalDifference >= 0 ? '+' : ''}{s.goalDifference}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <button className="fm-dash__card-link" onClick={() => navigate('/classificacao')}>
              Tabela completa <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ===== ROW 3: Top Performers + Injury Ward + Fan Mood ===== */}
        <div className="fm-dash__row fm-dash__row--3">
          {/* Top Performers */}
          <div className="fm-dash__card fm-dash__performers">
            <h3 className="fm-dash__card-title">
              <Target size={14} /> Artilheiros da Temporada
            </h3>
            <div className="fm-dash__performers-list">
              {topScorers.map((p, i) => (
                <div key={p.id} className="fm-dash__performer">
                  <span className="fm-dash__performer-rank" style={{ background: i === 0 ? '#e0b341' : i === 1 ? '#9aa0ad' : i === 2 ? '#cd7f32' : 'transparent' }}>
                    {i + 1}
                  </span>
                  <span className="fm-dash__performer-name">{getFullName(p)}</span>
                  <span className="fm-dash__performer-pos">{p.position}</span>
                  <span className="fm-dash__performer-stat">
                    <Footprints size={12} /> {p.seasonGoals} gols
                  </span>
                </div>
              ))}
            </div>
            <h3 className="fm-dash__card-title fm-dash__card-title--mt">
              <Shield size={14} /> Líder de Assistências
            </h3>
            <div className="fm-dash__performers-list">
              {topAssists.map((p, i) => (
                <div key={p.id} className="fm-dash__performer">
                  <span className="fm-dash__performer-rank" style={{ background: i === 0 ? '#3fbf6b' : 'transparent' }}>
                    {i + 1}
                  </span>
                  <span className="fm-dash__performer-name">{getFullName(p)}</span>
                  <span className="fm-dash__performer-pos">{p.position}</span>
                  <span className="fm-dash__performer-stat">
                    <Target size={12} /> {p.seasonAssists} ass
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Injury Ward */}
          <div className="fm-dash__card fm-dash__injuries">
            <h3 className="fm-dash__card-title">
              <AlertTriangle size={14} /> Enfermaria
            </h3>
            {injuredPlayers.length > 0 ? (
              <div className="fm-dash__injury-list">
                {injuredPlayers.map(p => {
                  const progress = p.injury!.totalDays > 0
                    ? Math.max(0, Math.min(100, Math.round(100 - (p.injury!.daysRemaining / p.injury!.totalDays) * 100)))
                    : 100;
                  return (
                    <div key={p.id} className="fm-dash__injury-item">
                      <div className="fm-dash__injury-header">
                        <span className="fm-dash__injury-name">{getFullName(p)}</span>
                        <span className={`fm-dash__injury-severity fm-dash__injury-severity--${p.injury!.severity}`}>
                          {p.injury!.severity}
                        </span>
                      </div>
                      <div className="fm-dash__injury-bar">
                        <div className="fm-dash__injury-bar-fill" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="fm-dash__injury-days">
                        {p.injury!.daysRemaining} dias restantes · {progress}% recuperado
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="fm-dash__injury-empty">
                <Heart size={32} style={{ color: 'var(--t-green)', opacity: 0.5 }} />
                <p>Elenco completo! Sem lesões.</p>
              </div>
            )}
          </div>

          {/* Club Mood & Atmosphere */}
          <div className="fm-dash__card fm-dash__atmosphere">
            <h3 className="fm-dash__card-title">
              <Activity size={14} /> Atmosfera do Clube
            </h3>
            <div className="fm-dash__atmo-item">
              <span className="fm-dash__atmo-label">Torcida</span>
              <div className="fm-dash__atmo-bar">
                <div className="fm-dash__atmo-bar-fill" style={{
                  width: `${Math.max(0, Math.min(100, fanMood?.value ?? 50))}%`,
                  background: (fanMood?.value ?? 50) >= 60 ? '#3fbf6b' : (fanMood?.value ?? 50) >= 40 ? '#e0b341' : '#e25c52',
                }} />
              </div>
              <span className="fm-dash__atmo-value">{fanMood?.sentiment ?? 'neutral'}</span>
            </div>
            <div className="fm-dash__atmo-item">
              <span className="fm-dash__atmo-label">Diretoria</span>
              <div className="fm-dash__atmo-bar">
                <div className="fm-dash__atmo-bar-fill" style={{
                  width: `${Math.max(0, Math.min(100, ((boardSatisfaction ?? 0) + 100) / 2))}%`,
                  background: (boardSatisfaction ?? 0) >= 20 ? '#3fbf6b' : (boardSatisfaction ?? 0) >= -20 ? '#e0b341' : '#e25c52',
                }} />
              </div>
              <span className="fm-dash__atmo-value">
                {(boardSatisfaction ?? 0) >= 50 ? 'Excelente' :
                 (boardSatisfaction ?? 0) >= 20 ? 'Satisfeita' :
                 (boardSatisfaction ?? 0) >= -20 ? 'Neutra' :
                 (boardSatisfaction ?? 0) >= -50 ? 'Insatisfeita' : 'Crítica'}
              </span>
            </div>
            <div className="fm-dash__atmo-item">
              <span className="fm-dash__atmo-label">Moral do Elenco</span>
              <div className="fm-dash__atmo-bar">
                <div className="fm-dash__atmo-bar-fill" style={{
                  width: `${avgMorale}%`,
                  background: avgMorale >= 70 ? '#3fbf6b' : avgMorale >= 50 ? '#e0b341' : '#e25c52',
                }} />
              </div>
              <span className="fm-dash__atmo-value">{Math.round(avgMorale)}/100</span>
            </div>
            <div className="fm-dash__atmo-stats">
              <div className="fm-dash__atmo-stat">
                <span className="fm-dash__atmo-stat-value">{team.goalsFor}</span>
                <span className="fm-dash__atmo-stat-label">Gols Pró</span>
              </div>
              <div className="fm-dash__atmo-stat">
                <span className="fm-dash__atmo-stat-value">{team.goalsAgainst}</span>
                <span className="fm-dash__atmo-stat-label">Gols Contra</span>
              </div>
              <div className="fm-dash__atmo-stat">
                <span className="fm-dash__atmo-stat-value">{team.won}-{team.drawn}-{team.lost}</span>
                <span className="fm-dash__atmo-stat-label">V-E-D</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
