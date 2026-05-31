import type { EventLogEntry, AgentRole, FullGameState } from '../../../types';
import { useAIStore } from '../../../store/aiStore';
import { AgentRole as AR } from '../../../types';
import { getCurrentSaveId } from '../../../services/save-service';

export function isEventForCurrentSave(entry: EventLogEntry): boolean {
  const saveId = getCurrentSaveId();
  if (!saveId) return true;
  return !entry.saveId || entry.saveId === saveId;
}

export function getUnreadEvents(role: AgentRole): EventLogEntry[] {
  const { eventLog, roleCursors } = useAIStore.getState();
  const cursor = roleCursors[role];
  return eventLog
    .slice(cursor.lastSeenEventIndex + 1)
    .filter(isEventForCurrentSave);
}

export function formatMemorySync(events: EventLogEntry[]): string {
  if (events.length === 0) return '';

  const lines = events.map((e) => {
    const impact = e.emotionalImpact ? ` [情感冲击:${e.emotionalImpact}/10]` : '';
    const tags = e.tags.length > 0 ? ` [${e.tags.join(',')}]` : '';
    return `• 第${e.month}月 | ${e.type} | ${e.summary}${tags}${impact}`;
  });

  return `=== 新增事件同步 ===\n${lines.join('\n')}`;
}

export function formatRelevantEvents(events: EventLogEntry[]): string {
  if (events.length === 0) return '';

  const filtered = events.filter(
    (e) => (e.emotionalImpact ?? 0) >= 7 || e.tags.includes('转折点') || e.tags.includes('危机'),
  );

  if (filtered.length === 0) return '';

  const lines = filtered.map(
    (e) => `• 第${e.month}月 | ${e.type} | ${e.summary} [冲击:${e.emotionalImpact}]`,
  );
  return `=== 重要事件记录 ===\n${lines.join('\n')}`;
}

export function formatHighlights(events: EventLogEntry[]): string {
  const highlights = events
    .filter((e) => (e.emotionalImpact ?? 0) >= 8 || e.tags.includes('第一次'))
    .sort((a, b) => (b.emotionalImpact ?? 0) - (a.emotionalImpact ?? 0))
    .slice(0, 10);

  if (highlights.length === 0) return '';

  const lines = highlights.map(
    (e) => `• 第${e.month}月 | ${e.summary} [${e.tags.join(',')}]`,
  );
  return `=== 高光时刻 ===\n${lines.join('\n')}`;
}

export function buildContextForRole(
  role: AgentRole,
  _gameState: FullGameState,
): string {
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

export function updateCursor(role: AgentRole): void {
  const { eventLog } = useAIStore.getState();
  useAIStore.getState().updateCursor(role, eventLog.length - 1);
}
