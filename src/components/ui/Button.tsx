import React from 'react';
import { AssetSlot } from './AssetSlot';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from './chrome';

type ButtonVariant = 'primary' | 'secondary' | 'monthEnd';

interface ButtonProps {
  variant?: ButtonVariant;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  iconAssetId?: string;
  subText?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  onClick,
  disabled = false,
  iconAssetId,
  subText,
  className = '',
  style,
}) => {
  if (variant === 'secondary') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          ui-chrome-button ui-chrome-button--secondary
          flex items-center justify-center cursor-pointer
          border-border-inner border-border-soft
          bg-panel-soft
          text-btn-secondary text-text-primary font-bold
          ${disabled ? 'ui-chrome-button--locked cursor-not-allowed' : ''}
          ${className}
        `}
        style={{
          ...chromePanelStyle({ padding: 8 }),
          width: 190,
          height: 60,
          ...style,
        }}
      >
        <div style={chromeDecorStyle} />
        <div style={chromeInnerFrameStyle} />
        <div
          className="ui-chrome-button__inner"
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: '100%',
            border: '1px solid var(--color-border-soft)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 18,
          }}
        >
          {children}
        </div>
      </button>
    );
  }

  // primary | monthEnd — same structure, monthEnd adds subText
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ui-chrome-button ui-chrome-button--${variant}
        flex items-center justify-center cursor-pointer
        ${disabled ? 'ui-chrome-button--locked cursor-not-allowed' : ''}
        ${className}
      `}
        style={{
          ...chromePanelStyle({ strong: true, padding: 8 }),
          width: 260,
          height: 86,
          ...style,
        }}
    >
      <div style={chromeDecorStyle} />
      <div style={chromeInnerFrameStyle} />
      {/* Inner frame */}
      <div
        className="ui-chrome-button__inner flex items-center gap-2 justify-center"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
            backgroundColor: 'rgba(255,255,255,0.09)',
          border: '1px solid var(--color-border-soft)',
        }}
      >
        {/* Left icon square */}
        {iconAssetId && (
          <div
            style={{
              width: 32,
              height: 32,
              border: '1px solid var(--color-border-soft)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              background: 'rgba(255,255,255,0.10)',
            }}
          >
            <AssetSlot assetId={iconAssetId} width={20} height={20} />
          </div>
        )}
        <div className="flex flex-col items-center">
          <span className="text-card-title text-text-primary" style={{ fontSize: variant === 'monthEnd' ? 20 : 22 }}>
            {children}
          </span>
          {variant === 'monthEnd' && subText && (
            <span className="text-small text-text-secondary" style={{ fontSize: 11, marginTop: 4, opacity: 0.9 }}>
              {subText}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
