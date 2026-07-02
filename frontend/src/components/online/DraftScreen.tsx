import React from 'react';
import type { PublicRoom } from '../../api/client';
import type { Team } from '../../types/game';
import { Button } from '../ui/Button';

interface DraftScreenProps {
  room: PublicRoom;
  teams: Team[];
  busy: boolean;
  onPick: (teamId: string) => void;
  onBegin: () => void;
}

export const DraftScreen: React.FC<DraftScreenProps> = ({ room, teams, busy, onPick, onBegin }) => {
  // Mapa teamId -> apelido do dono (a partir da lista pública de jogadores).
  const ownerByTeam = new Map<string, { nickname: string; isYou: boolean }>();
  for (const p of room.players) {
    if (p.teamId) ownerByTeam.set(p.teamId, { nickname: p.nickname, isYou: p.isYou });
  }
  const myTeamId = room.players.find(p => p.isYou)?.teamId ?? null;
  const everyonePicked = room.players.every(p => p.teamId);

  const sorted = [...teams].sort((a, b) => b.reputation - a.reputation);

  return (
    <>
      <h1 className="fm-landing__title">Escolha seu clube</h1>
      <p className="fm-landing__lede">
        {myTeamId ? 'Você pode trocar enquanto o draft estiver aberto.' : 'Clique num clube livre para escolher.'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginTop: 12 }}>
        {sorted.map(team => {
          const taken = ownerByTeam.get(team.id);
          const mine = taken?.isYou;
          const disabled = busy || (!!taken && !mine);
          return (
            <button
              key={team.id}
              type="button"
              className="fms-card"
              disabled={disabled}
              onClick={() => !disabled && onPick(team.id)}
              style={{
                textAlign: 'left', padding: '12px 14px', cursor: disabled ? 'default' : 'pointer',
                border: mine ? '2px solid var(--t-success, #46a758)' : undefined,
                opacity: taken && !mine ? 0.55 : 1,
              }}
            >
              <div style={{ fontWeight: 700 }}>{team.name}</div>
              <div style={{ color: 'var(--t-text-2)', fontSize: 13 }}>Reputação {team.reputation}</div>
              {taken && (
                <div style={{ marginTop: 6 }}>
                  <span className="fms-badge">{mine ? 'você' : taken.nickname}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        {room.isOwner ? (
          <Button disabled={busy || !everyonePicked} onClick={onBegin}>
            {everyonePicked ? 'Começar jogo' : 'Aguardando todos escolherem…'}
          </Button>
        ) : (
          <p style={{ color: 'var(--t-text-2)' }}>
            {myTeamId ? 'Aguardando o dono começar o jogo…' : 'Escolha um clube.'}
          </p>
        )}
      </div>
    </>
  );
};
