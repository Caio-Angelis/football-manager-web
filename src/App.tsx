import React, { useCallback, useEffect } from 'react';
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
import type { SaveSlotMetadata } from './types/game';

const NAV_ITEMS = [
  { id: 'squad', label: 'Elenco', icon: '👥' },
  { id: 'match', label: 'Partidas', icon: '⚽' },
  { id: 'league', label: 'Classificação', icon: '📊' },
  { id: 'transfer', label: 'Transferências', icon: '🔄' },
  { id: 'tactics', label: 'Táticas', icon: '📋' },
  { id: 'training', label: 'Treino', icon: '🏋️' },
  { id: 'dynamics', label: 'Dinâmica', icon: '📊' },
  { id: 'inbox', label: 'Caixa de Entrada', icon: '📬', badge: true },
  { id: 'finance', label: 'Finanças', icon: '💰' },
  { id: 'club', label: 'Visão do Clube', icon: '🏢' },
];

export const App: React.FC = () => {
  const { selectedTeam, inbox, teams, currentWeek, currentSeason, advanceWeek } = useGameStore();
  const [activeScreen, setActiveScreen] = React.useState('squad');
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

  useEffect(() => {
    const handler = () => {
      addToast('Erro ao salvar dados — o armazenamento local pode estar cheio.', 'warning');
    };
    window.addEventListener('fm-storage-error', handler);
    return () => window.removeEventListener('fm-storage-error', handler);
  }, [addToast]);

  const handleSaveSlotSelect = (metadata: SaveSlotMetadata) => {
    // Salvo carregado com sucesso — o store já foi atualizado pelo handleLoad do SaveSlot
    addToast(`Save ${metadata.slotNumber} carregado — ${metadata.teamName}`, 'success');
  };

  if (!selectedTeam) {
    return (
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
              <TeamSelection />
            </main>
            <aside className="fm-landing__aside" aria-label="Saves">
              <h2 className="fm-landing__aside-title">Continuar carreira</h2>
              <p className="fm-landing__aside-desc">Carregue um save salvo ou comece uma nova partida.</p>
              <SaveSlot slotNumber={1} onSaveSlot={handleSaveSlotSelect} />
              <SaveSlot slotNumber={2} onSaveSlot={handleSaveSlotSelect} />
            </aside>
          </div>
        </div>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const screens: Record<string, React.FC> = {
    squad: SquadView,
    match: MatchCenter,
    league: () => {
      const { leagueTable } = useGameStore();
      return <LeagueTable standings={leagueTable} />;
    },
    transfer: () => <TransferMarketComponent addToast={addToast} />,
    tactics: TacticsView,
    training: TrainingView,
    dynamics: DynamicsView,
    inbox: InboxView,
    finance: FinanceView,
    club: () => (
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
    ),
  };

  const ScreenComponent = screens[activeScreen] ?? SquadView;

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
            <button
              key={item.id}
              className={`fm-sidebar__item ${activeScreen === item.id ? 'fm-sidebar__item--active' : ''}`}
              onClick={() => setActiveScreen(item.id)}
            >
              <span className="fm-sidebar__item-icon">{item.icon}</span>
              <span className="fm-sidebar__item-label">{item.label}</span>
              {item.badge && unreadCount > 0 && (
                <span className="fm-sidebar__badge">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="fm-sidebar__footer">
          <ThemeToggle compact className="fm-sidebar__theme" />
          <Button
            className="fm-button--back"
            onClick={() => useGameStore.getState().deselectTeam()}
          >
            ← Voltar
          </Button>
          <Button
            className="fm-button--home"
            onClick={() => setActiveScreen('squad')}
          >
            🏠 Início
          </Button>
          <Button className="fm-button--continue" onClick={advanceWeek}>
            Continuar ▶
          </Button>
          <Button className="fm-button--save" onClick={() => {
            const ok = useGameStore.getState().saveGame(1);
            addToast(ok ? '💾 Save 1 salvo!' : '❌ Falha ao salvar — selecione um time primeiro.', ok ? 'success' : 'warning');
          }}>
            💾 Save 1
          </Button>
          <Button className="fm-button--save" onClick={() => {
            const ok = useGameStore.getState().saveGame(2);
            addToast(ok ? '💾 Save 2 salvo!' : '❌ Falha ao salvar — selecione um time primeiro.', ok ? 'success' : 'warning');
          }}>
            💾 Save 2
          </Button>
        </div>
      </nav>
      <main className="fm-main">
        <ScreenComponent />
      </main>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
