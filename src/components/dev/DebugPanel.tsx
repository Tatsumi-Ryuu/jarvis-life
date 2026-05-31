import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDebugStore } from '../../store/debugStore';
import { useAIStore } from '../../store/aiStore';
import { useGameStore } from '../../store/gameStore';
import { determinePersonalityType } from '../../engine/personality-calculator';
import { calculateDirection } from '../../engine/midterm-direction';
import { getWearStage, calculateMaxAP } from '../../engine/ap-calculator';
import { ATTRIBUTE_LABELS } from '../../types';
import type { EventLogEntry, ConversationLogEntry, AttributeKey } from '../../types';

type TabId = 'events' | 'ai' | 'conversations' | 'hidden' | 'state';

const TABS: { id: TabId; label: string }[] = [
  { id: 'events', label: '事件日志' },
  { id: 'ai', label: 'AI 请求' },
  { id: 'conversations', label: '对话记录' },
  { id: 'hidden', label: '隐性数值' },
  { id: 'state', label: '游戏状态' },
];

const STORAGE_KEY_POS = 'jarvis-debug-panel-pos';
const STORAGE_KEY_SIZE = 'jarvis-debug-panel-size';

function loadPos(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { x: 20, y: 20 };
}

function loadSize(): { w: number; h: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SIZE);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { w: 520, h: 600 };
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false });
}

// ─── Color helpers ───

const EVENT_TYPE_COLORS: Record<string, string> = {
  action: '#4A90D9',
  dialogue: '#4CAF50',
  event: '#FF9800',
  settlement: '#9C27B0',
  'monthly-summary': '#607D8B',
  'wear-warning': '#F44336',
  'game-over': '#880E4F',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF9800',
  success: '#4CAF50',
  error: '#F44336',
};

const PERSONALITY_LABELS: Record<string, string> = {
  rationalVsIntuitive: '理性 ↔ 直觉',
  utilitarianVsDeontological: '功利 ↔ 道义',
  trustVsGuard: '信任 ↔ 戒备',
  resilientVsSensitive: '坚韧 ↔ 敏感',
  expressiveVsSilent: '表达 ↔ 沉默',
  selfishVsAltruistic: '利己 ↔ 利他',
};

const WEAR_STAGE_COLORS: Record<string, string> = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336',
  danger: '#880E4F',
};

const TIMING_LABELS: Record<string, string> = {
  queueWaitMs: '排队',
  runtimeMs: '运行时',
  contextMs: '上下文',
  providerMs: '模型',
  toolMs: '工具',
  statelessMs: '快速请求',
  totalMs: '总计',
};

// ─── Sub-components ───

function ProgressBar({ value, max = 100, color = '#4A90D9' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', minWidth: 32, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: '#8899AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 12 }}>{children}</div>;
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 10,
      fontWeight: 700,
      padding: '2px 6px',
      borderRadius: 3,
      color: '#fff',
      background: color,
    }}>
      {label}
    </span>
  );
}

