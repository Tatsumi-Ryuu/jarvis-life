import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { AIAvatar, AITextBubble } from '../../components/chat/AIMessage';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { sf } from '../../utils/font';

export const CompanyFinalPage: React.FC = () => {
  const navigate = useNavigate();
  const aiName = useGameStore((s) => s.aiName) || '小星';
  const aiGender = useGameStore((s) => s.aiGender);

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
              终局测试中心
            </h1>
            <div style={{ marginTop: 4, fontSize: sf(13), color: 'var(--color-text-muted)' }}>
              基石工业 · 公司最终对局
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
          <div
            style={{
              alignSelf: 'center',
              maxWidth: '72%',
              padding: '12px 18px',
              border: '1px solid var(--color-border-soft)',
              background: 'rgba(255,255,255,0.12)',
              color: 'var(--color-text-muted)',
              fontSize: sf(13),
              lineHeight: 1.7,
              textAlign: 'center',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
            }}
          >
            基石工业终局测试中心。走廊比上次冷清了很多。
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AIAvatar name={aiName} gender={aiGender} />
            <AITextBubble
              name={aiName}
              text="我们到了...这是最后一次来这里了吧。"
              maxWidth="74%"
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '18px 24px',
            borderTop: '1px solid var(--color-border-soft)',
            background: 'rgba(255,255,255,0.12)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <button
            onClick={() => navigate('/endgame/test-round/1')}
            className="font-bold cursor-pointer transition-transform active:scale-95"
            style={{
              minWidth: 180,
              height: 48,
              padding: '0 36px',
              backgroundColor: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-strong)',
              color: 'var(--color-panel-strong)',
              fontSize: sf(16),
              fontWeight: 800,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
            }}
          >
            继续
          </button>
        </div>
      </div>
    </div>
  );
};
