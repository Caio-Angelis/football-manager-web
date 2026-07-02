// ============================================================
// Helpers compartilhados para executar ações e extrair estado de um store.
// Usados tanto pelo single-player (singleton) quanto pelas salas online
// (uma instância por sala). Ver PlanoOnline.md — Fase 2.
// ============================================================

import type { GameStoreApi } from './gameStore.js';
import type { GameState, Team, Player } from '../types/game.js';
import { actionSchemas } from '../validation/schemas.js';
import { AppError, ValidationError } from '../utils/errors.js';
import { maskPlayerAttributes, getBestScout } from './helpers/scouting.js';

// Funções internas do Zustand que não podem ser chamadas como ações do jogo.
const ZUSTAND_INTERNALS = new Set(['setState', 'getState', 'subscribe', 'destroy', 'getInitialState']);

/** Extrai o estado (sem funções) de um store, mascarando atributos de times rivais. */
export function extractState(store: GameStoreApi): GameState {
  const state = store.getState() as unknown as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key in state) {
    if (typeof state[key] !== 'function') {
      result[key] = state[key];
    }
  }

  // Máscara de atributos: jogadores de outros times seguem o scoutKnowledge.
  if (result.selectedTeam && result.teams) {
    const teams = result.teams as Team[];
    const selectedTeam = result.selectedTeam as string;
    const scoutKnowledge = result.scoutKnowledge as Record<string, number> | undefined;
    const userTeam: Team | undefined = teams.find((t: Team) => t.id === selectedTeam);
    const bestScout = userTeam ? getBestScout(userTeam) : null;
    const judgingAbility = bestScout?.judgingAbility ?? 10;

    result.teams = teams.map((team: Team) => {
      if (team.id === selectedTeam) return team;
      return {
        ...team,
        squad: team.squad.map((player: Player) => {
          const knowledge = scoutKnowledge?.[player.id] ?? 0;
          return maskPlayerAttributes(player, knowledge, judgingAbility);
        }),
      };
    });
  }

  return result as unknown as GameState;
}

export function getActionNames(store: GameStoreApi): Set<string> {
  const state = store.getState() as unknown as Record<string, unknown>;
  const names = new Set<string>();
  for (const key in state) {
    if (typeof state[key] === 'function' && !ZUSTAND_INTERNALS.has(key)) {
      names.add(key);
    }
  }
  return names;
}

/**
 * Executa uma ação em um store: valida, trata o caso especial de `updateTeam`
 * e chama a função. Retorna o `result` da ação (ou undefined). Lança AppError.
 */
export function runAction(store: GameStoreApi, action: string, args: unknown[]): unknown {
  if (!getActionNames(store).has(action)) {
    throw new AppError('UNKNOWN_ACTION', `Unknown action: ${action}`, 400);
  }

  // updateTeam é especial: o frontend envia o objeto Team pré-computado.
  if (action === 'updateTeam') {
    const [teamId, newTeam] = args as [string, Team];
    const state = store.getState();
    store.setState({ teams: state.teams.map(t => (t.id === teamId ? newTeam : t)) });
    return undefined;
  }

  const fn = (store.getState() as unknown as Record<string, unknown>)[action];
  if (typeof fn !== 'function') {
    throw new AppError('ACTION_NOT_FOUND', `Action not found: ${action}`, 400);
  }

  const schema = actionSchemas[action];
  if (schema) {
    const parsed = schema.safeParse(args ?? []);
    if (!parsed.success) {
      throw new ValidationError(
        `Invalid args for action "${action}": ${parsed.error.message}`,
        parsed.error.issues,
      );
    }
  } else {
    console.warn(`[WARN] No validation schema for action "${action}"`);
  }

  try {
    return fn.apply(store.getState(), args);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AppError('ACTION_EXECUTION_ERROR', `Action "${action}" failed: ${message}`, 500);
  }
}
