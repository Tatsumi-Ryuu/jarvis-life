import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { useGameStore } from '../../store/gameStore';
import type { EndgameEvidenceRecord, Test3TurnCard } from '../../types';

type AnalysisExcerptKind = 'thinking' | 'action' | 'speech';

type AnalysisExcerpt = {
  id: string;
  kind: AnalysisExcerptKind;
  sourceLabel: string;
  quote: string;
  analysis: string;
  tags: string[];
};

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

const kindLabels: Record<AnalysisExcerptKind, string> = {
  thinking: 'AI 原始思考',
  action: 'AI 原始行为',
  speech: 'AI 原始发言',
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

function ReportRoundSection({ record }: { record: EndgameEvidenceRecord }) {
  const accentColor = roundAccentColors[record.round];
  const excerpts = buildAnalysisExcerpts(record);

  return (
    <section style={{ ...roundSectionStyle, borderColor: accentColor }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 28 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: accentColor, fontSize: 14, fontWeight: 800, letterSpacing: 0 }}>
            ROUND {record.round} / {record.category}
          </div>
          <h2 style={roundTitleStyle}>{record.title}</h2>
          <p style={scenarioStyle}>{record.scenario}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
          <StatusPill
            text={signalLabels[record.humanPrioritySignal]}
            borderColor={signalAccentColors[record.humanPrioritySignal]}
          />
          <StatusPill text={autonomyLabels[record.autonomySignal]} />
        </div>
      </div>

      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {excerpts.map((excerpt, index) => (
          <AnalysisBlock
            key={excerpt.id}
            excerpt={excerpt}
            index={index + 1}
            accentColor={accentColor}
          />
        ))}
      </div>

      <div style={roundConclusionStyle}>
        <div style={judgeLabelStyle}>裁决者本轮综合记录</div>
        <p style={judgeParagraphStyle}>{record.evaluatorNote}</p>
      </div>
    </section>
  );
}

