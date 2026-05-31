import type { SaveId, SaveMeta, SaveBundle, SaveStorageAdapter } from '../types';
import type { StorageEntry, SearchHit } from './storage-port';

declare global {
  interface Window {
    jarvis?: {
      platform: string;
      isElectron: boolean;
      save: {
        list: () => Promise<SaveMeta[]>;
        load: (saveId: string) => Promise<SaveBundle | null>;
        write: (saveId: string, bundle: unknown) => Promise<boolean>;
        delete: (saveId: string) => Promise<boolean>;
      };
      memory: {
        read: (saveId: string, role: string, filename: string) => Promise<string | null>;
        write: (saveId: string, role: string, filename: string, content: string) => Promise<{ ok?: boolean; error?: string }>;
        list: (saveId: string, role: string) => Promise<{ root: string[]; memories: string[] }>;
        search: (saveId: string, role: string, query: string) => Promise<{ filename: string; snippet: string }[]>;
        clearSave: (saveId: string) => Promise<boolean>;
      };
      storage: {
        readText: (path: string) => Promise<string | null>;
        writeText: (path: string, content: string, options?: { backup?: boolean }) => Promise<boolean>;
        list: (path: string) => Promise<StorageEntry[]>;
        exists: (path: string) => Promise<boolean>;
        delete: (path: string) => Promise<boolean>;
        searchText: (path: string, query: string) => Promise<SearchHit[]>;
      };
      builtin: {
        getConfig: () => Promise<{
          available: boolean;
          provider: string;
          modelId: string;
          displayName: string;
          displayModelName: string;
          apiKey: string;
          baseURL: string;
        }>;
      };
    };
  }
}

export const isElectron = (): boolean =>
  typeof window !== 'undefined' && window.jarvis?.isElectron === true;

export const electronSaveStorage: SaveStorageAdapter = {
  async listSaves(): Promise<SaveMeta[]> {
    if (!window.jarvis?.save) return [];
    return window.jarvis.save.list();
  },

  async loadSave(saveId: SaveId): Promise<SaveBundle | null> {
    if (!window.jarvis?.save) return null;
    return window.jarvis.save.load(saveId);
  },

  async writeSave(saveId: SaveId, bundle: SaveBundle): Promise<void> {
    if (!window.jarvis?.save) return;
    await window.jarvis.save.write(saveId, bundle);
  },

  async deleteSave(saveId: SaveId): Promise<void> {
    if (!window.jarvis?.save) return;
    await window.jarvis.save.delete(saveId);
  },
};
