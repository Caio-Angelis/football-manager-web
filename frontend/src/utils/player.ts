import type { Player } from '../types/game';

export function getFullName(player: Pick<Player, 'name' | 'surname'>): string {
  return player.surname ? `${player.name} ${player.surname}` : player.name;
}
