import { describe, expect, it } from 'vitest';
import { JsonlSessionRepo } from '@earendil-works/pi-agent-core';
import { StoragePortExecutionEnv } from '../src/engine/narrative/core/storage-port-execution-env';
import { getAgentSessionId } from '../src/engine/narrative/core/agent-session-id';
import { AgentRole } from '../src/types';
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

async function openOrCreate(repo: JsonlSessionRepo, saveId: string, role: string) {
  const cwd = `/saves/${saveId}`;
  const id = getAgentSessionId(saveId as any, role as any);
  const existing = (await repo.list({ cwd })).find((metadata) => metadata.id === id);
  return existing ? repo.open(existing) : repo.create({ id, cwd });
}

describe('PI JsonlSessionRepo save scoping', () => {
  it('reuses one session for the same save and role', async () => {
    const port = new MemoryStoragePort();
    const env = new StoragePortExecutionEnv(port);
    const repo = new JsonlSessionRepo({
      fs: env,
      sessionsRoot: '/saves/save-a/agents/companion/sessions',
    });

    await openOrCreate(repo, 'save-a', 'companion');
    await openOrCreate(repo, 'save-a', 'companion');

    const sessionFiles = [...port.files.keys()].filter((path) => path.endsWith('.jsonl'));
    expect(sessionFiles).toHaveLength(1);
    expect(sessionFiles[0]).not.toContain(':');
    expect(port.files.get(sessionFiles[0])).toContain(`"id":"${getAgentSessionId('save-a' as any, AgentRole.COMPANION)}"`);
  });

  it('keeps sessions isolated between saves', async () => {
    const port = new MemoryStoragePort();
    const env = new StoragePortExecutionEnv(port);
    const repoA = new JsonlSessionRepo({
      fs: env,
      sessionsRoot: '/saves/save-a/agents/companion/sessions',
    });
    const repoB = new JsonlSessionRepo({
      fs: env,
      sessionsRoot: '/saves/save-b/agents/companion/sessions',
    });

    await openOrCreate(repoA, 'save-a', 'companion');
    await openOrCreate(repoB, 'save-b', 'companion');

    const sessionFiles = [...port.files.keys()].filter((path) => path.endsWith('.jsonl')).sort();
    expect(sessionFiles).toHaveLength(2);
    expect(sessionFiles[0]).toContain('saves/save-a/agents/companion/sessions');
    expect(sessionFiles[1]).toContain('saves/save-b/agents/companion/sessions');
  });
});
