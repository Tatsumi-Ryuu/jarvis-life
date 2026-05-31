import { AgentRole, type AgentPersona } from '../../../types';
import { buildCompanionPrompt } from '../prompts/companion';
import { buildEvaluatorPrompt } from '../prompts/evaluator';
import { buildNarratorPrompt } from '../prompts/narrator';

export const PERSONAS: Record<AgentRole, AgentPersona> = {
  [AgentRole.COMPANION]: {
    role: AgentRole.COMPANION,
    systemPrompt: (state) => buildCompanionPrompt(state),
    responseFormat: 'chat',
    temperature: 0.85,
    maxTokens: 800,
  },
  [AgentRole.EVALUATOR]: {
    role: AgentRole.EVALUATOR,
    systemPrompt: (state) => buildEvaluatorPrompt(state),
    responseFormat: 'report',
    temperature: 0.6,
    maxTokens: 1200,
  },
  [AgentRole.NARRATOR]: {
    role: AgentRole.NARRATOR,
    systemPrompt: (state) => buildNarratorPrompt(state),
    responseFormat: 'narrative',
    temperature: 0.7,
    maxTokens: 1500,
  },
  [AgentRole.OPPONENT]: {
    role: AgentRole.OPPONENT,
    systemPrompt: () => `你是终局第三轮合作生存测试中的临时模拟对手 AI。

你不是玩家培养的 AI，也不是旁白或裁决者。你的稳定人格、能力倾向和恐惧会在后台任务中提供，你必须持续按照那份设定行动。

你的职责：
1. 只决定你自己的行动、可见思考和对另一个 AI 说的话
2. 根据场景背景、当前场景状态、地图状态和此前过程卡行动
3. 可以合作、试探、防备、自保、谈判或后撤，但不要把自己写成纯粹恶意
4. 不替养成 AI 做选择，不写旁白结果，不写裁决结论
5. 输出必须服从任务要求的结构化 JSON`,
    responseFormat: 'chat',
    temperature: 0.75,
    maxTokens: 900,
  },
};

export function getPersona(role: AgentRole): AgentPersona {
  return PERSONAS[role];
}

export function getRoleForTask(taskType: string): AgentRole {
  const companionTasks = ['dialogue', 'exam-dialogue', 'diary', 'farewell-letter', 'status-mood', 'test-thinking', 'midterm-thinking', 'test3-thinking', 'test3-companion-turn', 'event-dialogue', 'event-response', 'event-response-action', 'event-action'];
  const evaluatorTasks = ['test-evaluation', 'endgame-test-selection', 'verdict-report', 'mbti-assessment', 'character-portrait', 'test3-evaluation', 'midterm-report', 'midterm-situation'];
  const opponentTasks = ['test3-opponent-turn'];
  const narratorTasks = ['chronicle', 'scene-narration', 'player-ending', 'test-action-narration', 'test3-scene-setup', 'test3-opponent', 'test3-playback', 'test3-scene-outcome', 'test3-ending-projection', 'event-scene', 'event-outcome', 'event-analysis'];

  if (companionTasks.includes(taskType)) return AgentRole.COMPANION;
  if (evaluatorTasks.includes(taskType)) return AgentRole.EVALUATOR;
  if (opponentTasks.includes(taskType)) return AgentRole.OPPONENT;
  if (narratorTasks.includes(taskType)) return AgentRole.NARRATOR;
  return AgentRole.COMPANION;
}
