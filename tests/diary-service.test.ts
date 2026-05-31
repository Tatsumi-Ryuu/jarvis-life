import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadDiaryEntry } from '../src/services/diary-service';
import { setCurrentSaveId } from '../src/services/save-service';
import { useAIStore } from '../src/store/aiStore';
import { AgentRole, type FullGameState } from '../src/types';
import { getAgentManager } from '../src/engine/narrative/core/agent-manager';
import type { JarvisStoragePort, SearchHit, StorageEntry, StoragePortStatus } from '../src/services/storage-port';

class MemoryStoragePort implements JarvisStoragePort {
  readonly kind = 'browser-folder' as const;
  files = new Map<string, string>();

  async status(): Promise<StoragePortStatus> {
    return { state: 'ready' };
  }

  async requestAccess(): Promise<StoragePortStatus> {
    return { state: 'ready' };
  }

  async readText(path: string): Promise<string | null> {
    return this.files.get(path) ?? null;
  }

  async writeText(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async list(path: string): Promise<StorageEntry[]> {
    const prefix = path ? `${path}/` : '';
    const seen = new Map<string, StorageEntry>();
    for (const filePath of this.files.keys()) {
      if (!filePath.startsWith(prefix)) continue;
      const rest = filePath.slice(prefix.length);
      if (!rest) continue;
      const [name, ...tail] = rest.split('/');
      seen.set(name, { name, kind: tail.length > 0 ? 'directory' : 'file' });
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async exists(path: string): Promise<boolean> {
    if (this.files.has(path)) return true;
    const prefix = path ? `${path}/` : '';
    return [...this.files.keys()].some((filePath) => filePath.startsWith(prefix));
  }

  async delete(path: string): Promise<void> {
    this.files.delete(path);
  }

  async searchText(path: string, query: string): Promise<SearchHit[]> {
    return [...this.files.entries()]
      .filter(([filePath, content]) => filePath.startsWith(path) && content.includes(query))
      .map(([filePath, content]) => ({ path: filePath, snippet: content }));
  }
}

const port = new MemoryStoragePort();

vi.mock('../src/services/storage-port', () => ({
  getStoragePort: () => port,
  setLastBrowserSaveId: vi.fn(async () => undefined),
}));

const gameState = {
  currentMonth: 4,
  aiName: '小星',
  player: { name: '测试者' },
} as unknown as FullGameState;

describe('diary-service', () => {
  beforeEach(() => {
    port.files.clear();
    setCurrentSaveId('save-diary-test' as any);
    useAIStore.getState().clearAll();
    vi.restoreAllMocks();
  });

  it('returns cached diary without calling AI', async () => {
    useAIStore.getState().cacheNarrative({
      id: 'diary-2',
      taskType: 'diary',
      role: AgentRole.COMPANION,
      content: '缓存日记',
      timestamp: Date.now(),
    });
    const spy = vi.spyOn(getAgentManager(), 'generateWithFallback');

    const result = await loadDiaryEntry(2, gameState, { allowGenerate: true });

    expect(result).toMatchObject({ content: '缓存日记', source: 'cache' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('reads finalized diary and strips frontmatter', async () => {
    port.files.set(
      'saves/save-diary-test/diaries/0002.md',
      '---\nschema_version: 1\n---\n\n文件日记',
    );

    const result = await loadDiaryEntry(2, gameState, { allowGenerate: true });

    expect(result).toMatchObject({ content: '文件日记', source: 'memory-file' });
    expect(useAIStore.getState().getCachedNarrative('diary', 'diary-2')?.content).toBe('文件日记');
  });

  it('does not read companion memory files as diary content', async () => {
    port.files.set(
      'saves/save-diary-test/agents/companion/memories/0002.md',
      '---\nschema_version: 1\n---\n\n旧记忆内容',
    );

    const result = await loadDiaryEntry(2, gameState, { allowGenerate: false });

    expect(result).toMatchObject({
      content: '日记还没有整理完成，请稍后再试。',
      source: 'unavailable',
    });
  });

  it('generates and persists missing ended-month diary', async () => {
    useAIStore.getState().appendEvent({
      id: 'evt-diary',
      saveId: 'save-diary-test' as any,
      timestamp: Date.now(),
      month: 2,
      type: 'event',
      summary: '小星帮别人确认事实。',
      tags: ['日记'],
      emotionalImpact: 8,
    });
    vi.spyOn(getAgentManager(), 'generateWithFallback').mockResolvedValueOnce({
      text: '生成日记',
      toolCalls: [],
    });

    const result = await loadDiaryEntry(2, gameState, { allowGenerate: true });

    expect(result).toMatchObject({ content: '生成日记', source: 'generated' });
    expect(port.files.get('saves/save-diary-test/diaries/0002.md')).toContain('生成日记');
  });

  it('does not generate first month or current month', async () => {
    const spy = vi.spyOn(getAgentManager(), 'generateWithFallback');

    const firstMonth = await loadDiaryEntry(1, gameState, { allowGenerate: true });
    const currentMonth = await loadDiaryEntry(4, gameState, { allowGenerate: true });

    expect(firstMonth.source).toBe('unavailable');
    expect(currentMonth.source).toBe('unavailable');
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns fallback text when generation fails', async () => {
    useAIStore.getState().appendEvent({
      id: 'evt-diary-fail',
      saveId: 'save-diary-test' as any,
      timestamp: Date.now(),
      month: 2,
      type: 'event',
      summary: '需要生成但失败。',
      tags: [],
      emotionalImpact: 8,
    });
    vi.spyOn(getAgentManager(), 'generateWithFallback').mockRejectedValueOnce(new Error('fail'));

    const result = await loadDiaryEntry(2, gameState, { allowGenerate: true });

    expect(result).toMatchObject({
      content: '日记还没有整理完成，请稍后再试。',
      source: 'unavailable',
    });
  });
});
