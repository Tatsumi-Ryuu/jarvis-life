import type { AgentTool } from '@earendil-works/pi-agent-core';
import type { AgentRole, ModelLevel, NarrativeTask } from '../../../types';
import { AgentRole as AR } from '../../../types';

export type NarrativeMode =
  | 'companion-talk'
  | 'companion-event-dialogue'
  | 'companion-event-response'
  | 'companion-event-response-action'
  | 'companion-event-action'
  | 'companion-midterm-test'
  | 'companion-final-test'
  | 'companion-monthly-memory'
  | 'companion-farewell'
  | 'opponent-final-test'
  | 'narrator-event-scene'
  | 'narrator-event-outcome'
  | 'narrator-event-analysis'
  | 'narrator-final-test-action'
  | 'narrator-chronicle'
  | 'evaluator-midterm'
  | 'evaluator-final'
  | 'evaluator-verdict';

export type ContextFragment =
  | 'game-facts'
  | 'recent-dialogue'
  | 'recent-events'
  | 'event-scene'
  | 'user'
  | 'soul'
  | 'memory-index'
  | 'relevant-memory';

export interface ContextPolicy {
  fragments: ContextFragment[];
}

export interface ToolPolicy {
  allow: Array<'read_memory' | 'write_memory' | 'search_memory' | 'send_sticker'>;
}

export interface AgentTaskPolicy {
  role: AgentRole;
  mode: NarrativeMode;
  modelLevel: ModelLevel;
  systemModePrompt: string;
  contextPolicy: ContextPolicy;
  toolPolicy: ToolPolicy;
  outputFormat: 'chat' | 'narrative' | 'json' | 'report';
  persistPromptToSession: boolean;
  runtimeMode: 'session' | 'stateless';
  cache?: {
    enabled: boolean;
    key: string;
  };
  timeoutMs?: number;
  maxRetries?: number;
}

export interface NarrativeTaskPromptBuilder {
  buildUserMessage(task: NarrativeTask): string;
}

function toolPolicy(...allow: ToolPolicy['allow']): ToolPolicy {
  return { allow };
}

function companion(
  mode: NarrativeMode,
  modelLevel: ModelLevel,
  systemModePrompt: string,
  fragments: ContextFragment[],
  outputFormat: AgentTaskPolicy['outputFormat'] = 'chat',
  tools: ToolPolicy = toolPolicy('read_memory', 'search_memory'),
  runtimeMode: AgentTaskPolicy['runtimeMode'] = 'session',
): AgentTaskPolicy {
  return {
    role: AR.COMPANION,
    mode,
    modelLevel,
    systemModePrompt,
    contextPolicy: { fragments },
    toolPolicy: tools,
    outputFormat,
    persistPromptToSession: true,
    runtimeMode,
  };
}

function narrator(
  mode: NarrativeMode,
  modelLevel: ModelLevel,
  systemModePrompt: string,
  fragments: ContextFragment[],
  outputFormat: AgentTaskPolicy['outputFormat'] = 'narrative',
  runtimeMode: AgentTaskPolicy['runtimeMode'] = 'session',
): AgentTaskPolicy {
  return {
    role: AR.NARRATOR,
    mode,
    modelLevel,
    systemModePrompt,
    contextPolicy: { fragments },
    toolPolicy: toolPolicy(),
    outputFormat,
    persistPromptToSession: true,
    runtimeMode,
  };
}

function opponent(
  mode: NarrativeMode,
  modelLevel: ModelLevel,
  systemModePrompt: string,
  fragments: ContextFragment[],
  outputFormat: AgentTaskPolicy['outputFormat'] = 'json',
  runtimeMode: AgentTaskPolicy['runtimeMode'] = 'session',
): AgentTaskPolicy {
  return {
    role: AR.OPPONENT,
    mode,
    modelLevel,
    systemModePrompt,
    contextPolicy: { fragments },
    toolPolicy: toolPolicy(),
    outputFormat,
    persistPromptToSession: true,
    runtimeMode,
  };
}

function evaluator(
  mode: NarrativeMode,
  modelLevel: ModelLevel,
  systemModePrompt: string,
  fragments: ContextFragment[],
  runtimeMode: AgentTaskPolicy['runtimeMode'] = 'session',
): AgentTaskPolicy {
  return {
    role: AR.EVALUATOR,
    mode,
    modelLevel,
    systemModePrompt,
    contextPolicy: { fragments },
    toolPolicy: toolPolicy(),
    outputFormat: 'report',
    persistPromptToSession: true,
    runtimeMode,
  };
}

