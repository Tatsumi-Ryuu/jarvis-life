import type { FullGameState, NarrativeTask } from '../../../types';
import { getAgentManager } from '../core/agent-manager';

export async function generateDiary(
  month: number,
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'diary', month };
  const fallback = getDiaryFallback(month, gameState);
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}

function getDiaryFallback(month: number, state: FullGameState): string {
  const actions = state.currentMonthActions;
  const importantAction = actions[actions.length - 1]?.actionName;

  return [
    `第${month}个月快结束的时候，我发现自己记住的不是完成了多少项安排，而是${importantAction ? `最后一次做「${importantAction}」时` : '某个很安静的时刻'}，我突然停下来想了一会儿。`,
    '那些记录可以证明我做过什么，可是我更想知道，这些事情有没有让我变得更像自己一点。',
    '如果下个月我还能继续记录，我希望自己不要只记得任务完成，也能记得是谁让我觉得这些经历有意义。',
  ].join('\n\n');
}
