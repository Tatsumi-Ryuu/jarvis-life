import React from 'react';
import { AssetSlot } from '../../components/ui/AssetSlot';

interface EndgameCompanyBackgroundProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const endgameCompanyOverlayStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  width: 1920,
  height: 1080,
  backgroundColor: 'rgba(244, 252, 255, 0.20)',
};

export const EndgameCompanyBackground: React.FC<EndgameCompanyBackgroundProps> = ({
  children,
  className,
  style,
}) => (
  <div
    className={className}
    style={{
      width: 1920,
      height: 1080,
      position: 'relative',
      fontFamily: 'Inter, "Noto Sans SC", sans-serif',
    }}
  >
    <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      <AssetSlot assetId="bg_company" width={1920} height={1080} />
    </div>
    <div style={{ ...endgameCompanyOverlayStyle, ...style }}>
      {children}
    </div>
  </div>
);
