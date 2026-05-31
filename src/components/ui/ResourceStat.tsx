import React from 'react';
import { sf } from '../../utils/font';

interface ResourceStatProps {
  label: string;
  value: number | string;
  valueColor?: string;
}

export const ResourceStat: React.FC<ResourceStatProps> = ({ label, value, valueColor }) => {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="text-text-secondary"
        style={{
          fontSize: sf(13),
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </span>
      <span
        className="text-text-primary"
        style={{
          fontSize: sf(22),
          fontWeight: 700,
          color: valueColor || 'var(--color-text-primary)',
          textShadow: '0 1px 8px rgba(0,0,0,0.18)',
        }}
      >
        {value}
      </span>
    </div>
  );
};
