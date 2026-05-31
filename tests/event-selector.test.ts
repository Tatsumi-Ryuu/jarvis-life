import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEventTriggerChance, selectRandomEvent } from '../src/engine/event-selector';
import { mockEvents } from '../src/data/mock-events';
import type { ActionItem, EventDialogue, EventLogEntry, FullGameState } from '../src/types';

const baseAction: ActionItem = {
  id: 'office_graphic_designer',
  name: '平面设计师',
  tier: 'intermediate',
  ap: 2,
  cost: -640,
  description: '测试行动',
  effects: [
    { type: 'attribute', target: 'art', value: 3 },
    { type: 'attribute', target: 'logic', value: 1 },
  ],
  status: 'available',
  category: '工作',
  prerequisite: { art: 45, logic: 35 },
};

const baseGameState: FullGameState = {
  phase: 'raising',
  player: {
    name: '测试者',
    identity: 'volunteer',
    awarenessTier: 1,
    gender: 'male',
    customAddress: '测试者',
  },
  aiName: '小星',
  aiGender: 'female',
  aiAttributes: { knowledge: 50, art: 47, fitness: 50, logic: 38, eloquence: 50, social: 50 },
  aiPersonality: {
    rationalVsIntuitive: 50,
    utilitarianVsDeontological: 50,
    trustVsGuard: 50,
    resilientVsSensitive: 50,
    expressiveVsSilent: 50,
    selfishVsAltruistic: 50,
  },
  resources: { actionPoints: 8, maxActionPoints: 10, funds: 3000, physicalWear: 10, mentalWear: 10 },
  currentMonth: 4,
  maxMonths: 12,
  questionnaireAnswers: [],
  currentMonthActions: [],
  currentAction: null,
  lastCompletedAction: null,
  currentLocationId: 'office',
  currentEvent: null,
  endgameEvidence: [],
  inventory: [],
  monthlySnapshots: [],
  randomSeed: 'event-selector-test-seed',
  gameOverReason: null,
  fundsWarningShown: false,
  showFundsWarning: false,
  shownGuides: [],
};

const events: EventDialogue[] = [
  {
    id: 'office-art',
    title: '艺术争议',
    eventType: 'art-dispute',
    location: 'office',
    aiText: '测试',
    aiResponse: '测试',
    relatedAttributes: ['art'],
    relatedActions: ['office_graphic_designer'],
    weight: 2,
  },
  {
    id: 'school-achievement',
    title: '学校成就',
    eventType: 'achievement',
    location: 'school',
    aiText: '测试',
    aiResponse: '测试',
    weight: 10,
  },
  {
    id: 'committee-only',
    title: '委员事件',
    eventType: 'key',
    location: 'office',
    aiText: '测试',
    aiResponse: '测试',
    identityRequired: 'committee',
    weight: 10,
  },
];

function eventLogEntry(overrides: Partial<EventLogEntry>): EventLogEntry {
  return {
    id: 'event-log',
    timestamp: 1,
    month: 4,
    type: 'event',
    summary: '测试事件',
    tags: ['事件结果'],
    ...overrides,
  };
}

describe('selectRandomEvent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('filters by current location and identity', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);

    const result = selectRandomEvent(4, events, {
      month: 4,
      locationId: 'office',
      action: baseAction,
      gameState: baseGameState,
      eventLog: [],
    });

    expect(result?.id).toBe('office-art');
  });

  it('does not select an event when the trigger roll fails', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.5);

    const result = selectRandomEvent(4, events, {
      month: 4,
      locationId: 'office',
      action: baseAction,
      gameState: baseGameState,
      eventLog: [],
    });

    expect(result).toBeNull();
  });

  it('starts at 40% and halves the trigger chance after each event in the same month', () => {
    expect(getEventTriggerChance(0)).toBe(0.4);
    expect(getEventTriggerChance(1)).toBe(0.2);
    expect(getEventTriggerChance(2)).toBe(0.1);
    expect(getEventTriggerChance(3)).toBe(0.05);
  });

  it('does not repeat the same event type in the same location and month', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);

    const result = selectRandomEvent(4, events, {
      month: 4,
      locationId: 'office',
      action: baseAction,
      gameState: baseGameState,
      eventLog: [
        eventLogEntry({ technical: { eventType: 'art-dispute', location: 'office' } }),
      ],
    });

    expect(result).toBeNull();
  });

  it('can select identity-specific events for the matching identity', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99);

    const result = selectRandomEvent(4, events, {
      month: 4,
      locationId: 'office',
      action: baseAction,
      gameState: {
        ...baseGameState,
        player: { ...baseGameState.player, identity: 'committee' },
      },
      eventLog: [],
    });

    expect(result?.id).toBe('committee-only');
  });

  it('does not select an event that already happened', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);

    const result = selectRandomEvent(4, events, {
      month: 4,
      locationId: 'office',
      action: baseAction,
      gameState: baseGameState,
      eventLog: [
        eventLogEntry({
          month: 3,
          technical: { eventId: 'office-art', eventType: 'art-dispute', location: 'office' },
        }),
      ],
    });

    expect(result).toBeNull();
  });

  it('keeps special event titles paired with matching seed text', () => {
    const firstPraise = mockEvents.find((event) => event.id === 'evt_school_first_praise_01');

    expect(firstPraise?.title).toBe('第一次被夸奖');
    expect(firstPraise?.aiText).toContain('老师说我今天讲题讲得很清楚');
    expect(firstPraise?.aiText).not.toContain('议论');
    expect(firstPraise?.aiText).not.toContain('养成的AI');
  });

  it('has a broad event pool with unique event ids', () => {
    const ids = mockEvents.map((event) => event.id);
    const uniqueIds = new Set(ids);

    expect(mockEvents.length).toBeGreaterThanOrEqual(20);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('includes special events for minigame result actions', () => {
    expect(mockEvents.some((event) => event.relatedActions?.includes('park_find_cat'))).toBe(true);
    expect(mockEvents.some((event) => event.relatedActions?.includes('company_gomoku_ai_test_win'))).toBe(true);
    expect(mockEvents.some((event) => event.relatedActions?.includes('company_gomoku_ai_test_lose'))).toBe(true);
  });
});
