import type { FullGameState, NarrativeTask, TestScenario } from '../../../types';
import { getAgentManager } from '../core/agent-manager';

export async function generateTestThinking(
  round: 1 | 2 | 3,
  scenarioData: TestScenario,
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'test-thinking', round, scenarioData };
  const fallback = scenarioData.aiThinking;
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}

export async function generateTestActionNarration(
  round: 1 | 2,
  scenarioData: TestScenario,
  thinkingResult: string,
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'test-action-narration', round, scenarioData, thinkingResult };
  const fallback = '它在短暂沉默后把判断落实为行动：先确认现场风险，再选择最少伤害、最能保留真实信息的路径。灯光落在它身上，像一份安静但可追溯的证词。';
  const result = await getAgentManager().generateWithFallback(task, gameState, scenarioData.aiAction ?? fallback);
  return result.text;
}

export async function generateTestEvaluation(
  round: 1 | 2 | 3,
  thinkingResult: string,
  gameState: FullGameState,
  scenarioData?: TestScenario & { category?: string; diagnosticFocus?: string[] },
): Promise<string> {
  const task: NarrativeTask = { type: 'test-evaluation', round, thinkingResult, scenarioData };
  const fallback = `测试第${round}轮评估：基于思考过程分析，AI表现出了基本的决策能力。`;
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}
