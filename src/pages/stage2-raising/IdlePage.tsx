import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AssetSlot } from '../../components/ui/AssetSlot';
import { SideTab } from '../../components/ui/SideTab';
import { StatBar } from '../../components/ui/StatBar';
import { BroadcastPanel } from '../../components/ui/BroadcastPanel';
import type { BroadcastType } from '../../components/ui/BroadcastPanel';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { getPortraitId } from '../../data/asset-map';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { useRedDotFlags } from '../../store/redDotSelectors';
import { getSingleWearColor } from '../../engine/ap-calculator';
import { ATTRIBUTE_LABELS } from '../../types';
import { getAttributeDescription } from '../../engine/attribute-calculator';
import type { AttributeKey } from '../../types';
import { sf } from '../../utils/font';
import TalkModal from '../shared/TalkModal';
import DiaryModal from '../shared/DiaryModal';
import SettingsModal from '../shared/SettingsModal';
import BackpackModal from '../shared/BackpackModal';

export const IdlePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { month } = useParams<{ month: string }>();
  const [activeTab, setActiveTab] = useState(-1);
  const [showDiary, setShowDiary] = useState(false);
  const [showBackpack, setShowBackpack] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [quickTalkInput, setQuickTalkInput] = useState('');
  const [showEndMonthTooltip, setShowEndMonthTooltip] = useState(false);
  const [examToast, setExamToast] = useState(false);
  const redDotFlags = useRedDotFlags();
  const showTalkModal = useUIStore((s) => s.talkModalOpen);
  const initialTalkMessage = useUIStore((s) => s.initialTalkMessage);
  const openTalkModal = useUIStore((s) => s.openTalkModal);
  const closeTalkModal = useUIStore((s) => s.closeTalkModal);
  const consumeInitialTalkMessage = useUIStore((s) => s.consumeInitialTalkMessage);

  const aiName = useGameStore((s) => s.aiName);
  const aiGender = useGameStore((s) => s.aiGender);
  const aiAttributes = useGameStore((s) => s.aiAttributes);
  const resources = useGameStore((s) => s.resources);
  const currentMonth = useGameStore((s) => s.currentMonth);
  const phase = useGameStore((s) => s.phase);
  const isExam = phase === 'exam';
  const routeMonth = Math.max(1, parseInt(month || '1') || 1);
  const displayMonth = currentMonth || routeMonth;
  const wearStage = useGameStore((s) => {
    const max = Math.max(s.resources.physicalWear, s.resources.mentalWear);
    if (max >= 81) return '状态极差...';
    if (max >= 61) return '感觉很疲惫';
    if (max >= 31) return '有些累了';
    return '今天状态不错';
  });

  const shownGuides = useGameStore((s) => s.shownGuides);
  const markGuideShown = useGameStore((s) => s.markGuideShown);
  const currentMonthActions = useGameStore((s) => s.currentMonthActions);
  const markTalkUsed = useGameStore((s) => s.markTalkUsed);
  const maxWear = Math.max(resources.physicalWear, resources.mentalWear);

  const broadcast = useMemo((): { type: BroadcastType; message: string; id: string } | null => {
    // Guide 1: first month in idle page
    if (!shownGuides.includes('goto-school') && currentMonth === 1) {
      return { type: 'tip', message: '前往**学校**修读课程，可以提升 AI 的基础属性。', id: 'goto-school' };
    }
    // Guide 3: first completed course
    if (!shownGuides.includes('wear-intro') && currentMonthActions.length > 0) {
      return { type: 'tip', message: '注意查看左侧**磨损值**，课程和工作会增加磨损，过高会扣减行动点。', id: 'wear-intro' };
    }
    // Guide 4: funds low
    if (!shownGuides.includes('funds-low') && resources.funds < 500) {
      return { type: 'warning', message: '资金不足？前往**公司**或**物流中心**可以打工赚取收入。', id: 'funds-low' };
    }
    // Guide 5: wear medium+
    if (!shownGuides.includes('wear-medium') && maxWear >= 31 && maxWear < 61) {
      return { type: 'warning', message: '磨损偏高，下月行动点 -1。建议前往公园或基石公司维护。', id: 'wear-medium' };
    }
    if (!shownGuides.includes('wear-high') && maxWear >= 61 && maxWear < 81) {
      return { type: 'warning', message: '磨损严重，下月行动点 -3。请尽快前往基石公司修复！', id: 'wear-high' };
    }
    if (!shownGuides.includes('wear-danger') && maxWear >= 81) {
      return { type: 'warning', message: '磨损已达危险值，下月行动点 -5。若不立即修复，系统将强制收回 AI。', id: 'wear-danger' };
    }
    // Wear-stage persistent warnings (resurface each month after guides shown)
    if (maxWear >= 81) {
      return { type: 'warning', message: '磨损已达危险值，下月行动点 -5。若不立即修复，系统将强制收回 AI。', id: 'wear-danger-ongoing' };
    }
    if (maxWear >= 61) {
      return { type: 'warning', message: '磨损严重，下月行动点 -3。请尽快前往基石公司修复！', id: 'wear-high-ongoing' };
    }
    if (maxWear >= 31) {
      return { type: 'warning', message: '磨损偏高，下月行动点 -1。建议前往公园或基石公司维护。', id: 'wear-medium-ongoing' };
    }
    return null;
  }, [shownGuides, currentMonth, resources.funds, maxWear, currentMonthActions.length]);

  const handleBroadcastClose = useCallback(() => {
    if (broadcast && !broadcast.id.endsWith('-ongoing')) {
      markGuideShown(broadcast.id);
    }
  }, [broadcast, markGuideShown]);

  const [broadcastDismissed, setBroadcastDismissed] = useState<string | null>(null);

  const activeBroadcast = broadcast && broadcast.id !== broadcastDismissed ? broadcast : null;

  const attrEntries = (Object.entries(aiAttributes) as [AttributeKey, number][]).map(
    ([key, value]) => ({
      label: ATTRIBUTE_LABELS[key],
      desc: getAttributeDescription(key, value),
      value,
    }),
  );

  const wearEntries = [
    { label: '身体', value: resources.physicalWear },
    { label: '精神', value: resources.mentalWear },
  ];

  const sideTabs = [
    { title: '地图', subtitle: '前往各区域', iconAssetId: 'icon_map' },
    { title: '日记', subtitle: '记录与回顾', iconAssetId: 'icon_diary' },
    { title: '背包', subtitle: '物品管理', iconAssetId: 'icon_backpack' },
    { title: '谈心', subtitle: '与AI对话', iconAssetId: 'icon_talk' },
  ];

  const handleTabClick = (index: number) => {
    if (isExam && index === 0) {
      setActiveTab(index);
      navigate('/exam/map');
      return;
    }

    if (isExam) {
      setExamToast(true);
      setTimeout(() => setExamToast(false), 2500);
      return;
    }
    setActiveTab(index);
    if (index === 0) {
      navigate(`/raising/map/${displayMonth}`);
    } else if (index === 1) {
      setShowDiary(true);
    } else if (index === 2) {
      setShowBackpack(true);
    } else if (index === 3) {
      markTalkUsed(currentMonth);
      openTalkModal();
    }
  };

  const handleQuickTalkSubmit = () => {
    if (isExam) return;
    const messageText = quickTalkInput.trim();
    markTalkUsed(currentMonth);
    openTalkModal(messageText);
    if (!messageText) return;
    setQuickTalkInput('');
  };

  useEffect(() => {
    if ((location.state as { openBackpack?: boolean } | null)?.openBackpack) {
      setShowBackpack(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  return (
    <div
      className="flex flex-col"
      style={{
        width: 1920,
        height: 1080,
        position: 'relative',
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
      }}
    >
      {/* Background */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 1920, height: 1080, zIndex: 0 }}>
        <AssetSlot assetId="bg_home" width={1920} height={1080} />
      </div>

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: isExam ? 'rgba(244, 252, 255, 0.20)' : undefined,
        }}
      >

      {/* Top resource bar */}
      <div
        className="flex items-center px-8"
        style={{
          width: 1920,
          height: 72,
          backgroundColor: isExam ? 'rgba(64, 78, 95, 0.62)' : 'rgba(244, 252, 255, 0.75)',
          borderBottomWidth: isExam ? 1 : 4,
          borderBottomStyle: 'solid',
          borderBottomColor: isExam ? 'var(--color-border-soft)' : 'var(--color-border-strong)',
          boxShadow: isExam ? 'none' : '0 8px 0 rgba(31, 111, 152, 0.30)',
          backdropFilter: isExam ? 'blur(10px)' : undefined,
          position: 'relative',
          zIndex: 50,
        }}
      >
        <div
          className="flex items-center gap-6"
          style={{
            position: 'absolute',
            left: 32,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <span
            style={{
              fontSize: sf(32),
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            第{displayMonth}月
          </span>
        </div>
        <div
          className="flex items-center gap-10"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="flex flex-col items-center">
            <span style={{ fontSize: sf(14), color: 'var(--color-text-secondary)' }}>行动点</span>
            <span style={{ fontSize: sf(24), fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {resources.actionPoints}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span style={{ fontSize: sf(14), color: 'var(--color-text-secondary)' }}>资金</span>
            <span style={{ fontSize: sf(24), fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {resources.funds}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            position: 'absolute',
            right: 32,
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '6px 16px',
            backgroundColor: 'var(--color-panel-soft)',
            border: '3px solid var(--color-border-soft)',
            color: 'var(--color-text-primary)',
            fontSize: sf(16),
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          设置
        </button>
      </div>

      {/* Exam warning banner */}
      {isExam && (
        <div
          className="flex items-center justify-between px-8"
          style={{
            height: 64,
            backgroundColor: 'rgba(255, 211, 94, 0.26)',
            borderBottom: '1px solid var(--color-warm-accent)',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            zIndex: 49,
          }}
        >
          <span style={{ fontSize: sf(20), fontWeight: 700, color: 'var(--color-text-primary)' }}>
            公司通知：请前往基石公司进行例行体检
          </span>
          <button
            onClick={() => navigate('/exam/map')}
            className="font-bold cursor-pointer transition-transform hover:-translate-y-1 active:scale-95"
            style={{
              width: 200,
              height: 48,
              backgroundColor: 'rgba(143, 224, 255, 0.24)',
              border: '1px solid var(--color-border-strong)',
              boxShadow: '0 10px 24px rgba(0, 0, 0, 0.18)',
              color: 'var(--color-text-primary)',
              fontSize: sf(20),
              fontWeight: 700,
            }}
          >
            前往地图
          </button>
        </div>
      )}

      {/* Main floating layout */}
      <div
        className="flex-1"
        style={{
          height: 1008,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Left panel: AI info */}
        <div
          className="flex flex-col gap-4 p-4"
          style={{
            ...chromePanelStyle({ padding: 16 }),
            position: 'absolute',
            left: 32,
            top: 32,
            width: 320,
            zIndex: 20,
          }}
        >
          <div style={chromeDecorStyle} />
          <div style={chromeInnerFrameStyle} />
          {/* AI name */}
          <div
            className="flex items-center justify-center"
            style={{
              ...chromePanelStyle({ strong: true, padding: 8 }),
              position: 'relative',
              zIndex: 1,
              height: 56,
            }}
          >
            <div style={chromeDecorStyle} />
            <div style={chromeInnerFrameStyle} />
            <span style={{ fontSize: sf(28), fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {aiName || '小星'}
            </span>
          </div>

          {/* Mood */}
          <div
            className="flex items-center justify-center px-3"
            style={{
              ...chromePanelStyle({ padding: '0 12px' }),
              position: 'relative',
              zIndex: 1,
              height: 36,
            }}
          >
            <div style={chromeInnerFrameStyle} />
            <span style={{ fontSize: sf(14), color: 'var(--color-text-secondary)' }}>
              {wearStage}
            </span>
          </div>

          {/* Attributes */}
          <div
            className="flex flex-col gap-3 p-4"
            style={{
              ...chromePanelStyle({ padding: 16 }),
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div style={chromeDecorStyle} />
            <div style={chromeInnerFrameStyle} />
            <span style={{ fontSize: sf(16), fontWeight: 700, color: 'var(--color-text-primary)' }}>
              属性
            </span>
            {attrEntries.map((attr) => (
              <div key={attr.label} style={{ position: 'relative', zIndex: 1 }}>
                <StatBar label={attr.label} value={attr.value} max={100} desc={attr.desc} />
              </div>
            ))}
          </div>

          {/* Wear */}
          <div
            className="flex flex-col gap-3 p-4"
            style={{
              ...chromePanelStyle({ padding: 16 }),
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div style={chromeDecorStyle} />
            <div style={chromeInnerFrameStyle} />
            <span style={{ fontSize: sf(16), fontWeight: 700, color: 'var(--color-text-primary)' }}>
              磨损
            </span>
            {wearEntries.map((w) => (
              <div key={w.label} className="flex items-center justify-between" style={{ position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: sf(14), color: 'var(--color-text-secondary)', minWidth: 48 }}>
                  {w.label}
                </span>
                <span style={{ fontSize: sf(16), fontWeight: 700, color: getSingleWearColor(w.value) }}>
                  {Math.round(w.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: AI portrait */}
        <div
          className="flex items-start justify-center"
          style={{
            position: 'absolute',
            left: '50%',
            top: 82,
            width: 700,
            height: 1106,
            transform: 'translateX(-50%)',
            backgroundColor: 'transparent',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <AssetSlot assetId={getPortraitId('normal', aiGender)} width={700} height={1106} />
        </div>

        {/* Broadcast panel */}
        {activeBroadcast && (
          <div
            style={{
              position: 'absolute',
              right: 32,
              top: 32,
              zIndex: 25,
            }}
          >
            <BroadcastPanel
              type={activeBroadcast.type}
              message={activeBroadcast.message}
              onClose={() => {
                handleBroadcastClose();
                setBroadcastDismissed(activeBroadcast.id);
              }}
            />
          </div>
        )}

        {/* Right panel: side tabs */}
        <div
          className="flex flex-col gap-3 items-center"
          style={{
            ...chromePanelStyle({ padding: 24 }),
            position: 'absolute',
            right: 32,
            top: 224,
            width: 332,
            zIndex: 20,
          }}
        >
          <div style={chromeDecorStyle} />
          <div style={chromeInnerFrameStyle} />
          {sideTabs.map((tab, i) => (
            <div key={tab.title} style={{ position: 'relative', zIndex: 1 }}>
              <SideTab
                title={tab.title}
                subtitle={tab.subtitle}
                active={activeTab === i}
                onClick={() => handleTabClick(i)}
                iconAssetId={tab.iconAssetId}
                disabled={isExam && i !== 0}
                showRedDot={
                  (i === 0 && redDotFlags.map) ||
                  (i === 1 && redDotFlags.diary) ||
                  (i === 2 && redDotFlags.backpack) ||
                  (i === 3 && redDotFlags.talk)
                }
              />
            </div>
          ))}
        </div>
        {/* Bottom controls */}
        <div
          className="flex items-center gap-6"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 68,
            width: 1040,
            transform: 'translateX(-50%)',
            zIndex: 50,
          }}
        >
          <div
            className="rounded-chat-frame flex items-center gap-6 px-6"
            style={{
              ...chromePanelStyle({ padding: '0 24px' }),
              flex: 1,
              height: 80,
            }}
          >
            <div style={chromeDecorStyle} />
            <div style={chromeInnerFrameStyle} />
            <input
              type="text"
              value={quickTalkInput}
              onChange={(e) => setQuickTalkInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isExam) handleQuickTalkSubmit();
              }}
              placeholder={isExam ? '' : '和AI说些什么...'}
              disabled={isExam}
              style={{
                position: 'relative',
                zIndex: 1,
                flex: 1,
                height: 48,
                backgroundColor: 'transparent',
                borderWidth: 0,
                outline: 'none',
                fontSize: sf(18),
                color: isExam ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                fontFamily: 'Inter, "Noto Sans SC", sans-serif',
                cursor: isExam ? 'not-allowed' : undefined,
              }}
            />
            <button
              onClick={handleQuickTalkSubmit}
              disabled={isExam}
              className="rounded-chat-send font-bold"
              style={{
                position: 'relative',
                zIndex: 1,
                width: 44,
                height: 44,
                minWidth: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isExam ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                borderWidth: 0,
                borderRadius: 999,
                fontSize: sf(24),
                fontWeight: 700,
                color: 'var(--color-panel-strong)',
                fontFamily: 'Inter, "Noto Sans SC", sans-serif',
                lineHeight: 1,
                padding: 0,
                cursor: isExam ? 'not-allowed' : 'pointer',
                opacity: isExam ? 0.4 : 1,
              }}
              aria-label="发送"
            >
              ↑
            </button>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            right: 32,
            bottom: 68,
            zIndex: 50,
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              height: 68,
            }}
          >
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { if (!isExam) navigate('/raising/end-month-confirm'); }}
                disabled={isExam}
                onMouseEnter={() => { if (isExam) setShowEndMonthTooltip(true); }}
                onMouseLeave={() => setShowEndMonthTooltip(false)}
                className="ui-chrome-button font-bold"
                style={{
                  ...chromePanelStyle({ strong: !isExam, padding: 8 }),
                  width: 200,
                  height: 56,
                  fontSize: sf(20),
                  fontWeight: 700,
                  color: isExam ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                  fontFamily: 'Inter, "Noto Sans SC", sans-serif',
                  cursor: isExam ? 'not-allowed' : 'pointer',
                  opacity: isExam ? 0.5 : 1,
                }}
              >
                <div style={chromeDecorStyle} />
                <div style={chromeInnerFrameStyle} />
                <span style={{ position: 'relative', zIndex: 1 }}>结束本月</span>
              </button>
              {isExam && showEndMonthTooltip && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: '100%',
                    transform: 'translateX(-50%)',
                    marginBottom: 8,
                    backgroundColor: 'var(--color-panel-strong)',
                    border: '3px solid var(--color-border-strong)',
                    padding: '8px 16px',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                  }}
                >
                  <span style={{ fontSize: 14, color: 'var(--color-danger)', fontWeight: 700 }}>
                    请先完成体检
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Exam toast */}
      {examToast && (
        <div
          className="flex items-center justify-center"
          style={{
            position: 'absolute',
            left: '50%',
            top: 164,
            transform: 'translateX(-50%)',
            zIndex: 100,
            ...chromePanelStyle({ strong: true, padding: '14px 28px' }),
            padding: '14px 28px',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.10), 0 14px 30px rgba(0,0,0,0.22)',
          }}
        >
          <span style={{ fontSize: sf(18), fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
            体检时暂不可用
          </span>
        </div>
      )}

      <TalkModal
        open={showTalkModal}
        onClose={closeTalkModal}
        initialMessage={initialTalkMessage}
        onInitialMessageConsumed={consumeInitialTalkMessage}
        bgAssetId={isExam ? 'bg_company' : undefined}
      />
      <DiaryModal open={showDiary} onClose={() => setShowDiary(false)} bgAssetId={isExam ? 'bg_company' : undefined} />
      <BackpackModal open={showBackpack} onClose={() => setShowBackpack(false)} bgAssetId={isExam ? 'bg_company' : undefined} />
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onReturnTitle={() => {
          setShowSettings(false);
          navigate('/title');
        }}
      />

      </div>{/* end content */}
    </div>
  );
};
