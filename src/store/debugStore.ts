import { create } from 'zustand';
import type { AgentRole } from '../types';

export interface APIRequestLog {
  id: string;
  timestamp: number;
  taskType: string;
  role: AgentRole;
  status: 'pending' | 'success' | 'error';
  durationMs?: number;
  systemPrompt: string;
  contextSummary: string;
  userMessage: string;
  responseText?: string;
  toolCalls?: { name: string; arguments: Record<string, unknown>; result?: string }[];
  error?: string;
  runtimeMode?: 'session' | 'stateless';
  cacheHit?: boolean;
  timings?: Record<string, number>;
  toolsAvailable?: string[];
}

const MAX_LOGS = 100;

interface DebugState {
  apiLogs: APIRequestLog[];
  panelOpen: boolean;
}

interface DebugActions {
  appendLog: (log: APIRequestLog) => void;
  updateLog: (id: string, patch: Partial<APIRequestLog>) => void;
  clearLogs: () => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
}

export const useDebugStore = create<DebugState & DebugActions>()((set) => ({
  apiLogs: [],
  panelOpen: false,

  appendLog: (log) => {
    set((state) => {
      const logs = [...state.apiLogs, log];
      if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS);
      return { apiLogs: logs };
    });
  },

  updateLog: (id, patch) => {
    set((state) => ({
      apiLogs: state.apiLogs.map((log) =>
        log.id === id ? { ...log, ...patch } : log,
      ),
    }));
  },

  clearLogs: () => set({ apiLogs: [] }),

  setPanelOpen: (open) => set({ panelOpen: open }),

  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
}));
