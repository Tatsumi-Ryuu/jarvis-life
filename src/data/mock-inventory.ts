import type { InventoryItem } from '../types';

export const mockInventory: InventoryItem[] = [
  {
    id: 'gift_speech_card',
    name: '演讲练习卡',
    description: '一组适合日常练习的表达题卡，帮助AI把话说得更清楚。',
    iconAssetId: 'icon_gift_bear',
    type: 'gift',
    effects: [
      { type: 'attribute', target: 'eloquence', value: 2 },
      { type: 'attribute', target: 'social', value: 1 },
    ],
  },
  {
    id: 'gift_art_book',
    name: '色彩画册',
    description: '一本明亮的色彩画册，适合启发审美和基础观察。',
    iconAssetId: 'icon_gift_music_box',
    type: 'gift',
    effects: [
      { type: 'attribute', target: 'art', value: 2 },
      { type: 'attribute', target: 'knowledge', value: 1 },
    ],
  },
  {
    id: 'gift_interaction_cases',
    name: '人际互动案例集',
    description: '收录各类日常沟通案例，帮助AI理解不同社交场景的分寸。',
    iconAssetId: 'icon_gift_snack',
    type: 'gift',
    effects: [
      { type: 'attribute', target: 'social', value: 5 },
      { type: 'attribute', target: 'eloquence', value: 3 },
    ],
  },
];
