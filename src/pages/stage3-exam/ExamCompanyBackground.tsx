import React from 'react';
import { AssetSlot } from '../../components/ui/AssetSlot';

interface ExamCompanyBackgroundProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const examCompanyOverlayStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  width: 1920,
  height: 1080,
  backgroundColor: 'rgba(244, 252, 255, 0.20)',
};

export const ExamCompanyBackground: React.FC<ExamCompanyBackgroundProps> = ({
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
    <div style={{ position: 'absolute', top: 0, left: 0, width: 1920, height: 1080, zIndex: 0 }}>
      <AssetSlot assetId="bg_company" width={1920} height={1080} />
    </div>
    <div style={{ ...examCompanyOverlayStyle, ...style }}>
      {children}
    </div>
  </div>
);
