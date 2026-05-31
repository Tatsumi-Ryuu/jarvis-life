/**
 * MemoryFileService — file-backed AI memory operations.
 *
 * Both Electron and the browser folder runtime use the same path semantics:
 * saves/{saveId}/agents/{role}/...
 */
import type { SaveId, AgentRole } from '../types';
import { getCurrentSaveId } from './save-service';
import { getStoragePort } from './storage-port';
import { loadMemoryIndex, type AIMemoryIndex } from '../engine/narrative/core/ai-memory-store';

// === Frontmatter helpers ===

export interface MemoryFrontmatter {
  schema_version: number;
  save_id: string;
  role: string;
  memory_type: 'monthly' | 'identity' | 'soul' | 'user' | 'index';
  month?: number;
  source_event_ids?: string[];
  updated_at: string;
}

export function buildFrontmatter(fm: MemoryFrontmatter): string {
  const lines = ['---'];
  lines.push(`schema_version: ${fm.schema_version}`);
  lines.push(`save_id: ${fm.save_id}`);
  lines.push(`role: ${fm.role}`);
  lines.push(`memory_type: ${fm.memory_type}`);
  if (fm.month !== undefined) lines.push(`month: ${fm.month}`);
  if (fm.source_event_ids && fm.source_event_ids.length > 0) {
    lines.push('source_event_ids:');
    for (const id of fm.source_event_ids) {
      lines.push(`  - ${id}`);
    }
  }
  lines.push(`updated_at: ${fm.updated_at}`);
  lines.push('---');
  return lines.join('\n');
}

export function wrapMarkdownFile(fm: MemoryFrontmatter, body: string): string {
  return `${buildFrontmatter(fm)}\n\n${body}`;
}

export interface MemoryFileService {
  read(role: AgentRole, filename: string, saveId?: SaveId): Promise<string | null>;
  write(role: AgentRole, filename: string, content: string, saveId?: SaveId): Promise<{ ok: boolean; error?: string }>;
  list(role: AgentRole, saveId?: SaveId): Promise<{ root: string[]; memories: string[] }>;
  search(role: AgentRole, query: string, saveId?: SaveId): Promise<{ filename: string; snippet: string }[]>;
  clearSave(saveId?: SaveId): Promise<void>;
  getIndex(role: AgentRole, saveId?: SaveId): Promise<AIMemoryIndex>;
  updateIndexSummary(role: AgentRole, summary: string, saveId?: SaveId): Promise<void>;
  migrateLegacyLocalStorage?: () => Promise<void>;
}

const ROOT_FILES = new Set(['identity.md', 'soul.md', 'user.md', 'index.md']);
const memoryIndexCache = new Map<string, AIMemoryIndex>();

function stripFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
}

function memoryBasePath(saveId: SaveId, role: AgentRole): string {
  return `saves/${saveId}/agents/${role}`;
}

function memoryFilePath(saveId: SaveId, role: AgentRole, filename: string): string {
  const clean = sanitizeMemoryFilename(filename);
  if (clean === 'index.md') {
    return `${memoryBasePath(saveId, role)}/memories/index.md`;
  }
  return ROOT_FILES.has(clean)
    ? `${memoryBasePath(saveId, role)}/${clean}`
    : `${memoryBasePath(saveId, role)}/memories/${clean}`;
}

function sanitizeMemoryFilename(filename: string): string {
  if (!/^[a-zA-Z0-9_-]+\.md$/.test(filename)) {
    throw new Error(`Invalid memory filename: ${filename}`);
  }
  return filename;
}

function getRequiredSaveId(saveId?: SaveId): SaveId | null {
  return saveId ?? getCurrentSaveId();
}

function indexCacheKey(saveId: SaveId, role: AgentRole): string {
  return `${saveId}:${role}`;
}

async function rebuildIndexFromFiles(saveId: SaveId, role: AgentRole): Promise<AIMemoryIndex> {
  const port = getStoragePort();
  const root = `${memoryBasePath(saveId, role)}`;
  const indexContent = await port.readText(`${root}/memories/index.md`) ?? await port.readText(`${root}/index.md`);
  const summary = indexContent ? stripFrontmatter(indexContent) : '';
  const entries: AIMemoryIndex['entries'] = [];

  const memoryFiles = await port.list(`${root}/memories`).catch(() => []);
  for (const entry of memoryFiles) {
    if (entry.kind !== 'file' || !/^\d{4}\.md$/.test(entry.name)) continue;
    const raw = await port.readText(`${root}/memories/${entry.name}`);
    if (!raw) continue;
    const month = parseInt(entry.name.replace('.md', ''), 10);
    entries.push({
      id: `file-${role}-${entry.name}`,
      role,
      month,
      content: stripFrontmatter(raw),
      createdAt: 0,
      updatedAt: 0,
    });
  }

  entries.sort((a, b) => a.month - b.month);
  return { entries, summary, lastArchivedMonth: entries.at(-1)?.month ?? 0 };
}

