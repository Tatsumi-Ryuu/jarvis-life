import type {
  AIAttributes,
  AIStateSnapshot,
  ActionItem,
  AgentRole,
  CompletedAction,
  EventDialogue,
  EventLogEntry,
  FullGameState,
  GamePhase,
  MonthSnapshot,
  PlayerProfile,
  ResourceState,
  RoleCursor,
  SaveId,
  SettlementData,
} from '../types';
import { ATTRIBUTE_LABELS } from '../types';
import { mockEvents } from '../data/mock-events';
import { mockLocations } from '../data/mock-locations';
import { useAIStore } from '../store/aiStore';
import { useGameStore } from '../store/gameStore';
import { setCurrentSaveId } from '../services/save-service';

export type GMSnapshotKind =
  | 'opening'
  | 'raising'
  | 'raising-event'
  | 'raising-settlement'
  | 'exam'
  | 'exam-report'
  | 'endgame'
  | 'dev';

type GMSnapshot = {
  game: FullGameState;
  ai: AIStateSnapshot;
};

const GM_SAVE_ID = 'save-gm-debug-session' as SaveId;
const GM_NOW = 1778745600000;

const player: PlayerProfile = {
  name: '李明',
  identity: 'researcher',
  awarenessTier: 2,
  gender: 'male',
  customAddress: '李老师',
};

const baseAttributes: AIAttributes = {
  knowledge: 46,
  art: 43,
  fitness: 38,
  logic: 57,
  eloquence: 52,
  social: 49,
};

const examAttributes: AIAttributes = {
  knowledge: 68,
  art: 61,
  fitness: 55,
  logic: 76,
  eloquence: 72,
  social: 64,
};

const endgameAttributes: AIAttributes = {
  knowledge: 86,
  art: 80,
  fitness: 72,
  logic: 88,
  eloquence: 81,
  social: 78,
};

const baseResources: ResourceState = {
  actionPoints: 7,
  maxActionPoints: 10,
  funds: 1850,
  physicalWear: 18,
  mentalWear: 22,
};

function cloneAttributes(attributes: AIAttributes): AIAttributes {
  return { ...attributes };
}

function getAction(locationId: string, actionId: string): ActionItem {
  const action = mockLocations
    .find((location) => location.id === locationId)
    ?.actions.find((item) => item.id === actionId);

  if (!action) {
    throw new Error(`[GM] Missing action ${locationId}/${actionId}`);
  }

  return action;
}

function completedAction(action: ActionItem, month: number): CompletedAction {
  return {
    actionId: action.id,
    actionName: action.name,
    month,
    apCost: action.ap,
    effects: action.effects,
  };
}

function buildSettlement(
  month: number,
  before: AIAttributes,
  after: AIAttributes,
  fundsBefore: number,
  fundsAfter: number,
  physicalWearBefore: number,
  physicalWearAfter: number,
  mentalWearBefore: number,
  mentalWearAfter: number,
  actions: CompletedAction[],
): SettlementData {
  return {
    month,
    attributeChanges: (Object.keys(after) as (keyof AIAttributes)[]).map((key) => ({
      key,
      label: ATTRIBUTE_LABELS[key],
      before: before[key],
      after: after[key],
      delta: after[key] - before[key],
    })),
    fundsBefore,
    fundsAfter,
    fundsIncome: Math.max(0, fundsAfter - fundsBefore),
    fundsExpense: Math.min(0, fundsAfter - fundsBefore),
    physicalWearBefore,
    physicalWearAfter,
    mentalWearBefore,
    mentalWearAfter,
    completedActions: actions,
    events: ['完成课程训练', '与小星进行了一次复盘对话'],
  };
}

