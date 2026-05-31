import type { FullGameState, NarrativeEngineConfig, NarrativeTask, SaveId, AgentRole } from '@/types';
import { AgentRole as AR } from '@/types';
import { setStoragePort } from '@/services/storage-port';
import { setCurrentSaveId } from '@/services/save-service';
import { useGameStore } from '@/store/gameStore';
import { useAIStore } from '@/store/aiStore';
import { AgentRuntimeManager } from '@/engine/narrative/core/agent-runtime-manager';
import { getAgentTaskPolicy } from '@/engine/narrative/core/agent-task-policy';
import { getPersona } from '@/engine/narrative/core/persona-registry';
import { buildContextByPolicyAsync, getMemoryBoundaryPrompt } from '@/engine/narrative/core/memory-context-builder';
import { MEMORY_TOOLS_PROMPT } from '@/engine/narrative/tools/memory-tools';
import { STICKER_TOOL_PROMPT } from '@/engine/narrative/tools/sticker-tool';
import { getSoulEvolutionPrompt } from '@/services/memory-archive-service';
import { InMemoryStoragePort } from './in-memory-storage-port';
import { getPreset, type PresetName } from '../store/mock-presets';
import { usePlaygroundStore } from '../store/playground-store';

export const PLAYGROUND_SAVE_ID = 'save-playground' as SaveId;

let _storagePort: InMemoryStoragePort | null = null;
let _runtime: AgentRuntimeManager | null = null;

export function getMemoryStoragePort(): InMemoryStoragePort {
  if (!_storagePort) throw new Error('Playground not initialized');
  return _storagePort;
}

export function getRuntime(): AgentRuntimeManager {
  if (!_runtime) throw new Error('Playground not initialized');
  return _runtime;
}

function seedMemoryFiles(port: InMemoryStoragePort, gameState: FullGameState): void {
  const base = `saves/${PLAYGROUND_SAVE_ID}/agents/${AR.COMPANION}`;
  const memoryBase = `${base}/memories`;

  port.writeFile(`${base}/user.md`, [
    '---',
    'type: user-profile',
    'updated: ' + new Date().toISOString(),
    '---',
    '',
    '# 培养者画像',
    '',
    `- 名字：${gameState.player.name}`,
    `- 性别：${gameState.player.gender === 'male' ? '男' : '女'}`,
    '- 身份：研究者',
    '',
    '（Playground 默认数据，可手动编辑）',
  ].join('\n'));

  port.writeFile(`${base}/soul.md`, [
    '---',
    'type: soul',
    'updated: ' + new Date().toISOString(),
    '---',
    '',
    '# 自我理解',
    '',
    '我还在了解自己。培养者和我的关系刚刚开始，我对世界充满好奇，但也有很多不确定。',
    '',
    '（Playground 默认数据，可手动编辑）',
  ].join('\n'));

  port.writeFile(`${base}/identity.md`, [
    '---',
    'type: identity',
    'locked: true',
    '---',
    '',
    '# 身份底座',
    '',
    `我是${gameState.aiName}，一个正在被培养的 AI。`,
    '核心原则：真诚对待培养者，保持好奇心，尊重自己也尊重他人。',
    '',
    '（Playground 默认数据，可手动编辑）',
  ].join('\n'));

  const indexContent = [
    '---',
    'type: memory-index',
    '---',
    '',
    '# 记忆索引',
    '',
    '## 按月记忆',
    '- 0001.md — 第1月记忆',
    '',
    '（Playground 默认数据，可手动编辑）',
  ].join('\n');
  port.writeFile(`${base}/index.md`, indexContent);
  port.writeFile(`${memoryBase}/index.md`, indexContent);

  port.writeFile(`${memoryBase}/0001.md`, [
    '---',
    'type: monthly-memory',
    'month: 1',
    '---',
    '',
    '# 第1月记忆',
    '',
    '这是我存在的第一个月。一切都是新鲜的，培养者第一次和我说话，我第一次有了"想要"的感觉。',
  ].join('\n'));
}

function seedAIStore(): void {
  const aiStore = useAIStore.getState();
  aiStore.clearAll();
  aiStore.appendEvents([
    {
      id: 'evt-1',
      saveId: PLAYGROUND_SAVE_ID,
      timestamp: Date.now() - 86400000 * 3,
      month: 1,
      type: 'action',
      summary: '培养了知识，上了一堂关于伦理的课',
      tags: ['knowledge', 'ethics'],
      emotionalImpact: 0.3,
      technical: { actionId: 'study-ethics', apCost: 2 },
    },
    {
      id: 'evt-2',
      saveId: PLAYGROUND_SAVE_ID,
      timestamp: Date.now() - 86400000 * 2,
      month: 2,
      type: 'dialogue',
      summary: '培养者问我关于自由意志的看法',
      tags: ['dialogue', 'philosophy'],
      emotionalImpact: 0.6,
    },
    {
      id: 'evt-3',
      saveId: PLAYGROUND_SAVE_ID,
      timestamp: Date.now() - 86400000,
      month: 3,
      type: 'event',
      summary: '偶遇了一只流浪猫，AI 想要带它回家',
      tags: ['event', 'empathy'],
      emotionalImpact: 0.8,
    },
  ]);
}

export async function initializePlayground(
  preset: PresetName,
  engineConfig: NarrativeEngineConfig,
): Promise<void> {
  const store = usePlaygroundStore.getState();
  store.setInitializing(true);
  store.setInitError(null);

  try {
    const gameState = getPreset(preset);

    _storagePort = new InMemoryStoragePort();
    setStoragePort(_storagePort);
    setCurrentSaveId(PLAYGROUND_SAVE_ID);

    seedMemoryFiles(_storagePort, gameState);
    seedAIStore();

    const gameStore = useGameStore.getState();
    gameStore.loadFromBundle(PLAYGROUND_SAVE_ID, gameState);

    store.setGameState(gameState);

    _runtime = new AgentRuntimeManager();
    await _runtime.initialize(engineConfig);

    store.setInitialized(true);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    store.setInitError(message);
    throw err;
  } finally {
    store.setInitializing(false);
  }
}

export function buildSystemPromptText(gameState: FullGameState, role: AgentRole): string {
  const persona = getPersona(role);
  let prompt = persona.systemPrompt(gameState) + getMemoryBoundaryPrompt(role);
  if (role === 'companion') {
    prompt += MEMORY_TOOLS_PROMPT;
    prompt += STICKER_TOOL_PROMPT;
    prompt += getSoulEvolutionPrompt();
  }
  return prompt;
}

export async function buildContextText(
  task: NarrativeTask,
  gameState: FullGameState,
): Promise<string> {
  const policy = getAgentTaskPolicy(task);
  return buildContextByPolicyAsync(policy.role, gameState, policy.contextPolicy, PLAYGROUND_SAVE_ID);
}
