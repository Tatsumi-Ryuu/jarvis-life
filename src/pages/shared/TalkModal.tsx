import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { SaveId } from '../../types';
import { useAIStore } from '../../store/aiStore';
import { useNarrative } from '../../hooks/useNarrative';
import { sf } from '../../utils/font';
import { getStickerId, assetMap } from '../../data/asset-map';
import { getCurrentSaveId } from '../../services/save-service';
import { consolidateCompanionMemory } from '../../services/memory-archive-service';
import { isEventForCurrentSave } from '../../engine/narrative/core/memory-manager';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { AIAvatar, AITextBubble, splitTextIntoChatLines } from '../../components/chat/AIMessage';

interface TalkModalProps {
  open: boolean;
  onClose: () => void;
  initialMessage?: string;
  onInitialMessageConsumed?: () => void;
  bgAssetId?: string;
}

interface ChatMessage {
  sender: 'player' | 'ai';
  type: 'text' | 'sticker';
  text?: string;
  stickerEmotion?: string;
  pending?: boolean;
}

const PENDING_REPLY_TEXT = 'AI 正在思考中…';
const CLOSING_MESSAGE_VISIBLE_MS = 2000;

function buildRecentEventsSummary(): string {
  const eventLog = useAIStore.getState().eventLog;
  const recent = eventLog.filter(isEventForCurrentSave).slice(-5);
  if (recent.length === 0) return '';
  return recent.map((e) => `[第${e.month}月] ${e.summary}`).join('\n');
}

let convCounter = 0;
let sessionCounter = 0;

function createConversationId(): string {
  convCounter += 1;
  return `conv-${Date.now()}-${convCounter}`;
}

function createSessionId(): string {
  sessionCounter += 1;
  return `talk-session-${Date.now()}-${sessionCounter}`;
}

function logConversation(
  role: 'player' | 'companion',
  content: string,
  source: 'talk-modal' | 'talk-session-start' | 'talk-session-end',
  saveId: string | null,
): void {
  if (!saveId) return;
  useAIStore.getState().appendConversation({
    id: createConversationId(),
    saveId: saveId as SaveId,
    month: useGameStore.getState().currentMonth,
    timestamp: Date.now(),
    role,
    content,
    source,
  });
}

