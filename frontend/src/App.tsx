import React, { useCallback } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useGameStore } from './store/gameStore';
import { TeamSelection } from './components/TeamSelection';
import { SquadView } from './components/squad/SquadView';
import { MatchCenter } from './components/match/MatchCenter';
import { TacticsView } from './components/tactics/TacticsView';
import { InboxView } from './components/inbox/InboxView';
import { TrainingView } from './components/training/TrainingView';
import { DynamicsView } from './components/dynamics/DynamicsView';
import { FinanceView } from './components/finance/FinanceView';
import { LeagueTable } from './components/league/LeagueTable';
import { PressCenter } from './components/press/PressCenter';
import { Button } from './components/ui/Button';
import { PageHeader } from './components/ui/PageHeader';
import { SaveSlot } from './components/saves/SaveSlot';
import { Logo } from './components/ui/Logo';
import { TacticalPitch } from './components/ui/TacticalPitch';
import { ToastContainer } from './components/ui/Toast';
import { ThemeToggle } from './components/ui/ThemeToggle';
import type { ToastData } from './components/ui/Toast';
import { TransferMarket as TransferMarketComponent } from './components/transfer/TransferMarket';
import { SeasonSummaryModal } from './components/season/SeasonSummaryModal';
import { Dashboard } from './components/dashboard/Dashboard';
import './components/dashboard/Dashboard.css';
import type { SaveSlotMetadata, Team } from './types/game';
import {
  FolderOpen, Users, Calendar, BarChart3, ArrowLeftRight, ClipboardList,
  Dumbbell, Activity, Inbox, Mic, Wallet, Building2, LayoutDashboard,
  ArrowLeft, Home, Save, ArrowRight, Play,
} from 'lucide-react';

type NavIcon = React.ComponentType<{ size?: number | string }>;

const NAV_ITEMS: { id: string; path: string; label: string; icon: NavIcon; badge?: boolean }[] = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'squad', path: '/elenco', label: 'Elenco', icon: Users },
  { id: 'match', path: '/partidas', label: 'Partidas', icon: Calendar },
  { id: 'league', path: '/classificacao', label: 'Classificação', icon: BarChart3 },
  { id: 'transfer', path: '/transferencias', label: 'Transferências', icon: ArrowLeftRight },
  { id: 'tactics', path: '/taticas', label: 'Táticas', icon: ClipboardList },
  { id: 'training', path: '/treino', label: 'Treino', icon: Dumbbell },
  { id: 'dynamics', path: '/dinamica', label: 'Dinâmica', icon: Activity },
  { id: 'inbox', path: '/caixa-de-entrada', label: 'Caixa de Entrada', icon: Inbox, badge: true },
  { id: 'press', path: '/imprensa', label: 'Imprensa', icon: Mic },
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
  const { selectedTeam, inbox, teams, currentWeek, currentSeason, advanceWeek, isAdvancing, matchBlockMessage, seasonSummary, gameOver } = useGameStore();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const unreadCount = inbox.filter(m => !m.read).length;
  const team = teams.find(t => t.id === selectedTeam);

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type, timestamp: Date.now() }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

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
            >
              <span className="fm-sidebar__item-icon"><item.icon size={18} /></span>
              <span className="fm-sidebar__item-label">{item.label}</span>
              {item.badge && unreadCount > 0 && (
                <span className="fm-sidebar__badge">{unreadCount}</span>
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
              useGameStore.getState().deselectTeam();
              navigate('/');
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
          <Button className="fm-button--continue" onClick={advanceWeek} disabled={isAdvancing || !!seasonSummary || gameOver}>
            {isAdvancing ? 'Processando...' : <>Continuar <ArrowRight size={15} /></>}
          </Button>
          <Button className="fm-button--save" onClick={async () => {
            try {
              await useGameStore.getState().saveGame(1);
              addToast('💾 Save 1 salvo!', 'success');
            } catch {
              addToast('❌ Erro ao salvar no slot 1!', 'error');
            }
          }}>
            <Save size={15} /> Save 1
          </Button>
          <Button className="fm-button--save" onClick={async () => {
            try {
              await useGameStore.getState().saveGame(2);
              addToast('💾 Save 2 salvo!', 'success');
            } catch {
              addToast('❌ Erro ao salvar no slot 2!', 'error');
            }
          }}>
            <Save size={15} /> Save 2
          </Button>
        </div>
        <div className="fm-main__content">
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
        </div>
      </main>
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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
