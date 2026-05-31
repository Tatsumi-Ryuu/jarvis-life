import { useState, useCallback } from 'react';
import type { NarrativeTask, AgentRole } from '@/types';
import { getAgentTaskPolicy } from '@/engine/narrative/core/agent-task-policy';
import { getPersona } from '@/engine/narrative/core/persona-registry';
import { getGameData } from '@/store/gameStore';
import { usePlaygroundStore, type ToolCallRecord } from '../store/playground-store';
import { getRuntime, buildSystemPromptText, buildContextText, PLAYGROUND_SAVE_ID } from '../adapter/playground-init';

const TASK_TYPES: { value: NarrativeTask['type']; label: string; description: string }[] = [
  { value: 'dialogue', label: '对话 (dialogue)', description: '日常对话、事件对话、亲密对话' },
  { value: 'talk-opening', label: '开启谈心 (talk-opening)', description: 'AI 主动开启对话' },
  { value: 'talk-closing', label: '结束谈心 (talk-closing)', description: 'AI 说再见' },
  { value: 'diary', label: '日记 (diary)', description: '月度日记' },
  { value: 'farewell-letter', label: '告别信 (farewell-letter)', description: '终局告别' },
  { value: 'status-mood', label: '状态心情 (status-mood)', description: '描述当前心情' },
  { value: 'event-scene', label: '事件场景 (event-scene)', description: '事件场景描述' },
  { value: 'event-dialogue', label: '事件对话 (event-dialogue)', description: '事件中的对话' },
  { value: 'event-response', label: '事件回应 (event-response)', description: 'AI 对玩家输入的回应' },
  { value: 'verdict-report', label: '评估报告 (verdict-report)', description: '终局评估报告' },
  { value: 'chronicle', label: '编年史 (chronicle)', description: '叙事编年史' },
  { value: 'scene-narration', label: '场景旁白 (scene-narration)', description: '场景叙述' },
];

function buildTask(type: NarrativeTask['type'], input: string, month: number): NarrativeTask {
  switch (type) {
    case 'dialogue':
      return { type: 'dialogue', input, mode: 'casual' };
    case 'talk-opening':
      return { type: 'talk-opening', recentEvents: input };
    case 'talk-closing':
      return { type: 'talk-closing' };
    case 'diary':
      return { type: 'diary', month };
    case 'farewell-letter':
      return { type: 'farewell-letter' };
    case 'status-mood':
      return { type: 'status-mood', wear: { physical: 25, mental: 15 } };
    case 'event-scene':
      return { type: 'event-scene', eventTitle: input || '意外事件', eventType: 'random', location: '实验室', context: input };
    case 'event-dialogue':
      return { type: 'event-dialogue', eventType: 'random', location: '实验室', sceneContext: input };
    case 'event-response':
      return { type: 'event-response', eventType: 'random', location: '实验室', playerInput: input };
    case 'verdict-report':
      return { type: 'verdict-report', gameState: getGameData() };
    case 'chronicle':
      return { type: 'chronicle', chapter: 1, history: [], gameState: getGameData() };
    case 'scene-narration':
      return { type: 'scene-narration', scene: 'enter-testing', context: input };
    default:
      return { type: 'dialogue', input: input || '你好', mode: 'casual' };
  }
}

