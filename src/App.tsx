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

const NAV_ITEMS = [
  { id: 'squad', label: 'Elenco' },
  { id: 'match', label: 'Partidas' },
  { id: 'transfer', label: 'Transferências' },
  { id: 'tactics', label: 'Táticas' },
  { id: 'training', label: 'Treino' },
  { id: 'dynamics', label: 'Dinâmica' },
  { id: 'inbox', label: 'Caixa de Entrada', badge: true },
  { id: 'finance', label: 'Finanças' },
  { id: 'club', label: 'Visão do Clube' },
];

export const App: React.FC = () => {
  const { selectedTeam, inbox, teams, currentWeek, currentSeason, advanceWeek } = useGameStore();
  const [activeScreen, setActiveScreen] = React.useState('squad');

  const unreadCount = inbox.filter(m => !m.read).length;
  const team = teams.find(t => t.id === selectedTeam);

  if (!selectedTeam) {
    return <TeamSelection />;
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
      <nav className="fm-sidebar">
        <div className="fm-sidebar__logo">
          <span>⚽</span>
          <span>FM Web</span>
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
              <span className="fm-sidebar__item-label">{item.label}</span>
              {item.badge && unreadCount > 0 && (
                <span className="fm-sidebar__badge">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="fm-sidebar__continue">
          <Button className="fm-button--continue" onClick={advanceWeek}>
            Continuar ▶
          </Button>
        </div>
      </nav>
      <main className="fm-main">
        <ScreenComponent />
      </main>
    </div>
  );
};
