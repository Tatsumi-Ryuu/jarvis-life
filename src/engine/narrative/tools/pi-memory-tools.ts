import { Type } from '@earendil-works/pi-ai';
import type { AgentTool } from '@earendil-works/pi-agent-core';
import { executeMemoryTool } from './memory-tools';
import type { AgentRole, SaveId } from '../../../types';

interface MemoryToolParams {
  filename?: string;
  content?: string;
  query?: string;
}

function toMemoryToolParams(params: unknown): MemoryToolParams {
  return params && typeof params === 'object' ? params as MemoryToolParams : {};
}

const readMemoryParams = Type.Object({
  filename: Type.String({ description: '要读取的记忆文件名，如 user.md（培养者画像）、soul.md（自我理解）、identity.md（身份底座）、index.md（记忆索引）、0001.md（月度记忆）' }),
});

const writeMemoryParams = Type.Object({
  filename: Type.String({ description: '要写入的记忆文件名，如 user.md（培养者画像）、soul.md（自我理解）、index.md（记忆索引）、0003.md（月度记忆）。identity.md 日常谈心默认禁止写入。' }),
  content: Type.String({ description: '完整 Markdown 文件内容。更新已有文件前必须先 read_memory 读取原文件，保留旧内容后再写入完整新版本；不要只传增量片段。' }),
});

const searchMemoryParams = Type.Object({
  query: Type.String({ description: '搜索关键词。' }),
});

export function createPiMemoryTools(role: AgentRole, saveId?: SaveId): AgentTool[] {
  return [
    {
      name: 'read_memory',
      label: '读取记忆',
      description: '读取该 Agent 的长期 Markdown 记忆文件，包括 user.md、soul.md、identity.md、index.md 或月度记忆。',
      parameters: readMemoryParams,
      executionMode: 'sequential',
      execute: async (_toolCallId, params) => {
        const safeParams = toMemoryToolParams(params);
        const result = await executeMemoryTool('read_memory', safeParams, role, saveId);
        if (!result.success) throw new Error(result.content);
        return {
          content: [{ type: 'text', text: result.content }],
          details: { filename: safeParams.filename },
        };
      },
    },
    {
      name: 'write_memory',
      label: '写入记忆',
      description: '写入或更新该 Agent 的长期 Markdown 记忆文件。按职责写入：培养者画像写 user.md，自我理解写 soul.md，共同经历写月度记忆；更新前先读取原文件。',
      parameters: writeMemoryParams,
      executionMode: 'sequential',
      execute: async (_toolCallId, params) => {
        const safeParams = toMemoryToolParams(params);
        const result = await executeMemoryTool('write_memory', safeParams, role, saveId);
        if (!result.success) throw new Error(result.content);
        return {
          content: [{ type: 'text', text: result.content }],
          details: { filename: safeParams.filename },
        };
      },
    },
    {
      name: 'search_memory',
      label: '搜索记忆',
      description: '在该 Agent 的长期 Markdown 记忆中搜索关键词。',
      parameters: searchMemoryParams,
      executionMode: 'sequential',
      execute: async (_toolCallId, params) => {
        const safeParams = toMemoryToolParams(params);
        const result = await executeMemoryTool('search_memory', safeParams, role, saveId);
        if (!result.success) throw new Error(result.content);
        return {
          content: [{ type: 'text', text: result.content }],
          details: { query: safeParams.query },
        };
      },
    },
  ];
}
