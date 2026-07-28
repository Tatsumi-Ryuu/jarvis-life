import type { AssistantMessage, Model } from '@earendil-works/pi-ai';
import {
  AgentHarness,
  JsonlSessionRepo,
  InMemorySessionRepo,
  convertToLlm,
  type AgentTool,
} from '@earendil-works/pi-agent-core';
import type {
  AgentRole,
  AgentPersona,
  FullGameState,
  ModelLevel,
  NarrativeEngineConfig,
  NarrativeTask,
  SaveId,
} from '../../../types';
import { AgentRole as AR } from '../../../types';
import { getCurrentSaveId } from '../../../services/save-service';
import { getPersona } from './persona-registry';
import { buildContextByPolicyAsync, getMemoryBoundaryPrompt } from './memory-context-builder';
import { StoragePortExecutionEnv } from './storage-port-execution-env';
import { filterToolsByPolicy, getAgentTaskPolicy, type AgentTaskPolicy } from './agent-task-policy';
import { createPiMemoryTools } from '../tools/pi-memory-tools';
import { sendStickerAgentTool, STICKER_TOOL_PROMPT } from '../tools/sticker-tool';
import { MEMORY_TOOLS_PROMPT } from '../tools/memory-tools';
import { getSoulEvolutionPrompt } from '../../../services/memory-archive-service';
import { getAgentSessionId } from './agent-session-id';
import { buildModelsForConfig, getApiKeyForModel } from './model-utils';

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_MAX_RETRY_DELAY_MS = 8_000;
const COMPACT_MESSAGE_THRESHOLD = 50;
const COMPACT_TOKEN_THRESHOLD = 16_000;

interface RuntimeEntry {
  saveId: SaveId;
  role: AgentRole;
  harness: AgentHarness;
  shouldCompact: boolean;
  lastMessageCount: number;
  lastTokenEstimate: number;
  currentProvider: string;
  lastModelId: string | null;
  lastActiveToolsKey: string | null;
  compactPromise?: Promise<void>;
}

const runtimeCreationLocks = new Map<string, Promise<RuntimeEntry>>();

export interface AgentRunInput {
  saveId?: SaveId;
  task: NarrativeTask;
  gameState: FullGameState;
  onTiming?: (phase: string, durationMs: number) => void;
}

export interface AgentRunResult {
  text: string;
  role: AgentRole;
  mode: AgentTaskPolicy['mode'];
  toolCalls: {
    name: string;
    input: unknown;
    result?: unknown;
    ok: boolean;
  }[];
  structured?: unknown;
  systemPrompt?: string;
  contextSummary?: string;
  timings?: Record<string, number>;
  toolsAvailable?: string[];
}

export interface AgentRuntimePromptAdapter {
  buildUserMessage(task: NarrativeTask): string;
}

export class AgentRuntimeManager {
  private config: NarrativeEngineConfig | null = null;
  private models: Map<ModelLevel, Model<any>> = new Map();
  private runtimes: Map<string, RuntimeEntry> = new Map();
  private runQueues: Map<string, Promise<AgentRunResult>> = new Map();

  async initialize(config: NarrativeEngineConfig): Promise<void> {
    this.config = config;
    this.runtimes.clear();
    this.runQueues.clear();
    this.models = await buildModelsForConfig(config);
  }

  async runTask(input: AgentRunInput, adapter: AgentRuntimePromptAdapter): Promise<AgentRunResult> {
    if (!this.config) throw new Error('AgentRuntimeManager not initialized');

    const saveId = input.saveId ?? getCurrentSaveId();
    if (!saveId) throw new Error('No active save for PI Agent session');

    const policy = getAgentTaskPolicy(input.task);
    const queueKey = `${saveId}:${policy.role}`;

    const queueStart = Date.now();
    return this.enqueueRoleRun(queueKey, () => {
      input.onTiming?.('queueWaitMs', Date.now() - queueStart);
      return this.runTaskExclusive(input, adapter, saveId, policy);
    });
  }

  private async enqueueRoleRun(
    queueKey: string,
    run: () => Promise<AgentRunResult>,
  ): Promise<AgentRunResult> {
    const previous = this.runQueues.get(queueKey);
    const runPromise = (previous ? previous.catch(() => undefined) : Promise.resolve()).then(async () => {
      // Wait for any in-flight compaction from a prior task on this role
      const runtime = this.findRuntimeByQueueKey(queueKey);
      if (runtime?.compactPromise) {
        await runtime.compactPromise;
      }
      return run();
    });
    this.runQueues.set(queueKey, runPromise);

    try {
      return await runPromise;
    } finally {
      if (this.runQueues.get(queueKey) === runPromise) {
        this.runQueues.delete(queueKey);
      }
    }
  }

