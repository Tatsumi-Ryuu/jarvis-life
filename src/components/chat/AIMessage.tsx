import React from 'react';
import { AssetSlot } from '../ui/AssetSlot';
import { sf } from '../../utils/font';
import type { AiGender } from '../../types';

export const AIAvatar: React.FC<{ name: string; gender: AiGender; size?: number }> = ({
  name,
  gender,
  size = 80,
}) => (
  <div
    role="img"
    className="talk-avatar-frame"
    aria-label={`${name || 'AI'}头像`}
    style={{
      width: size,
      height: size,
      minWidth: size,
      minHeight: size,
      flexShrink: 0,
      overflow: 'hidden',
    }}
  >
    <AssetSlot
      assetId={`ui_avatar_ai_${gender}`}
      width={size}
      height={size}
      alt={`${name || 'AI'}头像`}
    />
  </div>
);

export const AITextBubble: React.FC<{
  name: string;
  text: string;
  pending?: boolean;
  maxWidth?: string;
}> = ({ name, text, pending = false, maxWidth = '72%' }) => (
  <div
    style={{
      maxWidth,
      background: 'rgba(255,255,255,0.14)',
      border: '1px solid var(--color-border-soft)',
      padding: '12px 16px',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
      clipPath:
        'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))',
    }}
  >
    <span
      style={{
        fontSize: sf(13),
        fontWeight: 700,
        color: 'var(--color-text-secondary)',
        display: 'block',
        marginBottom: 4,
      }}
    >
      {name}
    </span>
    <p style={{ margin: 0, fontSize: sf(14), lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
      <span style={{ color: pending ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>
        {text}
      </span>
    </p>
  </div>
);

export function splitTextIntoChatLines(text: string): string[] {
  const normalized = stripNarrativeFromDialogue(text).replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const parts = normalized.match(/[^。！？!?；;]+[。！？!?；;]?/g) ?? [normalized];
  return limitStageDirections(parts.map((part) => part.trim()).filter(Boolean));
}

function stripNarrativeFromDialogue(text: string): string {
  const stageDirection = text.match(/^\s*（[^）]{1,24}）\s*/u)?.[0] ?? '';
  const withoutStageDirection = stageDirection ? text.slice(stageDirection.length) : text;
  const quoteMatches = [...withoutStageDirection.matchAll(/[“"]([^“”"]+)[”"]/g)]
    .map((match) => match[1]?.trim())
    .filter(Boolean);
  const endsWithDirectAiQuote = /(?:我|它|他|她|小星)[^。！？!?“”"]{0,80}(?:然后说|说|说道|开口|回答|问道|轻声说|小声说|转向你)[:：，,]?\s*[“"][^“”"]+[”"]\s*$/u.test(withoutStageDirection);
  if (quoteMatches.length > 0 && endsWithDirectAiQuote) {
    return `${stageDirection}${quoteMatches[quoteMatches.length - 1] ?? ''}`;
  }

  const cleaned = withoutStageDirection
    .replace(/^\s*(?:我|它|他|她|小星)[^。！？!?]*(?:然后说|说|说道|开口|回答|问道|轻声说|小声说)[:：，,]\s*/u, '')
    .trim();
  return `${stageDirection}${cleaned}`;
}

function limitStageDirections(lines: string[]): string[] {
  let hasKeptStageDirection = false;

  return lines.map((line) => {
    const stageDirection = line.match(/^\s*（[^）]{1,24}）\s*/u)?.[0] ?? '';
    if (!stageDirection) return line;

    if (!hasKeptStageDirection) {
      hasKeptStageDirection = true;
      return line;
    }

    const withoutStageDirection = line.slice(stageDirection.length).trim();
    return withoutStageDirection || line;
  });
}
