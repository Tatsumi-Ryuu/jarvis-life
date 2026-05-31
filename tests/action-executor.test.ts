import { describe, it, expect } from 'vitest';
import {
  executeAction,
  createEventLogEntry,
  createMonthlySummaryEvent,
  createWearWarningEvent,
  createGameOverEvent,
} from '../src/engine/action-executor';
import { createExamGomokuAiTestResultAction } from '../src/data/gomoku-ai-test-action';
import type { FullGameState, ActionItem } from '../src/types';
import { AgentRole } from '../src/types';

const mockState: FullGameState = {
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
  aiAttributes: { knowledge: 5, art: 5, fitness: 5, logic: 5, eloquence: 5, social: 5 },
  aiPersonality: {
    rationalVsIntuitive: 50,
    utilitarianVsDeontological: 50,
    trustVsGuard: 50,
    resilientVsSensitive: 50,
    expressiveVsSilent: 50,
    selfishVsAltruistic: 50,
  },
  resources: { actionPoints: 10, maxActionPoints: 10, funds: 3000, physicalWear: 10, mentalWear: 10 },
  currentMonth: 3,
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
  randomSeed: 'action-executor-test-seed',
  gameOverReason: null,
  fundsWarningShown: false,
  showFundsWarning: false,
};

const studyAction: ActionItem = {
  id: 'study',
  name: '去学校上课',
  ap: 2,
  cost: 100,
  description: '去学校上了一节数学课。',
  effects: [
    { type: 'attribute', target: 'knowledge', value: 1 },
    { type: 'mentalWear', value: 5 },
    { type: 'funds', value: -100 },
  ],
  status: 'available',
  category: '学习',
};

describe('executeAction', () => {
  it('should apply attribute changes', () => {
    const result = executeAction(mockState, studyAction);
    expect(result.aiAttributes.knowledge).toBe(6);
  });

  it('should deduct AP', () => {
    const result = executeAction(mockState, studyAction);
    expect(result.resources.actionPoints).toBe(8);
  });

  it('should apply wear changes', () => {
    const result = executeAction(mockState, studyAction);
    expect(result.resources.mentalWear).toBe(15);
  });

  it('should apply funds changes', () => {
    const result = executeAction(mockState, studyAction);
    expect(result.resources.funds).toBe(2900);
  });

  it('should detect wear-death game over', () => {
    const criticalState: FullGameState = {
      ...mockState,
      resources: { ...mockState.resources, physicalWear: 79, mentalWear: 10 },
    };
    const heavyWearAction: ActionItem = {
      ...studyAction,
      effects: [{ type: 'physicalWear', value: 3 }],
    };
    const result = executeAction(criticalState, heavyWearAction);
    expect(result.gameOverReason).toBe('wear-death');
    expect(result.phase).toBe('game-over');
  });

  it('should detect bankruptcy game over', () => {
    const poorState: FullGameState = {
      ...mockState,
      resources: { ...mockState.resources, funds: 50 },
    };
    const expensiveAction: ActionItem = {
      ...studyAction,
      cost: 600,
      effects: [{ type: 'funds', value: -600 }],
    };
    const result = executeAction(poorState, expensiveAction);
    expect(result.gameOverReason).toBe('bankruptcy');
  });

  it('should apply exam gomoku win rewards without deducting AP', () => {
    const action = createExamGomokuAiTestResultAction(true);
    const result = executeAction(mockState, action);

    expect(result.resources.actionPoints).toBe(10);
    expect(result.resources.funds).toBe(5000);
    expect(result.aiAttributes).toEqual({
      knowledge: 10,
      art: 10,
      fitness: 10,
      logic: 10,
      eloquence: 10,
      social: 10,
    });
  });

  it('should apply exam gomoku loss without changing stats or AP', () => {
    const action = createExamGomokuAiTestResultAction(false);
    const result = executeAction(mockState, action);

    expect(result.resources.actionPoints).toBe(10);
    expect(result.resources.funds).toBe(3000);
    expect(result.aiAttributes).toEqual(mockState.aiAttributes);
  });
});

