import React from 'react';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from './chrome';

interface ListHeaderProps {
  title: string;
  rightContent?: React.ReactNode;
  variant?: 'count' | 'breadcrumb';
}

export const ListHeader: React.FC<ListHeaderProps> = ({
  title,
  rightContent,
  variant = 'count',
}) => {
  return (
    <div
      className="flex shrink-0 items-center justify-between px-5"
      style={{
        ...chromePanelStyle({ padding: '0 20px' }),
        width: 1118,
        height: 64,
        flexShrink: 0,
      }}
    >
      <div style={chromeDecorStyle} />
      <div style={chromeInnerFrameStyle} />
      <div className="flex items-center gap-2" style={{ position: 'relative', zIndex: 1 }}>
        <span className="text-status text-text-primary font-bold" style={{ fontSize: 18 }}>{title}</span>
        {variant === 'count' && (
          <span className="text-tab-subtitle text-text-secondary">
            {/* count can be injected via rightContent */}
          </span>
        )}
      </div>
      {rightContent && <div style={{ position: 'relative', zIndex: 1 }}>{rightContent}</div>}
    </div>
  );
};
