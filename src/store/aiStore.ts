import { create } from 'zustand';
import type {
  EventLogEntry,
  RoleCursor,
  NarrativeCacheEntry,
  AgentRole,
  AIStateSnapshot,
  ConversationLogEntry,
} from '../types';
import { getCurrentSaveId } from '../services/save-service';

function persistCurrentSession() {
  // AI state is persisted as part of the active save bundle.
  // Keep this hook as a no-op so store mutations remain cheap and file-backed.
}

interface AIState {
  eventLog: EventLogEntry[];
  roleCursors: Record<AgentRole, RoleCursor>;
  narrativeCache: NarrativeCacheEntry[];
  conversationLog: ConversationLogEntry[];
  isGenerating: boolean;
  lastError: string | null;
}

interface AIActions {
  appendEvent: (entry: EventLogEntry) => void;
  appendEvents: (entries: EventLogEntry[]) => void;
  updateEventTechnical: (id: string, patch: Record<string, unknown>) => void;
  updateCursor: (role: AgentRole, eventIndex: number) => void;
  cacheNarrative: (entry: NarrativeCacheEntry) => void;
  getCachedNarrative: (taskType: string, id: string) => NarrativeCacheEntry | undefined;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  getUnreadEvents: (role: AgentRole) => EventLogEntry[];
  appendConversation: (entry: ConversationLogEntry) => void;
  replaceConversationLog: (entries: ConversationLogEntry[]) => void;
  clearAll: () => void;
  exportSnapshot: () => AIStateSnapshot;
  importSnapshot: (snapshot: AIStateSnapshot) => void;
}

const createInitialCursor = (role: AgentRole): RoleCursor => ({
  role,
  lastSeenEventIndex: -1,
  syncedAt: 0,
});

const initialState: AIState = {
  eventLog: [],
	  roleCursors: {
	    companion: createInitialCursor('companion'),
	    evaluator: createInitialCursor('evaluator'),
	    narrator: createInitialCursor('narrator'),
	    opponent: createInitialCursor('opponent'),
	  },
  narrativeCache: [],
  conversationLog: [],
  isGenerating: false,
  lastError: null,
};

export const useAIStore = create<AIState & AIActions>()((set, get) => ({
  ...initialState,

  appendEvent: (entry) => {
    const saveId = getCurrentSaveId();
    const scopedEntry = saveId && !entry.saveId ? { ...entry, saveId } : entry;
    set((state) => ({ eventLog: [...state.eventLog, scopedEntry] }));
    persistCurrentSession();
  },

  appendEvents: (entries) => {
    const saveId = getCurrentSaveId();
    const scopedEntries = saveId
      ? entries.map((entry) => (entry.saveId ? entry : { ...entry, saveId }))
      : entries;
    set((state) => ({ eventLog: [...state.eventLog, ...scopedEntries] }));
    persistCurrentSession();
  },

  updateEventTechnical: (id, patch) => {
    set((state) => ({
      eventLog: state.eventLog.map((entry) =>
        entry.id === id
          ? { ...entry, technical: { ...(entry.technical ?? {}), ...patch } }
          : entry,
      ),
    }));
    persistCurrentSession();
  },

  updateCursor: (role, eventIndex) => {
    set((state) => ({
      roleCursors: {
        ...state.roleCursors,
        [role]: {
          role,
          lastSeenEventIndex: eventIndex,
          syncedAt: Date.now(),
        },
      },
    }));
    persistCurrentSession();
  },

  cacheNarrative: (entry) => {
    set((state) => {
      const now = Date.now();
      const pruned = state.narrativeCache
        .filter((e) => !e.expiresAt || e.expiresAt > now)
        .slice(-50);
      return { narrativeCache: [...pruned, entry] };
    });
    persistCurrentSession();
  },

  getCachedNarrative: (taskType, id) => {
    const cache = get().narrativeCache;
    return cache.find((e) => e.taskType === taskType && e.id === id);
  },

  setGenerating: (generating) => set({ isGenerating: generating }),

  setError: (error) => set({ lastError: error }),

  getUnreadEvents: (role) => {
    const { eventLog, roleCursors } = get();
    const cursor = roleCursors[role];
    const saveId = getCurrentSaveId();
    return eventLog
      .slice(cursor.lastSeenEventIndex + 1)
      .filter((entry) => !saveId || !entry.saveId || entry.saveId === saveId);
  },

  appendConversation: (entry) => {
    set((state) => ({ conversationLog: [...state.conversationLog, entry] }));
    persistCurrentSession();
  },

  replaceConversationLog: (entries) => {
    set({ conversationLog: entries });
    persistCurrentSession();
  },

  clearAll: () => {
    set({ ...initialState, conversationLog: [] });
  },

  exportSnapshot: () => {
    const { eventLog, roleCursors, narrativeCache, conversationLog } = get();
    return {
      version: 1,
      savedAt: Date.now(),
      eventLog,
      roleCursors: { ...roleCursors },
      narrativeCache,
      conversationLog,
    };
  },

  importSnapshot: (snapshot) => {
    const saveId = getCurrentSaveId();
    const eventLog = saveId
      ? snapshot.eventLog.map((entry) => (entry.saveId ? entry : { ...entry, saveId }))
      : snapshot.eventLog;

    set({
      eventLog,
	      roleCursors: {
	        ...initialState.roleCursors,
	        ...snapshot.roleCursors,
	      },
      narrativeCache: snapshot.narrativeCache,
      conversationLog: snapshot.conversationLog ?? [],
      isGenerating: false,
      lastError: null,
    });
    persistCurrentSession();
  },
}));
