import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatMemorySync,
  formatRelevantEvents,
  formatHighlights,
} from '../src/engine/narrative/core/memory-manager';
import { useAIStore } from '../src/store/aiStore';
import type { EventLogEntry } from '../src/types';
import { AgentRole } from '../src/types';

const makeEvent = (overrides: Partial<EventLogEntry> & { id: string; summary: string }): EventLogEntry => ({
  timestamp: Date.now(),
  month: 1,
  type: 'action',
  tags: [],
  emotionalImpact: 5,
  ...overrides,
});

describe('formatMemorySync', () => {
  it('should return empty string for empty events', () => {
    expect(formatMemorySync([])).toBe('');
  });

  it('should format events with month, type, and summary', () => {
    const events = [
      makeEvent({ id: '1', month: 2, type: 'action', summary: '去学校上课', tags: ['学习'] }),
    ];
    const result = formatMemorySync(events);
    expect(result).toContain('第2月');
    expect(result).toContain('action');
    expect(result).toContain('去学校上课');
    expect(result).toContain('学习');
  });

  it('should include emotional impact when present', () => {
    const events = [
      makeEvent({ id: '1', summary: '遇到了危机', emotionalImpact: 8 }),
    ];
    const result = formatMemorySync(events);
    expect(result).toContain('情感冲击:8');
  });

  it('should skip emotional impact when not set', () => {
    const events = [
      makeEvent({ id: '1', summary: '散步', emotionalImpact: undefined }),
    ];
    const result = formatMemorySync(events);
    expect(result).not.toContain('情感冲击');
  });
});

describe('formatRelevantEvents', () => {
  it('should return empty string for empty events', () => {
    expect(formatRelevantEvents([])).toBe('');
  });

  it('should filter to only high-impact or tagged events', () => {
    const events = [
      makeEvent({ id: '1', summary: '日常散步', emotionalImpact: 3 }),
      makeEvent({ id: '2', summary: '重大危机', emotionalImpact: 8 }),
      makeEvent({ id: '3', summary: '转折点事件', tags: ['转折点'], emotionalImpact: 5 }),
      makeEvent({ id: '4', summary: '危机事件', tags: ['危机'], emotionalImpact: 4 }),
    ];
    const result = formatRelevantEvents(events);
    expect(result).toContain('重大危机');
    expect(result).toContain('转折点事件');
    expect(result).toContain('危机事件');
    expect(result).not.toContain('日常散步');
  });
});

describe('formatHighlights', () => {
  it('should return empty string when no highlights', () => {
    const events = [
      makeEvent({ id: '1', summary: '普通事件', emotionalImpact: 3 }),
    ];
    expect(formatHighlights(events)).toBe('');
  });

  it('should return top 10 high-impact events', () => {
    const events = Array.from({ length: 15 }, (_, i) =>
      makeEvent({ id: `${i}`, summary: `事件${i}`, emotionalImpact: 8 + (i % 3) }),
    );
    const result = formatHighlights(events);
    expect(result).toContain('高光时刻');
  });

  it('should include events tagged as 第一次', () => {
    const events = [
      makeEvent({ id: '1', summary: '第一次散步', tags: ['第一次'], emotionalImpact: 3 }),
    ];
    const result = formatHighlights(events);
    expect(result).toContain('第一次散步');
  });
});
