import { describe, expect, it } from 'vitest';
import { summarizeMbtiPersonality } from '../src/engine/mbti-personality';

describe('summarizeMbtiPersonality', () => {
  it('maps reserved, intuitive, thinking, structured stats to INTJ', () => {
    const summary = summarizeMbtiPersonality({
      rationalVsIntuitive: 72,
      utilitarianVsDeontological: 28,
      trustVsGuard: 68,
      resilientVsSensitive: 70,
      expressiveVsSilent: 76,
      selfishVsAltruistic: 45,
    });

    expect(summary.type).toBe('INTJ');
    expect(summary.title).toBe('建筑师');
    expect(summary.gameType).toBe('理刚疏');
  });

  it('maps expressive, concrete, feeling, structured stats to ESFJ', () => {
    const summary = summarizeMbtiPersonality({
      rationalVsIntuitive: 35,
      utilitarianVsDeontological: 72,
      trustVsGuard: 30,
      resilientVsSensitive: 64,
      expressiveVsSilent: 24,
      selfishVsAltruistic: 78,
    });

    expect(summary.type).toBe('ESFJ');
    expect(summary.title).toBe('供给者');
    expect(summary.axisHighlights).toContain('关系模式偏信任亲近');
  });
});