describe('createEventLogEntry', () => {
  it('should create entry with correct type and month', () => {
    const entry = createEventLogEntry(studyAction, mockState);
    expect(entry.type).toBe('action');
    expect(entry.month).toBe(3);
  });

  it('should include technical details', () => {
    const entry = createEventLogEntry(studyAction, mockState);
    expect(entry.technical?.actionId).toBe('study');
    expect(entry.technical?.apCost).toBe(2);
    expect(entry.technical?.effects).toEqual(studyAction.effects);
  });

  it('should generate a readable summary', () => {
    const entry = createEventLogEntry(studyAction, mockState);
    expect(entry.summary).toContain('小星');
    expect(entry.summary).toContain('数学');
  });

  it('should categorize action with tags', () => {
    const entry = createEventLogEntry(studyAction, mockState);
    expect(entry.tags).toContain('学习');
    expect(entry.tags).toContain('knowledge');
  });

  it('should calculate emotional impact', () => {
    const entry = createEventLogEntry(studyAction, mockState);
    expect(entry.emotionalImpact).toBeGreaterThanOrEqual(1);
    expect(entry.emotionalImpact).toBeLessThanOrEqual(10);
  });

  it('should generate unique IDs', () => {
    const entry1 = createEventLogEntry(studyAction, mockState);
    const entry2 = createEventLogEntry(studyAction, mockState);
    expect(entry1.id).not.toBe(entry2.id);
  });
});

describe('createMonthlySummaryEvent', () => {
  it('should create a monthly summary event', () => {
    const event = createMonthlySummaryEvent(3, mockState);
    expect(event.type).toBe('monthly-summary');
    expect(event.month).toBe(3);
    expect(event.tags).toContain('月度总结');
    expect(event.summary).toContain('第3月');
    expect(event.summary).toContain('小星');
  });
});

describe('createWearWarningEvent', () => {
  it('should return null when wear is low', () => {
    const event = createWearWarningEvent(mockState);
    expect(event).toBeNull();
  });

  it('should return warning when physical wear is high', () => {
    const wornState: FullGameState = {
      ...mockState,
      resources: { ...mockState.resources, physicalWear: 65, mentalWear: 10 },
    };
    const event = createWearWarningEvent(wornState);
    expect(event).not.toBeNull();
    expect(event!.type).toBe('wear-warning');
    expect(event!.summary).toContain('体力磨损严重');
  });

  it('should return warning when mental wear is high', () => {
    const wornState: FullGameState = {
      ...mockState,
      resources: { ...mockState.resources, physicalWear: 10, mentalWear: 70 },
    };
    const event = createWearWarningEvent(wornState);
    expect(event).not.toBeNull();
    expect(event!.summary).toContain('精神磨损严重');
  });

  it('should warn about both when both are high', () => {
    const wornState: FullGameState = {
      ...mockState,
      resources: { ...mockState.resources, physicalWear: 65, mentalWear: 70 },
    };
    const event = createWearWarningEvent(wornState);
    expect(event!.summary).toContain('体力磨损严重');
    expect(event!.summary).toContain('精神磨损严重');
  });
});

describe('createGameOverEvent', () => {
  it('should create wear-death event', () => {
    const event = createGameOverEvent('wear-death', mockState);
    expect(event.type).toBe('game-over');
    expect(event.tags).toContain('游戏结束');
    expect(event.tags).toContain('wear-death');
    expect(event.emotionalImpact).toBe(10);
    expect(event.summary).toContain('小星');
  });

  it('should create bankruptcy event', () => {
    const event = createGameOverEvent('bankruptcy', mockState);
    expect(event.tags).toContain('bankruptcy');
    expect(event.summary).toContain('资金');
  });
});
