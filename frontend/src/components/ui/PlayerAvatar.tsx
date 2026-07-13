import React, { useEffect, useState } from 'react';
import type { Player } from '../../types/game';
import { getFullName } from '../../utils/player';
import { getPositionColor, getPositionTint } from '../../utils/statusColors';
import { loadPlayerPhotos, resolvePlayerPhoto } from '../../utils/playerPhotos';

interface PlayerAvatarProps {
  player: Pick<Player, 'id' | 'name' | 'surname' | 'position'>;
  /** Diâmetro em px. Default 40. */
  size?: number;
  className?: string;
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Foto do jogador com fallback para iniciais tingidas pela posição.
 * Usa a foto real (Wikipedia) quando existe; se o mapeamento ainda não
 * carregou, não há foto, ou a imagem falha ao carregar, mostra as iniciais.
 */
export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ player, size = 40, className }) => {
  const [, forceRender] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadPlayerPhotos().then(() => {
      if (alive) forceRender(v => v + 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Reseta o estado de erro quando o jogador muda (componente reutilizado em listas).
  useEffect(() => {
    setFailed(false);
  }, [player.id]);

  const fullName = getFullName(player);
  const src = failed ? null : resolvePlayerPhoto(player);

  return (
    <span
      className={`fm-avatar${className ? ` ${className}` : ''}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        backgroundColor: getPositionTint(player.position),
        color: getPositionColor(player.position),
      }}
      title={fullName}
      aria-label={fullName}
    >
      {src ? (
        <img
          className="fm-avatar__img"
          src={src}
          alt={fullName}
          loading="lazy"
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="fm-avatar__initials">{getInitials(fullName)}</span>
      )}
    </span>
  );
};
