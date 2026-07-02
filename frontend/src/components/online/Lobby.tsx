import React from 'react';
import type { PublicRoom } from '../../api/client';
import { Button } from '../ui/Button';

interface LobbyProps {
  code: string;
  room: PublicRoom;
  busy: boolean;
  onStart: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ code, room, busy, onStart }) => {
  const [copied, setCopied] = React.useState(false);
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* clipboard indisponível */ }
  };

  return (
    <>
      <h1 className="fm-landing__title">Sala</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 24px' }}>
        <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: 6 }}>{code}</span>
        <Button variant="secondary" onClick={copyCode}>{copied ? 'Copiado!' : 'Copiar código'}</Button>
      </div>

      <h3 style={{ color: 'var(--t-text-2)', marginBottom: 10 }}>Jogadores ({room.players.length})</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {room.players.map((p, i) => (
          <li key={i} className="fms-card" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.connected ? 'var(--t-success, #46a758)' : 'var(--t-text-3, #888)' }} />
            <span style={{ fontWeight: 600 }}>{p.nickname}</span>
            {p.isYou && <span className="fms-badge">você</span>}
            {p.isOwner && <span className="fms-badge">dono</span>}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 28, display: 'flex' }}>
        {room.isOwner ? (
          <Button className="fm-online-block" disabled={busy} onClick={onStart}>
            {busy ? 'Aguarde…' : 'Iniciar jogo'}
          </Button>
        ) : (
          <p style={{ color: 'var(--t-text-2)' }}>Aguardando o dono iniciar o jogo…</p>
        )}
      </div>
    </>
  );
};
