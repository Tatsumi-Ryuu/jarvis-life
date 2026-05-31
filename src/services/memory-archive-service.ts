/**
 * Memory Archive Service — memory index management, soul evolution, and post-conversation consolidation.
 */
import type { FullGameState, SaveId } from '../types';
import { getMemoryFileService, wrapMarkdownFile, type MemoryFrontmatter } from './memory-file-service';
import { getCurrentSaveId } from './save-service';
import { useAIStore } from '../store/aiStore';
import { useGameStore } from '../store/gameStore';
import { getAgentManager } from '../engine/narrative/core/agent-manager';

// === Memory Index ===

export async function updateMemoryIndex(
  service: ReturnType<typeof getMemoryFileService>,
  saveId: SaveId,
): Promise<void> {
  // Get existing index content
  const existing = await service.read('companion', 'index.md', saveId);
  let existingBody = '';
  if (existing) {
    existingBody = existing.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
  }

  // Read all monthly files and build index
  const files = await service.list('companion', saveId);
  const monthEntries: string[] = [];

  for (const f of files.memories) {
    if (!/^\d{4}\.md$/.test(f)) continue;
    const content = await service.read('companion', f, saveId);
    if (content) {
      // Extract first line after frontmatter as summary
      const body = content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
      const firstLine = body.split('\n').find((l) => l.trim().length > 0) ?? '';
      const monthNum = f.replace('.md', '');
      monthEntries.push(`- 第${parseInt(monthNum, 10)}月：${firstLine}`);
    }
  }

  const indexBody = monthEntries.length > 0
    ? `# 记忆索引\n\n${monthEntries.join('\n')}`
    : existingBody || '# 记忆索引\n\n（暂无记忆）';

  const frontmatter: MemoryFrontmatter = {
    schema_version: 1,
    save_id: saveId,
    role: 'companion',
    memory_type: 'index',
    updated_at: new Date().toISOString(),
  };

  await service.write('companion', 'index.md', wrapMarkdownFile(frontmatter, indexBody), saveId);

  // Update the in-memory index summary
  await service.updateIndexSummary('companion', indexBody, saveId);
}

// === Post-Conversation Consolidation ===

const consolidationLocks = new Map<string, Promise<void>>();
const consolidationMeta = new Map<string, { requested: boolean; saveId: SaveId }>();

function stripFrontmatter(content: string): string {
  return content.replace(/^---[\s\S]*?---\s*/, '').trim();
}

function isMateriallyDifferent(a: string, b: string): boolean {
  const la = stripFrontmatter(a).replace(/\s+/g, ' ').trim();
  const lb = stripFrontmatter(b).replace(/\s+/g, ' ').trim();
  if (la === lb) return false;
  const maxLen = Math.max(la.length, lb.length);
  if (maxLen === 0) return false;
  return Math.abs(la.length - lb.length) / maxLen > 0.05;
}

function isValidReplacement(newContent: string, oldContent: string): boolean {
  const newBody = stripFrontmatter(newContent).trim();
  if (newBody.length < 20) return false;
  const oldBody = stripFrontmatter(oldContent).trim();
  if (oldBody.length === 0) return true;
  return newBody.length >= oldBody.length * 0.2;
}

function getRecentDialogue(saveId: SaveId | null, source?: 'talk' | 'event'): string {
  if (!saveId) return '';

  if (source === 'event') {
    const { eventLog } = useAIStore.getState();
    const recentEvents = eventLog.slice(-3);
    return recentEvents.map((e) => `[事件] ${e.summary}`).join('\n');
  }

  const { conversationLog } = useAIStore.getState();
  const recent: typeof conversationLog = [];

  for (let i = conversationLog.length - 1; i >= 0 && recent.length < 30; i -= 1) {
    const entry = conversationLog[i];
    if (entry.saveId !== saveId) continue;
    if (entry.source === 'talk-session-start') break;
    if (entry.source === 'talk-modal') {
      recent.unshift(entry);
    }
  }

  return recent.slice(-30).map((entry) => {
    const roleLabel = entry.role === 'player' ? '培养者' : '我';
    return `${roleLabel}：${entry.content}`;
  }).join('\n');
}

