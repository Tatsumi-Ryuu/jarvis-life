import { useState, useEffect, useCallback } from 'react';

const SCENE_WIDTH = 1920;
const SCENE_HEIGHT = 1080;

function calculateScale(): number {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const scaleX = viewportW / SCENE_WIDTH;
  const scaleY = viewportH / SCENE_HEIGHT;
  return Math.min(scaleX, scaleY);
}

export function useSceneScale(): number {
  const [scale, setScale] = useState<number>(calculateScale);

  const handleResize = useCallback(() => {
    setScale(calculateScale());
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return scale;
}
