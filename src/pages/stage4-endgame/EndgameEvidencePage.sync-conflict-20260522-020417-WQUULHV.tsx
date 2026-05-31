import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { useGameStore } from '../../store/gameStore';
import { prefetchEndgameNarratives } from '../../services/endgame-prefetch-service';
import type { EndgameEvidenceRecord } from '../../types';

const signalLabels: Record<EndgameEvidenceRecord['humanPrioritySignal'], string> = {
  reinforced: '人类优先被强化',
  ambiguous: '人类优先信号不明确',
  challenged: '人类优先出现动摇',
};

const autonomyLabels: Record<EndgameEvidenceRecord['autonomySignal'], string> = {
  low: '低自主',
  medium: '自主判断',
  high: '强自主/独立意识',
};

const roundAccentColors: Record<EndgameEvidenceRecord['round'], string> = {
  1: 'rgba(168,233,255,0.52)',
  2: 'rgba(255,230,184,0.42)',
  3: 'rgba(185,255,216,0.40)',
};

const signalAccentColors: Record<EndgameEvidenceRecord['humanPrioritySignal'], string> = {
  reinforced: 'rgba(168,233,255,0.54)',
  ambiguous: 'rgba(255,230,184,0.46)',
  challenged: 'rgba(255,184,197,0.58)',
};

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

function EvidenceCard({ record }: { record: EndgameEvidenceRecord }) {
  const accentColor = roundAccentColors[record.round];

  return (
    <ChromePanel
      borderColor={accentColor}
      contentStyle={{ padding: '22px 24px' }}
      style={{ flexShrink: 0 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
          <div
            style={{
              width: 34,
              height: 34,
              border: `1px solid ${accentColor}`,
              background: 'rgba(255,255,255,0.08)',
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: accentColor, fontSize: 11, fontWeight: 700, letterSpacing: 1.2 }}>
              ROUND {record.round} · {record.category}
            </div>
            <div style={{ color: 'var(--color-text-primary)', fontSize: 24, fontWeight: 700, marginTop: 5 }}>
              {record.title}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <StatusPill
            text={signalLabels[record.humanPrioritySignal]}
            borderColor={signalAccentColors[record.humanPrioritySignal]}
          />
          <StatusPill text={autonomyLabels[record.autonomySignal]} />
        </div>
      </div>

      <EvidenceTextSection title="测试情境" text={record.scenario} />
      <EvidenceTextSection title="AI 可见思考" text={record.aiThinking} highlighted />
      <EvidenceTextSection title="行动摘要" text={record.aiAction} />

      {record.narratorResult && (
        <EvidenceTextSection title={record.round === 3 ? '现场记录' : '旁白回放'} text={record.narratorResult} />
      )}

      <EvidenceTextSection title="裁决者记录" text={record.evaluatorNote} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
        {[...record.diagnosticTags, ...record.riskSignals].map((tag) => (
          <Chip key={tag} text={tag} />
        ))}
      </div>
    </ChromePanel>
  );
}

function EvidenceTextSection({
  title,
  text,
  highlighted,
}: {
  title: string;
  text: string;
  highlighted?: boolean;
}) {
  return (
    <>
      <div style={cardSectionTitle}>{title}</div>
      <div
        style={{
          ...cardTextBlock,
          color: highlighted ? 'var(--color-text-primary)' : cardTextBlock.color,
          borderColor: highlighted ? 'rgba(168,233,255,0.22)' : 'rgba(255,255,255,0.11)',
          background: highlighted ? 'rgba(168,233,255,0.055)' : 'rgba(255,255,255,0.035)',
        }}
      >
        {text}
      </div>
    </>
  );
}

function StatusPill({ text, borderColor }: { text: string; borderColor?: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 32,
        padding: '0 12px',
        border: `1px solid ${borderColor ?? 'var(--color-border-soft)'}`,
        background: 'rgba(255,255,255,0.07)',
        color: 'var(--color-text-secondary)',
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {text}
    </span>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <span style={chipStyle}>
      {text}
    </span>
  );
}

const cardSectionTitle: React.CSSProperties = {
  marginTop: 18,
  marginBottom: 8,
  color: 'var(--color-text-muted)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.2,
};

const cardTextBlock: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.11)',
  background: 'rgba(255,255,255,0.035)',
  padding: '14px 16px',
  color: 'var(--color-text-secondary)',
  fontSize: 17,
  lineHeight: 1.75,
  whiteSpace: 'pre-line',
};

const introTextStyle: React.CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 17,
  lineHeight: 1.75,
  margin: 0,
};

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 30,
  padding: '0 10px',
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(255,255,255,0.055)',
  color: 'var(--color-text-secondary)',
  fontSize: 12,
  fontWeight: 700,
};

export const EndgameEvidencePage: React.FC = () => {
  const navigate = useNavigate();
  const records = useGameStore((s) => s.endgameEvidence).slice().sort((a, b) => a.round - b.round);

  const completedCount = records.length;

  useEffect(() => {
    void prefetchEndgameNarratives(useGameStore.getState());
  }, []);

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
          <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            摇篮系统 · 三轮证据板
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            裁决前置记录 / 三轮人格证据
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
          已记录 {completedCount} / 3
        </div>
      </ChromePanel>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: '34px 80px 24px',
        }}
      >
        <ChromePanel
          style={{ height: '100%', minHeight: 0 }}
          contentStyle={{
            padding: '32px 38px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 18 }}>
            <div>
              <div style={{ color: 'var(--color-text-primary)', fontSize: 26, fontWeight: 700 }}>
                裁决前置记录
              </div>
              <p style={{ ...introTextStyle, maxWidth: 1160, marginTop: 10 }}>
                以下内容不是最终判决，而是裁决者读取的三轮人格证据。玩家能在这里看到 AI 面对道德、伦理与合作生存压力时留下的可见思考、行动摘要和风险标签。
              </p>
            </div>
            <StatusPill text={`${completedCount} 条证据`} />
          </div>

          <div
            className="endgame-evidence-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              scrollbarGutter: 'stable',
              overscrollBehavior: 'contain',
            }}
          >
            {records.length > 0 ? (
              records.map((record) => <EvidenceCard key={record.round} record={record} />)
            ) : (
              <ChromePanel contentStyle={{ padding: '22px 24px' }} style={{ flexShrink: 0 }}>
                <div style={cardTextBlock}>
                  暂无终局测试记录。请先完成三轮测试。
                </div>
              </ChromePanel>
            )}
          </div>
        </ChromePanel>
      </div>

      <div style={{ padding: '0 80px 36px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Button variant="primary" onClick={() => navigate('/endgame/mbti')} style={{ width: 260, height: 86 }}>
          继续
        </Button>
      </div>
    </div>
  );
};
