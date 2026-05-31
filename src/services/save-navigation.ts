import type { GamePhase, SaveBundle } from '../types';
import { restoreFromBundle } from './restore-service';

export function getRouteForSavePhase(phase: GamePhase, month = 1): string {
  switch (phase) {
    case 'raising':
      return `/raising/idle/${month}`;
    case 'exam':
      return '/exam/idle';
    case 'endgame':
      return '/endgame/farewell';
    case 'game-over':
      return '/raising/idle/1';
    default:
      return '/story/1';
  }
}

export function restoreSaveAndGetRoute(bundle: SaveBundle): string {
  restoreFromBundle(bundle);
  return getRouteForSavePhase(bundle.game.phase, bundle.game.currentMonth ?? 1);
}
