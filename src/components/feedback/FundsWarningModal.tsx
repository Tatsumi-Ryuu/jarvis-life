import React from 'react';
import { useGameStore } from '../../store/gameStore';

export const FundsWarningModal: React.FC = () => {
  const showFundsWarning = useGameStore((s) => s.showFundsWarning);
  const dismissFundsWarning = useGameStore((s) => s.dismissFundsWarning);

  if (!showFundsWarning) return null;

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
          width: 640,
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
              backgroundColor: 'var(--color-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>!</span>
          </div>
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            资金预警
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: '32px 24px' }}>
          <p style={{ fontSize: 20, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
            请控制好资金，若负债超过500，您的AI将被强制收回
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '16px 24px',
            borderTop: '3px solid var(--color-border-soft)',
          }}
        >
          <button
            onClick={dismissFundsWarning}
            style={{
              padding: '10px 40px',
              border: '3px solid var(--color-border-soft)',
              background: 'var(--color-action)',
              color: 'var(--color-text-primary)',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '6px 6px 0 rgba(46, 126, 168, 0.30)',
              fontFamily: 'Inter, "Noto Sans SC", sans-serif',
            }}
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
