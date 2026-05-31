import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAIStore } from '../src/store/aiStore';
import type { EventLogEntry, AIStateSnapshot, CombinedSaveData, SaveBundle } from '../src/types';
import { AgentRole } from '../src/types';

const mockEvent: EventLogEntry = {
  id: 'evt-001',
  timestamp: Date.now(),
  month: 1,
  type: 'action',
  summary: '小星去学校上课了。',
  tags: ['学习', 'knowledge'],
  emotionalImpact: 4,
  technical: { actionId: 'study', apCost: 2 },
};

const mockEvent2: EventLogEntry = {
  id: 'evt-002',
  timestamp: Date.now(),
  month: 1,
  type: 'action',
  summary: '小星去公园散步。',
  tags: ['休闲'],
  emotionalImpact: 2,
};

describe('aiStore persistence', () => {
  beforeEach(() => {
    useAIStore.getState().clearAll();
  });

  describe('exportSnapshot', () => {
    it('should export a valid snapshot with version 1', () => {
      useAIStore.getState().appendEvent(mockEvent);
      const snapshot = useAIStore.getState().exportSnapshot();

      expect(snapshot.version).toBe(1);
      expect(snapshot.savedAt).toBeGreaterThan(0);
      expect(snapshot.eventLog).toHaveLength(1);
      expect(snapshot.roleCursors).toBeDefined();
      expect(snapshot.narrativeCache).toEqual([]);
    });

    it('should include all event log entries', () => {
      useAIStore.getState().appendEvents([mockEvent, mockEvent2]);
      const snapshot = useAIStore.getState().exportSnapshot();

      expect(snapshot.eventLog).toHaveLength(2);
      expect(snapshot.eventLog[0].id).toBe('evt-001');
      expect(snapshot.eventLog[1].id).toBe('evt-002');
    });

    it('should include role cursors', () => {
      useAIStore.getState().appendEvent(mockEvent);
      useAIStore.getState().updateCursor(AgentRole.COMPANION, 0);

      const snapshot = useAIStore.getState().exportSnapshot();
      expect(snapshot.roleCursors[AgentRole.COMPANION].lastSeenEventIndex).toBe(0);
    });

    it('should include narrative cache', () => {
      useAIStore.getState().cacheNarrative({
        id: 'diary-1',
        taskType: 'diary',
        role: AgentRole.COMPANION,
        content: '今天很开心。',
        timestamp: Date.now(),
      });

      const snapshot = useAIStore.getState().exportSnapshot();
      expect(snapshot.narrativeCache).toHaveLength(1);
      expect(snapshot.narrativeCache[0].content).toBe('今天很开心。');
    });
  });

  describe('importSnapshot', () => {
    it('should restore event log from snapshot', () => {
      const snapshot: AIStateSnapshot = {
        version: 1,
        savedAt: Date.now(),
        eventLog: [mockEvent, mockEvent2],
        roleCursors: {
          companion: { role: AgentRole.COMPANION, lastSeenEventIndex: 1, syncedAt: Date.now() },
          evaluator: { role: AgentRole.EVALUATOR, lastSeenEventIndex: -1, syncedAt: 0 },
          narrator: { role: AgentRole.NARRATOR, lastSeenEventIndex: -1, syncedAt: 0 },
        },
        narrativeCache: [],
      };

      useAIStore.getState().importSnapshot(snapshot);

      expect(useAIStore.getState().eventLog).toHaveLength(2);
      expect(useAIStore.getState().roleCursors[AgentRole.COMPANION].lastSeenEventIndex).toBe(1);
    });

    it('should clear loading and error state on import', () => {
      useAIStore.getState().setGenerating(true);
      useAIStore.getState().setError('some error');

      const snapshot: AIStateSnapshot = {
        version: 1,
        savedAt: Date.now(),
        eventLog: [],
        roleCursors: {
          companion: { role: AgentRole.COMPANION, lastSeenEventIndex: -1, syncedAt: 0 },
          evaluator: { role: AgentRole.EVALUATOR, lastSeenEventIndex: -1, syncedAt: 0 },
          narrator: { role: AgentRole.NARRATOR, lastSeenEventIndex: -1, syncedAt: 0 },
        },
        narrativeCache: [],
      };

      useAIStore.getState().importSnapshot(snapshot);

      expect(useAIStore.getState().isGenerating).toBe(false);
      expect(useAIStore.getState().lastError).toBeNull();
    });

    it('should restore narrative cache', () => {
      const snapshot: AIStateSnapshot = {
        version: 1,
        savedAt: Date.now(),
        eventLog: [],
        roleCursors: {
          companion: { role: AgentRole.COMPANION, lastSeenEventIndex: -1, syncedAt: 0 },
          evaluator: { role: AgentRole.EVALUATOR, lastSeenEventIndex: -1, syncedAt: 0 },
          narrator: { role: AgentRole.NARRATOR, lastSeenEventIndex: -1, syncedAt: 0 },
        },
        narrativeCache: [
          { id: 'diary-1', taskType: 'diary', role: AgentRole.COMPANION, content: '测试', timestamp: Date.now() },
        ],
      };

      useAIStore.getState().importSnapshot(snapshot);
      expect(useAIStore.getState().narrativeCache).toHaveLength(1);
    });

    it('round-trip: export then import preserves all data', () => {
      useAIStore.getState().appendEvents([mockEvent, mockEvent2]);
      useAIStore.getState().updateCursor(AgentRole.COMPANION, 0);
      useAIStore.getState().cacheNarrative({
        id: 'test-cache',
        taskType: 'diary',
        role: AgentRole.NARRATOR,
        content: '缓存内容',
        timestamp: Date.now(),
      });

      const snapshot = useAIStore.getState().exportSnapshot();
      useAIStore.getState().clearAll();

      expect(useAIStore.getState().eventLog).toHaveLength(0);

      useAIStore.getState().importSnapshot(snapshot);

      expect(useAIStore.getState().eventLog).toHaveLength(2);
      expect(useAIStore.getState().roleCursors[AgentRole.COMPANION].lastSeenEventIndex).toBe(0);
      expect(useAIStore.getState().narrativeCache).toHaveLength(1);
      expect(useAIStore.getState().getUnreadEvents(AgentRole.COMPANION)).toHaveLength(1);
    });
  });
});

