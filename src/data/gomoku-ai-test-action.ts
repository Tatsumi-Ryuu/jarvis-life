import type { ActionEffect, ActionItem } from '../types';

export const GOMOKU_AI_TEST_ACTION_ID = 'company_gomoku_ai_test';
export const GOMOKU_AI_TEST_WIN_ACTION_ID = 'company_gomoku_ai_test_win';
export const GOMOKU_AI_TEST_LOSE_ACTION_ID = 'company_gomoku_ai_test_lose';
export const EXAM_GOMOKU_AI_TEST_ACTION_ID = 'exam_company_gomoku_ai_test';
export const EXAM_GOMOKU_AI_TEST_WIN_ACTION_ID = 'exam_company_gomoku_ai_test_win';
export const EXAM_GOMOKU_AI_TEST_LOSE_ACTION_ID = 'exam_company_gomoku_ai_test_lose';

export const GOMOKU_AI_TEST_WIN_EFFECTS: ActionEffect[] = [
  { type: 'attribute', target: 'knowledge', value: 3 },
  { type: 'attribute', target: 'art', value: 3 },
  { type: 'attribute', target: 'fitness', value: 3 },
  { type: 'attribute', target: 'logic', value: 3 },
  { type: 'attribute', target: 'eloquence', value: 3 },
  { type: 'attribute', target: 'social', value: 3 },
  { type: 'funds', value: 200 },
];

export const GOMOKU_AI_TEST_LOSE_EFFECTS: ActionEffect[] = [];

export const EXAM_GOMOKU_AI_TEST_WIN_EFFECTS: ActionEffect[] = [
  { type: 'attribute', target: 'knowledge', value: 5 },
  { type: 'attribute', target: 'art', value: 5 },
  { type: 'attribute', target: 'fitness', value: 5 },
  { type: 'attribute', target: 'logic', value: 5 },
  { type: 'attribute', target: 'eloquence', value: 5 },
  { type: 'attribute', target: 'social', value: 5 },
  { type: 'funds', value: 2000 },
];

export const EXAM_GOMOKU_AI_TEST_LOSE_EFFECTS: ActionEffect[] = [];

export const GOMOKU_AI_TEST_ACTION: ActionItem = {
  id: GOMOKU_AI_TEST_ACTION_ID,
  name: '五子棋AI测试',
  tier: 'primary',
  ap: 1,
  cost: 0,
  description: '参与基石公司的棋类对抗测试，观察AI在局部推理与攻防策略中的表现。',
  effects: GOMOKU_AI_TEST_WIN_EFFECTS,
  status: 'available',
  category: '志愿',
};

export const EXAM_GOMOKU_AI_TEST_ACTION: ActionItem = {
  id: EXAM_GOMOKU_AI_TEST_ACTION_ID,
  name: '益智陪伴型AI体验',
  tier: 'primary',
  ap: 0,
  cost: 0,
  description: '在基石工业等候区参与益智陪伴型AI五子棋体验。',
  effects: EXAM_GOMOKU_AI_TEST_WIN_EFFECTS,
  status: 'available',
  category: '体验',
};

export function createGomokuAiTestResultAction(won: boolean): ActionItem {
  return {
    ...GOMOKU_AI_TEST_ACTION,
    id: won ? GOMOKU_AI_TEST_WIN_ACTION_ID : GOMOKU_AI_TEST_LOSE_ACTION_ID,
    effects: won ? GOMOKU_AI_TEST_WIN_EFFECTS : GOMOKU_AI_TEST_LOSE_EFFECTS,
    description: won
      ? '你作为志愿者赢下了基石工业棋类对战AI，并提交了具有研究价值的胜局记录。'
      : '你作为志愿者完成了基石工业棋类对战AI测试，但未能取得胜利，本轮没有获得额外奖励。',
  };
}

export function createExamGomokuAiTestResultAction(won: boolean): ActionItem {
  return {
    ...EXAM_GOMOKU_AI_TEST_ACTION,
    id: won ? EXAM_GOMOKU_AI_TEST_WIN_ACTION_ID : EXAM_GOMOKU_AI_TEST_LOSE_ACTION_ID,
    effects: won ? EXAM_GOMOKU_AI_TEST_WIN_EFFECTS : EXAM_GOMOKU_AI_TEST_LOSE_EFFECTS,
    description: won
      ? '你在等候区赢下了基石工业益智陪伴型AI的五子棋体验，获得了本次体验奖励。'
      : '你在等候区完成了基石工业益智陪伴型AI的五子棋体验，本次重在体验，没有额外惩罚。',
  };
}
