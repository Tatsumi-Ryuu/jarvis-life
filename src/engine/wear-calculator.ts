export function applyWearDelta(current: number, delta: number): number {
  return Math.min(100, Math.max(0, current + delta));
}

export function extractWearDeltas(
  effects: { type: string; value: number }[],
): { physicalDelta: number; mentalDelta: number } {
  let physicalDelta = 0;
  let mentalDelta = 0;
  for (const effect of effects) {
    if (effect.type === 'physicalWear') physicalDelta += effect.value;
    if (effect.type === 'mentalWear') mentalDelta += effect.value;
  }
  return { physicalDelta, mentalDelta };
}