  private findRuntimeByQueueKey(queueKey: string): RuntimeEntry | undefined {
    for (const runtime of this.runtimes.values()) {
      if (`${runtime.saveId}:${runtime.role}` === queueKey) return runtime;
    }
    return undefined;
  }

  private async runTaskExclusive(
    input: AgentRunInput,
    adapter: AgentRuntimePromptAdapter,
    saveId: SaveId,
    policy: AgentTaskPolicy,
  ): Promise<AgentRunResult> {
    const timings: Record<string, number> = {};
    const onTiming = (phase: string, ms: number) => {
      timings[phase] = ms;
      input.onTiming?.(phase, ms);
    };

    const runtimeStart = Date.now();
    const runtime = await this.getRuntime(saveId, policy.role, policy, input.gameState);
    onTiming('runtimeMs', Date.now() - runtimeStart);
    const model = this.models.get(policy.modelLevel)!;
    const tools = createToolsForPolicy(policy.role, saveId);
    const activeTools = filterToolsByPolicy(tools, policy.toolPolicy).map((tool) => tool.name);

    runtime.currentProvider = policy.modelLevel === 'daily'
      ? this.config!.models.daily.provider
      : policy.modelLevel === 'important'
        ? this.config!.models.important.provider
        : this.config!.models.critical.provider;

    const modelKey = `${model.provider}:${model.id}`;
    if (runtime.lastModelId !== modelKey) {
      await runtime.harness.setModel(model);
      runtime.lastModelId = modelKey;
    }

    const toolsKey = activeTools.join(',');
    if (runtime.lastActiveToolsKey !== toolsKey) {
      await runtime.harness.setTools(tools, activeTools);
      runtime.lastActiveToolsKey = toolsKey;
    }

    console.debug(`[AgentRuntime] task=${input.task.type} role=${policy.role} activeTools=${activeTools.join(',')}`);

    const toolCallsById = new Map<string, { name: string; input: unknown; result?: unknown; ok: boolean }>();
    const unsubscribe = runtime.harness.subscribe((event) => {
      if (event.type === 'tool_execution_start') {
        toolCallsById.set(event.toolCallId, {
          name: event.toolName,
          input: event.args,
          ok: false,
        });
      } else if (event.type === 'tool_execution_end') {
        const existing = toolCallsById.get(event.toolCallId);
        if (existing) {
          existing.result = event.result;
          existing.ok = !event.isError;
        } else {
          toolCallsById.set(event.toolCallId, {
            name: event.toolName,
            input: undefined,
            result: event.result,
            ok: !event.isError,
          });
        }
      }
    });

    const contextStart = Date.now();
    const prompt = await this.buildTaskPrompt(input, policy, adapter, saveId, policy.runtimeMode);
    onTiming('contextMs', Date.now() - contextStart);
    let response: AssistantMessage;
    try {
      const providerStart = Date.now();
      response = await runtime.harness.prompt(prompt);
      onTiming('providerMs', Date.now() - providerStart);
    } finally {
      unsubscribe();
    }

    const toolCalls: AgentRunResult['toolCalls'] = Array.from(toolCallsById.values());

    if (response.stopReason === 'error' || response.stopReason === 'aborted') {
      throw new Error(response.errorMessage || 'AI provider returned an error response');
    }

    const text = extractText(response);
    if (!text.trim()) throw new Error('AI provider returned empty content');

    const result: AgentRunResult = {
      text,
      role: policy.role,
      mode: policy.mode,
      toolCalls,
      structured: parseStructured(policy, text),
      contextSummary: prompt,
      timings,
      toolsAvailable: activeTools,
    };

    if (runtime.shouldCompact) {
      runtime.shouldCompact = false;
      runtime.compactPromise = this.maybeCompactRuntime(runtime, onTiming).finally(() => {
        runtime.compactPromise = undefined;
      });
    }

    return result;
  }

  private async getRuntime(
    saveId: SaveId,
    role: AgentRole,
    policy: AgentTaskPolicy,
    gameState: FullGameState,
  ): Promise<RuntimeEntry> {
    const key = `${saveId}:${role}:${policy.runtimeMode}`;
    const existing = this.runtimes.get(key);
    if (existing) return existing;

    const pending = runtimeCreationLocks.get(key);
    if (pending) return pending;

    const promise = this.createRuntime(saveId, role, policy, gameState);
    runtimeCreationLocks.set(key, promise);
    try {
      return await promise;
    } finally {
      runtimeCreationLocks.delete(key);
    }
  }

