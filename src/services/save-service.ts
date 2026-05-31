import type {
  SaveId,
  SaveBundle,
  AIStateSnapshot,
  FullGameState,
} from '../types';
import {
  fileSaveStorage,
  generateSaveId,
  readLegacySaveBundles,
} from './save-storage';
import type { SaveStorageAdapter } from '../types';
import { getMemoryFileService } from './memory-file-service';
import { ensureAgentSaveInitialized, initializeNewAgentSave } from './agent-save-service';
import { clearEventDialogueDrafts } from './save-scoped-storage';
import {
  getStoragePort,
  type StoragePortStatus,
  getLastBrowserSaveId,
  setLastBrowserSaveId,
  hasBrowserLegacyMigrationRun,
  markBrowserLegacyMigrationRun,
  rebindBrowserFolder,
} from './storage-port';

const adapter: SaveStorageAdapter = fileSaveStorage;
let currentSaveId: SaveId | null = null;
const saveWriteQueues = new Map<SaveId, Promise<void>>();
let currentSaveCreation: Promise<SaveId> | null = null;
let currentSaveEpoch = 0;

export function getSaveAdapter(): SaveStorageAdapter {
  return adapter;
}

export function getCurrentSaveId(): SaveId | null {
  return currentSaveId;
}

export function setCurrentSaveId(saveId: SaveId | null): void {
  adoptCurrentSaveId(saveId);
  void setLastBrowserSaveId(saveId);
}

function adoptCurrentSaveId(saveId: SaveId | null): void {
  currentSaveId = saveId;
  currentSaveEpoch += 1;
  if (!saveId) {
    currentSaveCreation = null;
  }
}

export function hasActiveSave(): boolean {
  return currentSaveId !== null;
}

async function initializeAgentsBestEffort(saveId: SaveId, bundle: SaveBundle, source?: 'new-save' | 'legacy-save'): Promise<void> {
  try {
    if (source === 'new-save') {
      await initializeNewAgentSave(saveId, bundle);
    } else {
      await ensureAgentSaveInitialized(saveId, bundle);
    }
  } catch (error) {
    console.warn('[Agent Save] 初始化长期 Agent 存档失败，游戏存档仍会继续读取。', error);
  }
}

/**
 * Create a new save and set it as current.
 */
export async function createSave(
  gameState: FullGameState,
  aiSnapshot: AIStateSnapshot | null,
): Promise<SaveId> {
  const saveId = generateSaveId();
  const bundle: SaveBundle = {
    version: 2,
    saveId,
    savedAt: Date.now(),
    game: gameState,
    ai: aiSnapshot,
  };
  await enqueueSaveWrite(saveId, bundle);
  adoptCurrentSaveId(saveId);
  await setLastBrowserSaveId(saveId);
  await initializeAgentsBestEffort(saveId, bundle, 'new-save');
  return saveId;
}

/**
 * Save to the current saveId. If no current save, creates one.
 */
export async function saveCurrent(
  gameState: FullGameState,
  aiSnapshot: AIStateSnapshot | null,
  saveIdOverride?: SaveId,
): Promise<void> {
  const targetSaveId = saveIdOverride ?? currentSaveId;

  if (!targetSaveId) {
    const { saveId, created, active } = await ensureCurrentSaveForWrite(gameState, aiSnapshot);
    if (!active) return;
    if (!created) {
      const bundle: SaveBundle = {
        version: 2,
        saveId,
        savedAt: Date.now(),
        game: gameState,
        ai: aiSnapshot,
      };
      await enqueueSaveWrite(saveId, bundle);
    }
    return;
  }

  const bundle: SaveBundle = {
    version: 2,
    saveId: targetSaveId,
    savedAt: Date.now(),
    game: gameState,
    ai: aiSnapshot,
  };
  await enqueueSaveWrite(targetSaveId, bundle);
}

async function ensureCurrentSaveForWrite(
  gameState: FullGameState,
  aiSnapshot: AIStateSnapshot | null,
): Promise<{ saveId: SaveId; created: boolean; active: boolean }> {
  if (currentSaveId) return { saveId: currentSaveId, created: false, active: true };

  let createdByThisCall = false;
  if (!currentSaveCreation) {
    createdByThisCall = true;
    const creation = createInitialCurrentSave(gameState, aiSnapshot, currentSaveEpoch);
    currentSaveCreation = creation;
    void creation.then(
      () => {
        if (currentSaveCreation === creation) {
          currentSaveCreation = null;
        }
      },
      () => {
        if (currentSaveCreation === creation) {
          currentSaveCreation = null;
        }
      },
    );
  }

  const saveId = await currentSaveCreation;
  return { saveId, created: createdByThisCall, active: currentSaveId === saveId };
}

