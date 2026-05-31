import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { ATTRIBUTE_LABELS } from '../../types';
import type { ActionEffect } from '../../types';
import { sf } from '../../utils/font';

const PERSONALITY_LABELS: Record<string, string> = {
  expressiveVsSilent: '表达',
  trustVsGuard: '信任',
  rationalVsIntuitive: '理性',
  utilitarianVsDeontological: '功利',
  resilientVsSensitive: '韧性',
  selfishVsAltruistic: '利他',
};

function effectToLine(e: ActionEffect): string {
  if (e.type === 'attribute' && e.target) {
    const label = ATTRIBUTE_LABELS[e.target as keyof typeof ATTRIBUTE_LABELS] || e.target;
    return `${label} ${e.value > 0 ? '+' : ''}${e.value}`;
  }
  if (e.type === 'physicalWear') {
    return `身体磨损 ${e.value > 0 ? '+' : ''}${e.value}`;
  }
  if (e.type === 'mentalWear') {
    return `精神磨损 ${e.value > 0 ? '+' : ''}${e.value}`;
  }
  if (e.type === 'funds') {
    return `资金 ${e.value > 0 ? '+' : ''}${e.value}`;
  }
  if (e.type === 'personality' && e.target) {
    const label = PERSONALITY_LABELS[e.target] || e.target;
    return `${label} ${e.value > 0 ? '+' : ''}${e.value}`;
  }
  if (e.type === 'triggerEvent') {
    return '触发事件';
  }
  return '';
}

