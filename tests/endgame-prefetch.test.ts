import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FullGameState } from '../src/types';
import { prefetchEndgameNarratives, resetEndgameNarrativePrefetch } from '../src/services/endgame-prefetch-service';

vi.mock('../src/engine/narrative/generators/verdict', () => ({
  generateVerdictReport: vi.fn(async () => '裁决报告'),
}));

vi.mock('../src/engine/narrative/generators/chronicle', () => ({
  generateChronicle: vi.fn(async (chapter: number) => `第${chapter}章`),
}));

import { generateVerdictReport } from '../src/engine/narrative/generators/verdict';
import { generateChronicle } from '../src/engine/narrative/generators/chronicle';

const mockGameState: FullGameState = {
  phase: 'endgame',
  player: {
    name: '测试者',
    identity: 'volunteer',
    awarenessTier: 1,
    gender: 'male',
    customAddress: '测试者',
  },
  aiName: '小星',
  aiGender: 'male',
  aiAttributes: { knowledge: 70, art: 65, fitness: 60, logic: 75, eloquence: 68, social: 72 },
  aiPersonality: {
    rationalVsIntuitive: 55,
    utilitarianVsDeontological: 45,
    trustVsGuard: 60,
    resilientVsSensitive: 50,
    expressiveVsSilent: 52,
    selfishVsAltruistic: 58,
  },
  resources: { actionPoints: 5, maxActionPoints: 10, funds: 1500, physicalWear: 20, mentalWear: 30 },
  currentMonth: 12,
  maxMonths: 12,
  questionnaireAnswers: [],
  currentMonthActions: [],
  currentAction: null,
  lastCompletedAction: null,
  currentLocationId: null,
  currentEvent: null,
  endgameEvidence: [],
  inventory: [],
  monthlySnapshots: [],
  randomSeed: 'prefetch-test-seed',
  gameOverReason: null,
  fundsWarningShown: false,
  showFundsWarning: false,
  showWearWarning: false,
  wearWarningDismissedSeverity: 0,
  shownGuides: [],
  redDots: { unlockedActionIdsByLocation: {}, seenActionIdsByLocation: {} },
};

describe('endgame narrative prefetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetEndgameNarrativePrefetch();
  });

  it('starts verdict and all chronicle requests in the background', async () => {
    const promise = prefetchEndgameNarratives(mockGameState);

    expect(generateVerdictReport).toHaveBeenCalledWith(mockGameState);
    expect(generateChronicle).toHaveBeenCalledTimes(4);
    expect(generateChronicle).toHaveBeenNthCalledWith(1, 1, mockGameState.monthlySnapshots, mockGameState);
    expect(generateChronicle).toHaveBeenNthCalledWith(4, 4, mockGameState.monthlySnapshots, mockGameState);

    await promise;
  });

  it('reuses an in-flight prefetch for the same state snapshot', async () => {
    const first = prefetchEndgameNarratives(mockGameState);
    const second = prefetchEndgameNarratives(mockGameState);

    expect(first).toBe(second);
    expect(generateVerdictReport).toHaveBeenCalledTimes(1);
    expect(generateChronicle).toHaveBeenCalledTimes(4);

    await first;
  });
});