export function TaskRunnerPanel() {
  const [taskType, setTaskType] = useState<NarrativeTask['type']>('dialogue');
  const [input, setInput] = useState('');
  const [month, setMonth] = useState(3);

  const gameState = usePlaygroundStore((s) => s.gameState);
  const runLogs = usePlaygroundStore((s) => s.runLogs);
  const currentRunId = usePlaygroundStore((s) => s.currentRunId);
  const startRun = usePlaygroundStore((s) => s.startRun);
  const updateRun = usePlaygroundStore((s) => s.updateRun);
  const addToolCall = usePlaygroundStore((s) => s.addToolCall);
  const finishRun = usePlaygroundStore((s) => s.finishRun);
  const setActivePanel = usePlaygroundStore((s) => s.setActivePanel);

  const policy = gameState ? getAgentTaskPolicy(buildTask(taskType, input, month)) : null;
  const persona = policy ? getPersona(policy.role) : null;

  const handleRun = useCallback(async () => {
    if (!gameState) return;

    const task = buildTask(taskType, input, month);
    const taskPolicy = getAgentTaskPolicy(task);
    const runId = `run-${Date.now()}`;

    startRun(runId, taskType, taskPolicy.role);

    try {
      const systemPrompt = buildSystemPromptText(gameState, taskPolicy.role);
      const context = await buildContextText(task, gameState);
      updateRun(runId, {
        systemPrompt,
        context,
        toolsAvailable: taskPolicy.toolPolicy.allow,
      });

      const userMessage = buildUserMessageSimple(task);
      updateRun(runId, { userMessage });

      const runtime = getRuntime();

      const harnessKey = `${PLAYGROUND_SAVE_ID}:${taskPolicy.role}`;
      const runtimes = (runtime as any).runtimes as Map<string, any>;

      const result = await runtime.runTask(
        {
          saveId: PLAYGROUND_SAVE_ID,
          task,
          gameState,
          onTiming: (phase, ms) => {
            const log = usePlaygroundStore.getState().runLogs.find((l) => l.id === runId);
            if (log) {
              updateRun(runId, { timings: { ...log.timings, [phase]: ms } });
            }
          },
        },
        { buildUserMessage: () => userMessage },
      );

      finishRun(runId, {
        responseText: result.text,
        runtimePrompt: result.contextSummary,
        toolsAvailable: result.toolsAvailable,
        toolCalls: result.toolCalls.map((tc) => ({
          id: `${tc.name}-${Date.now()}`,
          toolName: tc.name,
          args: tc.input,
          result: tc.result,
          ok: tc.ok,
          timestamp: Date.now(),
        })),
        timings: result.timings,
      });
    } catch (err) {
      finishRun(runId, { error: err instanceof Error ? err.message : String(err) });
    }
  }, [gameState, taskType, input, month, startRun, updateRun, addToolCall, finishRun]);

  const applyMemoryToolProbe = () => {
    setTaskType('dialogue');
    setInput('请记住：我喜欢被叫作“陈老师”，以后讨论项目时请优先用简洁的要点式回答。');
  };

  const applyStickerToolProbe = () => {
    setTaskType('talk-opening');
    setInput('刚刚培养者回到了实验室，你很开心见到他。请先自然地打招呼，并用 send_sticker 选择 greeting 或 sparkle 表情。');
  };

  const isRunning = currentRunId !== null;
  const latestLog = runLogs[0];

  const inputStyle: React.CSSProperties = {
    background: '#0f1117',
    border: '1px solid #2a2e3a',
    borderRadius: 6,
    color: '#e4e7ed',
    padding: '8px 12px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
    resize: 'vertical',
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Task Runner</h3>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: '#8b92a5', display: 'block', marginBottom: 4 }}>
            任务类型
          </label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value as NarrativeTask['type'])}
            style={{ ...inputStyle, resize: 'none' }}
          >
            {TASK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {policy && (
          <div style={{ minWidth: 180 }}>
            <label style={{ fontSize: 12, color: '#8b92a5', display: 'block', marginBottom: 4 }}>
              分配信息
            </label>
            <div style={{ fontSize: 12, color: '#e4e7ed', background: '#0f1117', border: '1px solid #2a2e3a', borderRadius: 6, padding: '8px 12px' }}>
              <div>Role: <span style={{ color: '#4a9eff' }}>{policy.role}</span></div>
              <div>Mode: {policy.mode}</div>
              <div>Model: {policy.modelLevel}</div>
              <div>Format: {policy.outputFormat}</div>
              <div>Tools: {policy.toolPolicy.allow.join(', ') || 'none'}</div>
              {persona && (
                <div>Temp: {persona.temperature} / Tokens: {persona.maxTokens}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {(taskType === 'dialogue' || taskType === 'talk-opening' || taskType === 'event-scene' || taskType === 'event-dialogue' || taskType === 'event-response' || taskType === 'scene-narration') && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label style={{ fontSize: 12, color: '#8b92a5' }}>
              输入内容
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={applyMemoryToolProbe}
                style={{ background: '#2a2e3a', border: 'none', color: '#e4e7ed', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
              >
                记忆工具测试
              </button>
              <button
                onClick={applyStickerToolProbe}
                style={{ background: '#2a2e3a', border: 'none', color: '#e4e7ed', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
              >
                表情工具测试
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={taskType === 'dialogue' ? '培养者说的话...' : '上下文信息...'}
            rows={3}
            style={inputStyle}
          />
        </div>
      )}

      {taskType === 'diary' && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#8b92a5', display: 'block', marginBottom: 4 }}>
            月份
          </label>
          <input
            type="number"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            min={1}
            max={12}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>
      )}

      <button
        onClick={handleRun}
        disabled={isRunning}
        style={{
          background: isRunning ? '#2a2e3a' : '#4a9eff',
          color: isRunning ? '#8b92a5' : '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '8px 24px',
          fontSize: 13,
          fontWeight: 600,
          cursor: isRunning ? 'wait' : 'pointer',
          marginBottom: 20,
        }}
      >
        {isRunning ? '运行中...' : 'Run'}
      </button>

      {latestLog && (
        <div style={{
          background: '#14161e',
          border: '1px solid #2a2e3a',
          borderRadius: 8,
          padding: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              最新结果: {latestLog.taskType}
            </span>
            <span style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              background: latestLog.status === 'success' ? 'rgba(61,214,140,0.15)' : latestLog.status === 'error' ? 'rgba(248,113,113,0.15)' : 'rgba(74,158,255,0.15)',
              color: latestLog.status === 'success' ? '#3dd68c' : latestLog.status === 'error' ? '#f87171' : '#4a9eff',
            }}>
              {latestLog.status}
              {latestLog.finishedAt && latestLog.startedAt && (
                ` (${latestLog.finishedAt - latestLog.startedAt}ms)`
              )}
            </span>
          </div>

          {latestLog.error && (
            <div style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{latestLog.error}</div>
          )}

          {latestLog.responseText && (
            <div style={{
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              background: '#0f1117',
              borderRadius: 6,
              padding: 12,
              marginBottom: 8,
            }}>
              {latestLog.responseText}
            </div>
          )}

          {latestLog.toolCalls.length > 0 && (
            <div>
              <button
                onClick={() => setActivePanel('tool-calls')}
                style={{ background: 'none', border: 'none', color: '#4a9eff', fontSize: 12, cursor: 'pointer', padding: 0 }}
              >
                工具调用 ({latestLog.toolCalls.length}) →
              </button>
            </div>
          )}
          {latestLog.toolsAvailable && (
            <div style={{ fontSize: 11, color: '#5c6378', marginTop: 8 }}>
              Available tools: {latestLog.toolsAvailable.join(', ') || 'none'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function buildUserMessage(task: NarrativeTask): string {
  switch (task.type) {
    case 'dialogue':
      return `培养者说："${task.input}"\n\n请自然回应，保持口语化。`;
    case 'talk-opening':
      return task.recentEvents
        ? `以下是近期发生的事情：\n${task.recentEvents}\n\n请你用一句话自然地开启对话。`
        : '请你自然地开启一段对话。';
    case 'talk-closing':
      return '培养者准备结束这次谈心。请用一句自然、短而温柔的话告别。';
    case 'diary':
      return `请写你的第${task.month}个月的日记。`;
    case 'farewell-letter':
      return '请写一封给培养者的告别信。';
    case 'status-mood':
      return `请简短描述你现在的状态。体力磨损：${task.wear.physical}/100，精神磨损：${task.wear.mental}/100。`;
    default:
      return `任务类型：${task.type}`;
  }
}

function buildUserMessageSimple(task: NarrativeTask): string {
  return buildUserMessage(task);
}
