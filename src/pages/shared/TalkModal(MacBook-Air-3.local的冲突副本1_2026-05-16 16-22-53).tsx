import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useAIStore } from '../../store/aiStore';
import { useNarrative } from '../../hooks/useNarrative';

interface TalkModalProps {
  open: boolean;
  onClose: () => void;
  initialMessage?: string;
  onInitialMessageConsumed?: () => void;
}

interface ChatMessage {
  sender: 'player' | 'ai';
  text: string;
}

function buildRecentEventsSummary(): string {
  const eventLog = useAIStore.getState().eventLog;
  const recent = eventLog.slice(-5);
  if (recent.length === 0) return '';
  return recent.map((e) => `[第${e.month}月] ${e.summary}`).join('\n');
}

const TalkModal: React.FC<TalkModalProps> = ({
  open,
  onClose,
  initialMessage = '',
  onInitialMessageConsumed,
}) => {
  const aiName = useGameStore((s) => s.aiName) || '小星';
  const { chat, getTalkOpening, isGenerating } = useNarrative();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [opened, setOpened] = useState(false);
  const consumedInitialMessageRef = useRef<string | null>(null);

  const sendMessage = async (rawInput: string) => {
    const messageText = rawInput.trim();
    if (!messageText || isGenerating) return;
    const playerMsg: ChatMessage = { sender: 'player', text: messageText };
    setMessages((prev) => [...prev, playerMsg]);
    setInputValue('');

    try {
      const aiText = await chat(messageText, 'casual');
      const reply = aiText.trim() || '嗯，我在听。';
      setMessages((prev) => [...prev, { sender: 'ai', text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: '嗯...让我想想。我觉得每一天都在学习新东西呢。' },
      ]);
    }
  };

  // Generate opening message when modal opens
  useEffect(() => {
    if (!open) {
      setOpened(false);
      return;
    }
    if (opened) return;
    setOpened(true);
    setMessages([]);

    // If there's an initialMessage from parent, use that instead of AI-generated opening
    const messageText = initialMessage.trim();
    if (messageText) {
      consumedInitialMessageRef.current = messageText;
      onInitialMessageConsumed?.();
      void sendMessage(messageText);
      return;
    }

    // Otherwise, generate AI opening based on recent events
    const recentEvents = buildRecentEventsSummary();
    getTalkOpening(recentEvents).then((text) => {
      setMessages([{ sender: 'ai', text: text.trim() || '嗯，你来了。最近怎么样？' }]);
    }).catch(() => {
      setMessages([{ sender: 'ai', text: '嗯，你来了。最近怎么样？' }]);
    });
  }, [open]);

  // Reset messages when modal closes
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInputValue('');
    }
  }, [open]);

  if (!open) return null;

  const handleSend = async () => {
    await sendMessage(inputValue);
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
        background: 'rgba(22, 62, 90, 0.18)',
      }}
    >
      <div
        style={{
          width: 1080,
          height: 720,
          background: '#F8FDFF',
          border: '6px solid var(--color-border-strong)',
          boxShadow: '14px 14px 0 rgba(23, 77, 114, 0.34)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '4px solid var(--color-border-soft)',
            background: 'var(--color-panel-strong)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            谈心
          </h2>
        </div>

        {/* Main Body: Portrait + Chat */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            padding: '16px 24px',
            gap: 16,
            overflow: 'hidden',
            background: 'var(--color-canvas)',
          }}
        >
          {/* AI Portrait */}
          <div
            style={{
              width: 200,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 200,
                height: 300,
                background: '#F8FDFF',
                border: '4px solid var(--color-border-strong)',
                boxShadow: '6px 6px 0 rgba(46, 126, 168, 0.30)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-muted)',
                fontSize: 14,
              }}
            >
              AI 立绘
            </div>
          </div>

          {/* Chat Area */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              overflowY: 'auto',
              padding: '12px',
              background: '#F8FDFF',
              border: '4px solid var(--color-border-soft)',
            }}
          >
            {messages.length === 0 && isGenerating && (
              <div style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
                <div
                  style={{
                    background: 'var(--color-panel-soft)',
                    border: '3px solid var(--color-border-soft)',
                    padding: '12px 16px',
                    boxShadow: '4px 4px 0 rgba(46, 126, 168, 0.20)',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                    {aiName}
                  </span>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
                    思考中...
                  </p>
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === 'player' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                }}
              >
                <div
                  style={{
                    background: msg.sender === 'player' ? 'var(--color-action)' : 'var(--color-panel-soft)',
                    border: msg.sender === 'player' ? '3px solid var(--color-border-strong)' : '3px solid var(--color-border-soft)',
                    padding: '12px 16px',
                    boxShadow: '4px 4px 0 rgba(46, 126, 168, 0.20)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 14, fontWeight: 700, color: 'var(--color-text-secondary)',
                      display: 'block', marginBottom: 4,
                    }}
                  >
                    {msg.sender === 'player' ? '我' : aiName}
                  </span>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        <div style={{ padding: '14px 24px', borderTop: '4px solid var(--color-border-soft)', background: '#F8FDFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="说点什么..."
              disabled={isGenerating}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: '3px solid var(--color-border-soft)',
                background: 'var(--color-canvas)',
                color: 'var(--color-text-primary)',
                fontSize: 15,
                outline: 'none',
                boxShadow: '4px 4px 0 rgba(46, 126, 168, 0.20)',
              }}
            />
            <button
              onClick={handleSend}
              disabled={isGenerating}
              style={{
                padding: '10px 24px',
                border: '4px solid var(--color-border-strong)',
                background: 'var(--color-action)',
                color: 'var(--color-text-primary)',
                fontSize: 16,
                fontWeight: 700,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                boxShadow: '4px 4px 0 rgba(46, 126, 168, 0.30)',
                opacity: isGenerating ? 0.5 : 1,
              }}
            >
              {isGenerating ? '思考中...' : '发送'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 24px', borderTop: '3px solid var(--color-border-soft)', background: 'var(--color-panel-strong)' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 40px',
              border: '3px solid var(--color-border-strong)',
              background: '#F8FDFF',
              color: 'var(--color-text-primary)',
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: '6px 6px 0 rgba(46, 126, 168, 0.30)',
            }}
          >
            结束对话
          </button>
        </div>
      </div>
    </div>
  );
};

export default TalkModal;