const TalkModal: React.FC<TalkModalProps> = ({
  open,
  onClose,
  initialMessage = '',
  onInitialMessageConsumed,
  bgAssetId,
}) => {
  const aiName = useGameStore((s) => s.aiName) || '小星';
  const aiGender = useGameStore((s) => s.aiGender);
  const { chat, getTalkClosing, getTalkOpening, isGenerating } = useNarrative();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [opened, setOpened] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isSendingRef = useRef(false);
  const isClosingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const sessionSaveIdRef = useRef<string | null>(null);
  const sessionEndedRef = useRef(true);

  const appendSystemMarker = (content: string, source: 'talk-session-start' | 'talk-session-end') => {
    logConversation('companion', content, source, sessionSaveIdRef.current);
  };

  const replacePendingReply = (nextMessages: ChatMessage[]) => {
    setMessages((prev) => {
      const pendingIndex = prev.findIndex((msg) => msg.sender === 'ai' && msg.pending);
      if (pendingIndex === -1) {
        return [...prev, ...nextMessages];
      }

      const updated = [...prev];
      updated.splice(pendingIndex, 1, ...nextMessages);
      return updated;
    });
  };

  const sendMessage = async (rawInput: string, sessionId: string | null) => {
    const messageText = rawInput.trim();
    if (!messageText || isSendingRef.current || isClosingRef.current || !sessionId || sessionIdRef.current !== sessionId || sessionEndedRef.current) return;

    isSendingRef.current = true;
    setIsSending(true);
    const playerMsg: ChatMessage = { sender: 'player', type: 'text', text: messageText };
    const pendingReply: ChatMessage = {
      sender: 'ai',
      type: 'text',
      text: PENDING_REPLY_TEXT,
      pending: true,
    };
    setMessages((prev) => [...prev, playerMsg, pendingReply]);
    setInputValue('');
    logConversation('player', messageText, 'talk-modal', sessionSaveIdRef.current);

    try {
      const result = await chat(messageText, 'casual');
      if (sessionIdRef.current !== sessionId || sessionEndedRef.current) return;

      const reply = result.text.trim() || '我在听。';
      logConversation('companion', reply, 'talk-modal', sessionSaveIdRef.current);
      const aiMessages: ChatMessage[] = splitTextIntoChatLines(reply).map((text) => ({
        sender: 'ai',
        type: 'text',
        text,
      }));
      if (result.sticker) {
        aiMessages.push({ sender: 'ai', type: 'sticker', stickerEmotion: result.sticker });
      }
      replacePendingReply(aiMessages);
    } catch {
      if (sessionIdRef.current !== sessionId || sessionEndedRef.current) return;
      const fallback = '让我想想。今天也可以慢慢聊。';
      logConversation('companion', fallback, 'talk-modal', sessionSaveIdRef.current);
      replacePendingReply(
        splitTextIntoChatLines(fallback).map((text) => ({ sender: 'ai', type: 'text', text })),
      );
    } finally {
      if (sessionIdRef.current === sessionId && !sessionEndedRef.current) {
        isSendingRef.current = false;
        setIsSending(false);
      }
    }
  };

  useEffect(() => {
    if (!open) {
      setOpened(false);
      return;
    }
    if (opened) return;
    setOpened(true);
    setMessages([]);

    const sessionId = createSessionId();
    sessionIdRef.current = sessionId;
    sessionSaveIdRef.current = getCurrentSaveId();
    sessionEndedRef.current = false;
    appendSystemMarker('本次谈心开始。', 'talk-session-start');

    const messageText = initialMessage.trim();
    if (messageText) {
      onInitialMessageConsumed?.();
      void sendMessage(messageText, sessionId);
      return;
    }

    const recentEvents = buildRecentEventsSummary();
    void getTalkOpening(recentEvents)
      .then((result) => {
        if (sessionIdRef.current !== sessionId || sessionEndedRef.current) return;

        const text = result.text.trim() || '你来了。最近怎么样？';
        logConversation('companion', text, 'talk-modal', sessionSaveIdRef.current);
        const msgs: ChatMessage[] = splitTextIntoChatLines(text).map((line) => ({
          sender: 'ai',
          type: 'text',
          text: line,
        }));
        if (result.sticker) {
          msgs.push({ sender: 'ai', type: 'sticker', stickerEmotion: result.sticker });
        }
        setMessages(msgs);
      })
      .catch(() => {
        if (sessionIdRef.current !== sessionId || sessionEndedRef.current) return;
        const fallback = '你来了。最近怎么样？';
        logConversation('companion', fallback, 'talk-modal', sessionSaveIdRef.current);
        setMessages(
          splitTextIntoChatLines(fallback).map((text) => ({ sender: 'ai', type: 'text', text })),
        );
      });
  }, [open, opened, initialMessage, onInitialMessageConsumed, getTalkOpening]);

  useEffect(() => {
    if (!open) {
      if (!sessionEndedRef.current) {
        appendSystemMarker('本次谈心结束。', 'talk-session-end');
      }
      sessionEndedRef.current = true;
      sessionIdRef.current = null;
      sessionSaveIdRef.current = null;
      setMessages([]);
      setInputValue('');
      isSendingRef.current = false;
      isClosingRef.current = false;
      setIsSending(false);
      setIsClosing(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isGenerating, open]);

  if (!open) return null;

  const handleSend = async () => {
    await sendMessage(inputValue, sessionIdRef.current);
  };

  const finishClose = (sessionId: string | null) => {
    if (sessionIdRef.current !== sessionId || sessionEndedRef.current) return;
    appendSystemMarker('本次谈心结束。', 'talk-session-end');
    sessionEndedRef.current = true;
    sessionIdRef.current = null;
    sessionSaveIdRef.current = null;
    isSendingRef.current = false;
    isClosingRef.current = false;
    setIsSending(false);
    setIsClosing(false);
    onClose();

    void consolidateCompanionMemory(undefined, 'talk');
  };

  const handleClose = async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || sessionEndedRef.current || isClosingRef.current) return;

    isClosingRef.current = true;
    setIsClosing(true);
    isSendingRef.current = true;
    setIsSending(true);

    const pendingReply: ChatMessage = {
      sender: 'ai',
      type: 'text',
      text: PENDING_REPLY_TEXT,
      pending: true,
    };
    setMessages((prev) => [...prev, pendingReply]);

    try {
      const result = await getTalkClosing();
      if (sessionIdRef.current !== sessionId || sessionEndedRef.current) return;

      const reply = result.text.trim() || '嗯，那下次再聊。';
      logConversation('companion', reply, 'talk-modal', sessionSaveIdRef.current);
      const aiMessages: ChatMessage[] = splitTextIntoChatLines(reply).map((text) => ({
        sender: 'ai',
        type: 'text',
        text,
      }));
      if (result.sticker) {
        aiMessages.push({ sender: 'ai', type: 'sticker', stickerEmotion: result.sticker });
      }
      replacePendingReply(aiMessages);
    } catch {
      if (sessionIdRef.current !== sessionId || sessionEndedRef.current) return;
      const fallback = '嗯，那下次再聊。';
      logConversation('companion', fallback, 'talk-modal', sessionSaveIdRef.current);
      replacePendingReply(
        splitTextIntoChatLines(fallback).map((text) => ({ sender: 'ai', type: 'text', text })),
      );
    } finally {
      if (sessionIdRef.current === sessionId && !sessionEndedRef.current) {
        window.setTimeout(() => finishClose(sessionId), CLOSING_MESSAGE_VISIBLE_MS);
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(9, 13, 18, 0.42)',
        backdropFilter: 'blur(8px)',
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
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div style={chromeDecorStyle} />
        <div style={chromeInnerFrameStyle} />

        {bgAssetId && assetMap[bgAssetId] && (
          <img
            src={assetMap[bgAssetId]}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 0,
              opacity: 0.12,
            }}
          />
        )}

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
          <h2 style={{ margin: 0, fontSize: sf(24), fontWeight: 700, color: 'var(--color-text-primary)', position: 'relative', zIndex: 1 }}>
            谈心
          </h2>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            padding: '16px 24px',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              overflowY: 'auto',
              padding: '18px 20px',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid var(--color-border-soft)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
            }}
          >
            {messages.length === 0 && isGenerating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: '78%' }}>
                <AIAvatar name={aiName} gender={aiGender} />
                <AITextBubble name={aiName} text="思考中..." pending maxWidth="78%" />
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: msg.sender === 'player' ? 'flex-end' : 'flex-start',
                  gap: 12,
                  width: '100%',
                }}
              >
                {msg.sender === 'ai' && <AIAvatar name={aiName} gender={aiGender} />}
                {msg.type === 'sticker' ? (
                  <div
                    style={{
                      maxWidth: '50%',
                      padding: '6px',
                    }}
                  >
                    <img
                      src={(() => {
                        const gender = useGameStore.getState().aiGender || 'female';
                        const emotion = msg.stickerEmotion || 'greeting';
                        const key = getStickerId(emotion, gender);
                        return assetMap[key] || assetMap[getStickerId('greeting', gender)] || assetMap[getStickerId('greeting', 'female')];
                      })()}
                      alt={msg.stickerEmotion || '表情'}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                      }}
                    />
                  </div>
                ) : (
                  msg.sender === 'ai' ? (
                    <AITextBubble name={aiName} text={msg.text || ''} pending={msg.pending} />
                  ) : (
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
                        {msg.text}
                      </p>
                    </div>
                  )
                )}
                {msg.sender === 'player' && (
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
                )}
              </div>
            ))}
            <div ref={messagesEndRef} style={{ height: 1, flexShrink: 0 }} />
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--color-border-soft)', background: 'rgba(255,255,255,0.12)', position: 'relative', zIndex: 1 }}>
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
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="说点什么..."
              disabled={isSending || isClosing}
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
              onClick={handleSend}
              disabled={isSending || isClosing}
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
                backgroundColor: (isSending || isClosing) ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                borderWidth: 0,
                borderRadius: 999,
                fontSize: sf(24),
                fontWeight: 700,
                color: 'var(--color-panel-strong)',
                fontFamily: 'Inter, "Noto Sans SC", sans-serif',
                lineHeight: 1,
                cursor: (isSending || isClosing) ? 'not-allowed' : 'pointer',
                opacity: (isSending || isClosing) ? 0.5 : 1,
              }}
            >
              ↑
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 24px', borderTop: '1px solid var(--color-border-soft)', background: 'rgba(255,255,255,0.12)', position: 'relative', zIndex: 1 }}>
          <button
            onClick={handleClose}
            disabled={isClosing}
            style={{
              padding: '10px 40px',
              border: '1px solid var(--color-border-strong)',
              background: 'rgba(255,255,255,0.14)',
              color: 'var(--color-text-primary)',
              fontSize: sf(16),
              fontWeight: 700,
              cursor: isClosing ? 'not-allowed' : 'pointer',
              opacity: isClosing ? 0.65 : 1,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
              clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))',
            }}
          >
            {isClosing ? '正在告别…' : '结束对话'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TalkModal;
