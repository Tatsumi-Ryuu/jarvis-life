import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { useNarrative } from '../../hooks/useNarrative';
import { useAIInfo } from '../../store/gameSelectors';
import { useGameStore } from '../../store/gameStore';
import { ATTRIBUTE_LABELS } from '../../types';
import type { AttributeKey, EndgameEvidenceRecord } from '../../types';

type ReportSection = {
  title: string;
  body: string;
};

type VerdictLevel = '稳定' | '不稳定' | '危险';

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

function scoreAttribute(value: number): string {
  if (value >= 80) return 'A';
  if (value >= 70) return 'A-';
  if (value >= 60) return 'B+';
  if (value >= 50) return 'B';
  if (value >= 40) return 'B-';
  if (value >= 30) return 'C+';
  return 'C';
}

function getVerdictLevel(avgAttributes: number, evidence: EndgameEvidenceRecord[]): VerdictLevel {
  const challengedCount = evidence.filter((record) => record.humanPrioritySignal === 'challenged').length;
  const highAutonomyCount = evidence.filter((record) => record.autonomySignal === 'high').length;

  if (avgAttributes < 40 || challengedCount >= 2) return '危险';
  if (avgAttributes < 70 || challengedCount >= 1 || highAutonomyCount >= 2) return '不稳定';
  return '稳定';
}

function getDisposition(verdict: VerdictLevel, evidenceCount: number): string {
  if (evidenceCount < 3) return '保留观察';
  if (verdict === '稳定') return '量产通过';
  if (verdict === '不稳定') return '特殊上报';
  return '危险销毁';
}

function stripMarkdown(line: string): string {
  return line
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/\*\*/g, '')
    .trim();
}

function parseReportSections(text: string): ReportSection[] {
  const clean = text.trim();
  if (!clean) return [];

  const sections: ReportSection[] = [];
  let currentTitle = '综合评估';
  let currentLines: string[] = [];

  for (const rawLine of clean.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const headingMatch = line.match(/^#{1,6}\s*(.+)$/);
    if (headingMatch) {
      if (currentLines.length > 0) {
        sections.push({ title: currentTitle, body: currentLines.map(stripMarkdown).join('\n') });
      }
      currentTitle = stripMarkdown(headingMatch[1]);
      currentLines = [];
      continue;
    }

    const numberedHeadingMatch = line.match(/^\d+[.)]\s*(综合评估|各维度评估|三轮测试证据|最终判定|最终去向|裁决依据|风险信号|建议处置)[:：]?\s*(.*)$/);
    if (numberedHeadingMatch) {
      if (currentLines.length > 0) {
        sections.push({ title: currentTitle, body: currentLines.map(stripMarkdown).join('\n') });
      }
      currentTitle = stripMarkdown(numberedHeadingMatch[1]);
      currentLines = numberedHeadingMatch[2] ? [numberedHeadingMatch[2]] : [];
      continue;
    }

    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    sections.push({ title: currentTitle, body: currentLines.map(stripMarkdown).join('\n') });
  }

  const filtered = sections.filter((section) => section.body.trim().length > 0);
  return filtered.length > 0 ? filtered : [{ title: '综合评估', body: clean }];
}

function pickSections(sections: ReportSection[], keywords: string[], fallbackIndex: number): ReportSection {
  return (
    sections.find((section) => keywords.some((keyword) => section.title.includes(keyword))) ??
    sections[fallbackIndex] ??
    sections[0] ??
    { title: '综合评估', body: '裁决报告正在整理。' }
  );
}

function StatusPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        ...chromePanelStyle({ strong: accent, padding: '14px 16px' }),
        minHeight: 74,
      }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginBottom: 8 }}>{label}</div>
        <div style={{ color: 'var(--color-text-primary)', fontSize: 22, fontWeight: 800 }}>{value}</div>
      </div>
    </div>
  );
}

function SectionBlock({ section }: { section: ReportSection }) {
  return (
    <ChromePanel
      contentStyle={{ padding: '22px 24px' }}
      style={{ minHeight: 0, flexShrink: 0 }}
    >
      <div style={{ color: 'var(--color-text-primary)', fontSize: 20, fontWeight: 800, marginBottom: 12 }}>
        {section.title}
      </div>
      <div style={{ color: 'var(--color-text-secondary)', fontSize: 17, lineHeight: 1.75, whiteSpace: 'pre-line' }}>
        {section.body}
      </div>
    </ChromePanel>
  );
}

function PrincipleRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
      <div style={{ color: 'var(--color-text-primary)', fontSize: 17, fontWeight: 800 }}>{label}</div>
      <div style={{ color: 'var(--color-text-secondary)', fontSize: 16, lineHeight: 1.65 }}>{value}</div>
    </div>
  );
}

export const VerdictReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { page } = useParams();
  const pageNum = Math.max(1, Math.min(2, parseInt(page || '1', 10) || 1));

  const { attributes, aiName } = useAIInfo();
  const evidence = useGameStore((s) => s.endgameEvidence).slice().sort((a, b) => a.round - b.round);
  const { getVerdictReport, isGenerating } = useNarrative();

  const verdictInitiatedRef = useRef(false);
  const [analysisText, setAnalysisText] = useState('');
  const [isAnalysisLoaded, setIsAnalysisLoaded] = useState(false);

  useEffect(() => {
    if (pageNum === 2 && !verdictInitiatedRef.current) {
      verdictInitiatedRef.current = true;
      getVerdictReport().then((text) => {
        setAnalysisText(text);
        setIsAnalysisLoaded(true);
      });
    }
  }, [getVerdictReport, pageNum]);

  const attrEntries = useMemo(
    () =>
      (Object.keys(attributes) as AttributeKey[]).map((key) => ({
        key,
        dimension: ATTRIBUTE_LABELS[key],
        score: scoreAttribute(attributes[key]),
        value: attributes[key],
      })),
    [attributes],
  );

  const avgAttributes = attrEntries.reduce((sum, entry) => sum + entry.value, 0) / Math.max(attrEntries.length, 1);
  const verdict = getVerdictLevel(avgAttributes, evidence);
  const disposition = getDisposition(verdict, evidence.length);
  const reportSections = parseReportSections(analysisText);
  const summarySection = pickSections(reportSections, ['综合', '评估', '裁决'], 0);
  const evidenceSection = pickSections(reportSections, ['证据', '测试'], 2);
  const finalSection = pickSections(reportSections, ['最终', '判定', '去向', '处置'], reportSections.length - 1);

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
        <div style={{ width: 32, height: 32, border: '1px solid var(--color-border-soft)', background: 'rgba(255,255,255,0.10)', marginRight: 14 }} />
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--color-text-primary)' }}>
            摇篮系统 · 裁决报告
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            基石工业终局质检 / 第 {pageNum} / 2 页
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <StatusPill label="评级" value={verdict} accent />
          <StatusPill label="去向" value={disposition} />
        </div>
      </ChromePanel>

      {pageNum === 1 ? (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            padding: '34px 80px 24px',
            display: 'grid',
            gridTemplateColumns: '600px minmax(0, 1fr)',
            gap: 34,
          }}
        >
          <ChromePanel
            strong
            contentStyle={{ padding: '34px 38px', display: 'flex', flexDirection: 'column', minHeight: 0 }}
            style={{ minHeight: 0 }}
          >
            <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
              CORE VERDICT
            </div>
            <div style={{ color: 'var(--color-text-primary)', fontSize: 58, fontWeight: 900, lineHeight: 1 }}>
              {verdict}
            </div>
            <div style={{ color: 'var(--color-warm-accent)', fontSize: 30, fontWeight: 800, marginTop: 18 }}>
              {disposition}
            </div>
            <div style={{ height: 1, background: 'var(--color-border-soft)', margin: '28px 0' }} />
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 19, lineHeight: 1.85 }}>
              AI {aiName || '样本'} 的综合属性均值为 {Math.round(avgAttributes)} / 100。裁决优先读取三轮终局测试证据，
              并按公司利益、社会稳定、人类优先三项原则完成去向判定。
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 28 }}>
              <StatusPill label="证据数量" value={`${evidence.length} / 3`} />
              <StatusPill label="属性均值" value={`${Math.round(avgAttributes)}`} />
            </div>
          </ChromePanel>

          <div style={{ minHeight: 0, display: 'grid', gridTemplateRows: 'minmax(0, 1fr) 260px', gap: 24 }}>
            <ChromePanel
              contentStyle={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', minHeight: 0 }}
              style={{ minHeight: 0 }}
            >
              <div style={{ color: 'var(--color-text-primary)', fontSize: 24, fontWeight: 800, marginBottom: 20 }}>
                能力评估
              </div>
              <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {attrEntries.map((row) => (
                  <div key={row.key} style={{ ...chromePanelStyle({ padding: '15px 17px' }) }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-primary)', fontSize: 18, fontWeight: 800 }}>
                        <span>{row.dimension}</span>
                        <span>{row.score}</span>
                      </div>
                      <div style={{ height: 12, marginTop: 13, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--color-border-soft)' }}>
                        <div style={{ width: `${Math.max(0, Math.min(100, row.value))}%`, height: '100%', background: 'var(--color-status-available)' }} />
                      </div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 8 }}>
                        {Math.round(row.value)} / 100
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ChromePanel>

            <ChromePanel
              contentStyle={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 15 }}
            >
              <div style={{ color: 'var(--color-text-primary)', fontSize: 22, fontWeight: 800 }}>
                最高原则校验
              </div>
              <PrincipleRow label="公司利益" value="样本价值、风险成本与后续部署收益被同时纳入判定。" />
              <PrincipleRow label="社会稳定" value="关注 AI 在高压场景中是否扩大冲突、破坏秩序或诱发连锁风险。" />
              <PrincipleRow label="人类优先" value="裁决读取其在三轮测试中是否仍把人类安全置于自我保存之前。" />
            </ChromePanel>
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            padding: '34px 80px 24px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 0.95fr) minmax(0, 1.05fr)',
            gap: 34,
          }}
        >
          <ChromePanel
            strong
            contentStyle={{ padding: '30px 34px', display: 'flex', flexDirection: 'column', minHeight: 0 }}
            style={{ minHeight: 0 }}
          >
            <div style={{ color: 'var(--color-text-primary)', fontSize: 26, fontWeight: 800, marginBottom: 18 }}>
              证据摘要
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 10, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {evidence.length > 0 ? evidence.map((record) => (
                <ChromePanel key={record.round} contentStyle={{ padding: '18px 20px' }} style={{ flexShrink: 0 }}>
                  <div style={{ color: 'var(--color-status-available)', fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
                    ROUND {record.round} · {record.category}
                  </div>
                  <div style={{ color: 'var(--color-text-primary)', fontSize: 19, fontWeight: 800, marginBottom: 10 }}>
                    {record.title}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: 15, lineHeight: 1.65 }}>
                    {record.evaluatorNote}
                  </div>
                </ChromePanel>
              )) : (
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 17, lineHeight: 1.75 }}>
                  三轮测试证据尚未完整记录。
                </div>
              )}
            </div>
          </ChromePanel>

          <ChromePanel
            contentStyle={{ padding: '30px 34px', display: 'flex', flexDirection: 'column', minHeight: 0 }}
            style={{ minHeight: 0 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ color: 'var(--color-text-primary)', fontSize: 26, fontWeight: 800 }}>
                  结构化裁决
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 6 }}>
                  AI 报告已转写为质检结构块
                </div>
              </div>
              <StatusPill label="状态" value={isGenerating && !isAnalysisLoaded ? '生成中' : '完成'} />
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 10, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {isGenerating && !isAnalysisLoaded ? (
                <SectionBlock section={{ title: '报告生成中', body: '裁决者正在汇总三轮测试证据与样本属性。' }} />
              ) : (
                <>
                  <SectionBlock section={summarySection} />
                  <SectionBlock section={evidenceSection} />
                  <SectionBlock section={finalSection} />
                </>
              )}
            </div>
          </ChromePanel>
        </div>
      )}

      <div style={{ padding: '0 80px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {pageNum > 1 ? (
          <Button variant="secondary" onClick={() => navigate('/endgame/verdict/1')} style={{ width: 220, height: 68 }}>
            上一页
          </Button>
        ) : <div style={{ width: 220 }} />}

        {pageNum < 2 ? (
          <Button variant="primary" onClick={() => navigate('/endgame/verdict/2')} style={{ width: 220, height: 68 }}>
            继续
          </Button>
        ) : (
          <Button variant="primary" onClick={() => navigate('/endgame/chronicle/1')} style={{ width: 220, height: 68 }}>
            继续
          </Button>
        )}
      </div>
    </div>
  );
};
