import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { getActiveRoom } from '../api/client';

const NAV_PATHS = [
  '/dashboard',
  '/elenco',
  '/partidas',
  '/classificacao',
  '/transferencias',
  '/taticas',
  '/treino',
  '/dinamica',
  '/caixa-de-entrada',
  '/imprensa',
  '/financas',
  '/clube',
];

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      const online = getActiveRoom();
      const store = useGameStore.getState();
      const { isAdvancing, seasonSummary, gameOver } = store;

      // Space — Avançar semana (modo offline) ou toggle ready (modo online)
      if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (online) {
          // No modo online, o botão "Estou pronto" é gerenciado pelo componente App.
          // Disparamos um evento customizado que o App pode escutar.
          window.dispatchEvent(new CustomEvent('fm-shortcut-ready'));
        } else {
          if (!isAdvancing && !seasonSummary && !gameOver) {
            store.advanceWeek();
          }
        }
        return;
      }

      // Ctrl+S — Salvar no slot 1
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!online) {
          store.saveGame(1).then(() => {
            store.pushToast('💾 Save 1 salvo! (Ctrl+S)', 'success');
          }).catch(() => {
            store.pushToast('❌ Erro ao salvar!', 'error');
          });
        }
        return;
      }

      // Escape — fechar modais / voltar ao dashboard
      if (e.key === 'Escape') {
        const blockModal = document.querySelector('.fm-match-block-overlay');
        if (blockModal) {
          useGameStore.setState({ matchBlockMessage: null });
          return;
        }
        const seasonModal = document.querySelector('[class*="season-summary"]');
        if (seasonModal) return; // deixa o modal tratar
        navigate('/dashboard');
        return;
      }

      // 1-9, 0 — navegação rápida entre páginas
      if (!e.ctrlKey && !e.metaKey && !e.altKey && /^[0-9]$/.test(e.key)) {
        const idx = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < NAV_PATHS.length) {
          e.preventDefault();
          navigate(NAV_PATHS[idx]);
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