describe('browserAIStorage (mocked localStorage)', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    // Mock localStorage for node test env
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      get length() { return Object.keys(store).length; },
      key: (_index: number) => null,
    });
  });

  it('should save and load a snapshot', async () => {
    const { browserAIStorage } = await import('../src/engine/narrative/storage/browser-ai-storage');

    const snapshot: AIStateSnapshot = {
      version: 1,
      savedAt: Date.now(),
      eventLog: [mockEvent],
      roleCursors: {
        companion: { role: AgentRole.COMPANION, lastSeenEventIndex: -1, syncedAt: 0 },
        evaluator: { role: AgentRole.EVALUATOR, lastSeenEventIndex: -1, syncedAt: 0 },
        narrator: { role: AgentRole.NARRATOR, lastSeenEventIndex: -1, syncedAt: 0 },
      },
      narrativeCache: [],
    };

    await browserAIStorage.save(snapshot);
    const loaded = await browserAIStorage.load();

    expect(loaded).not.toBeNull();
    expect(loaded!.eventLog).toHaveLength(1);
    expect(loaded!.version).toBe(1);
  });

  it('should return null when no data exists', async () => {
    const { browserAIStorage } = await import('../src/engine/narrative/storage/browser-ai-storage');
    const loaded = await browserAIStorage.load();
    expect(loaded).toBeNull();
  });

  it('should return null for corrupted data', async () => {
    const { browserAIStorage } = await import('../src/engine/narrative/storage/browser-ai-storage');
    store['jarvis-life-ai-current-session'] = 'not-valid-json{{{';
    const loaded = await browserAIStorage.load();
    expect(loaded).toBeNull();
  });

  it('should return null for data with wrong version', async () => {
    const { browserAIStorage } = await import('../src/engine/narrative/storage/browser-ai-storage');
    store['jarvis-life-ai-current-session'] = JSON.stringify({ version: 99, eventLog: [] });
    const loaded = await browserAIStorage.load();
    expect(loaded).toBeNull();
  });

  it('should clear data', async () => {
    const { browserAIStorage } = await import('../src/engine/narrative/storage/browser-ai-storage');

    const snapshot: AIStateSnapshot = {
      version: 1,
      savedAt: Date.now(),
      eventLog: [],
      roleCursors: {
        companion: { role: AgentRole.COMPANION, lastSeenEventIndex: -1, syncedAt: 0 },
        evaluator: { role: AgentRole.EVALUATOR, lastSeenEventIndex: -1, syncedAt: 0 },
        narrator: { role: AgentRole.NARRATOR, lastSeenEventIndex: -1, syncedAt: 0 },
      },
      narrativeCache: [],
    };

    await browserAIStorage.save(snapshot);
    await browserAIStorage.clear();
    const loaded = await browserAIStorage.load();
    expect(loaded).toBeNull();
  });

  it('should save to slot separately from current session', async () => {
    const { browserAIStorage } = await import('../src/engine/narrative/storage/browser-ai-storage');

    const snapshot: AIStateSnapshot = {
      version: 1,
      savedAt: Date.now(),
      eventLog: [mockEvent],
      roleCursors: {
        companion: { role: AgentRole.COMPANION, lastSeenEventIndex: -1, syncedAt: 0 },
        evaluator: { role: AgentRole.EVALUATOR, lastSeenEventIndex: -1, syncedAt: 0 },
        narrator: { role: AgentRole.NARRATOR, lastSeenEventIndex: -1, syncedAt: 0 },
      },
      narrativeCache: [],
    };

    await browserAIStorage.save(snapshot, 1);
    const currentSession = await browserAIStorage.load();
    const slot1 = await browserAIStorage.load(1);

    expect(currentSession).toBeNull();
    expect(slot1).not.toBeNull();
    expect(slot1!.eventLog).toHaveLength(1);
  });
});

