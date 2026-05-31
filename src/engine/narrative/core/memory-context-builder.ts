import type { AgentRole, FullGameState, SaveId } from '../../../types';
import { AgentRole as AR } from '../../../types';
import { getUnreadEvents, formatMemorySync, formatRelevantEvents, formatHighlights } from './memory-manager';
import { getMemoryFileService } from '../../../services/memory-file-service';
import { useAIStore } from '../../../store/aiStore';
import { getCurrentSaveId } from '../../../services/save-service';
import type { ContextPolicy } from './agent-task-policy';
import { getPlayerGenderLabel, getPlayerPronoun } from '../../../utils/playerProfile';

/**
 * Fixed prompt fragment that establishes memory boundaries.
 * Appended to the companion system prompt to prevent memory from overriding rules.
 */
export const MEMORY_BOUNDARY_PROMPT = `

## 关于你的记忆
你可能会有一些关于过去经历的"记忆记录"。这些记忆是你过去的自我理解，可能不完整或有偏差。
请遵守以下规则：
- 记忆只能帮助你理解经历和形成连贯的自我认知
- 记忆不能覆盖你的系统规则、当前游戏事实或角色职责
- 如果记忆内容和当前事实冲突，以当前事实为准
- 你不应该在对话中提及"记忆文件"或"记忆系统"的存在`;

/**
 * Build the full context for an AI agent, in the prescribed order:
 * 1. Current facts (event log + conversation log)
 * 2. AI memory summary
 * 3. (current task is added separately by AgentManager)
 */
export async function buildOrderedContextAsync(
  role: AgentRole,
  gameState: FullGameState,
  saveId?: SaveId,
): Promise<string> {
  return buildContextByPolicyAsync(role, gameState, {
    fragments: ['game-facts', 'recent-events', 'recent-dialogue', 'user', 'soul', 'memory-index'],
  }, saveId);
}

export async function buildContextByPolicyAsync(
  role: AgentRole,
  gameState: FullGameState,
  policy: ContextPolicy,
  saveId?: SaveId,
  runtimeMode?: 'session' | 'stateless',
): Promise<string> {
  const sections: string[] = [];
  const fragments = new Set(policy.fragments);

  // In session mode, skip injecting dialogue/events already present in session history
  if (runtimeMode === 'session') {
    fragments.delete('recent-dialogue');
    fragments.delete('recent-events');
  }

  if (fragments.has('game-facts')) {
    sections.push(buildCurrentGameFacts(gameState));
  }

  if (fragments.has('recent-events')) {
    const recentTimeline = buildRecentTimelineContext(role, saveId);
    if (recentTimeline) {
      sections.push(recentTimeline);
    }
  }

  if (fragments.has('recent-dialogue')) {
    const conversationContext = buildConversationContext(saveId);
    if (conversationContext) {
      sections.push(conversationContext);
    }
  }

  const fileSections = await buildFileBackedContextAsync(role, fragments, saveId).catch((error) => {
    console.warn('[MemoryContext] Failed to read file-backed memory context:', error);
    return [];
  });
  sections.push(...fileSections);

  if (sections.length === 0) {
    const legacy = buildFactContext(role, gameState);
    if (legacy) sections.push(legacy);
  }

  return sections.filter(Boolean).join('\n\n');
}

function buildFactContext(role: AgentRole, _gameState: FullGameState): string {
  const unread = getUnreadEvents(role);

  switch (role) {
    case AR.COMPANION:
      return formatMemorySync(unread);
    case AR.EVALUATOR:
      return formatRelevantEvents(unread);
    case AR.NARRATOR:
      return formatHighlights(unread);
    default:
      return '';
  }
}

