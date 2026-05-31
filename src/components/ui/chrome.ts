import type { CSSProperties } from 'react';

export const cutClipPath =
  'polygon(0 14px, 14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px))';

export const glassPanelBackground = `
  linear-gradient(180deg, rgba(255,255,255,0.15), transparent 31%),
  linear-gradient(90deg, rgba(255,255,255,0.08), transparent 24%, transparent 76%, rgba(255,255,255,0.06)),
  linear-gradient(180deg, rgba(126, 138, 152, 0.52), rgba(58, 72, 88, 0.46))
`;

export const strongGlassPanelBackground = `
  linear-gradient(180deg, rgba(255,255,255,0.18), transparent 31%),
  linear-gradient(90deg, rgba(255,255,255,0.09), transparent 24%, transparent 76%, rgba(255,255,255,0.07)),
  linear-gradient(180deg, rgba(138, 151, 166, 0.58), rgba(64, 78, 95, 0.50))
`;

export const chromePanelStyle = (options?: {
  strong?: boolean;
  borderColor?: string;
  boxShadow?: string;
  padding?: CSSProperties['padding'];
}): CSSProperties => ({
  position: 'relative',
  overflow: 'hidden',
  padding: options?.padding,
  background: options?.strong ? strongGlassPanelBackground : glassPanelBackground,
  border: `1px solid ${options?.borderColor ?? 'var(--color-border-strong)'}`,
  clipPath: cutClipPath,
  boxShadow:
    options?.boxShadow ??
    'inset 0 0 0 1px rgba(255,255,255,0.08), 0 18px 36px rgba(0, 0, 0, 0.18)',
  backdropFilter: 'blur(10px)',
});

export const chromeInnerFrameStyle: CSSProperties = {
  position: 'absolute',
  inset: 8,
  border: '1px solid var(--color-border-soft)',
  pointerEvents: 'none',
};

export const chromeDecorStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  background: `
    linear-gradient(var(--color-border-strong), var(--color-border-strong)) 12px 10px / 34px 2px no-repeat,
    linear-gradient(var(--color-border-strong), var(--color-border-strong)) 10px 12px / 2px 34px no-repeat,
    linear-gradient(var(--color-border-strong), var(--color-border-strong)) calc(100% - 46px) 10px / 34px 2px no-repeat,
    linear-gradient(var(--color-border-strong), var(--color-border-strong)) calc(100% - 12px) 12px / 2px 34px no-repeat,
    linear-gradient(var(--color-border-strong), var(--color-border-strong)) 12px calc(100% - 12px) / 34px 2px no-repeat,
    linear-gradient(var(--color-border-strong), var(--color-border-strong)) 10px calc(100% - 46px) / 2px 34px no-repeat,
    linear-gradient(var(--color-border-strong), var(--color-border-strong)) calc(100% - 46px) calc(100% - 12px) / 34px 2px no-repeat,
    linear-gradient(var(--color-border-strong), var(--color-border-strong)) calc(100% - 12px) calc(100% - 46px) / 2px 34px no-repeat
  `,
  opacity: 0.66,
};
