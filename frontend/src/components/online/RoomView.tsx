import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getRoom, joinRoom, startRoom, pickTeam, beginRoom, apiRoomState, setActiveRoom,
  closeRoom, rememberRoom, forgetRoom,
  type PublicRoom,
} from '../../api/client';
import { useGameStore } from '../../store/gameStore';
import type { Team } from '../../types/game';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Lobby } from './Lobby';
import { DraftScreen } from './DraftScreen';
import { useRoomPolling } from '../../hooks/useRoomPolling';
import './online.css';

const NICK_KEY = 'fm-nickname';

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

  const handleRoomUpdate = React.useCallback(async (r: PublicRoom) => {
    // Reentrada: se não sou membro (abri a URL direto), tenta entrar com o apelido salvo.
    if (!r.players.some(p => p.isYou)) {
      const nick = localStorage.getItem(NICK_KEY);
      if (nick) { try { await joinRoom(code, nick); } catch { /* pode já ter iniciado */ } }
    }
    rememberRoom(code);
    setRoom(r);
    setError(null);

    if (r.status === 'drafting') {
      try { const { state } = await apiRoomState(code); setTeams(state.teams ?? []); } catch { /* ignore */ }
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
  }, [code, navigate]);

  const handleRoomClosed = React.useCallback(() => {
    forgetRoom();
    navigate('/online');
  }, [navigate]);

  const { isReconnecting } = useRoomPolling({
    code,
    onRoomUpdate: handleRoomUpdate,
    onRoomClosed: handleRoomClosed,
  });

  // Exibe erro de reconexão se o hook reportar problema
  React.useEffect(() => {
    if (isReconnecting) setError('Reconectando…');
  }, [isReconnecting]);

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
        <main className="fm-landing__main fmo fmo--wide">
          {error && <p className="fmo-error" role="alert">{error}</p>}
          {!room && !error && <p className="fmo-hint">Carregando sala…</p>}

          {room?.status === 'lobby' && (
            <Lobby
              code={code}
              room={room}
              busy={busy}
              onStart={() => run(() => startRoom(code))}
              onClose={() => run(async () => { await closeRoom(code); forgetRoom(); navigate('/online'); })}
            />
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
            <p className="fmo-hint">Entrando no jogo…</p>
          )}
        </main>
      </div>
    </div>
  );
};
