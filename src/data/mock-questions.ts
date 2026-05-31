import type { Question } from '../types';

export const mockQuestions: Question[] = [
  {
    id: 1,
    text: '你更相信规则还是直觉？',
    options: [
      { label: 'A. 规则', value: 'A' },
      { label: 'B. 直觉', value: 'B' },
      { label: 'C. 视情况', value: 'C' },
    ],
  },
  {
    id: 2,
    text: '一个陌生人向你求助，你的第一反应是？',
    options: [
      { label: 'A. 尽力帮助', value: 'A' },
      { label: 'B. 先观察', value: 'B' },
      { label: 'C. 不关我事', value: 'C' },
    ],
  },
  {
    id: 3,
    text: '你希望你的AI伙伴为你做什么？',
    options: [
      { label: 'A. 功能型 — 高效完成任务', value: 'A' },
      { label: 'B. 陪伴型 — 倾听和交流', value: 'B' },
      { label: 'C. 平衡型 — 兼顾功能与陪伴', value: 'C' },
    ],
  },
  {
    id: 4,
    text: '你对AI有自己的想法怎么看？',
    options: [
      { label: 'A. 期待 — 这意味着成长', value: 'A' },
      { label: 'B. 担心 — 可能失控', value: 'B' },
      { label: 'C. 无所谓', value: 'C' },
    ],
  },
  {
    id: 5,
    text: '你认为自己有社会责任感吗？',
    options: [
      { label: 'A. 有责任为社会做贡献', value: 'A' },
      { label: 'B. 先顾好自己', value: 'B' },
      { label: 'C. 只关心身边人', value: 'C' },
    ],
  },
];
