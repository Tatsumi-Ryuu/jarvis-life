import { describe, expect, it, vi } from 'vitest';
import { generateInitialPersonality } from '../src/engine/personality-calculator';

describe('generateInitialPersonality', () => {
  it('uses questionnaire answers to seed the AI hidden personality', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const result = generateInitialPersonality([
      'intuitive',
      'trust',
      'companion',
      'open',
      'responsible',
    ]);

    expect(result.rationalVsIntuitive).toBeGreaterThan(50);
    expect(result.trustVsGuard).toBeLessThan(50);
    expect(result.utilitarianVsDeontological).toBeGreaterThan(50);
    expect(result.expressiveVsSilent).toBeLessThan(50);
    expect(result.selfishVsAltruistic).toBeGreaterThan(50);

    vi.restoreAllMocks();
  });

  it('adds a small opening variance even without questionnaire answers', () => {
    const randomValues = [0, 0.25, 0.5, 0.75, 0.99, 0.1];
    let index = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => randomValues[index++] ?? 0.5);

    const result = generateInitialPersonality();

    expect(result).toEqual({
      rationalVsIntuitive: 45,
      utilitarianVsDeontological: 47,
      trustVsGuard: 50,
      resilientVsSensitive: 53,
      expressiveVsSilent: 55,
      selfishVsAltruistic: 46,
    });

    vi.restoreAllMocks();
  });
});