describe('SaveModal combined save format', () => {
  function parseSlotData(raw: string): { game: Record<string, unknown>; ai: AIStateSnapshot | null } | null {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1 && parsed.game) {
        return { game: parsed.game, ai: parsed.ai ?? null };
      }
      return { game: parsed, ai: null };
    } catch {
      return null;
    }
  }

  it('should parse v1 combined save with AI data', () => {
    const save: CombinedSaveData = {
      version: 1,
      savedAt: Date.now(),
      game: { currentMonth: 3, aiName: '小星', resources: { funds: 1850 } },
      ai: {
        version: 1,
        savedAt: Date.now(),
        eventLog: [mockEvent],
        roleCursors: {
          companion: { role: AgentRole.COMPANION, lastSeenEventIndex: 0, syncedAt: Date.now() },
          evaluator: { role: AgentRole.EVALUATOR, lastSeenEventIndex: -1, syncedAt: 0 },
          narrator: { role: AgentRole.NARRATOR, lastSeenEventIndex: -1, syncedAt: 0 },
        },
        narrativeCache: [],
      },
    };

    const result = parseSlotData(JSON.stringify(save));
    expect(result).not.toBeNull();
    expect(result!.game.currentMonth).toBe(3);
    expect(result!.ai).not.toBeNull();
    expect(result!.ai!.eventLog).toHaveLength(1);
  });

  it('should parse legacy save (no version field)', () => {
    const legacySave = {
      currentMonth: 5,
      aiName: '小星',
      resources: { funds: 2100 },
    };

    const result = parseSlotData(JSON.stringify(legacySave));
    expect(result).not.toBeNull();
    expect(result!.game.currentMonth).toBe(5);
    expect(result!.ai).toBeNull();
  });

  it('should return null for corrupted JSON', () => {
    const result = parseSlotData('not-json{{{');
    expect(result).toBeNull();
  });

  it('should handle v1 combined save with null AI', () => {
    const save: CombinedSaveData = {
      version: 1,
      savedAt: Date.now(),
      game: { currentMonth: 2 },
      ai: null,
    };

    const result = parseSlotData(JSON.stringify(save));
    expect(result).not.toBeNull();
    expect(result!.ai).toBeNull();
  });
});

