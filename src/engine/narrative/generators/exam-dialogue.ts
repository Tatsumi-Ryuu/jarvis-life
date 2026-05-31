import type { FullGameState, NarrativeTask } from '../../../types';
import { cleanAIText } from '../../../utils/aiText';
import { getAgentManager } from '../core/agent-manager';

export async function generateExamDialogue(
  input: string,
  gameState: FullGameState,
  fallback: string,
): Promise<string> {
  const task: NarrativeTask = { type: 'exam-dialogue', input };
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return cleanAIText(result.text);
}

export async function generateCompanyEntranceDialogue(
  gameState: FullGameState,
): Promise<string> {
  return generateExamDialogue(
    '我们要去基石工业做例行检查了，你看起来有点紧张。',
    gameState,
    '...我们要去做检查吗？你会陪着我吗？',
  );
}
