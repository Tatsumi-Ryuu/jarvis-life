import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFindCatResultAction, FIND_CAT_ACTION_ID } from '../src/data/cat-trap-action';
import { mockLocations } from '../src/data/mock-locations';
import type { ActionItem } from '../src/types';
import { useGameStore } from '../src/store/gameStore';
import { useAIStore } from '../src/store/aiStore';
import { getNewUnlockedActionIdsForLocation } from '../src/store/redDotSelectors';
import { getCurrentSaveId, setCurrentSaveId } from '../src/services/save-service';
import { getNarrativeOrchestrator } from '../src/engine/narrative/core/narrative-orchestrator';
import type { AIAttributes, FullGameState, InventoryItem, PlayerProfile } from '../src/types';

const playerProfile: PlayerProfile = {
  name: '测试玩家',
  identity: 'volunteer',
  awarenessTier: 1,
  gender: 'male',
  customAddress: '阿明',
};

const openingAttributes: AIAttributes = {
  knowledge: 6,
  art: 15,
  fitness: 9,
  logic: 4,
  eloquence: 12,
  social: 14,
};

const mentalWearAction: ActionItem = {
  id: 'mental-wear-test',
  name: '压力测试',
  tier: 'primary',
  ap: 1,
  cost: 0,
  description: '进行一次压力测试。',
  effects: [{ type: 'mentalWear', value: 1 }],
  status: 'available',
  category: '测试',
};

