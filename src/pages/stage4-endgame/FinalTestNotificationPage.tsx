import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { useGameStore } from '../../store/gameStore';
import { sf } from '../../utils/font';

export const FinalTestNotificationPage: React.FC = () => {
  const navigate = useNavigate();
  const aiName = useGameStore((s) => s.aiName);
  const playerName = useGameStore((s) => s.player.name);

  return (
    <div className="flex flex-col" style={{ width: 1920, height: 1080 }}>
      <div
        className="flex flex-col"
        style={{
          ...chromePanelStyle({ strong: true, padding: '48px 56px' }),
          width: 820,
          margin: '150px auto 0',
        }}
      >
        <div style={chromeDecorStyle} />
        <div style={chromeInnerFrameStyle} />

        <div
          className="flex items-center justify-center"
          style={{
            position: 'relative',
            zIndex: 1,
            height: 64,
            backgroundColor: 'rgba(255,255,255,0.10)',
            border: '1px solid var(--color-border-soft)',
            marginBottom: 32,
          }}
        >
          <span
            style={{
              fontSize: sf(28),
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: 4,
            }}
          >
            基石工业 · 最终测试通知
          </span>
        </div>

        <div className="flex justify-between" style={{ position: 'relative', zIndex: 1, marginBottom: 24 }}>
          <span style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>
            致：{playerName || '体验计划参与者'}
          </span>
          <span style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>
            2040年12月
          </span>
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            height: 2,
            backgroundColor: 'var(--color-border-soft)',
            marginBottom: 28,
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            fontSize: sf(20),
            lineHeight: 2,
            color: 'var(--color-text-primary)',
            marginBottom: 40,
          }}
        >
          <p>感谢您的陪伴，12个月转瞬即逝。</p>
          <p>
            我们相信您与您的AI{aiName ? `（${aiName}）` : ''}已经度过了一段美好的旅途。
            接下来，是时候检验您的培养成果了。
          </p>
          <p>
            请携带您的AI前往基石工业进行最终检验。我们的裁决者已经等候多时。
          </p>
        </div>

        <div
          className="flex items-center justify-center"
          style={{
            position: 'relative',
            zIndex: 1,
            height: 48,
            backgroundColor: 'rgba(255,255,255,0.10)',
            border: '1px solid var(--color-border-soft)',
            marginBottom: 40,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
              letterSpacing: 2,
            }}
          >
            基石工业 裁决者委员会
          </span>
        </div>

        <div className="flex justify-center" style={{ position: 'relative', zIndex: 1 }}>
          <Button
            onClick={() => navigate('/endgame/farewell')}
            style={{
              width: 300,
              height: 86,
            }}
          >
            前往最终检验
          </Button>
        </div>
      </div>
    </div>
  );
};
