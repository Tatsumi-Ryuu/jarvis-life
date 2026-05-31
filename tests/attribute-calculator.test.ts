import { describe, expect, it, vi } from 'vitest';
import { applyAttributeDelta, generateRandomAttributes } from '../src/engine/attribute-calculator';
import type { AIAttributes, ActionEffect } from '../src/types';

const baseAttributes: AIAttributes = {
  knowledge: 20,
  art: 25,
  fitness: 30,
  logic: 35,
  eloquence: 40,
  social: 45,
};

describe('applyAttributeDelta', () => {
  it('applies attribute effects to matching fields', () => {
    const effects: ActionEffect[] = [
      { type: 'attribute', target: 'knowledge', value: 5 },
      { type: 'attribute', target: 'social', value: -10 },
      { type: 'funds', value: 100 },
    ];

    const result = applyAttributeDelta(baseAttributes, effects);

    expect(result.knowledge).toBe(25);
    expect(result.social).toBe(35);
    expect(result.art).toBe(25);
  });

  it('clamps attribute values between 0 and 100', () => {
    const effects: ActionEffect[] = [
      { type: 'attribute', target: 'knowledge', value: 200 },
      { type: 'attribute', target: 'fitness', value: -50 },
    ];

    const result = applyAttributeDelta(baseAttributes, effects);

    expect(result.knowledge).toBe(100);
    expect(result.fitness).toBe(0);
  });
});

describe('generateRandomAttributes', () => {
  it('generates attributes within the 5-20 opening range', () => {
    const randomValues = [0, 0.25, 0.5, 0.75, 0.9, 0.1];
    let index = 0;
    const random = vi.spyOn(Math, 'random').mockImplementation(() => randomValues[index++] ?? 0);

    const result = generateRandomAttributes();

    for (const value of Object.values(result)) {
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(20);
    }

    random.mockRestore();
  });

  it('maps random values correctly to attribute range', () => {
    const spy = vi
      .fn<() => number>()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.25)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.75)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.1);

    vi.spyOn(Math, 'random').mockImplementation(spy);

    const result = generateRandomAttributes();

    expect(result).toEqual({
      knowledge: 5,
      art: 9,
      fitness: 13,
      logic: 17,
      eloquence: 19,
      social: 6,
    });
    expect(spy).toHaveBeenCalledTimes(6);

    vi.restoreAllMocks();
  });
});
