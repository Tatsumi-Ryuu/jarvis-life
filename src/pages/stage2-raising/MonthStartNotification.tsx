import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';

export const MonthStartNotification: React.FC = () => {
  const { month } = useParams<{ month: string }>();
  const navigate = useNavigate();
  const startNewMonth = useGameStore((s) => s.startNewMonth);
  const currentMonth = useGameStore((s) => s.currentMonth);
  const didStartMonth = useRef(false);

  const targetMonth = parseInt(month || '1') || 1;

  useEffect(() => {
    if (didStartMonth.current) return;
    if (currentMonth < targetMonth) {
      didStartMonth.current = true;
      // Bridge gap: call startNewMonth repeatedly (e.g. exam skips month 6,
      // so after exam currentMonth=5 but target=7, need 2 calls)
      let m = currentMonth;
      while (m < targetMonth) {
        startNewMonth();
        m++;
      }
    }
  }, [startNewMonth, currentMonth, targetMonth]);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(`/raising/idle/${targetMonth}`);
    }, 3000);
    return () => clearTimeout(timer);
  }, [targetMonth, navigate]);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: 1920,
        height: 1080,
        background:
          'radial-gradient(circle at 50% 0%, rgba(210,220,230,0.18), transparent 32%), linear-gradient(180deg, #181933, #10111f)',
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
      }}
    >
      <span
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          textShadow: '0 2px 12px rgba(0,0,0,0.6)',
        }}
      >
        第 {targetMonth} 月开始了
      </span>
    </div>
  );
};
