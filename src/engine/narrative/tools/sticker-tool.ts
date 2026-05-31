import { Type, type Tool } from '@earendil-works/pi-ai';
import type { AgentTool } from '@earendil-works/pi-agent-core';
import { STICKER_EMOTIONS } from '../../../types';

const stickerEmotionParam = Type.String({
  enum: STICKER_EMOTIONS,
  description: '要发送的表情包情绪',
});

const stickerParams = Type.Object({
  emotion: stickerEmotionParam,
});

type StickerToolParams = typeof stickerParams & { emotion: typeof stickerEmotionParam };

export const sendStickerTool: Tool<StickerToolParams> = {
  name: 'send_sticker',
  description:
    '为本轮 AI 回复搭配一个表情包。只在打招呼、开启/结束谈心或出现明显情绪时使用；平静日常回复不要使用。',
  parameters: Object.assign(stickerParams, { emotion: stickerEmotionParam }),
};

export const sendStickerAgentTool: AgentTool<typeof stickerParams, { emotion: string }> = {
  ...sendStickerTool,
  parameters: stickerParams,
  label: '发送表情包',
  executionMode: 'sequential',
  execute: async (_toolCallId, params) => ({
    content: [{ type: 'text', text: `已发送 ${params.emotion} 表情包。` }],
    details: { emotion: params.emotion },
  }),
};

export const STICKER_TOOL_PROMPT = `## 可用工具

### send_sticker
为本轮回复搭配一个表情包。参数 emotion 可选值：
- greeting：打招呼、寒暄
- sparkle：兴奋、开心、对某事充满期待
- confused：疑惑、不理解、歪头
- tired：疲惫、不想动、慵懒
- angry：生气、不满、闹别扭
- cry：难过、委屈、感动到哭

使用规则：
- 日常平静闲聊可以只回复文字，不要调用工具
- 打招呼、寒暄或开启/结束谈心时，应调用 greeting
- 表达明显感受时，应调用对应情绪
- emotion 只能使用上方列出的值，不存在 normal 选项
- 你可以先输出对培养者说的话，再调用 send_sticker 搭配表情
- 如果你先调用了 send_sticker，工具返回后仍要继续完成本轮文字回复`;
