import type { FullGameState, NarrativeTask, MonthSnapshot } from '../../../types';
import { getAgentManager } from '../core/agent-manager';
import { useAIStore } from '../../../store/aiStore';

export async function generateChronicle(
  chapter: 1 | 2 | 3 | 4,
  history: MonthSnapshot[],
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'chronicle', chapter, history };
  const cached = useAIStore.getState().getCachedNarrative('chronicle', `chronicle-ch${chapter}`);
  if (cached) return cached.content;
  const fallback = generateFallbackChronicle(chapter, history, gameState);
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}

function generateFallbackChronicle(
  chapter: number,
  history: MonthSnapshot[],
  state: FullGameState,
): string {
  const chapterRanges: Record<number, [number, number]> = {
    1: [1, 3],
    2: [4, 6],
    3: [7, 9],
    4: [10, 12],
  };
  const [start, end] = chapterRanges[chapter];
  const relevantSnapshots = history.filter(
    (s) => s.settlement && s.settlement.month >= start && s.settlement.month <= end,
  );

  return `# 第${chapter}章\n\n${state.aiName}在第${start}到第${end}个月经历了${relevantSnapshots.length}个月的成长。时间静静流逝，留下了不可磨灭的印记。`;
}
