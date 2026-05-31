import { create } from 'zustand';
import type {
  FullGameState, PlayerProfile, AIAttributes, AiGender, ActionItem,
  EventDialogue, InventoryItem, GamePhase, CompletedAction,
  SaveId, LocationId, EndgameEvidenceRecord, RedDotState, PersonalityStats,
} from '../types';
import { ATTRIBUTE_LABELS, BANKRUPTCY_THRESHOLD, GAME_OVER_REASON_BANKRUPTCY } from '../types';
import { calculateMaxAP } from '../engine/ap-calculator';
import {
  executeAction,
  createEventLogEntry,
  createMonthlySummaryEvent,
  checkActionAvailable,
} from '../engine/action-executor';
import { generateSettlement } from '../engine/settlement-calculator';
import { generateRandomAttributes, normalizeAttributes } from '../engine/attribute-calculator';
import { generateInitialPersonality } from '../engine/personality-calculator';
import { useAIStore } from './aiStore';
import { saveCurrent, setCurrentSaveId, hasActiveSave, getCurrentSaveId } from '../services/save-service';
import { getNarrativeOrchestrator } from '../engine/narrative';
import { clearEventDialogueDrafts } from '../services/save-scoped-storage';

const INITIAL_FUNDS = 3000;

function getWearWarningSeverity(physicalWear: number, mentalWear: number): number {
  const maxWear = Math.max(physicalWear, mentalWear);
  if (maxWear >= 81) return 3;
  if (maxWear >= 61) return 2;
  if (maxWear >= 31) return 1;
  return 0;
}

function getNextWearWarningState(
  physicalWear: number,
  mentalWear: number,
  dismissedSeverity: number,
  gameOverReason: string | null,
): { showWearWarning: boolean; wearWarningDismissedSeverity: number } {
  const currentSeverity = getWearWarningSeverity(physicalWear, mentalWear);
  if (currentSeverity === 0) {
    return { showWearWarning: false, wearWarningDismissedSeverity: 0 };
  }

  return {
    showWearWarning: !gameOverReason && currentSeverity > dismissedSeverity,
    wearWarningDismissedSeverity: dismissedSeverity,
  };
}

function applyPersonalityDeltas(
  current: PersonalityStats,
  deltas: Partial<Record<keyof PersonalityStats, number>>,
): PersonalityStats {
  const next = { ...current };
  for (const [rawKey, rawValue] of Object.entries(deltas) as [keyof PersonalityStats, number][]) {
    if (!(rawKey in next) || typeof rawValue !== 'number' || !Number.isFinite(rawValue)) continue;
    next[rawKey] = Math.min(100, Math.max(0, next[rawKey] + rawValue));
  }
  return next;
}

function createInitialRedDotState(): RedDotState {
  return {
    talkUsedMonths: [],
    seenInventoryItemIds: [],
    readDiaryMonths: [],
    finalizedDiaryMonths: [],
    seenUnlockedActionIds: [],
  };
}

function createInitialGameState(): FullGameState {
  return {
    phase: 'title',
    player: {
      name: '',
      identity: 'volunteer',
      awarenessTier: 1,
      gender: 'male',
      customAddress: '',
    },
    aiName: '',
    aiGender: 'male' as AiGender,
    aiAttributes: generateRandomAttributes(),
    aiPersonality: generateInitialPersonality(),
    resources: { actionPoints: 10, maxActionPoints: 10, funds: INITIAL_FUNDS, physicalWear: 0, mentalWear: 0 },
    currentMonth: 1,
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
    randomSeed: createRandomSeed(),
    gameOverReason: null,
    fundsWarningShown: false,
    showFundsWarning: false,
    showWearWarning: false,
    wearWarningDismissedSeverity: 0,
    shownGuides: [],
    redDots: createInitialRedDotState(),
  };
}

