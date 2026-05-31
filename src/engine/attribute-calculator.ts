import type { AIAttributes, ActionEffect, AttributeKey } from '../types';
import { ATTRIBUTE_DESCRIPTIONS, ATTRIBUTE_KEYS } from '../types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readAttribute(source: Record<string, unknown>, key: AttributeKey): number {
  const value = source[key] ?? 0;
  return typeof value === 'number' ? clamp(value, 0, 100) : 0;
}

export function normalizeAttributeKey(target: string): AttributeKey | null {
  if ((ATTRIBUTE_KEYS as string[]).includes(target)) return target as AttributeKey;
  return null;
}

export function normalizeAttributes(attributes: Partial<AIAttributes> | Record<string, unknown>): AIAttributes {
  const source = attributes as Record<string, unknown>;
  return {
    knowledge: readAttribute(source, 'knowledge'),
    art: readAttribute(source, 'art'),
    fitness: readAttribute(source, 'fitness'),
    logic: readAttribute(source, 'logic'),
    eloquence: readAttribute(source, 'eloquence'),
    social: readAttribute(source, 'social'),
  };
}

export function applyAttributeDelta(current: AIAttributes, effects: ActionEffect[]): AIAttributes {
  const result = normalizeAttributes(current);
  for (const effect of effects) {
    if (effect.type === 'attribute' && effect.target) {
      const key = normalizeAttributeKey(effect.target);
      if (!key) continue;
      result[key] = clamp(result[key] + effect.value, 0, 100);
    }
  }
  return result;
}

export function generateRandomAttributes(): AIAttributes {
  // 规则：每项 5-20，总和 60-85，至少 1 项 ≥16，至少 1 项 ≤8
  let attempts = 0;
  const maxAttempts = 1000;

  while (attempts < maxAttempts) {
    const result: Partial<AIAttributes> = {};
    let total = 0;
    let hasHigh = false;
    let hasLow = false;

    for (const key of ATTRIBUTE_KEYS) {
      const value = Math.floor(Math.random() * 16) + 5;
      result[key] = value;
      total += value;
      if (value >= 16) hasHigh = true;
      if (value <= 8) hasLow = true;
    }

    if (total >= 60 && total <= 85 && hasHigh && hasLow) {
      return result as AIAttributes;
    }

    attempts++;
  }

  return {
    knowledge: 16,
    art: 8,
    fitness: 10,
    logic: 10,
    eloquence: 10,
    social: 10,
  };
}

export function getAttributeDescription(key: AttributeKey, value: number): string {
  const tiers = ATTRIBUTE_DESCRIPTIONS[key];
  if (!tiers) return '';
  for (const [min, max, label] of tiers) {
    if (value >= min && value <= max) return label;
  }
  return '';
}
