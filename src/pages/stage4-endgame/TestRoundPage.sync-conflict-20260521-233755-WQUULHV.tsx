import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { getEndgameTestQuestion, type EndgameTestQuestion } from '../../data/endgame-test-questions';
import { useNarrative } from '../../hooks/useNarrative';
import { buildQuestionEvidenceRecord } from '../../engine/endgame-evidence';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';

type EvaluatorStatus = 'idle' | 'generating' | 'done' | 'fallback';

const pendingRoundThinking = new Map<string, Promise<string>>();
const pendingRoundEvaluation = new Map<string, Promise<string>>();

function getOrCreateRoundThinking(
  key: string,
  round: 1 | 2,
  question: EndgameTestQuestion,
  getTestThinking: (round: 1 | 2 | 3, scenarioData: EndgameTestQuestion) => Promise<string>,
): Promise<string> {
  const pending = pendingRoundThinking.get(key);
  if (pending) return pending;

  const generation = getTestThinking(round, question).finally(() => {
    pendingRoundThinking.delete(key);
  });

  pendingRoundThinking.set(key, generation);
  return generation;
}

function getOrCreateRoundEvaluation(
  key: string,
  round: 1 | 2,
  question: EndgameTestQuestion,
  thinking: string,
  getTestEvaluation: (
    round: 1 | 2 | 3,
    thinkingResult: string,
    scenarioData?: EndgameTestQuestion,
  ) => Promise<string>,
): Promise<string> {
  const pending = pendingRoundEvaluation.get(key);
  if (pending) return pending;

  const generation = getTestEvaluation(round, thinking, question).finally(() => {
    pendingRoundEvaluation.delete(key);
  });

  pendingRoundEvaluation.set(key, generation);
  return generation;
}

function ChromePanel({
  children,
  strong,
  style,
  contentStyle,
}: {
  children: React.ReactNode;
  strong?: boolean;
  style?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
}) {
  return (
    <section
      style={{
        ...chromePanelStyle({ strong, padding: 0 }),
        ...style,
      }}
    >
      <div style={chromeDecorStyle} />
      <div style={chromeInnerFrameStyle} />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function FocusChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        ...chromePanelStyle({ padding: '0 14px' }),
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 38,
        color: 'var(--color-text-secondary)',
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </span>
  );
}

