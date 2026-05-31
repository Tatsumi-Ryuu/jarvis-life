import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { useNarrative } from '../../hooks/useNarrative';

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
    <section style={{ ...chromePanelStyle({ strong, padding: 0 }), ...style }}>
      <div style={chromeDecorStyle} />
      <div style={chromeInnerFrameStyle} />
      <div style={{ position: 'relative', zIndex: 1, height: '100%', ...contentStyle }}>
        {children}
      </div>
    </section>
  );
}

export const AILetterPage: React.FC = () => {
  const navigate = useNavigate();
  const { getFarewellLetter, isGenerating } = useNarrative();

  const [letterText, setLetterText] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const letterInitiatedRef = useRef(false);
  const [showEpitaph, setShowEpitaph] = useState(false);

  const epitaph = '它问了一个问题，然后学会了等待答案。';

  useEffect(() => {
    if (letterInitiatedRef.current) return;
    letterInitiatedRef.current = true;
    getFarewellLetter().then((text) => {
      setLetterText(text);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isLoaded || !letterText) return;

    setIsTyping(true);
    let idx = 0;
    const timer = setInterval(() => {
      if (idx < letterText.length) {
        setDisplayedText(letterText.slice(0, idx + 1));
        idx++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
        setTimeout(() => setShowEpitaph(true), 800);
      }
    }, 40);
    return () => clearInterval(timer);
  }, [isLoaded, letterText]);

  const handleSkip = () => {
    if (isTyping) {
      setDisplayedText(letterText);
      setIsTyping(false);
      setShowEpitaph(true);
    }
  };

  return (
    <div
      className="relative flex flex-col"
      style={{
        width: 1920,
        height: 1080,
        overflow: 'hidden',
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
      }}
      onClick={handleSkip}
    >
      <ChromePanel
        strong
        style={{ width: 1920, height: 72, flexShrink: 0 }}
        contentStyle={{ display: 'flex', alignItems: 'center', padding: '0 48px' }}
      >
        <div style={{ width: 32, height: 32, border: '1px solid var(--color-border-soft)', background: 'rgba(255,255,255,0.10)', marginRight: 14 }} />
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--color-text-primary)' }}>
            摇篮系统 · 私人来信
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            终局档案 JL-2024-0847 / 来信记录
          </div>
        </div>
        <div style={{ marginLeft: 'auto', color: 'var(--color-status-available)', fontSize: 18, fontWeight: 900 }}>
          已解封
        </div>
      </ChromePanel>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: '42px 120px 40px',
          display: 'grid',
          gridTemplateRows: 'minmax(0, 1fr) auto',
          gap: 28,
        }}
      >
        <ChromePanel
          strong
          style={{ minHeight: 0 }}
          contentStyle={{ padding: '44px 54px 42px', display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22, marginBottom: 26 }}>
            <div
              aria-hidden
              style={{
                width: 64,
                height: 64,
                border: '1px solid var(--color-border-soft)',
                background: 'rgba(255,255,255,0.10)',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 16,
                  right: 16,
                  top: 31,
                  height: 1,
                  background: 'var(--color-border-strong)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  bottom: 16,
                  left: 31,
                  width: 1,
                  background: 'var(--color-border-strong)',
                }}
              />
            </div>
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
                LETTER RECORD
              </div>
              <div style={{ color: 'var(--color-text-primary)', fontSize: 36, fontWeight: 900 }}>
                写给培育者的最后一封信
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--color-border-soft)', marginBottom: 28 }} />

          <div
            className="endgame-evidence-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              paddingRight: 18,
            }}
          >
            {isGenerating && !isLoaded ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 21,
                  fontWeight: 700,
                  color: 'var(--color-text-muted)',
                  lineHeight: 2,
                }}
              >
                正在书写...
              </p>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  lineHeight: 2.08,
                  whiteSpace: 'pre-line',
                }}
              >
                {displayedText}
                {isTyping && <span style={{ opacity: 0.58, fontWeight: 900 }}>｜</span>}
              </p>
            )}
          </div>
        </ChromePanel>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 92 }}>
          {showEpitaph ? (
            <ChromePanel
              style={{ width: 1040, minHeight: 92 }}
              contentStyle={{ padding: '22px 34px', display: 'flex', alignItems: 'center' }}
            >
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 800, marginRight: 24 }}>
                EPITAPH
              </div>
              <div
                style={{
                  color: 'var(--color-text-primary)',
                  fontSize: 24,
                  fontWeight: 800,
                  lineHeight: 1.5,
                }}
              >
                {epitaph}
              </div>
            </ChromePanel>
          ) : (
            <div />
          )}

          {showEpitaph && (
            <Button
              variant="primary"
              onClick={() => navigate('/endgame/player-ending')}
              style={{ width: 220, height: 68 }}
            >
              继续
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
