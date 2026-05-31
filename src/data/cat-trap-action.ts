import type { ActionEffect, ActionItem } from '../types';

export const FIND_CAT_ACTION_ID = 'park_find_cat';

export const FIND_CAT_WIN_EFFECTS: ActionEffect[] = [
  { type: 'mentalWear', value: -10 },
  { type: 'physicalWear', value: -10 },
  { type: 'funds', value: 100 },
];

export const FIND_CAT_LOSE_EFFECTS: ActionEffect[] = [
  { type: 'mentalWear', value: -5 },
  { type: 'physicalWear', value: -5 },
  { type: 'funds', value: 100 },
];

export const FIND_CAT_ACTION: ActionItem = {
  id: FIND_CAT_ACTION_ID,
  name: '找到小猫',
  tier: 'primary',
  ap: 1,
  cost: 0,
  description: '有小猫走失了，找到它，别让它跑掉！',
  effects: FIND_CAT_WIN_EFFECTS,
  status: 'available',
  category: '休闲',
};

export function createFindCatResultAction(won: boolean): ActionItem {
  return {
    ...FIND_CAT_ACTION,
    effects: won ? FIND_CAT_WIN_EFFECTS : FIND_CAT_LOSE_EFFECTS,
    description: won
      ? '你们成功拦住了走失的小猫，紧绷的身心都放松了下来。'
      : '小猫还是钻出了包围，但这场追逐让你们短暂放松了一些。',
  };
}
