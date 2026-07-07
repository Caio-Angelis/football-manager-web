import React, { useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useGameStore } from './store/gameStore';
import { TeamSelection } from './components/TeamSelection';
import { OnlineHome } from './components/online/OnlineHome';
import { RoomView } from './components/online/RoomView';
import { getActiveRoom, clearActiveRoom, apiRoomState, setRoomReady, closeRoom, forgetRoom, type PublicRoom } from './api/client';
import { OnlineTransfers } from './components/online/OnlineTransfers';
import { OnlineRoundResult } from './components/online/OnlineRoundResult';
import './components/online/online.css';
import { Button } from './components/ui/Button';
import { PageHeader } from './components/ui/PageHeader';
import { SaveSlot } from './components/saves/SaveSlot';
import { Logo } from './components/ui/Logo';
import { TacticalPitch } from './components/ui/TacticalPitch';
import { ToastContainer } from './components/ui/Toast';
import { ThemeToggle } from './components/ui/ThemeToggle';
import type { ToastData } from './types/game';
import { useRoomPolling } from './hooks/useRoomPolling';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { SeasonSummaryModal } from './components/season/SeasonSummaryModal';
import './components/dashboard/Dashboard.css';
import type { SaveSlotMetadata, Team, Match } from './types/game';
import {
  FolderOpen, Users, Calendar, BarChart3, ArrowLeftRight, ClipboardList,
  Dumbbell, Activity, Inbox, Mic, Wallet, Building2, LayoutDashboard,
  ArrowLeft, Home, Save, ArrowRight, Play,
} from 'lucide-react';

const SquadView = lazy(() => import('./components/squad/SquadView').then(m => ({ default: m.SquadView })));
const MatchCenter = lazy(() => import('./components/match/MatchCenter').then(m => ({ default: m.MatchCenter })));
const TacticsView = lazy(() => import('./components/tactics/TacticsView').then(m => ({ default: m.TacticsView })));
const InboxView = lazy(() => import('./components/inbox/InboxView').then(m => ({ default: m.InboxView })));
const TrainingView = lazy(() => import('./components/training/TrainingView').then(m => ({ default: m.TrainingView })));
const DynamicsView = lazy(() => import('./components/dynamics/DynamicsView').then(m => ({ default: m.DynamicsView })));
const FinanceView = lazy(() => import('./components/finance/FinanceView').then(m => ({ default: m.FinanceView })));
const LeagueTable = lazy(() => import('./components/league/LeagueTable').then(m => ({ default: m.LeagueTable })));
const PressCenter = lazy(() => import('./components/press/PressCenter').then(m => ({ default: m.PressCenter })));
const TransferMarketComponent = lazy(() => import('./components/transfer/TransferMarket').then(m => ({ default: m.TransferMarket })));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));

type NavIcon = React.ComponentType<{ size?: number | string }>;

const NAV_ITEMS: { id: string; path: string; label: string; icon: NavIcon; badge?: boolean; key?: string }[] = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, key: '1' },
  { id: 'squad', path: '/elenco', label: 'Elenco', icon: Users, key: '2' },
  { id: 'match', path: '/partidas', label: 'Partidas', icon: Calendar, key: '3' },
  { id: 'league', path: '/classificacao', label: 'Classificação', icon: BarChart3, key: '4' },
  { id: 'transfer', path: '/transferencias', label: 'Transferências', icon: ArrowLeftRight, key: '5' },
  { id: 'tactics', path: '/taticas', label: 'Táticas', icon: ClipboardList, key: '6' },
  { id: 'training', path: '/treino', label: 'Treino', icon: Dumbbell, key: '7' },
  { id: 'dynamics', path: '/dinamica', label: 'Dinâmica', icon: Activity, key: '8' },
  { id: 'inbox', path: '/caixa-de-entrada', label: 'Caixa de Entrada', icon: Inbox, badge: true, key: '9' },
  { id: 'press', path: '/imprensa', label: 'Imprensa', icon: Mic, key: '0' },
  { id: 'finance', path: '/financas', label: 'Finanças', icon: Wallet },
  { id: 'club', path: '/clube', label: 'Visão do Clube', icon: Building2 },
];

