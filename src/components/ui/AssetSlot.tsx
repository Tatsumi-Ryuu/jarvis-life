import React, { useState } from 'react';
import { assetMap } from '../../data/asset-map';

interface AssetSlotProps {
  assetId: string;
  width: number;
  height: number;
  className?: string;
  alt?: string;
}

export const AssetSlot: React.FC<AssetSlotProps> = ({ assetId, width, height, className = '', alt }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const src = assetMap[assetId];

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center border-2 border-border-strong/30 ${className}`}
        style={{
          width,
          height,
          backgroundColor: 'var(--color-placeholder)',
          minWidth: width,
          minHeight: height,
        }}
      >
        <span className="text-sm font-bold text-text-primary/60 select-none" style={{ fontSize: Math.min(14, width / assetId.length * 1.2) }}>
          {assetId}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center border-2 border-border-strong/30 ${className}`}
        style={{
          width,
          height,
          backgroundColor: 'var(--color-placeholder)',
          minWidth: width,
          minHeight: height,
        }}
      >
        <span className="text-sm font-bold text-text-primary/60 select-none" style={{ fontSize: Math.min(14, width / assetId.length * 1.2) }}>
          {assetId}
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width, height, minWidth: width, minHeight: height }}>
      <img
        src={src}
        alt={alt || assetId}
        width={width}
        height={height}
        className={`object-cover ${className}`}
        style={{ minWidth: width, minHeight: height }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
      {!loaded && (
        <div
          className={`flex items-center justify-center border-2 border-border-strong/30 ${className}`}
          style={{
            width,
            height,
            backgroundColor: 'var(--color-placeholder)',
            position: 'absolute',
            top: 0,
            left: 0,
            minWidth: width,
            minHeight: height,
          }}
        >
          <span className="text-sm font-bold text-text-primary/60 select-none" style={{ fontSize: Math.min(14, width / assetId.length * 1.2) }}>
            {assetId}
          </span>
        </div>
      )}
    </div>
  );
};
