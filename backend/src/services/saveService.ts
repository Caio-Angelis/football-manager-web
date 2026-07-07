import { promises as fs } from 'fs';
import path from 'path';
import type { SaveSlot, SaveSlotMetadata, GameState } from '../types/game';
import { CURRENT_SCHEMA_VERSION } from '../types/saves';

const SAVES_DIR = path.resolve(process.cwd(), 'saves');

async function ensureSavesDir(): Promise<void> {
  await fs.mkdir(SAVES_DIR, { recursive: true });
}

function slotFilePath(slotNumber: number): string {
  return path.join(SAVES_DIR, `save_slot_${slotNumber}.json`);
}

// Migrações de schema — aplicar quando o estado do jogo mudar de estrutura.
const migrations: Record<number, (state: GameState) => GameState> = {
  // 1: (state) => ({ ...state, newField: defaultValue }),
};

function migrateGameState(state: GameState, fromVersion: number): GameState {
  let migrated = state;
  for (let v = fromVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    const migrator = migrations[v];
    if (migrator) migrated = migrator(migrated);
  }
  return migrated;
}

export async function persistSave(slot: SaveSlot): Promise<void> {
  await ensureSavesDir();
  const filePath = slotFilePath(slot.metadata.slotNumber);
  await fs.writeFile(filePath, JSON.stringify(slot, null, 2), 'utf-8');
}

export async function autoSave(slot: SaveSlot): Promise<void> {
  await ensureSavesDir();
  const filePath = slotFilePath(0);
  await fs.writeFile(filePath, JSON.stringify(slot, null, 2), 'utf-8');
}

export async function loadAutoSave(): Promise<SaveSlot | null> {
  return loadSaveFromDisk(0);
}

export async function loadSaveFromDisk(slotNumber: 0 | 1 | 2): Promise<SaveSlot | null> {
  try {
    const filePath = slotFilePath(slotNumber);
    const data = await fs.readFile(filePath, 'utf-8');
    const raw = JSON.parse(data) as SaveSlot;

    // Migração de schema
    const savedVersion = raw.schemaVersion ?? raw.metadata?.schemaVersion ?? 0;
    if (savedVersion > CURRENT_SCHEMA_VERSION) {
      throw new Error(`Save schema version ${savedVersion} is newer than supported (${CURRENT_SCHEMA_VERSION}). Cannot load.`);
    }
    if (savedVersion < CURRENT_SCHEMA_VERSION) {
      raw.gameState = migrateGameState(raw.gameState, savedVersion);
      raw.schemaVersion = CURRENT_SCHEMA_VERSION;
      raw.metadata.schemaVersion = CURRENT_SCHEMA_VERSION;
    }

    return raw;
  } catch {
    return null;
  }
}

export async function deleteSaveFromDisk(slotNumber: 1 | 2): Promise<void> {
  try {
    const filePath = slotFilePath(slotNumber);
    await fs.unlink(filePath);
  } catch {
    // File may not exist — ignore
  }
}

export async function listSaveSlotsFromDisk(): Promise<SaveSlotMetadata[]> {
  await ensureSavesDir();
  const slots: SaveSlotMetadata[] = [];
  for (const slotNumber of [1, 2] as const) {
    const save = await loadSaveFromDisk(slotNumber);
    if (save) {
      slots.push(save.metadata);
    }
  }
  return slots;
}