const LeagueTableWrapper: React.FC = () => {
  const { leagueTable, selectedTeam } = useGameStore();
  return <LeagueTable standings={leagueTable} userTeamId={selectedTeam} />;
};

const EXPECTATION_LABELS: Record<string, string> = {
  relegation: 'Evitar rebaixamento',
  midtable: 'Meio da tabela',
  top4: 'G4',
  title: 'Título',
};

const FORM_LABELS: Record<string, string> = {
  W: 'V',
  D: 'E',
  L: 'D',
};

const ClubView: React.FC<{ team?: Team }> = ({ team }) => {
  const navigate = useNavigate();
  if (!team) {
    return (
      <div className="fms-page">
        <div style={{ margin: 'auto', color: 'var(--t-text-2)' }}>Selecione um time para ver a visão do clube.</div>
      </div>
    );
  }

  const squadCount = team.squad?.length ?? 0;
  const expectationLabel = EXPECTATION_LABELS[team.boardExpectation] ?? team.boardExpectation;
  const goalDifference = team.goalsFor - team.goalsAgainst;
  const formItems = (team.leagueForm ?? []).map(f => FORM_LABELS[f] ?? f);

  return (
    <div className="fms-page">
      <PageHeader
        title="Visão do Clube"
        subtitle={`${team.name} — ${team.division}`}
        teamName={team.name}
        teamReputation={team.reputation}
        actions={[
          { icon: <Users size={15} />, title: 'Elenco', onClick: () => navigate('/elenco') },
          { icon: <BarChart3 size={15} />, title: 'Classificação', onClick: () => navigate('/classificacao') },
        ]}
      />

      <div className="fms-body--scroll">
      <div className="fm-club-view__info">
        <h2>{team.name}</h2>
        <p>{team.division} — {team.league}</p>
        <p>Reputação: {team.reputation}/100</p>
        <p>Expectativa da diretoria: {expectationLabel}</p>
      </div>

      <div className="fm-club-view__section">
        <h3 className="fm-club-view__section-title">Estrutura</h3>
        <div className="fm-club-view__grid">
          <div className="fm-club-view__stat">
            <span className="fm-club-view__stat-label">Instalações</span>
            <span className="fm-club-view__stat-value">Nível {team.facilitiesLevel}</span>
          </div>
          <div className="fm-club-view__stat">
            <span className="fm-club-view__stat-label">Base Juvenil</span>
            <span className="fm-club-view__stat-value">Nível {team.youthFacilitiesLevel}</span>
          </div>
          <div className="fm-club-view__stat">
            <span className="fm-club-view__stat-label">Scouting</span>
            <span className="fm-club-view__stat-value">Nível {team.scoutingLevel}</span>
          </div>
          <div className="fm-club-view__stat">
            <span className="fm-club-view__stat-label">Equipa Técnica</span>
            <span className="fm-club-view__stat-value">Nível {team.staffLevel}</span>
          </div>
        </div>
      </div>

      <div className="fm-club-view__section">
        <h3 className="fm-club-view__section-title">Finanças</h3>
        <div className="fm-club-view__grid">
          <div className="fm-club-view__stat">
            <span className="fm-club-view__stat-label">Orçamento</span>
            <span className="fm-club-view__stat-value">R$ {team.budget.toFixed(1)}M</span>
          </div>
          <div className="fm-club-view__stat">
            <span className="fm-club-view__stat-label">Folha Salarial</span>
            <span className="fm-club-view__stat-value">R$ {team.wageBill.toFixed(1)}M</span>
          </div>
          <div className="fm-club-view__stat">
            <span className="fm-club-view__stat-label">Jogadores</span>
            <span className="fm-club-view__stat-value">{squadCount}</span>
          </div>
        </div>
      </div>

      <div className="fm-club-view__section">
        <h3 className="fm-club-view__section-title">Desempenho</h3>
        <div className="fm-club-view__grid">
          <div className="fm-club-view__stat">
            <span className="fm-club-view__stat-label">Posição</span>
            <span className="fm-club-view__stat-value">{team.leaguePosition}º</span>
          </div>
          <div className="fm-club-view__stat">
            <span className="fm-club-view__stat-label">Pontos</span>
            <span className="fm-club-view__stat-value">{team.points}</span>
          </div>
          <div className="fm-club-view__stat">
            <span className="fm-club-view__stat-label">Jogos</span>
            <span className="fm-club-view__stat-value">{team.played}</span>
          </div>
          <div className="fm-club-view__stat">
            <span className="fm-club-view__stat-label">V / E / D</span>
            <span className="fm-club-view__stat-value">{team.won} / {team.drawn} / {team.lost}</span>
          </div>
          <div className="fm-club-view__stat">
            <span className="fm-club-view__stat-label">Gols Marcados</span>
            <span className="fm-club-view__stat-value">{team.goalsFor}</span>
          </div>
          <div className="fm-club-view__stat">
            <span className="fm-club-view__stat-label">Gols Sofridos</span>
            <span className="fm-club-view__stat-value">{team.goalsAgainst}</span>
          </div>
          <div className="fm-club-view__stat">
            <span className="fm-club-view__stat-label">Saldo de Gols</span>
            <span className="fm-club-view__stat-value">{goalDifference >= 0 ? '+' : ''}{goalDifference}</span>
          </div>
        </div>
        {formItems.length > 0 && (
          <div className="fm-club-view__form">
            <span className="fm-club-view__stat-label">Últimos jogos:</span>
            <div className="fm-club-view__form-badges">
              {formItems.map((f, i) => (
                <span key={i} className={`fm-club-view__form-badge fm-club-view__form-badge--${(team.leagueForm ?? [])[i]?.toLowerCase() ?? ''}`}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {team.boardPromises && team.boardPromises.length > 0 && (
        <div className="fm-club-view__section">
          <h3 className="fm-club-view__section-title">Promessas da Diretoria</h3>
          <div className="fm-club-view__promises">
            {team.boardPromises.map((p, i) => (
              <div key={i} className={`fm-club-view__promise ${p.fulfilled ? 'fm-club-view__promise--done' : ''}`}>
                <span className="fm-club-view__promise-goal">{p.goal}</span>
                <span className="fm-club-view__promise-deadline">
                  {p.fulfilled ? 'Cumprida' : `Prazo: ${p.deadline} sem.`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { selectedTeam, inbox, teams, currentWeek, currentSeason, advanceWeek, isAdvancing, matchBlockMessage, seasonSummary, gameOver, toasts, pushToast, dismissToast } = useGameStore();
  const navigate = useNavigate();
  useKeyboardShortcuts();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const unreadCount = inbox.filter(m => !m.read).length;
  const team = teams.find(t => t.id === selectedTeam);

  // ── Modo online: polling único com backoff (C5) ──
  const online = getActiveRoom();
  const [roomPub, setRoomPub] = React.useState<PublicRoom | null>(null);
  const [roundResult, setRoundResult] = React.useState<Match | null>(null); // Fase 8
  const lastWeekRef = React.useRef<number>(-1);

  // E-21: Resetar lastWeekRef ao trocar de sala para garantir resync na nova sala.
  React.useEffect(() => {
    lastWeekRef.current = -1;
  }, [online?.code]);

  // Sala encerrada pelo dono / expirou (404): sai para a tela online (Fase 9).
  const exitClosedRoom = React.useCallback(() => {
    clearActiveRoom();
    forgetRoom();
    useGameStore.setState({ selectedTeam: null });
    navigate('/online');
  }, [navigate]);

  const handleRoomUpdate = React.useCallback(async (room: PublicRoom) => {
    if (!online) return;
    setRoomPub(room);
    // A rodada avançou (ou entrou agora): re-sincroniza o estado do jogo.
    if (room.currentWeek !== lastWeekRef.current) {
      const prevWeek = lastWeekRef.current;
      lastWeekRef.current = room.currentWeek;
      try {
        const { state } = await apiRoomState(online.code);
        useGameStore.setState({ ...state, selectedTeam: online.teamId });
        // Rodada realmente fechou (não é a 1ª carga): mostra o resultado da minha partida.
        if (prevWeek !== -1) {
          const matches: Match[] = state.matches ?? [];
          const mine = [...matches].reverse().find(
            m => m.completed && (m.homeTeam === online.teamId || m.awayTeam === online.teamId),
          );
          if (mine) setRoundResult(mine);
        }
      } catch { /* transient error — next poll will retry */ }
    }
  }, [online?.code, online?.teamId]);

  const { isReconnecting } = useRoomPolling({
    code: online?.code ?? '',
    onRoomUpdate: handleRoomUpdate,
    onRoomClosed: exitClosedRoom,
    enabled: !!online,
  });

  const myReady = roomPub?.players.find(p => p.isYou)?.ready ?? false;
  const readyCount = roomPub?.players.filter(p => p.ready).length ?? 0;
  const totalPlaying = roomPub?.players.filter(p => p.teamId).length ?? 0;
  const [readyLoading, setReadyLoading] = React.useState(false);
  const toggleReady = () => {
    if (!online || readyLoading) return;
    setReadyLoading(true);
    setRoomReady(online.code, !myReady)
      .then(r => setRoomPub(r.room))
      .catch(() => {})
      .finally(() => setReadyLoading(false));
  };

  // Escuta o atalho Space no modo online (disparado por useKeyboardShortcuts)
  React.useEffect(() => {
    if (!online) return;
    const onReadyShortcut = () => toggleReady();
    window.addEventListener('fm-shortcut-ready', onReadyShortcut);
    return () => window.removeEventListener('fm-shortcut-ready', onReadyShortcut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, myReady, readyLoading]);

  const [negoOpen, setNegoOpen] = React.useState(false);
  const offers = roomPub?.offers ?? [];
  const offersNeedingMe = offers.filter(o => o.myTurn).length;
  const humanTeams = (roomPub?.players ?? [])
    .filter(p => p.teamId && !p.isYou)
    .map(p => ({ teamId: p.teamId as string, nickname: p.nickname }));

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    pushToast(message, type);
  }, [pushToast]);

  const handleSaveSlotSelect = (metadata: SaveSlotMetadata) => {
    // Salvo carregado com sucesso — o store já foi atualizado pelo handleLoad do SaveSlot
    addToast(`Save ${metadata.slotNumber} carregado — ${metadata.teamName}`, 'success');
  };

  const homePage = (
    <>
      <div className="fm-landing fm-landing--home">
        <TacticalPitch />
        <div className="fm-landing__topbar">
          <ThemeToggle compact />
        </div>
        <div className="fm-landing__layout">
          <main className="fm-landing__main fm-landing__main--home">
            <header className="fm-landing__brand">
              <Logo size={52} className="fm-landing__mark" />
              <div className="fm-landing__brand-text">
                <h1 className="fm-landing__title">Football Manager Web</h1>
                <p className="fm-landing__tagline">Gestão de futebol no navegador</p>
              </div>
            </header>
            <p className="fm-landing__lede">
              Assuma o comando de um clube do Brasileirão. Táticas, transferências,
              finanças e imprensa — uma temporada inteira sob o seu controle.
            </p>
            <div className="fm-landing__actions">
              <Button onClick={() => navigate('/selecionar-time')} className="fm-landing__new-game">
                <Play size={18} /> Nova partida
              </Button>
              <Button variant="secondary" onClick={() => navigate('/online')}>
                <Users size={18} /> Jogar online
              </Button>
              <button
                type="button"
                className="fm-landing__hint"
                onClick={() => document.getElementById('fm-saves')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                Carregar carreira salva
              </button>
            </div>
            <ul className="fm-landing__pillars" aria-label="O que o jogo simula">
              {['Táticas', 'Transferências', 'Treino', 'Finanças', 'Imprensa', 'Base'].map(p => (
                <li key={p} className="fm-landing__pillar">{p}</li>
              ))}
            </ul>
          </main>
          <aside id="fm-saves" className="fm-landing__aside" aria-label="Saves">
            <div className="fm-landing__aside-header">
              <FolderOpen size={18} className="fm-landing__aside-icon" />
              <h2 className="fm-landing__aside-title">Continuar carreira</h2>
            </div>
            <p className="fm-landing__aside-desc">Carregue um save ou comece uma nova partida.</p>
            <SaveSlot slotNumber={1} onSaveSlot={handleSaveSlotSelect} />
            <SaveSlot slotNumber={2} onSaveSlot={handleSaveSlotSelect} />
          </aside>
        </div>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );

  const teamSelectionPage = (
    <>
      <div className="fm-landing">
        <div className="fm-landing__topbar">
          <ThemeToggle compact />
          <Button variant="secondary" onClick={() => navigate('/')} className="fm-landing__back-btn">
            ← Voltar
          </Button>
        </div>
        <div className="fm-landing__layout fm-landing__layout--full">
          <main className="fm-landing__main">
            <TeamSelection />
          </main>
        </div>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );

  if (!selectedTeam) {
    return (
      <Routes>
        <Route path="/" element={homePage} />
        <Route path="/selecionar-time" element={teamSelectionPage} />
        <Route path="/online" element={<OnlineHome />} />
        <Route path="/online/sala/:code" element={<RoomView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  const pageLoader = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--t-text-2)' }}>
      Carregando…
    </div>
  );

  return (
    <div className="fm-app fm-shell-fm">
      <nav className={`fm-sidebar ${sidebarCollapsed ? 'fm-sidebar--collapsed' : ''}`}>
        <div className="fm-sidebar__header">
          <button
            className="fm-sidebar__toggle"
            onClick={() => setSidebarCollapsed(prev => !prev)}
            title={sidebarCollapsed ? 'Expandir' : 'Recolher'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
          <div className="fm-sidebar__logo">
            <Logo size={26} className="fm-sidebar__logo-icon" />
            <span className="fm-sidebar__logo-text">FM Web</span>
          </div>
        </div>
        <div className="fm-sidebar__season">
          T{currentSeason} — Semana {currentWeek}
        </div>
        <div className="fm-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => `fm-sidebar__item ${isActive ? 'fm-sidebar__item--active' : ''}`}
              title={item.key ? `${item.label} (${item.key})` : item.label}
            >
              <span className="fm-sidebar__item-icon"><item.icon size={18} /></span>
              <span className="fm-sidebar__item-label">{item.label}</span>
              {item.badge && unreadCount > 0 && (
                <span className="fm-sidebar__badge">{unreadCount}</span>
              )}
              {item.key && !sidebarCollapsed && (
                <span className="fm-sidebar__key-hint">{item.key}</span>
              )}
            </NavLink>
          ))}
        </div>
        <div className="fm-sidebar__footer">
          <ThemeToggle compact className="fm-sidebar__theme" />
        </div>
      </nav>
      <main className="fm-main">
        <div className="fm-main__actionbar">
          <Button
            className="fm-button--back"
            onClick={() => {
              if (getActiveRoom()) {
                // Modo online: sai da sala sem tocar no universo compartilhado.
                clearActiveRoom();
                useGameStore.setState({ selectedTeam: null });
                navigate('/online');
              } else {
                useGameStore.getState().deselectTeam();
                navigate('/');
              }
            }}
          >
            <ArrowLeft size={15} /> Voltar
          </Button>
          <Button
            className="fm-button--home"
            onClick={() => navigate('/dashboard')}
          >
            <Home size={15} /> Início
          </Button>
          {online && (
            <Button className="fmo-negobtn fmo-shell" onClick={() => setNegoOpen(true)}>
              <ArrowLeftRight size={15} /> Negociações
              {offersNeedingMe > 0 && <span className="fmo-negobtn__badge">{offersNeedingMe}</span>}
            </Button>
          )}
          {online ? (
            <Button className="fm-button--continue" onClick={toggleReady} disabled={!!seasonSummary || gameOver || readyLoading}>
              {myReady ? <>Pronto ✓ ({readyCount}/{totalPlaying})</> : <>Estou pronto <ArrowRight size={15} /></>}
            </Button>
          ) : (
            <Button className="fm-button--continue" onClick={advanceWeek} disabled={isAdvancing || !!seasonSummary || gameOver} title="Espaço">
              {isAdvancing ? 'Processando...' : <>Continuar <ArrowRight size={15} /></>}
            </Button>
          )}
          {!online && <Button className="fm-button--save" onClick={async () => {
            try {
              await useGameStore.getState().saveGame(1);
              addToast('💾 Save 1 salvo!', 'success');
            } catch {
              addToast('❌ Erro ao salvar no slot 1!', 'error');
            }
          }}>
            <Save size={15} /> Save 1
          </Button>}
          {!online && <Button className="fm-button--save" onClick={async () => {
            try {
              await useGameStore.getState().saveGame(2);
              addToast('💾 Save 2 salvo!', 'success');
            } catch {
              addToast('❌ Erro ao salvar no slot 2!', 'error');
            }
          }}>
            <Save size={15} /> Save 2
          </Button>}
        </div>
        {online && roomPub && (
          <div className="fmo-readybar fmo-shell">
            <span className="fmo-readybar__label">Semana {roomPub.currentWeek}</span>
            <div className="fmo-readybar__players">
              {roomPub.players.filter(p => p.teamId).map((p, i) => (
                <span key={i} className={`fmo-rp ${p.ready ? 'fmo-rp--ready' : ''}`}>
                  {p.ready && <span className="fmo-rp__tick">✓</span>}
                  {p.nickname}{p.isYou ? ' (você)' : ''}
                </span>
              ))}
            </div>
            <span className="fmo-readybar__spacer" />
            <span className="fmo-readybar__note">
              {readyCount === totalPlaying
                ? 'Fechando a rodada…'
                : myReady
                  ? `Aguardando os outros (${readyCount}/${totalPlaying})`
                  : `Marque "Estou pronto" para avançar (${readyCount}/${totalPlaying})`}
            </span>
            {roomPub.isOwner && (
              <button
                type="button"
                className="fmo-readybar__close"
                title="Encerrar sala para todos"
                onClick={() => {
                  if (!online || !window.confirm('Encerrar a sala para todos os jogadores?')) return;
                  closeRoom(online.code).catch(() => {}).finally(exitClosedRoom);
                }}
              >
                Encerrar sala
              </button>
            )}
          </div>
        )}
        <div className="fm-main__content">
        <Suspense fallback={pageLoader}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/elenco" element={<SquadView />} />
          <Route path="/partidas" element={<MatchCenter />} />
          <Route path="/classificacao" element={<LeagueTableWrapper />} />
          <Route path="/transferencias" element={<TransferMarketComponent addToast={addToast} />} />
          <Route path="/taticas" element={<TacticsView />} />
          <Route path="/treino" element={<TrainingView />} />
          <Route path="/dinamica" element={<DynamicsView />} />
          <Route path="/caixa-de-entrada" element={<InboxView />} />
          <Route path="/imprensa" element={<PressCenter />} />
          <Route path="/financas" element={<FinanceView />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clube" element={<ClubView team={team} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Suspense>
        </div>
      </main>
      {online && negoOpen && roomPub && (
        <OnlineTransfers
          code={online.code}
          offers={offers}
          humanTeams={humanTeams}
          onClose={() => setNegoOpen(false)}
          onRoom={setRoomPub}
        />
      )}
      {online && roundResult && (
        <OnlineRoundResult
          match={roundResult}
          teams={teams}
          myTeamId={online.teamId}
          onClose={() => setRoundResult(null)}
        />
      )}
      <SeasonSummaryModal />
      {matchBlockMessage && (
        <div className="fm-match-block-overlay" onClick={() => useGameStore.setState({ matchBlockMessage: null })}>
          <div className="fm-match-block-modal" onClick={e => e.stopPropagation()}>
            <div className="fm-match-block-modal__icon">⚠️</div>
            <p className="fm-match-block-modal__message">{matchBlockMessage}</p>
            <Button onClick={() => useGameStore.setState({ matchBlockMessage: null })}>
              Entendido
            </Button>
          </div>
        </div>
      )}
      {isReconnecting && online && (
        <div className="fm-reconnecting-banner">Reconectando…</div>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
