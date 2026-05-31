import type { AIStateSnapshot } from '../../../types';
import type { AIStorageAdapter } from './ai-storage-adapter';

const KEY_PREFIX = 'jarvis-life-ai-save';
const CURRENT_SESSION_KEY = 'jarvis-life-ai-current-session';

function getStorage(): Storage | null {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

function slotKey(slot?: number): string {
  return slot !== undefined ? `${KEY_PREFIX}-${slot}` : CURRENT_SESSION_KEY;
}

export const browserAIStorage: AIStorageAdapter = {
  async load(slot?: number): Promise<AIStateSnapshot | null> {
    const storage = getStorage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(slotKey(slot));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AIStateSnapshot;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.eventLog)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  async save(snapshot: AIStateSnapshot, slot?: number): Promise<void> {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(slotKey(slot), JSON.stringify(snapshot));
  },

  async clear(slot?: number): Promise<void> {
    const storage = getStorage();
    if (!storage) return;
    storage.removeItem(slotKey(slot));
  },
};
