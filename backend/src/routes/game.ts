import { Router } from 'express';
import { useGameStore } from '../store/gameStore.js';
import type { GameState, Team, Player } from '../types/game.js';
import { actionSchemas } from '../validation/schemas.js';
import { AppError, ValidationError } from '../utils/errors.js';
import { maskPlayerAttributes, getBestScout } from '../store/helpers/scouting.js';

export const gameRouter = Router();

function extractState(): GameState {
  const state = useGameStore.getState() as unknown as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key in state) {
    if (typeof state[key] !== 'function') {
      result[key] = state[key];
    }
  }

  // ============================================================
  // MÁSCARA DE ATRIBUTOS: Jogadores de outros times têm atributos
  // mascarados baseado no scoutKnowledge do GameState.
  // ============================================================
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

// Auto-discover all action names from the store (functions only)
function getActionNames(): Set<string> {
  const state = useGameStore.getState() as unknown as Record<string, unknown>;
  const names = new Set<string>();
  for (const key in state) {
    if (typeof state[key] === 'function') {
      names.add(key);
    }
  }
  return names;
}

gameRouter.get('/state', (_req, res) => {
  res.json({ state: extractState() });
});

gameRouter.post('/action', (req, res) => {
  const { action, args } = req.body as { action: string; args: unknown[] };

  const actionNames = getActionNames();
  if (!actionNames.has(action)) {
    throw new AppError('UNKNOWN_ACTION', `Unknown action: ${action}`, 400);
  }

  // updateTeam is special: frontend sends the pre-computed Team object
  // instead of a function updater
  if (action === 'updateTeam') {
    const [teamId, newTeam] = args as [string, Team];
    const state = useGameStore.getState();
    useGameStore.setState({
      teams: state.teams.map(t => (t.id === teamId ? newTeam : t)),
    });
    res.json({ state: extractState() });
    return;
  }

  const fn = (useGameStore.getState() as unknown as Record<string, unknown>)[action];
  if (typeof fn !== 'function') {
    throw new AppError('ACTION_NOT_FOUND', `Action not found: ${action}`, 400);
  }

  // Validate input with Zod schema if available
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
    const result = fn.apply(useGameStore.getState(), args);
    res.json({ result, state: extractState() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AppError('ACTION_EXECUTION_ERROR', `Action "${action}" failed: ${message}`, 500);
  }
});

gameRouter.post('/init', (_req, res) => {
  useGameStore.getState().initGame();
  res.json({ state: extractState() });
});
