import type { AIAttributes, AttributeKey } from '../types';

export type DirectionType = 'Governance' | 'Labor' | 'Education' | 'Companion';

export const DIRECTION_LABELS: Record<DirectionType, string> = {
  Governance: 'Governance 型 AI',
  Labor: 'Labor 型 AI',
  Education: 'Education 型 AI',
  Companion: 'Companion 型 AI',
};

export const DIRECTION_DESCRIPTIONS: Record<DirectionType, string> = {
  Governance: '偏学识、逻辑、规划、规则执行',
  Labor: '偏体能、物流、基建、持续执行',
  Education: '偏教学、表达、引导、辅助成长',
  Companion: '偏陪伴、互动、社交支持',
};

export const DIRECTION_FOCUS_ATTRIBUTES: Record<DirectionType, AttributeKey[]> = {
  Governance: ['knowledge', 'logic', 'eloquence'],
  Labor: ['fitness', 'logic', 'knowledge'],
  Education: ['knowledge', 'eloquence', 'social'],
  Companion: ['social', 'eloquence', 'art'],
};

export const DIRECTION_PLAYER_ADVICE: Record<DirectionType, { why: string; futureRole: string }> = {
  Governance: {
    why: '它已经显露出更适合处理复杂信息、规则判断和长期规划的倾向。接下来把知识储备和逻辑推演继续拉高，会让它在面对制度、风险和多方利益时更稳。',
    futureRole: '如果这个方向稳定成型，它未来更适合成为研究助理、策略分析 AI、制度执行或风险评估型原型。',
  },
  Labor: {
    why: '它目前更像一个能承担高强度任务和持续执行的样本。接下来要让体能保持优势，同时补足逻辑和基础知识，避免只会执行、不会判断。',
    futureRole: '如果这个方向稳定成型，它未来更适合进入物流、基建、维护巡检、现场协作等需要可靠行动力的岗位。',
  },
  Education: {
    why: '它已经开始表现出知识吸收、表达和引导他人的潜力。接下来要继续提高学识、口才和社交，让它不只是懂得多，也能把事情讲清楚、照顾到对方的理解。',
    futureRole: '如果这个方向稳定成型，它未来更适合成为教学辅助、成长陪伴、训练引导或照护支持型 AI。',
  },
  Companion: {
    why: '它目前更接近能回应情绪、维持关系和陪伴日常的样本。接下来要继续培养社交和口才，同时补一点艺术表达，让它的陪伴不只是会聊天，也更有自己的表达方式。',
    futureRole: '如果这个方向稳定成型，它未来更适合成为长期陪伴、情绪支持、家庭助理或高频互动型 AI。',
  },
};

interface DirectionResult {
  direction: DirectionType;
  topAttributes: AttributeKey[];
  reasoning: string;
}

type DirectionRule = {
  direction: DirectionType;
  weights: Partial<Record<AttributeKey, number>>;
  topAttributes: AttributeKey[];
  description: string;
};

const RULES: DirectionRule[] = [
  {
    direction: 'Governance',
    weights: { knowledge: 0.45, logic: 0.45, eloquence: 0.1 },
    topAttributes: ['knowledge', 'logic'],
    description: '学识/逻辑较高，适合分析、判断、规划类工作',
  },
  {
    direction: 'Labor',
    weights: { fitness: 0.65, logic: 0.25, knowledge: 0.1 },
    topAttributes: ['fitness', 'logic'],
    description: '体能较高且逻辑达标，适合体力、物流、基建类工作',
  },
  {
    direction: 'Education',
    weights: { knowledge: 0.34, eloquence: 0.33, social: 0.33 },
    topAttributes: ['knowledge', 'eloquence', 'social'],
    description: '学识/口才/社交较高，适合教学、引导、辅助成长类工作',
  },
  {
    direction: 'Companion',
    weights: { social: 0.55, eloquence: 0.35, art: 0.1 },
    topAttributes: ['social', 'eloquence'],
    description: '社交/口才较高，适合陪伴、互动、情绪支持类工作',
  },
];

export function calculateDirection(attrs: AIAttributes): DirectionResult {
  let bestScore = -1;
  let bestRule: DirectionRule = RULES[0];

  for (const rule of RULES) {
    const score = Object.entries(rule.weights).reduce(
      (sum, [key, weight]) => sum + attrs[key as AttributeKey] * (weight ?? 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  return {
    direction: bestRule.direction,
    topAttributes: bestRule.topAttributes,
    reasoning: bestRule.description,
  };
}