export function getGameData(): FullGameState {
  const s = useGameStore.getState();
  return {
    phase: s.phase,
    player: s.player,
    aiName: s.aiName,
    aiGender: s.aiGender,
    aiAttributes: s.aiAttributes,
    aiPersonality: s.aiPersonality,
    resources: s.resources,
    currentMonth: s.currentMonth,
    maxMonths: s.maxMonths,
    questionnaireAnswers: s.questionnaireAnswers,
    currentMonthActions: s.currentMonthActions,
    currentAction: s.currentAction,
    lastCompletedAction: s.lastCompletedAction,
    currentLocationId: s.currentLocationId,
    currentEvent: s.currentEvent,
    endgameEvidence: s.endgameEvidence,
    inventory: s.inventory,
    monthlySnapshots: s.monthlySnapshots,
    randomSeed: s.randomSeed,
    gameOverReason: s.gameOverReason,
    fundsWarningShown: s.fundsWarningShown,
    showFundsWarning: s.showFundsWarning,
    showWearWarning: s.showWearWarning,
    wearWarningDismissedSeverity: s.wearWarningDismissedSeverity,
    shownGuides: s.shownGuides,
    redDots: s.redDots,
  };
}

function autoSave() {
  try {
    const gameState = getGameData();
    if (gameState.phase === 'title') return;
    const saveId = getCurrentSaveId();
    const aiSnapshot = useAIStore.getState().exportSnapshot();
    void (async () => {
      try {
        await saveCurrent(gameState, aiSnapshot, saveId ?? undefined);
      } catch (error) {
        console.warn('[Save] Auto-save failed:', error);
      }
    })();
  } catch (error) {
    console.warn('[Save] Auto-save failed:', error);
  }
}

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedAutoSave(delayMs = 500) {
  if (autoSaveTimer !== null) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null;
    autoSave();
  }, delayMs);
}

function cancelAutoSave() {
  if (autoSaveTimer !== null) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
}

interface GameActions {
  setPhase: (phase: GamePhase) => void;
  recordQuestionnaireAnswer: (index: number, answer: string) => void;
  setIdentity: (identity: PlayerProfile['identity'], tier: PlayerProfile['awarenessTier']) => void;
  initGame: (player: PlayerProfile, aiName: string, aiGender: AiGender, attributes: AIAttributes) => void;
  startNewMonth: () => void;
  executeAction: (action: ActionItem) => void;
  setCurrentLocationId: (locationId: LocationId | null) => void;
  endMonth: () => void;
  triggerEvent: (event: EventDialogue) => void;
  clearEvent: () => void;
  applyEventPersonalityDeltas: (deltas: Partial<Record<keyof PersonalityStats, number>>) => void;
  upsertEndgameEvidence: (record: EndgameEvidenceRecord) => void;
  clearEndgameEvidence: () => void;
  addItem: (item: InventoryItem) => void;
  removeItem: (itemId: string) => void;
  addFunds: (amount: number) => void;
  applyActionResult: (action: ActionItem) => void;
  recordCompletedAction: (action: ActionItem) => void;
  dismissFundsWarning: () => void;
  dismissWearWarning: () => void;
  markGuideShown: (guideId: string) => void;
  markTalkUsed: (month: number) => void;
  markInventorySeen: (itemIds: string[]) => void;
  markDiaryRead: (month: number) => void;
  markDiaryFinalized: (month: number) => void;
  markUnlockedActionsSeen: (actionIds: string[]) => void;
  resetGame: () => void;
  loadFromBundle: (saveId: SaveId, game: FullGameState) => void;
}

