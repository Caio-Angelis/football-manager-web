import React from 'react';
import type { PublicRoom } from '../../api/client';
import { Button } from '../ui/Button';

interface LobbyProps {
  code: string;
  room: PublicRoom;
  busy: boolean;
  onStart: () => void;
  onClose: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ code, room, busy, onStart, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* clipboard indisponível */ }
  };

  return (
    <>
      <h1 className="fm-landing__title">Sala</h1>

      <div className="fmo-codebar">
        <span className="fmo-code" aria-label={`Código da sala ${code.split('').join(' ')}`}>{code}</span>
        <Button variant="secondary" onClick={copyCode}>{copied ? 'Copiado!' : 'Copiar código'}</Button>
      </div>

      <h2 className="fmo-section-title">Jogadores ({room.players.length})</h2>
      <ul className="fmo-players">
        {room.players.map((p, i) => (
          <li key={i} className="fmo-player">
            <span className={`fmo-dot ${p.connected ? 'fmo-dot--on' : ''}`} title={p.connected ? 'Conectado' : 'Ausente'} />
            <span className="fmo-player__name">{p.nickname}</span>
            {p.isYou && <span className="fmo-badge fmo-badge--you">você</span>}
            {p.isOwner && <span className="fmo-badge fmo-badge--owner">dono</span>}
          </li>
        ))}
      </ul>

      <div className="fmo-actions">
        {room.isOwner ? (
          <>
            <Button className="fmo-block" disabled={busy} onClick={onStart}>
              {busy ? 'Aguarde…' : 'Iniciar jogo'}
            </Button>
            <button
              type="button"
              className="fmo-linkbtn"
              disabled={busy}
              onClick={() => { if (window.confirm('Encerrar a sala para todos?')) onClose(); }}
            >
              Encerrar sala
            </button>
          </>
        ) : (
          <p className="fmo-hint">Aguardando o dono iniciar o jogo…</p>
        )}
      </div>
    </>
  );
};
