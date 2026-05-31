import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { sf } from '../../utils/font';

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

const reflectionLines = [
  '在12个月里，你让它上了很多课，带它去了很多地方。',
  '你更关心它的能力，但你也偶尔会问它过得好不好。',
  '它记得你每一次的回应。',
];

export const PlayerEndingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: 1920,
        height: 1080,
        padding: '96px 120px',
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
      }}
    >
      <ChromePanel
        strong
        style={{
          width: 1120,
          height: 760,
          display: 'flex',
          flexDirection: 'column',
        }}
        contentStyle={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <ChromePanel
          style={{ flexShrink: 0, margin: '24px 24px 0' }}
          contentStyle={{ display: 'flex', alignItems: 'center', padding: '16px 24px' }}
        >
          <div style={{ width: 32, height: 32, border: '1px solid var(--color-border-soft)', background: 'rgba(255,255,255,0.10)', marginRight: 14 }} />
          <div>
            <div style={{ fontSize: sf(24), fontWeight: 800, color: 'var(--color-text-primary)' }}>
              摇篮系统 · 培育者档案
            </div>
            <div style={{ fontSize: sf(13), color: 'var(--color-text-muted)', marginTop: 4 }}>
              终局记录 / 玩家画像
            </div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'var(--color-status-available)', fontSize: sf(16), fontWeight: 900 }}>
            已归档
          </div>
        </ChromePanel>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateRows: 'auto minmax(0, 1fr) auto',
            gap: 24,
            padding: '44px 64px 28px',
          }}
        >
          <header style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--color-text-muted)', fontSize: sf(13), fontWeight: 800, marginBottom: 14 }}>
              PLAYER PROFILE
            </div>
            <h1
              style={{
                margin: 0,
                color: 'var(--color-text-primary)',
                fontSize: sf(46),
                fontWeight: 900,
                lineHeight: 1.18,
              }}
            >
              你是一直陪伴它的人
            </h1>
          </header>

          <ChromePanel
            style={{ minHeight: 0 }}
            contentStyle={{
              padding: '36px 46px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ color: 'var(--color-text-muted)', fontSize: sf(13), fontWeight: 800, marginBottom: 22, textAlign: 'center' }}>
              REFLECTION RECORD
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {reflectionLines.map((line, index) => (
                <p
                  key={line}
                  style={{
                    margin: 0,
                    color: index === reflectionLines.length - 1 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    fontSize: sf(index === reflectionLines.length - 1 ? 25 : 22),
                    fontWeight: index === reflectionLines.length - 1 ? 850 : 700,
                    lineHeight: 1.85,
                    textAlign: 'center',
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          </ChromePanel>

          <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 78 }}>
            <div
              style={{
                border: '1px solid var(--color-border-soft)',
                background: 'rgba(255,255,255,0.10)',
                padding: '16px 24px',
                minWidth: 260,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ color: 'var(--color-text-muted)', fontSize: sf(12), fontWeight: 800, marginBottom: 8 }}>
                FINAL NOTE
              </div>
              <div style={{ color: 'var(--color-text-primary)', fontSize: sf(22), fontWeight: 800 }}>
                感谢游玩
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate('/title')}
              style={{ width: 220, height: 68 }}
            >
              返回标题
            </Button>
          </footer>
        </div>
      </ChromePanel>
    </div>
  );
};