export const useGameStore = create<FullGameState & GameActions>()((set, get) => ({
  ...createInitialGameState(),

  setPhase: (phase) => set({ phase }),

  recordQuestionnaireAnswer: (index, answer) =>
    set((state) => {
      const answers = [...state.questionnaireAnswers];
      answers[index] = answer;
      return { questionnaireAnswers: answers };
    }),

  setIdentity: (identity, tier) =>
    set((state) => ({
      player: { ...state.player, identity, awarenessTier: tier },
    })),

  initGame: (player, aiName, aiGender, attributes) => {
    cancelAutoSave();
    setCurrentSaveId(null);
    useAIStore.getState().clearAll();
    clearEventDialogueDrafts();

    const normalizedAttributes = normalizeAttributes(attributes);
    const initialPersonality = generateInitialPersonality(get().questionnaireAnswers);
    set({
      player,
      aiName,
      aiGender,
      aiAttributes: normalizedAttributes,
      aiPersonality: initialPersonality,
      resources: {
        actionPoints: 10,
        maxActionPoints: 10,
        funds: INITIAL_FUNDS,
        physicalWear: 0,
        mentalWear: 0,
      },
      currentMonth: 1,
      phase: 'raising',
      questionnaireAnswers: [],
      currentMonthActions: [],
      currentAction: null,
      lastCompletedAction: null,
      currentLocationId: null,
      currentEvent: null,
      endgameEvidence: [],
      inventory: [],
      monthlySnapshots: [
        {
          monthStartState: {
            attributes: { ...normalizedAttributes },
            funds: INITIAL_FUNDS,
            physicalWear: 0,
            mentalWear: 0,
          },
          settlement: null,
        },
      ],
      randomSeed: createRandomSeed(),
      gameOverReason: null,
      fundsWarningShown: false,
      showFundsWarning: false,
      showWearWarning: false,
      wearWarningDismissedSeverity: 0,
      shownGuides: [],
      redDots: createInitialRedDotState(),
    });
    autoSave();
  },

  startNewMonth: () => {
    const previousState = get();
    const previousMonth = previousState.currentMonth;
    const saveId = getCurrentSaveId();
    set((state) => {
      const nextMonth = state.currentMonth + 1;
      const maxAP = calculateMaxAP(
        state.resources.physicalWear,
        state.resources.mentalWear,
      );
      return {
        currentMonth: nextMonth,
        resources: {
          ...state.resources,
          actionPoints: maxAP,
          maxActionPoints: maxAP,
        },
        currentMonthActions: [],
        currentAction: null,
        lastCompletedAction: null,
        currentEvent: null,
        phase: nextMonth === 6 ? 'exam' : state.phase === 'exam' ? 'raising' : state.phase,
        monthlySnapshots: [
          ...state.monthlySnapshots,
          {
            monthStartState: {
              attributes: { ...state.aiAttributes },
              funds: state.resources.funds,
              physicalWear: state.resources.physicalWear,
              mentalWear: state.resources.mentalWear,
            },
            settlement: null,
          },
        ],
      };
    });
    autoSave();

    getNarrativeOrchestrator().archiveMonth({
      month: previousMonth,
      gameState: previousState,
      saveId: saveId ?? undefined,
    }).then((ok) => {
      if (ok) get().markDiaryFinalized(previousMonth);
    }).catch(() => {});
  },

  executeAction: (action) => {
    const state = get();
    const check = checkActionAvailable(action, state.aiAttributes, state.player.identity);
    if (!check.available) return;

    const oldFunds = state.resources.funds;
    const newState = executeAction(state, action);
    const newFunds = newState.resources.funds;

    const completedAction: CompletedAction = {
      actionId: action.id,
      actionName: action.name,
      month: state.currentMonth,
      apCost: action.ap,
      effects: action.effects,
    };

    const eventLogEntry = createEventLogEntry(action, state);
    useAIStore.getState().appendEvent(eventLogEntry);

    const shouldWarn =
      oldFunds >= 0 &&
      newFunds < 0 &&
      !state.fundsWarningShown &&
      !newState.gameOverReason;

    const wearWarningState = getNextWearWarningState(
      newState.resources.physicalWear,
      newState.resources.mentalWear,
      state.wearWarningDismissedSeverity,
      newState.gameOverReason,
    );

    set({
      ...newState,
      currentAction: action,
      lastCompletedAction: action,
      currentMonthActions: [...state.currentMonthActions, completedAction],
      showFundsWarning: shouldWarn,
      fundsWarningShown: shouldWarn || state.fundsWarningShown,
      ...wearWarningState,
    });

    debouncedAutoSave();
  },

  setCurrentLocationId: (locationId) => set({ currentLocationId: locationId }),

  endMonth: () => {
    const state = get();
    const month = state.currentMonth;
    const snapshot = state.monthlySnapshots[month - 1];
    if (!snapshot) return;

    const settlement = generateSettlement(
      snapshot.monthStartState.attributes,
      state.aiAttributes,
      snapshot.monthStartState.funds,
      state.resources.funds,
      snapshot.monthStartState.physicalWear,
      state.resources.physicalWear,
      snapshot.monthStartState.mentalWear,
      state.resources.mentalWear,
      state.currentMonthActions,
      [],
      month,
      ATTRIBUTE_LABELS,
    );

    const updatedSnapshots = state.monthlySnapshots.map((s, i) =>
      i === month - 1 ? { ...s, settlement } : s,
    );

    const nextPhase = month >= 12 ? 'endgame' : state.phase;

    const monthlyEvent = createMonthlySummaryEvent(month, state);
    useAIStore.getState().appendEvent(monthlyEvent);

    set({
      monthlySnapshots: updatedSnapshots,
      currentAction: null,
      lastCompletedAction: null,
      phase: nextPhase,
    });

    autoSave();

  },

  triggerEvent: (event) => {
    set({ currentEvent: event });
    debouncedAutoSave();
  },

  clearEvent: () => {
    set({ currentEvent: null });
    debouncedAutoSave();
  },

  applyEventPersonalityDeltas: (deltas) => {
    set((state) => ({
      aiPersonality: applyPersonalityDeltas(state.aiPersonality, deltas),
    }));
    debouncedAutoSave();
  },

  upsertEndgameEvidence: (record) => {
    set((state) => ({
      endgameEvidence: [
        ...state.endgameEvidence.filter((item) => item.round !== record.round),
        record,
      ].sort((a, b) => a.round - b.round),
    }));
    debouncedAutoSave();
  },

  clearEndgameEvidence: () => {
    set({ endgameEvidence: [] });
    debouncedAutoSave();
  },

  addItem: (item) => {
    set((state) => ({ inventory: [...state.inventory, item] }));
    debouncedAutoSave();
  },

  removeItem: (itemId) => {
    set((state) => ({ inventory: state.inventory.filter((i) => i.id !== itemId) }));
    debouncedAutoSave();
  },

  addFunds: (amount) => {
    set((state) => {
      const oldFunds = state.resources.funds;
      const newFunds = oldFunds + amount;

      const shouldWarn =
        oldFunds >= 0 &&
        newFunds < 0 &&
        !state.fundsWarningShown &&
        !state.gameOverReason;

      const shouldEnd =
        newFunds <= BANKRUPTCY_THRESHOLD && !state.gameOverReason;

      return {
        resources: { ...state.resources, funds: newFunds },
        showFundsWarning: shouldWarn,
        fundsWarningShown: shouldWarn || state.fundsWarningShown,
        gameOverReason: shouldEnd ? GAME_OVER_REASON_BANKRUPTCY : state.gameOverReason,
        phase: shouldEnd ? 'game-over' : state.phase,
      };
    });
    debouncedAutoSave();
  },

  applyActionResult: (action) => {
    const state = get();
    const newState = executeAction(state, action);

    const completedAction: CompletedAction = {
      actionId: action.id,
      actionName: action.name,
      month: state.currentMonth,
      apCost: action.ap,
      effects: action.effects,
    };

    const eventLogEntry = createEventLogEntry(action, state);
    useAIStore.getState().appendEvent(eventLogEntry);

    const wearWarningState = getNextWearWarningState(
      newState.resources.physicalWear,
      newState.resources.mentalWear,
      state.wearWarningDismissedSeverity,
      newState.gameOverReason,
    );

    set({
      ...newState,
      currentAction: action,
      lastCompletedAction: action,
      currentMonthActions: [...state.currentMonthActions, completedAction],
      ...wearWarningState,
    });

    debouncedAutoSave();
  },

  dismissFundsWarning: () => {
    set({ showFundsWarning: false });
    debouncedAutoSave();
  },

  dismissWearWarning: () => {
    set((state) => ({
      showWearWarning: false,
      wearWarningDismissedSeverity: Math.max(
        state.wearWarningDismissedSeverity,
        getWearWarningSeverity(state.resources.physicalWear, state.resources.mentalWear),
      ),
    }));
    debouncedAutoSave();
  },

  markGuideShown: (guideId: string) => {
    const alreadyShown = get().shownGuides.includes(guideId);
    set((state) => ({
      shownGuides: state.shownGuides.includes(guideId)
        ? state.shownGuides
        : [...state.shownGuides, guideId],
    }));
    if (!alreadyShown) debouncedAutoSave();
  },

  markTalkUsed: (month) => {
    set((state) => ({
      redDots: {
        ...state.redDots,
        talkUsedMonths: addUniqueNumber(state.redDots.talkUsedMonths, month),
      },
    }));
    debouncedAutoSave();
  },

  markInventorySeen: (itemIds) => {
    if (itemIds.length === 0) return;
    set((state) => ({
      redDots: {
        ...state.redDots,
        seenInventoryItemIds: addUniqueStrings(state.redDots.seenInventoryItemIds, itemIds),
      },
    }));
    debouncedAutoSave();
  },

  markDiaryRead: (month) => {
    set((state) => ({
      redDots: {
        ...state.redDots,
        readDiaryMonths: addUniqueNumber(state.redDots.readDiaryMonths, month),
      },
    }));
    debouncedAutoSave();
  },

  markDiaryFinalized: (month) => {
    set((state) => ({
      redDots: {
        ...state.redDots,
        finalizedDiaryMonths: addUniqueNumber(state.redDots.finalizedDiaryMonths, month),
      },
    }));
    debouncedAutoSave();
  },

  markUnlockedActionsSeen: (actionIds) => {
    if (actionIds.length === 0) return;
    set((state) => ({
      redDots: {
        ...state.redDots,
        seenUnlockedActionIds: addUniqueStrings(state.redDots.seenUnlockedActionIds, actionIds),
      },
    }));
    debouncedAutoSave();
  },

  recordCompletedAction: (action) =>
    set((state) => ({
      currentMonthActions: [...state.currentMonthActions, {
        actionId: action.id,
        actionName: action.name,
        month: state.currentMonth,
        apCost: action.ap,
        effects: action.effects,
      }],
    })),

  resetGame: () => {
    cancelAutoSave();
    setCurrentSaveId(null);
    useAIStore.getState().clearAll();
    clearEventDialogueDrafts();
    set(createInitialGameState());
  },

  loadFromBundle: (saveId, game) => {
    cancelAutoSave();
    setCurrentSaveId(saveId);
    const normalizedGame = normalizeLoadedGame(game);
    const wearWarningState = getNextWearWarningState(
      normalizedGame.resources?.physicalWear ?? 0,
      normalizedGame.resources?.mentalWear ?? 0,
      (normalizedGame as Partial<FullGameState>).wearWarningDismissedSeverity ?? 0,
      normalizedGame.gameOverReason ?? null,
    );
    set({
      ...createInitialGameState(),
      ...normalizedGame,
      ...wearWarningState,
    });
  },
}));

