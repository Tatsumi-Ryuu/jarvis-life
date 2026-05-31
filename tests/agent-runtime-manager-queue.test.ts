import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FullGameState } from '../src/types';

const fakeRuntime = vi.hoisted(() => {
  const runtime = {
    activePrompts: 0,
    maxActivePrompts: 0,
    promptCount: 0,
    promptOrder: [] as string[],
    streamOptions: [] as any[],
    payloads: [] as any[],
    compactCalls: 0,
    harnesses: [] as unknown[],
  };
  return runtime;
});

vi.mock('@earendil-works/pi-agent-core', () => {
  class FakeSession {
    async appendSessionName(): Promise<void> {}
    async appendCustomMessageEntry(): Promise<void> {}
  }

  function FakeAgentHarnessMock(this: any) { fakeRuntime.harnesses.push(this); }
  FakeAgentHarnessMock.prototype.setModel = async () => {};
  FakeAgentHarnessMock.prototype.setTools = async () => {};
  FakeAgentHarnessMock.prototype.setStreamOptions = async () => {};
  FakeAgentHarnessMock.prototype.subscribe = () => () => undefined;
  FakeAgentHarnessMock.prototype.on = function(type: string, handler: (event: any) => any) {
    if (type === 'before_provider_request') {
      const result = handler({ type: 'before_provider_request', model: { id: 'MiniMax-M2.7' }, sessionId: 'session-test', streamOptions: { timeoutMs: 60000 } });
      fakeRuntime.streamOptions.push(result);
    }
    if (type === 'before_provider_payload') {
      const result = handler({ type: 'before_provider_payload', model: { id: 'MiniMax-M2.7' }, payload: { max_tokens: 1 } });
      fakeRuntime.payloads.push(result);
    }
    if (type === 'context') {
      handler({
        type: 'context',
        messages: Array.from({ length: 81 }, (_item: any, index: number) => ({
          role: 'user',
          content: `message-${index}`,
          timestamp: Date.now(),
        })),
      });
    }
    return () => undefined;
  };
  FakeAgentHarnessMock.prototype.compact = async () => {
    fakeRuntime.compactCalls += 1;
    return { summary: 'compact', firstKeptEntryId: 'entry-1', tokensBefore: 90000 };
  };
  FakeAgentHarnessMock.prototype.prompt = async function(this: any, text: string) {
    fakeRuntime.activePrompts += 1;
    fakeRuntime.maxActivePrompts = Math.max(fakeRuntime.maxActivePrompts, fakeRuntime.activePrompts);
    fakeRuntime.promptOrder.push(text);
    if (fakeRuntime.activePrompts > 1) {
      fakeRuntime.activePrompts -= 1;
      throw new Error('AgentHarness is busy');
    }
    try {
      await new Promise((resolve) => setTimeout(resolve, 5));
      fakeRuntime.promptCount += 1;
      return {
        role: 'assistant',
        content: [{ type: 'text', text: `ok-${fakeRuntime.promptCount}` }],
        stopReason: 'stop',
      };
    } finally {
      fakeRuntime.activePrompts -= 1;
    }
  };

  function FakeJsonlSessionRepoMock(this: any) {}
  FakeJsonlSessionRepoMock.prototype.list = async () => [];
  FakeJsonlSessionRepoMock.prototype.create = async () => new FakeSession();
  FakeJsonlSessionRepoMock.prototype.open = async () => new FakeSession();

  function FakeInMemorySessionRepoMock(this: any) {}
  FakeInMemorySessionRepoMock.prototype.create = async () => new FakeSession();

  return {
    AgentHarness: FakeAgentHarnessMock,
    JsonlSessionRepo: FakeJsonlSessionRepoMock,
    InMemorySessionRepo: FakeInMemorySessionRepoMock,
    convertToLlm: vi.fn((messages) => messages),
  };
});

vi.mock('@earendil-works/pi-ai', () => ({
  getModel: vi.fn(() => ({
    id: 'MiniMax-M2.7',
    name: 'MiniMax-M2.7',
    api: 'anthropic-messages',
    provider: 'minimax-cn',
    baseUrl: 'https://api.minimaxi.com/anthropic',
    reasoning: false,
    input: ['text'],
    cost: { input: 1, output: 2, cacheRead: 0, cacheWrite: 1 },
    contextWindow: 200000,
    maxTokens: 4800,
  })),
  Type: {
    Object: vi.fn((schema: any) => schema),
    String: vi.fn((options?: any) => ({ type: 'string', ...options })),
  },
  StringEnum: vi.fn((values: readonly string[], options?: any) => ({
    type: 'string',
    enum: values,
    ...options,
  })),
}));

