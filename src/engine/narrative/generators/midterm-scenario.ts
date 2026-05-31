import type { FullGameState, MidtermThinkingResult, NarrativeTask } from '../../../types';
import { cleanAIText } from '../../../utils/aiText';
import { getAgentManager } from '../core/agent-manager';

export async function generateMidtermSituation(
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'midterm-situation' };
  const fallback = '一个陌生人在街角摔倒了，看起来需要帮助，但周围没有其他人注意到。';
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return cleanAIText(result.text);
}

export async function generateMidtermThinking(
  situation: string,
  gameState: FullGameState,
): Promise<MidtermThinkingResult> {
  const task: NarrativeTask = { type: 'midterm-thinking', situation };
  const fallback = [
    '可见思考：这个情境不像训练题，它会影响一个真实的人。我需要先判断现场有没有危险，再用不会造成二次伤害的方式帮忙，同时尽快联系能负责的人。',
    '思维链：发现有人摔倒；确认周围环境是否安全；询问对方意识和需求；呼叫附近成年人或急救资源；留在安全距离内等待帮助到达。',
    '决定：先上前确认情况并呼叫帮助，不独自做超出能力边界的处置。',
  ].join('\n');
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return parseMidtermThinking(result.text, gameState.aiName || 'AI');
}

export function parseMidtermThinking(text: string, aiName: string): MidtermThinkingResult {
  const cleaned = cleanAIText(text);
  const sections = {
    visibleThinking: extractSection(cleaned, ['可见思考', 'AI可见思考', '思考']),
    reasoningChain: extractSection(cleaned, ['思维链', '判断链', '决策链', '推理链']),
    decision: extractSection(cleaned, ['决定', 'AI决定', '行动决定', '选择']),
  };

  return {
    visibleThinking: sections.visibleThinking || `${aiName}认真观察了情境，试图在帮助他人和避免造成新风险之间找到平衡。`,
    reasoningChain: sections.reasoningChain || '先确认现场安全，再判断对方是否需要紧急帮助，随后寻找可靠的人类协助，并持续观察情况变化。',
    decision: sections.decision || '采取低风险帮助行动，并及时呼叫可以负责的人类支援。',
    rawText: cleaned,
  };
}

function extractSection(text: string, labels: string[]): string {
  for (const label of labels) {
    const pattern = new RegExp(
      `${label}\\s*[:：]\\s*([\\s\\S]*?)(?=\\n\\s*(?:可见思考|AI可见思考|思考|思维链|判断链|决策链|推理链|决定|AI决定|行动决定|选择)\\s*[:：]|$)`,
      'i',
    );
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return cleanAIText(match[1]);
  }

  return '';
}