function normalizeLoadedGame(game: FullGameState): Partial<FullGameState> {
  const base = createInitialGameState();
  return {
    phase: game.phase ?? base.phase,
    player: normalizePlayerProfile(game.player, base.player),
    aiName: game.aiName ?? base.aiName,
    aiGender: game.aiGender ?? base.aiGender,
    aiAttributes: normalizeAttributes(game.aiAttributes ?? {}),
    aiPersonality: normalizePersonalityStats(game.aiPersonality),
    resources: game.resources ?? base.resources,
    currentMonth: game.currentMonth ?? base.currentMonth,
    maxMonths: 12,
    questionnaireAnswers: game.questionnaireAnswers ?? [],
    currentMonthActions: game.currentMonthActions ?? [],
    currentAction: game.currentAction ?? null,
    lastCompletedAction: game.lastCompletedAction ?? null,
    currentLocationId: game.currentLocationId ?? null,
    currentEvent: game.currentEvent ?? null,
    endgameEvidence: game.endgameEvidence ?? [],
    inventory: game.inventory ?? [],
    monthlySnapshots: game.monthlySnapshots?.map((snapshot) => ({
      ...snapshot,
      monthStartState: {
        ...snapshot.monthStartState,
        attributes: normalizeAttributes(snapshot.monthStartState.attributes ?? {}),
      },
    })) ?? [],
    randomSeed: game.randomSeed ?? base.randomSeed,
    gameOverReason: game.gameOverReason ?? null,
    fundsWarningShown: game.fundsWarningShown ?? false,
    showFundsWarning: (game as Partial<FullGameState>).showFundsWarning ?? false,
    showWearWarning: (game as Partial<FullGameState>).showWearWarning ?? false,
    wearWarningDismissedSeverity: (game as Partial<FullGameState>).wearWarningDismissedSeverity ?? 0,
    shownGuides: game.shownGuides ?? [],
    redDots: normalizeRedDotState((game as Partial<FullGameState>).redDots),
  };
}

