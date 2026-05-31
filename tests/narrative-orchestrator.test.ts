import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NarrativeOrchestrator } from '../src/engine/narrative/core/narrative-orchestrator';
import { getAgentManager } from '../src/engine/narrative/core/agent-manager';
import { useAIStore } from '../src/store/aiStore';
import { setCurrentSaveId } from '../src/services/save-service';
import type { FullGameState } from '../src/types';
import type { JarvisStoragePort, SearchHit, StorageEntry, StoragePortStatus } from '../src/services/storage-port';

const calls: string[] = [];

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

vi.mock('../src/engine/narrative/generators/event-generator', () => ({
  generateEventScene: vi.fn(async () => {
    calls.push('narrator:event-scene');
    return '场景';
  }),
  generateEventDialogue: vi.fn(async () => {
    calls.push('companion:event-dialogue');
    return '我该怎么办？';
  }),
  generateEventResponse: vi.fn(async () => {
    calls.push('companion:event-response');
    return '我明白了。';
  }),
  generateEventResponseAction: vi.fn(async () => {
    calls.push('companion:event-response-action');
    return JSON.stringify({
      spokenReply: '我明白了。',
      internalUnderstanding: '玩家希望我先确认事实。',
      intendedAction: '我先询问当事人的真实需求。',
      memoryCandidate: '我学会了先确认事实。',
    });
  }),
  generateEventAction: vi.fn(async () => {
    calls.push('companion:event-action');
    return JSON.stringify({
      spokenReply: '我明白了。',
      internalUnderstanding: '玩家希望我先确认事实。',
      intendedAction: '我先询问当事人的真实需求。',
      memoryCandidate: '我学会了先确认事实。',
    });
  }),
  generateEventOutcome: vi.fn(async () => {
    calls.push('narrator:event-outcome');
    return '结果';
  }),
}));

const gameState = {
  phase: 'raising',
  currentMonth: 1,
  aiName: '小星',
  player: { name: '测试者' },
  aiAttributes: {},
  aiPersonality: {},
  resources: { funds: 100, physicalWear: 0, mentalWear: 0 },
  endgameEvidence: [],
} as unknown as FullGameState;

describe('NarrativeOrchestrator', () => {
  beforeEach(() => {
    calls.length = 0;
    port.files.clear();
    setCurrentSaveId(null);
    useAIStore.getState().clearAll();
    vi.spyOn(getAgentManager(), 'generateWithFallback').mockResolvedValue({
      text: JSON.stringify({
        personalityDeltas: { trustVsGuard: -1 },
        memoryTags: ['确认事实'],
        relationshipSignal: '更愿意听取玩家建议',
        companionMemory: '我记得自己先确认了事实。',
        diaryCandidate: true,
        endingForeshadow: '',
      }),
      toolCalls: [],
    });
  });

  it('runs special event flow in the fixed multi-agent order', async () => {
    const result = await new NarrativeOrchestrator().runEventFlow({
      eventTitle: '测试事件',
      eventType: 'daily',
      location: 'school',
      context: '事件素材',
      playerInput: '先问清楚。',
      gameState,
    });

    expect(calls).toEqual([
      'narrator:event-scene',
      'companion:event-dialogue',
      'companion:event-response-action',
      'narrator:event-outcome',
    ]);
    expect(result.action).toMatchObject({
      spokenReply: '我明白了。',
      internalUnderstanding: '玩家希望我先确认事实。',
      intendedAction: '我先询问当事人的真实需求。',
      memoryCandidate: '我学会了先确认事实。',
    });
    expect(result.analysis?.memoryTags).toEqual(['确认事实']);
  });

  it('exposes staged event methods for interactive pages', async () => {
    const orchestrator = new NarrativeOrchestrator();

    const scene = await orchestrator.getEventScene('测试事件', 'daily', 'school', '素材', gameState);
    const dialogue = await orchestrator.getEventDialogue('daily', 'school', scene, gameState);
    const action = await orchestrator.getEventResponseAction('daily', 'school', scene, '先问清楚。', gameState);
    const outcome = await orchestrator.getEventOutcome('测试事件', 'daily', 'school', scene, '先问清楚。', action, gameState);

    expect(dialogue).toBe('我该怎么办？');
    expect(action.spokenReply).toBe('我明白了。');
    expect(action.intendedAction).toBe('我先询问当事人的真实需求。');
    expect(outcome).toBe('结果');
    expect(calls).toEqual([
      'narrator:event-scene',
      'companion:event-dialogue',
      'companion:event-response-action',
      'narrator:event-outcome',
    ]);
  });

  it('accepts legacy chat/action JSON fields from event response-action generation', async () => {
    const generator = await import('../src/engine/narrative/generators/event-generator');
    vi.mocked(generator.generateEventResponseAction).mockResolvedValueOnce(JSON.stringify({
      chat: '答错不是惩罚的证据，它只是说明你发现了一个需要修正的地方。',
      action: '我先记录机器人的互动方式，再把这次交流中的行为模式整理出来。',
    }));

    const action = await new NarrativeOrchestrator().getEventResponseAction(
      'daily',
      'school',
      '机器人在学校里遇到一次交流误解。',
      '别管他们，都是一群莫名其妙的人。',
      gameState,
    );

    expect(action.spokenReply).toBe('答错不是惩罚的证据，它只是说明你发现了一个需要修正的地方。');
    expect(action.intendedAction).toBe('我先记录机器人的互动方式，再把这次交流中的行为模式整理出来。');
  });

  it('archives a month into finalized diary files', async () => {
    setCurrentSaveId('save-orchestrator-test' as any);
    useAIStore.getState().appendEvent({
      id: 'evt-month-1',
      saveId: 'save-orchestrator-test' as any,
      timestamp: Date.now(),
      month: 1,
      type: 'event',
      summary: '小星第一次自己向别人确认事实。',
      tags: ['确认事实'],
      emotionalImpact: 8,
    });
    useAIStore.getState().appendConversation({
      id: 'conv-month-1',
      saveId: 'save-orchestrator-test' as any,
      timestamp: Date.now(),
      month: 1,
      role: 'player',
      content: '先问清楚再决定。',
      source: 'event-dialogue',
    });

    vi.spyOn(getAgentManager(), 'generateWithFallback').mockResolvedValueOnce({
      text: '这个月我记住了：先确认事实，再做决定。',
      toolCalls: [],
    });

    const ok = await new NarrativeOrchestrator().archiveMonth({
      month: 1,
      gameState,
    });

    expect(ok).toBe(true);
    expect(port.files.get('saves/save-orchestrator-test/diaries/0001.md')).toContain('先确认事实');
    expect(port.files.get('saves/save-orchestrator-test/agents/companion/memories/0001.md')).toContain('先确认事实');
  });
});
