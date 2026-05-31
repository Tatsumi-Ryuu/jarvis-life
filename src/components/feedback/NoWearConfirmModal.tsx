import React from 'react';
import { Button } from '../ui/Button';

interface NoWearConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const NoWearConfirmModal: React.FC<NoWearConfirmModalProps> = ({
  open,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const actionButtonStyle: React.CSSProperties = {
    width: 190,
    height: 60,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          width: 560,
          background: 'var(--color-panel)',
          border: '6px solid var(--color-border-strong)',
          boxShadow: '10px 10px 0 rgba(31, 111, 152, 0.30)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '4px solid var(--color-border-soft)',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              backgroundColor: 'var(--color-warm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>?</span>
          </div>
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            确认维护
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: '32px 24px' }}>
          <p style={{ fontSize: 20, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
            您目前暂无磨损，确认进入维护吗？
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 16,
            padding: '16px 24px',
            borderTop: '3px solid var(--color-border-soft)',
          }}
        >
          <Button variant="secondary" onClick={onCancel} style={actionButtonStyle}>
            取消
          </Button>
          <Button variant="primary" onClick={onConfirm} style={actionButtonStyle}>
            确认维护
          </Button>
        </div>
      </div>
    </div>
  );
};
