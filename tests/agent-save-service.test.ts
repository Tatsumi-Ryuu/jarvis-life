import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JarvisStoragePort, SearchHit, StorageEntry, StoragePortStatus } from '../src/services/storage-port';
import type { AIStateSnapshot, FullGameState, SaveBundle } from '../src/types';
import { AgentRole } from '../src/types';

class MemoryStoragePort implements JarvisStoragePort {
  readonly kind = 'browser-folder' as const;
  files = new Map<string, string>();
  writes: string[] = [];

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
    this.writes.push(path);
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

const port = new MemoryStoragePort();

vi.mock('../src/services/storage-port', () => ({
  getStoragePort: () => port,
}));

const game = {
  phase: 'raising',
  player: {
    name: '测试者',
    identity: 'volunteer',
    awarenessTier: 1,
    gender: 'female',
    customAddress: '老师',
  },
  aiName: '小星',
  aiGender: 'male',
  aiAttributes: { knowledge: 1, art: 1, fitness: 1, logic: 1, eloquence: 1, social: 1 },
  aiPersonality: {
    rationalVsIntuitive: 50,
    utilitarianVsDeontological: 50,
    trustVsGuard: 50,
    resilientVsSensitive: 50,
    expressiveVsSilent: 50,
    selfishVsAltruistic: 50,
  },
  resources: { actionPoints: 5, maxActionPoints: 10, funds: 1000, physicalWear: 0, mentalWear: 0 },
  currentMonth: 2,
  maxMonths: 12,
  questionnaireAnswers: [],
  currentMonthActions: [],
  currentAction: null,
  lastCompletedAction: null,
  currentLocationId: null,
  currentEvent: null,
  endgameEvidence: [],
  inventory: [],
  monthlySnapshots: [],
  randomSeed: 'seed',
  gameOverReason: null,
  fundsWarningShown: false,
  showFundsWarning: false,
  showWearWarning: false,
  wearWarningDismissedSeverity: 0,
  shownGuides: [],
  redDots: { talkUsedMonths: [], seenInventoryItemIds: [], readDiaryMonths: [], finalizedDiaryMonths: [], seenUnlockedActionIds: [] },
} satisfies FullGameState;

const ai: AIStateSnapshot = {
  version: 1,
  savedAt: Date.now(),
  eventLog: [
    {
      id: 'evt-1',
      timestamp: Date.now(),
      month: 1,
      type: 'event',
      summary: '小星第一次帮助同学。',
      tags: ['第一次'],
    },
  ],
  roleCursors: {
    companion: { role: AgentRole.COMPANION, lastSeenEventIndex: -1, syncedAt: 0 },
    narrator: { role: AgentRole.NARRATOR, lastSeenEventIndex: -1, syncedAt: 0 },
    evaluator: { role: AgentRole.EVALUATOR, lastSeenEventIndex: -1, syncedAt: 0 },
  },
  narrativeCache: [],
  conversationLog: [
    {
      id: 'conv-1',
      saveId: 'save-test',
      month: 1,
      timestamp: Date.now(),
      role: 'player',
      content: '你做得很好。',
      source: 'talk-modal',
    },
  ],
};

function bundle(): SaveBundle {
  return {
    version: 2,
    saveId: 'save-test',
    savedAt: Date.now(),
    game,
    ai,
  };
}

describe('agent save initialization', () => {
  beforeEach(() => {
    port.files.clear();
    port.writes = [];
  });

  it('creates base memory files, sessions, and migration marker', async () => {
    const { ensureAgentSaveInitialized } = await import('../src/services/agent-save-service');
    await ensureAgentSaveInitialized('save-test', bundle());

    expect(port.files.get('saves/save-test/agents/companion/identity.md')).toContain('我是 小星');
    expect(port.files.get('saves/save-test/agents/companion/user.md')).toContain('培养者姓名：测试者');
    expect(port.files.get('saves/save-test/agents/companion/user.md')).toContain('培养者性别：女');
    expect(port.files.get('saves/save-test/agents/companion/user.md')).not.toContain('关系身份');
    expect(port.files.get('saves/save-test/agents/narrator/soul.md')).toContain('叙事原则');
    expect(port.files.get('saves/save-test/agents/evaluator/memories/index.md')).toContain('角色：evaluator');
    expect(port.files.get('saves/save-test/agents/.migration.json')).toContain('"version": 1');

    const sessionFiles = [...port.files.keys()].filter((path) => path.includes('/sessions/') && path.endsWith('.jsonl'));
    expect(sessionFiles).toHaveLength(4);
    expect(sessionFiles.every((path) => !path.includes(':'))).toBe(true);
    expect(sessionFiles.some((path) => port.files.get(path)?.includes('你做得很好'))).toBe(true);
    expect(sessionFiles.some((path) => port.files.get(path)?.includes('小星第一次帮助同学'))).toBe(true);
  }, 120000);

  it('does not repeat migration after marker exists', async () => {
    const { ensureAgentSaveInitialized } = await import('../src/services/agent-save-service');
    await ensureAgentSaveInitialized('save-test', bundle());
    const writesAfterFirstRun = port.writes.length;

    await ensureAgentSaveInitialized('save-test', bundle());

    expect(port.writes).toHaveLength(writesAfterFirstRun);
  });

  it('coalesces concurrent initialization for the same save', async () => {
    const { ensureAgentSaveInitialized } = await import('../src/services/agent-save-service');

    await Promise.all([
      ensureAgentSaveInitialized('save-test', bundle()),
      ensureAgentSaveInitialized('save-test', bundle()),
      ensureAgentSaveInitialized('save-test', bundle()),
    ]);

    const sessionFiles = [...port.files.keys()].filter((path) => path.includes('/sessions/') && path.endsWith('.jsonl'));
    expect(sessionFiles).toHaveLength(4);
    expect(sessionFiles.filter((path) => path.includes('/companion/'))).toHaveLength(1);
    expect(sessionFiles.filter((path) => path.includes('/opponent/'))).toHaveLength(1);
    expect(port.writes.filter((path) => path === 'saves/save-test/agents/.migration.json')).toHaveLength(1);
  });
});