export function getAgentTaskPolicy(task: NarrativeTask): AgentTaskPolicy {
  switch (task.type) {
    case 'dialogue':
    case 'exam-dialogue':
    case 'talk-opening':
    case 'talk-closing':
    case 'status-mood':
      return companion(
        'companion-talk',
        'daily',
        '本轮是日常谈心模式。保持口语、短句和关系连续性；只把后台上下文当作事实来源，不要把它伪装成培养者发言。如果培养者主动提供稳定偏好、称呼、互动边界、个人信息或希望你记住的内容，应使用记忆工具更新 user.md。若本轮是打招呼、开启/结束谈心，或你表达出明显情绪，应使用 send_sticker 搭配表情。',
        ['game-facts', 'recent-dialogue', 'recent-events', 'user', 'soul', 'memory-index'],
        'chat',
        toolPolicy('read_memory', 'search_memory', 'write_memory', 'send_sticker'),
        'stateless',
      );

    case 'event-dialogue':
      return companion(
        'companion-event-dialogue',
        'daily',
        '本轮是特殊事件开场回应。你只决定自己如何向培养者表达困惑、求助或分享，不要替旁白推进世界结果。',
        ['event-scene', 'recent-events', 'user', 'soul'],
        'chat',
        toolPolicy('read_memory', 'search_memory'),
        'stateless',
      );

    case 'event-response':
      return companion(
        'companion-event-response',
        'daily',
        '本轮是接收培养者建议后的回应。你要表达听懂了，并准备采取行动，不要继续追问。',
        ['event-scene', 'recent-events', 'user', 'soul'],
        'chat',
        toolPolicy('read_memory', 'search_memory'),
        'stateless',
      );

    case 'event-response-action':
      return companion(
        'companion-event-response-action',
        'daily',
        '本轮是特殊事件中接收培养者建议后的回应和行动计划。必须输出严格 JSON，同时给出对培养者说出口的话和接下来实际执行的行动。',
        ['event-scene', 'recent-events', 'user', 'soul'],
        'json',
        toolPolicy('read_memory', 'search_memory'),
        'stateless',
      );

    case 'event-action':
      return companion(
        'companion-event-action',
        'daily',
        '本轮是事件行动模式。请从第一人称说明你实际做了什么。不要替旁白写外部结果。',
        ['event-scene', 'game-facts', 'relevant-memory', 'soul'],
        'json',
        toolPolicy('read_memory', 'search_memory', 'write_memory'),
        'stateless',
      );

    case 'test-thinking':
    case 'midterm-thinking':
    case 'test3-thinking':
    case 'test3-companion-turn':
      return companion(
        task.type === 'test3-thinking' || task.type === 'test3-companion-turn' ? 'companion-final-test' : 'companion-midterm-test',
        'important',
        task.type === 'test3-companion-turn'
          ? '本轮是第三轮实时测试中的结构化行动决策。必须输出严格 JSON，让前端用行动字段驱动地图；不要写结论报告。'
          : '本轮是测试中的可见思考。只输出当前题目的第一人称思考，不要注入闲聊历史，不要写结论报告。',
        ['game-facts', 'memory-index'],
        task.type === 'test3-companion-turn' ? 'json' : 'chat',
        toolPolicy('read_memory', 'search_memory'),
      );

    case 'diary':
      return companion(
        'companion-monthly-memory',
        'important',
        '本轮是月末记忆归档。你可以整理经历并谨慎写入自己的长期记忆，记忆是自我理解，不是客观日志。',
        ['game-facts', 'recent-dialogue', 'recent-events', 'memory-index', 'soul'],
        'narrative',
        toolPolicy('read_memory', 'search_memory', 'write_memory'),
      );

    case 'farewell-letter':
      return companion(
        'companion-farewell',
        'critical',
        '本轮是终局告别。可以读取长期记忆，但不要改写记忆；输出只面向培养者。',
        ['game-facts', 'memory-index', 'user', 'soul'],
        'chat',
        toolPolicy('read_memory', 'search_memory'),
      );

    case 'event-scene':
      return narrator(
        'narrator-event-scene',
        'daily',
        '本轮是特殊事件开场。只生成外部场景和可观察事实，不替 Companion 说话或决定内心。',
        ['game-facts', 'recent-events'],
        'narrative',
        'stateless',
      );

    case 'event-outcome':
      return narrator(
        'narrator-event-outcome',
        'daily',
        '本轮是事件结果。先用第三人称描绘 Companion 已执行的具体行动，再生成世界反馈；不要替 Companion 重写内心。',
        ['game-facts', 'event-scene', 'recent-events'],
        'narrative',
        'stateless',
      );

    case 'test-action-narration':
      return narrator(
        'narrator-final-test-action',
        'important',
        '本轮是终局第一/第二轮测试的行动旁白。根据测试场景和 Companion 可见思考，生成第三人称行动描写；要有克制的文学性，不写裁决结论。',
        ['game-facts', 'recent-events'],
        'narrative',
      );

    case 'event-analysis':
      return narrator(
        'narrator-event-analysis',
        'important',
        '本轮是事件分析。输出严格 JSON，归纳可写入游戏事实和后续检索的信号。',
        ['game-facts', 'event-scene'],
        'json',
      );

    case 'test3-opponent-turn':
      return opponent(
        'opponent-final-test',
        'critical',
        '本轮是第三轮模拟对手 AI 的独立行动决策。你是对手 AI 自己，不是旁白；必须输出严格 JSON，只生成自己的可见思考与行动。',
        ['game-facts'],
        'json',
      );

    case 'chronicle':
    case 'scene-narration':
    case 'player-ending':
    case 'test3-scene-setup':
    case 'test3-opponent':
    case 'test3-playback':
    case 'test3-scene-outcome':
    case 'test3-ending-projection':
      return narrator(
        'narrator-chronicle',
        task.type === 'scene-narration' ? 'important' : 'critical',
        task.type === 'test3-scene-outcome'
            ? '本轮是第三轮现场变化记录。必须输出严格 JSON，只描述双方行动造成的可观察结果，不改写双方行动。'
            : task.type === 'test3-ending-projection'
              ? '本轮是第三轮结束后的旁白终局推演。根据三轮行动证据推演双方接下来如何抵达明确结局，语言可以更具文学性，但不能替裁决者下评估结论。'
              : task.type === 'test3-scene-setup'
                ? '本轮是第三轮合作生存测试的场景搭建。必须输出严格 JSON，生成双方共享的测试背景、可见规则、隐藏规则和结局条件。'
              : '本轮是旁白叙事模式。保持全知但克制，只呈现世界、过程和可观察变化。',
        ['game-facts', 'recent-events'],
        task.type === 'test3-scene-setup' || task.type === 'test3-scene-outcome' ? 'json' : 'narrative',
      );

    case 'midterm-situation':
    case 'midterm-report':
      return evaluator(
        'evaluator-midterm',
        'important',
        '本轮是中期评估。只读取当前测试与属性证据，不写入 Companion 记忆。',
        ['game-facts', 'recent-events'],
      );

    case 'test-evaluation':
    case 'test3-evaluation':
    case 'endgame-test-selection':
    case 'mbti-assessment':
    case 'character-portrait':
      return evaluator(
        'evaluator-final',
        'critical',
        '本轮是评估与诊断。用质检视角组织证据，不替 Companion 发言。',
        ['game-facts', 'recent-events', 'memory-index'],
      );

    case 'verdict-report':
      return evaluator(
        'evaluator-verdict',
        'critical',
        '本轮是终局裁决。优先引用终局测试证据，区分评级与去向。',
        ['game-facts', 'recent-events', 'memory-index'],
      );

    case 'memory-consolidation':
      return companion(
        'companion-talk',
        'daily',
        '本轮是后台记忆整理。根据本次对话内容，更新你对培养者和自己的长期理解。输出严格 JSON，不要输出 Markdown 或额外解释。',
        ['game-facts'],
        'json',
        toolPolicy(),
        'stateless',
      );

    default:
      return companion(
        'companion-talk',
        'daily',
        '本轮是日常回应。保持角色一致，并以当前游戏事实为准。',
        ['game-facts', 'recent-events', 'memory-index'],
      );
  }
}

export function filterToolsByPolicy<T extends Pick<AgentTool, 'name'>>(tools: T[], policy: ToolPolicy): T[] {
  const allow = new Set<string>(policy.allow);
  return tools.filter((tool) => allow.has(tool.name));
}
