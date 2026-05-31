import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssetSlot } from '../../components/ui/AssetSlot';
import { Button } from '../../components/ui/Button';
import type { SaveBundle, SaveMeta } from '../../types';
import {
  findLatestSave,
  getSaveAdapter,
  getSaveStorageStatus,
  initSaveSystem,
  requestSaveStorageAccess,
} from '../../services/save-service';
import type { StoragePortStatus } from '../../services/storage-port';
import { restoreSaveAndGetRoute } from '../../services/save-navigation';
import { isElectron } from '../../services/electron-save-storage';
import SettingsModal from '../shared/SettingsModal';
import { sf } from '../../utils/font';
import { runWithGlobalLoading } from '../../utils/globalLoading';

export const TitlePage: React.FC = () => {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [latestSave, setLatestSave] = useState<SaveBundle | null>(null);
  const [saveMetas, setSaveMetas] = useState<SaveMeta[]>([]);
  const [storageStatus, setStorageStatus] = useState<StoragePortStatus>({ state: 'needs-binding' });
  const [storageBusy, setStorageBusy] = useState(true);
  const [continueError, setContinueError] = useState('');

  const restoreAndNavigate = (bundle: Awaited<ReturnType<typeof findLatestSave>>) => {
    if (!bundle) return false;
    navigate(restoreSaveAndGetRoute(bundle));
    return true;
  };

  const refreshStorageAndSaveState = async () => {
    setStorageBusy(true);
    setContinueError('');
    try {
      const status = await getSaveStorageStatus();
      setStorageStatus(status);
      if (status.state === 'ready') {
        await initSaveSystem();
        const metas = await getSaveAdapter().listSaves();
        setSaveMetas(metas);
        const bundle = await findLatestSave().catch((err) => {
          console.error('[标题页] 读取最新存档失败:', err);
          return null;
        });
        setLatestSave(bundle);
      } else {
        setLatestSave(null);
        setSaveMetas([]);
      }
    } finally {
      setStorageBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function initialize() {
      setStorageBusy(true);
      setContinueError('');
      try {
        const status = await getSaveStorageStatus();
        if (!active) return;
        setStorageStatus(status);
        if (status.state === 'ready') {
          await initSaveSystem();
          const metas = await getSaveAdapter().listSaves();
          const bundle = await findLatestSave().catch((err) => {
            console.error('[标题页] 读取最新存档失败:', err);
            return null;
          });
          if (!active) return;
          setLatestSave(bundle);
          setSaveMetas(metas);
        } else {
          setLatestSave(null);
          setSaveMetas([]);
        }
      } finally {
        if (active) setStorageBusy(false);
      }
    }
    initialize();
    return () => { active = false; };
  }, []);

  const handleBindStorage = async () => {
    setStorageBusy(true);
    setContinueError('');

    try {
      const status = await requestSaveStorageAccess();
      setStorageStatus(status);

      if (status.state !== 'ready') return;

      setShowStorageModal(false);

      try {
        await runWithGlobalLoading('正在读取存档文件夹...', async () => {
          await initSaveSystem();
          const metas = await getSaveAdapter().listSaves();
          setSaveMetas(metas);
          const bundle = await findLatestSave();
          setLatestSave(bundle);
          if (!restoreAndNavigate(bundle) && metas.length > 0) {
            setContinueError('检测到存档，但暂时无法读取最新存档。请在设置里选择具体存档读取。');
          }
        });
      } catch (err) {
        console.error('[存档文件夹] 初始化存档失败:', err);
        setLatestSave(null);
        setSaveMetas([]);
        setContinueError('存档文件夹已连接，但读取存档失败。你仍然可以开始新游戏。');
      }
    } catch (err) {
      console.error('[存档文件夹] 选择文件夹失败:', err);
      setContinueError('选择存档文件夹失败，请重试。');
    } finally {
      setStorageBusy(false);
    }
  };

  const handleContinue = async () => {
    setStorageBusy(true);
    setContinueError('');
    try {
      await runWithGlobalLoading('正在读取存档...', async () => {
        let bundle = latestSave ?? await findLatestSave();
        if (!bundle) {
          const metas = await getSaveAdapter().listSaves();
          setSaveMetas(metas);
          if (metas.length === 0) {
            setContinueError('当前文件夹里没有检测到可用存档。');
            return;
          }
          bundle = await getSaveAdapter().loadSave(metas[0].saveId);
          if (!bundle) {
            setContinueError('检测到存档，但暂时无法读取存档内容。请在设置里重新选择存档文件夹。');
            return;
          }
        }
        setLatestSave(bundle);
        restoreAndNavigate(bundle);
      });
    } catch (err) {
      console.error('[继续游戏] 加载存档失败:', err);
      setContinueError('加载存档失败，请重新选择存档文件夹。');
    } finally {
      setStorageBusy(false);
    }
  };

  const storageReady = storageStatus.state === 'ready';
  const needsFolderBinding = !isElectron() && !storageReady;
  const storageUnavailable = !isElectron() && storageStatus.state === 'unavailable';
  const canContinue = storageReady && (latestSave !== null || saveMetas.length > 0);

  return (
    <div
      className="relative w-scene-w h-scene-h flex flex-col items-center justify-center"
      style={{ width: 1920, height: 1080, backgroundColor: 'var(--color-canvas)' }}
    >
      <div className="absolute inset-0">
        <AssetSlot assetId="bg_title" width={1920} height={1080} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-5">
          {storageUnavailable ? (
            <>
              <Button disabled>存档不可用</Button>
              <div
                style={{
                  maxWidth: 460,
                  color: 'var(--color-text-primary)',
                  background: 'rgba(255, 244, 230, 0.94)',
                  border: '3px solid var(--color-border-soft)',
                  padding: '12px 16px',
                  fontSize: sf(15),
                  lineHeight: 1.6,
                  textAlign: 'center',
                }}
              >
                {storageStatus.reason}
                <br />
                请使用 Chrome 或 Edge 打开当前地址后，再选择 JarvisData 存档文件夹。
              </div>
            </>
          ) : needsFolderBinding ? (
            <Button
              disabled={storageBusy}
              onClick={() => setShowStorageModal(true)}
            >
              {storageStatus.state === 'needs-permission' ? '重新连接存档' : '连接存档文件夹'}
            </Button>
          ) : (
            <>
              <Button disabled={!storageReady} onClick={() => navigate('/story/1')}>新游戏</Button>
              <Button disabled={storageBusy || !canContinue} onClick={handleContinue}>继续游戏</Button>
            </>
          )}
          <Button onClick={() => setShowSettings(true)}>设置</Button>
          {continueError && (
            <div
              style={{
                maxWidth: 360,
                color: 'var(--color-text-primary)',
                background: 'rgba(255, 244, 230, 0.92)',
                border: '3px solid var(--color-border-soft)',
                padding: '10px 14px',
                fontSize: sf(14),
                lineHeight: 1.5,
                textAlign: 'center',
              }}
            >
              {continueError}
            </div>
          )}
        </div>
      </div>

      {needsFolderBinding && showStorageModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="storage-folder-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.5)',
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowStorageModal(false);
            }
          }}
        >
          <div
            style={{
              width: 680,
              minHeight: 420,
              background: 'var(--color-panel)',
              border: '6px solid var(--color-border-strong)',
              boxShadow: '10px 10px 0 rgba(31, 111, 152, 0.30)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '4px solid var(--color-border-soft)',
              }}
            >
              <h2
                id="storage-folder-title"
                style={{
                  margin: 0,
                  fontSize: sf(24),
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                }}
              >
                存档文件夹
              </h2>
              <button
                onClick={() => setShowStorageModal(false)}
                style={{
                  width: 36,
                  height: 36,
                  border: '3px solid var(--color-border-soft)',
                  background: 'var(--color-panel-soft)',
                  color: 'var(--color-text-primary)',
                  fontSize: sf(18),
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '3px 3px 0 rgba(46, 126, 168, 0.30)',
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                padding: '36px 48px 42px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 26,
              }}
            >
              <div
                style={{
                  color: 'var(--color-text-primary)',
                  fontSize: sf(18),
                  lineHeight: 1.7,
                  textAlign: 'center',
                  maxWidth: 520,
                }}
              >
                网页端需要先连接本地 JarvisLife 文件夹。之后存档和 AI 记忆都会写入这个文件夹。
              </div>

              {storageStatus.state === 'unavailable' && (
                <div
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 244, 230, 0.95)',
                    border: '3px solid var(--color-border-soft)',
                    color: 'var(--color-text-primary)',
                    fontSize: sf(15),
                    lineHeight: 1.5,
                    textAlign: 'center',
                  }}
                >
                  {storageStatus.reason}
                </div>
              )}

              <Button
                disabled={storageBusy}
                onClick={handleBindStorage}
              >
                {storageStatus.state === 'needs-permission' ? '重新选择文件夹' : '选择文件夹'}
              </Button>
              <div
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: sf(14),
                  lineHeight: 1.6,
                  textAlign: 'center',
                  maxWidth: 500,
                }}
              >
                请在系统弹窗中选择你准备用来保存 Jarvis Life 数据的文件夹。
              </div>
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        open={showSettings}
        onClose={() => {
          setShowSettings(false);
          void refreshStorageAndSaveState();
        }}
        onStorageChanged={() => {
          void refreshStorageAndSaveState();
        }}
      />
    </div>
  );
};