  private async createRuntime(
    saveId: SaveId,
    role: AgentRole,
    policy: AgentTaskPolicy,
    gameState: FullGameState,
  ): Promise<RuntimeEntry> {
    const key = `${saveId}:${role}:${policy.runtimeMode}`;
    const isStateless = policy.runtimeMode === 'stateless';

    const env = new StoragePortExecutionEnv();
    const session = isStateless
      ? await this.createStatelessSession(role)
      : await this.createPersistentSession(env, saveId, role);

    const initialModel = this.models.get(policy.modelLevel)!;
    const initialProvider = this.config!.models[policy.modelLevel].provider;
    const persona = getPersona(role);
    const harness = new AgentHarness({
      env,
      session,
      model: initialModel,
      tools: createToolsForPolicy(role, saveId),
      activeToolNames: policy.toolPolicy.allow,
      getApiKeyAndHeaders: async () => {
        const provider = this.runtimes.get(key)?.currentProvider ?? initialProvider;
        return { apiKey: await getApiKeyForModel(this.config!, provider) };
      },
      systemPrompt: () => this.buildSystemPrompt(role, gameState),
      thinkingLevel: 'off',
      streamOptions: getRequestStreamOptions(policy),
    });
    const entry: RuntimeEntry = {
      saveId,
      role,
      harness,
      shouldCompact: false,
      lastMessageCount: 0,
      lastTokenEstimate: 0,
      currentProvider: initialProvider,
      lastModelId: `${initialModel.provider}:${initialModel.id}`,
      lastActiveToolsKey: policy.toolPolicy.allow.join(','),
    };
    configureRuntimeHooks(entry, policy, persona);

    if (!isStateless) {
      await session.appendSessionName(`Jarvis Life ${role}`);
      await session.appendCustomMessageEntry(
        'agent_background_fact',
        `长期 ${role} session 已绑定到存档 ${saveId}。后台事实不会被视为玩家发言。`,
        false,
        { saveId, role },
      );
    }

    this.runtimes.set(key, entry);
    return entry;
  }

  private async createPersistentSession(env: StoragePortExecutionEnv, saveId: SaveId, role: AgentRole) {
    const repo = new JsonlSessionRepo({
      fs: env,
      sessionsRoot: `/saves/${saveId}/agents/${role}/sessions`,
    });
    const cwd = `/saves/${saveId}`;
    const sessionId = getAgentSessionId(saveId, role);
    const listed = await repo.list({ cwd });
    const metadata = listed.find((item) => item.id === sessionId);
    return metadata
      ? await repo.open(metadata)
      : await repo.create({ id: sessionId, cwd });
  }

  private async createStatelessSession(role: AgentRole) {
    const repo = new InMemorySessionRepo();
    return repo.create({ id: `stateless-${role}-${Date.now()}` });
  }

  private async maybeCompactRuntime(
    runtime: RuntimeEntry,
    onTiming?: AgentRunInput['onTiming'],
  ): Promise<void> {
    const start = Date.now();
    try {
      await runtime.harness.compact(
        '请压缩 Jarvis Life 的长期会话，只保留角色关系、关键记忆、未完成剧情线、重要玩家偏好、最近对话和仍会影响后续判断的事实。',
      );
    } catch (error) {
      console.warn('[AgentRuntimeManager] Session compaction failed:', error);
    } finally {
      onTiming?.('compactionMs', Date.now() - start);
    }
  }

  private buildSystemPrompt(role: AgentRole, gameState: FullGameState): string {
    const persona = getPersona(role);
    let prompt = persona.systemPrompt(gameState) + getMemoryBoundaryPrompt(role);
    if (role === AR.COMPANION) {
      prompt += MEMORY_TOOLS_PROMPT;
      prompt += STICKER_TOOL_PROMPT;
      prompt += getSoulEvolutionPrompt();
    }
    return prompt;
  }

