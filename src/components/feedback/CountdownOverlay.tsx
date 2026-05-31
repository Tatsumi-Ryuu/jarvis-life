import React, { useState, useEffect } from 'react';

interface CountdownOverlayProps {
  text: string;
  duration: number; // seconds
  onComplete: () => void;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  text,
  duration,
  onComplete,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const totalMs = duration * 1000;

    const frame = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / totalMs) * 100);
      setProgress(remaining);

      if (elapsed >= totalMs) {
        onComplete();
        return;
      }

      requestAnimationFrame(frame);
    };

    const rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [duration, onComplete]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ zIndex: 110, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      {/* Text */}
      <span
        className="text-page-title font-bold mb-8"
        style={{ color: '#fff' }}
      >
        {text}
      </span>

      {/* Progress track */}
      <div
        style={{
          width: '60%',
          height: 8,
          backgroundColor: 'var(--color-panel-soft)',
          borderRadius: 0,
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: 8,
            backgroundColor: 'var(--color-action)',
            borderRadius: 0,
            transition: 'width 0.05s linear',
          }}
        />
      </div>
    </div>
  );
};
