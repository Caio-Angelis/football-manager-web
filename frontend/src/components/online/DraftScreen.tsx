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
  // Mapa teamId -> dono (a partir da lista pública de jogadores).
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
      <p className="fmo__lede">
        {myTeamId ? 'Você pode trocar enquanto o draft estiver aberto.' : 'Clique num clube livre para escolher.'}
      </p>

      <div className="fmo-draft">
        {sorted.map(team => {
          const taken = ownerByTeam.get(team.id);
          const mine = taken?.isYou;
          const disabled = busy || (!!taken && !mine);
          const cls = `fmo-club${mine ? ' is-mine' : ''}${taken ? ' is-taken' : ''}`;
          return (
            <button
              key={team.id}
              type="button"
              className={cls}
              disabled={disabled}
              aria-pressed={!!mine}
              onClick={() => !disabled && onPick(team.id)}
            >
              <div className="fmo-club__name">{team.name}</div>
              <div className="fmo-club__rep">Reputação {team.reputation}</div>
              {taken && (
                <div className="fmo-club__owner">
                  <span className={`fmo-badge ${mine ? 'fmo-badge--you' : ''}`}>{mine ? 'você' : taken.nickname}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="fmo-actions">
        {room.isOwner ? (
          <Button disabled={busy || !everyonePicked} onClick={onBegin}>
            {everyonePicked ? 'Começar jogo' : 'Aguardando todos escolherem…'}
          </Button>
        ) : (
          <p className="fmo-hint">
            {myTeamId ? 'Aguardando o dono começar o jogo…' : 'Escolha um clube.'}
          </p>
        )}
      </div>
    </>
  );
};
