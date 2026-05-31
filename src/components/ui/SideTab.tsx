import React from 'react';
import { AssetSlot } from './AssetSlot';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from './chrome';

interface SideTabProps {
  title: string;
  subtitle?: string;
  active: boolean;
  onClick: () => void;
  iconAssetId?: string;
  showRedDot?: boolean;
  disabled?: boolean;
}

export const SideTab: React.FC<SideTabProps> = ({
  title,
  subtitle,
  active,
  onClick,
  iconAssetId = 'icon-tab',
  showRedDot = false,
  disabled = false,
}) => {
  return (
    <button
      onClick={onClick}
      aria-disabled={disabled || undefined}
      className={`flex items-center gap-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      style={{
        ...chromePanelStyle({ strong: active, padding: active ? '0 16px' : '0 18px' }),
        width: 284,
        height: 92,
        transition: 'background-color 0.15s, border-color 0.15s',
        position: 'relative',
        opacity: disabled ? 0.48 : 1,
      }}
    >
      <div style={chromeDecorStyle} />
      <div style={chromeInnerFrameStyle} />
      {/* Left icon square */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: 48,
          height: 48,
          border: '1px solid var(--color-border-soft)',
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}
      >
        <AssetSlot assetId={iconAssetId} width={34} height={34} />
      </div>

      {/* Text block */}
      <div className="flex flex-col items-start justify-center gap-0.5" style={{ position: 'relative', zIndex: 1 }}>
        <span
          className="text-tab-title text-text-primary"
          style={{ fontWeight: 700, fontSize: 22 }}
        >
          {title}
        </span>
        {subtitle && (
          <span
            className="text-tab-subtitle text-text-secondary"
            style={{ fontWeight: active ? 700 : 400, fontSize: 12, opacity: 0.92 }}
          >
            {subtitle}
          </span>
        )}
      </div>
      <span style={{ position: 'relative', zIndex: 1, marginLeft: 'auto', color: 'var(--color-text-muted)', fontSize: 16 }}>+</span>
      {showRedDot && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 14,
            top: 12,
            zIndex: 2,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: '#ff1f2f',
            border: '3px solid #ffffff',
            boxShadow: '0 0 0 2px rgba(80,0,8,0.42), 0 0 18px rgba(255, 31, 47, 0.96)',
          }}
        />
      )}
    </button>
  );
};