describe('gameStore opening state', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useGameStore.getState().resetGame();
    useAIStore.getState().clearAll();
    setCurrentSaveId(null);
  });

  it('initGame keeps the attribute roll chosen at creation time', () => {
    useGameStore.getState().initGame(playerProfile, '小星', 'female', openingAttributes);

    const state = useGameStore.getState();

    expect(state.phase).toBe('raising');
    expect(state.aiAttributes).toEqual(openingAttributes);
    expect(state.monthlySnapshots[0]?.monthStartState.attributes).toEqual(openingAttributes);
    expect(state.player.customAddress).toBe('阿明');
  });

  it('initGame seeds hidden personality from questionnaire answers', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    useGameStore.getState().recordQuestionnaireAnswer(0, 'intuitive');
    useGameStore.getState().recordQuestionnaireAnswer(1, 'trust');
    useGameStore.getState().recordQuestionnaireAnswer(2, 'companion');
    useGameStore.getState().recordQuestionnaireAnswer(3, 'open');
    useGameStore.getState().recordQuestionnaireAnswer(4, 'responsible');

    useGameStore.getState().initGame(playerProfile, '小星', 'female', openingAttributes);

    const personality = useGameStore.getState().aiPersonality;
    expect(personality.rationalVsIntuitive).toBeGreaterThan(50);
    expect(personality.trustVsGuard).toBeLessThan(50);
    expect(personality.utilitarianVsDeontological).toBeGreaterThan(50);
    expect(personality.expressiveVsSilent).toBeLessThan(50);
    expect(personality.selfishVsAltruistic).toBeGreaterThan(50);

    vi.restoreAllMocks();
  });

  it('initGame starts a clean AI memory session', () => {
    setCurrentSaveId('save-old-session');
    useAIStore.getState().appendConversation({
      id: 'conv-old',
      saveId: 'save-old-session',
      month: 8,
      timestamp: Date.now(),
      role: 'player',
      content: '上一局的聊天',
      source: 'talk-modal',
    });

    useGameStore.getState().initGame(playerProfile, '新小星', 'female', openingAttributes);

    expect(getCurrentSaveId()).toBeNull();
    expect(useAIStore.getState().conversationLog).toHaveLength(0);
    expect(useAIStore.getState().eventLog).toHaveLength(0);
  });

  it('resetGame no longer falls back to the old fixed midpoint state', () => {
    const randomSpy = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.25)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.75)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.1);

    useGameStore.getState().resetGame();

    const state = useGameStore.getState();

    expect(state.phase).toBe('title');
    expect(state.aiAttributes).toEqual({
      knowledge: 5,
      art: 9,
      fitness: 13,
      logic: 17,
      eloquence: 19,
      social: 6,
    });
    expect(Object.values(state.aiAttributes)).not.toEqual([50, 50, 50, 50, 50, 50]);

    randomSpy.mockRestore();
  });

  it('applies the win reward for finding the cat', () => {
    useGameStore.getState().initGame(playerProfile, '小星', 'female', openingAttributes);
    useGameStore.setState((state) => ({
      resources: {
        ...state.resources,
        actionPoints: 5,
        physicalWear: 30,
        mentalWear: 40,
      },
    }));

    useGameStore.getState().applyActionResult(createFindCatResultAction(true));

    const state = useGameStore.getState();
    expect(state.resources.actionPoints).toBe(4);
    expect(state.resources.funds).toBe(3100);
    expect(state.resources.physicalWear).toBe(20);
    expect(state.resources.mentalWear).toBe(30);
    expect(state.lastCompletedAction?.id).toBe(FIND_CAT_ACTION_ID);
    expect(state.currentMonthActions.at(-1)?.effects).toEqual(createFindCatResultAction(true).effects);
  });

  it('applies the partial reward when the cat escapes', () => {
    useGameStore.getState().initGame(playerProfile, '小星', 'female', openingAttributes);
    useGameStore.setState((state) => ({
      resources: {
        ...state.resources,
        actionPoints: 5,
        physicalWear: 30,
        mentalWear: 40,
      },
    }));

    useGameStore.getState().applyActionResult(createFindCatResultAction(false));

    const state = useGameStore.getState();
    expect(state.resources.actionPoints).toBe(4);
    expect(state.resources.funds).toBe(3100);
    expect(state.resources.physicalWear).toBe(25);
    expect(state.resources.mentalWear).toBe(35);
    expect(state.lastCompletedAction?.id).toBe(FIND_CAT_ACTION_ID);
    expect(state.currentMonthActions.at(-1)?.effects).toEqual(createFindCatResultAction(false).effects);
  });

  it('opens the wear warning when mental wear reaches 31', () => {
    useGameStore.getState().initGame(playerProfile, '小星', 'female', openingAttributes);
    useGameStore.setState((state) => ({
      resources: {
        ...state.resources,
        actionPoints: 5,
        physicalWear: 0,
        mentalWear: 30,
      },
    }));

    useGameStore.getState().executeAction(mentalWearAction);

    expect(useGameStore.getState().resources.mentalWear).toBe(31);
    expect(useGameStore.getState().showWearWarning).toBe(true);
  });

  it('applies wear AP penalties at the next month start, not immediately', () => {
    useGameStore.getState().initGame(playerProfile, '小星', 'female', openingAttributes);
    useGameStore.setState((state) => ({
      resources: {
        ...state.resources,
        actionPoints: 5,
        maxActionPoints: 10,
        physicalWear: 0,
        mentalWear: 30,
      },
    }));

    useGameStore.getState().executeAction(mentalWearAction);

    expect(useGameStore.getState().resources.mentalWear).toBe(31);
    expect(useGameStore.getState().resources.actionPoints).toBe(4);
    expect(useGameStore.getState().resources.maxActionPoints).toBe(10);

    useGameStore.getState().startNewMonth();

    expect(useGameStore.getState().resources.actionPoints).toBe(9);
    expect(useGameStore.getState().resources.maxActionPoints).toBe(9);
  });

  it('applies company mental calibration as mental wear repair', () => {
    useGameStore.getState().initGame(playerProfile, '灏忔槦', 'female', openingAttributes);
    useGameStore.setState((state) => ({
      resources: {
        ...state.resources,
        actionPoints: 5,
        funds: 3000,
        physicalWear: 0,
        mentalWear: 50,
      },
    }));

    const company = mockLocations.find((location) => location.id === 'company');
    const action = company?.actions.find((item) => item.id === 'company_mental_calib');
    expect(action).toBeTruthy();

    useGameStore.getState().executeAction(action!);

    const state = useGameStore.getState();
    expect(state.resources.mentalWear).toBe(15);
    expect(state.resources.physicalWear).toBe(0);
    expect(state.resources.funds).toBe(2550);
    expect(state.lastCompletedAction?.id).toBe('company_mental_calib');
  });

  it('shows a restored save that is already over the first wear threshold', () => {
    useGameStore.getState().initGame(playerProfile, '小星', 'female', openingAttributes);
    const savedGame = {
      ...useGameStore.getState(),
      resources: {
        ...useGameStore.getState().resources,
        physicalWear: 0,
        mentalWear: 31,
      },
      showWearWarning: false,
      wearWarningDismissedSeverity: 0,
    };

    useGameStore.getState().loadFromBundle('save-wear-warning', savedGame);

    expect(useGameStore.getState().showWearWarning).toBe(true);
  });

  it('tracks monthly talk red dots', () => {
    useGameStore.getState().initGame(playerProfile, '小星', 'female', openingAttributes);

    expect(useGameStore.getState().redDots.talkUsedMonths).not.toContain(1);

    useGameStore.getState().markTalkUsed(1);
    expect(useGameStore.getState().redDots.talkUsedMonths).toContain(1);

    useGameStore.getState().startNewMonth();
    expect(useGameStore.getState().currentMonth).toBe(2);
    expect(useGameStore.getState().redDots.talkUsedMonths).not.toContain(2);
  });

  it('tracks unread inventory items until the backpack is seen', () => {
    useGameStore.getState().initGame(playerProfile, '小星', 'female', openingAttributes);
    const item: InventoryItem = {
      id: 'gift_test',
      name: '测试礼物',
      description: '用于测试红点',
      iconAssetId: 'icon_test',
      type: 'gift',
    };

    useGameStore.getState().addItem(item);

    expect(useGameStore.getState().inventory).toContainEqual(item);
    expect(useGameStore.getState().redDots.seenInventoryItemIds).not.toContain(item.id);

    useGameStore.getState().markInventorySeen([item.id]);
    expect(useGameStore.getState().redDots.seenInventoryItemIds).toContain(item.id);
  });

  it('tracks read diary months independently', () => {
    useGameStore.getState().initGame(playerProfile, '小星', 'female', openingAttributes);

    useGameStore.getState().markDiaryRead(1);

    expect(useGameStore.getState().redDots.readDiaryMonths).toContain(1);
    expect(useGameStore.getState().redDots.readDiaryMonths).not.toContain(2);
  });

  it('finalizes previous month diary when a new month starts', async () => {
    useGameStore.getState().initGame(playerProfile, '小星', 'female', openingAttributes);
    setCurrentSaveId('save-month-start-diary');
    const archiveSpy = vi
      .spyOn(getNarrativeOrchestrator(), 'archiveMonth')
      .mockResolvedValueOnce(true);

    useGameStore.getState().startNewMonth();
    await Promise.resolve();

    expect(archiveSpy).toHaveBeenCalledWith(expect.objectContaining({ month: 1 }));
    expect(useGameStore.getState().redDots.finalizedDiaryMonths).toContain(1);
    expect(useGameStore.getState().redDots.readDiaryMonths).not.toContain(1);
  });

  it('detects newly unlocked map actions and clears them after viewing', () => {
    useGameStore.getState().initGame(playerProfile, '小星', 'female', {
      ...openingAttributes,
      knowledge: 40,
    });
    useGameStore.setState((state) => ({
      resources: { ...state.resources, actionPoints: 10, funds: 5000 },
    }));

    const state = useGameStore.getState();
    const unlocked = getNewUnlockedActionIdsForLocation(
      'school',
      state.aiAttributes,
      state.resources,
      state.player.identity,
      state.redDots.seenUnlockedActionIds,
    );

    expect(unlocked).toContain('school_general_knowledge');

    useGameStore.getState().markUnlockedActionsSeen(unlocked);
    const nextState = useGameStore.getState();
    const afterSeen = getNewUnlockedActionIdsForLocation(
      'school',
      nextState.aiAttributes,
      nextState.resources,
      nextState.player.identity,
      nextState.redDots.seenUnlockedActionIds,
    );

    expect(afterSeen).not.toContain('school_general_knowledge');
  });

  it('normalizes old saves without red dot state', () => {
    useGameStore.getState().initGame(playerProfile, '小星', 'female', openingAttributes);
    const legacyGame = { ...useGameStore.getState() } as FullGameState & { redDots?: unknown };
    delete legacyGame.redDots;

    useGameStore.getState().loadFromBundle('save-red-dot-legacy', legacyGame as FullGameState);

    expect(useGameStore.getState().redDots).toEqual({
      talkUsedMonths: [],
      seenInventoryItemIds: [],
      readDiaryMonths: [],
      finalizedDiaryMonths: [],
      seenUnlockedActionIds: [],
    });
  });
});