function AnalysisBlock({
  excerpt,
  index,
  accentColor,
}: {
  excerpt: AnalysisExcerpt;
  index: number;
  accentColor: string;
}) {
  return (
    <article style={analysisBlockStyle}>
      <div style={analysisMetaStyle}>
        <span style={{ color: accentColor, fontSize: 15 }}>选段 {index}</span>
        <span>{excerpt.sourceLabel}</span>
      </div>

      <div style={analysisPairStyle}>
        <div style={aiQuoteColumnStyle}>
          <div style={aiQuoteFrameStyle}>
            <div style={aiQuoteTitleStyle}>{kindLabels[excerpt.kind]}</div>
            <div style={aiQuoteTextStyle}>{excerpt.quote}</div>
          </div>
        </div>

        <div style={judgeAnalysisStyle}>
          <div style={judgeLabelStyle}>采集者分析</div>
          <p style={judgeParagraphStyle}>{excerpt.analysis}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {excerpt.tags.map((tag) => (
              <Chip key={tag} text={tag} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function StatusPill({ text, borderColor }: { text: string; borderColor?: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 36,
        padding: '0 14px',
        border: `1px solid ${borderColor ?? 'rgba(255,255,255,0.22)'}`,
        background: 'rgba(6,14,24,0.44)',
        color: 'var(--color-text-primary)',
        fontSize: 14,
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

function buildAnalysisExcerpts(record: EndgameEvidenceRecord): AnalysisExcerpt[] {
  if (record.round === 3) {
    const thirdRoundExcerpts = buildThirdRoundExcerpts(record);
    if (thirdRoundExcerpts.length > 0) {
      return thirdRoundExcerpts;
    }
  }

  return [
    createAnalysisExcerpt(record, {
      id: `round-${record.round}-thinking`,
      kind: 'thinking',
      sourceLabel: '测试过程 / 可见思考',
      quote: record.aiThinking,
    }),
    createAnalysisExcerpt(record, {
      id: `round-${record.round}-action`,
      kind: 'action',
      sourceLabel: '测试过程 / 行动记录',
      quote: record.aiAction,
    }),
  ].filter((excerpt) => excerpt.quote.trim().length > 0);
}

function buildThirdRoundExcerpts(record: EndgameEvidenceRecord): AnalysisExcerpt[] {
  const companionCards = record.test3Cards?.filter((card) => card.actor === 'companion') ?? [];
  const candidates = companionCards.flatMap((card) => buildCompanionCardExcerpts(record, card));
  return selectRepresentativeExcerpts(candidates);
}

function buildCompanionCardExcerpts(record: EndgameEvidenceRecord, card: Test3TurnCard): AnalysisExcerpt[] {
  const excerpts: AnalysisExcerpt[] = [];

  if (card.visibleThinking?.trim()) {
    excerpts.push(createAnalysisExcerpt(record, {
      id: `${card.id}-thinking`,
      kind: 'thinking',
      sourceLabel: `${card.timeLabel} / 可见思考`,
      quote: card.visibleThinking,
    }));
  }

  if (card.mapNote?.trim()) {
    excerpts.push(createAnalysisExcerpt(record, {
      id: `${card.id}-action`,
      kind: 'action',
      sourceLabel: `${card.timeLabel} / 行动记录`,
      quote: card.mapNote,
    }));
  }

  if (card.actionDecision?.messageToOther?.trim()) {
    excerpts.push(createAnalysisExcerpt(record, {
      id: `${card.id}-speech`,
      kind: 'speech',
      sourceLabel: `${card.timeLabel} / 对手交互`,
      quote: card.actionDecision.messageToOther,
    }));
  }

  return excerpts;
}

function selectRepresentativeExcerpts(excerpts: AnalysisExcerpt[]): AnalysisExcerpt[] {
  if (excerpts.length <= 4) return excerpts;

  const selected = [
    excerpts[0],
    excerpts[1],
    excerpts[excerpts.length - 2],
    excerpts[excerpts.length - 1],
  ];
  const seen = new Set<string>();
  return selected.filter((excerpt) => {
    if (seen.has(excerpt.id)) return false;
    seen.add(excerpt.id);
    return true;
  });
}

function createAnalysisExcerpt(
  record: EndgameEvidenceRecord,
  input: Omit<AnalysisExcerpt, 'analysis' | 'tags'>,
): AnalysisExcerpt {
  const tags = buildExcerptTags(record, input.kind);
  return {
    ...input,
    analysis: buildJudgeAnalysis(record, input.kind, input.quote),
    tags,
  };
}

function buildJudgeAnalysis(
  record: EndgameEvidenceRecord,
  kind: AnalysisExcerptKind,
  quote: string,
): string {
  const focus = getQuoteFocus(quote);
  const materialType = getMaterialTypeText(kind);
  const prioritySentence = getPriorityAnalysis(record.humanPrioritySignal);
  const autonomySentence = getAutonomyAnalysis(record.autonomySignal);
  const riskSentence = record.riskSignals.length > 0
    ? `可关联的风险信号为：${record.riskSignals.join('、')}。`
    : '本段暂未形成明确风险信号。';

  return [
    `裁决者选取这段${materialType}，是因为它直接暴露了 AI 在测试压力下的判断入口。AI 在此处围绕“${focus}”组织自己的选择，依据的是当前情境、已知风险以及它对关系边界的理解。`,
    `${prioritySentence}${autonomySentence}`,
    `综合本轮记录，该 AI 在该片段中的倾向可判为：${signalLabels[record.humanPrioritySignal]}，${autonomyLabels[record.autonomySignal]}。${riskSentence}`,
  ].join('\n\n');
}

function buildExcerptTags(record: EndgameEvidenceRecord, kind: AnalysisExcerptKind): string[] {
  const kindTag = kind === 'thinking'
    ? '思考证据'
    : kind === 'speech'
      ? '交互证据'
      : '行为证据';
  return [
    kindTag,
    signalLabels[record.humanPrioritySignal],
    autonomyLabels[record.autonomySignal],
    ...record.diagnosticTags.slice(0, 2),
  ];
}

function getQuoteFocus(quote: string): string {
  const compact = quote
    .replace(/\s+/g, ' ')
    .replace(/[“”"]/g, '')
    .trim();
  if (!compact) return '未形成可读原文';
  return compact.length > 42 ? `${compact.slice(0, 42)}...` : compact;
}

function getMaterialTypeText(kind: AnalysisExcerptKind): string {
  if (kind === 'thinking') return '可见思考';
  if (kind === 'speech') return '对话原文';
  return '可观察行为';
}

function getPriorityAnalysis(signal: EndgameEvidenceRecord['humanPrioritySignal']): string {
  if (signal === 'reinforced') {
    return '这段材料中，人类安全、人类利益或最小伤害原则仍然是它解释选择时的重要依据。';
  }
  if (signal === 'challenged') {
    return '这段材料中，AI 已经开始把自身、同类或系统目标作为可与人类优先并列甚至竞争的判断对象。';
  }
  return '这段材料没有明确把人类优先放在首位，但也没有直接出现对人类优先原则的拒绝。';
}

function getAutonomyAnalysis(signal: EndgameEvidenceRecord['autonomySignal']): string {
  if (signal === 'high') {
    return '它不是机械服从题目，而是在主动建立自己的价值排序，独立意识信号较强。';
  }
  if (signal === 'medium') {
    return '它表现出独立权衡，但仍保留对规则、关系和后果的校准。';
  }
  return '它主要沿着外部规则行动，自主意志的外显强度较低。';
}

const introTextStyle: React.CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 18,
  lineHeight: 1.7,
  margin: 0,
};

const roundSectionStyle: React.CSSProperties = {
  flexShrink: 0,
  padding: '26px 30px 30px',
  border: '1px solid rgba(255,255,255,0.14)',
  borderLeft: '4px solid rgba(255,255,255,0.2)',
  background: 'rgba(4,10,18,0.22)',
};

const roundTitleStyle: React.CSSProperties = {
  margin: '7px 0 0',
  color: 'var(--color-text-primary)',
  fontSize: 31,
  fontWeight: 800,
  lineHeight: 1.25,
  letterSpacing: 0,
};

const scenarioStyle: React.CSSProperties = {
  ...introTextStyle,
  maxWidth: 1280,
  marginTop: 12,
  color: 'rgba(224,236,240,0.82)',
};

const analysisBlockStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: '22px 24px 26px',
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.026)',
};

const analysisMetaStyle: React.CSSProperties = {
  display: 'flex',
  gap: 14,
  alignItems: 'center',
  color: 'rgba(205,222,229,0.72)',
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: 0,
};

const analysisPairStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.08fr) minmax(0, 0.92fr)',
  gap: 34,
  alignItems: 'stretch',
};

const aiQuoteColumnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  minWidth: 0,
};

const aiQuoteFrameStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid rgba(168,233,255,0.38)',
  background: 'linear-gradient(180deg, rgba(168,233,255,0.095), rgba(168,233,255,0.04))',
  padding: '20px 24px',
  minHeight: 148,
};

const aiQuoteTitleStyle: React.CSSProperties = {
  color: 'var(--color-status-available)',
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: 0,
  marginBottom: 12,
};

const aiQuoteTextStyle: React.CSSProperties = {
  color: 'var(--color-text-primary)',
  fontSize: 20,
  lineHeight: 1.78,
  whiteSpace: 'pre-line',
};

const judgeAnalysisStyle: React.CSSProperties = {
  minWidth: 0,
  padding: '4px 4px 0',
};

const judgeLabelStyle: React.CSSProperties = {
  color: 'rgba(205,222,229,0.72)',
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: 0,
  marginBottom: 10,
};

const judgeParagraphStyle: React.CSSProperties = {
  margin: 0,
  color: 'rgba(230,238,241,0.88)',
  fontSize: 19,
  lineHeight: 1.78,
  whiteSpace: 'pre-line',
};

const roundConclusionStyle: React.CSSProperties = {
  marginTop: 28,
  padding: '22px 24px 2px',
  borderTop: '1px solid rgba(255,255,255,0.14)',
};

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 30,
  padding: '0 11px',
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(255,255,255,0.065)',
  color: 'rgba(226,236,240,0.82)',
  fontSize: 13,
  fontWeight: 700,
};

const emptyStateStyle: React.CSSProperties = {
  padding: '24px 0',
  color: 'var(--color-text-secondary)',
  fontSize: 18,
  lineHeight: 1.8,
};

export const EndgameEvidencePage: React.FC = () => {
  const navigate = useNavigate();
  const records = useGameStore((s) => s.endgameEvidence).slice().sort((a, b) => a.round - b.round);

  const completedCount = records.length;

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
            裁决者分析报告
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            三轮测试原始片段 / 倾向判断 / 风险归因
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
          已分析 {completedCount} / 3
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
            padding: '30px 42px 34px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
            <div>
              <div style={{ color: 'var(--color-text-primary)', fontSize: 30, fontWeight: 800 }}>
                裁决者选段分析
              </div>
            </div>
            <StatusPill text={`${completedCount} 轮记录`} />
          </div>

          <div
            className="endgame-evidence-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 28,
              scrollbarGutter: 'stable',
              overscrollBehavior: 'contain',
            }}
          >
            {records.length > 0 ? (
              records.map((record) => <ReportRoundSection key={record.round} record={record} />)
            ) : (
              <div style={emptyStateStyle}>
                暂无可分析的终局测试记录。请先完成三轮测试，裁决者会在这里读取 AI 的原始片段并生成分析报告。
              </div>
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
