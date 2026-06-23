import { beforeEach } from 'vitest';
import { useGameStore } from '../store/gameStore';

beforeEach(() => {
  localStorage.clear();
  useGameStore.persist.clearStorage();
  useGameStore.getState().initGame();
});
