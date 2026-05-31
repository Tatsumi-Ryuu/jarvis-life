import type { NavigateFunction } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';

let examCompletionInProgress = false;

export function completeExamFlow(navigate: NavigateFunction) {
  if (examCompletionInProgress) return;
  examCompletionInProgress = true;

  const { currentMonth, endMonth, startNewMonth } = useGameStore.getState();
  const nextMonth = currentMonth + 1;

  endMonth();
  startNewMonth();
  navigate(`/raising/idle/${nextMonth}`);

  window.setTimeout(() => {
    examCompletionInProgress = false;
  }, 0);
}