import { AgentRuntimeManager } from '../src/engine/narrative/core/agent-runtime-manager';
import type { NarrativeTask } from '../src/types';

const gameState = {
  phase: 'raising',
  currentMonth: 1,
  aiName: '小星',
  aiGender: 'male',
  player: {
    name: '测试者',
    identity: 'volunteer',
    awarenessTier: 1,
    gender: 'male',
    customAddress: '测试者',
  },
  aiAttributes: { knowledge: 1, art: 1, fitness: 1, logic: 1, eloquence: 1, social: 1 },
  aiPersonality: {
    rationalVsIntuitive: 50,
    utilitarianVsDeontological: 50,
    trustVsGuard: 50,
    resilientVsSensitive: 50,
    expressiveVsSilent: 50,
    selfishVsAltruistic: 50,
  },
  resources: { actionPoints: 5, maxActionPoints: 10, funds: 100, physicalWear: 0, mentalWear: 0 },
  currentLocationId: 'school',
  currentEvent: null,
  currentMonthActions: [],
  monthlySnapshots: [],
  endgameEvidence: [],
} as unknown as FullGameState;

const adapter = {
  buildUserMessage(task: NarrativeTask) {
    return `task:${task.type}`;
  },
};

describe('AgentRuntimeManager role queue', () => {
  beforeEach(() => {
    fakeRuntime.activePrompts = 0;
    fakeRuntime.maxActivePrompts = 0;
    fakeRuntime.promptCount = 0;
    fakeRuntime.promptOrder.length = 0;
    fakeRuntime.streamOptions.length = 0;
    fakeRuntime.payloads.length = 0;
    fakeRuntime.compactCalls = 0;
    fakeRuntime.harnesses.length = 0;
  });

  it('serializes concurrent tasks for the same save and role', async () => {
    const runtime = new AgentRuntimeManager();
    await runtime.initialize({
      providers: { 'minimax-cn': { apiKey: 'test-key' } },
      models: { daily: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' }, important: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' }, critical: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' } },
    });

    const sceneTask: NarrativeTask = {
      type: 'event-scene',
      eventTitle: '测试事件',
      eventType: 'daily',
      location: 'school',
      context: '素材',
    };
    const outcomeTask: NarrativeTask = {
      type: 'event-outcome',
      eventTitle: '测试事件',
      eventType: 'daily',
      location: 'school',
      sceneContext: '场景',
      playerInput: '先问清楚。',
      aiAction: '询问事实。',
    };

    const [scene, outcome] = await Promise.all([
      runtime.runTask({ saveId: 'save-queue-test' as any, task: sceneTask, gameState }, adapter),
      runtime.runTask({ saveId: 'save-queue-test' as any, task: outcomeTask, gameState }, adapter),
    ]);

    expect(scene.text).toBe('ok-1');
    expect(outcome.text).toBe('ok-2');
    expect(fakeRuntime.maxActivePrompts).toBe(1);
    expect(fakeRuntime.harnesses).toHaveLength(1);
    expect(fakeRuntime.promptOrder[0]).toContain('task:event-scene');
    expect(fakeRuntime.promptOrder[1]).toContain('task:event-outcome');
  });

  it('patches provider request options and payload limits from persona settings', async () => {
    const runtime = new AgentRuntimeManager();
    await runtime.initialize({
      providers: { 'minimax-cn': { apiKey: 'test-key' } },
      models: { daily: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' }, important: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' }, critical: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' } },
    });

    const task: NarrativeTask = { type: 'diary', month: 1 };

    await runtime.runTask({ saveId: 'save-options-test' as any, task, gameState }, adapter);

    expect(fakeRuntime.streamOptions[0]).toMatchObject({
      streamOptions: {
        timeoutMs: 60000,
        maxRetries: 1,
        maxRetryDelayMs: 8000,
      },
    });
    expect(fakeRuntime.payloads[0]).toMatchObject({
      payload: {
        max_tokens: 800,
        temperature: 0.85,
      },
    });
  });

  it('compacts long session contexts after a successful session task', async () => {
    const runtime = new AgentRuntimeManager();
    await runtime.initialize({
      providers: { 'minimax-cn': { apiKey: 'test-key' } },
      models: { daily: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' }, important: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' }, critical: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' } },
    });

    const task: NarrativeTask = { type: 'diary', month: 1 };
    await runtime.runTask({ saveId: 'save-compact-test' as any, task, gameState }, adapter);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fakeRuntime.compactCalls).toBe(1);
  });
});
