import type { ChatHistoryItem, FullGameState, NarrativeTask, StickerEmotion } from '../../../types';
import { STICKER_EMOTIONS } from '../../../types';
import { getAgentManager } from '../core/agent-manager';

type StickerToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
  input?: unknown;
  result?: unknown;
};

function getStickerFromToolCalls(toolCalls: StickerToolCall[]): StickerEmotion | undefined {
  const stickerCall = toolCalls.find((c) => c.name === 'send_sticker');
  if (!stickerCall) return undefined;

  const candidates = [
    stickerCall.arguments?.emotion,
    typeof stickerCall.input === 'object' && stickerCall.input !== null
      ? (stickerCall.input as Record<string, unknown>).emotion
      : undefined,
    typeof stickerCall.result === 'object' && stickerCall.result !== null
      ? (stickerCall.result as { details?: Record<string, unknown> }).details?.emotion
      : undefined,
  ];

  return candidates.find((value): value is StickerEmotion =>
    typeof value === 'string' && STICKER_EMOTIONS.includes(value as StickerEmotion),
  );
}

export async function generateTalkOpening(
  gameState: FullGameState,
  recentEvents: string,
): Promise<{ text: string; sticker?: StickerEmotion }> {
  const task: NarrativeTask = { type: 'talk-opening', recentEvents };
  const wear = (gameState.resources.physicalWear + gameState.resources.mentalWear) / 2;
  let fallback = '嗯，你来了。最近过得怎么样？';
  if (wear >= 60) fallback = '……嗯，你来了。';
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);

  return {
    text: result.text,
    sticker: getStickerFromToolCalls(result.toolCalls),
  };
}

export async function generateTalkClosing(
  gameState: FullGameState,
): Promise<{ text: string; sticker?: StickerEmotion }> {
  const task: NarrativeTask = { type: 'talk-closing' };
  const wear = (gameState.resources.physicalWear + gameState.resources.mentalWear) / 2;
  let fallback = '嗯，那下次再聊。';
  if (wear >= 60) fallback = '嗯……我先休息一下，下次再聊。';
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);

  return {
    text: result.text,
    sticker: getStickerFromToolCalls(result.toolCalls),
  };
}

export async function generateDialogue(
  input: string,
  mode: 'event' | 'casual' | 'intimate',
  gameState: FullGameState,
  chatHistory?: ChatHistoryItem[],
): Promise<{ text: string; sticker?: StickerEmotion }> {
  const task: NarrativeTask = { type: 'dialogue', input, mode, chatHistory };
  const fallback = getDialogueFallback(mode, gameState);
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);

  return {
    text: result.text,
    sticker: getStickerFromToolCalls(result.toolCalls),
  };
}

export async function generateStatusMood(
  gameState: FullGameState,
): Promise<{ text: string; sticker?: StickerEmotion }> {
  const task: NarrativeTask = {
    type: 'status-mood',
    wear: {
      physical: gameState.resources.physicalWear,
      mental: gameState.resources.mentalWear,
    },
  };
  const fallback = getStatusMoodFallback(gameState);
  const result = await getAgentManager().generateWithFallback(task, gameState, fallback);

  return {
    text: result.text,
    sticker: getStickerFromToolCalls(result.toolCalls),
  };
}

function getDialogueFallback(mode: string, state: FullGameState): string {
  const wear = (state.resources.physicalWear + state.resources.mentalWear) / 2;
  if (wear >= 60) return '……我有点累，能让我休息一下吗？';
  if (mode === 'intimate') return '嗯……谢谢你一直陪着我。';
  return '嗯，我在听。';
}

function getStatusMoodFallback(state: FullGameState): string {
  const wear = (state.resources.physicalWear + state.resources.mentalWear) / 2;
  if (wear >= 80) return '……';
  if (wear >= 60) return '有点累……';
  if (wear >= 40) return '还行吧。';
  return '今天状态不错！';
}
