import React from 'react';
import { Button } from './Button';
import { ATTRIBUTE_LABELS, type AttributeKey } from '../../types';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from './chrome';

type ActionStatus = 'available' | 'recommended' | 'completed' | 'locked';
type EffectTone = 'default' | 'ap' | 'wear' | 'fundsPositive' | 'fundsNegative' | 'attribute';

interface ActionCardProps {
  title: string;
  description: string;
  status: ActionStatus;
  effects: string;
  onAction: () => void;
  ctaText?: string;
  apCost?: number;
  disabled?: boolean;
  prerequisites?: string;
  prerequisite?: Partial<Record<AttributeKey, number>>;
  currentAttributes?: Record<AttributeKey, number>;
}

const STATUS_COLORS: Record<ActionStatus, string> = {
  available: 'var(--color-status-available)',
  recommended: 'var(--color-text-secondary)',
  completed: 'var(--color-text-muted)',
  locked: 'var(--color-text-muted)',
};

const STATUS_LABELS: Record<ActionStatus, string> = {
  available: '可执行',
  recommended: '推荐',
  completed: '已完成',
  locked: '未解锁',
};

function getEffectTone(text: string): EffectTone {
  if (text.includes('磨损')) return 'wear';
  if (text.includes('资金')) {
    return text.includes('+') ? 'fundsPositive' : 'fundsNegative';
  }
  if (
    text.includes('学识') ||
    text.includes('艺术') ||
    text.includes('体能') ||
    text.includes('逻辑') ||
    text.includes('口才') ||
    text.includes('社交')
  ) {
    return 'attribute';
  }
  return 'default';
}

function getBadgeStyle(tone: EffectTone): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 30,
    padding: '5px 12px',
    border: '1px solid rgba(255,255,255,0.16)',
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '0.02em',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
  };

  if (tone === 'ap') {
    return {
      ...base,
      color: 'var(--color-text-primary)',
      background: 'linear-gradient(180deg, rgba(168,233,255,0.28), rgba(123,194,222,0.16))',
      border: '1px solid rgba(168,233,255,0.46)',
    };
  }

  if (tone === 'wear') {
    return {
      ...base,
      color: 'var(--color-warm-accent)',
      background: 'linear-gradient(180deg, rgba(255,210,157,0.22), rgba(138,98,66,0.10))',
      border: '1px solid rgba(255,210,157,0.36)',
    };
  }

  if (tone === 'fundsPositive') {
    return {
      ...base,
      color: '#7fe2a8',
      background: 'linear-gradient(180deg, rgba(127,226,168,0.18), rgba(29,94,56,0.12))',
      border: '1px solid rgba(127,226,168,0.40)',
    };
  }

  if (tone === 'fundsNegative') {
    return {
      ...base,
      color: '#ff8f8f',
      background: 'linear-gradient(180deg, rgba(255,143,143,0.18), rgba(120,32,32,0.12))',
      border: '1px solid rgba(255,143,143,0.42)',
    };
  }

  if (tone === 'attribute') {
    return {
      ...base,
      color: 'var(--color-status-available)',
      background: 'linear-gradient(180deg, rgba(168,233,255,0.16), rgba(255,255,255,0.06))',
    };
  }

  return {
    ...base,
    color: 'var(--color-text-secondary)',
    background: 'rgba(255,255,255,0.10)',
  };
}

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  status,
  effects,
  onAction,
  ctaText = '开始执行',
  apCost,
  disabled = false,
  prerequisite,
  currentAttributes,
}) => {
  const isCompleted = status === 'completed';
  const isLocked = status === 'locked';
  const isDisabled = disabled || isCompleted || isLocked;
  const effectItems = effects
    .split('  ')
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{
        ...chromePanelStyle({ strong: true, padding: 14 }),
        width: 1118,
        height: 194,
        flexShrink: 0,
      }}
    >
      <div style={chromeDecorStyle} />
      <div style={chromeInnerFrameStyle} />

      <div
        className="flex items-center justify-between px-5"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          border: '1px solid var(--color-border-soft)',
          padding: '0 20px',
          background: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-card-title text-text-primary" style={{ fontSize: 24 }}>
              {title}
            </span>
            {prerequisite && Object.keys(prerequisite).length > 0 ? (
              <div className="flex items-center gap-1" style={{ flexWrap: 'wrap' }}>
                {Object.entries(prerequisite).map(([key, min]) => {
                  const label = ATTRIBUTE_LABELS[key as AttributeKey] || key;
                  const current = currentAttributes?.[key as AttributeKey] ?? 0;
                  const met = current >= (min as number);
                  return (
                    <span
                      key={key}
                      className="text-status font-bold"
                      style={{
                        color: met ? 'var(--color-status-available)' : 'var(--color-danger)',
                        fontSize: 13,
                      }}
                    >
                      {label} {'≥'} {min as number}
                    </span>
                  );
                })}
              </div>
            ) : (
              <span
                className="text-status font-bold"
                style={{ color: STATUS_COLORS[status], fontSize: 13 }}
              >
                {STATUS_LABELS[status]}
              </span>
            )}
          </div>

          <p className="text-body text-text-secondary m-0" style={{ fontSize: 15, lineHeight: 1.55 }}>
            {description}
          </p>

          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap', marginTop: 4 }}>
            {apCost !== undefined && (
              <span style={getBadgeStyle('ap')}>行动点 {apCost}</span>
            )}
            {effectItems.map((item) => (
              <span key={item} style={getBadgeStyle(getEffectTone(item))}>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0 ml-4">
          <Button
            variant="primary"
            onClick={onAction}
            disabled={isDisabled}
            iconAssetId="icon-action"
          >
            {ctaText}
          </Button>
        </div>
      </div>
    </div>
  );
};
