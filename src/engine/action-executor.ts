import type { FullGameState, ActionItem, EventLogEntry, AIAttributes } from '../types';
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, WEAR_GAME_OVER_THRESHOLD, BANKRUPTCY_THRESHOLD, GAME_OVER_REASON_BANKRUPTCY, GAME_OVER_REASON_WEAR_DEATH } from '../types';
import { applyAttributeDelta, normalizeAttributeKey } from './attribute-calculator';
import { applyWearDelta, extractWearDeltas } from './wear-calculator';
import { calculateFundsDelta } from './economy-calculator';
import { applyPersonalityShift } from './personality-calculator';

export function checkActionAvailable(
  action: ActionItem,
  attributes: AIAttributes,
  identity: string,
): { available: boolean; reason?: string } {
  if (action.identityRequired && action.identityRequired !== identity) {
    return { available: false, reason: 'identity' };
  }
  if (action.prerequisite) {
    for (const [rawKey, min] of Object.entries(action.prerequisite) as [string, number][]) {
      const key = normalizeAttributeKey(rawKey);
      if (!key || (attributes[key] ?? 0) < min) {
        return { available: false, reason: `prerequisite:${rawKey}` };
      }
    }
  }
  return { available: true };
}

export function executeAction(
  state: FullGameState,
  action: ActionItem,
): FullGameState {
  const effects = action.effects;

  // Deduct AP
  const newAP = state.resources.actionPoints - action.ap;

  // Apply attribute changes
  const newAttributes = applyAttributeDelta(state.aiAttributes, effects);

  // Apply wear changes
  const { physicalDelta, mentalDelta } = extractWearDeltas(effects);
  const newPhysicalWear = applyWearDelta(state.resources.physicalWear, physicalDelta);
  const newMentalWear = applyWearDelta(state.resources.mentalWear, mentalDelta);

  // Apply funds changes
  const fundsDelta = calculateFundsDelta(effects);
  const newFunds = state.resources.funds + fundsDelta;

  // Apply personality changes
  const newPersonality = applyPersonalityShift(state.aiPersonality, effects);

  // Check game over
  let gameOverReason: string | null = null;
  if (newPhysicalWear >= WEAR_GAME_OVER_THRESHOLD || newMentalWear >= WEAR_GAME_OVER_THRESHOLD) {
    gameOverReason = GAME_OVER_REASON_WEAR_DEATH;
  } else if (newFunds <= BANKRUPTCY_THRESHOLD) {
    gameOverReason = GAME_OVER_REASON_BANKRUPTCY;
  }

  return {
    ...state,
    aiAttributes: newAttributes,
    aiPersonality: newPersonality,
    resources: {
      ...state.resources,
      actionPoints: newAP,
      funds: newFunds,
      physicalWear: newPhysicalWear,
      mentalWear: newMentalWear,
    },
    gameOverReason,
    phase: gameOverReason ? 'game-over' : state.phase,
  };
}

export function createEventLogEntry(
  action: ActionItem,
  state: FullGameState,
): EventLogEntry {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    month: state.currentMonth,
    type: 'action',
    summary: summarizeAction(action, state),
    tags: categorizeAction(action),
    emotionalImpact: calculateActionImpact(action, state),
    technical: {
      actionId: action.id,
      apCost: action.ap,
      effects: action.effects,
    },
  };
}

function summarizeAction(action: ActionItem, state: FullGameState): string {
  const attrEffects = action.effects.filter((e) => e.type === 'attribute');
  const attrDesc =
    attrEffects.length > 0
      ? attrEffects
          .map((e) => {
            const key = e.target ? normalizeAttributeKey(e.target) : null;
            const label = key
              ? ATTRIBUTE_LABELS[key]
              : e.target ?? '';
            return `${label}${e.value > 0 ? '+' : ''}${e.value}`;
          })
          .join('、')
      : '';

  const wearEffects = action.effects.filter(
    (e) => e.type === 'physicalWear' || e.type === 'mentalWear',
  );
  const wearDesc =
    wearEffects.length > 0
      ? wearEffects
          .map((e) => `${e.type === 'physicalWear' ? '体力' : '精神'}磨损${e.value > 0 ? '+' : ''}${e.value}`)
          .join('、')
      : '';

  const parts = [`${state.aiName}${action.description}`];
  if (attrDesc) parts.push(`属性变化：${attrDesc}`);
  if (wearDesc) parts.push(wearDesc);

  return parts.join('。');
}