function TimingList({ timings }: { timings: Record<string, number> }) {
  const entries = Object.entries(timings);
  if (entries.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#8899AA', marginBottom: 4 }}>Timings</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {entries.map(([key, value]) => (
          <span
            key={key}
            style={{
              fontSize: 10,
              color: '#C8D0DA',
              background: 'rgba(74,144,217,0.16)',
              border: '1px solid rgba(74,144,217,0.25)',
              borderRadius: 3,
              padding: '2px 6px',
            }}
          >
            {TIMING_LABELS[key] ?? key}: {Math.round(value)}ms
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Events ───

function EventsTab() {
  const eventLog = useAIStore((s) => s.eventLog);
  const topRef = useRef<HTMLDivElement>(null);

  const prevLenRef = useRef(eventLog.length);
  useEffect(() => {
    if (eventLog.length > prevLenRef.current) {
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLenRef.current = eventLog.length;
  }, [eventLog.length]);

  if (eventLog.length === 0) {
    return <div style={{ color: '#667788', padding: 16, textAlign: 'center' }}>暂无事件日志</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, color: '#667788', marginBottom: 4 }}>共 {eventLog.length} 条</div>
      {[...eventLog].reverse().map((entry: EventLogEntry, idx) => (
        <div key={entry.id} ref={idx === 0 ? topRef : undefined} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, borderLeft: `3px solid ${EVENT_TYPE_COLORS[entry.type] || '#666'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Badge label={entry.type} color={EVENT_TYPE_COLORS[entry.type] || '#666'} />
            <span style={{ fontSize: 11, color: '#667788' }}>第{entry.month}月</span>
            <span style={{ fontSize: 11, color: '#556677' }}>{formatTime(entry.timestamp)}</span>
            {entry.emotionalImpact != null && (
              <span style={{ fontSize: 10, color: '#FF9800', marginLeft: 'auto' }}>情感 {entry.emotionalImpact}/10</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#C8D0DA', lineHeight: 1.5 }}>{entry.summary}</div>
          {entry.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
              {entry.tags.map((tag) => (
                <span key={tag} style={{ fontSize: 10, padding: '1px 5px', background: 'rgba(255,255,255,0.08)', borderRadius: 3, color: '#8899AA' }}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tab: AI Requests ───

function AIRequestItem({ log }: { log: import('../../store/debugStore').APIRequestLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, borderLeft: `3px solid ${STATUS_COLORS[log.status]}` }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ fontSize: 10 }}>{expanded ? '▼' : '▶'}</span>
        <Badge label={log.taskType} color="#4A90D9" />
        <Badge label={log.role} color="#607D8B" />
        <Badge label={log.status} color={STATUS_COLORS[log.status]} />
        {log.runtimeMode && <Badge label={log.runtimeMode} color={log.runtimeMode === 'stateless' ? '#00A7A7' : '#6A5ACD'} />}
        {log.cacheHit != null && <Badge label={log.cacheHit ? 'cache hit' : 'cache miss'} color={log.cacheHit ? '#4CAF50' : '#795548'} />}
        <span style={{ fontSize: 11, color: '#667788' }}>{formatTime(log.timestamp)}</span>
        {log.durationMs != null && (
          <span style={{ fontSize: 10, color: '#8899AA', marginLeft: 'auto' }}>{log.durationMs}ms</span>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {log.timings && <TimingList timings={log.timings} />}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8899AA', marginBottom: 3 }}>User Message</div>
            <pre style={{ fontSize: 12, color: '#C8D0DA', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 120, overflow: 'auto', margin: 0 }}>{log.userMessage}</pre>
          </div>
          <CollapsibleSection title="System Prompt">
            <pre style={{ fontSize: 11, color: '#AAB4C0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{log.systemPrompt}</pre>
          </CollapsibleSection>
          <CollapsibleSection title="Context">
            <pre style={{ fontSize: 11, color: '#AAB4C0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, maxHeight: 500, overflow: 'auto' }}>{log.contextSummary}</pre>
          </CollapsibleSection>
          {log.responseText && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#4CAF50', marginBottom: 3 }}>Response</div>
              <pre style={{ fontSize: 12, color: '#C8D0DA', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200, overflow: 'auto', margin: 0 }}>{log.responseText}</pre>
            </div>
          )}
          {log.error && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#F44336', marginBottom: 3 }}>Error</div>
              <pre style={{ fontSize: 12, color: '#F44336', margin: 0 }}>{log.error}</pre>
            </div>
          )}
          {log.toolCalls && log.toolCalls.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#FF9800', marginBottom: 3 }}>Tool Calls ({log.toolCalls.length})</div>
              {log.toolCalls.map((tc, i) => (
                <div key={i} style={{ fontSize: 11, padding: '4px 8px', background: 'rgba(255,152,0,0.1)', borderRadius: 4, marginBottom: 4 }}>
                  <strong>{tc.name}</strong>
                  <pre style={{ fontSize: 10, color: '#AAB4C0', whiteSpace: 'pre-wrap', margin: '4px 0 0 0' }}>{JSON.stringify(tc.arguments, null, 2)}</pre>
                  {tc.result && <pre style={{ fontSize: 10, color: '#8899AA', whiteSpace: 'pre-wrap', margin: '4px 0 0 0' }}>{tc.result.slice(0, 500)}</pre>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#8899AA', cursor: 'pointer', userSelect: 'none' }} onClick={() => setOpen(!open)}>
        {open ? '▼' : '▶'} {title}
      </div>
      {open && (
        <div style={{ background: 'rgba(0,0,0,0.15)', padding: 8, borderRadius: 4, marginTop: 4, maxHeight: 400, overflow: 'auto' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function AITab() {
  const apiLogs = useDebugStore((s) => s.apiLogs);
  const clearLogs = useDebugStore((s) => s.clearLogs);

  if (apiLogs.length === 0) {
    return <div style={{ color: '#667788', padding: 16, textAlign: 'center' }}>暂无 AI 请求日志</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#667788' }}>共 {apiLogs.length} 条</span>
        <button
          type="button"
          onClick={clearLogs}
          style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#8899AA', borderRadius: 3, cursor: 'pointer' }}
        >
          清空
        </button>
      </div>
      {[...apiLogs].reverse().map((log) => (
        <AIRequestItem key={log.id} log={log} />
      ))}
    </div>
  );
}

// ─── Tab: Conversations ───

function ConversationsTab() {
  const conversationLog = useAIStore((s) => s.conversationLog);

  if (conversationLog.length === 0) {
    return <div style={{ color: '#667788', padding: 16, textAlign: 'center' }}>暂无对话记录</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, color: '#667788', marginBottom: 4 }}>共 {conversationLog.length} 条</div>
      {conversationLog.map((entry: ConversationLogEntry) => (
        <div
          key={entry.id}
          style={{
            padding: '6px 10px',
            background: entry.role === 'player' ? 'rgba(74,144,217,0.12)' : 'rgba(76,175,80,0.12)',
            borderRadius: 6,
            alignSelf: entry.role === 'player' ? 'flex-start' : 'flex-end',
            maxWidth: '85%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Badge label={entry.role === 'player' ? '玩家' : 'AI'} color={entry.role === 'player' ? '#4A90D9' : '#4CAF50'} />
            <span style={{ fontSize: 10, color: '#667788' }}>第{entry.month}月</span>
            <span style={{ fontSize: 10, color: '#556677' }}>{formatTime(entry.timestamp)}</span>
            <span style={{ fontSize: 10, color: '#556677' }}>{entry.source}</span>
            {entry.emotionalImpact != null && (
              <span style={{ fontSize: 10, color: '#FF9800' }}>情感 {entry.emotionalImpact}</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#C8D0DA', lineHeight: 1.5 }}>{entry.content}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Hidden Values ───

function HiddenValuesTab() {
  const personality = useGameStore((s) => s.aiPersonality);
  const attributes = useGameStore((s) => s.aiAttributes);
  const resources = useGameStore((s) => s.resources);
  const player = useGameStore((s) => s.player);
  const personalityType = determinePersonalityType(personality);
  const direction = calculateDirection(attributes);
  const wearStage = getWearStage(resources.physicalWear, resources.mentalWear);
  const maxAP = calculateMaxAP(resources.physicalWear, resources.mentalWear);
  const roleCursors = useAIStore((s) => s.roleCursors);
  const eventLog = useAIStore((s) => s.eventLog);
  const lastEventImpact = eventLog.length > 0 ? eventLog[eventLog.length - 1].emotionalImpact : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <SectionTitle>性格维度</SectionTitle>
      {(Object.keys(personality) as (keyof typeof personality)[]).map((key) => (
        <div key={key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 12, color: '#AAB4C0' }}>{PERSONALITY_LABELS[key]}</span>
          </div>
          <ProgressBar value={personality[key]} color={personality[key] >= 50 ? '#4A90D9' : '#FF9800'} />
        </div>
      ))}

      <SectionTitle>推导结果</SectionTitle>
      <KVRow label="性格类型" value={personalityType} />
      <KVRow label="培养方向" value={`${direction.direction}（${direction.topAttributes.map((key) => ATTRIBUTE_LABELS[key]).join(' + ')}）`} />
      <KVRow label="方向推理" value={direction.reasoning} />

      <SectionTitle>磨损系统</SectionTitle>
      <KVRow label="磨损阶段" value={wearStage} color={WEAR_STAGE_COLORS[wearStage]} />
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, color: '#AAB4C0' }}>体力磨损</span>
          <ProgressBar value={resources.physicalWear} color={WEAR_STAGE_COLORS[wearStage]} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, color: '#AAB4C0' }}>精神磨损</span>
          <ProgressBar value={resources.mentalWear} color={WEAR_STAGE_COLORS[wearStage]} />
        </div>
      </div>
      <KVRow label="AP 上限" value={`${maxAP}（当前 ${resources.actionPoints}）`} />

      <SectionTitle>身份 & 情感</SectionTitle>
      <KVRow label="玩家身份" value={player.identity} />
      <KVRow label="觉察层级" value={`Tier ${player.awarenessTier}`} />
      {lastEventImpact != null && <KVRow label="最近情感影响" value={`${lastEventImpact}/10`} />}

      <SectionTitle>角色游标</SectionTitle>
      {(Object.entries(roleCursors) as [string, { lastSeenEventIndex: number; syncedAt: number }][]).map(([role, cursor]) => (
        <div key={role} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
          <span style={{ color: '#AAB4C0' }}>{role}</span>
          <span style={{ color: '#8899AA' }}>
            lastSeen: {cursor.lastSeenEventIndex} / {eventLog.length - 1}
            {cursor.syncedAt > 0 && <span style={{ marginLeft: 8, fontSize: 10, color: '#556677' }}>{formatTime(cursor.syncedAt)}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function KVRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color: '#AAB4C0' }}>{label}</span>
      <span style={{ color: color || '#C8D0DA', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ─── Tab: Game State ───

function GameStateTab() {
  const phase = useGameStore((s) => s.phase);
  const currentMonth = useGameStore((s) => s.currentMonth);
  const maxMonths = useGameStore((s) => s.maxMonths);
  const aiName = useGameStore((s) => s.aiName);
  const aiGender = useGameStore((s) => s.aiGender);
  const aiAttributes = useGameStore((s) => s.aiAttributes);
  const resources = useGameStore((s) => s.resources);
  const currentLocationId = useGameStore((s) => s.currentLocationId);
  const currentEvent = useGameStore((s) => s.currentEvent);
  const currentMonthActions = useGameStore((s) => s.currentMonthActions);
  const inventory = useGameStore((s) => s.inventory);
  const gameOverReason = useGameStore((s) => s.gameOverReason);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <SectionTitle>基本信息</SectionTitle>
      <KVRow label="阶段" value={phase} />
      <KVRow label="月份" value={`${currentMonth} / ${maxMonths}`} />
      <KVRow label="AI 名字" value={aiName || '—'} />
      <KVRow label="AI 性别" value={aiGender} />

      <SectionTitle>六维属性</SectionTitle>
      {(Object.keys(aiAttributes) as (keyof typeof aiAttributes)[]).map((key) => (
        <div key={key}>
          <span style={{ fontSize: 12, color: '#AAB4C0' }}>{ATTRIBUTE_LABELS[key as AttributeKey]}</span>
          <ProgressBar value={aiAttributes[key]} />
        </div>
      ))}

      <SectionTitle>资源</SectionTitle>
      <KVRow label="行动力" value={`${resources.actionPoints} / ${resources.maxActionPoints}`} />
      <KVRow label="资金" value={`${resources.funds}`} />
      <KVRow label="体力磨损" value={`${resources.physicalWear}/100`} />
      <KVRow label="精神磨损" value={`${resources.mentalWear}/100`} />

      <SectionTitle>当前状态</SectionTitle>
      <KVRow label="地点" value={currentLocationId || '—'} />
      <KVRow label="当前事件" value={currentEvent?.title || '—'} />
      <KVRow label="本月行动数" value={`${currentMonthActions.length}`} />
      <KVRow label="背包物品" value={`${inventory.length}`} />
      {gameOverReason && <KVRow label="结束原因" value={gameOverReason} color="#F44336" />}
    </div>
  );
}

// ─── Main Panel ───

export const DebugPanel: React.FC = () => {
  const panelOpen = useDebugStore((s) => s.panelOpen);
  const setPanelOpen = useDebugStore((s) => s.setPanelOpen);
  const [activeTab, setActiveTab] = useState<TabId>('events');

  // Drag & resize state
  const [pos, setPos] = useState(loadPos);
  const [size, setSize] = useState(loadSize);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  // Persist position/size
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(pos));
  }, [pos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SIZE, JSON.stringify(size));
  }, [size]);

  // Global mouse handlers for drag and resize
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setPos({
          x: Math.max(-size.w + 80, Math.min(window.innerWidth - 80, dragRef.current.origX + dx)),
          y: Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.origY + dy)),
        });
      }
      if (resizeRef.current) {
        const dx = e.clientX - resizeRef.current.startX;
        const dy = e.clientY - resizeRef.current.startY;
        setSize({
          w: Math.max(400, resizeRef.current.origW + dx),
          h: Math.max(300, resizeRef.current.origH + dy),
        });
      }
    };

    const handleUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  }, [pos]);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h };
  }, [size]);

  if (!panelOpen) return null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'events': return <EventsTab />;
      case 'ai': return <AITab />;
      case 'conversations': return <ConversationsTab />;
      case 'hidden': return <HiddenValuesTab />;
      case 'state': return <GameStateTab />;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        color: 'var(--color-text-primary)',
        background: 'linear-gradient(180deg, rgba(40, 50, 65, 0.97), rgba(24, 30, 42, 0.97))',
        border: '2px solid rgba(255,255,255,0.15)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        borderRadius: 8,
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      {/* Title bar — draggable */}
      <div
        onMouseDown={onDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'rgba(0,0,0,0.2)',
          cursor: 'move',
          userSelect: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700 }}>调试面板</span>
        <button
          type="button"
          onClick={() => setPanelOpen(false)}
          style={{
            width: 28,
            height: 28,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)',
            color: '#AAB4C0',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          x
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.1)',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '8px 4px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #4A90D9' : '2px solid transparent',
              background: activeTab === tab.id ? 'rgba(74,144,217,0.12)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#8899AA',
              fontSize: 12,
              fontWeight: activeTab === tab.id ? 700 : 400,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
        {renderTabContent()}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 16,
          height: 16,
          cursor: 'nwse-resize',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" style={{ opacity: 0.3 }}>
          <path d="M14 2 L2 14 M14 6 L6 14 M14 10 L10 14" stroke="#fff" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    </div>
  );
};
