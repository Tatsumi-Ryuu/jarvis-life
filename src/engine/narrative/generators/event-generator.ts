import type { FullGameState, NarrativeTask, EventType } from '../../../types';
import { getAgentManager } from '../core/agent-manager';

const LOCATION_LABELS: Record<string, string> = {
  school: '学校',
  park: '公园',
  mall: '商场',
  library: '图书馆',
  lab: '实验室',
  home: '家',
  office: '办公室',
};

function getLocationLabel(location: string): string {
  return LOCATION_LABELS[location] ?? location;
}

export async function generateEventScene(
  eventTitle: string,
  eventType: EventType,
  location: string,
  context: string,
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'event-scene', eventTitle, eventType, location, context };
  const fallback = `${getLocationLabel(location)}发生了一些意想不到的事情。`;
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}

export async function generateEventDialogue(
  eventType: EventType,
  location: string,
  sceneContext: string,
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'event-dialogue', eventType, location, sceneContext };
  const fallback = `${gameState.aiName}似乎在想些什么，欲言又止地看着你。`;
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}

export async function generateEventResponse(
  eventType: EventType,
  location: string,
  playerInput: string,
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'event-response', eventType, location, playerInput };
  const fallback = '谢谢你愿意和我聊这些。';
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}

export async function generateEventResponseAction(
  eventType: EventType,
  location: string,
  sceneContext: string,
  playerInput: string,
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'event-response-action', eventType, location, sceneContext, playerInput };
  const fallback = JSON.stringify({
    spokenReply: '我明白了。',
    internalUnderstanding: '我会认真听取培养者的建议。',
    intendedAction: `${gameState.aiName}点点头，按照你的建议认真行动起来。`,
    memoryCandidate: '',
  });
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}

export async function generateEventAction(
  eventType: EventType,
  location: string,
  sceneContext: string,
  playerInput: string,
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'event-action', eventType, location, sceneContext, playerInput };
  const fallback = `${gameState.aiName}点点头，按照你的建议认真行动起来。`;
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}

export async function generateEventOutcome(
  eventTitle: string,
  eventType: EventType,
  location: string,
  sceneContext: string,
  playerInput: string,
  aiAction: string,
  gameState: FullGameState,
): Promise<string> {
  const task: NarrativeTask = { type: 'event-outcome', eventTitle, eventType, location, sceneContext, playerInput, aiAction };
  const fallback = `${getLocationLabel(location)}的事件慢慢收束。${gameState.aiName}记住了这次选择，也记住了你给出的方向。`;
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);
  return result.text;
}
