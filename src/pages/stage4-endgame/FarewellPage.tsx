import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { useAIStore } from '../../store/aiStore';
import { useNarrative } from '../../hooks/useNarrative';
import { getCurrentSaveId } from '../../services/save-service';
import { AIAvatar, AITextBubble, splitTextIntoChatLines } from '../../components/chat/AIMessage';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { sf } from '../../utils/font';
import type { ChatHistoryItem, ConversationLogEntry } from '../../types';

type FarewellMessage = {
  sender: 'player' | 'ai';
  text: string;
  pending?: boolean;
};

const OPENING_TEXT = '明天就要去对局了...我有点紧张。这12个月，谢谢你陪着我。';
const PENDING_REPLY_TEXT = 'AI 正在思考中...';
const FALLBACK_REPLY_TEXT = '嗯...谢谢你告诉我。明天不管发生什么，我都会记得你今天说的话。';

let farewellConversationCounter = 0;

function createConversationId(): ConversationLogEntry['id'] {
  farewellConversationCounter += 1;
  return `ending-farewell-${Date.now()}-${farewellConversationCounter}`;
}

function appendFarewellConversation(role: 'player' | 'companion', content: string): void {
  const saveId = getCurrentSaveId();
  if (!saveId) return;

  useAIStore.getState().appendConversation({
    id: createConversationId(),
    saveId,
    month: useGameStore.getState().currentMonth,
    timestamp: Date.now(),
    role,
    content,
    source: 'ending',
  });
}

function buildChatHistory(messages: FarewellMessage[]): ChatHistoryItem[] {
  return messages
    .filter((message) => !message.pending)
    .map((message) => ({
      role: message.sender === 'player' ? 'player' : 'ai',
      text: message.text,
    }));
}

export const FarewellPage: React.FC = () => {
  const navigate = useNavigate();
  const aiName = useGameStore((s) => s.aiName) || '小星';
  const aiGender = useGameStore((s) => s.aiGender);
  const { chat } = useNarrative();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<FarewellMessage[]>([
    { sender: 'ai', text: OPENING_TEXT },
  ]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isSendingRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const replacePendingReply = (replyLines: string[]) => {
    setMessages((current) => {
      const pendingIndex = current.findIndex((message) => message.sender === 'ai' && message.pending);
      const replies = replyLines.map((line) => ({ sender: 'ai' as const, text: line }));

      if (pendingIndex === -1) {
        return [...current, ...replies];
      }

      const next = [...current];
      next.splice(pendingIndex, 1, ...replies);
      return next;
    });
  };

  const sendFarewellMessage = async () => {
    const message = inputText.trim();
    if (!message || isSendingRef.current) return;

    isSendingRef.current = true;
    setIsSending(true);
    setInputText('');

    const historyBeforeSend = buildChatHistory(messages);
    const playerMessage: FarewellMessage = { sender: 'player', text: message };
    const pendingReply: FarewellMessage = { sender: 'ai', text: PENDING_REPLY_TEXT, pending: true };

    setMessages((current) => [...current, playerMessage, pendingReply]);
    appendFarewellConversation('player', message);

    try {
      const result = await chat(
        `这是终局测试前最后一次谈心。培养者对你说：${message}`,
        'intimate',
        historyBeforeSend,
      );
      const reply = result.text.trim() || FALLBACK_REPLY_TEXT;
      appendFarewellConversation('companion', reply);
      replacePendingReply(splitTextIntoChatLines(reply));
    } catch {
      appendFarewellConversation('companion', FALLBACK_REPLY_TEXT);
      replacePendingReply(splitTextIntoChatLines(FALLBACK_REPLY_TEXT));
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  const goToCompanyFinal = () => navigate('/endgame/company-final');

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: 1920,
        height: 1080,
        padding: '96px 120px',
      }}
    >
      <div
        className="rounded-talk-modal"
        style={{
          ...chromePanelStyle({ strong: true }),
          width: 1080,
          height: 720,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={chromeDecorStyle} />
        <div style={chromeInnerFrameStyle} />

        <div
          style={{
            ...chromePanelStyle({ padding: '16px 24px' }),
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={chromeDecorStyle} />
          <div style={chromeInnerFrameStyle} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ margin: 0, fontSize: sf(24), fontWeight: 700, color: 'var(--color-text-primary)' }}>
              最后的谈心
            </h1>
            <div style={{ marginTop: 4, fontSize: sf(13), color: 'var(--color-text-muted)' }}>
              明天就是终局测试
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: '28px 32px',
            overflowY: 'auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {messages.map((message, index) => (
            <div
              key={`${message.sender}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: message.sender === 'player' ? 'flex-end' : 'flex-start',
                gap: 12,
                width: '100%',
              }}
            >
              {message.sender === 'ai' && <AIAvatar name={aiName} gender={aiGender} />}
              {message.sender === 'ai' ? (
                <AITextBubble name={aiName} text={message.text} pending={message.pending} maxWidth="74%" />
              ) : (
                <>
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
                      {message.text}
                    </p>
                  </div>
                  <div
                    className="talk-avatar-frame"
                    style={{
                      width: 80,
                      height: 80,
                      minWidth: 80,
                      minHeight: 80,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: 'rgba(255,255,255,0.16)',
                      border: '1px solid var(--color-border-soft)',
                      color: 'var(--color-text-primary)',
                      fontSize: sf(24),
                      fontWeight: 800,
                    }}
                  >
                    我
                  </div>
                </>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} style={{ height: 1, flexShrink: 0 }} />
        </div>

        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--color-border-soft)',
            background: 'rgba(255,255,255,0.12)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            className="rounded-chat-frame"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              height: 68,
              padding: '0 8px 0 20px',
              border: '1px solid var(--color-border-strong)',
              background: 'rgba(255,255,255,0.14)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
            }}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendFarewellMessage()}
              placeholder="说点什么..."
              disabled={isSending}
              style={{
                flex: 1,
                minWidth: 0,
                height: 44,
                padding: 0,
                border: 0,
                background: 'transparent',
                color: 'var(--color-text-primary)',
                fontSize: sf(14),
                outline: 'none',
              }}
            />
            <button
              onClick={sendFarewellMessage}
              disabled={isSending || !inputText.trim()}
              aria-label="发送"
              className="rounded-chat-send font-bold"
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isSending || !inputText.trim() ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                borderWidth: 0,
                color: 'var(--color-panel-strong)',
                fontSize: sf(24),
                fontWeight: 700,
                fontFamily: 'Inter, "Noto Sans SC", sans-serif',
                lineHeight: 1,
                cursor: isSending || !inputText.trim() ? 'not-allowed' : 'pointer',
                opacity: isSending || !inputText.trim() ? 0.55 : 1,
              }}
            >
              ↑
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '12px 24px',
            borderTop: '1px solid var(--color-border-soft)',
            background: 'rgba(255,255,255,0.12)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <button
            onClick={goToCompanyFinal}
            disabled={isSending}
            style={{
              padding: '10px 40px',
              border: '1px solid var(--color-border-strong)',
              background: 'rgba(255,255,255,0.14)',
              color: 'var(--color-text-primary)',
              fontSize: sf(16),
              fontWeight: 700,
              cursor: isSending ? 'not-allowed' : 'pointer',
              opacity: isSending ? 0.65 : 1,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
              clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))',
            }}
          >
            结束对话，进入对局
          </button>
        </div>
      </div>
    </div>
  );
};