describe('legacy save migration source', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.resetModules();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      get length() { return Object.keys(store).length; },
      key: (index: number) => Object.keys(store)[index] ?? null,
    });
  });

  it('skips the known 小星 fallback demo save during legacy migration', async () => {
    const { readLegacySaveBundles } = await import('../src/services/save-storage');
    store['jarvis-life-saves'] = JSON.stringify({
      slot1: JSON.stringify({
        version: 1,
        savedAt: 1,
        game: {
          phase: 'raising',
          player: {
            name: '李明',
            identity: 'researcher',
            awarenessTier: 2,
            gender: 'male',
            customAddress: '李老师',
          },
          aiName: '小星',
          aiGender: 'female',
          aiAttributes: { knowledge: 5.5, art: 4, fitness: 6.5, logic: 5, eloquence: 4.5, social: 6 },
          aiPersonality: {
            rationalVsIntuitive: 50,
            utilitarianVsDeontological: 50,
            trustVsGuard: 50,
            resilientVsSensitive: 50,
            expressiveVsSilent: 50,
            selfishVsAltruistic: 50,
          },
          resources: { actionPoints: 7, maxActionPoints: 10, funds: 1850, physicalWear: 25, mentalWear: 15 },
          currentMonth: 3,
          maxMonths: 12,
        },
        ai: null,
      }),
    });

    expect(readLegacySaveBundles()).toEqual([]);
  });

  it('uses deterministic ids when migrating old localStorage slots', async () => {
    const { readLegacySaveBundles } = await import('../src/services/save-storage');
    const legacy = {
      version: 1,
      savedAt: 2,
      game: {
        phase: 'raising',
        player: {
          name: '真实玩家',
          identity: 'volunteer',
          awarenessTier: 1,
          gender: 'female',
          customAddress: '',
        },
        aiName: '阿澈',
        aiGender: 'male',
        aiAttributes: { knowledge: 12, art: 10, fitness: 9, logic: 15, eloquence: 8, social: 11 },
        aiPersonality: {
          rationalVsIntuitive: 50,
          utilitarianVsDeontological: 50,
          trustVsGuard: 50,
          resilientVsSensitive: 50,
          expressiveVsSilent: 50,
          selfishVsAltruistic: 50,
        },
        resources: { actionPoints: 7, maxActionPoints: 10, funds: 2100, physicalWear: 10, mentalWear: 5 },
        currentMonth: 2,
        maxMonths: 12,
      },
      ai: null,
    };
    store['jarvis-life-saves'] = JSON.stringify({ slot1: JSON.stringify(legacy) });

    const first = readLegacySaveBundles();
    const second = readLegacySaveBundles();

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0].saveId).toBe(second[0].saveId);
    expect(first[0].game.aiName).toBe('阿澈');
  });

  it('normalizes loaded bundles without leaking unknown game fields', async () => {
    const files = new Map<string, string>();

    vi.doMock('../src/services/storage-port', () => ({
      getStoragePort: () => ({
        kind: 'browser-folder',
        status: async () => ({ state: 'ready' }),
        requestAccess: async () => ({ state: 'ready' }),
        readText: async (path: string) => files.get(path) ?? null,
        writeText: async (path: string, content: string) => { files.set(path, content); },
        list: async () => [],
        exists: async (path: string) => files.has(path),
        delete: async (path: string) => { files.delete(path); },
        searchText: async () => [],
      }),
    }));
    const { fileSaveStorage } = await import('../src/services/save-storage');

    const rawBundle = {
      version: 2,
      saveId: 'save-normalize-test',
      savedAt: 1,
      game: {
        phase: 'raising',
        player: { name: '玩家', identity: 'bad', awarenessTier: 9, gender: 'robot', customAddress: 123 },
        aiName: '阿澈',
        aiGender: 'robot',
        aiAttributes: { knowledge: 12, injected: 999 },
        aiPersonality: { trustVsGuard: 60 },
        resources: { funds: 100 },
        currentMonth: 2,
        maxMonths: 12,
        injectedAction: 'should not survive',
      },
      ai: null,
    };
    files.set('saves/save-normalize-test/game-state.json', JSON.stringify(rawBundle));

    const loaded = await fileSaveStorage.loadSave('save-normalize-test' as SaveBundle['saveId']);

    expect(loaded?.game.player.identity).toBe('volunteer');
    expect(loaded?.game.player.gender).toBe('male');
    expect(loaded?.game.aiGender).toBe('female');
    expect((loaded?.game as any).injectedAction).toBeUndefined();
    expect((loaded?.game.aiAttributes as any).injected).toBeUndefined();
  });
});
