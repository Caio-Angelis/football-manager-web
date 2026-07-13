// Resolução de fotos dos jogadores.
//
// As imagens ficam em `frontend/public/players/` e o mapeamento
// `player_images.json` liga cada jogador (chave "time/Nome Completo") a um
// arquivo. Entradas com `source: "fallback"` são silhuetas SVG genéricas — nós
// as ignoramos e usamos o avatar de iniciais do próprio app, que é mais
// consistente visualmente. Só fotos reais (Wikipedia) são exibidas.

import type { Player } from '../types/game';
import { getFullName } from './player';

interface PhotoEntry {
  file: string;
  source: string;
}

type RawPhotoMap = Record<string, PhotoEntry>;

let normIndex: Record<string, PhotoEntry> | null = null;
let loadPromise: Promise<void> | null = null;

/** Normaliza para casar nomes ignorando acentos, caixa e espaços extras. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extrai a chave do time a partir do id do jogador (`t_<time>_p<idx>`). */
function teamKeyFromId(id: string): string | null {
  const match = /^t_(.+)_p\d+$/.exec(id);
  return match ? match[1] : null;
}

/**
 * Carrega o mapeamento de fotos uma única vez (cacheado no módulo).
 * Resolve mesmo em caso de erro — nesse caso todos caem no avatar de iniciais.
 */
export function loadPlayerPhotos(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = fetch('/players/player_images.json')
    .then(res => (res.ok ? res.json() : {}))
    .then((data: RawPhotoMap) => {
      normIndex = {};
      for (const [key, entry] of Object.entries(data)) {
        const slash = key.indexOf('/');
        if (slash < 0) continue;
        const team = key.slice(0, slash);
        const name = key.slice(slash + 1);
        normIndex[`${team}/${normalize(name)}`] = entry;
      }
    })
    .catch(() => {
      normIndex = {};
    });
  return loadPromise;
}

/** true quando o mapeamento já foi carregado (para forçar re-render). */
export function photosReady(): boolean {
  return normIndex !== null;
}

/**
 * Retorna a URL da foto do jogador, ou null se não houver foto real
 * (mapeamento ainda não carregado, jogador ausente, ou entrada de fallback).
 */
export function resolvePlayerPhoto(
  player: Pick<Player, 'id' | 'name' | 'surname'>,
): string | null {
  if (!normIndex) return null;
  const team = teamKeyFromId(player.id);
  if (!team) return null;
  const entry = normIndex[`${team}/${normalize(getFullName(player))}`];
  if (!entry || entry.source === 'fallback') return null;
  return `/players/${encodeURIComponent(entry.file)}`;
}