export async function consolidateCompanionMemory(saveId?: SaveId, source?: 'talk' | 'event'): Promise<void> {
  const sid = saveId ?? getCurrentSaveId();
  if (!sid) return;

  const lockKey = `${sid}:consolidate`;

  if (consolidationLocks.has(lockKey)) {
    consolidationMeta.set(lockKey, { requested: true, saveId: sid });
    return;
  }

  await drainConsolidation(lockKey, sid, source);
}

async function drainConsolidation(lockKey: string, saveId: SaveId, source?: 'talk' | 'event'): Promise<void> {
  const promise = runConsolidation(saveId, source);
  consolidationLocks.set(lockKey, promise);
  try {
    await promise;
  } finally {
    consolidationLocks.delete(lockKey);
    const meta = consolidationMeta.get(lockKey);
    consolidationMeta.delete(lockKey);
    if (meta?.requested) {
      await drainConsolidation(lockKey, meta.saveId);
    }
  }
}

async function runConsolidation(saveId: SaveId, source?: 'talk' | 'event'): Promise<void> {
  const recentDialogue = getRecentDialogue(saveId, source);
  if (!recentDialogue.trim()) return;

  const service = getMemoryFileService();

  const currentUser = await service.read('companion', 'user.md', saveId) ?? '';
  const currentSoul = await service.read('companion', 'soul.md', saveId) ?? '';

  const gameState = useGameStore.getState() as unknown as FullGameState;

  try {
    const result = await getAgentManager().generateWithFallback(
      {
        type: 'memory-consolidation',
        recentDialogue,
        currentUser: stripFrontmatter(currentUser),
        currentSoul: stripFrontmatter(currentSoul),
      },
      gameState,
      '',
      saveId,
    );

    const text = result.text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    if (!text) return;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      return;
    }

    const now = new Date().toISOString();

    const newUser = typeof parsed.userProfile === 'string' && isValidReplacement(parsed.userProfile, currentUser)
      ? parsed.userProfile
      : null;
    const newSoul = typeof parsed.soul === 'string' && isValidReplacement(parsed.soul, currentSoul)
      ? parsed.soul
      : null;

    const changedUser = newUser && isMateriallyDifferent(newUser, currentUser);
    const changedSoul = newSoul && isMateriallyDifferent(newSoul, currentSoul);

    if (changedUser) {
      await service.write('companion', 'user.md', wrapMarkdownFile({
        schema_version: 1,
        save_id: saveId,
        role: 'companion',
        memory_type: 'user',
        updated_at: now,
      }, newUser), saveId);
    }

    if (changedSoul) {
      await service.write('companion', 'soul.md', wrapMarkdownFile({
        schema_version: 1,
        save_id: saveId,
        role: 'companion',
        memory_type: 'soul',
        updated_at: now,
      }, newSoul), saveId);
    }
  } catch (err) {
    console.warn('[MemoryArchive] Consolidation failed:', err);
  }
}

// === Soul Evolution ===

const SOUL_PROMPT_FRAGMENT = `\n\n[系统提示：刚才发生了一件对你的自我认知有重大影响的事件。如果你觉得这改变了你对自己的理解，可以在回复后使用 write_memory 工具更新 soul.md 中的"自我理解"部分。注意不要修改核心设定部分。]`;

/**
 * Check if any recent events have high emotional impact.
 * Returns a prompt fragment to inject if soul evolution is warranted.
 */
export function getSoulEvolutionPrompt(): string {
  const { eventLog } = useAIStore.getState();
  if (eventLog.length === 0) return '';

  // Check last 3 events for high impact
  const recent = eventLog.slice(-3);
  const hasHighImpact = recent.some((e) => (e.emotionalImpact ?? 0) >= 8);

  return hasHighImpact ? SOUL_PROMPT_FRAGMENT : '';
}
