import { promises as fs } from 'fs';
import path from 'path';
import type { SaveSlot, SaveSlotMetadata } from '../types/game';

const SAVES_DIR = path.resolve(process.cwd(), 'saves');

async function ensureSavesDir(): Promise<void> {
  await fs.mkdir(SAVES_DIR, { recursive: true });
}

function slotFilePath(slotNumber: number): string {
  return path.join(SAVES_DIR, `save_slot_${slotNumber}.json`);
}

export async function persistSave(slot: SaveSlot): Promise<void> {
  await ensureSavesDir();
  const filePath = slotFilePath(slot.metadata.slotNumber);
  await fs.writeFile(filePath, JSON.stringify(slot, null, 2), 'utf-8');
}

export async function loadSaveFromDisk(slotNumber: 1 | 2): Promise<SaveSlot | null> {
  try {
    const filePath = slotFilePath(slotNumber);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as SaveSlot;
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
