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
import { Button } from './components/ui/Button';
import { SaveSlot } from './components/saves/SaveSlot';
import { ToastContainer } from './components/ui/Toast';
import { ThemeToggle } from './components/ui/ThemeToggle';
import type { ToastData } from './components/ui/Toast';
import { TransferMarket as TransferMarketComponent } from './components/transfer/TransferMarket';
import type { SaveSlotMetadata, Team } from './types/game';
import { FolderOpen } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'squad', path: '/elenco', label: 'Elenco', icon: '👥' },
  { id: 'match', path: '/partidas', label: 'Partidas', icon: '⚽' },
  { id: 'league', path: '/classificacao', label: 'Classificação', icon: '📊' },
  { id: 'transfer', path: '/transferencias', label: 'Transferências', icon: '🔄' },
  { id: 'tactics', path: '/taticas', label: 'Táticas', icon: '📋' },
  { id: 'training', path: '/treino', label: 'Treino', icon: '🏋️' },
  { id: 'dynamics', path: '/dinamica', label: 'Dinâmica', icon: '📊' },
  { id: 'inbox', path: '/caixa-de-entrada', label: 'Caixa de Entrada', icon: '📬', badge: true },
  { id: 'finance', path: '/financas', label: 'Finanças', icon: '💰' },
  { id: 'club', path: '/clube', label: 'Visão do Clube', icon: '🏢' },
];

const LeagueTableWrapper: React.FC = () => {
  const { leagueTable, selectedTeam } = useGameStore();
  return <LeagueTable standings={leagueTable} userTeamId={selectedTeam} />;
};

const ClubView: React.FC<{ team?: Team }> = ({ team }) => (
  <div className="fm-club-view">
    <h1>Visão do Clube</h1>
    {team && (
      <div className="fm-club-view__info">
        <h2>{team.name}</h2>
        <p>{team.division} — {team.league}</p>
        <p>Reputação: {team.reputation}/100</p>
        <p>Expectativa da diretoria: {team.boardExpectation}</p>
        <p>Instalações: nível {team.facilitiesLevel}</p>
        <p>Base juvenil: nível {team.youthFacilitiesLevel}</p>
        <p>Scouting: nível {team.scoutingLevel}</p>
        <p>Elenco: {team.squad.length} jogadores</p>
      </div>
    )}
  </div>
);

export const App: React.FC = () => {
  const { selectedTeam, inbox, teams, currentWeek, currentSeason, advanceWeek } = useGameStore();
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
      <div className="fm-landing">
        <div className="fm-landing__topbar">
          <ThemeToggle compact />
        </div>
        <div className="fm-landing__layout">
          <main className="fm-landing__main">
            <header className="fm-landing__brand">
              <span className="fm-landing__mark" aria-hidden="true">FM</span>
              <div className="fm-landing__brand-text">
                <h1 className="fm-landing__title">Football Manager Web</h1>
                <p className="fm-landing__tagline">Gestão de futebol no navegador</p>
              </div>
            </header>
            <div className="fm-landing__actions">
              <Button onClick={() => navigate('/selecionar-time')} className="fm-landing__new-game">
                Nova partida
              </Button>
            </div>
          </main>
          <aside className="fm-landing__aside" aria-label="Saves">
            <div className="fm-landing__aside-header">
              <FolderOpen size={18} className="fm-landing__aside-icon" />
              <h2 className="fm-landing__aside-title">Continuar carreira</h2>
            </div>
            <p className="fm-landing__aside-desc">Carregue um save salvo ou comece uma nova partida.</p>
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
    <div className="fm-app">
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
            <span>⚽</span>
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
              <span className="fm-sidebar__item-icon">{item.icon}</span>
              <span className="fm-sidebar__item-label">{item.label}</span>
              {item.badge && unreadCount > 0 && (
                <span className="fm-sidebar__badge">{unreadCount}</span>
              )}
            </NavLink>
          ))}
        </div>
        <div className="fm-sidebar__footer">
          <ThemeToggle compact className="fm-sidebar__theme" />
          <Button
            className="fm-button--back"
            onClick={() => {
              useGameStore.getState().deselectTeam();
              navigate('/');
            }}
          >
            ← Voltar
          </Button>
          <Button
            className="fm-button--home"
            onClick={() => navigate('/elenco')}
          >
            🏠 Início
          </Button>
          <Button className="fm-button--continue" onClick={advanceWeek}>
            Continuar ▶
          </Button>
          <Button className="fm-button--save" onClick={() => {
            useGameStore.getState().saveGame(1);
            addToast('💾 Save 1 salvo!', 'success');
          }}>
            💾 Save 1
          </Button>
          <Button className="fm-button--save" onClick={() => {
            useGameStore.getState().saveGame(2);
            addToast('💾 Save 2 salvo!', 'success');
          }}>
            💾 Save 2
          </Button>
        </div>
      </nav>
      <main className="fm-main">
        <Routes>
          <Route path="/" element={<Navigate to="/elenco" replace />} />
          <Route path="/elenco" element={<SquadView />} />
          <Route path="/partidas" element={<MatchCenter />} />
          <Route path="/classificacao" element={<LeagueTableWrapper />} />
          <Route path="/transferencias" element={<TransferMarketComponent addToast={addToast} />} />
          <Route path="/taticas" element={<TacticsView />} />
          <Route path="/treino" element={<TrainingView />} />
          <Route path="/dinamica" element={<DynamicsView />} />
          <Route path="/caixa-de-entrada" element={<InboxView />} />
          <Route path="/financas" element={<FinanceView />} />
          <Route path="/clube" element={<ClubView team={team} />} />
          <Route path="*" element={<Navigate to="/elenco" replace />} />
        </Routes>
      </main>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
