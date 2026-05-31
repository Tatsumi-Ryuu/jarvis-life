import type { ActionEffect, EventLogEntry } from '../types';
import { ATTRIBUTE_LABELS } from '../types';
import { useAIStore } from '../store/aiStore';
import { useGameStore } from '../store/gameStore';

function effectText(effects: ActionEffect[]): string {
  return effects
    .map((effect) => {
      if (effect.type === 'attribute' && effect.target) {
        const label = ATTRIBUTE_LABELS[effect.target as keyof typeof ATTRIBUTE_LABELS] ?? effect.target;
        return `${label}${effect.value > 0 ? '+' : ''}${effect.value}`;
      }
      if (effect.type === 'physicalWear') return `体力磨损${effect.value > 0 ? '+' : ''}${effect.value}`;
      if (effect.type === 'mentalWear') return `精神磨损${effect.value > 0 ? '+' : ''}${effect.value}`;
      if (effect.type === 'funds') return `资金${effect.value > 0 ? '+' : ''}${effect.value}`;
      if (effect.type === 'personality' && effect.target) return `${effect.target}${effect.value > 0 ? '+' : ''}${effect.value}`;
      return '';
    })
    .filter(Boolean)
    .join('、');
}

export function recordCompanionMemoryEvent(
  partial: Omit<EventLogEntry, 'id' | 'timestamp' | 'month'> & { month?: number },
): void {
  const state = useGameStore.getState();
  useAIStore.getState().appendEvent({
    id: `evt-memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    month: partial.month ?? state.currentMonth,
    ...partial,
  });
}

export function recordPurchaseMemory(itemName: string, cost: number, effects: ActionEffect[]): void {
  const state = useGameStore.getState();
  recordCompanionMemoryEvent({
    type: 'event',
    summary: `${state.player.name || '培养者'}购买了「${itemName}」作为可赠送给${state.aiName || 'AI'}的物品，花费${cost}资金${effects.length ? `，潜在效果：${effectText(effects)}` : ''}。`,
    tags: ['购物', '礼物准备', itemName],
    emotionalImpact: 4,
    technical: { itemName, cost, effects },
  });
}

export function recordGiftMemory(itemName: string, effects: ActionEffect[]): void {
  const state = useGameStore.getState();
  recordCompanionMemoryEvent({
    type: 'event',
    summary: `${state.player.name || '培养者'}把「${itemName}」送给了${state.aiName || 'AI'}${effects.length ? `，带来的变化：${effectText(effects)}` : '。'}`,
    tags: ['赠送', '礼物', itemName],
    emotionalImpact: 6,
    technical: { itemName, effects },
  });
}

export function recordExamConversationMemory(playerInput: string, aiReply: string, source: string): void {
  const state = useGameStore.getState();
  recordCompanionMemoryEvent({
    type: 'dialogue',
    summary: `体检阶段对话：培养者说「${playerInput}」；${state.aiName || 'AI'}回应「${aiReply}」。`,
    tags: ['体检', '对话', source],
    emotionalImpact: 7,
    technical: { playerInput, aiReply, source },
  });
}