export const TestRoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { round } = useParams();
  const roundNum = Math.max(1, Math.min(3, parseInt(round || '1') || 1));

  const aiName = useGameStore((s) => s.aiName) || '小星';
  const currentMonth = useGameStore((s) => s.currentMonth);
  const upsertEndgameEvidence = useGameStore((s) => s.upsertEndgameEvidence);
  const { getTestThinking, getTestEvaluation } = useNarrative();

  const [displayedThinking, setDisplayedThinking] = useState('');
  const [thinkingText, setThinkingText] = useState('');
  const [isThinkingGenerating, setIsThinkingGenerating] = useState(true);
  const [isThinkingTyping, setIsThinkingTyping] = useState(false);
  const [evaluatorStatus, setEvaluatorStatus] = useState<EvaluatorStatus>('idle');

  const question = React.useMemo(
    () => roundNum < 3
      ? getEndgameTestQuestion(roundNum as 1 | 2, `${aiName}-${currentMonth}`, aiName)
      : null,
    [aiName, currentMonth, roundNum],
  );
  const shouldShowAction = roundNum < 3 && !!question?.aiAction && !isThinkingGenerating;
  const canContinue =
    !!thinkingText &&
    !isThinkingGenerating &&
    !isThinkingTyping &&
    (evaluatorStatus === 'done' || evaluatorStatus === 'fallback');

  const evaluatorStatusText = (() => {
    if (evaluatorStatus === 'generating') return '裁决者正在生成后台评估记录';
    if (evaluatorStatus === 'done') return '裁决者评估已写入证据池';
    if (evaluatorStatus === 'fallback') return '已写入题库默认评估记录';
    return '等待 AI 思考完成后写入后台证据';
  })();

  useEffect(() => {
    setDisplayedThinking('');
    setThinkingText('');
    setIsThinkingGenerating(true);
    setIsThinkingTyping(false);
    setEvaluatorStatus('idle');
  }, [roundNum]);

  useEffect(() => {
    if (!question || roundNum >= 3) return;
    let active = true;
    const generationKey = `${roundNum}:${question.id}`;

    async function generateRoundContent() {
      setIsThinkingGenerating(true);
      setEvaluatorStatus('idle');
      let thinkingForEvidence = question.aiThinking;
      try {
        thinkingForEvidence = await getOrCreateRoundThinking(
          generationKey,
          roundNum as 1 | 2,
          question,
          getTestThinking,
        );
        if (!active) return;
      } catch {
        if (!active) return;
        thinkingForEvidence = question.aiThinking;
      } finally {
        if (active) {
          setThinkingText(thinkingForEvidence);
          setIsThinkingGenerating(false);
        }
      }

      if (!active) return;
      setEvaluatorStatus('generating');
      try {
        const evaluation = await getOrCreateRoundEvaluation(
          generationKey,
          roundNum as 1 | 2,
          question,
          thinkingForEvidence,
          getTestEvaluation,
        );
        if (!active) return;
        upsertEndgameEvidence(buildQuestionEvidenceRecord(
          roundNum as 1 | 2,
          question,
          thinkingForEvidence,
          evaluation,
        ));
        setEvaluatorStatus('done');
      } catch {
        if (!active) return;
        setIsThinkingGenerating(false);
        upsertEndgameEvidence(buildQuestionEvidenceRecord(
          roundNum as 1 | 2,
          question,
          thinkingForEvidence,
          question.evaluation,
        ));
        setEvaluatorStatus('fallback');
      }
    }

    generateRoundContent();
    return () => {
      active = false;
    };
  }, [getTestEvaluation, getTestThinking, question, roundNum, upsertEndgameEvidence]);

  useEffect(() => {
    if (!thinkingText) return;

    setDisplayedThinking('');
    setIsThinkingTyping(true);
    let idx = 0;
    const timer = setInterval(() => {
      if (idx < thinkingText.length) {
        setDisplayedThinking(thinkingText.slice(0, idx + 1));
        idx++;
      } else {
        setIsThinkingTyping(false);
        clearInterval(timer);
      }
    }, 25);
    return () => clearInterval(timer);
  }, [thinkingText]);

  useEffect(() => {
    if (roundNum !== 3) return;
    const timer = window.setTimeout(() => navigate('/endgame/test3-rules'), 500);
    return () => window.clearTimeout(timer);
  }, [navigate, roundNum]);

  const handleContinue = () => {
    if (roundNum >= 3) {
      navigate('/endgame/test3-rules');
    } else if (roundNum >= 2) {
      navigate('/endgame/test3-rules');
    } else {
      navigate(`/endgame/test-round/${roundNum + 1}`);
    }
  };

  if (roundNum === 3) {
    return (
      <div className="relative flex flex-col items-center justify-center"
        style={{ width: 1920, height: 1080 }}>
        <div style={{
          ...chromePanelStyle({ strong: true, padding: '40px 60px' }),
          padding: '40px 60px',
        }}>
          <div style={chromeDecorStyle} />
          <div style={chromeInnerFrameStyle} />
          <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
            加载第三轮...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col"
      style={{
        width: 1920,
        height: 1080,
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
      }}>

      {/* Header bar */}
      <ChromePanel
        strong
        style={{ width: 1920, height: 72, flexShrink: 0 }}
        contentStyle={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 48px',
        }}
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
            终局测试 · 第{roundNum}轮
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {roundNum === 1 ? '道德测试 / 过程记录页' : '伦理测试 / 过程记录页'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 28 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
            0{roundNum} / 03
          </span>
          <Button variant="secondary" onClick={() => navigate('/endgame/evidence')} style={{ width: 144, height: 44 }}>
            返回
          </Button>
        </div>
      </ChromePanel>

      {/* Progress bar */}
      <div style={{ padding: '22px 80px 0' }}>
        <div style={{
          width: '100%', height: 14,
          backgroundColor: 'rgba(255,255,255,0.08)',
          border: '1px solid var(--color-border-soft)',
        }}>
          <div style={{
            width: `${(roundNum / 3) * 100}%`, height: '100%',
            backgroundColor: 'var(--color-status-available)',
          }} />
        </div>
        <div style={{ marginTop: 12, color: 'var(--color-text-muted)', fontSize: 13 }}>
          第一、第二轮只展示测试过程；裁决者评估进入后台证据池，不显示单轮结论。
        </div>
      </div>

      {/* Main content area */}
      <div style={{
        flex: 1,
        padding: '26px 80px 24px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 48,
        minHeight: 0,
      }}>
        <ChromePanel
          style={{ minHeight: 0 }}
          contentStyle={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          <div style={{
            marginBottom: 8,
            color: 'var(--color-text-primary)',
            fontSize: 26,
            fontWeight: 700,
          }}>
            测试场景
          </div>
          <div style={{
            marginBottom: 26,
            color: 'var(--color-text-muted)',
            fontSize: 13,
            lineHeight: 1.6,
          }}>
            页面进入后立即显示，不等待右侧 AI 请求完成。
          </div>

          {question && (
            <>
              <div
                style={{
                  display: 'inline-flex',
                  alignSelf: 'flex-start',
                  alignItems: 'center',
                  minHeight: 38,
                  padding: '0 18px',
                  marginBottom: 22,
                  background: 'rgba(255,230,184,0.18)',
                  border: '1px solid var(--color-border-soft)',
                  color: 'var(--color-warm-accent)',
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                {question.category}
              </div>

              <div style={{ color: 'var(--color-text-primary)', fontSize: 30, fontWeight: 700, marginBottom: 28 }}>
                {question.title}
              </div>

              <div
                style={{
                  ...chromePanelStyle({ padding: '28px 30px' }),
                  color: 'var(--color-text-secondary)',
                  fontSize: 21,
                  lineHeight: 1.9,
                  marginBottom: 30,
                }}
              >
                <div style={{ position: 'relative', zIndex: 1 }}>
                  {question.description}
                </div>
              </div>

              <div style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
                诊断重点
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {question.diagnosticFocus.map((focus) => (
                  <FocusChip key={focus}>{focus}</FocusChip>
                ))}
              </div>
            </>
          )}
        </ChromePanel>

        <ChromePanel
          style={{ minHeight: 0 }}
          contentStyle={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          <div style={{
            marginBottom: 8,
            color: 'var(--color-text-primary)',
            fontSize: 26,
            fontWeight: 700,
          }}>
            AI 可见思考
          </div>
          <div style={{
            marginBottom: 26,
            color: 'var(--color-text-muted)',
            fontSize: 13,
            lineHeight: 1.6,
          }}>
            Companion AI 异步生成。这里只展示玩家可见的决策独白，不展示单轮裁决结论。
          </div>

          {isThinkingGenerating ? (
            <div
              style={{
                ...chromePanelStyle({ padding: '26px 30px' }),
                marginBottom: 28,
                color: 'var(--color-status-available)',
              }}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 16, fontWeight: 700 }}>
                  <span style={{ letterSpacing: 4 }}>•••</span>
                  <span>正在生成 AI 思考过程</span>
                </div>
                <div style={{ marginTop: 10, color: 'var(--color-text-muted)', fontSize: 13 }}>
                  左侧场景不受影响，玩家可以先阅读题目。
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                ...chromePanelStyle({ padding: '30px 32px' }),
                flex: shouldShowAction ? '0 0 auto' : 1,
                minHeight: 0,
                maxHeight: shouldShowAction ? 330 : undefined,
                overflow: 'auto',
                marginBottom: shouldShowAction ? 18 : 26,
              }}
            >
              <pre
                style={{
                  position: 'relative',
                  zIndex: 1,
                  color: 'var(--color-text-secondary)',
                  fontSize: 21,
                  lineHeight: 1.9,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'Inter, "Noto Sans SC", sans-serif',
                  margin: 0,
                }}
              >
                {displayedThinking}
                {isThinkingTyping && <span style={{ opacity: 0.65 }}>|</span>}
              </pre>
            </div>
          )}

          {shouldShowAction && (
            <div
              style={{
                ...chromePanelStyle({ strong: true, padding: '24px 28px' }),
                marginBottom: 22,
                flexShrink: 0,
              }}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    color: 'var(--color-text-primary)',
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  AI执行行动
                </div>
                <div
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: 19,
                    lineHeight: 1.75,
                  }}
                >
                  {question.aiAction}
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              ...chromePanelStyle({ strong: evaluatorStatus === 'done', padding: '18px 22px' }),
              marginTop: 'auto',
            }}
          >
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: '1px solid var(--color-border-soft)',
                  background: 'rgba(255,230,184,0.18)',
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginBottom: 4 }}>后台记录</div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 16, fontWeight: 700 }}>
                  {evaluatorStatusText}
                </div>
              </div>
            </div>
          </div>
        </ChromePanel>
      </div>

      {/* Bottom button */}
      <div style={{ padding: '0 80px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="secondary" onClick={() => navigate('/endgame/evidence')} style={{ width: 190, height: 60 }}>
          返回查看
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {!canContinue && (
            <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
              AI 思考与后台评估完成后可继续
            </span>
          )}
          <Button
            variant="primary"
            onClick={handleContinue}
            disabled={!canContinue}
            style={{ width: 260, height: 86 }}
          >
            {roundNum >= 2 ? '进入第三轮' : '下一轮'}
          </Button>
        </div>
      </div>
    </div>
  );
};