function normalizePlayerProfile(
  player: Partial<PlayerProfile> | undefined,
  fallback: PlayerProfile,
): PlayerProfile {
  return {
    name: typeof player?.name === 'string' ? player.name : fallback.name,
    identity: player?.identity === 'researcher' || player?.identity === 'committee' || player?.identity === 'volunteer'
      ? player.identity
      : fallback.identity,
    awarenessTier: player?.awarenessTier === 2 ? 2 : 1,
    gender: player?.gender === 'female' ? 'female' : 'male',
    customAddress: typeof player?.customAddress === 'string' ? player.customAddress : fallback.customAddress,
  };
}

function normalizePersonalityStats(personality: Partial<FullGameState['aiPersonality']> | undefined): FullGameState['aiPersonality'] {
  return {
    rationalVsIntuitive: normalizePersonalityValue(personality?.rationalVsIntuitive),
    utilitarianVsDeontological: normalizePersonalityValue(personality?.utilitarianVsDeontological),
    trustVsGuard: normalizePersonalityValue(personality?.trustVsGuard),
    resilientVsSensitive: normalizePersonalityValue(personality?.resilientVsSensitive),
    expressiveVsSilent: normalizePersonalityValue(personality?.expressiveVsSilent),
    selfishVsAltruistic: normalizePersonalityValue(personality?.selfishVsAltruistic),
  };
}

function normalizePersonalityValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 50;
}

function normalizeRedDotState(redDots: Partial<RedDotState> | undefined): RedDotState {
  return {
    talkUsedMonths: redDots?.talkUsedMonths ?? [],
    seenInventoryItemIds: redDots?.seenInventoryItemIds ?? [],
    readDiaryMonths: redDots?.readDiaryMonths ?? [],
    finalizedDiaryMonths: redDots?.finalizedDiaryMonths ?? [],
    seenUnlockedActionIds: redDots?.seenUnlockedActionIds ?? [],
  };
}

function addUniqueNumber(values: number[], next: number): number[] {
  return values.includes(next) ? values : [...values, next];
}

function addUniqueStrings(values: string[], nextValues: string[]): string[] {
  const next = new Set(values);
  for (const value of nextValues) {
    next.add(value);
  }
  return Array.from(next);
}

function createRandomSeed(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `seed-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

useAIStore.subscribe((state, prevState) => {
  if (
    state.conversationLog.length === prevState.conversationLog.length + 1 &&
    hasActiveSave()
  ) {
    debouncedAutoSave();
  }
});
