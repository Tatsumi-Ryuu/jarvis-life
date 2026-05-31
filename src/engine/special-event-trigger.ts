import { mockEvents } from '../data/mock-events';
import { selectRandomEvent } from './event-selector';
import type { ActionItem, LocationId } from '../types';
import { useAIStore } from '../store/aiStore';
import { useGameStore } from '../store/gameStore';

export function triggerSpecialEventAfterAction(action: ActionItem, locationId: LocationId): void {
  const state = useGameStore.getState();
  const event = selectRandomEvent(state.currentMonth, mockEvents, {
    month: state.currentMonth,
    locationId,
    action,
    gameState: state,
    eventLog: useAIStore.getState().eventLog,
  });

  if (event) {
    useGameStore.getState().triggerEvent(event);
  } else {
    useGameStore.getState().clearEvent();
  }
}