async function createInitialCurrentSave(
  gameState: FullGameState,
  aiSnapshot: AIStateSnapshot | null,
  expectedEpoch: number,
): Promise<SaveId> {
  if (currentSaveId) return currentSaveId;

  const saveId = generateSaveId();
  const bundle: SaveBundle = {
    version: 2,
    saveId,
    savedAt: Date.now(),
    game: gameState,
    ai: aiSnapshot,
  };
  await enqueueSaveWrite(saveId, bundle);
  if (currentSaveId || currentSaveEpoch !== expectedEpoch) {
    return saveId;
  }
  adoptCurrentSaveId(saveId);
  await setLastBrowserSaveId(saveId);
  await initializeAgentsBestEffort(saveId, bundle, 'new-save');
  return saveId;
}

function enqueueSaveWrite(saveId: SaveId, bundle: SaveBundle): Promise<void> {
  const previous = saveWriteQueues.get(saveId) ?? Promise.resolve();
  const write = previous
    .catch(() => undefined)
    .then(() => adapter.writeSave(saveId, bundle));

  const tracked = write.catch(() => undefined);
  saveWriteQueues.set(saveId, tracked);
  return write.finally(() => {
    if (saveWriteQueues.get(saveId) === tracked) {
      saveWriteQueues.delete(saveId);
    }
  });
}

/**
 * Load a save by ID and set it as current.
 */
export async function loadSaveById(saveId: SaveId): Promise<SaveBundle | null> {
  const bundle = await adapter.loadSave(saveId);
  if (bundle) {
    adoptCurrentSaveId(saveId);
    await setLastBrowserSaveId(saveId);
    await initializeAgentsBestEffort(saveId, bundle);
  }
  return bundle;
}

/**
 * Delete a save. If it's the current save, clears currentSaveId.
 */
export async function deleteSaveById(saveId: SaveId): Promise<void> {
  await adapter.deleteSave(saveId);
  clearEventDialogueDrafts(saveId);
  const memService = getMemoryFileService();
  try {
    await memService.clearSave(saveId);
  } catch (error) {
    console.warn('[Save] Failed to clear memory files for deleted save:', error);
  }
  if (currentSaveId === saveId) {
    adoptCurrentSaveId(null);
    await setLastBrowserSaveId(null);
  }
}

interface FindLatestSaveOptions {
  activate?: boolean;
}

/**
 * Find the most recent save for "Continue Game".
 * Also runs legacy migration if needed.
 */
export async function findLatestSave(options: FindLatestSaveOptions = {}): Promise<SaveBundle | null> {
  const activate = options.activate ?? true;
  const status = await getStoragePort().status();
  if (status.state !== 'ready') return null;

  await runLegacyMigrationIfNeeded();

  const saves = await adapter.listSaves();
  const lastBrowserSaveId = await getLastBrowserSaveId();
  if (saves.length === 0) {
    if (lastBrowserSaveId) await setLastBrowserSaveId(null);
    return null;
  }

  const latest = saves[0];
  const lastMeta = lastBrowserSaveId
    ? saves.find((save) => save.saveId === lastBrowserSaveId)
    : null;
  const candidate = lastMeta && lastMeta.updatedAt >= latest.updatedAt
    ? lastMeta
    : latest;

  if (lastBrowserSaveId && !lastMeta) {
    await setLastBrowserSaveId(null);
  }

  const latestBundle = await adapter.loadSave(candidate.saveId);
  if (latestBundle) {
    if (activate) {
      adoptCurrentSaveId(latestBundle.saveId);
      await setLastBrowserSaveId(latestBundle.saveId);
      await initializeAgentsBestEffort(latestBundle.saveId, latestBundle);
    }
  }
  return latestBundle;
}

/**
 * Initialize on app startup — run migration and try to restore current session.
 */
export async function initSaveSystem(): Promise<void> {
  const status = await getStoragePort().status();
  if (status.state === 'ready') {
    await runLegacyMigrationIfNeeded();
  }
}

export async function requestSaveStorageAccess(): Promise<StoragePortStatus> {
  return getStoragePort().requestAccess();
}

export async function changeSaveStorageFolder(): Promise<StoragePortStatus> {
  const status = await rebindBrowserFolder();
  if (status.state === 'ready') {
    adoptCurrentSaveId(null);
    void runLegacyMigrationIfNeeded();
  }
  return status;
}

export async function getSaveStorageStatus(): Promise<StoragePortStatus> {
  return getStoragePort().status();
}

export async function runLegacyMigrationIfNeeded(): Promise<void> {
  if (getStoragePort().kind !== 'browser-folder') return;
  const status = await getStoragePort().status();
  if (status.state !== 'ready') return;
  if (await hasBrowserLegacyMigrationRun()) return;

  const bundles = readLegacySaveBundles();
  for (const bundle of bundles) {
    const existing = await adapter.loadSave(bundle.saveId);
    if (!existing) {
      await adapter.writeSave(bundle.saveId, bundle);
    }
    await initializeAgentsBestEffort(bundle.saveId, bundle);
  }

  await getMemoryFileService().migrateLegacyLocalStorage?.();
  await markBrowserLegacyMigrationRun();
}
