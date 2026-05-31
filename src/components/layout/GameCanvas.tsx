import React from 'react';
import { useSceneScale } from '../../hooks/useSceneScale';

const SCENE_WIDTH = 1920;
const SCENE_HEIGHT = 1080;

export const GameCanvas: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scale = useSceneScale();

  return (
    <div
      className="flex items-center justify-center w-full h-full"
      style={{ backgroundColor: '#1a1a2e' }}
    >
      <div
        style={{
          position: 'relative',
          width: SCENE_WIDTH,
          height: SCENE_HEIGHT,
          backgroundColor: '#EAF8FF',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
};
