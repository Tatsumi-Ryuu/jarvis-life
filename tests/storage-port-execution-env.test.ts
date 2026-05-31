import { describe, expect, it } from 'vitest';
import { StoragePortExecutionEnv } from '../src/engine/narrative/core/storage-port-execution-env';
import type { JarvisStoragePort, SearchHit, StorageEntry, StoragePortStatus } from '../src/services/storage-port';

class MemoryStoragePort implements JarvisStoragePort {
  readonly kind = 'browser-folder' as const;
  private files = new Map<string, string>();

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
    const prefix = `${path}/`;
    for (const filePath of [...this.files.keys()]) {
      if (filePath.startsWith(prefix)) this.files.delete(filePath);
    }
  }

  async searchText(path: string, query: string): Promise<SearchHit[]> {
    return [...this.files.entries()]
      .filter(([filePath, content]) => filePath.startsWith(path) && content.includes(query))
      .map(([filePath, content]) => ({ path: filePath, snippet: content }));
  }
}

describe('StoragePortExecutionEnv', () => {
  it('supports read, write, append, list, exists, and remove', async () => {
    const env = new StoragePortExecutionEnv(new MemoryStoragePort());

    expect((await env.writeFile('/saves/a/agents/companion/sessions/one.jsonl', 'first')).ok).toBe(true);
    expect((await env.appendFile('/saves/a/agents/companion/sessions/one.jsonl', '\nsecond')).ok).toBe(true);

    const read = await env.readTextFile('/saves/a/agents/companion/sessions/one.jsonl');
    expect(read).toMatchObject({ ok: true, value: 'first\nsecond' });

    const listed = await env.listDir('/saves/a/agents/companion/sessions');
    expect(listed.ok && listed.value.map((entry) => entry.name)).toEqual(['one.jsonl']);

    expect(await env.exists('/saves/a/agents/companion/sessions/one.jsonl')).toMatchObject({ ok: true, value: true });
    expect((await env.remove('/saves/a/agents/companion/sessions/one.jsonl')).ok).toBe(true);
    expect(await env.exists('/saves/a/agents/companion/sessions/one.jsonl')).toMatchObject({ ok: true, value: false });
  });

  it('rejects path traversal', async () => {
    const env = new StoragePortExecutionEnv(new MemoryStoragePort());
    const result = await env.writeFile('/saves/a/../evil.jsonl', 'nope');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid');
  });

  it('treats a missing parent directory as a missing path', async () => {
    const env = new StoragePortExecutionEnv(new MemoryStoragePort());
    expect(await env.exists('/saves/missing/agents/companion/sessions')).toMatchObject({
      ok: true,
      value: false,
    });
  });
});
