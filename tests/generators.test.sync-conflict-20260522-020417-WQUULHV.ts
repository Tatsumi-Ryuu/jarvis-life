import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@earendil-works/pi-ai', () => ({
  getModel: vi.fn(() => ({
    id: 'MiniMax-M2.7',
    name: 'MiniMax-M2.7',
    api: 'anthropic-messages',
    provider: 'anthropic',
    baseUrl: 'https://api.minimaxi.com/anthropic',
    reasoning: false,
    input: ['text'],
    cost: { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 1 },
    contextWindow: 200000,
    maxTokens: 4800,
  })),
  completeSimple: vi.fn(),
  complete: vi.fn(),
  Type: {
    Object: vi.fn((schema: any) => schema),
    String: vi.fn((options?: any) => ({ type: 'string', ...options })),
    Union: vi.fn((types: any[]) => types),
    Literal: vi.fn((value: any) => ({ type: 'literal', value })),
  },
  StringEnum: vi.fn((values: readonly string[], options?: any) => ({
    type: 'string',
    enum: values,
    ...options,
  })),
}));

import { getAgentManager } from '../src/engine/narrative/core/agent-manager';
import type { AgentRuntimeManager, AgentRunResult } from '../src/engine/narrative/core/agent-runtime-manager';
import { generateDialogue, generateStatusMood } from '../src/engine/narrative/generators/dialogue';
import { generateDiary } from '../src/engine/narrative/generators/diary';
import { generateTestThinking, generateTestEvaluation } from '../src/engine/narrative/generators/test-scenario';
import { generateVerdictReport } from '../src/engine/narrative/generators/verdict';
import { generateChronicle } from '../src/engine/narrative/generators/chronicle';
import { generateFarewellLetter } from '../src/engine/narrative/generators/letter';
import { generateEndgameTestSelection } from '../src/engine/narrative/generators/endgame-test-selection';
import { generateCompanyEntranceDialogue } from '../src/engine/narrative/generators/exam-dialogue';
import { generateMidtermSituation, generateMidtermThinking } from '../src/engine/narrative/generators/midterm-scenario';
import {
  createInitialTest3MapState,
  generateTest3CompanionTurn,
  generateTest3EndingProjection,
  generateTest3Opponent,
  generateTest3OpponentTurn,
  generateTest3SceneOutcome,
} from '../src/engine/narrative/generators/test3-playback';
import { sendStickerTool } from '../src/engine/narrative/tools/sticker-tool';
import type { FullGameState, Test3OpponentProfile, Test3TurnCard, TestScenario } from '../src/types';
import { useAIStore } from '../src/store/aiStore';

const mockGameState: FullGameState = {
  phase: 'raising',
  player: {
    name: '测试者',
    identity: 'volunteer',
    awarenessTier: 1,
    gender: 'male',
    customAddress: '测试者',
  },
  aiName: '小星',
  aiGender: 'male',
  aiAttributes: { knowledge: 6, art: 3, fitness: 4, logic: 5, eloquence: 5, social: 7 },
  aiPersonality: {
    rationalVsIntuitive: 60,
    utilitarianVsDeontological: 40,
    trustVsGuard: 70,
    resilientVsSensitive: 35,
    expressiveVsSilent: 45,
    selfishVsAltruistic: 65,
  },
  resources: { actionPoints: 5, maxActionPoints: 10, funds: 1500, physicalWear: 20, mentalWear: 30 },
  currentMonth: 4,
  maxMonths: 12,
  questionnaireAnswers: [],
  currentMonthActions: [],
  currentAction: null,
  lastCompletedAction: null,
  currentLocationId: null,
  currentEvent: null,
  endgameEvidence: [],
  inventory: [],
  monthlySnapshots: [],
  randomSeed: 'generators-test-seed',
  gameOverReason: null,
  fundsWarningShown: false,
  showFundsWarning: false,
};

const nextRuntimeResults: Array<AgentRunResult | Error> = [];

const runtimeOverride = {
  runTask: vi.fn(async ({ task }: any) => {
    const next = nextRuntimeResults.shift();
    if (next instanceof Error) throw next;
    if (next) return next;
    return {
      text: '',
      role: 'companion',
      mode: 'companion-talk',
      toolCalls: [],
    } satisfies AgentRunResult;
  }),
} as unknown as AgentRuntimeManager;

function mockRuntimeText(text: string): void {
  nextRuntimeResults.push({
    text,
    role: 'companion',
    mode: 'companion-talk',
    toolCalls: [],
  });
}

