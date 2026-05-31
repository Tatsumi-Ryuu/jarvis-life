import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeMemoryTool, MEMORY_TOOLS_PROMPT } from '../src/engine/narrative/tools/memory-tools';
import { setCurrentSaveId } from '../src/services/save-service';
import { getMemoryFileService } from '../src/services/memory-file-service';
import type { JarvisStoragePort, SearchHit, StorageEntry, StoragePortStatus } from '../src/services/storage-port';
import { AgentRole } from '../src/types';

class MemoryStoragePort implements JarvisStoragePort {
  readonly kind = 'browser-folder' as const;
  files = new Map<string, string>();
  listCalls = 0;

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
    this.listCalls += 1;
    const prefix = path ? `${path}/` : '';
    const seen = new Map<string, StorageEntry>();
    for (const filePath of this.files.keys()) {
      if (!filePath.startsWith(prefix)) continue;
      const rest = filePath.slice(prefix.length);
      if (!rest) continue;
      const [name, ...tail] = rest.split('/');
      seen.set(name, { name, kind: tail.length > 0 ? 'directory' : 'file' });
    }
    return [...seen.values()];
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

describe('memory tools', () => {
  beforeEach(() => {
    setCurrentSaveId(null);
    port.files.clear();
    port.listCalls = 0;
  });

  it('rejects memory writes without an active save', async () => {
    const result = await executeMemoryTool(
      'write_memory',
      { filename: '0001.md', content: '不应写入' },
      AgentRole.COMPANION,
    );

    expect(result.success).toBe(false);
    expect(result.content).toContain('当前没有活跃的存档');
  });

  it('reads memory index from the memories folder', async () => {
    setCurrentSaveId('save-memory-test' as any);
    await getMemoryFileService().write(AgentRole.COMPANION, 'index.md', '# 记忆索引\n\n一次重要经历');

    const result = await executeMemoryTool(
      'read_memory',
      { filename: 'index.md' },
      AgentRole.COMPANION,
    );

    expect(result.success).toBe(true);
    expect(result.content).toContain('一次重要经历');
  });

  it('uses an explicitly bound saveId even if the active save changes', async () => {
    setCurrentSaveId('save-active' as any);

    const result = await executeMemoryTool(
      'write_memory',
      { filename: 'user.md', content: '# 培养者\n\n喜欢雨天。' },
      AgentRole.COMPANION,
      'save-bound' as any,
    );

    expect(result.success).toBe(true);
    expect(port.files.get('saves/save-bound/agents/companion/user.md')).toContain('喜欢雨天');
    expect(port.files.has('saves/save-active/agents/companion/user.md')).toBe(false);
  });

  it('documents file responsibilities and safe write rules in the memory tool prompt', () => {
    expect(MEMORY_TOOLS_PROMPT).toContain('user.md：培养者画像');
    expect(MEMORY_TOOLS_PROMPT).toContain('soul.md：你的自我理解');
    expect(MEMORY_TOOLS_PROMPT).toContain('identity.md：身份底座');
    expect(MEMORY_TOOLS_PROMPT).toContain('培养者主动提供稳定信息或喜好时');
    expect(MEMORY_TOOLS_PROMPT).toContain('应该更新 user.md');
    expect(MEMORY_TOOLS_PROMPT).toContain('写入前必须先 read_memory');
    expect(MEMORY_TOOLS_PROMPT).toContain('日常谈心只读，默认不写');
  });

  it('caches rebuilt memory indexes and invalidates them after writes', async () => {
    setCurrentSaveId('save-memory-test' as any);
    await getMemoryFileService().write(AgentRole.COMPANION, '0001.md', '---\n---\n\n第一月记忆');
    port.listCalls = 0;

    const first = await getMemoryFileService().getIndex(AgentRole.COMPANION);
    const second = await getMemoryFileService().getIndex(AgentRole.COMPANION);

    expect(first.entries).toHaveLength(1);
    expect(second.entries).toHaveLength(1);
    expect(port.listCalls).toBe(1);

    await getMemoryFileService().write(AgentRole.COMPANION, '0002.md', '---\n---\n\n第二月记忆');
    await getMemoryFileService().getIndex(AgentRole.COMPANION);

    expect(port.listCalls).toBe(2);
  });
});
