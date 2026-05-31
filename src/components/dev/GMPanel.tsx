import React, { useEffect, useState } from 'react';
import { router } from '../../router';
import { loadGMSnapshot, type GMSnapshotKind } from '../../dev/gm-snapshots';
import { useDebugStore } from '../../store/debugStore';

type GMRoute = {
  label: string;
  path: string;
  snapshotKind: GMSnapshotKind;
};

type GMRouteGroup = {
  title: string;
  routes: GMRoute[];
};

const GM_ROUTE_GROUPS: GMRouteGroup[] = [
  {
    title: 'Opening',
    routes: [
      { label: '标题页', path: '/title', snapshotKind: 'opening' },
      { label: '开场故事 1', path: '/story/1', snapshotKind: 'opening' },
      { label: '问卷说明', path: '/questionnaire-intro', snapshotKind: 'opening' },
      { label: '问卷 1', path: '/questionnaire/1', snapshotKind: 'opening' },
      { label: '身份结果', path: '/identity-result', snapshotKind: 'opening' },
      { label: '创建档案', path: '/profile-creation', snapshotKind: 'opening' },
    ],
  },
  {
    title: 'Raising',
    routes: [
      { label: '月初通知', path: '/raising/month-start/1', snapshotKind: 'raising' },
      { label: '养成主页', path: '/raising/idle/1', snapshotKind: 'raising' },
      { label: '地图', path: '/raising/map/1', snapshotKind: 'raising' },
      { label: '学校地点', path: '/raising/location/school', snapshotKind: 'raising' },
      { label: '行动进度', path: '/raising/action-progress', snapshotKind: 'raising' },
      { label: '事件对话', path: '/raising/event/evt_01', snapshotKind: 'raising-event' },
      { label: '月末确认', path: '/raising/end-month-confirm', snapshotKind: 'raising' },
      { label: '月结算', path: '/raising/settlement/1', snapshotKind: 'raising-settlement' },
    ],
  },
  {
    title: 'Exam',
    routes: [
      { label: '考试通知', path: '/exam/notification', snapshotKind: 'exam' },
      { label: '考试休息', path: '/exam/idle', snapshotKind: 'exam' },
      { label: '考试地图', path: '/exam/map', snapshotKind: 'exam' },
      { label: '公司入口', path: '/exam/company-entrance', snapshotKind: 'exam' },
      { label: '测试场景', path: '/exam/testing', snapshotKind: 'exam' },
      { label: '情境题', path: '/exam/situation', snapshotKind: 'exam' },
      { label: '考试报告', path: '/exam/report', snapshotKind: 'exam-report' },
      { label: '询问 AI', path: '/exam/ask-ai', snapshotKind: 'exam' },
    ],
  },
  {
    title: 'Endgame',
    routes: [
      { label: '最终测试通知', path: '/endgame/notification', snapshotKind: 'endgame' },
      { label: '告别', path: '/endgame/farewell', snapshotKind: 'endgame' },
      { label: '最终公司', path: '/endgame/company-final', snapshotKind: 'endgame' },
      { label: 'MBTI 评估', path: '/endgame/mbti', snapshotKind: 'endgame' },
      { label: '终局测试 1', path: '/endgame/test-round/1', snapshotKind: 'endgame' },
      { label: '测试 3 规则', path: '/endgame/test3-rules', snapshotKind: 'endgame' },
      { label: '测试 3 回放', path: '/endgame/test3-playback', snapshotKind: 'endgame' },
      { label: '三轮证据板', path: '/endgame/evidence', snapshotKind: 'endgame' },
      { label: '裁决报告', path: '/endgame/verdict/1', snapshotKind: 'endgame' },
      { label: '编年史', path: '/endgame/chronicle/1', snapshotKind: 'endgame' },
      { label: 'AI 来信', path: '/endgame/letter', snapshotKind: 'endgame' },
      { label: '玩家结局', path: '/endgame/player-ending', snapshotKind: 'endgame' },
    ],
  },
  {
    title: 'Dev',
    routes: [
      { label: '视觉规范预览', path: '/dev/design-system', snapshotKind: 'dev' },
      { label: '确认版视觉规范', path: '/dev/design-system-confirmed', snapshotKind: 'dev' },
    ],
  },
];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || target.isContentEditable;
}

export const GMPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const toggleDebugPanel = useDebugStore((s) => s.togglePanel);
  const debugPanelOpen = useDebugStore((s) => s.panelOpen);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '`' || isTypingTarget(event.target)) return;

      event.preventDefault();
      setOpen((current) => !current);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const goToRoute = (route: GMRoute) => {
    loadGMSnapshot(route.snapshotKind);
    router.navigate(route.path);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 32,
          right: 32,
          width: 520,
          maxHeight: 1016,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          padding: 24,
          pointerEvents: 'auto',
          color: 'var(--color-text-primary)',
          background:
            'linear-gradient(180deg, rgba(54, 65, 82, 0.96), rgba(31, 39, 54, 0.96))',
          border: '2px solid var(--color-border-strong)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.36)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>GM 场景面板</div>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--color-text-muted)' }}>
              按 ` 打开或关闭
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => toggleDebugPanel()}
              style={{
                height: 48,
                padding: '0 14px',
                border: '2px solid',
                borderColor: debugPanelOpen ? 'var(--color-status-available)' : 'var(--color-border-soft)',
                background: debugPanelOpen ? 'rgba(74,144,217,0.2)' : 'rgba(255, 255, 255, 0.08)',
                color: debugPanelOpen ? 'var(--color-status-available)' : 'var(--color-text-secondary)',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 2,
              }}
            >
              调试面板
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="关闭 GM 面板"
              style={{
                width: 48,
                height: 48,
                border: '2px solid var(--color-border-soft)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--color-text-primary)',
                fontSize: 24,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              x
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            overflowY: 'auto',
            paddingRight: 6,
          }}
        >
          {GM_ROUTE_GROUPS.map((group) => (
            <section key={group.title}>
              <div
                style={{
                  marginBottom: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 0,
                  color: 'var(--color-status-available)',
                  textTransform: 'uppercase',
                }}
              >
                {group.title}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                }}
              >
                {group.routes.map((route) => (
                  <button
                    key={route.path}
                    type="button"
                    onClick={() => goToRoute(route)}
                    title={route.path}
                    style={{
                      minHeight: 44,
                      padding: '8px 12px',
                      border: '1px solid var(--color-border-soft)',
                      background: 'rgba(255, 255, 255, 0.07)',
                      color: 'var(--color-text-secondary)',
                      fontSize: 15,
                      fontWeight: 700,
                      textAlign: 'left',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {route.label}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
