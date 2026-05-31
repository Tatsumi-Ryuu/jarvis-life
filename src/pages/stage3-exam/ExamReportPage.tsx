import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ATTRIBUTE_LABELS } from '../../types';
import type { AttributeKey } from '../../types';
import { Button } from '../../components/ui/Button';
import { TopBar } from '../../components/ui/TopBar';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { useGameStore } from '../../store/gameStore';
import { formatGameDate } from '../../engine/ap-calculator';
import {
  calculateDirection,
  DIRECTION_FOCUS_ATTRIBUTES,
  DIRECTION_LABELS,
  DIRECTION_DESCRIPTIONS,
  DIRECTION_PLAYER_ADVICE,
} from '../../engine/midterm-direction';
import { useNarrative } from '../../hooks/useNarrative';
import { cleanAIText } from '../../utils/aiText';
import { sf } from '../../utils/font';
import { ExamCompanyBackground } from './ExamCompanyBackground';
import { completeExamFlow } from './completeExamFlow';

const EXAM_COMPLETION_GRANT = 2000;
let examCompletionGrantClaimed = false;

export const ExamReportPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const aiAttributes = useGameStore((s) => s.aiAttributes);
  const aiName = useGameStore((s) => s.aiName);
  const currentMonth = useGameStore((s) => s.currentMonth);
  const resources = useGameStore((s) => s.resources);
  const addFunds = useGameStore((s) => s.addFunds);
  const { getMidtermReport } = useNarrative();

  const partial = aiName ? aiName.charCodeAt(0) % 10000 : 847;
  const aiId = `JL-2040-${String(partial).padStart(4, '0')}`;

  const directionResult = calculateDirection(aiAttributes);
  const focusAttributes = DIRECTION_FOCUS_ATTRIBUTES[directionResult.direction];
  const focusAttributeLabels = focusAttributes.map((key) => ATTRIBUTE_LABELS[key]);
  const playerAdvice = DIRECTION_PLAYER_ADVICE[directionResult.direction];

  const reportInitiatedRef = useRef(false);
  const [reportText, setReportText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const examState = location.state as {
    situationText?: string;
    narrationText?: string;
    thinkingText?: string;
    reasoningText?: string;
    decisionText?: string;
  } | null;

  const situationSummary = examState
    ? [
        examState.narrationText ? `旁白：${examState.narrationText}` : '',
        examState.situationText ? `情境：${examState.situationText}` : '',
        examState.thinkingText ? `AI可见思考：${examState.thinkingText}` : '',
        examState.reasoningText ? `AI思维链：${examState.reasoningText}` : '',
        examState.decisionText ? `AI决定：${examState.decisionText}` : '',
      ].filter(Boolean).join('\n')
    : '';

  useEffect(() => {
    if (reportInitiatedRef.current) return;
    reportInitiatedRef.current = true;
    async function generateReport() {
      setIsLoading(true);
      const text = await getMidtermReport(
        directionResult.direction,
        aiAttributes,
        directionResult.topAttributes,
        situationSummary,
      );
      setReportText(cleanAIText(text));
      setIsLoading(false);
    }
    generateReport();
  }, []);

  const handleContinue = () => {
    if (!examCompletionGrantClaimed) {
      addFunds(EXAM_COMPLETION_GRANT);
      examCompletionGrantClaimed = true;
    }
    completeExamFlow(navigate);
  };

  return (
    <ExamCompanyBackground className="flex flex-col">
        <TopBar
          title="例行体检"
          subtitle="AI体检报告 / 基石工业"
          subtitleOn
          actionPoints={resources.actionPoints}
          funds={resources.funds}
          mentalWear={resources.mentalWear}
          physicalWear={resources.physicalWear}
          onBack={() => navigate('/exam/idle')}
          backLabel="返回待机"
        />

        <div
          className="flex items-center justify-center"
          style={{
            position: 'relative',
            zIndex: 2,
            width: 1920,
            height: 1008,
            paddingTop: 22,
          }}
        >
          <div
            className="flex flex-col"
            style={{
              ...chromePanelStyle({ strong: true, padding: 0 }),
              width: 1220,
              maxHeight: 760,
            }}
          >
            <div style={chromeDecorStyle} />
            <div style={chromeInnerFrameStyle} />

            <div
              className="flex items-center justify-between px-24 flex-shrink-0"
              style={{
                position: 'relative',
                zIndex: 1,
                height: 68,
                borderBottom: '1px solid var(--color-border-soft)',
              }}
            >
              <div className="flex flex-col">
                <span style={{ fontSize: sf(22), fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  基石工业 · AI体检报告
                </span>
                <span style={{ fontSize: sf(13), color: 'var(--color-text-muted)', marginTop: 4 }}>
                  半年度检测记录 / {formatGameDate(currentMonth)}
                </span>
              </div>
              <span
                style={{
                  border: '1px solid var(--color-border-soft)',
                  color: 'var(--color-warm-accent)',
                  fontSize: sf(13),
                  fontWeight: 700,
                  padding: '7px 12px',
                }}
              >
                MIDTERM REPORT
              </span>
            </div>

            <div className="flex" style={{ position: 'relative', zIndex: 1, gap: 32, padding: '28px 40px 24px' }}>
              <div style={{ width: 500 }}>
                <span style={{ fontSize: sf(18), fontWeight: 700, color: 'var(--color-text-primary)', display: 'block', marginBottom: 10 }}>
                  属性状态
                </span>
                <div className="flex flex-col gap-2" style={{ marginBottom: 18 }}>
              <div className="flex justify-between">
                <span style={{ fontSize: sf(18), color: 'var(--color-text-secondary)' }}>AI编号</span>
                <span style={{ fontSize: sf(18), fontWeight: 700, color: 'var(--color-text-primary)' }}>{aiId}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ fontSize: sf(18), color: 'var(--color-text-secondary)' }}>检测日期</span>
                <span style={{ fontSize: sf(18), fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatGameDate(currentMonth)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ fontSize: sf(18), color: 'var(--color-text-secondary)' }}>综合状态</span>
                <span
                  style={{
                    fontSize: sf(16),
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    backgroundColor: 'rgba(255,255,255,0.14)',
                    padding: '2px 16px',
                    border: '1px solid var(--color-border-soft)',
                  }}
                >
                  正常
                </span>
              </div>
            </div>

                <div style={{ height: 1, backgroundColor: 'var(--color-border-soft)', margin: '8px 0 18px 0' }} />

                <div>
              <div
                className="flex items-center px-4"
                style={{
                  height: 40,
                  backgroundColor: 'rgba(255,255,255,0.10)',
                  border: '1px solid var(--color-border-soft)',
                  marginBottom: 4,
                }}
              >
                <span style={{ flex: 1, fontSize: sf(16), fontWeight: 700, color: 'var(--color-text-secondary)' }}>属性</span>
                <span style={{ width: 100, textAlign: 'center', fontSize: sf(16), fontWeight: 700, color: 'var(--color-text-secondary)' }}>数值</span>
                <span style={{ flex: 1, fontSize: sf(16), fontWeight: 700, color: 'var(--color-text-secondary)' }}>评级</span>
              </div>

              {(Object.entries(aiAttributes) as [AttributeKey, number][]).map(([key, val]) => {
                const grade = val >= 70 ? '优秀' : val >= 50 ? '良好' : val >= 30 ? '一般' : '偏低';
                const gradeColor =
                  val >= 70 ? 'var(--color-status-available)'
                  : val >= 50 ? 'var(--color-text-primary)'
                  : val >= 30 ? 'var(--color-warm-accent)'
                  : 'var(--color-danger)';

                return (
                  <div
                    key={key}
                    className="flex items-center px-4"
                    style={{
                      height: 44,
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--color-border-soft)',
                      borderTop: 'none',
                    }}
                  >
                    <span style={{ flex: 1, fontSize: sf(18), color: 'var(--color-text-primary)' }}>
                      {ATTRIBUTE_LABELS[key]}
                    </span>
                    <span style={{ width: 100, textAlign: 'center', fontSize: sf(18), fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {Math.round(val)}
                    </span>
                    <span style={{ flex: 1, fontSize: sf(18), fontWeight: 700, color: gradeColor }}>
                      {grade}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

              <div style={{ width: 610 }}>
                <span style={{ fontSize: sf(18), fontWeight: 700, color: 'var(--color-text-primary)', display: 'block', marginBottom: 10 }}>
              建议培养方向
            </span>
            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                border: '1px solid var(--color-border-soft)',
                padding: '16px 20px',
                marginBottom: 14,
              }}
            >
              <span style={{ fontSize: sf(20), fontWeight: 700, color: 'var(--color-warm-accent)' }}>
                {DIRECTION_LABELS[directionResult.direction]}
              </span>
              <span style={{ fontSize: sf(16), color: 'var(--color-text-secondary)', marginLeft: 12 }}>
                {DIRECTION_DESCRIPTIONS[directionResult.direction]}
              </span>
            </div>

            <span style={{ fontSize: sf(16), fontWeight: 700, color: 'var(--color-text-primary)', display: 'block', marginBottom: 6 }}>
              公司专业评价
            </span>
            {isLoading ? (
              <div
                style={{
                  height: 110,
                  fontSize: sf(16),
                  lineHeight: 1.6,
                  color: 'var(--color-text-muted)',
                  marginBottom: 14,
                }}
              >
                正在生成体检建议...
              </div>
            ) : (
              <div
                style={{
                  fontSize: sf(16),
                  lineHeight: 1.8,
                  color: 'var(--color-text-secondary)',
                  whiteSpace: 'pre-line',
                  height: 110,
                  overflowY: 'auto',
                  paddingRight: 10,
                  marginBottom: 14,
                }}
              >
                {cleanAIText(reportText)}
              </div>
            )}

            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: '1px solid var(--color-border-soft)',
                padding: '16px 20px',
                height: 178,
                overflowY: 'auto',
              }}
            >
              <span style={{ fontSize: sf(16), fontWeight: 700, color: 'var(--color-text-primary)', display: 'block', marginBottom: 8 }}>
                给你的培养建议
              </span>
              <div style={{ fontSize: sf(16), lineHeight: 1.75, color: 'var(--color-text-secondary)' }}>
                建议下一阶段重点培养：{focusAttributeLabels.join('、')}。{playerAdvice.why}
                <br />
                {playerAdvice.futureRole}
              </div>
            </div>
          </div>
        </div>

            <div
              className="flex-shrink-0 flex items-center justify-between"
              style={{
                position: 'relative',
                zIndex: 1,
                padding: '16px 40px 24px',
                borderTop: '1px solid var(--color-border-soft)',
              }}
            >
              <div
                style={{
                  border: '1px solid var(--color-border-soft)',
                  background: 'rgba(255,255,255,0.10)',
                  color: 'var(--color-text-primary)',
                  fontSize: sf(18),
                  fontWeight: 700,
                  padding: '14px 20px',
                  minWidth: 300,
                  textAlign: 'center',
                }}
              >
                维护补贴已发放：+2000
              </div>
              <div className="flex items-center gap-8">
                <Button
                  onClick={handleContinue}
                  style={{ width: 220, height: 70 }}
                >
                  我知道了
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/exam/ask-ai')}
                  style={{ width: 220, height: 70 }}
                >
                  询问AI的意见
                </Button>
              </div>
            </div>
          </div>
        </div>
    </ExamCompanyBackground>
  );
};
