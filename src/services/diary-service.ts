import type { EventLogEntry, FullGameState, SaveId } from '../types';
import { AgentRole } from '../types';
import { getAgentManager } from '../engine/narrative/core/agent-manager';
import { isEventForCurrentSave } from '../engine/narrative/core/memory-manager';
import { useAIStore } from '../store/aiStore';
import { getCurrentSaveId } from './save-service';
import { getStoragePort } from './storage-port';

export interface DiaryLoadOptions {
  allowGenerate?: boolean;
  saveId?: SaveId;
}

export interface DiaryLoadResult {
  content: string;
  source: 'cache' | 'memory-file' | 'generated' | 'unavailable';
}

const DIARY_UNAVAILABLE_TEXT = '日记还没有整理完成，请稍后再试。';

export async function loadDiaryEntry(
  month: number,
  gameState: FullGameState,
  options: DiaryLoadOptions = {},
): Promise<DiaryLoadResult> {
  const cached = getCachedDiary(month);
  if (cached) return { content: cached, source: 'cache' };

  const persisted = await readFinalizedDiary(month, options.saveId);
  if (persisted) {
    cacheDiary(month, persisted);
    return { content: persisted, source: 'memory-file' };
  }

  if (!options.allowGenerate || month <= 1 || month >= gameState.currentMonth) {
    return { content: DIARY_UNAVAILABLE_TEXT, source: 'unavailable' };
  }

  const archiveContext = buildDiaryArchiveContext(month);
  if (!archiveContext.trim()) {
    return { content: DIARY_UNAVAILABLE_TEXT, source: 'unavailable' };
  }

  try {
    const result = await getAgentManager().generateWithFallback(
      { type: 'diary', month, archiveContext },
      gameState,
      '',
    );
    const content = result.text.trim();
    if (!content) return { content: DIARY_UNAVAILABLE_TEXT, source: 'unavailable' };

    await persistDiaryEntry(month, content, options.saveId);
    cacheDiary(month, content);
    return { content, source: 'generated' };
  } catch {
    return { content: DIARY_UNAVAILABLE_TEXT, source: 'unavailable' };
  }
}

export async function persistDiaryEntry(month: number, content: string, saveIdOverride?: SaveId): Promise<boolean> {
  const saveId = saveIdOverride ?? getCurrentSaveId();
  if (!saveId) return false;

  const sourceIds = useAIStore.getState().eventLog
    .filter((event) => isEventForSave(event, saveId))
    .filter((event) => event.month === month && (event.emotionalImpact ?? 0) >= 7)
    .map((event) => event.id);

  await getStoragePort().writeText(
    getDiaryPath(saveId, month),
    wrapDiaryFile({
      schema_version: 1,
      save_id: saveId,
      role: AgentRole.COMPANION,
      diary_type: 'monthly',
      month,
      source_event_ids: sourceIds,
      updated_at: new Date().toISOString(),
    }, content),
    { backup: true },
  );
  cacheDiary(month, content);
  return true;
}

export function buildDiaryArchiveContext(month: number, saveIdOverride?: SaveId): string {
  const saveId = saveIdOverride ?? getCurrentSaveId();
  const { eventLog, conversationLog } = useAIStore.getState();
  const eventLines = eventLog
    .filter((event) => isEventForSave(event, saveId))
    .filter((event) => event.month === month)
    .map((event) => {
      const impact = event.emotionalImpact ? ` [情感冲击:${event.emotionalImpact}/10]` : '';
      return `- ${event.type}: ${event.summary}${impact}`;
    });

  const convLines = conversationLog
    .filter((entry) => (!saveId || entry.saveId === saveId) && entry.month === month)
    .slice(-20)
    .map((entry) => {
      const role = entry.role === 'player' ? '培养者' : '我';
      return `${role}：${entry.content}`;
    });

  return [
    eventLines.length > 0 ? `### 本月事件\n${eventLines.join('\n')}` : '',
    convLines.length > 0 ? `### 关键对话\n${convLines.join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
}

function getCachedDiary(month: number): string | null {
  const cached = useAIStore.getState().getCachedNarrative('diary', `diary-${month}`);
  return cached?.content.trim() || null;
}

function cacheDiary(month: number, content: string): void {
  useAIStore.getState().cacheNarrative({
    id: `diary-${month}`,
    taskType: 'diary',
    role: AgentRole.COMPANION,
    content,
    timestamp: Date.now(),
  });
}

export async function readFinalizedDiary(month: number, saveId?: SaveId): Promise<string | null> {
  const sid = saveId ?? getCurrentSaveId();
  if (!sid) return null;
  const raw = await getStoragePort().readText(getDiaryPath(sid, month));
  if (!raw) return null;
  const body = stripFrontmatter(raw).trim();
  return body || null;
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
}

function getDiaryFilename(month: number): string {
  return `${String(month).padStart(4, '0')}.md`;
}

function getDiaryPath(saveId: SaveId, month: number): string {
  return `saves/${saveId}/diaries/${getDiaryFilename(month)}`;
}

interface DiaryFrontmatter {
  schema_version: number;
  save_id: string;
  role: string;
  diary_type: 'monthly';
  month: number;
  source_event_ids: string[];
  updated_at: string;
}

function wrapDiaryFile(fm: DiaryFrontmatter, body: string): string {
  const lines = [
    '---',
    `schema_version: ${fm.schema_version}`,
    `save_id: ${fm.save_id}`,
    `role: ${fm.role}`,
    `diary_type: ${fm.diary_type}`,
    `month: ${fm.month}`,
  ];
  if (fm.source_event_ids.length > 0) {
    lines.push('source_event_ids:');
    for (const id of fm.source_event_ids) {
      lines.push(`  - ${id}`);
    }
  }
  lines.push(`updated_at: ${fm.updated_at}`, '---', '', body);
  return lines.join('\n');
}

function isEventForSave(event: EventLogEntry, saveId: SaveId | null): boolean {
  if (saveId) return !event.saveId || event.saveId === saveId;
  return isEventForCurrentSave(event);
}
