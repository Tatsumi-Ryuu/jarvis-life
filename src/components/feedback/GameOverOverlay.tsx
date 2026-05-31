import React from 'react';
import { useGameStore } from '../../store/gameStore';

export const GameOverOverlay: React.FC = () => {
  const gameOverReason = useGameStore((s) => s.gameOverReason);
  const resetGame = useGameStore((s) => s.resetGame);

  if (!gameOverReason) return null;

  const isWearDeath = gameOverReason === 'wear-death';
  const title = isWearDeath ? 'AI 已停止运行' : 'AI 强制回收';
  const description = isWearDeath
    ? '过度使用导致AI的核心模块严重损坏，已无法修复。'
    : '记得要管控好自己的资金，欢迎您下次来参与我们的志愿活动';

  const handleReset = () => {
    resetGame();
    window.location.href = '/title';
  };

  return (
    <div
      className="flex items-center justify-center"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.7)',
      }}
    >
      <div
        className="flex flex-col items-center gap-6"
        style={{
          width: 600,
          backgroundColor: 'var(--color-panel)',
          borderWidth: 6,
          borderStyle: 'solid',
          borderColor: 'var(--color-border-strong)',
          boxShadow: '10px 10px 0 rgba(31, 111, 152, 0.30)',
          padding: '48px 40px',
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 80,
            height: 80,
            backgroundColor: 'var(--color-danger)',
            borderWidth: 4,
            borderStyle: 'solid',
            borderColor: 'var(--color-border-strong)',
          }}
        >
          <span style={{ fontSize: 40, color: 'white' }}>X</span>
        </div>

        <span
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: 'var(--color-danger)',
          }}
        >
          {title}
        </span>

        <div
          style={{
            width: '100%',
            backgroundColor: 'var(--color-panel-soft)',
            borderWidth: 4,
            borderStyle: 'solid',
            borderColor: 'var(--color-border-soft)',
            padding: '20px 24px',
          }}
        >
          <span
            style={{
              fontSize: 18,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
            }}
          >
            {description}
          </span>
        </div>

        <button
          onClick={handleReset}
          className="cursor-pointer font-bold"
          style={{
            width: 260,
            height: 86,
            backgroundColor: 'var(--color-action)',
            borderWidth: 6,
            borderStyle: 'solid',
            borderColor: 'var(--color-border-strong)',
            boxShadow: '10px 10px 0 rgba(31, 111, 152, 0.30)',
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            fontFamily: 'Inter, "Noto Sans SC", sans-serif',
          }}
        >
          返回标题
        </button>
      </div>
    </div>
  );
};
