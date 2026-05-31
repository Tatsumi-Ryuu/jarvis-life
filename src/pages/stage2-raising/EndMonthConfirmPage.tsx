import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { AssetSlot } from '../../components/ui/AssetSlot';

export const EndMonthConfirmPage: React.FC = () => {
  const navigate = useNavigate();
  const resources = useGameStore((s) => s.resources);
  const currentMonth = useGameStore((s) => s.currentMonth);
  const endMonth = useGameStore((s) => s.endMonth);

  const hasRemainingAP = resources.actionPoints > 0;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: 'rgba(22, 62, 90, 0.40)',
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
      }}
    >
      <div className="absolute inset-0">
        <AssetSlot assetId="bg_home" width={1920} height={1080} />
      </div>

      <div
        className="relative z-10 flex flex-col items-center gap-8"
        style={{
          width: 560,
          backgroundColor: 'var(--color-panel)',
          borderWidth: 6,
          borderStyle: 'solid',
          borderColor: 'var(--color-border-strong)',
          boxShadow: '10px 10px 0 rgba(31, 111, 152, 0.30)',
          padding: '48px 40px',
        }}
      >
        {/* Warning icon placeholder */}
        <div
          className="flex items-center justify-center"
          style={{
            width: 80,
            height: 80,
            backgroundColor: 'var(--color-panel-soft)',
            borderWidth: 4,
            borderStyle: 'solid',
            borderColor: 'var(--color-border-soft)',
          }}
        >
          <span style={{ fontSize: 36 }}>!</span>
        </div>

        {/* Message */}
        <div
          className="flex flex-col items-center gap-2"
          style={{
            backgroundColor: 'var(--color-panel-soft)',
            borderWidth: 4,
            borderStyle: 'solid',
            borderColor: 'var(--color-border-soft)',
            padding: '24px 32px',
            width: '100%',
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            {hasRemainingAP
              ? '本月行动点未使用完'
              : '确认结束本月？'}
          </span>
          <span
            style={{
              fontSize: 20,
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
            }}
          >
            确定进入下一个月吗？
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-6">
          {/* Cancel */}
          <button
            onClick={() => navigate(-1)}
            className="cursor-pointer font-bold"
            style={{
              width: 190,
              height: 60,
              backgroundColor: 'var(--color-panel-soft)',
              borderWidth: 4,
              borderStyle: 'solid',
              borderColor: 'var(--color-border-strong)',
              boxShadow: '6px 6px 0 rgba(46, 126, 168, 0.30)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              fontFamily: 'Inter, "Noto Sans SC", sans-serif',
            }}
          >
            取消
          </button>

          {/* Confirm */}
          <button
            onClick={() => {
              endMonth();
              const nextMonth = currentMonth + 1;
              if (nextMonth > 12) {
                navigate('/endgame/notification');
              } else {
                navigate(`/raising/settlement/${currentMonth}`);
              }
            }}
            className="cursor-pointer font-bold"
            style={{
              width: 190,
              height: 60,
              backgroundColor: 'var(--color-action)',
              borderWidth: 6,
              borderStyle: 'solid',
              borderColor: 'var(--color-border-strong)',
              boxShadow: '6px 6px 0 rgba(31, 111, 152, 0.30)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              fontFamily: 'Inter, "Noto Sans SC", sans-serif',
            }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};
