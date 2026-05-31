import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { assetMap } from '../../data/asset-map';
import { replaceNames } from '../../engine/name-replacer';
import { loadDiaryEntry } from '../../services/diary-service';
import { useGameStore } from '../../store/gameStore';

interface DiaryModalProps {
  open: boolean;
  onClose: () => void;
  bgAssetId?: string;
}

const DIARY_PENDING_TEXT = '日记还没有整理完成，请稍后再试。';

const miniButtonStyle: React.CSSProperties = {
  ...chromePanelStyle({ padding: 6 }),
  width: 40,
  height: 40,
  color: 'var(--color-text-primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontWeight: 700,
};

const DiaryModal: React.FC<DiaryModalProps> = ({ open, onClose, bgAssetId }) => {
  const currentMonth = useGameStore((s) => s.currentMonth);
  const aiName = useGameStore((s) => s.aiName);
  const playerName = useGameStore((s) => s.player.name);
  const markDiaryRead = useGameStore((s) => s.markDiaryRead);
  const canViewDiary = currentMonth > 1;
  const maxViewableMonth = currentMonth - 1;
  const [month, setMonth] = useState(Math.max(1, maxViewableMonth));
  const [diaryText, setDiaryText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !canViewDiary) return;
    setMonth(maxViewableMonth);
  }, [canViewDiary, maxViewableMonth, open]);

  useEffect(() => {
    if (!open || !canViewDiary) return;
    markDiaryRead(month);
  }, [canViewDiary, markDiaryRead, month, open]);

  useEffect(() => {
    if (!open || !canViewDiary) return;

    let cancelled = false;
    const state = useGameStore.getState();
    setIsLoading(true);
    setLoadingMonth(month);
    setDiaryText('');

    loadDiaryEntry(month, state, { allowGenerate: false })
      .then((result) => {
        if (cancelled) return;
        setDiaryText(replaceNames(result.content, aiName, playerName));
      })
      .catch(() => {
        if (cancelled) return;
        setDiaryText(DIARY_PENDING_TEXT);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
        setLoadingMonth(null);
      });

    return () => {
      cancelled = true;
    };
  }, [aiName, canViewDiary, month, open, playerName]);

  if (!open) return null;

  const displayDiaryText = isLoading && loadingMonth === month
    ? '正在整理日记...'
    : diaryText || DIARY_PENDING_TEXT;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.42)',
      }}
    >
      <div
        style={{
          ...chromePanelStyle({ strong: true, padding: 0 }),
          width: 800,
          height: 600,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div style={chromeDecorStyle} />
        <div style={chromeInnerFrameStyle} />
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
              opacity: 0.22,
            }}
          />
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--color-border-soft)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>日记</h2>
          <button onClick={onClose} style={miniButtonStyle}>
            <div style={chromeInnerFrameStyle} />
            <span style={{ position: 'relative', zIndex: 1 }}>X</span>
          </button>
        </div>

        {canViewDiary ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                padding: '12px 24px',
                borderBottom: '1px solid var(--color-border-soft)',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <button
                onClick={() => setMonth((prev) => Math.max(1, prev - 1))}
                disabled={month <= 1 || isLoading}
                style={{ ...miniButtonStyle, opacity: month <= 1 || isLoading ? 0.45 : 1, cursor: month <= 1 || isLoading ? 'default' : 'pointer' }}
              >
                <div style={chromeInnerFrameStyle} />
                <span style={{ position: 'relative', zIndex: 1 }}>&lt;</span>
              </button>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', minWidth: 80, textAlign: 'center' }}>
                {month}月
              </span>
              <button
                onClick={() => setMonth((prev) => Math.min(maxViewableMonth, prev + 1))}
                disabled={month >= maxViewableMonth || isLoading}
                style={{ ...miniButtonStyle, opacity: month >= maxViewableMonth || isLoading ? 0.45 : 1, cursor: month >= maxViewableMonth || isLoading ? 'default' : 'pointer' }}
              >
                <div style={chromeInnerFrameStyle} />
                <span style={{ position: 'relative', zIndex: 1 }}>&gt;</span>
              </button>
            </div>

            <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
              <div style={{ ...chromePanelStyle({ padding: '20px 24px' }), position: 'relative' }}>
                <div style={chromeDecorStyle} />
                <div style={chromeInnerFrameStyle} />
                <p style={{ margin: 0, fontSize: 16, lineHeight: 1.8, color: 'var(--color-text-secondary)', position: 'relative', zIndex: 1, whiteSpace: 'pre-wrap' }}>
                  {displayDiaryText}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 32px', position: 'relative', zIndex: 1 }}>
            <div style={{ ...chromePanelStyle({ padding: '32px 40px' }), position: 'relative' }}>
              <div style={chromeDecorStyle} />
              <div style={chromeInnerFrameStyle} />
              <p style={{ margin: 0, fontSize: 18, lineHeight: 1.8, color: 'var(--color-text-secondary)', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                日记将在月末结算后解锁，记录您与{aiName || 'AI'}的每个月。
              </p>
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '16px 24px',
            borderTop: '1px solid var(--color-border-soft)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Button variant="secondary" onClick={onClose}>关闭</Button>
        </div>
      </div>
    </div>
  );
};

export default DiaryModal;