export const ActionProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const skipProgress = (location.state as { skipProgress?: boolean })?.skipProgress;

  const currentAction = useGameStore((s) => s.currentAction);
  const lastCompletedAction = useGameStore((s) => s.lastCompletedAction);
  const currentLocationId = useGameStore((s) => s.currentLocationId);
  const currentEvent = useGameStore((s) => s.currentEvent);
  const [progress, setProgress] = useState(0);
  const [showResult, setShowResult] = useState(!!skipProgress);
  const resultAction = currentAction ?? lastCompletedAction;

  useEffect(() => {
    if (skipProgress) return;

    const startTime = Date.now();
    const duration = 1500;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;

      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);

      if (pct < 100) return;
      // Complete
      clearInterval(intervalId);
      setTimeout(() => {
        if (cancelled) return;
        if (currentEvent) {
          navigate(`/raising/event/${currentEvent.id}`);
          return;
        }
        setShowResult(true);
      }, 300);
    };

    tick(); // fire first frame immediately
    const intervalId = setInterval(tick, 30);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [currentEvent, navigate, skipProgress]);

  const handleContinue = () => {
    const target = currentLocationId
      ? `/raising/location/${currentLocationId}`
      : '/raising/map/1';
    navigate(target);
  };

  const actionLabel = resultAction
    ? `AI正在${resultAction.name}中...`
    : 'AI正在行动中...';

  const effectLines = (resultAction?.effects || [])
    .map(effectToLine)
    .filter(Boolean);

  // === Phase 1: Progress bar ===
  if (!showResult) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          width: 1920,
          height: 1080,
          backgroundColor: 'rgba(244, 252, 255, 0.20)',
          fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        }}
      >
        <div
          className="flex flex-col items-center gap-8"
          style={{
            width: 600,
            height: 280,
            backgroundColor: 'var(--color-panel)',
            borderWidth: 6,
            borderStyle: 'solid',
            borderColor: 'var(--color-border-strong)',
            boxShadow: '10px 10px 0 rgba(31, 111, 152, 0.30)',
            padding: '40px 48px',
          }}
        >
          <span style={{ fontSize: sf(32), fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {actionLabel}
          </span>

          <div
            style={{
              width: 500,
              height: 24,
              backgroundColor: 'var(--color-panel-soft)',
              borderWidth: 4,
              borderStyle: 'solid',
              borderColor: 'var(--color-border-soft)',
              position: 'relative',
            }}
          >
            <div
              style={{
                height: 16,
                width: `${progress}%`,
                backgroundColor: 'var(--color-action)',
                transition: 'width 0.05s linear',
              }}
            />
          </div>

          <span style={{ fontSize: sf(18), color: 'var(--color-text-secondary)' }}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    );
  }

  // === Phase 2: Results ===
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: 'rgba(244, 252, 255, 0.20)',
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
      }}
    >
      <div
        className="flex flex-col items-center gap-6"
        style={{
          width: 640,
          backgroundColor: 'var(--color-panel)',
          borderWidth: 6,
          borderStyle: 'solid',
          borderColor: 'var(--color-border-strong)',
          boxShadow: '10px 10px 0 rgba(31, 111, 152, 0.30)',
          padding: '40px 48px',
        }}
      >
        {/* Title */}
        <span style={{ fontSize: sf(32), fontWeight: 700, color: 'var(--color-text-primary)' }}>
          行动完成
        </span>

        {/* Action name */}
        <div
          className="flex items-center justify-center w-full"
          style={{
            height: 56,
            backgroundColor: 'var(--color-panel-soft)',
            borderWidth: 4,
            borderStyle: 'solid',
            borderColor: 'var(--color-border-soft)',
          }}
        >
          <span style={{ fontSize: sf(24), fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {resultAction?.name || '未知行动'}
          </span>
        </div>

        {/* AP cost */}
        {resultAction && (
          <div className="flex items-center justify-between w-full px-4"
            style={{
              height: 40,
              backgroundColor: 'var(--color-panel-soft)',
              borderWidth: 3,
              borderStyle: 'solid',
              borderColor: 'var(--color-border-soft)',
            }}
          >
            <span style={{ fontSize: sf(18), color: 'var(--color-text-secondary)' }}>行动点消耗</span>
            <span style={{ fontSize: sf(18), fontWeight: 700, color: 'var(--color-text-primary)' }}>
              -{resultAction.ap}
            </span>
          </div>
        )}

        {/* Effects */}
        {effectLines.length > 0 && (
          <div
            className="flex flex-col gap-2 w-full"
            style={{
              backgroundColor: 'var(--color-panel-soft)',
              borderWidth: 4,
              borderStyle: 'solid',
              borderColor: 'var(--color-border-soft)',
              padding: '20px 24px',
            }}
          >
            <span style={{ fontSize: sf(20), fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
              效果
            </span>
            {effectLines.map((line, i) => (
              <div
                key={i}
                className="flex items-center px-4"
                style={{
                  height: 36,
                  backgroundColor: 'var(--color-panel)',
                  borderWidth: 3,
                  borderStyle: 'solid',
                  borderColor: 'var(--color-border-soft)',
                }}
              >
                <span style={{ fontSize: sf(18), color: 'var(--color-text-primary)' }}>{line}</span>
              </div>
            ))}
          </div>
        )}

        {/* Funding cost */}
        {resultAction && resultAction.cost > 0 && (
          <div className="flex items-center justify-between w-full px-4"
            style={{
              height: 40,
              backgroundColor: 'var(--color-panel-soft)',
              borderWidth: 3,
              borderStyle: 'solid',
              borderColor: 'var(--color-border-soft)',
            }}
          >
            <span style={{ fontSize: sf(18), color: 'var(--color-text-secondary)' }}>资金消耗</span>
            <span style={{ fontSize: sf(18), fontWeight: 700, color: 'var(--color-text-primary)' }}>
              -{resultAction.cost}
            </span>
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={handleContinue}
          className="cursor-pointer font-bold"
          style={{
            width: 260,
            height: 60,
            backgroundColor: 'var(--color-action)',
            borderWidth: 6,
            borderStyle: 'solid',
            borderColor: 'var(--color-border-strong)',
            boxShadow: '6px 6px 0 rgba(31, 111, 152, 0.30)',
            fontSize: sf(22),
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            fontFamily: 'Inter, "Noto Sans SC", sans-serif',
            marginTop: 8,
          }}
        >
          继续
        </button>
      </div>
    </div>
  );
};
