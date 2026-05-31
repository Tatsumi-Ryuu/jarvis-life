import React, { useEffect, useMemo, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { sf } from '../../utils/font';

const SHOW_DELAY_MS = 1000;

export const GlobalLoadingOverlay: React.FC = () => {
  const loadingRequests = useUIStore((state) => state.globalLoading);
  const [show, setShow] = useState(false);
  const messages = useMemo(() => Object.values(loadingRequests), [loadingRequests]);
  const active = messages.length > 0;
  const message = messages[messages.length - 1] ?? '处理中...';

  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }

    const timer = window.setTimeout(() => setShow(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!active || !show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 5000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 10, 18, 0.54)',
        backdropFilter: 'blur(5px)',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          width: 420,
          minHeight: 210,
          padding: '38px 44px 34px',
          border: '4px solid var(--color-border-strong)',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.16), transparent 32%), rgba(58, 72, 88, 0.88)',
          boxShadow: '0 22px 48px rgba(0, 0, 0, 0.28)',
          color: 'var(--color-text-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
        }}
      >
        <div
          style={{
            width: 62,
            height: 62,
            border: '4px solid rgba(255,255,255,0.28)',
            borderTopColor: 'var(--color-status-available)',
            animation: 'jarvis-loading-spin 900ms linear infinite',
          }}
        />
        <div
          style={{
            fontSize: sf(24),
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.3,
          }}
        >
          {message}
        </div>
        <div
          style={{
            fontSize: sf(15),
            color: 'var(--color-text-secondary)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          正在处理本地存档，请稍等
        </div>
      </div>
    </div>
  );
};
