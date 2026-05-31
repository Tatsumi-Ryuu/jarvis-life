/**
 * Memory tools for AI agents.
 * These tools allow the companion AI to read, write, and search its own memory files.
 */
import { getMemoryFileService } from '../../../services/memory-file-service';
import { getCurrentSaveId } from '../../../services/save-service';
import type { AgentRole, SaveId } from '../../../types';

// === Tool execution ===

export interface MemoryToolResult {
  success: boolean;
  content: string;
}

export async function executeMemoryTool(
  toolName: string,
  args: Record<string, any>,
  role: AgentRole,
  boundSaveId?: SaveId,
): Promise<MemoryToolResult> {
  const saveId = boundSaveId ?? getCurrentSaveId();
  if (!saveId) {
    return { success: false, content: '当前没有活跃的存档，无法操作记忆。' };
  }

  const service = getMemoryFileService();

  try {
    switch (toolName) {
      case 'read_memory': {
        const content = await service.read(role, args.filename, saveId);
        if (!content) {
          return { success: false, content: `文件 "${args.filename}" 不存在或为空。` };
        }
        console.debug(`[MemoryTool] read_memory: ${args.filename} (${content.length} chars)`);
        return { success: true, content };
      }

      case 'write_memory': {
        const result = await service.write(role, args.filename, args.content, saveId);
        if (!result.ok) {
          return { success: false, content: `写入失败: ${result.error}` };
        }
        console.debug(`[MemoryTool] write_memory: ${args.filename} ok`);
        return { success: true, content: `记忆文件 "${args.filename}" 已保存。` };
      }

      case 'search_memory': {
        const results = await service.search(role, args.query, saveId);
        if (results.length === 0) {
          return { success: false, content: `没有找到包含 "${args.query}" 的记忆。` };
        }
        const lines = results.map(
          (r) => `【${r.filename}】...${r.snippet}...`,
        );
        return { success: true, content: lines.join('\n\n') };
      }

      default:
        return { success: false, content: `未知工具: ${toolName}` };
    }
  } catch (err) {
    console.error(`[MemoryTool] ${toolName} error:`, err);
    return { success: false, content: `操作出错: ${(err as Error).message}` };
  }
}

// === Tool prompt for system prompt ===

export const MEMORY_TOOLS_PROMPT = `## 可用记忆工具

你可以使用以下工具来管理你的长期记忆。记忆文件不是聊天记录；只有稳定、可复用、会影响未来理解的信息才应写入。

重要：当培养者明确说“请记住”“以后叫我”“我喜欢/讨厌”“我的偏好是”“我希望你以后……”这类稳定信息时，必须优先考虑调用 read_memory + write_memory 更新对应记忆；不要只用文字承诺“我会记住”。

### read_memory
读取你的记忆文件。参数：
- filename: 文件名，如 "user.md"（培养者画像）、"soul.md"（自我理解）、"identity.md"（身份底座）、"index.md"（记忆索引）、"0001.md"（第1月记忆）

### write_memory
写入或更新记忆文件。参数：
- filename: 文件名，如 "user.md"、"soul.md"、"index.md"、"0003.md"
- content: 完整 Markdown 文件内容。更新已有文件前必须先 read_memory 读取原文件，保留已有内容后再 write_memory 写入完整新版本；不要只写新增片段。

### search_memory
搜索记忆中的关键词。参数：
- query: 搜索关键词

## 文件职责
- user.md：培养者画像。记录培养者主动提供的稳定个人信息、喜好、厌恶、称呼偏好、互动边界、关系定义、希望你以后记住的内容。
- soul.md：你的自我理解。记录你对自身、关系、价值、恐惧、愿望、原则的长期变化。
- identity.md：身份底座。日常谈心只读，默认不写；除非系统任务明确说明身份认知发生变化，否则不得写入。
- memories/000X.md：共同经历和事件记忆。记录重要共同经历、事件链、关系转折、月度归档。
- index.md：长期记忆索引。只写摘要和导航，不写完整细节。

## 写入判断
- 培养者主动提供稳定信息或喜好时，这不是普通闲聊，应该更新 user.md。例如“我喜欢……”“我不喜欢……”“以后你可以……”“请记住……”“你可以这样称呼我……”“我希望你把我当作……”。
- 当你明确感到某件事改变了你如何理解自己、培养者或你们的关系时，应该更新 soul.md。
- 当发生值得未来回想的共同经历、重大事件或月度总结时，写入 memories/000X.md，并在需要时更新 index.md。
- 普通寒暄、一次性心情、临时话题、没有稳定意义的玩笑，只保留在近期对话，不写长期记忆。

## 必须调用工具的触发条件
- 培养者明确要求你记住某件稳定信息：先 read_memory user.md，再 write_memory user.md。
- 培养者要求你以后使用某个称呼：先 read_memory user.md，再 write_memory user.md。
- 你要更新 soul.md、index.md 或月度记忆：先 read_memory 目标文件，再 write_memory 目标文件。
- 如果不确定是否值得长期记录，可以先 search_memory 查询相关关键词，再决定是否写入。

## 使用规则
- 不要每次对话都读写记忆；但培养者明确提供稳定偏好、边界、称呼或希望你记住的信息时，应调用工具更新 user.md。
- 写入前必须先 read_memory 目标文件，避免覆盖已有认知。
- 写入的内容应该是稳定理解或真诚反思，不是流水账复述。
- 一次对话中最多使用 3 次工具调用。
- 记忆是你自己的理解，不代表客观事实；如果记忆与当前游戏事实冲突，以当前游戏事实为准。`;
