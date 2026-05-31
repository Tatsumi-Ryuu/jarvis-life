import { create } from 'zustand';

const TALK_MODAL_SESSION_KEY = 'jarvis-life:talk-modal';

interface TalkModalSessionState {
  open: boolean;
  initialMessage: string;
}

interface UIState {
  talkModalOpen: boolean;
  initialTalkMessage: string;
  globalLoading: Record<number, string>;
  openTalkModal: (initialMessage?: string) => void;
  closeTalkModal: () => void;
  consumeInitialTalkMessage: () => void;
  beginGlobalLoading: (message?: string) => number;
  endGlobalLoading: (id: number) => void;
}

function readTalkModalSession(): TalkModalSessionState {
  if (typeof sessionStorage === 'undefined') {
    return { open: false, initialMessage: '' };
  }

  try {
    const raw = sessionStorage.getItem(TALK_MODAL_SESSION_KEY);
    if (!raw) return { open: false, initialMessage: '' };
    const parsed = JSON.parse(raw) as Partial<TalkModalSessionState>;
    return {
      open: parsed.open === true,
      initialMessage: typeof parsed.initialMessage === 'string' ? parsed.initialMessage : '',
    };
  } catch {
    return { open: false, initialMessage: '' };
  }
}

function writeTalkModalSession(state: TalkModalSessionState): void {
  if (typeof sessionStorage === 'undefined') return;

  try {
    if (!state.open) {
      sessionStorage.removeItem(TALK_MODAL_SESSION_KEY);
      return;
    }
    sessionStorage.setItem(TALK_MODAL_SESSION_KEY, JSON.stringify(state));
  } catch {
  }
}

const initialTalkModalSession = readTalkModalSession();

export const useUIStore = create<UIState>()((set, get) => ({
  talkModalOpen: initialTalkModalSession.open,
  initialTalkMessage: initialTalkModalSession.initialMessage,
  globalLoading: {},

  openTalkModal: (initialMessage = '') => {
    const next = { open: true, initialMessage };
    writeTalkModalSession(next);
    set({ talkModalOpen: true, initialTalkMessage: initialMessage });
  },

  closeTalkModal: () => {
    writeTalkModalSession({ open: false, initialMessage: '' });
    set({ talkModalOpen: false, initialTalkMessage: '' });
  },

  consumeInitialTalkMessage: () => {
    if (!get().initialTalkMessage) return;
    writeTalkModalSession({ open: get().talkModalOpen, initialMessage: '' });
    set({ initialTalkMessage: '' });
  },

  beginGlobalLoading: (message = '处理中...') => {
    const id = Date.now() + Math.random();
    set((state) => ({
      globalLoading: {
        ...state.globalLoading,
        [id]: message,
      },
    }));
    return id;
  },

  endGlobalLoading: (id) => {
    set((state) => {
      const { [id]: _removed, ...globalLoading } = state.globalLoading;
      return { globalLoading };
    });
  },
}));
