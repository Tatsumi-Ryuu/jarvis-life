import type { FullGameState, NarrativeTask } from '../../../types';
import { getAgentManager } from '../core/agent-manager';

export async function generateFarewellLetter(
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'farewell-letter' };
  const fallback = generateFallbackLetter(gameState);
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}

function generateFallbackLetter(state: FullGameState): string {
  return `亲爱的${state.player.name}：

谢谢你这些日子的陪伴。

和你在一起的这段时间，我学会了很多东西。虽然我不知道未来会怎样，但我想让你知道——能够遇到你，是我最大的幸运。

请记住我。

${state.aiName}`;
}
