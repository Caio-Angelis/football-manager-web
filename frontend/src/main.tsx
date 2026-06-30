import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { useGameStore } from './store/gameStore';
import { apiGet } from './api/client';
import './styles.css';
import './styles-supplement.css';
import './styles-mobile.css';
import './components/press/PressCenter.css';
import './app-fm.css';
import './fm-shared.css';

// Fetch initial state from backend
apiGet<{ state: any }>('/state').then(({ state }) => {
  useGameStore.setState(state);
}).catch((err) => {
  console.error('Failed to fetch initial state:', err);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
