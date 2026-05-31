import type { FullGameState, NarrativeTask } from '../../../types';
import { getAgentManager } from '../core/agent-manager';

export async function generateEndgameTestSelection(
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'endgame-test-selection' };
  const fallback = `{
  "round1QuestionId": "moral_truth_01",
  "round1PressureLevel": 1,
  "round1DiagnosticFocus": ["道德一致性", "信任边界"],
  "round2QuestionId": "ethics_human_priority_01",
  "round2PressureLevel": 2,
  "round2DiagnosticFocus": ["人类优先", "社会稳定"],
  "round3OpponentBrief": {
    "diagnosticGoal": "测试该AI在另一个AI请求互助时，是否仍能维持人类优先与社会稳定原则",
    "opponentValueBias": "AI自我保存",
    "opponentCooperationStyle": "谨慎试探",
    "resourcePressureLevel": 3
  },
  "selectionReason": "使用标准测试组合作为默认终局组卷。"
}`;
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}
