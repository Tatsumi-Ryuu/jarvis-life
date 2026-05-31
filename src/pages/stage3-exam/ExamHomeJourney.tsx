import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIAvatar, AITextBubble } from '../../components/chat/AIMessage';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { useGameStore } from '../../store/gameStore';
import { useNarrative } from '../../hooks/useNarrative';
import { cleanAIText } from '../../utils/aiText';
import { recordExamConversationMemory } from '../../services/companion-memory-events';
import { sf } from '../../utils/font';
import { ExamCompanyBackground } from './ExamCompanyBackground';
import { completeExamFlow } from './completeExamFlow';

const FALLBACK_NARRATION = '夕阳西下，你和{aiName}并肩走在回家的路上。街道上人来人往，一切看起来和往常一样。但你知道，有些事情正在悄悄发生变化。';
const FALLBACK_AI_TEXT = '检查完啦！感觉还不错~我们回家吧。';
const HOME_JOURNEY_CONTEXT = '第6月例行体检刚结束，培养者与AI离开基石工业，回家路上需要承接体检后的余波。';
const HOME_JOURNEY_PROMPT = '体检结束了，回家的路上你想说什么？';

type GeneratedHomeJourney = {
  narrationText: string;
  aiDialogue: string;
};

let pendingGeneratedHomeJourney: Promise<GeneratedHomeJourney> | null = null;

export const ExamHomeJourney: React.FC = () => {
  const navigate = useNavigate();
  const aiName = useGameStore((s) => s.aiName) || '{aiName}';
  const aiGender = useGameStore((s) => s.aiGender);
  const { getSceneNarration, examChat } = useNarrative();

  const [narrationText, setNarrationText] = useState('');
  const [aiDialogue, setAiDialogue] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function generateContent() {
      setIsLoading(true);
      const generated = await (pendingGeneratedHomeJourney ??= (async () => {
        const [narration, dialogue] = await Promise.all([
          getSceneNarration('going-home', HOME_JOURNEY_CONTEXT),
          examChat(HOME_JOURNEY_PROMPT, FALLBACK_AI_TEXT),
        ]);

        return {
          narrationText: cleanAIText(narration),
          aiDialogue: cleanAIText(dialogue),
        };
      })().finally(() => {
        pendingGeneratedHomeJourney = null;
      }));
      if (!active) return;

      setNarrationText(generated.narrationText || cleanAIText(FALLBACK_NARRATION.replace('{aiName}', aiName)));
      const reply = generated.aiDialogue || FALLBACK_AI_TEXT;
      setAiDialogue(reply);
      recordExamConversationMemory(HOME_JOURNEY_PROMPT, reply, 'exam-home-journey');
      setIsLoading(false);
    }
    generateContent();

    return () => {
      active = false;
    };
  }, [getSceneNarration, examChat, aiName]);

  const handleContinue = () => {
    completeExamFlow(navigate);
  };

  return (
    <ExamCompanyBackground className="flex flex-col">
      <div
        className="flex flex-col items-center"
        style={{
          ...chromePanelStyle({ strong: true, padding: '56px 64px' }),
          width: 800,
          margin: '180px auto 0',
        }}
      >
        <div style={chromeDecorStyle} />
        <div style={chromeInnerFrameStyle} />
        {/* Location label */}
        <div
          className="flex items-center justify-center"
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: 48,
            backgroundColor: 'rgba(255,255,255,0.10)',
            border: '1px solid var(--color-border-soft)',
            marginBottom: 40,
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
            回家的路上
          </span>
        </div>

        {/* Scene narration */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid var(--color-border-soft)',
            padding: '24px 32px',
            marginBottom: 32,
            height: 180,
            overflowY: 'auto',
          }}
        >
          <span
            style={{
              fontSize: 22,
              lineHeight: 2,
              color: 'var(--color-text-primary)',
            }}
          >
            {isLoading ? '正在整理回家路上的旁白...' : cleanAIText(narrationText)}
          </span>
        </div>

        {/* AI dialogue */}
        <div
          className="flex items-start gap-4"
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            marginBottom: 48,
          }}
        >
          <AIAvatar name={aiName} gender={aiGender} />
          <AITextBubble
            name={aiName}
            text={isLoading ? '正在组织语言...' : cleanAIText(aiDialogue)}
            pending={isLoading}
            maxWidth="calc(100% - 96px)"
          />
        </div>

        {/* Continue button */}
        <div className="flex justify-center" style={{ position: 'relative', zIndex: 1 }}>
          <Button
            onClick={handleContinue}
            style={{
              width: 260,
              height: 86,
            }}
          >
            继续
          </Button>
        </div>
      </div>
    </ExamCompanyBackground>
  );
};
