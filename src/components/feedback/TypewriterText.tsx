import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 50,
  onComplete,
  className = '',
}) => {
  const [charIndex, setCharIndex] = useState(0);

  // Reset when text changes
  useEffect(() => {
    setCharIndex(0);
  }, [text]);

  useEffect(() => {
    if (charIndex >= text.length) {
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setCharIndex((prev) => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [charIndex, text, speed, onComplete]);

  return (
    <span className={className}>
      {text.slice(0, charIndex)}
      {charIndex < text.length && (
        <span className="inline-block" style={{ animation: 'blink 0.6s step-end infinite' }}>
          |
        </span>
      )}
    </span>
  );
};
