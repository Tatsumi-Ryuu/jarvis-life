import type { ActionEffect } from '../types';

export function calculateFundsDelta(effects: ActionEffect[]): number {
  let total = 0;
  for (const effect of effects) {
    if (effect.type === 'funds') {
      total += effect.value;
    }
  }
  return total;
}