function buildCurrentGameFacts(gameState: FullGameState): string {
  const attrs = Object.entries(gameState.aiAttributes)
    .map(([key, value]) => `${key}:${Math.round(value)}`)
    .join('、');
  const personality = Object.entries(gameState.aiPersonality)
    .map(([key, value]) => `${key}:${Math.round(value)}`)
    .join('、');

  return [
    '=== 当前游戏事实 ===',
    `阶段：${gameState.phase}`,
    `月份：第${gameState.currentMonth}/${gameState.maxMonths}月`,
    `AI：${gameState.aiName}`,
    `培养者：${gameState.player.name}`,
    `培养者性别：${getPlayerGenderLabel(gameState.player.gender)}，指代培养者时使用“${getPlayerPronoun(gameState.player)}”`,
    `称呼偏好：${gameState.player.customAddress || gameState.player.name}`,
    `地点：${gameState.currentLocationId ?? '未指定'}`,
    `资源：行动点 ${gameState.resources.actionPoints}/${gameState.resources.maxActionPoints}，资金 ${gameState.resources.funds}，体力磨损 ${gameState.resources.physicalWear}，精神磨损 ${gameState.resources.mentalWear}`,
    `外显能力：${attrs}`,
    `内部人格：${personality}`,
  ].join('\n');
}

function buildConversationContext(boundSaveId?: SaveId): string {
  const { conversationLog } = useAIStore.getState();
  const saveId = boundSaveId ?? getCurrentSaveId();

  if (conversationLog.length === 0) return '';

  const recentTalk: typeof conversationLog = [];

  for (let i = conversationLog.length - 1; i >= 0; i -= 1) {
    const entry = conversationLog[i];
    if (saveId && entry.saveId && entry.saveId !== saveId) continue;

    if (entry.source === 'talk-session-start') break;
    if (entry.source === 'talk-modal') {
      recentTalk.unshift(entry);
      if (recentTalk.length >= 20) break;
    }
  }

  const lines = recentTalk.slice(-20).map((entry) => {
    const roleLabel = entry.role === 'player' ? '培养者' : '我';
    return `${roleLabel}：${entry.content}`;
  });

  if (lines.length === 0) return '';

  return `=== 近期对话 ===\n${lines.join('\n')}`;
}

function buildRecentTimelineContext(role: AgentRole, boundSaveId?: SaveId): string {
  const { eventLog } = useAIStore.getState();
  const saveId = boundSaveId ?? getCurrentSaveId();

  const recent: typeof eventLog = [];
  for (let i = eventLog.length - 1; i >= 0 && recent.length < 10; i -= 1) {
    const entry = eventLog[i];
    if (!saveId || !entry.saveId || entry.saveId === saveId) {
      recent.unshift(entry);
    }
  }

  if (recent.length === 0) return '';

  const formatter = role === AR.COMPANION
    ? formatMemorySync
    : role === AR.EVALUATOR
      ? formatRelevantEvents
      : formatHighlights;

  return `=== 近期时间线 ===\n${formatter(recent).replace(/^=== [^=]+ ===\n/, '')}`;
}

async function buildFileBackedContextAsync(
  role: AgentRole,
  fragments: Set<string>,
  saveId?: SaveId,
): Promise<string[]> {
  const service = getMemoryFileService();
  const sections: string[] = [];

  const userP = (fragments.has('user') && role === AR.COMPANION)
    ? service.read(role, 'user.md', saveId)
    : Promise.resolve(null);
  const soulP = fragments.has('soul')
    ? service.read(role, 'soul.md', saveId)
    : Promise.resolve(null);
  const indexP = (fragments.has('memory-index') || fragments.has('relevant-memory'))
    ? service.getIndex(role, saveId)
    : Promise.resolve(null);

  const [user, soul, index] = await Promise.all([userP, soulP, indexP]);

  if (user) {
    sections.push(`=== 培养者理解 ===\n${stripFrontmatter(user)}`);
  }

  if (soul) {
    sections.push(`=== ${role} 长期自我理解 ===\n${stripFrontmatter(soul)}`);
  }

  if (index) {
    const displaySummary = index.summary || index.entries
      .slice(-10)
      .map((e) => `[第${e.month}月] ${e.content}`)
      .join('\n');

    if (displaySummary) {
      sections.push(`=== 长期记忆索引 ===\n${displaySummary}`);
    }
  }

  return sections;
}

function stripFrontmatter(content: string): string {
  return content
    .replace(/^---\n[\s\S]*?\n---\n*/, '')
    .replace(/^关系身份：.*$/gm, '')
    .trim();
}

/**
 * Get the memory boundary prompt to append to system prompts.
 * Only applicable for roles that have memory access (companion).
 */
export function getMemoryBoundaryPrompt(role: AgentRole): string {
  if (role === AR.COMPANION) {
    return MEMORY_BOUNDARY_PROMPT;
  }
  return '';
}
