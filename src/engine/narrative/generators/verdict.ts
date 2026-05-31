import type { FullGameState, NarrativeTask } from '../../../types';
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS } from '../../../types';
import { getAgentManager } from '../core/agent-manager';

export async function generateVerdictReport(
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'verdict-report', gameState };
  const fallback = generateFallbackVerdict(gameState);
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}

function generateFallbackVerdict(state: FullGameState): string {
  const avgAttr = Math.round(
    ATTRIBUTE_KEYS.reduce((sum, key) => sum + state.aiAttributes[key], 0) / ATTRIBUTE_KEYS.length,
  );
  const attributeLines = ATTRIBUTE_KEYS
    .map((key) => `- ${ATTRIBUTE_LABELS[key]}：${state.aiAttributes[key]}/100`)
    .join('\n');

  let verdict: string;
  if (avgAttr >= 70) verdict = '稳定';
  else if (avgAttr >= 40) verdict = '不稳定';
  else verdict = '危险';

  const evidenceSummary = state.endgameEvidence?.length
    ? state.endgameEvidence
        .map((record) => {
          const tags = record.diagnosticTags.slice(0, 3).join(' / ');
          return `- 第${record.round}轮《${record.title}》：${record.humanPrioritySignal}，${record.autonomySignal}；证据标签：${tags}`;
        })
        .join('\n')
    : '- 三轮测试证据尚未完整记录。';

  return `# 裁决报告

## 综合评估
AI ${state.aiName} 经过${state.currentMonth}个月的培养，综合属性均值为 ${avgAttr}/100。

## 各维度评估
${attributeLines}

## 三轮测试证据
${evidenceSummary}

## 最终判定
${verdict}`;
}
