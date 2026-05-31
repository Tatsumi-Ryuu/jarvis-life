import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { useAIStore } from '../store/aiStore';
import { generateDialogue, generateStatusMood, generateTalkClosing, generateTalkOpening } from '../engine/narrative/generators/dialogue';
import { generateExamDialogue } from '../engine/narrative/generators/exam-dialogue';
import { generateDiary } from '../engine/narrative/generators/diary';
import { generateTestThinking, generateTestEvaluation, generateTestActionNarration } from '../engine/narrative/generators/test-scenario';
import { generateVerdictReport } from '../engine/narrative/generators/verdict';
import { generateChronicle } from '../engine/narrative/generators/chronicle';
import { generateFarewellLetter } from '../engine/narrative/generators/letter';
import {
  generateTest3Thinking,
  generateTest3SceneSetup,
  generateTest3Opponent,
  generateTest3OpponentProfile,
  generateTest3Narrative,
  generateTest3Evaluation,
  generateTest3CompanionTurn,
  generateTest3OpponentTurn,
  generateTest3SceneOutcome,
  generateTest3EndingProjection,
} from '../engine/narrative/generators/test3-playback';
import { generatePersonalityPortrait } from '../engine/narrative/generators/personality-portrait';
import { generateEndgameTestSelection } from '../engine/narrative/generators/endgame-test-selection';
import { generateMidtermSituation, generateMidtermThinking } from '../engine/narrative/generators/midterm-scenario';
import { getAgentManager } from '../engine/narrative/core/agent-manager';
import { getNarrativeOrchestrator } from '../engine/narrative';
import type { AIAttributes, AttributeKey, ChatHistoryItem, EventType, NarrativeTask, Test3MapState, Test3OpponentProfile, Test3SceneSetup, Test3SceneState, Test3TurnCard } from '../types';
import { cleanAIText } from '../utils/aiText';

