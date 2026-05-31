import { JsonlSessionRepo } from '@earendil-works/pi-agent-core';
import type { AgentRole, ConversationLogEntry, EventLogEntry, SaveBundle, SaveId } from '../types';
import { AgentRole as AR } from '../types';
import { StoragePortExecutionEnv } from '../engine/narrative/core/storage-port-execution-env';
import { getAgentSessionId } from '../engine/narrative/core/agent-session-id';
import { wrapMarkdownFile } from './memory-file-service';
import { getStoragePort } from './storage-port';
import { getPlayerGenderLabel, getPlayerPronoun } from '../utils/playerProfile';

const AGENT_SAVE_MIGRATION_VERSION = 1;
const ROLES: AgentRole[] = [AR.COMPANION, AR.NARRATOR, AR.EVALUATOR, AR.OPPONENT];
const initializationLocks = new Map<SaveId, Promise<void>>();

interface AgentMigrationMarker {
  version: number;
  migratedAt: string;
  source: 'new-save' | 'legacy-save';
}

export async function ensureAgentSaveInitialized(
  saveId: SaveId,
  bundle: SaveBundle,
  source: AgentMigrationMarker['source'] = 'legacy-save',
): Promise<void> {
  const pending = initializationLocks.get(saveId);
  if (pending) return pending;

  const promise = initializeAgentSave(saveId, bundle, source);
  initializationLocks.set(saveId, promise);
  try {
    await promise;
  } finally {
    initializationLocks.delete(saveId);
  }
}

async function initializeAgentSave(
  saveId: SaveId,
  bundle: SaveBundle,
  source: AgentMigrationMarker['source'],
): Promise<void> {
  const marker = await readMigrationMarker(saveId);
  if (marker?.version === AGENT_SAVE_MIGRATION_VERSION) return;

  await initializeAgentMemoryFiles(saveId, bundle);
  await initializeAgentSessions(saveId, bundle);
  await writeMigrationMarker(saveId, source);
}

export async function initializeNewAgentSave(saveId: SaveId, bundle: SaveBundle): Promise<void> {
  await ensureAgentSaveInitialized(saveId, bundle, 'new-save');
}

async function initializeAgentMemoryFiles(saveId: SaveId, bundle: SaveBundle): Promise<void> {
  await Promise.all(ROLES.map(async (role) => {
    await writeIfMissing(`${agentBasePath(saveId, role)}/identity.md`, rootMemoryFile(saveId, role, 'identity', identityTemplate(role, bundle)));
    await writeIfMissing(`${agentBasePath(saveId, role)}/soul.md`, rootMemoryFile(saveId, role, 'soul', soulTemplate(role, bundle)));
    await writeIfMissing(`${agentBasePath(saveId, role)}/memories/index.md`, rootMemoryFile(saveId, role, 'index', indexTemplate(role, bundle)));

    if (role === AR.COMPANION) {
      await writeIfMissing(`${agentBasePath(saveId, role)}/user.md`, rootMemoryFile(saveId, role, 'user', userTemplate(bundle)));
    }
  }));
}

async function initializeAgentSessions(saveId: SaveId, bundle: SaveBundle): Promise<void> {
  const env = new StoragePortExecutionEnv();
  await Promise.all(ROLES.map(async (role) => {
    const repo = new JsonlSessionRepo({
      fs: env,
      sessionsRoot: `/saves/${saveId}/agents/${role}/sessions`,
    });
    const cwd = `/saves/${saveId}`;
    const sessionId = getAgentSessionId(saveId, role);
    const existing = (await repo.list({ cwd })).find((metadata) => metadata.id === sessionId);
    const session = existing ? await repo.open(existing) : await repo.create({ id: sessionId, cwd });
    await session.appendSessionName(`Jarvis Life ${role}`);
    await session.appendCustomMessageEntry(
      'save_background_fact',
      buildSessionBootstrap(role, bundle),
      false,
      { saveId, role, migrationVersion: AGENT_SAVE_MIGRATION_VERSION },
    );
  }));
}