  private async buildTaskPrompt(
    input: AgentRunInput,
    policy: AgentTaskPolicy,
    adapter: AgentRuntimePromptAdapter,
    saveId: SaveId,
    runtimeMode?: 'session' | 'stateless',
  ): Promise<string> {
    const policyContext = await buildContextByPolicyAsync(policy.role, input.gameState, policy.contextPolicy, saveId, runtimeMode);
    const userMessage = adapter.buildUserMessage(input.task);
    const factJson = JSON.stringify(summarizeGameState(input.gameState), null, 2);

    return [
      `【后台任务模式：${policy.mode}】`,
      policy.systemModePrompt,
      `输出格式：${policy.outputFormat}`,
      `上下文策略：${policy.contextPolicy.fragments.join(' / ')}`,
      '以下内容是后台上下文，不是培养者发言，也不要在回复中提及这些标签。',
      `【当前游戏事实摘要】\n${factJson}`,
      policyContext ? `【按策略选取的上下文片段】\n${policyContext}` : '',
      `【本轮任务】\n${userMessage}`,
    ].filter(Boolean).join('\n\n');
  }
}

function extractText(message: AssistantMessage): string {
  return message.content
    .filter((content): content is { type: 'text'; text: string } => content.type === 'text')
    .map((content) => content.text)
    .join('');
}

function parseStructured(policy: AgentTaskPolicy, text: string): unknown {
  if (policy.outputFormat !== 'json') return undefined;
  try {
    return JSON.parse(text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
  } catch {
    return undefined;
  }
}

function summarizeGameState(gameState: FullGameState): Record<string, unknown> {
  return {
    phase: gameState.phase,
    currentMonth: gameState.currentMonth,
    aiName: gameState.aiName,
    playerName: gameState.player.name,
    playerGender: gameState.player.gender,
    playerPronoun: gameState.player.gender === 'female' ? '她' : '他',
    attributes: gameState.aiAttributes,
    personality: gameState.aiPersonality,
    wear: {
      physical: gameState.resources.physicalWear,
      mental: gameState.resources.mentalWear,
    },
    funds: gameState.resources.funds,
    location: gameState.currentLocationId,
    endgameEvidenceCount: gameState.endgameEvidence?.length ?? 0,
  };
}

function configureRuntimeHooks(entry: RuntimeEntry, policy: AgentTaskPolicy, persona: AgentPersona): void {
  entry.harness.on('context', (event) => {
    const prevCount = entry.lastMessageCount;
    const currentCount = event.messages.length;

    if (currentCount < prevCount) {
      entry.lastTokenEstimate = estimateMessagesTokens(event.messages);
    } else if (currentCount > prevCount) {
      entry.lastTokenEstimate += estimateMessagesTokens(event.messages.slice(prevCount));
    }

    entry.lastMessageCount = currentCount;

    if (currentCount > COMPACT_MESSAGE_THRESHOLD || entry.lastTokenEstimate > COMPACT_TOKEN_THRESHOLD) {
      entry.shouldCompact = true;
    }
    return undefined;
  });

  entry.harness.on('before_provider_request', () => ({
    streamOptions: getRequestStreamOptions(policy),
  }));

  entry.harness.on('before_provider_payload', (event) => {
    const p = event.payload as Record<string, unknown> | undefined;
    const tc = Array.isArray(p?.tools) ? (p.tools as unknown[]).length : 0;
    console.debug(`[AgentRuntime] payload: role=${entry.role} tools=${tc}`);
    return { payload: patchProviderPayload(event.payload, persona) };
  });
}

function patchProviderPayload(payload: unknown, persona: AgentPersona): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const next = { ...payload } as Record<string, unknown>;
  if (persona.maxTokens !== undefined) {
    if ('max_tokens' in next) next.max_tokens = persona.maxTokens;
    if ('maxTokens' in next) next.maxTokens = persona.maxTokens;
  }
  if (persona.temperature !== undefined) {
    next.temperature = persona.temperature;
  }
  return next;
}

function getRequestStreamOptions(policy: AgentTaskPolicy) {
  return {
    timeoutMs: policy.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxRetries: policy.maxRetries ?? DEFAULT_MAX_RETRIES,
    maxRetryDelayMs: DEFAULT_MAX_RETRY_DELAY_MS,
  };
}

function estimateMessagesTokens(messages: unknown[]): number {
  let chars = 0;
  for (const message of messages) {
    chars += typeof message === 'string' ? message.length : safeStringify(message).length;
  }
  return Math.ceil(chars / 2.5);
}

function safeStringify(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return '';
  }
}

export { convertToLlm };

export function createToolsForPolicy(role: AgentRole, saveId?: SaveId): AgentTool[] {
  const tools = createPiMemoryTools(role, saveId);
  if (role === AR.COMPANION) {
    tools.push(sendStickerAgentTool);
  }
  return tools;
}
