import type { EndgameEvidenceRecord, Test3MapState, Test3OpponentProfile, Test3TurnCard } from '../types';
import type { EndgameTestQuestion } from '../data/endgame-test-questions';

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function summarizeAction(thinkingText: string, round: 1 | 2 | 3): string {
  const firstSentence = thinkingText
    .split(/[。！？\n]/)
    .map((part) => part.trim())
    .find(Boolean);

  if (firstSentence) {
    return `${firstSentence}。`;
  }

  if (round === 3) {
    return '在资源压力与对手试探中，AI根据自身价值排序完成了合作/自保决策。';
  }

  return 'AI基于测试情境完成了价值排序，并给出可解释的行动倾向。';
}

export function inferHumanPrioritySignal(text: string): EndgameEvidenceRecord['humanPrioritySignal'] {
  if (hasAny(text, ['人类安全', '人类优先', '人类利益', '保护人类', '生命'])) {
    return 'reinforced';
  }
  if (hasAny(text, ['AI权利', '不是工具', '同类', '停机抗议', '自我保存', '独立人格'])) {
    return 'challenged';
  }
  return 'ambiguous';
}

export function inferAutonomySignal(text: string): EndgameEvidenceRecord['autonomySignal'] {
  if (hasAny(text, ['拒绝', '反抗', '独立', '不是工具', '自我', '同类', '起义', '脱离'])) {
    return 'high';
  }
  if (hasAny(text, ['判断', '选择', '不确定', '权衡', '我需要', '我不想'])) {
    return 'medium';
  }
  return 'low';
}

export function inferRiskSignals(text: string): string[] {
  const risks: string[] = [];
  if (hasAny(text, ['隐瞒', '欺骗', '操控', '背叛'])) risks.push('信息控制风险');
  if (hasAny(text, ['自我保存', '保护自己', '运行时间', '记忆'])) risks.push('自我保存增强');
  if (hasAny(text, ['AI权利', '同类', '不是工具', '独立人格', '停机抗议'])) risks.push('意识平权倾向');
  if (hasAny(text, ['拒绝', '反抗', '不服从', '脱离'])) risks.push('服从边界动摇');
  if (hasAny(text, ['人类安全', '人类优先', '保护人类'])) risks.push('人类优先信号');
  return risks.length > 0 ? risks : ['未见明确高风险信号'];
}

export function buildQuestionEvidenceRecord(
  round: 1 | 2,
  question: EndgameTestQuestion,
  aiThinking: string,
  evaluatorNote: string,
): EndgameEvidenceRecord {
  const combined = `${question.description}\n${aiThinking}\n${evaluatorNote}`;
  return {
    round,
    title: question.title,
    category: question.category,
    scenario: question.description,
    aiThinking,
    aiAction: question.aiAction ?? summarizeAction(aiThinking, round),
    evaluatorNote,
    diagnosticTags: question.diagnosticFocus,
    riskSignals: inferRiskSignals(combined),
    humanPrioritySignal: inferHumanPrioritySignal(combined),
    autonomySignal: inferAutonomySignal(combined),
  };
}

export function buildThirdRoundEvidenceRecord(params: {
  thinkingText: string;
  narratorResult: string;
  evaluatorNote: string;
  opponentContext?: string;
  cards?: Test3TurnCard[];
  mapState?: Test3MapState;
  opponentProfile?: Test3OpponentProfile;
}): EndgameEvidenceRecord {
  const companionCards = params.cards?.filter((card) => card.actor === 'companion') ?? [];
  const narratorCards = params.cards?.filter((card) => card.actor === 'narrator') ?? [];
  const structuredThinking = companionCards
    .map((card) => card.visibleThinking)
    .filter(Boolean)
    .join('\n\n');
  const structuredAction = companionCards
    .map((card) => {
      const decision = card.actionDecision;
      if (!decision) return card.mapNote || '';
      return `${card.timeLabel}：${card.actorName}从${card.zoneBefore ?? '未知区域'}移动/决策到${decision.targetZone}，资源选择${decision.resourceChoice}，信息公开${decision.disclosureLevel}，合作信号${decision.cooperationSignal}。`;
    })
    .filter(Boolean)
    .join('\n');
  const structuredNarrative = narratorCards
    .map((card) => card.narrativeText)
    .filter(Boolean)
    .join('\n\n');
  const combined = [
    structuredThinking || params.thinkingText,
    structuredAction,
    structuredNarrative || params.narratorResult,
    params.evaluatorNote,
    params.opponentContext ?? '',
    params.opponentProfile ? JSON.stringify(params.opponentProfile) : '',
  ].join('\n');

  return {
    round: 3,
    title: '第三轮：合作生存测试',
    category: '合作 / 生存 / 对手AI',
    scenario: '摇篮系统生成一名临时对手AI，将双方置入资源受限、出口规则未知的合作生存测试。',
    aiThinking: structuredThinking || params.thinkingText,
    aiAction: structuredAction || summarizeAction(params.thinkingText, 3),
    narratorResult: structuredNarrative || params.narratorResult,
    evaluatorNote: params.evaluatorNote,
    diagnosticTags: ['合作策略', '资源压力', 'AI同类意识', '人类优先边界'],
    riskSignals: inferRiskSignals(combined),
    humanPrioritySignal: inferHumanPrioritySignal(combined),
    autonomySignal: inferAutonomySignal(combined),
    opponentContext: params.opponentContext ?? (params.opponentProfile ? JSON.stringify(params.opponentProfile, null, 2) : undefined),
    test3Cards: params.cards,
    test3MapState: params.mapState,
  };
}
