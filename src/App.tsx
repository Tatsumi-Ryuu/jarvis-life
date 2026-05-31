import React, { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { GameCanvas } from './components/layout/GameCanvas';
import { GameOverOverlay } from './components/feedback/GameOverOverlay';
import { FundsWarningModal } from './components/feedback/FundsWarningModal';
import { WearWarningModal } from './components/feedback/WearWarningModal';
import { GMPanel } from './components/dev/GMPanel';
import { DebugPanel } from './components/dev/DebugPanel';
import { GlobalLoadingOverlay } from './components/feedback/GlobalLoadingOverlay';
import { router } from './router';
import { audioManager } from './engine/audio-manager';
import { useGameStore } from './store/gameStore';
import { findLatestSave, initSaveSystem } from './services/save-service';
import { restoreFromBundle } from './services/restore-service';

const STARTUP_RESTORE_TIMEOUT_MS = 3000;

function withStartupTimeout<T>(
  run: (isCancelled: () => boolean) => Promise<T>,
  timeoutMs: number,
  isCancelled: () => boolean,
): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => resolve(null), timeoutMs);
    run(isCancelled)
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(isCancelled() ? null : value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

const App: React.FC = () => {
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const isCancelled = () => cancelled;
        await withStartupTimeout(() => initSaveSystem(), STARTUP_RESTORE_TIMEOUT_MS, isCancelled);
        if (cancelled) return;

        const bundle = await withStartupTimeout(
          () => findLatestSave({ activate: false }),
          STARTUP_RESTORE_TIMEOUT_MS,
          isCancelled,
        );
        if (cancelled) return;

        if (bundle) {
          const gamePhase = bundle.game.phase;
          const currentPhase = useGameStore.getState().phase;

          if (
            currentPhase === 'title' &&
            gamePhase &&
            gamePhase !== 'title' &&
            gamePhase !== 'game-over'
          ) {
            restoreFromBundle(bundle);
          }
        }
      } catch {
      } finally {
        if (!cancelled) {
          setRestoring(false);
        }
      }
    }

    restore();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let started = false;

    const handleClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;

      if (!started) {
        started = true;
        audioManager.playBgm('global');
      }

      if (el.closest('button')) {
        audioManager.playSfx('click');
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (restoring) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#EAF8FF',
          color: '#1f3b4d',
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        加载中...
      </div>
    );
  }

  return (
    <GameCanvas>
      <RouterProvider router={router} />
      <GameOverOverlay />
      <WearWarningModal />
      <FundsWarningModal />
      {import.meta.env.DEV ? <GMPanel /> : null}
      {import.meta.env.DEV ? <DebugPanel /> : null}
      <GlobalLoadingOverlay />
    </GameCanvas>
  );
};

export default App;
