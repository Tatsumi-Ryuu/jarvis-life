import type { SaveId, AgentRole } from '../../../types';
import { getCurrentSaveId } from '../../../services/save-service';

export interface AIMemoryEntry {
  id: string;
  role: AgentRole;
  month: number;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface AIMemoryIndex {
  entries: AIMemoryEntry[];
  summary: string;
  lastArchivedMonth: number;
}

const STORAGE_KEY_PREFIX = 'jarvis-life-ai-memory';

function storageKey(saveId: SaveId, role: AgentRole): string {
  return `${STORAGE_KEY_PREFIX}::${saveId}::${role}`;
}

function getStorage(): Storage | null {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

export function loadMemoryIndex(saveId: SaveId, role: AgentRole): AIMemoryIndex {
  const storage = getStorage();
  if (!storage) return { entries: [], summary: '', lastArchivedMonth: 0 };
  try {
    const raw = storage.getItem(storageKey(saveId, role));
    if (!raw) return { entries: [], summary: '', lastArchivedMonth: 0 };
    return JSON.parse(raw) as AIMemoryIndex;
  } catch {
    return { entries: [], summary: '', lastArchivedMonth: 0 };
  }
}

export function saveMemoryIndex(saveId: SaveId, role: AgentRole, index: AIMemoryIndex): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(storageKey(saveId, role), JSON.stringify(index));
}

export function appendMemory(
  content: string,
  month: number,
  role: AgentRole = 'companion',
): void {
  const saveId = getCurrentSaveId();
  if (!saveId) return;

  const index = loadMemoryIndex(saveId, role);
  const entry: AIMemoryEntry = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role,
    month,
    content,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  index.entries.push(entry);
  saveMemoryIndex(saveId, role, index);
}

export function getMemorySummary(role: AgentRole = 'companion'): string {
  const saveId = getCurrentSaveId();
  if (!saveId) return '';

  const index = loadMemoryIndex(saveId, role);
  if (index.summary) return index.summary;

  // Auto-generate summary from entries
  if (index.entries.length === 0) return '';

  const recentEntries = index.entries.slice(-10);
  const lines = recentEntries.map(
    (e) => `[第${e.month}月] ${e.content}`,
  );
  return lines.join('\n');
}

export function updateMemorySummary(summary: string, role: AgentRole = 'companion'): void {
  const saveId = getCurrentSaveId();
  if (!saveId) return;

  const index = loadMemoryIndex(saveId, role);
  index.summary = summary;
  saveMemoryIndex(saveId, role, index);
}

export function clearMemoryForSave(saveId: SaveId): void {
  const storage = getStorage();
  if (!storage) return;

  const roles: AgentRole[] = ['companion', 'evaluator', 'narrator'];
  for (const role of roles) {
    storage.removeItem(storageKey(saveId, role));
  }
}
