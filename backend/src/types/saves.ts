// Tipos do Sistema de Saves (Máximo 2 slots + autosave)

import type { GameState } from './game';

export const CURRENT_SCHEMA_VERSION = 1;

export interface SaveSlotMetadata {
  slotNumber: 0 | 1 | 2; // 0 = autosave (oculto da UI)
  teamName: string;
  currentWeek: number;
  currentSeason: number;
  savedAt: string; // ISO date string
  schemaVersion: number;
}

export interface SaveSlot {
  metadata: SaveSlotMetadata;
  gameState: GameState;
  schemaVersion: number;
}
