import React from 'react';
import { ResourceStat } from './ResourceStat';
import { AssetSlot } from './AssetSlot';
import { sf } from '../../utils/font';
import { getSingleWearColor } from '../../engine/ap-calculator';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from './chrome';

interface TopBarProps {
  title: string;
  subtitle?: string;
  actionPoints: number;
  funds: number;
  mentalWear: number;
  physicalWear?: number;
  onBack?: () => void;
  backLabel?: string;
  subtitleOn?: boolean;
  iconAssetId?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  subtitle,
  actionPoints,
  funds,
  mentalWear,
  physicalWear,
  onBack,
  backLabel = '返回地图',
  subtitleOn = false,
  iconAssetId,
}) => {
  return (
    <header
      className="flex items-center px-8"
      style={{
        ...chromePanelStyle({ strong: true, padding: '0 24px' }),
        width: 1920,
        height: 72,
        position: 'relative',
        zIndex: 50,
      }}
    >
      <div style={chromeDecorStyle} />
      <div style={chromeInnerFrameStyle} />

      <div
        className="flex items-center gap-3"
        style={{
          position: 'absolute',
          left: 32,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1,
        }}
      >
        {iconAssetId && (
          <div
            style={{
              width: 32,
              height: 32,
              border: '1px solid var(--color-border-soft)',
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(255,255,255,0.10)',
            }}
          >
            <AssetSlot assetId={iconAssetId} width={18} height={18} />
          </div>
        )}
        <div className="flex items-baseline gap-2">
          <span
            className="text-text-primary"
            style={{
              fontSize: sf(30),
              fontWeight: 700,
              textShadow: '0 1px 8px rgba(0,0,0,0.18)',
            }}
          >
            {title}
          </span>
          {subtitleOn && subtitle && (
            <span className="text-tab-subtitle text-text-secondary" style={{ fontSize: 12 }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>

      <div
        className="flex items-center gap-10"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1,
        }}
      >
        <ResourceStat label="行动点" value={actionPoints} />
        <ResourceStat label="资金" value={funds} />
        {physicalWear !== undefined && (
          <>
            <ResourceStat label="精神磨损" value={mentalWear} valueColor={getSingleWearColor(mentalWear)} />
            <ResourceStat label="身体磨损" value={physicalWear} valueColor={getSingleWearColor(physicalWear)} />
          </>
        )}
      </div>

      {onBack && (
        <div
          style={{
            position: 'absolute',
            right: 24,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1,
          }}
        >
          <button
            onClick={onBack}
            className="cursor-pointer font-bold"
            style={{
              ...chromePanelStyle({ padding: 8 }),
              minWidth: 144,
              height: 44,
              color: 'var(--color-text-primary)',
              fontSize: sf(14),
              fontWeight: 700,
              fontFamily: 'Inter, "Noto Sans SC", sans-serif',
            }}
          >
            <div style={chromeDecorStyle} />
            <div style={chromeInnerFrameStyle} />
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                height: '100%',
                border: '1px solid var(--color-border-soft)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {backLabel}
            </div>
          </button>
        </div>
      )}
    </header>
  );
};
