import { create } from 'zustand';
import type { FullGameState, NarrativeTask, AgentRole } from '@/types';

export interface ToolCallRecord {
  id: string;
  toolName: string;
  args: unknown;
  result?: unknown;
  ok: boolean;
  timestamp: number;
}

export interface RunLog {
  id: string;
  taskType: NarrativeTask['type'];
  role: AgentRole;
  status: 'running' | 'success' | 'error';
  systemPrompt?: string;
  context?: string;
  userMessage?: string;
  runtimePrompt?: string;
  responseText?: string;
  toolCalls: ToolCallRecord[];
  toolsAvailable?: string[];
  error?: string;
  timings?: Record<string, number>;
  startedAt: number;
  finishedAt?: number;
}

export type PlaygroundPanel = 'task-runner' | 'prompt-inspector' | 'tool-calls' | 'memory' | 'game-state' | 'policy';

interface PlaygroundState {
  initialized: boolean;
  initializing: boolean;
  initError: string | null;

  activePanel: PlaygroundPanel;
  runLogs: RunLog[];
  currentRunId: string | null;
  gameState: FullGameState | null;
}

interface PlaygroundActions {
  setInitialized: (v: boolean) => void;
  setInitializing: (v: boolean) => void;
  setInitError: (err: string | null) => void;
  setActivePanel: (panel: PlaygroundPanel) => void;
  setGameState: (state: FullGameState) => void;

  startRun: (id: string, taskType: NarrativeTask['type'], role: AgentRole) => void;
  updateRun: (id: string, patch: Partial<RunLog>) => void;
  addToolCall: (runId: string, call: ToolCallRecord) => void;
  finishRun: (id: string, patch: Partial<RunLog>) => void;
  clearLogs: () => void;
}

export const usePlaygroundStore = create<PlaygroundState & PlaygroundActions>()((set) => ({
  initialized: false,
  initializing: false,
  initError: null,
  activePanel: 'task-runner',
  runLogs: [],
  currentRunId: null,
  gameState: null,

  setInitialized: (v) => set({ initialized: v }),
  setInitializing: (v) => set({ initializing: v }),
  setInitError: (err) => set({ initError: err }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setGameState: (state) => set({ gameState: state }),

  startRun: (id, taskType, role) =>
    set((s) => ({
      currentRunId: id,
      runLogs: [
        {
          id,
          taskType,
          role,
          status: 'running',
          toolCalls: [],
          startedAt: Date.now(),
        },
        ...s.runLogs,
      ],
    })),

  updateRun: (id, patch) =>
    set((s) => ({
      runLogs: s.runLogs.map((log) => (log.id === id ? { ...log, ...patch } : log)),
    })),

  addToolCall: (runId, call) =>
    set((s) => ({
      runLogs: s.runLogs.map((log) =>
        log.id === runId ? { ...log, toolCalls: [...log.toolCalls, call] } : log,
      ),
    })),

  finishRun: (id, patch) =>
    set((s) => ({
      currentRunId: s.currentRunId === id ? null : s.currentRunId,
      runLogs: s.runLogs.map((log) =>
        log.id === id ? { ...log, ...patch, status: patch.error ? 'error' : 'success', finishedAt: Date.now() } : log,
      ),
    })),

  clearLogs: () => set({ runLogs: [], currentRunId: null }),
}));