function categorizeAction(action: ActionItem): string[] {
  const tags: string[] = [action.category];

  for (const effect of action.effects) {
    if (effect.type === 'attribute' && effect.target) {
      tags.push(effect.target);
    }
    if (effect.type === 'triggerEvent') {
      tags.push('事件触发');
    }
    if (effect.type === 'personality') {
      tags.push('性格变化');
    }
  }

  if (action.ap >= 3) tags.push('高消耗');
  if (action.cost > 0) tags.push('消费');

  return [...new Set(tags)];
}

function calculateActionImpact(action: ActionItem, state: FullGameState): number {
  let impact = 3;

  for (const effect of action.effects) {
    if (effect.type === 'attribute') {
      impact += Math.abs(effect.value);
    }
    if (effect.type === 'physicalWear' || effect.type === 'mentalWear') {
      impact += Math.abs(effect.value) * 2;
    }
  }

  if (state.resources.physicalWear > 60 || state.resources.mentalWear > 60) {
    impact += 2;
  }

  if (action.effects.some((e) => e.type === 'triggerEvent')) {
    impact += 3;
  }

  return Math.min(10, Math.max(1, impact));
}

export function createGameOverEvent(
  reason: string,
  state: FullGameState,
): EventLogEntry {
  const descriptions: Record<string, string> = {
    'wear-death': `${state.aiName}的身心状态已达到极限，无法继续运行。`,
    bankruptcy: `记得要管控好自己的资金，欢迎您下次来参与我们的志愿活动`,
  };

  return {
    id: `evt-gameover-${Date.now()}`,
    timestamp: Date.now(),
    month: state.currentMonth,
    type: 'game-over',
    summary: descriptions[reason] ?? '游戏结束。',
    tags: ['游戏结束', reason],
    emotionalImpact: 10,
  };
}

export function createMonthlySummaryEvent(
  month: number,
  state: FullGameState,
): EventLogEntry {
  const attrs = state.aiAttributes;
  const avgAttr = Math.round(
    ATTRIBUTE_KEYS.reduce((sum, key) => sum + attrs[key], 0) / ATTRIBUTE_KEYS.length,
  );

  const actionLines = state.currentMonthActions.length > 0
    ? state.currentMonthActions
        .map((action) => `${action.actionName}（AP ${action.apCost}）`)
        .join('、')
    : '本月没有完成行动';

  return {
    id: `evt-monthly-${month}-${Date.now()}`,
    timestamp: Date.now(),
    month,
    type: 'monthly-summary',
    summary: `第${month}月结束。本月行动：${actionLines}。${state.aiName}综合属性${avgAttr}，资金${state.resources.funds}，体力磨损${state.resources.physicalWear}，精神磨损${state.resources.mentalWear}。`,
    tags: ['月度总结'],
    emotionalImpact: 5,
  };
}

export function createWearWarningEvent(
  state: FullGameState,
): EventLogEntry | null {
  const { physicalWear, mentalWear } = state.resources;
  if (physicalWear < 60 && mentalWear < 60) return null;

  const warnings: string[] = [];
  if (physicalWear >= 60) warnings.push('体力磨损严重');
  if (mentalWear >= 60) warnings.push('精神磨损严重');

  return {
    id: `evt-wear-warn-${Date.now()}`,
    timestamp: Date.now(),
    month: state.currentMonth,
    type: 'wear-warning',
    summary: `警告：${warnings.join('，')}。${state.aiName}需要休息。`,
    tags: ['磨损警告', ...warnings],
    emotionalImpact: 7,
  };
}