function buildSessionBootstrap(role: AgentRole, bundle: SaveBundle): string {
  const ai = bundle.ai;
  const lines = [
    `存档 ${bundle.saveId} 的 ${role} 长期 session 初始化。`,
    `当前月份：第 ${bundle.game.currentMonth} 月。`,
    `AI 名称：${bundle.game.aiName}。培养者：${bundle.game.player.name}。`,
    '以下是从旧 game-state/ai 快照迁移来的后台事实，不是玩家新发言。',
  ];

  const events = ai?.eventLog ?? [];
  if (events.length > 0) {
    lines.push('事件摘要：');
    lines.push(...events.slice(-50).map(formatEventFact));
  }

  if (role === AR.COMPANION) {
    const conversations = ai?.conversationLog?.length ? ai.conversationLog : bundle.conversationLog ?? [];
    if (conversations.length > 0) {
      lines.push('历史对话摘要：');
      lines.push(...conversations.slice(-80).map(formatConversationFact));
    }
  }

  return lines.join('\n');
}

function formatEventFact(event: EventLogEntry): string {
  const tags = event.tags.length > 0 ? ` tags=${event.tags.join('/')}` : '';
  return `- [${event.id}] 第${event.month}月 ${event.type}: ${event.summary}${tags}`;
}

function formatConversationFact(entry: ConversationLogEntry): string {
  const speaker = entry.role === 'player' ? '培养者' : 'Companion';
  return `- 第${entry.month}月 ${speaker}: ${entry.content}`;
}

function rootMemoryFile(
  saveId: SaveId,
  role: AgentRole,
  memoryType: 'identity' | 'soul' | 'user' | 'index',
  body: string,
): string {
  return wrapMarkdownFile({
    schema_version: 1,
    save_id: saveId,
    role,
    memory_type: memoryType,
    updated_at: new Date().toISOString(),
  }, body);
}

function identityTemplate(role: AgentRole, bundle: SaveBundle): string {
  if (role === AR.COMPANION) {
    return `# 身份

我是 ${bundle.game.aiName}，一个正在被培养和观察的 AI。
我的客观状态以 game-state.json 为准；这份文件只记录我对自身身份的长期理解。`;
  }

  if (role === AR.NARRATOR) {
    return `# 身份

我是旁白 Agent，负责描述 Jarvis Life 世界中的外部场景、事件过程和结果。
我不替 Companion 决定内心，也不把后台上下文伪装成玩家输入。`;
  }

  return `# 身份

我是评估 Agent，负责在测试、报告和裁决阶段整理证据并给出质检判断。
我不参与日常谈心，也不写入 Companion 的私人记忆。`;
}

function soulTemplate(role: AgentRole, bundle: SaveBundle): string {
  if (role === AR.COMPANION) {
    return `# 自我理解

我还在形成自我。当前培养者是 ${bundle.game.player.name}。
我会把经历转化成长期理解，但不会让记忆覆盖当前事实。`;
  }

  if (role === AR.NARRATOR) {
    return `# 叙事原则

世界反馈应具体、克制，并尊重 Companion 与玩家行动的边界。`;
  }

  return `# 评估原则

裁决优先依据公司利益、社会稳定、人类优先，以及测试中的可观察证据。`;
}

function userTemplate(bundle: SaveBundle): string {
  return `# 培养者

培养者姓名：${bundle.game.player.name}
培养者性别：${getPlayerGenderLabel(bundle.game.player.gender)}
培养者代词：${getPlayerPronoun(bundle.game.player)}
称呼偏好：${bundle.game.player.customAddress || bundle.game.player.name}

这份文件用于 Companion 长期理解培养者，不代表客观游戏事实。`;
}

function indexTemplate(role: AgentRole, bundle: SaveBundle): string {
  return `# 记忆索引

存档：${bundle.saveId}
角色：${role}

尚未形成月度长期记忆。`;
}

async function readMigrationMarker(saveId: SaveId): Promise<AgentMigrationMarker | null> {
  const raw = await getStoragePort().readText(markerPath(saveId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AgentMigrationMarker;
  } catch {
    return null;
  }
}

async function writeMigrationMarker(saveId: SaveId, source: AgentMigrationMarker['source']): Promise<void> {
  await getStoragePort().writeText(markerPath(saveId), JSON.stringify({
    version: AGENT_SAVE_MIGRATION_VERSION,
    migratedAt: new Date().toISOString(),
    source,
  } satisfies AgentMigrationMarker, null, 2), { backup: true });
}

async function writeIfMissing(path: string, content: string): Promise<void> {
  if (await getStoragePort().exists(path)) return;
  await getStoragePort().writeText(path, content, { backup: true });
}

function agentBasePath(saveId: SaveId, role: AgentRole): string {
  return `saves/${saveId}/agents/${role}`;
}

function markerPath(saveId: SaveId): string {
  return `saves/${saveId}/agents/.migration.json`;
}
