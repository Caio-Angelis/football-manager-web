import { Router } from 'express';
import type { Request } from 'express';
import { z } from 'zod';
import {
  createRoom, getRoom, joinRoom, touch, toPublicRoom, getPlayer,
  startGame, pickTeam, beginGame, focusTeam, loadScope, saveScope, projectState,
  setReady, allPlayersReady, advanceRoomWeek, type Room, type RoomOpResult,
} from '../rooms/roomManager.js';
import { runAction } from '../store/storeHelpers.js';
import { AppError, ValidationError } from '../utils/errors.js';

export const roomsRouter = Router();

const nicknameSchema = z.string().trim().min(1, 'Apelido obrigatório').max(20, 'Apelido muito longo');

/** Lê e valida o header de identidade do jogador. */
function requirePlayerId(req: Request): string {
  const raw = req.header('x-player-id');
  const parsed = z.string().uuid().safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError('Header x-player-id ausente ou inválido');
  }
  return parsed.data;
}

function requireNickname(req: Request): string {
  const parsed = nicknameSchema.safeParse((req.body as { nickname?: unknown })?.nickname);
  if (!parsed.success) {
    throw new ValidationError(`Apelido inválido: ${parsed.error.issues[0]?.message ?? ''}`);
  }
  return parsed.data;
}

// POST /api/rooms — cria uma sala e retorna o código
roomsRouter.post('/', (req, res) => {
  const playerId = requirePlayerId(req);
  const nickname = requireNickname(req);
  const room = createRoom(playerId, nickname);
  res.json({ code: room.code, room: toPublicRoom(room, playerId) });
});

// POST /api/rooms/:code/join — entra numa sala (ou reentra)
roomsRouter.post('/:code/join', (req, res) => {
  const playerId = requirePlayerId(req);
  const nickname = requireNickname(req);
  const room = joinRoom(req.params.code, playerId, nickname);
  if (!room) {
    throw new AppError('NOT_FOUND', 'Sala não encontrada ou já iniciada', 404);
  }
  res.json({ room: toPublicRoom(room, playerId) });
});

// GET /api/rooms/:code — estado público da sala (usado no polling do lobby)
roomsRouter.get('/:code', (req, res) => {
  const playerId = requirePlayerId(req);
  const room = getRoom(req.params.code);
  if (!room) {
    throw new AppError('NOT_FOUND', 'Sala não encontrada', 404);
  }
  touch(room, playerId); // heartbeat
  res.json({ room: toPublicRoom(room, playerId) });
});

// --- helpers das rotas de jogo da sala ---
function requireRoom(req: Request): { room: Room; playerId: string } {
  const playerId = requirePlayerId(req);
  const room = getRoom(req.params.code);
  if (!room) throw new AppError('NOT_FOUND', 'Sala não encontrada', 404);
  touch(room, playerId);
  return { room, playerId };
}

function sendOpResult(res: import('express').Response, room: Room, playerId: string, r: RoomOpResult) {
  if (!r.ok) throw new AppError('ACTION_EXECUTION_ERROR', r.message, r.status);
  res.json({ room: toPublicRoom(room, playerId) });
}

// POST /api/rooms/:code/start — dono gera os clubes e abre o draft (Fase 3)
roomsRouter.post('/:code/start', (req, res) => {
  const { room, playerId } = requireRoom(req);
  sendOpResult(res, room, playerId, startGame(room, playerId));
});

// POST /api/rooms/:code/pick — escolhe um clube no draft (Fase 3)
roomsRouter.post('/:code/pick', (req, res) => {
  const { room, playerId } = requireRoom(req);
  const teamId = z.string().min(1).safeParse((req.body as { teamId?: unknown })?.teamId);
  if (!teamId.success) throw new ValidationError('teamId inválido');
  sendOpResult(res, room, playerId, pickTeam(room, playerId, teamId.data));
});

// POST /api/rooms/:code/begin — dono confirma o começo (todos escolheram) (Fase 3)
roomsRouter.post('/:code/begin', (req, res) => {
  const { room, playerId } = requireRoom(req);
  sendOpResult(res, room, playerId, beginGame(room, playerId));
});

// POST /api/rooms/:code/ready — marca "pronto"; quando todos estão prontos,
// a rodada é fechada automaticamente (ready-check, Fase 5).
roomsRouter.post('/:code/ready', (req, res) => {
  const { room, playerId } = requireRoom(req);
  const readyRaw = (req.body as { ready?: unknown })?.ready;
  const ready = typeof readyRaw === 'boolean' ? readyRaw : undefined;
  const r = setReady(room, playerId, ready);
  if (!r.ok) throw new AppError('ACTION_EXECUTION_ERROR', r.message, r.status);
  if (allPlayersReady(room)) advanceRoomWeek(room);
  res.json({ room: toPublicRoom(room, playerId) });
});

// GET /api/rooms/:code/state — estado do jogo projetado para o jogador (Fase 6):
// carrega o escopo dele, foca seu time, e projeta (mascara rivais).
roomsRouter.get('/:code/state', (req, res) => {
  const { room, playerId } = requireRoom(req);
  const myTeamId = getPlayer(room, playerId)?.teamId ?? null;
  if (myTeamId) loadScope(room, myTeamId);
  focusTeam(room, playerId);
  res.json({ state: projectState(room, myTeamId) });
});

// Ações globais/da sessão que um jogador individual NÃO pode disparar online.
// O avanço da rodada é coordenado (ready-check, Fase 5); saves/temporada são do host.
const ROOM_FORBIDDEN_ACTIONS = new Set([
  'advanceWeek', 'startNextSeason', 'initGame',
  'selectTeam', 'deselectTeam', 'updateTeam',   // updateTeam tem caminho próprio abaixo
  'saveGame', 'loadGame', 'deleteSave',
]);

// POST /api/rooms/:code/action — executa uma ação no universo da sala, com o
// estado por-jogador carregado (swap de escopo) e projeção escopada na resposta.
roomsRouter.post('/:code/action', (req, res) => {
  const { room, playerId } = requireRoom(req);
  const { action, args } = req.body as { action: string; args: unknown[] };
  const argList = args ?? [];
  const rp = getPlayer(room, playerId);
  const myTeamId = rp?.teamId ?? null;

  // updateTeam: o cliente manda o Team inteiro — só pode alterar o PRÓPRIO time.
  if (action === 'updateTeam') {
    const targetId = Array.isArray(argList) ? (argList[0] as string) : undefined;
    if (!myTeamId || targetId !== myTeamId) {
      throw new AppError('ACTION_EXECUTION_ERROR', 'Você só pode alterar o seu próprio clube', 403);
    }
  } else if (ROOM_FORBIDDEN_ACTIONS.has(action)) {
    throw new AppError('ACTION_EXECUTION_ERROR', `Ação "${action}" não é permitida nesta sala`, 403);
  }

  if (myTeamId) loadScope(room, myTeamId);
  focusTeam(room, playerId);
  const result = runAction(room.store, action, argList);
  if (myTeamId) saveScope(room, myTeamId);
  res.json({ result, state: projectState(room, myTeamId) });
});
