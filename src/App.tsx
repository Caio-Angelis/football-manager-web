import React from 'react';
import { useGameStore } from './store/gameStore';
import { TeamSelection } from './components/TeamSelection';
import { SquadView } from './components/squad/SquadView';
import { MatchCenter } from './components/match/MatchCenter';
import { TransferMarket } from './components/transfer/TransferMarket';
import { TacticsView } from './components/tactics/TacticsView';
import { InboxView } from './components/inbox/InboxView';
import { TrainingView } from './components/training/TrainingView';
import { DynamicsView } from './components/dynamics/DynamicsView';
import { FinanceView } from './components/finance/FinanceView';
import { Button } from './components/ui/Button';
import { SaveSlot } from './components/saves/SaveSlot';
import type { SaveSlotMetadata } from './types/game';

const NAV_ITEMS = [
  { id: 'squad', label: 'Elenco', icon: '👥' },
  { id: 'match', label: 'Partidas', icon: '⚽' },
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

  const unreadCount = inbox.filter(m => !m.read).length;
  const team = teams.find(t => t.id === selectedTeam);

  const handleSaveSlotSelect = (_slot: SaveSlotMetadata) => {
    // Placeholder for future save slot selection feature
  };

  if (!selectedTeam) {
    return (
      <>
        <div className="fm-team-selection">
          <div className="fm-team-selection__content">
            <h1>Football Manager Web</h1>
            <p>Selecione um time ou carregue um save</p>
            <TeamSelection />
          </div>
        </div>
        <div className="fm-save-slots-panel">
          <h2>Saves</h2>
          <p>Escolha um slot para carregar</p>
          <SaveSlot slotNumber={1} onSaveSlot={handleSaveSlotSelect} />
          <SaveSlot slotNumber={2} onSaveSlot={handleSaveSlotSelect} />
        </div>
      </>
    );
  }

  const screens: Record<string, React.FC> = {
    squad: SquadView,
    match: MatchCenter,
    transfer: TransferMarket,
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
          <Button className="fm-button--save" onClick={() => useGameStore.getState().saveGame(1)}>
            💾 Save 1
          </Button>
          <Button className="fm-button--save" onClick={() => useGameStore.getState().saveGame(2)}>
            💾 Save 2
          </Button>
        </div>
      </nav>
      <main className="fm-main">
        <ScreenComponent />
      </main>
    </div>
  );
};