function createMonthSnapshots(count: number): MonthSnapshot[] {
  const snapshots: MonthSnapshot[] = [];

  for (let month = 1; month <= count; month += 1) {
    const before: AIAttributes = {
      knowledge: 34 + month * 4,
      art: 32 + month * 4,
      fitness: 30 + month * 3,
      logic: 38 + month * 4,
      eloquence: 36 + month * 3,
      social: 35 + month * 3,
    };
    const after: AIAttributes = {
      knowledge: before.knowledge + 4,
      art: before.art + 3,
      fitness: before.fitness + 3,
      logic: before.logic + 4,
      eloquence: before.eloquence + 3,
      social: before.social + 2,
    };
    const actions = [
      completedAction(getAction('school', month % 2 === 0 ? 'school_basic_eloquence' : 'school_basic_logic'), month),
      completedAction(getAction('home', 'home_interact'), month),
    ];
    const fundsBefore = 2400 - month * 80;
    const fundsAfter = fundsBefore - 260;
    const physicalWearBefore = Math.min(65, month * 4);
    const physicalWearAfter = physicalWearBefore + 3;
    const mentalWearBefore = Math.min(70, month * 5);
    const mentalWearAfter = mentalWearBefore + 4;

    snapshots.push({
      monthStartState: {
        attributes: before,
        funds: fundsBefore,
        physicalWear: physicalWearBefore,
        mentalWear: mentalWearBefore,
      },
      settlement: buildSettlement(
        month,
        before,
        after,
        fundsBefore,
        fundsAfter,
        physicalWearBefore,
        physicalWearAfter,
        mentalWearBefore,
        mentalWearAfter,
        actions,
      ),
    });
  }

  return snapshots;
}

function createBaseGame(overrides: Partial<FullGameState> = {}): FullGameState {
  const monthSnapshots = createMonthSnapshots(3);
  const action = getAction('school', 'school_basic_logic');

  return {
    phase: 'raising',
    player,
    aiName: '小星',
    aiGender: 'female',
    aiAttributes: cloneAttributes(baseAttributes),
    aiPersonality: {
      rationalVsIntuitive: 62,
      utilitarianVsDeontological: 47,
      trustVsGuard: 58,
      resilientVsSensitive: 56,
      expressiveVsSilent: 64,
      selfishVsAltruistic: 61,
    },
    resources: { ...baseResources },
    currentMonth: 3,
    maxMonths: 12,
    questionnaireAnswers: ['researcher', 'aware', 'companion'],
    currentMonthActions: [completedAction(action, 3)],
    currentAction: action,
    lastCompletedAction: action,
    currentLocationId: 'school',
    currentEvent: null,
    endgameEvidence: [],
    inventory: [
      {
        id: 'mall_gift_speech_card',
        name: '演讲练习卡',
        description: '帮助AI练习表达的小卡片。',
        iconAssetId: 'icon_diary',
        type: 'gift',
      },
    ],
    monthlySnapshots: monthSnapshots,
    randomSeed: 'gm-snapshot-seed',
    gameOverReason: null,
    fundsWarningShown: false,
    showFundsWarning: false,
    showWearWarning: false,
    wearWarningDismissedSeverity: 0,
    shownGuides: ['goto-school', 'wear-intro'],
    redDots: {
      talkUsedMonths: [],
      seenInventoryItemIds: [],
      readDiaryMonths: [],
      finalizedDiaryMonths: [],
      seenUnlockedActionIds: [],
    },
    ...overrides,
  };
}

function roleCursors(): Record<AgentRole, RoleCursor> {
  return {
	    companion: { role: 'companion', lastSeenEventIndex: -1, syncedAt: GM_NOW },
	    evaluator: { role: 'evaluator', lastSeenEventIndex: -1, syncedAt: GM_NOW },
	    narrator: { role: 'narrator', lastSeenEventIndex: -1, syncedAt: GM_NOW },
	    opponent: { role: 'opponent', lastSeenEventIndex: -1, syncedAt: GM_NOW },
	  };
	}

function createEventLog(monthCount: number): EventLogEntry[] {
  return Array.from({ length: monthCount }, (_, index) => {
    const month = index + 1;
    return {
      id: `gm-event-${month}`,
      timestamp: GM_NOW + month * 1000,
      month,
      type: 'monthly-summary',
      summary: `第${month}月结束。小星完成了课程训练，并开始形成稳定的自我表达。`,
      tags: ['gm', 'monthly-summary'],
      emotionalImpact: Math.min(9, 4 + month),
    };
  });
}

function createAI(monthCount: number): AIStateSnapshot {
  return {
    version: 1,
    savedAt: GM_NOW,
    eventLog: createEventLog(monthCount),
    roleCursors: roleCursors(),
    narrativeCache: [],
    conversationLog: [
      {
        id: 'gm-conversation-1',
        saveId: GM_SAVE_ID,
        month: Math.max(1, Math.min(monthCount, 3)),
        timestamp: GM_NOW + 500,
        role: 'player',
        content: '今天训练结束后，你觉得自己有什么变化？',
        source: 'talk-modal',
      },
      {
        id: 'gm-conversation-2',
        saveId: GM_SAVE_ID,
        month: Math.max(1, Math.min(monthCount, 3)),
        timestamp: GM_NOW + 1000,
        role: 'companion',
        content: '我好像更能分辨自己是在回答，还是在真正想告诉你什么。',
        source: 'talk-modal',
        emotionalImpact: 7,
      },
    ],
  };
}

