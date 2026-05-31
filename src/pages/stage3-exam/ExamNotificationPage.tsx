import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { useGameStore } from '../../store/gameStore';
import { sf } from '../../utils/font';
import { ExamCompanyBackground } from './ExamCompanyBackground';

export const ExamNotificationPage: React.FC = () => {
  const navigate = useNavigate();
  const aiName = useGameStore((s) => s.aiName);
  const playerName = useGameStore((s) => s.player.name);
  const startNewMonth = useGameStore((s) => s.startNewMonth);

  return (
    <ExamCompanyBackground className="flex flex-col">
      {/* Memo panel */}
      <div
        className="flex flex-col"
        style={{
          ...chromePanelStyle({ strong: true, padding: '48px 56px' }),
          width: 720,
          margin: '170px auto 0',
        }}
      >
        <div style={chromeDecorStyle} />
        <div style={chromeInnerFrameStyle} />
        {/* Header bar */}
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
            基石工业 · 内部通知
          </span>
        </div>

        {/* Date line */}
        <div className="flex justify-between" style={{ position: 'relative', zIndex: 1, marginBottom: 24 }}>
          <span style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>
            致：{playerName}
          </span>
          <span style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>
            2040年6月
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            height: 2,
            backgroundColor: 'var(--color-border-soft)',
            marginBottom: 28,
          }}
        />

        {/* Body text */}
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
          <p>
            {`根据AI体验计划协议，您的AI（${aiName}）将在本月进行例行全身保养。`}
          </p>
          <p>
            请于本月底前陪同AI前往基石工业总部。保养期间将进行标准化功能检测。
          </p>
        </div>

        {/* Stamp-like footer */}
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
            基石工业 AI管理部门
          </span>
        </div>

        {/* Confirm button */}
        <div className="flex justify-center" style={{ position: 'relative', zIndex: 1 }}>
          <Button
            onClick={() => {
              startNewMonth();
              navigate('/exam/idle');
            }}
            style={{
              width: 260,
              height: 86,
            }}
          >
            确认
          </Button>
        </div>
      </div>
    </ExamCompanyBackground>
  );
};
