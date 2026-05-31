import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { useNarrative } from '../../hooks/useNarrative';

const CHAPTER_TITLES = ['第一章：处置', '第二章：部署', '第三章：回声', '第四章：余烬'];

function cleanArchiveText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^#{1,6}\s*/, '')
        .replace(/^[-*]\s*/, '')
        .replace(/^\d+[.)]\s*/, '')
        .replace(/\*\*/g, '')
        .trim(),
    )
    .filter((line) => line !== '---')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function ChromePanel({
  children,
  strong,
  style,
  contentStyle,
}: {
  children: React.ReactNode;
  strong?: boolean;
  style?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
}) {
  return (
    <section style={{ ...chromePanelStyle({ strong, padding: 0 }), ...style }}>
      <div style={chromeDecorStyle} />
      <div style={chromeInnerFrameStyle} />
      <div style={{ position: 'relative', zIndex: 1, height: '100%', ...contentStyle }}>
        {children}
      </div>
    </section>
  );
}

function ChapterStep({
  index,
  active,
  onClick,
}: {
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      onClick={onClick}
      aria-selected={active}
      style={{
        ...chromePanelStyle({ strong: active, padding: '14px 16px' }),
        minHeight: 86,
        width: '100%',
        textAlign: 'left',
        cursor: active ? 'default' : 'pointer',
        opacity: active ? 1 : 0.82,
        color: 'inherit',
        font: 'inherit',
      }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ color: active ? 'var(--color-status-available)' : 'var(--color-text-muted)', fontSize: 12, fontWeight: 800 }}>
          0{index + 1}
        </div>
        <div style={{ color: 'var(--color-text-primary)', fontSize: 17, fontWeight: 800, marginTop: 8 }}>
          {CHAPTER_TITLES[index]}
        </div>
      </div>
    </button>
  );
}

export const ChroniclePage: React.FC = () => {
  const navigate = useNavigate();
  const { page } = useParams();
  const pageNum = Math.max(1, Math.min(4, parseInt(page || '1', 10) || 1));

  const { getChronicle, isGenerating } = useNarrative();
  const [chapterText, setChapterText] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoaded(false);
    setChapterText('');
    getChronicle(pageNum as 1 | 2 | 3 | 4).then((text) => {
      if (!active) return;
      setChapterText(text);
      setIsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [getChronicle, pageNum]);

  const isFirst = pageNum === 1;
  const isLast = pageNum === 4;

  return (
    <div
      className="relative flex flex-col"
      style={{
        width: 1920,
        height: 1080,
        overflow: 'hidden',
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
      }}
    >
      <ChromePanel
        strong
        style={{ width: 1920, height: 72, flexShrink: 0 }}
        contentStyle={{ display: 'flex', alignItems: 'center', padding: '0 48px' }}
      >
        <div style={{ width: 32, height: 32, border: '1px solid var(--color-border-soft)', background: 'rgba(255,255,255,0.10)', marginRight: 14 }} />
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--color-text-primary)' }}>
            基石工业 · 终局档案
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            档案编号 JL-2024-0847 / 第 {pageNum} / 4 页
          </div>
        </div>
        <div style={{ marginLeft: 'auto', color: 'var(--color-danger)', fontSize: 18, fontWeight: 900 }}>
          机密
        </div>
      </ChromePanel>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: '34px 80px 24px',
          display: 'grid',
          gridTemplateColumns: '360px minmax(0, 1fr)',
          gap: 34,
        }}
      >
        <ChromePanel
          contentStyle={{ padding: '28px 30px', display: 'flex', flexDirection: 'column', gap: 14 }}
          style={{ minHeight: 0 }}
        >
          <div style={{ color: 'var(--color-text-primary)', fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
            档案章节
          </div>
          <div role="tablist" aria-label="大事记章节" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {CHAPTER_TITLES.map((_, index) => (
              <ChapterStep
                key={index}
                index={index}
                active={index + 1 === pageNum}
                onClick={() => navigate(`/endgame/chronicle/${index + 1}`)}
              />
            ))}
          </div>
        </ChromePanel>

        <ChromePanel
          strong
          contentStyle={{ padding: '36px 44px', display: 'flex', flexDirection: 'column', minHeight: 0 }}
          style={{ minHeight: 0 }}
        >
          <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
            ARCHIVE RECORD
          </div>
          <div style={{ color: 'var(--color-text-primary)', fontSize: 38, fontWeight: 900, marginBottom: 18 }}>
            {CHAPTER_TITLES[pageNum - 1]}
          </div>
          <div style={{ height: 1, background: 'var(--color-border-soft)', marginBottom: 24 }} />

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              paddingRight: 18,
              color: 'var(--color-text-secondary)',
              fontSize: 21,
              lineHeight: 2,
              whiteSpace: 'pre-line',
            }}
          >
            {isGenerating && !isLoaded ? '正在调取档案...' : cleanArchiveText(chapterText)}
          </div>
        </ChromePanel>
      </div>

      <div style={{ padding: '0 80px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {!isFirst ? (
          <Button variant="secondary" onClick={() => navigate(`/endgame/chronicle/${pageNum - 1}`)} style={{ width: 220, height: 68 }}>
            上一页
          </Button>
        ) : <div style={{ width: 220 }} />}

        {isLast ? (
          <Button variant="primary" onClick={() => navigate('/endgame/letter')} style={{ width: 220, height: 68 }}>
            继续
          </Button>
        ) : (
          <Button variant="primary" onClick={() => navigate(`/endgame/chronicle/${pageNum + 1}`)} style={{ width: 220, height: 68 }}>
            继续
          </Button>
        )}
      </div>
    </div>
  );
};
