import React from 'react';
import { sf } from '../../utils/font';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from './chrome';

export type BroadcastType = 'tip' | 'warning' | 'info';

interface BroadcastPanelProps {
  type: BroadcastType;
  message: string;
  onClose: () => void;
}

const ICON_MAP: Record<BroadcastType, string> = {
  tip: 'i',
  warning: '!',
  info: '*',
};

function renderMessage(text: string) {
  const parts = text.split('**');
  return parts.map((part, i) => {
    if (i % 2 === 0) return part;
    return (
      <strong key={i} style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
        {part}
      </strong>
    );
  });
}

export const BroadcastPanel: React.FC<BroadcastPanelProps> = ({ type, message, onClose }) => {
  return (
    <div
      className="flex items-start gap-4"
      style={{
        ...chromePanelStyle({ strong: type === 'warning', padding: '18px 20px' }),
        width: 480,
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
      }}
    >
      <div style={chromeDecorStyle} />
      <div style={chromeInnerFrameStyle} />

      <span
        style={{
          position: 'relative',
          zIndex: 1,
          width: 28,
          height: 28,
          border: '1px solid var(--color-border-soft)',
          fontSize: sf(16),
          lineHeight: '26px',
          textAlign: 'center',
          flexShrink: 0,
          color: type === 'warning' ? 'var(--color-warm-accent)' : 'var(--color-text-primary)',
        }}
      >
        {ICON_MAP[type]}
      </span>
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          fontSize: sf(15),
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
          flex: 1,
        }}
      >
        {renderMessage(message)}
      </span>
      <button
        onClick={onClose}
        style={{
          position: 'relative',
          zIndex: 1,
          width: 28,
          height: 28,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          border: '1px solid var(--color-border-soft)',
          cursor: 'pointer',
          fontSize: sf(14),
          color: 'var(--color-text-muted)',
          lineHeight: 1,
          padding: 0,
        }}
        aria-label="关闭"
      >
        x
      </button>
    </div>
  );
};
