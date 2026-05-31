import React, { useEffect, useMemo, useState } from 'react';
import { router } from '../../router';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Button';

type WearWarningStage = 'medium' | 'high' | 'danger';

interface WearWarningInfo {
  stage: WearWarningStage;
  threshold: number;
  title: string;
  statusText: string;
  penaltyText: string;
}

const WEAR_WARNINGS: Record<WearWarningStage, WearWarningInfo> = {
  medium: {
    stage: 'medium',
    threshold: 31,
    title: '磨损偏高',
    statusText: '已进入行动点受影响区间',
    penaltyText: '下月行动点上限 -1',
  },
  high: {
    stage: 'high',
    threshold: 61,
    title: '磨损严重',
    statusText: '已进入严重负荷区间',
    penaltyText: '下月行动点上限 -3',
  },
  danger: {
    stage: 'danger',
    threshold: 81,
    title: '磨损危险',
    statusText: '已进入强制回收风险区间',
    penaltyText: '下月行动点上限 -5，并可能触发 AI 停止运行',
  },
};

function getWearWarningStage(physicalWear: number, mentalWear: number): WearWarningStage | null {
  const maxWear = Math.max(physicalWear, mentalWear);
  if (maxWear >= 81) return 'danger';
  if (maxWear >= 61) return 'high';
  if (maxWear >= 31) return 'medium';
  return null;
}

function getReachedWearItems(physicalWear: number, mentalWear: number, threshold: number): string {
  const items: string[] = [];
  if (mentalWear >= threshold) items.push(`精神磨损 ${Math.round(mentalWear)}`);
  if (physicalWear >= threshold) items.push(`身体磨损 ${Math.round(physicalWear)}`);
  return items.join('、');
}

function shouldDeferWearWarning(pathname: string): boolean {
  return pathname === '/raising/action-progress' || pathname.startsWith('/raising/event/');
}

export const WearWarningModal: React.FC = () => {
  const physicalWear = useGameStore((s) => s.resources.physicalWear);
  const mentalWear = useGameStore((s) => s.resources.mentalWear);
  const gameOverReason = useGameStore((s) => s.gameOverReason);
  const showWearWarning = useGameStore((s) => s.showWearWarning);
  const dismissWearWarning = useGameStore((s) => s.dismissWearWarning);
  const setCurrentLocationId = useGameStore((s) => s.setCurrentLocationId);
  const [pathname, setPathname] = useState(() => router.state.location.pathname);

  useEffect(() => {
    return router.subscribe((state) => {
      setPathname(state.location.pathname);
    });
  }, []);

  const warning = useMemo(() => {
    const stage = getWearWarningStage(physicalWear, mentalWear);
    return stage ? WEAR_WARNINGS[stage] : null;
  }, [physicalWear, mentalWear]);

  if (!warning || !showWearWarning || gameOverReason || shouldDeferWearWarning(pathname)) return null;

  const reachedWearItems = getReachedWearItems(physicalWear, mentalWear, warning.threshold);

  const close = () => {
    dismissWearWarning();
  };

  const goToLocation = (locationId: 'company' | 'park') => {
    close();
    setCurrentLocationId(locationId);
    router.navigate(`/raising/location/${locationId}`);
  };

  const actionButtonStyle: React.CSSProperties = {
    width: 180,
    height: 60,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1002,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          width: 720,
          background: 'var(--color-panel)',
          border: '6px solid var(--color-border-strong)',
          boxShadow: '10px 10px 0 rgba(31, 111, 152, 0.30)',
          fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        }}
      >
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
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>!</span>
          </div>
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {warning.title}
          </span>
        </div>

        <div style={{ padding: '28px 24px 30px' }}>
          <p style={{ fontSize: 20, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
            您的{reachedWearItems}，已经达到 {warning.threshold} 点临界值，{warning.statusText}。
            请尽快前往公司或者公园修复磨损，否则将会影响您的游戏体验。
          </p>

          <div
            style={{
              marginTop: 20,
              padding: '16px 18px',
              background: 'var(--color-panel-soft)',
              border: '3px solid var(--color-border-soft)',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 8 }}>
              当前阶段：{warning.penaltyText}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 10 }}>
              磨损惩罚说明
            </div>
            <div style={{ fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
              31-60：下月行动点上限 -1
              <br />
              61-80：下月行动点上限 -3
              <br />
              81 以上：下月行动点上限 -5，并可能触发 AI 停止运行
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 16,
            padding: '16px 24px',
            borderTop: '3px solid var(--color-border-soft)',
          }}
        >
          <Button variant="primary" onClick={() => goToLocation('company')} style={actionButtonStyle}>
            前往公司
          </Button>
          <Button variant="primary" onClick={() => goToLocation('park')} style={actionButtonStyle}>
            前往公园
          </Button>
          <Button variant="secondary" onClick={close} style={actionButtonStyle}>
            取消
          </Button>
        </div>
      </div>
    </div>
  );
};
