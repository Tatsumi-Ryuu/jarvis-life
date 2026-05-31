import React from 'react';

interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  desc?: string;
  showMax?: boolean;
}

export const StatBar: React.FC<StatBarProps> = ({ label, value, max = 100, desc, showMax = false }) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const roundedValue = Math.round(value);

  return (
    <div className="flex items-center gap-3" style={{ width: '100%' }}>
      {/* Label + Desc */}
      <span
        className="text-resource-label text-text-secondary"
        style={{ minWidth: 52, fontSize: 14, fontWeight: 700, letterSpacing: '0.04em' }}
      >
        {label}
      </span>

      {/* Track */}
      <div
        className="flex-1"
        style={{
          height: 14,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.08))',
          border: '1px solid rgba(255,255,255,0.30)',
          borderRadius: 999,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.22)',
        }}
      >
        {/* Fill */}
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background:
              'linear-gradient(90deg, rgba(248,252,255,0.96), rgba(188,228,244,0.96) 55%, rgba(126,196,222,0.98))',
            transition: 'width 0.3s ease',
            boxShadow: '0 0 10px rgba(195,232,255,0.22)',
          }}
        />
      </div>

      {/* Value + Desc */}
      <span
        className="text-resource-label text-text-primary"
        style={{
          minWidth: showMax ? 58 : 32,
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {roundedValue}
      </span>
      {/* Desc */}
      {desc && (
        <span
          className="text-caption text-text-secondary"
          style={{ minWidth: 92, textAlign: 'left', fontSize: 12, opacity: 0.96, fontWeight: 600 }}
        >
          （{desc}）
        </span>
      )}
    </div>
  );
};
