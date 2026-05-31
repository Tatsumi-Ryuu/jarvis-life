import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatBar } from '../../components/ui/StatBar';
import { ResourceStat } from '../../components/ui/ResourceStat';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { useGameStore } from '../../store/gameStore';
import { ATTRIBUTE_LABELS } from '../../types';
import { getAttributeDescription } from '../../engine/attribute-calculator';
import type { AttributeKey } from '../../types';
import SettingsModal from '../shared/SettingsModal';
import { ExamCompanyBackground } from './ExamCompanyBackground';

export const ExamIdlePage: React.FC = () => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const aiName = useGameStore((s) => s.aiName);
  const aiAttributes = useGameStore((s) => s.aiAttributes);
  const resources = useGameStore((s) => s.resources);
  const currentMonth = useGameStore((s) => s.currentMonth);

  const displayName = aiName || '小星';

  return (
    <ExamCompanyBackground className="flex flex-col">
      {/* Warning banner */}
      <div
        className="flex items-center justify-between px-8"
        style={{
          height: 64,
          backgroundColor: 'rgba(255, 211, 94, 0.26)',
          borderBottom: '1px solid var(--color-warm-accent)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}
        >
          ⚠ 公司通知：请前往基石公司进行例行体检
        </span>
        <Button
          onClick={() => navigate('/exam/map')}
          style={{
            width: 200,
            height: 48,
          }}
        >
          前往地图
        </Button>
      </div>

      {/* Top resource bar */}
      <div
        className="flex items-center justify-between px-12"
        style={{
          height: 80,
          backgroundColor: 'rgba(64, 78, 95, 0.62)',
          borderBottom: '1px solid var(--color-border-soft)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            休息中 — 第{currentMonth}个月
          </span>
        </div>
        <div className="flex items-center gap-10">
          <ResourceStat label="行动点" value={resources.actionPoints} />
          <ResourceStat label="资金" value={resources.funds} />
          <ResourceStat label="精神磨损" value={resources.mentalWear} />
          <button
            onClick={() => setShowSettings(true)}
            className="font-bold cursor-pointer"
            style={{
              padding: '6px 16px',
              backgroundColor: 'rgba(255,255,255,0.10)',
              border: '1px solid var(--color-border-soft)',
              color: 'var(--color-text-primary)',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            设置
          </button>
        </div>
      </div>

      {/* Main 3-panel layout */}
      <div
        className="flex-1 flex justify-center items-start pt-6"
        style={{
          padding: '24px 190px',
          gap: 24,
        }}
      >
        {/* Left panel: AI stats */}
        <div
          className="flex flex-col gap-4"
          style={{
            ...chromePanelStyle({ strong: true, padding: '24px 28px' }),
            width: 340,
          }}
        >
          <div style={chromeDecorStyle} />
          <div style={chromeInnerFrameStyle} />
          <h3
            style={{
              position: 'relative',
              zIndex: 1,
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: 8,
            }}
          >
            {displayName} · 状态
          </h3>
          <div className="flex flex-col gap-3" style={{ position: 'relative', zIndex: 1 }}>
            {(Object.entries(aiAttributes) as [AttributeKey, number][]).map(([key, val]) => (
              <StatBar key={key} label={ATTRIBUTE_LABELS[key]} value={val} max={100} desc={getAttributeDescription(key, val)} />
            ))}
          </div>
        </div>

        {/* Center panel: AI portrait */}
        <div
          className="flex flex-col items-center justify-center"
          style={{
            ...chromePanelStyle({ strong: true, padding: 32 }),
            width: 500,
          }}
        >
          <div style={chromeDecorStyle} />
          <div style={chromeInnerFrameStyle} />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              width: 240,
              height: 320,
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid var(--color-border-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 18, color: 'var(--color-text-muted)' }}>
              {displayName}
            </span>
          </div>
          <p
            style={{
              position: 'relative',
              zIndex: 1,
              marginTop: 16,
              fontSize: 18,
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
            }}
          >
            {displayName}正在休息中...
          </p>
        </div>

        {/* Right panel: locked actions */}
        <div
          className="flex flex-col gap-4"
          style={{ width: 340 }}
        >
          {['互动', '外出', '背包', '日记'].map((label) => (
            <div
              key={label}
              className="flex items-center justify-center"
              style={{
                height: 80,
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: '1px solid var(--color-border-soft)',
                opacity: 0.5,
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                {label}
              </span>
            </div>
          ))}
          <div className="relative">
            <button
              disabled
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="cursor-not-allowed w-full font-bold"
              style={{
                height: 80,
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: '1px solid var(--color-border-soft)',
                color: 'var(--color-text-muted)',
                fontSize: 22,
                fontWeight: 700,
                opacity: 0.5,
              }}
            >
              结束本月
            </button>
            {showTooltip && (
              <div
                className="absolute left-1/2"
                style={{
                  bottom: '100%',
                  transform: 'translateX(-50%)',
                  marginBottom: 8,
                  backgroundColor: 'rgba(64, 78, 95, 0.88)',
                  border: '1px solid var(--color-border-strong)',
                  padding: '8px 16px',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                }}
              >
                <span style={{ fontSize: 14, color: 'var(--color-danger)', fontWeight: 700 }}>
                  请先完成体检
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onReturnTitle={() => {
          setShowSettings(false);
          navigate('/title');
        }}
      />
    </ExamCompanyBackground>
  );
};
