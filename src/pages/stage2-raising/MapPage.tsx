import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AssetSlot } from '../../components/ui/AssetSlot';
import { TopBar } from '../../components/ui/TopBar';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { useGameStore } from '../../store/gameStore';
import { useRedDotMapNodes } from '../../store/redDotSelectors';

interface MapNode {
  id: string;
  name: string;
  x: number;
  y: number;
  locked?: boolean;
  lockReason?: string;
  newUnlockedActionIds?: string[];
}

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  home: { x: 1316, y: 411 },
  school: { x: 1716, y: 683 },
  company: { x: 913, y: 417 },
  park: { x: 224, y: 796 },
  mall: { x: 643, y: 885 },
  office: { x: 1120, y: 896 },
  logistics: { x: 1540, y: 971 },
  government: { x: 340, y: 446 },
};

const getLockReason = (nodeId: string, locked?: boolean): string | undefined => {
  if (!locked) return undefined;
  if (nodeId === 'government') return '非政府伦理委员无法进入政府区域';
  return '当前地点暂未开放';
};

export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const { month } = useParams<{ month: string }>();
  const resources = useGameStore((s) => s.resources);
  const currentMonth = useGameStore((s) => s.currentMonth);
  const mapNodes = useRedDotMapNodes();
  const phase = useGameStore((s) => s.phase);
  const markUnlockedActionsSeen = useGameStore((s) => s.markUnlockedActionsSeen);
  const [hoveredLockedNodeId, setHoveredLockedNodeId] = useState<string | null>(null);
  const [lockTooltipPosition, setLockTooltipPosition] = useState({ x: 0, y: 0 });
  const [examLockToast, setExamLockToast] = useState(false);
  const routeMonth = Math.max(1, parseInt(month || '1', 10) || 1);
  const displayMonth = currentMonth || routeMonth;
  const isExam = phase === 'exam';

  const nodes: MapNode[] = mapNodes.map((n) => ({
    id: n.id,
    name: n.name,
    x: NODE_POSITIONS[n.id]?.x ?? 400,
    y: NODE_POSITIONS[n.id]?.y ?? 400,
    locked: isExam ? n.id !== 'company' : n.locked,
    lockReason: isExam
      ? (n.id === 'company' ? undefined : '体检时暂不可用')
      : getLockReason(n.id, n.locked),
    newUnlockedActionIds: n.newUnlockedActionIds,
  }));

  const hoveredLockedNode = nodes.find((node) => node.id === hoveredLockedNodeId) ?? null;

  const handleNodeClick = (node: MapNode) => {
    if (node.locked) {
      if (isExam) {
        setExamLockToast(true);
        setTimeout(() => setExamLockToast(false), 2500);
      }
      return;
    }

    if (isExam) {
      navigate('/exam/company-entrance');
      return;
    }

    if (node.newUnlockedActionIds && node.newUnlockedActionIds.length > 0) {
      markUnlockedActionsSeen(node.newUnlockedActionIds);
    }

    if (node.id === 'home') {
      navigate(`/raising/idle/${displayMonth}`);
      return;
    }

    navigate(`/raising/location/${node.id}`);
  };

  const handleBack = () => {
    if (isExam) {
      navigate('/exam/idle');
      return;
    }
    navigate(`/raising/idle/${displayMonth}`);
  };

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: 'var(--color-canvas)',
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, zIndex: 50 }}>
        <TopBar
          title="地图"
          iconAssetId="icon_map"
          actionPoints={resources.actionPoints}
          funds={resources.funds}
          mentalWear={resources.mentalWear}
          physicalWear={resources.physicalWear}
          onBack={handleBack}
          backLabel="返回"
          subtitle={isExam ? '前往基石公司进行例行体检' : undefined}
          subtitleOn={isExam}
        />
      </div>

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0">
          <AssetSlot assetId="bg_map2" width={1920} height={1080} />
        </div>
        {isExam && (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(244, 252, 255, 0.20)' }}
          />
        )}

        {nodes.map((node) => {
          const isLockedHovered = hoveredLockedNodeId === node.id;

          return (
            <button
              key={node.id}
              type="button"
              onClick={() => handleNodeClick(node)}
              onMouseEnter={(event) => {
                if (node.locked) {
                  setHoveredLockedNodeId(node.id);
                  setLockTooltipPosition({ x: event.clientX, y: event.clientY });
                }
              }}
              onMouseMove={(event) => {
                if (node.locked) {
                  setLockTooltipPosition({ x: event.clientX, y: event.clientY });
                }
              }}
              onMouseLeave={() => setHoveredLockedNodeId(null)}
              onFocus={() => {
                if (node.locked) setHoveredLockedNodeId(node.id);
              }}
              onBlur={() => setHoveredLockedNodeId(null)}
              aria-describedby={node.locked ? `map-lock-reason-${node.id}` : undefined}
              className={node.locked ? 'cursor-not-allowed' : 'cursor-pointer transition-transform hover:-translate-y-1 active:scale-95'}
              style={{
                ...chromePanelStyle({
                  strong: isExam && !node.locked,
                  padding: 8,
                  boxShadow: isExam && !node.locked
                    ? 'inset 0 0 0 1px rgba(255,255,255,0.10), 0 0 24px rgba(143, 224, 255, 0.26), 0 18px 36px rgba(0,0,0,0.22)'
                    : 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 18px 36px rgba(0,0,0,0.20)',
                }),
                position: 'absolute',
                left: node.x,
                top: node.y,
                transform: 'translate(-50%, -50%)',
                width: isExam && !node.locked ? 220 : 200,
                height: isExam && !node.locked ? 88 : 80,
                zIndex: isLockedHovered || (isExam && !node.locked) ? 20 : 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: node.locked ? 0.82 : 1,
                outline: 'none',
              }}
            >
              <div style={chromeDecorStyle} />
              <div style={chromeInnerFrameStyle} />

              <span
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'block',
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  lineHeight: 1,
                  letterSpacing: '0.06em',
                  transform: 'translateY(0)',
                }}
              >
                {node.name}
              </span>
              {!node.locked && node.newUnlockedActionIds && node.newUnlockedActionIds.length > 0 && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    right: 18,
                    top: 14,
                    zIndex: 2,
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: '#ff1f2f',
                    border: '3px solid #ffffff',
                    boxShadow: '0 0 0 2px rgba(80,0,8,0.42), 0 0 20px rgba(255, 31, 47, 0.96)',
                  }}
                />
              )}
            </button>
          );
        })}

        {hoveredLockedNode?.lockReason && (
          <div
            id={`map-lock-reason-${hoveredLockedNode.id}`}
            role="tooltip"
            style={{
              position: 'fixed',
              left: lockTooltipPosition.x + 18,
              top: lockTooltipPosition.y - 14,
              width: 244,
              padding: '10px 14px',
              ...chromePanelStyle({ strong: true, padding: '10px 14px' }),
              color: 'var(--color-text-primary)',
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.5,
              pointerEvents: 'none',
              zIndex: 80,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12), 0 14px 30px rgba(0,0,0,0.24)',
            }}
          >
            <div style={chromeDecorStyle} />
            <div style={chromeInnerFrameStyle} />
            <span style={{ position: 'relative', zIndex: 1 }}>{hoveredLockedNode.lockReason}</span>
          </div>
        )}

        {isExam && (
          <div
            className="absolute flex items-center justify-center"
            style={{
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(255, 211, 94, 0.24)',
              border: '1px solid var(--color-warm-accent)',
              padding: '12px 32px',
              zIndex: 15,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              请点击“基石公司”前往体检
            </span>
          </div>
        )}

        {examLockToast && (
          <div
            className="flex items-center justify-center"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
              ...chromePanelStyle({ strong: true, padding: '24px 48px' }),
              padding: '24px 48px',
            }}
          >
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
              请先前往公司体检
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
