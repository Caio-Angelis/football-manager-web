import React from 'react';
import { useGameStore } from './store/gameStore';
import { TeamSelection } from './components/TeamSelection';
import { SquadView } from './components/squad/SquadView';
import { MatchCenter } from './components/match/MatchCenter';
import { TransferMarket } from './components/transfer/TransferMarket';
import { TacticsView } from './components/tactics/TacticsView';

export const App: React.FC = () => {
  const { selectedTeam } = useGameStore();
  const [activeScreen, setActiveScreen] = React.useState<string>('squad');

  if (!selectedTeam) {
    return <TeamSelection />;
  }

  const screens = {
    squad: SquadView,
    match: MatchCenter,
    transfer: TransferMarket,
    tactics: TacticsView,
  };

  const ScreenComponent = screens[activeScreen as keyof typeof screens];

  return (
    <div className="fm-app">
      <nav className="fm-sidebar">
        <div className="fm-sidebar__logo">
          <span>⚽</span>
          <span>FM Web</span>
        </div>
        <div className="fm-sidebar__nav">
          {[
            { id: 'squad', label: 'Elenco' },
            { id: 'match', label: 'Partidas' },
            { id: 'transfer', label: 'Transferências' },
            { id: 'tactics', label: 'Táticas' },
          ].map((item) => (
            <button
              key={item.id}
              className={`fm-sidebar__item ${activeScreen === item.id ? 'fm-sidebar__item--active' : ''}`}
              onClick={() => setActiveScreen(item.id)}
            >
              <span className="fm-sidebar__item-icon">{item.label.charAt(0)}</span>
              <span className="fm-sidebar__item-label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="fm-main">
        <ScreenComponent />
      </main>
    </div>
  );
};