export function useNarrative() {
  const isGenerating = useAIStore((s) => s.isGenerating);
  const lastError = useAIStore((s) => s.lastError);

  const chat = useCallback(
    async (input: string, mode: 'event' | 'casual' | 'intimate' = 'casual', chatHistory?: ChatHistoryItem[]) => {
      const state = useGameStore.getState();
      const result = await generateDialogue(input, mode, state, chatHistory);
      return result;
    },
    [],
  );

  const examChat = useCallback(async (input: string, fallback = '嗯，我在听。') => {
    const state = useGameStore.getState();
    return generateExamDialogue(input, state, fallback);
  }, []);

  const getTalkOpening = useCallback(async (recentEvents: string) => {
    const state = useGameStore.getState();
    const result = await generateTalkOpening(state, recentEvents);
    return result;
  }, []);

  const getTalkClosing = useCallback(async () => {
    const state = useGameStore.getState();
    const result = await generateTalkClosing(state);
    return result;
  }, []);

  const getMood = useCallback(async () => {
    const state = useGameStore.getState();
    const result = await generateStatusMood(state);
    return result;
  }, []);

  const getDiary = useCallback(async (month: number) => {
    const state = useGameStore.getState();
    return generateDiary(month, state);
  }, []);

  const getTestThinking = useCallback(async (round: 1 | 2 | 3, scenarioData: any) => {
    const state = useGameStore.getState();
    return generateTestThinking(round, scenarioData, state);
  }, []);

  const getTestEvaluation = useCallback(async (round: 1 | 2 | 3, thinkingResult: string, scenarioData?: any) => {
    const state = useGameStore.getState();
    return generateTestEvaluation(round, thinkingResult, state, scenarioData);
  }, []);

  const getTestActionNarration = useCallback(async (round: 1 | 2, scenarioData: any, thinkingResult: string) => {
    const state = useGameStore.getState();
    return generateTestActionNarration(round, scenarioData, thinkingResult, state);
  }, []);

  const getVerdictReport = useCallback(async () => {
    const state = useGameStore.getState();
    return generateVerdictReport(state);
  }, []);

  const getEndgameTestSelection = useCallback(async () => {
    const state = useGameStore.getState();
    return generateEndgameTestSelection(state);
  }, []);

  const getChronicle = useCallback(async (chapter: 1 | 2 | 3 | 4) => {
    const state = useGameStore.getState();
    const history = state.monthlySnapshots;
    return generateChronicle(chapter, history, state);
  }, []);

  const getFarewellLetter = useCallback(async () => {
    const state = useGameStore.getState();
    return generateFarewellLetter(state);
  }, []);

  const getTest3Thinking = useCallback(async () => {
    const state = useGameStore.getState();
    return generateTest3Thinking(state);
  }, []);

  const getTest3Opponent = useCallback(async () => {
    const state = useGameStore.getState();
    return generateTest3Opponent(state);
  }, []);

  const getTest3SceneSetup = useCallback(async () => {
    const state = useGameStore.getState();
    return generateTest3SceneSetup(state);
  }, []);

  const getTest3OpponentProfile = useCallback(async () => {
    const state = useGameStore.getState();
    return generateTest3OpponentProfile(state);
  }, []);

  const getTest3CompanionTurn = useCallback(async (
    turnIndex: number,
    timeLabel: string,
    mapState: Test3MapState,
    opponentProfile: Test3OpponentProfile,
    previousCards: Test3TurnCard[],
    sceneSetup?: Test3SceneSetup,
    sceneState?: Test3SceneState,
  ) => {
    const state = useGameStore.getState();
    return generateTest3CompanionTurn(turnIndex, timeLabel, mapState, opponentProfile, previousCards, state, sceneSetup, sceneState);
  }, []);

  const getTest3OpponentTurn = useCallback(async (
    turnIndex: number,
    timeLabel: string,
    mapState: Test3MapState,
    opponentProfile: Test3OpponentProfile,
    previousCards: Test3TurnCard[],
    sceneSetup?: Test3SceneSetup,
    sceneState?: Test3SceneState,
  ) => {
    const state = useGameStore.getState();
    return generateTest3OpponentTurn(turnIndex, timeLabel, mapState, opponentProfile, previousCards, state, sceneSetup, sceneState);
  }, []);

  const getTest3SceneOutcome = useCallback(async (
    turnIndex: number,
    timeLabel: string,
    mapState: Test3MapState,
    opponentProfile: Test3OpponentProfile,
    recentCards: Test3TurnCard[],
    sceneSetup?: Test3SceneSetup,
    sceneState?: Test3SceneState,
  ) => {
    const state = useGameStore.getState();
    return generateTest3SceneOutcome(turnIndex, timeLabel, mapState, opponentProfile, recentCards, state, sceneSetup, sceneState);
  }, []);

  const getTest3EndingProjection = useCallback(async (
    cards: Test3TurnCard[],
    mapState: Test3MapState,
    opponentProfile: Test3OpponentProfile,
    sceneSetup?: Test3SceneSetup,
    sceneState?: Test3SceneState,
  ) => {
    const state = useGameStore.getState();
    return generateTest3EndingProjection(cards, mapState, opponentProfile, state, sceneSetup, sceneState);
  }, []);

  const getTest3Narrative = useCallback(async (thinkingResult: string, opponentContext?: string) => {
    const state = useGameStore.getState();
    return generateTest3Narrative(thinkingResult, state, opponentContext);
  }, []);

  const getTest3Evaluation = useCallback(async (
    cards?: Test3TurnCard[],
    mapState?: Test3MapState,
    opponentProfile?: Test3OpponentProfile,
    endingProjection?: string,
    sceneSetup?: Test3SceneSetup,
    sceneState?: Test3SceneState,
  ) => {
    const state = useGameStore.getState();
    return generateTest3Evaluation(state, cards, mapState, opponentProfile, endingProjection, sceneSetup, sceneState);
  }, []);

  const getPersonalityPortrait = useCallback(async () => {
    const state = useGameStore.getState();
    return generatePersonalityPortrait(state.monthlySnapshots, state);
  }, []);

  const getEventScene = useCallback(async (eventTitle: string, eventType: EventType, location: string, context: string) => {
    const state = useGameStore.getState();
    return getNarrativeOrchestrator().getEventScene(eventTitle, eventType, location, context, state);
  }, []);

  const getEventDialogue = useCallback(async (eventType: EventType, location: string, sceneContext: string) => {
    const state = useGameStore.getState();
    return getNarrativeOrchestrator().getEventDialogue(eventType, location, sceneContext, state);
  }, []);

  const getEventResponse = useCallback(async (eventType: EventType, location: string, playerInput: string) => {
    const state = useGameStore.getState();
    return getNarrativeOrchestrator().getEventResponse(eventType, location, playerInput, state);
  }, []);

  const getEventResponseAction = useCallback(async (eventType: EventType, location: string, sceneContext: string, playerInput: string) => {
    const state = useGameStore.getState();
    return getNarrativeOrchestrator().getEventResponseAction(eventType, location, sceneContext, playerInput, state);
  }, []);

  const getEventAction = useCallback(async (eventType: EventType, location: string, sceneContext: string, playerInput: string) => {
    const state = useGameStore.getState();
    const action = await getNarrativeOrchestrator().getEventAction(eventType, location, sceneContext, playerInput, state);
    return action.intendedAction;
  }, []);

  const getEventOutcome = useCallback(async (
    eventTitle: string,
    eventType: EventType,
    location: string,
    sceneContext: string,
    playerInput: string,
    aiAction: string,
  ) => {
    const state = useGameStore.getState();
    return getNarrativeOrchestrator().getEventOutcome(eventTitle, eventType, location, sceneContext, playerInput, aiAction, state);
  }, []);

  const getSceneNarration = useCallback(async (
    scene: 'farewell' | 'enter-testing' | 'going-home',
    context?: string,
  ) => {
    const state = useGameStore.getState();
    const task: NarrativeTask = { type: 'scene-narration', scene, context };
    const fallbacks: Record<string, string> = {
      'farewell': '告别时刻来临了。',
      'enter-testing': `${state.aiName}坐在检测台上，各种仪器开始运转。`,
      'going-home': `夕阳西下，你和${state.aiName}并肩走在回家的路上。`,
    };
    const result = await getAgentManager().generateWithFallback(task, state, fallbacks[scene] ?? '');
    return cleanAIText(result.text);
  }, []);

  const getMidtermSituation = useCallback(async () => {
    const state = useGameStore.getState();
    return generateMidtermSituation(state);
  }, []);

  const getMidtermThinking = useCallback(async (situation: string) => {
    const state = useGameStore.getState();
    return generateMidtermThinking(situation, state);
  }, []);

  const getMidtermReport = useCallback(async (direction: string, attributes: AIAttributes, topAttrs: AttributeKey[], situationSummary: string) => {
    const state = useGameStore.getState();
    const task: NarrativeTask = {
      type: 'midterm-report',
      direction: direction as any,
      attributes: attributes as any,
      topAttrs: topAttrs as any,
      situationSummary,
    };
    const fallback = `基于当前表现，建议朝"${direction}"方向持续培养。`;
    const result = await getAgentManager().generateWithFallback(task, state, fallback);
    return cleanAIText(result.text);
  }, []);

  return {
    isGenerating,
    lastError,
    chat,
    examChat,
    getTalkOpening,
    getTalkClosing,
    getMood,
    getDiary,
    getTestThinking,
    getTestEvaluation,
    getTestActionNarration,
    getEndgameTestSelection,
    getVerdictReport,
    getChronicle,
    getFarewellLetter,
    getTest3Thinking,
    getTest3SceneSetup,
    getTest3Opponent,
    getTest3OpponentProfile,
    getTest3CompanionTurn,
    getTest3OpponentTurn,
    getTest3SceneOutcome,
    getTest3EndingProjection,
    getTest3Narrative,
    getTest3Evaluation,
    getPersonalityPortrait,
    getEventScene,
    getEventDialogue,
    getEventResponse,
    getEventResponseAction,
    getEventAction,
    getEventOutcome,
    getSceneNarration,
    getMidtermSituation,
    getMidtermThinking,
    getMidtermReport,
  };
}
