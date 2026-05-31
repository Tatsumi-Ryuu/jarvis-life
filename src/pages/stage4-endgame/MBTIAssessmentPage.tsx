import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { summarizeMbtiPersonality } from '../../engine/mbti-personality';
import { useAIInfo } from '../../store/gameSelectors';

interface AxisRow {
  label: string;
  value: number;
  leftLabel: string;
  rightLabel: string;
}

function ChromePanel({
  children,
  strong,
  style,
  contentStyle,
  borderColor,
}: {
  children: React.ReactNode;
  strong?: boolean;
  style?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  borderColor?: string;
}) {
  return (
    <section style={{ ...chromePanelStyle({ strong, padding: 0, borderColor }), ...style }}>
      <div style={chromeDecorStyle} />
      <div style={chromeInnerFrameStyle} />
      <div style={{ position: 'relative', zIndex: 1, height: '100%', ...contentStyle }}>
        {children}
      </div>
    </section>
  );
}

function StatusPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        ...chromePanelStyle({ strong: accent, padding: '14px 16px' }),
        minHeight: 74,
        minWidth: 150,
      }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginBottom: 8 }}>{label}</div>
        <div style={{ color: 'var(--color-text-primary)', fontSize: 22, fontWeight: 800 }}>{value}</div>
      </div>
    </div>
  );
}

function AxisMeter({ axis }: { axis: AxisRow }) {
  const value = Math.max(0, Math.min(100, Math.round(axis.value)));

  return (
    <div style={{ ...chromePanelStyle({ padding: '16px 18px' }) }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 11 }}>
          <span style={{ color: 'var(--color-text-primary)', fontSize: 17, fontWeight: 800 }}>{axis.leftLabel}</span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{axis.label}</span>
          <span style={{ color: 'var(--color-text-primary)', fontSize: 17, fontWeight: 800 }}>{axis.rightLabel}</span>
        </div>
        <div
          style={{
            position: 'relative',
            height: 14,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid var(--color-border-soft)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -1,
              bottom: -1,
              left: '50%',
              width: 1,
              background: 'var(--color-border-soft)',
            }}
          />
          <div style={{ width: `${value}%`, height: '100%', background: 'var(--color-status-available)' }} />
          <div
            style={{
              position: 'absolute',
              top: -5,
              left: `${value}%`,
              transform: 'translateX(-50%)',
              width: 5,
              height: 22,
              background: 'var(--color-text-primary)',
              boxShadow: '0 0 10px rgba(168,233,255,0.32)',
            }}
          />
        </div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
          {value} / 100
        </div>
      </div>
    </div>
  );
}

export const MBTIAssessmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { personality } = useAIInfo();
  const mbti = useMemo(() => summarizeMbtiPersonality(personality), [personality]);

  const axes: AxisRow[] = [
    { label: '理性/直觉', value: personality.rationalVsIntuitive, leftLabel: '理性', rightLabel: '直觉' },
    { label: '功利/道义', value: personality.utilitarianVsDeontological, leftLabel: '功利', rightLabel: '道义' },
    { label: '信任/戒备', value: personality.trustVsGuard, leftLabel: '信任', rightLabel: '戒备' },
    { label: '坚韧/敏感', value: personality.resilientVsSensitive, leftLabel: '坚韧', rightLabel: '敏感' },
    { label: '表达/沉默', value: personality.expressiveVsSilent, leftLabel: '表达', rightLabel: '沉默' },
    { label: '利己/利他', value: personality.selfishVsAltruistic, leftLabel: '利己', rightLabel: '利他' },
  ];

  const mbtiRows = Object.entries(mbti.dimensions).map(([key, dim]) => ({
    key,
    ...dim,
  }));

  return (
    <div
      className="relative flex flex-col"
      style={{
        width: 1920,
        height: 1080,
        overflow: 'hidden',
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
      }}
    >
      <ChromePanel
        strong
        style={{ width: 1920, height: 72, flexShrink: 0 }}
        contentStyle={{ display: 'flex', alignItems: 'center', padding: '0 48px' }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '1px solid var(--color-border-soft)',
            background: 'rgba(255,255,255,0.10)',
            marginRight: 14,
          }}
        />
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--color-text-primary)' }}>
            摇篮系统 · 人格评估报告
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            基石工业终局质检 / MBTI 风格判定
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <StatusPill label="类型" value={mbti.type} accent />
          <StatusPill label="人格" value={mbti.gameType} />
        </div>
      </ChromePanel>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: '34px 80px 24px',
          display: 'grid',
          gridTemplateColumns: '640px minmax(0, 1fr)',
          gap: 34,
        }}
      >
        <ChromePanel
          strong
          contentStyle={{ padding: '34px 38px', display: 'flex', flexDirection: 'column', minHeight: 0 }}
          style={{ minHeight: 0 }}
        >
          <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
            PERSONALITY TYPE
          </div>
          <div style={{ color: 'var(--color-text-primary)', fontSize: 66, fontWeight: 900, lineHeight: 1 }}>
            {mbti.type}
          </div>
          <div style={{ color: 'var(--color-warm-accent)', fontSize: 30, fontWeight: 800, marginTop: 18 }}>
            {mbti.title}
          </div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 20, fontWeight: 700, marginTop: 12 }}>
            {mbti.subtitle}
          </div>
          <div style={{ height: 1, background: 'var(--color-border-soft)', margin: '28px 0' }} />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 19, lineHeight: 1.85, margin: 0 }}>
            {mbti.description}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 28 }}>
            {mbtiRows.map((row) => (
              <div key={row.key} style={{ ...chromePanelStyle({ padding: '16px 18px' }) }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
                    {row.leftCode} / {row.rightCode}
                  </div>
                  <div style={{ color: 'var(--color-text-primary)', fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
                    {row.code}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: 15, lineHeight: 1.5 }}>
                    {row.leftLabel} · {row.rightLabel}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChromePanel>

        <div style={{ minHeight: 0, display: 'grid', gridTemplateRows: 'minmax(0, 1fr) 220px', gap: 24 }}>
          <ChromePanel
            contentStyle={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', minHeight: 0 }}
            style={{ minHeight: 0 }}
          >
            <div style={{ color: 'var(--color-text-primary)', fontSize: 24, fontWeight: 800, marginBottom: 20 }}>
              六轴人格数据
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {axes.map((axis) => (
                <AxisMeter key={axis.label} axis={axis} />
              ))}
            </div>
          </ChromePanel>

          <ChromePanel
            contentStyle={{ padding: '26px 30px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
          >
            <div style={{ color: 'var(--color-text-primary)', fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
              摇篮系统补充判断
            </div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 18, lineHeight: 1.75 }}>
              游戏内人格：{mbti.gameType}。{mbti.axisHighlights.join('；')}。
            </div>
          </ChromePanel>
        </div>
      </div>

      <div style={{ padding: '0 80px 36px', display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" onClick={() => navigate('/endgame/verdict/1')} style={{ width: 220, height: 68 }}>
          继续
        </Button>
      </div>
    </div>
  );
};
