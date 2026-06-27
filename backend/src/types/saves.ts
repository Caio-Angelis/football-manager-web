// Tipos do Sistema de Saves (Máximo 2 slots)

import type { GameState } from './game';

export interface SaveSlotMetadata {
  slotNumber: 1 | 2;
  teamName: string;
  currentWeek: number;
  currentSeason: number;
  savedAt: string; // ISO date string
}

export interface SaveSlot {
  metadata: SaveSlotMetadata;
  gameState: GameState;
}
