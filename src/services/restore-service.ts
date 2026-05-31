import type { SaveBundle } from '../types';
import { useGameStore } from '../store/gameStore';
import { useAIStore } from '../store/aiStore';
import { clearEventDialogueDrafts } from './save-scoped-storage';

export function restoreFromBundle(bundle: SaveBundle): void {
  clearEventDialogueDrafts();
  useGameStore.getState().loadFromBundle(bundle.saveId, bundle.game);

  if (bundle.ai) {
    useAIStore.getState().importSnapshot(bundle.ai);
  } else {
    useAIStore.getState().clearAll();
  }

  if (!bundle.ai?.conversationLog?.length && bundle.conversationLog?.length) {
    for (const entry of bundle.conversationLog) {
      useAIStore.getState().appendConversation(entry);
    }
  }
}