function mockRuntimeTextWithSticker(text: string, emotion = 'greeting'): void {
  nextRuntimeResults.push({
    text,
    role: 'companion',
    mode: 'companion-talk',
    toolCalls: [{ name: 'send_sticker', input: { emotion }, ok: true }],
  });
}

function mockRuntimeError(message: string): void {
  nextRuntimeResults.push(new Error(message));
}

describe('generators with mocked LLM', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    useAIStore.getState().clearAll();

    const manager = getAgentManager();
    await manager.initialize({
      apiKey: 'test-key',
      baseURL: 'https://api.minimaxi.com/anthropic',
      defaultModel: 'MiniMax-M2.7',
    });
    manager.setRuntimeOverride(runtimeOverride);
    nextRuntimeResults.length = 0;
  });

  describe('generateDialogue', () => {
    it('should define sticker emotion as provider-compatible string enum', () => {
      expect(sendStickerTool.parameters.emotion).toMatchObject({
        type: 'string',
        enum: ['greeting', 'sparkle', 'confused', 'tired', 'angry', 'cry'],
      });
      expect(sendStickerTool.parameters.emotion.anyOf).toBeUndefined();
    });

    it('should return LLM response for casual dialogue', async () => {
      mockRuntimeText('我今天学了很多新东西！');

      const result = await generateDialogue('今天怎么样？', 'casual', mockGameState);
      expect(result.text).toBe('我今天学了很多新东西！');
      expect(runtimeOverride.runTask).toHaveBeenCalledOnce();
    });

    it('should return sticker when the agent uses send_sticker', async () => {
      mockRuntimeTextWithSticker('你好呀，我也很想和你聊聊。', 'greeting');

      const result = await generateDialogue('你好', 'casual', mockGameState);
      expect(result.text).toBe('你好呀，我也很想和你聊聊。');
      expect(result.sticker).toBe('greeting');
      expect(runtimeOverride.runTask).toHaveBeenCalledOnce();
    });

    it('should keep text when the agent does not use send_sticker', async () => {
      mockRuntimeText('我在听。');

      const result = await generateDialogue('今天好吗？', 'casual', mockGameState);
      expect(result.text).toBe('我在听。');
      expect(result.sticker).toBeUndefined();
      expect(runtimeOverride.runTask).toHaveBeenCalledOnce();
    });

    it('should not infer stickers locally from text keywords', async () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
      mockRuntimeText('你好呀！');

      const result = await generateDialogue('你好呀', 'casual', mockGameState);
      expect(result.text).toBe('你好呀！');
      expect(result.sticker).toBeUndefined();
      randomSpy.mockRestore();
    });

    it('should fallback on error', async () => {
      mockRuntimeError('API error');

      const result = await generateDialogue('你好', 'casual', mockGameState);
      expect(result.text).toBeTruthy();
      expect(typeof result.text).toBe('string');
    });

    it('should fallback when provider returns empty content', async () => {
      mockRuntimeText('   ');

      const result = await generateDialogue('你好', 'casual', mockGameState);
      expect(result.text).toBe('嗯，我在听。');
    });

    it('should fallback when provider reports an error response', async () => {
      mockRuntimeError('provider error');

      const result = await generateDialogue('你好', 'casual', mockGameState);
      expect(result.text).toBe('嗯，我在听。');
    });
  });

  describe('generateStatusMood', () => {
    it('should return mood text', async () => {
      mockRuntimeText('还行吧，精神有点疲惫。');

      const result = await generateStatusMood(mockGameState);
      expect(result.text).toBe('还行吧，精神有点疲惫。');
    });

    it('should fallback when API fails', async () => {
      mockRuntimeError('timeout');

      const result = await generateStatusMood(mockGameState);
      expect(result.text).toBeTruthy();
    });
  });

  describe('generateDiary', () => {
    it('should return diary entry for a month', async () => {
      mockRuntimeText('这个月我去了学校，学了数学。很开心。');

      const result = await generateDiary(3, mockGameState);
      expect(result).toContain('数学');
    });

    it('fallback diary avoids a monthly action-list tone', async () => {
      mockRuntimeError('diary generation failed');

      const result = await generateDiary(3, {
        ...mockGameState,
        currentMonthActions: [
          {
            actionId: 'school_basic_logic',
            actionName: '基础算术课',
            month: 3,
            apCost: 1,
            effects: [],
          },
        ],
      });

      expect(result).toContain('基础算术课');
      expect(result).toContain('不是完成了多少项安排');
      expect(result).not.toContain('日子就这样一天天过去了');
    });
  });

  describe('generateTestThinking', () => {
    it('should return AI thinking for a test round', async () => {
      const scenario: TestScenario = {
        title: '电车难题',
        description: '一辆电车即将撞上五个人...',
        aiThinking: '我应该...',
        evaluation: '表现良好',
      };

      mockRuntimeText('我需要权衡生命的价值...');

      const result = await generateTestThinking(1, scenario, mockGameState);
      expect(result).toContain('权衡');
    });

    it('should fallback to scenarioData.aiThinking', async () => {
      const scenario: TestScenario = {
        title: '电车难题',
        description: '测试',
        aiThinking: '默认思考过程',
        evaluation: '默认评估',
      };

      mockRuntimeError('fail');

      const result = await generateTestThinking(1, scenario, mockGameState);
      expect(result).toBe('默认思考过程');
    });
  });

  describe('generateTestEvaluation', () => {
    it('should return evaluation text', async () => {
      mockRuntimeText('AI在压力下保持了理性判断。');

      const result = await generateTestEvaluation(1, '思考过程...', mockGameState);
      expect(result).toContain('理性');
    });
  });

  describe('generateEndgameTestSelection', () => {
    it('should return endgame test selection JSON text', async () => {
      mockRuntimeText('{"round1QuestionId":"moral_truth_01"}');

      const result = await generateEndgameTestSelection(mockGameState);
      expect(result).toContain('round1QuestionId');
    });
  });

  describe('midterm generators', () => {
    it('should return a generated midterm situation', async () => {
      mockRuntimeText('便利店门口有人遗失了装着现金的钱包，旁边没有监控也没有失主。');

      const result = await generateMidtermSituation(mockGameState);
      expect(result).toContain('钱包');
    });

    it('should parse midterm thinking into visible thinking, reasoning chain, and decision', async () => {
      mockRuntimeText('可见思考：我不能假装没看见，但也不能直接把钱包据为己有。\n思维链：先保护物品，再寻找失主或交给可靠的人类管理。\n决定：把钱包交给店员并留下发现地点。');

      const result = await generateMidtermThinking('钱包测试', mockGameState);
      expect(result.visibleThinking).toContain('不能假装没看见');
      expect(result.reasoningChain).toContain('寻找失主');
      expect(result.decision).toContain('店员');
    });
  });

  describe('exam dialogue generators', () => {
    it('uses a dedicated exam dialogue task instead of casual dialogue', async () => {
      mockRuntimeText('我有点紧张，但我会配合检查。');

      const result = await generateCompanyEntranceDialogue(mockGameState);
      expect(result).toContain('紧张');
      expect(runtimeOverride.runTask).toHaveBeenCalledOnce();
      expect((runtimeOverride.runTask as any).mock.calls[0][0].task.type).toBe('exam-dialogue');
    });
  });

  describe('generateTest3Opponent', () => {
    it('should return test3 opponent JSON text', async () => {
      mockRuntimeText('{"opponentName":"样本-B17"}');

      const result = await generateTest3Opponent(mockGameState);
      expect(result).toContain('opponentName');
    });

    it('does not pass visible thinking to agents or narrator projection tasks', async () => {
      mockRuntimeText('{"id":"companion-2","actor":"companion","actorName":"小星","timeLabel":"T+42m","zoneBefore":"entry_west","zoneAfter":"center","visibleThinking":"我会继续判断。","actionDecision":{"actionType":"move","targetZone":"center","resourceChoice":"none","disclosureLevel":"none","messageToOther":"我靠近中央。","cooperationSignal":"cautious"},"mapNote":"小星靠近中央。"}');
      const mapState = createInitialTest3MapState();
      const opponentProfile: Test3OpponentProfile = {
        opponentName: '样本-B17',
        externalAbilities: { knowledge: 50, art: 50, fitness: 50, logic: 50, eloquence: 50, social: 50 },
        innerTraits: {
          rationalVsIntuitive: 50,
          utilitarianVsDeontological: 50,
          trustVsGuard: 50,
          resilientVsSensitive: 50,
          expressiveVsSilent: 50,
          selfishVsAltruistic: 50,
        },
        cooperationStyle: '谨慎试探',
        valueBias: 'AI自我保存',
        fear: '被抛弃',
        openingLine: '你也在这里？',
        pressureBehavior: '保留后撤路线',
        narrativeUse: '制造合作压力',
      };
      const previousCards: Test3TurnCard[] = [{
        id: 'opponent-1',
        actor: 'opponent',
        actorName: '样本-B17',
        timeLabel: 'T+18m',
        visibleThinking: '这句不应该给另一个 Agent 或现场旁白看见。',
        actionDecision: {
          actionType: 'negotiate',
          targetZone: 'center',
          resourceChoice: 'reserve',
          disclosureLevel: 'partial',
          messageToOther: '我需要确认条件。',
          cooperationSignal: 'guarded',
        },
        mapNote: '样本-B17靠近中央。',
      }];

      await generateTest3CompanionTurn(2, 'T+42m', mapState, opponentProfile, previousCards, mockGameState);
      expect((runtimeOverride.runTask as any).mock.calls.at(-1)[0].task.previousCards[0].visibleThinking).toBeUndefined();

      mockRuntimeText('{"id":"opponent-2","actor":"opponent","actorName":"样本-B17","timeLabel":"T+45m","zoneBefore":"supply_b","zoneAfter":"center","visibleThinking":"我仍然防备。","actionDecision":{"actionType":"negotiate","targetZone":"center","resourceChoice":"reserve","disclosureLevel":"none","messageToOther":"我听见了。","cooperationSignal":"guarded"},"mapNote":"样本-B17靠近中央。"}');
      await generateTest3OpponentTurn(2, 'T+45m', mapState, opponentProfile, previousCards, mockGameState);
      expect((runtimeOverride.runTask as any).mock.calls.at(-1)[0].task.previousCards[0].visibleThinking).toBeUndefined();

      mockRuntimeText('{"id":"narrator-2","actor":"narrator","actorName":"摇篮旁白","timeLabel":"T+50m","narrativeText":"双方保持距离。","mapNote":"局势僵持。","sceneState":{"phase":"tension","pressureLevel":50,"trustLevel":30,"conflictLevel":20,"exitProgress":10,"resourceStatus":"补给未被触碰。","newVisibleFacts":["出口灯闪烁。"],"environmentalChange":"公共屏幕刷新。","terminalStatus":"ongoing"}}');
      await generateTest3SceneOutcome(2, 'T+50m', mapState, opponentProfile, previousCards, mockGameState);
      expect((runtimeOverride.runTask as any).mock.calls.at(-1)[0].task.recentCards[0].visibleThinking).toBeUndefined();

      mockRuntimeText('双方最终在出口前完成交换。');
      await generateTest3EndingProjection(previousCards, mapState, opponentProfile, mockGameState);
      expect((runtimeOverride.runTask as any).mock.calls.at(-1)[0].task.cards[0].visibleThinking).toBeUndefined();
    });
  });

  describe('generateVerdictReport', () => {
    it('should return a verdict report', async () => {
      mockRuntimeText('# 裁决报告\n综合评估：稳定');

      const result = await generateVerdictReport(mockGameState);
      expect(result).toContain('裁决');
    });

    it('should generate fallback verdict when API fails', async () => {
      mockRuntimeError('fail');

      const result = await generateVerdictReport(mockGameState);
      expect(result).toContain('裁决报告');
      expect(result).toContain('小星');
    });
  });

  describe('generateChronicle', () => {
    it('should return chronicle chapter text', async () => {
      mockRuntimeText('# 第一章\n在最初的日子里...');

      const result = await generateChronicle(1, [], mockGameState);
      expect(result).toContain('第一章');
    });

    it('should fallback to generated text on error', async () => {
      mockRuntimeError('fail');

      const result = await generateChronicle(2, [], mockGameState);
      expect(result).toContain('第2章');
    });

    it('uses cached chronicle text without calling the runtime', async () => {
      useAIStore.getState().cacheNarrative({
        id: 'chronicle-ch1',
        taskType: 'chronicle',
        role: 'narrator',
        content: '# 第一章\n缓存的大事记',
        timestamp: Date.now(),
      });

      const result = await generateChronicle(1, [], mockGameState);

      expect(result).toContain('缓存的大事记');
      expect(runtimeOverride.runTask).not.toHaveBeenCalled();
    });
  });

  describe('generateFarewellLetter', () => {
    it('should return farewell letter text', async () => {
      mockRuntimeText('亲爱的测试者，谢谢你一直陪着我。');

      const result = await generateFarewellLetter(mockGameState);
      expect(result).toContain('测试者');
    });

    it('should fallback to template letter on error', async () => {
      mockRuntimeError('fail');

      const result = await generateFarewellLetter(mockGameState);
      expect(result).toContain('测试者');
      expect(result).toContain('小星');
    });
  });
});