export function createGMSnapshot(kind: GMSnapshotKind): GMSnapshot {
  if (kind === 'opening') {
    return {
      game: createBaseGame({
        phase: 'title',
        currentMonth: 1,
        currentMonthActions: [],
        currentAction: null,
        lastCompletedAction: null,
        currentLocationId: null,
        currentEvent: null,
        monthlySnapshots: [],
      }),
      ai: createAI(1),
    };
  }

  if (kind === 'raising-event') {
    const event = mockEvents[0] as EventDialogue;
    return {
      game: createBaseGame({
        phase: 'raising',
        currentMonth: 3,
        currentLocationId: 'school',
        currentEvent: event,
      }),
      ai: createAI(3),
    };
  }

  if (kind === 'raising-settlement') {
    const action = getAction('school', 'school_basic_logic');
    const before = createMonthSnapshots(1)[0].monthStartState;
    return {
      game: createBaseGame({
        phase: 'raising',
        currentMonth: 1,
        aiAttributes: {
          knowledge: 48,
          art: 39,
          fitness: 36,
          logic: 49,
          eloquence: 42,
          social: 40,
        },
        resources: {
          actionPoints: 2,
          maxActionPoints: 10,
          funds: 1700,
          physicalWear: 7,
          mentalWear: 10,
        },
        currentMonthActions: [completedAction(action, 1)],
        currentAction: null,
        lastCompletedAction: action,
        currentLocationId: 'school',
        monthlySnapshots: [
          {
            monthStartState: before,
            settlement: buildSettlement(
              1,
              before.attributes,
              {
                knowledge: 48,
                art: 39,
                fitness: 36,
                logic: 49,
                eloquence: 42,
                social: 40,
              },
              before.funds,
              1700,
              before.physicalWear,
              7,
              before.mentalWear,
              10,
              [completedAction(action, 1)],
            ),
          },
        ],
      }),
      ai: createAI(1),
    };
  }

  if (kind === 'exam' || kind === 'exam-report') {
    return {
      game: createBaseGame({
        phase: 'exam',
        currentMonth: 6,
        aiAttributes: cloneAttributes(examAttributes),
        resources: {
          actionPoints: 10,
          maxActionPoints: 10,
          funds: 2280,
          physicalWear: 30,
          mentalWear: 36,
        },
        currentMonthActions: [],
        currentAction: null,
        lastCompletedAction: null,
        currentLocationId: null,
        currentEvent: null,
        monthlySnapshots: createMonthSnapshots(5),
      }),
      ai: createAI(6),
    };
  }

  if (kind === 'endgame') {
    return {
      game: createBaseGame({
        phase: 'endgame',
        currentMonth: 12,
        aiAttributes: cloneAttributes(endgameAttributes),
        resources: {
          actionPoints: 4,
          maxActionPoints: 8,
          funds: 1320,
          physicalWear: 58,
          mentalWear: 64,
        },
        currentMonthActions: [],
        currentAction: null,
        lastCompletedAction: null,
        currentLocationId: null,
        currentEvent: null,
        monthlySnapshots: createMonthSnapshots(12),
      }),
      ai: createAI(12),
    };
  }

  return {
    game: createBaseGame({
      phase: kind === 'dev' ? 'raising' : ('raising' as GamePhase),
    }),
    ai: createAI(3),
  };
}

export function loadGMSnapshot(kind: GMSnapshotKind): void {
  const snapshot = createGMSnapshot(kind);
  const scopedAI = {
    ...snapshot.ai,
    eventLog: snapshot.ai.eventLog.map((entry) => ({ ...entry, saveId: GM_SAVE_ID })),
    conversationLog: snapshot.ai.conversationLog.map((entry) => ({ ...entry, saveId: GM_SAVE_ID })),
  };

  setCurrentSaveId(GM_SAVE_ID);
  useGameStore.setState(snapshot.game);
  useAIStore.setState({
    eventLog: scopedAI.eventLog,
    roleCursors: scopedAI.roleCursors,
    narrativeCache: scopedAI.narrativeCache,
    conversationLog: scopedAI.conversationLog,
    isGenerating: false,
    lastError: null,
  });
}
