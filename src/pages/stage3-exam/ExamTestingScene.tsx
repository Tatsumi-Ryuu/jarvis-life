import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TypewriterText } from '../../components/feedback/TypewriterText';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { useGameStore } from '../../store/gameStore';
import { useNarrative } from '../../hooks/useNarrative';
import { cleanAIText } from '../../utils/aiText';
import { sf } from '../../utils/font';
import { ExamCompanyBackground } from './ExamCompanyBackground';

export const ExamTestingScene: React.FC = () => {
  const navigate = useNavigate();
  const aiName = useGameStore((s) => s.aiName) || '小星';
  const { getSceneNarration } = useNarrative();

  const FALLBACK_TEXT = `检测室里灯光明亮。${aiName}坐在检测台上，各种仪器开始运转。你注意到${aiName}的手指微微握紧。`;

  const narrationInitiatedRef = useRef(false);
  const [sceneText, setSceneText] = useState('');
  const [textComplete, setTextComplete] = useState(false);

  useEffect(() => {
    if (narrationInitiatedRef.current) return;
    narrationInitiatedRef.current = true;
    getSceneNarration('enter-testing').then((text) => setSceneText(cleanAIText(text)));
  }, [getSceneNarration]);

  const displayText = cleanAIText(sceneText || FALLBACK_TEXT);

  const handleTypewriterComplete = useCallback(() => {
    setTextComplete(true);
  }, []);

  return (
    <ExamCompanyBackground className="flex flex-col">
      {/* Scene panel */}
      <div
        className="flex flex-col items-center"
        style={{
          ...chromePanelStyle({ strong: true, padding: '56px 64px' }),
          width: 800,
          margin: '230px auto 0',
        }}
      >
        <div style={chromeDecorStyle} />
        <div style={chromeInnerFrameStyle} />
        {/* Scene label */}
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
            检测进行中...
          </span>
        </div>

        {/* Typewriter text */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            fontSize: sf(22),
            lineHeight: 2,
            color: 'var(--color-text-primary)',
            height: 260,
            marginBottom: 40,
            overflowY: 'auto',
            paddingRight: 12,
            width: '100%',
          }}
        >
          {!sceneText ? (
            <span style={{ color: 'var(--color-text-muted)' }}>检测准备中...</span>
          ) : (
            <TypewriterText
              text={displayText}
              speed={60}
              onComplete={handleTypewriterComplete}
            />
          )}
        </div>

        {textComplete && (
          <Button
            onClick={() => navigate('/exam/situation')}
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
