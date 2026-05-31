import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIAvatar, AITextBubble, splitTextIntoChatLines } from '../../components/chat/AIMessage';
import { Button } from '../../components/ui/Button';
import { TopBar } from '../../components/ui/TopBar';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { useGameStore } from '../../store/gameStore';
import { useNarrative } from '../../hooks/useNarrative';
import { cleanAIText } from '../../utils/aiText';
import { sf } from '../../utils/font';
import { ExamCompanyBackground } from './ExamCompanyBackground';
import { completeExamFlow } from './completeExamFlow';
import { recordExamConversationMemory } from '../../services/companion-memory-events';

type Phase = 'loading' | 'input' | 'ai-reply' | 'reply-loading';

const FALLBACK_INITIAL_TEXT =
  '检查结果...还行吧。他们说我很健康，但我总觉得他们在看一些我看不到的东西。';

const FALLBACK_REPLY_TEXT = '我明白你的意思了。谢谢你把这些告诉我，我会带着这份确认回家。';

export const ExamAskAIPage: React.FC = () => {
  const navigate = useNavigate();
  const aiName = useGameStore((s) => s.aiName) || '小星';
  const aiGender = useGameStore((s) => s.aiGender);
  const resources = useGameStore((s) => s.resources);
  const { examChat } = useNarrative();

  const [phase, setPhase] = useState<Phase>('loading');
  const [playerInput, setPlayerInput] = useState('');
  const [playerMessage, setPlayerMessage] = useState('');
  const [aiInitialText, setAiInitialText] = useState('');
  const [aiReplyText, setAiReplyText] = useState('');

  const initiatedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initiatedRef.current) return;
    initiatedRef.current = true;

    async function generateInitial() {
      const reply = cleanAIText(await examChat(
        '体检结束了，你觉得怎么样？刚才那些仪器检查的时候，你在想什么？',
        FALLBACK_INITIAL_TEXT,
      ));
      setAiInitialText(reply);
      recordExamConversationMemory('体检结束了，你觉得怎么样？刚才那些仪器检查的时候，你在想什么？', reply, 'exam-ask-initial');
      setPhase('input');
    }

    generateInitial();
  }, [examChat]);

  useEffect(() => {
    if (phase === 'input' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const body = scrollBodyRef.current;
      if (!body) return;
      body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [phase, aiInitialText, aiReplyText, playerMessage]);

  const handleSend = async () => {
    const message = playerInput.trim();
    if (!message || phase !== 'input') return;

    setPlayerMessage(message);
    setPlayerInput('');
    setPhase('reply-loading');

    const closingPrompt = [
      '这是中期体检后的唯一一次回应。',
      `培养者刚才对我说："${message}"`,
      '请你作为养成AI，用第一人称简短总结你听懂了什么、这句话让你安心或意识到什么，并用结束语收束这段对话。',
      '不要继续追问，不要提出新的问题，不要邀请培养者继续回答，不要开启第二轮对话。',
      '控制在2-3句话。',
    ].join('\n');
    const reply = cleanAIText(await examChat(closingPrompt, FALLBACK_REPLY_TEXT));
    setAiReplyText(reply);
    recordExamConversationMemory(message, reply, 'exam-ask-followup');
    setPhase('ai-reply');
  };

  const handleContinue = () => {
    completeExamFlow(navigate);
  };

  const handleBack = () => {
    navigate('/exam/report');
  };

  const displayInitial = cleanAIText(aiInitialText);
  const displayReply = cleanAIText(aiReplyText);
  const initialLines = splitTextIntoChatLines(displayInitial);
  const replyLines = splitTextIntoChatLines(displayReply);

  return (
    <ExamCompanyBackground className="flex flex-col">
        <TopBar
          title="例行体检"
          subtitle="体检后的对话 / 基石工业"
          subtitleOn
          actionPoints={resources.actionPoints}
          funds={resources.funds}
          mentalWear={resources.mentalWear}
          physicalWear={resources.physicalWear}
          onBack={handleBack}
          backLabel="返回报告"
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
              width: 960,
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
                  体检后的对话
                </span>
                <span style={{ fontSize: sf(13), color: 'var(--color-text-muted)', marginTop: 4 }}>
                  你只有一次追问机会，可以问问它刚才真正感受到的事
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
                MIDTERM CHECK
              </span>
            </div>

            <div
              ref={scrollBodyRef}
              className="flex flex-col gap-18 flex-1"
              style={{ position: 'relative', zIndex: 1, padding: '28px 32px', overflow: 'auto', minHeight: 0 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 160, flexShrink: 0 }}>
                {phase === 'loading' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AIAvatar name={aiName} gender={aiGender} />
                    <AITextBubble name={aiName} text="正在整理刚才的感受..." pending maxWidth="78%" />
                  </div>
                ) : (
                  initialLines.map((line, index) => (
                    <div key={`${line}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <AIAvatar name={aiName} gender={aiGender} />
                      <AITextBubble name={aiName} text={line} maxWidth="78%" />
                    </div>
                  ))
                )}
              </div>

              {playerMessage && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    minHeight: 120,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, width: '100%' }}>
                    <div
                      style={{
                        maxWidth: '72%',
                        background: 'rgba(255,255,255,0.18)',
                        border: '1px solid var(--color-border-soft)',
                        padding: '12px 16px',
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
                        clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: sf(14), lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
                        {playerMessage}
                      </p>
                    </div>
                    <div
                      className="talk-avatar-frame"
                      style={{
                        width: 80,
                        height: 80,
                        minWidth: 80,
                        minHeight: 80,
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.16)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-primary)',
                        fontSize: sf(24),
                        fontWeight: 800,
                        flexShrink: 0,
                        border: '1px solid var(--color-border-soft)',
                      }}
                    >
                      我
                    </div>
                  </div>

                  {phase === 'reply-loading' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <AIAvatar name={aiName} gender={aiGender} />
                      <AITextBubble name={aiName} text="正在回应..." pending maxWidth="78%" />
                    </div>
                  ) : (
                    replyLines.map((line, index) => (
                      <div key={`${line}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <AIAvatar name={aiName} gender={aiGender} />
                        <AITextBubble name={aiName} text={line} maxWidth="78%" />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div
              className="flex-shrink-0 flex flex-col items-center"
              style={{
                position: 'relative',
                zIndex: 1,
                padding: '16px 32px 24px',
                minHeight: 116,
                borderTop: '1px solid var(--color-border-soft)',
              }}
            >
              {phase === 'input' ? (
                <div className="flex flex-col gap-4" style={{ width: '100%' }}>
                  <div style={{ width: '100%', padding: '0 4px' }}>
                    <div style={{ borderTop: '1px dashed rgba(244,252,255,0.38)', paddingTop: 12 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: sf(15),
                          lineHeight: 1.7,
                          color: 'rgba(244,252,255,0.92)',
                          letterSpacing: '0.01em',
                          textAlign: 'center',
                        }}
                      >
                        体检已经结束。你可以问它一个问题，或告诉它你对这份报告的看法。
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-16" style={{ width: '100%' }}>
                    <div
                      style={{
                        flex: 1,
                        ...chromePanelStyle({ padding: 8 }),
                        height: 60,
                      }}
                    >
                      <div style={chromeDecorStyle} />
                      <div style={chromeInnerFrameStyle} />
                      <input
                        ref={inputRef}
                        type="text"
                        value={playerInput}
                        onChange={(e) => setPlayerInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                        placeholder={`输入你想对${aiName}说的话...`}
                        style={{
                          position: 'relative',
                          zIndex: 1,
                          width: '100%',
                          height: '100%',
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          border: '1px solid var(--color-border-soft)',
                          outline: 'none',
                          fontSize: sf(18),
                          color: 'var(--color-text-primary)',
                          padding: '0 16px',
                          fontFamily: 'Inter, "Noto Sans SC", sans-serif',
                        }}
                      />
                    </div>
                    <Button
                      variant="secondary"
                      onClick={handleSend}
                      disabled={playerInput.trim().length === 0}
                      style={{
                        width: 132,
                        height: 60,
                      }}
                    >
                      发送
                    </Button>
                  </div>
                </div>
              ) : phase === 'ai-reply' ? (
                <Button onClick={handleContinue}>
                  继续
                </Button>
              ) : null}
            </div>
          </div>
        </div>
    </ExamCompanyBackground>
  );
};
