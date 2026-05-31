import type { FullGameState, MonthSnapshot, NarrativeTask } from '../../../types';
import { getAgentManager } from '../core/agent-manager';

export async function generatePersonalityPortrait(
  history: MonthSnapshot[],
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'character-portrait', history };
  const fallback = `${gameState.aiName}在12个月的成长中形成了独特的价值体系。`;
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}
