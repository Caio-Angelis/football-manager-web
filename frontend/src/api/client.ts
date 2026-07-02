const API_BASE = '/api';

// Identidade estável do jogador para o modo online (persistida no navegador).
// Enviada no header `x-player-id` nas rotas de sala (ver PlanoOnline.md — Fase 1+).
export function getPlayerId(): string {
  let id = localStorage.getItem('fm-player-id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('fm-player-id', id);
  }
  return id;
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost<T = any>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

// Sala ativa: quando definida, TODAS as ações do jogo são roteadas para o
// universo da sala (ver PlanoOnline.md — Fase 2). teamId = time do jogador.
let activeRoom: { code: string; teamId: string | null } | null = null;
export function setActiveRoom(code: string, teamId: string | null): void { activeRoom = { code, teamId }; }
export function clearActiveRoom(): void { activeRoom = null; }
export function getActiveRoom(): { code: string; teamId: string | null } | null { return activeRoom; }

export async function apiAction(action: string, args: any[]): Promise<{ result: any; state: any }> {
  if (activeRoom) {
    return roomFetch(`/${activeRoom.code}/action`, { method: 'POST', body: JSON.stringify({ action, args }) });
  }
  return apiPost('/action', { action, args });
}

// ============================================================
// SALAS ONLINE (ver PlanoOnline.md — Fase 1+)
// ============================================================

export interface PublicRoomPlayer {
  nickname: string;
  teamId: string | null;
  ready: boolean;
  connected: boolean;
  isOwner: boolean;
  isYou: boolean;
}
export interface PublicRoom {
  code: string;
  status: 'lobby' | 'drafting' | 'playing' | 'finished';
  createdAt: number;
  currentWeek: number;
  isOwner: boolean;
  players: PublicRoomPlayer[];
}

async function roomFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/rooms${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-player-id': getPlayerId(),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Sala: erro ${res.status}`);
  }
  return res.json();
}

export function createRoom(nickname: string): Promise<{ code: string; room: PublicRoom }> {
  return roomFetch('', { method: 'POST', body: JSON.stringify({ nickname }) });
}
export function joinRoom(code: string, nickname: string): Promise<{ room: PublicRoom }> {
  return roomFetch(`/${encodeURIComponent(code)}/join`, { method: 'POST', body: JSON.stringify({ nickname }) });
}
export function getRoom(code: string): Promise<{ room: PublicRoom }> {
  return roomFetch(`/${encodeURIComponent(code)}`, { method: 'GET' });
}

// --- jogo da sala (Fase 2/3) ---
export function startRoom(code: string): Promise<{ room: PublicRoom }> {
  return roomFetch(`/${encodeURIComponent(code)}/start`, { method: 'POST' });
}
export function pickTeam(code: string, teamId: string): Promise<{ room: PublicRoom }> {
  return roomFetch(`/${encodeURIComponent(code)}/pick`, { method: 'POST', body: JSON.stringify({ teamId }) });
}
export function beginRoom(code: string): Promise<{ room: PublicRoom }> {
  return roomFetch(`/${encodeURIComponent(code)}/begin`, { method: 'POST' });
}
export function apiRoomState(code: string): Promise<{ state: any }> {
  return roomFetch(`/${encodeURIComponent(code)}/state`, { method: 'GET' });
}
export function setRoomReady(code: string, ready?: boolean): Promise<{ room: PublicRoom }> {
  return roomFetch(`/${encodeURIComponent(code)}/ready`, { method: 'POST', body: JSON.stringify({ ready }) });
}
