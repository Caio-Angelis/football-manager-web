import { Router } from 'express';
import { gameStore } from '../store/gameStore.js';
import { extractState, runAction } from '../store/storeHelpers.js';

export const gameRouter = Router();

gameRouter.get('/state', (_req, res) => {
  res.json({ state: extractState(gameStore) });
});

gameRouter.post('/action', (req, res) => {
  const { action, args } = req.body as { action: string; args: unknown[] };
  const result = runAction(gameStore, action, args ?? []);
  res.json({ result, state: extractState(gameStore) });
});

gameRouter.post('/init', (_req, res) => {
  gameStore.getState().initGame();
  res.json({ state: extractState(gameStore) });
});
