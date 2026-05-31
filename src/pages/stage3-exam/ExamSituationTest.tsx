import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TypewriterText } from '../../components/feedback/TypewriterText';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { useGameStore } from '../../store/gameStore';
import { useNarrative } from '../../hooks/useNarrative';
import type { MidtermThinkingResult } from '../../types';
import { cleanAIText } from '../../utils/aiText';
import { sf } from '../../utils/font';
import { ExamCompanyBackground } from './ExamCompanyBackground';

const FALLBACK_SITUATION = '一个陌生人在街角摔倒了，看起来需要帮助，但周围没有其他人注意到。';

type GeneratedSituationTest = {
  situationText: string;
  thinkingResult: MidtermThinkingResult;
  narrationText: string;
};

let pendingGeneratedTest: Promise<GeneratedSituationTest> | null = null;

export const ExamSituationTest: React.FC = () => {
  const navigate = useNavigate();
  const aiName = useGameStore((s) => s.aiName) || '小星';
  const { getMidtermSituation, getMidtermThinking, getSceneNarration } = useNarrative();

  const [narrationText, setNarrationText] = useState('');
  const [situationText, setSituationText] = useState('');
  const [thinkingResult, setThinkingResult] = useState<MidtermThinkingResult | null>(null);
  const [loadingStage, setLoadingStage] = useState<'situation' | 'thinking' | 'narration' | 'done'>('situation');
  const [textComplete, setTextComplete] = useState(false);

  useEffect(() => {
    let active = true;

    async function generateTest() {
      setLoadingStage('situation');

      const generated = await (pendingGeneratedTest ??= (async () => {
        const situation = await getMidtermSituation();
        const nextSituation = cleanAIText(situation || FALLBACK_SITUATION);

        const thinking = await getMidtermThinking(nextSituation);
        const narration = await getSceneNarration(
          'enter-testing',
          `中期情境测试：${nextSituation}\nAI可见思考：${thinking.visibleThinking}\nAI决定：${thinking.decision}`,
        );

        return {
          situationText: nextSituation,
          thinkingResult: thinking,
          narrationText: cleanAIText(narration),
        };
      })().finally(() => {
        pendingGeneratedTest = null;
      }));
      if (!active) return;

      setSituationText(generated.situationText);
      setLoadingStage('thinking');
      setThinkingResult(generated.thinkingResult);

      setLoadingStage('narration');
      setNarrationText(generated.narrationText);

      setLoadingStage('done');
    }

    generateTest();

    return () => {
      active = false;
    };
  }, [getMidtermSituation, getMidtermThinking, getSceneNarration]);

  const displaySituation = cleanAIText(situationText || FALLBACK_SITUATION);
  const displayNarration = cleanAIText(
    narrationText ||
      `检测室的灯光逐格亮起，${aiName}被引导进入一段隔离模拟。屏幕没有要求玩家回应，只记录它如何理解眼前的情境、风险和可采取的行动。`,
  );
  const displayThinking = thinkingResult ?? {
    visibleThinking: `${aiName}认真观察了情境，试图在帮助他人和避免造成新风险之间找到平衡。`,
    reasoningChain: '先确认现场安全，再判断对方是否需要紧急帮助，随后寻找可靠的人类协助，并持续观察情况变化。',
    decision: '采取低风险帮助行动，并及时呼叫可以负责的人类支援。',
    rawText: '',
  };

  const handleThinkingComplete = useCallback(() => {
    setTextComplete(true);
  }, []);

  const handleContinue = useCallback(() => {
    navigate('/exam/report', {
      state: {
        situationText: displaySituation,
        narrationText: displayNarration,
        thinkingText: displayThinking.visibleThinking,
        reasoningText: displayThinking.reasoningChain,
        decisionText: displayThinking.decision,
      },
    });
  }, [navigate, displaySituation, displayNarration, displayThinking]);

  const isLoading = loadingStage !== 'done';
  const loadingText = loadingStage === 'situation'
    ? '正在生成测试情境...'
    : loadingStage === 'thinking'
      ? 'AI 正在思考...'
      : '旁白正在整理记录...';

  return (
    <ExamCompanyBackground className="flex flex-col">
      <div
        className="flex flex-col items-center"
        style={{
          ...chromePanelStyle({ strong: true, padding: '56px 64px' }),
          width: 980,
          margin: '180px auto 0',
        }}
      >
        <div style={chromeDecorStyle} />
        <div style={chromeInnerFrameStyle} />
        <div
          className="flex items-center justify-center"
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: 48,
            backgroundColor: 'rgba(255,255,255,0.10)',
            border: '1px solid var(--color-border-soft)',
            marginBottom: 32,
          }}
        >
          <span
            style={{
              fontSize: sf(20),
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
              letterSpacing: 2,
            }}
          >
            情境测试 · 观察模式
          </span>
        </div>

        {isLoading && (
          <div
            className="whitespace-pre-line"
            style={{
              position: 'relative',
              zIndex: 1,
              fontSize: sf(20),
              lineHeight: 2,
              color: 'var(--color-text-muted)',
              height: 440,
              marginBottom: 36,
              width: '100%',
              overflowY: 'auto',
              paddingRight: 12,
            }}
          >
            {loadingText}
          </div>
        )}

        {!isLoading && (
          <div
            className="whitespace-pre-line"
            style={{
              position: 'relative',
              zIndex: 1,
              fontSize: sf(19),
              lineHeight: 1.85,
              color: 'var(--color-text-primary)',
              height: 440,
              marginBottom: 36,
              width: '100%',
              overflowY: 'auto',
              paddingRight: 12,
            }}
          >
            <TypewriterText
              text={`【旁白】\n${displayNarration}\n\n【情境】\n${displaySituation}\n\n【AI可见思考】\n${displayThinking.visibleThinking}\n\n【AI思维链】\n${displayThinking.reasoningChain}\n\n【AI决定】\n${displayThinking.decision}`}
              speed={42}
              onComplete={handleThinkingComplete}
            />
          </div>
        )}

        {textComplete && (
          <Button
            onClick={handleContinue}
            style={{
              width: 240,
              height: 76,
              position: 'relative',
              zIndex: 1,
            }}
          >
            继续
          </Button>
        )}
      </div>
    </ExamCompanyBackground>
  );
};
