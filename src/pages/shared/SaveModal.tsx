import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SaveMeta } from '../../types';
import { deleteSaveById, getCurrentSaveId, getSaveAdapter, loadSaveById } from '../../services/save-service';
import { restoreSaveAndGetRoute } from '../../services/save-navigation';
import { assetMap } from '../../data/asset-map';
import { runWithGlobalLoading } from '../../utils/globalLoading';

interface SaveModalProps {
  open: boolean;
  onClose: () => void;
  bgAssetId?: string;
}

function getDisplayInfo(meta: SaveMeta | undefined): string {
  if (!meta) return '[空]';
  return `${meta.currentMonth}月 · ${meta.aiName} · ${meta.playerName || '玩家'}`;
}

interface SavePanelProps {
  active?: boolean;
  onLoad?: () => void;
}

export const SavePanel: React.FC<SavePanelProps> = ({ active = true, onLoad }) => {
  const navigate = useNavigate();
  const [saveTick, setSaveTick] = useState(0);
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(getCurrentSaveId());
  const [busySaveId, setBusySaveId] = useState<string | null>(null);

  const refreshSaves = async () => {
    const nextSaves = await getSaveAdapter().listSaves();
    setSaves(nextSaves);
    setCurrentId(getCurrentSaveId());
  };

  useEffect(() => {
    if (!active) return;
    void refreshSaves();
  }, [active, saveTick]);

  const autoSave = (currentId ? saves.find((s) => s.saveId === currentId) : undefined) ?? saves[0];
  const manualSaves = saves.filter((s) => s.saveId !== autoSave?.saveId);

  const handleLoad = async (saveId: string) => {
    await runWithGlobalLoading('正在读取存档...', async () => {
      const bundle = await loadSaveById(saveId as any);
      if (!bundle) return;
      const route = restoreSaveAndGetRoute(bundle);
      onLoad?.();
      navigate(route);
    });
  };

  const handleDelete = async (meta: SaveMeta) => {
    const confirmed = window.confirm(`确定要删除「${getDisplayInfo(meta)}」吗？删除后无法恢复。`);
    if (!confirmed) return;
    setBusySaveId(meta.saveId);
    setSaves((prev) => prev.filter((save) => save.saveId !== meta.saveId));
    if (currentId === meta.saveId) {
      setCurrentId(null);
    }
    try {
      await deleteSaveById(meta.saveId);
      await refreshSaves();
      setSaveTick((n) => n + 1);
    } finally {
      setBusySaveId(null);
    }
  };

  const renderSaveRow = (meta: SaveMeta, label: string, highlighted = false) => (
    <div
      key={meta.saveId}
      style={{
        background: highlighted ? 'var(--color-panel-strong)' : 'var(--color-panel-soft)',
        border: highlighted ? '4px solid var(--color-border-strong)' : '4px solid var(--color-border-soft)',
        padding: '20px 24px',
        boxShadow: '6px 6px 0 rgba(46, 126, 168, 0.30)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        <span style={{
          fontSize: 18,
          fontWeight: 700,
          color: highlighted ? 'var(--color-action)' : 'var(--color-text-muted)',
          minWidth: 64,
          textAlign: 'center',
        }}>{label}</span>
        <span style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {getDisplayInfo(meta)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <button onClick={() => handleLoad(meta.saveId)} style={{
          padding: '8px 20px', border: '3px solid var(--color-border-strong)',
          background: 'var(--color-action)', color: 'var(--color-text-primary)',
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
          boxShadow: '4px 4px 0 rgba(46, 126, 168, 0.30)',
        }}>读取</button>
        <button
          disabled={busySaveId === meta.saveId}
          onClick={() => handleDelete(meta)}
          style={{
            padding: '8px 20px', border: '3px solid var(--color-border-soft)',
            background: 'var(--color-panel)', color: 'var(--color-text-primary)',
            fontSize: 14, fontWeight: 700, cursor: busySaveId === meta.saveId ? 'default' : 'pointer',
            opacity: busySaveId === meta.saveId ? 0.65 : 1,
            boxShadow: '4px 4px 0 rgba(46, 126, 168, 0.30)',
          }}
        >
          删除
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {autoSave ? renderSaveRow(autoSave, '当前', true) : (
          <div
            style={{
              background: 'var(--color-panel-soft)',
              border: '4px solid var(--color-border-soft)',
              padding: '20px 24px',
              color: 'var(--color-text-muted)',
              fontSize: 18,
              textAlign: 'center',
            }}
          >
            当前没有存档
          </div>
        )}

        {manualSaves.map((meta, idx) => renderSaveRow(meta, String(idx + 1)))}
      </div>
    </>
  );
};

const SaveModal: React.FC<SaveModalProps> = ({ open, onClose, bgAssetId }) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          width: 800,
          height: 600,
          background: bgAssetId && assetMap[bgAssetId] ? 'rgba(248, 253, 255, 0.93)' : 'var(--color-panel)',
          border: '6px solid var(--color-border-strong)',
          boxShadow: '10px 10px 0 rgba(31, 111, 152, 0.30)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {bgAssetId && assetMap[bgAssetId] && (
          <img
            src={assetMap[bgAssetId]}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 0,
            }}
          />
        )}
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '4px solid var(--color-border-soft)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <h2
            style={{
              margin: 0,
              color: 'var(--color-text-primary)',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            存档
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36,
              border: '3px solid var(--color-border-soft)',
              background: 'var(--color-panel-soft)',
              color: 'var(--color-text-primary)',
              fontSize: 18, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '3px 3px 0 rgba(46, 126, 168, 0.30)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Save Slots */}
        <div
          style={{
            flex: 1,
            padding: '24px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            overflowY: 'auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <SavePanel active={open} onLoad={onClose} />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 24px', borderTop: '3px solid var(--color-border-soft)', position: 'relative', zIndex: 1 }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 40px',
              border: '3px solid var(--color-border-soft)',
              background: 'var(--color-panel-soft)',
              color: 'var(--color-text-primary)',
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: '6px 6px 0 rgba(46, 126, 168, 0.30)',
            }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveModal;
