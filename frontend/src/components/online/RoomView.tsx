import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getRoom, joinRoom, startRoom, pickTeam, beginRoom, apiRoomState, setActiveRoom,
  type PublicRoom,
} from '../../api/client';
import { useGameStore } from '../../store/gameStore';
import type { Team } from '../../types/game';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Lobby } from './Lobby';
import { DraftScreen } from './DraftScreen';

const NICK_KEY = 'fm-nickname';
const POLL_MS = 2000;

export const RoomView: React.FC = () => {
  const navigate = useNavigate();
  const { code = '' } = useParams<{ code: string }>();
  const [room, setRoom] = React.useState<PublicRoom | null>(null);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const enteredRef = React.useRef(false);

  const refresh = React.useCallback(async () => {
    const { room: r } = await getRoom(code);
    setRoom(r);
    return r;
  }, [code]);

  React.useEffect(() => {
    let alive = true;

    const poll = async () => {
      try {
        const { room: r } = await getRoom(code);
        if (!alive) return;

        // Reentrada: se não sou membro (abri a URL direto), tenta entrar com o apelido salvo.
        if (!r.players.some(p => p.isYou)) {
          const nick = localStorage.getItem(NICK_KEY);
          if (nick) { try { await joinRoom(code, nick); } catch { /* pode já ter iniciado */ } }
        }
        setRoom(r);
        setError(null);

        if (r.status === 'drafting') {
          try { const { state } = await apiRoomState(code); if (alive) setTeams(state.teams ?? []); } catch { /* ignore */ }
        }

        // Jogo começou: entra uma única vez e vai para o dashboard.
        if (r.status === 'playing' && !enteredRef.current) {
          const me = r.players.find(p => p.isYou);
          if (me?.teamId) {
            enteredRef.current = true;
            setActiveRoom(code, me.teamId);
            const { state } = await apiRoomState(code);
            useGameStore.setState({ ...state, selectedTeam: me.teamId });
            navigate('/dashboard');
          }
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Sala indisponível.');
      }
    };

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [code, navigate]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await fn(); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fm-landing">
      <div className="fm-landing__topbar">
        <ThemeToggle compact />
        <Button variant="secondary" onClick={() => navigate('/online')} className="fm-landing__back-btn">
          ← Sair da sala
        </Button>
      </div>
      <div className="fm-landing__layout fm-landing__layout--full">
        <main className="fm-landing__main" style={{ maxWidth: 640, margin: '0 auto' }}>
          {error && <p style={{ color: 'var(--t-danger, #e5484d)' }}>{error}</p>}
          {!room && !error && <p style={{ color: 'var(--t-text-2)' }}>Carregando sala…</p>}

          {room?.status === 'lobby' && (
            <Lobby code={code} room={room} busy={busy} onStart={() => run(() => startRoom(code))} />
          )}
          {room?.status === 'drafting' && (
            <DraftScreen
              room={room}
              teams={teams}
              busy={busy}
              onPick={(teamId) => run(() => pickTeam(code, teamId))}
              onBegin={() => run(() => beginRoom(code))}
            />
          )}
          {room?.status === 'playing' && (
            <p style={{ color: 'var(--t-text-2)' }}>Entrando no jogo…</p>
          )}
        </main>
      </div>
    </div>
  );
};