async function writeIndexSummary(saveId: SaveId, role: AgentRole, summary: string): Promise<void> {
  const content = wrapMarkdownFile({
    schema_version: 1,
    save_id: saveId,
    role,
    memory_type: 'index',
    updated_at: new Date().toISOString(),
  }, summary);
  await getStoragePort().writeText(`${memoryBasePath(saveId, role)}/index.md`, content, { backup: true });
  await getStoragePort().writeText(`${memoryBasePath(saveId, role)}/memories/index.md`, content, { backup: true });
}

const fileMemoryService: MemoryFileService = {
  async read(role, filename, saveId) {
    const sid = getRequiredSaveId(saveId);
    if (!sid) return null;
    return getStoragePort().readText(memoryFilePath(sid, role, filename));
  },

  async write(role, filename, content, saveId) {
    const sid = getRequiredSaveId(saveId);
    if (!sid) return { ok: false, error: 'No active save' };
    try {
      await getStoragePort().writeText(memoryFilePath(sid, role, filename), content, { backup: true });
      memoryIndexCache.delete(indexCacheKey(sid, role));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Unknown memory write error' };
    }
  },

  async list(role, saveId) {
    const sid = getRequiredSaveId(saveId);
    if (!sid) return { root: [], memories: [] };
    const base = memoryBasePath(sid, role);
    const [rootEntries, memoryEntries] = await Promise.all([
      getStoragePort().list(base).catch(() => []),
      getStoragePort().list(`${base}/memories`).catch(() => []),
    ]);
    return {
      root: rootEntries.filter((entry) => entry.kind === 'file' && entry.name.endsWith('.md')).map((entry) => entry.name),
      memories: memoryEntries.filter((entry) => entry.kind === 'file' && entry.name.endsWith('.md')).map((entry) => entry.name),
    };
  },

  async search(role, query, saveId) {
    const sid = getRequiredSaveId(saveId);
    if (!sid) return [];
    const hits = await getStoragePort().searchText(memoryBasePath(sid, role), query);
    return hits.map((hit) => ({
      filename: hit.path.split('/').at(-1) ?? hit.path,
      snippet: hit.snippet,
    }));
  },

  async clearSave(saveId) {
    const sid = saveId ?? getRequiredSaveId();
    if (!sid) return;
    await getStoragePort().delete(`saves/${sid}/agents`);
    for (const key of [...memoryIndexCache.keys()]) {
      if (key.startsWith(`${sid}:`)) memoryIndexCache.delete(key);
    }
  },

  async getIndex(role, saveId) {
    const sid = getRequiredSaveId(saveId);
    if (!sid) return { entries: [], summary: '', lastArchivedMonth: 0 };
    const key = indexCacheKey(sid, role);
    const cached = memoryIndexCache.get(key);
    if (cached) return cached;
    const rebuilt = await rebuildIndexFromFiles(sid, role);
    memoryIndexCache.set(key, rebuilt);
    return rebuilt;
  },

  async updateIndexSummary(role, summary, saveId) {
    const sid = getRequiredSaveId(saveId);
    if (!sid) return;
    await writeIndexSummary(sid, role, summary);
    memoryIndexCache.delete(indexCacheKey(sid, role));
  },

  async migrateLegacyLocalStorage() {
    if (getStoragePort().kind !== 'browser-folder') return;
    if (typeof localStorage === 'undefined') return;

    const roles: AgentRole[] = ['companion', 'evaluator', 'narrator'];
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith('jarvis-life-ai-memory::')) keys.push(key);
    }

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const [, saveId, role] = key.replace('jarvis-life-ai-memory::', '').split('::');
        if (!saveId?.startsWith('save-') || !roles.includes(role as AgentRole)) continue;
        const index = JSON.parse(raw) as AIMemoryIndex;
        for (const entry of index.entries ?? []) {
          const filename = `${String(entry.month).padStart(4, '0')}.md`;
          const content = wrapMarkdownFile({
            schema_version: 1,
            save_id: saveId,
            role,
            memory_type: 'monthly',
            month: entry.month,
            updated_at: new Date(entry.updatedAt || Date.now()).toISOString(),
          }, entry.content);
          await getStoragePort().writeText(`saves/${saveId}/agents/${role}/memories/${filename}`, content, { backup: true });
        }
        if (index.summary) {
          await writeIndexSummary(saveId as SaveId, role as AgentRole, index.summary);
        }
      } catch {
        // Keep legacy localStorage untouched on migration failures.
      }
    }
  },
};

export function getMemoryFileService(): MemoryFileService {
  return fileMemoryService;
}

export async function migrateCurrentSaveLegacyMemoryIndex(role: AgentRole): Promise<void> {
  const saveId = getRequiredSaveId();
  if (!saveId) return;
  const legacy = loadMemoryIndex(saveId, role);
  if (legacy.entries.length === 0 && !legacy.summary) return;
  for (const entry of legacy.entries) {
    const filename = `${String(entry.month).padStart(4, '0')}.md`;
    await fileMemoryService.write(role, filename, wrapMarkdownFile({
      schema_version: 1,
      save_id: saveId,
      role,
      memory_type: 'monthly',
      month: entry.month,
      updated_at: new Date(entry.updatedAt || Date.now()).toISOString(),
    }, entry.content), saveId);
  }
  if (legacy.summary) {
    await fileMemoryService.updateIndexSummary(role, legacy.summary, saveId);
  }
}
