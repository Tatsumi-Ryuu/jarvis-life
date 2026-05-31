import { generateChronicle } from '../engine/narrative/generators/chronicle';
import { generateVerdictReport } from '../engine/narrative/generators/verdict';
import type { FullGameState } from '../types';

let activePrefetchKey: string | null = null;
let activePrefetchPromise: Promise<void> | null = null;

function createPrefetchKey(state: FullGameState): string {
  const evidenceKey = state.endgameEvidence
    .map((record) => `${record.round}:${record.title}:${record.humanPrioritySignal}:${record.autonomySignal}`)
    .join('|');
  const snapshotKey = state.monthlySnapshots
    .map((snapshot, index) => snapshot.settlement?.month ?? index + 1)
    .join(',');

  return [
    state.randomSeed,
    state.aiName,
    state.currentMonth,
    evidenceKey,
    snapshotKey,
  ].join('::');
}

export function prefetchEndgameNarratives(state: FullGameState): Promise<void> {
  const key = createPrefetchKey(state);
  if (activePrefetchKey === key && activePrefetchPromise) return activePrefetchPromise;

  activePrefetchKey = key;
  activePrefetchPromise = Promise.allSettled([
    generateVerdictReport(state),
    generateChronicle(1, state.monthlySnapshots, state),
    generateChronicle(2, state.monthlySnapshots, state),
    generateChronicle(3, state.monthlySnapshots, state),
    generateChronicle(4, state.monthlySnapshots, state),
  ]).then(() => undefined);

  return activePrefetchPromise;
}

export function resetEndgameNarrativePrefetch(): void {
  activePrefetchKey = null;
  activePrefetchPromise = null;
}
