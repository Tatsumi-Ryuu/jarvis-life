import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { assetMap } from '../../data/asset-map';
import { useGameStore } from '../../store/gameStore';
import { useInventory } from '../../store/gameSelectors';
import { ATTRIBUTE_LABELS } from '../../types';
import type { ActionEffect } from '../../types';
import { sf } from '../../utils/font';
import { recordGiftMemory } from '../../services/companion-memory-events';

interface BackpackModalProps {
  open: boolean;
  onClose: () => void;
  bgAssetId?: string;
}

function formatItemEffects(effects: ActionEffect[]): string {
  const parts: string[] = [];
  for (const e of effects) {
    if (e.type === 'attribute' && e.target) {
      const label = ATTRIBUTE_LABELS[e.target as keyof typeof ATTRIBUTE_LABELS] || e.target;
      parts.push(`${label} +${e.value}`);
    } else if (e.type === 'personality' && e.target) {
      const labels: Record<string, string> = {
        expressiveVsSilent: '表达',
        trustVsGuard: '信任',
        rationalVsIntuitive: '理性',
      };
      const label = labels[e.target] || e.target;
      parts.push(`${label} ${e.value > 0 ? '+' : ''}${e.value}`);
    } else if (e.type === 'physicalWear') {
      parts.push(`身体磨损 ${e.value > 0 ? '+' : ''}${e.value}`);
    } else if (e.type === 'mentalWear') {
      parts.push(`精神磨损 ${e.value > 0 ? '+' : ''}${e.value}`);
    }
  }
  return parts.join('  ');
}

interface GiftFeedback {
  itemName: string;
  effectText: string;
}

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

const BackpackModal: React.FC<BackpackModalProps> = ({ open, onClose, bgAssetId }) => {
  const navigate = useNavigate();
  const inventory = useInventory();
  const removeItem = useGameStore((s) => s.removeItem);
  const executeAction = useGameStore((s) => s.executeAction);
  const markInventorySeen = useGameStore((s) => s.markInventorySeen);
  const [giftFeedback, setGiftFeedback] = useState<GiftFeedback | null>(null);

  useEffect(() => {
    if (!open) return;
    markInventorySeen(inventory.map((item) => item.id));
  }, [inventory, markInventorySeen, open]);

  if (!open) return null;

  const handleGift = (item: (typeof inventory)[number]) => {
    const effectText = item.effects && item.effects.length > 0
      ? formatItemEffects(item.effects)
      : '心情 +1';

    if (item.effects && item.effects.length > 0) {
      executeAction({
        id: `gift_${item.id}`,
        name: `赠送${item.name}`,
        tier: 'primary',
        ap: 0,
        cost: 0,
        description: '',
        effects: item.effects,
        status: 'available',
        category: '赠送',
      });
    }
    removeItem(item.id);
    recordGiftMemory(item.name, item.effects ?? []);
    setGiftFeedback({ itemName: item.name, effectText });
  };

  const handleClose = () => {
    setGiftFeedback(null);
    onClose();
  };

  const handleGoToMall = () => {
    setGiftFeedback(null);
    onClose();
    navigate('/raising/location/mall', { state: { preferredTab: '购物' } });
  };

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
          <h2 style={{ margin: 0, fontSize: sf(24), fontWeight: 700, color: 'var(--color-text-primary)' }}>背包</h2>
          <button onClick={handleClose} style={miniButtonStyle}>
            <div style={chromeInnerFrameStyle} />
            <span style={{ position: 'relative', zIndex: 1 }}>X</span>
          </button>
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '12px 24px',
            borderBottom: '1px solid var(--color-border-soft)',
            background: 'rgba(255, 221, 84, 0.14)',
          }}
        >
          <span style={{ fontSize: sf(17), fontWeight: 800, color: 'var(--color-text-primary)' }}>
            前往商场看看吧
          </span>
          <Button
            variant="secondary"
            onClick={handleGoToMall}
            style={{ width: 160, height: 48 }}
          >
            前往商场
          </Button>
        </div>

        <div
          style={{
            flex: 1,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            overflowY: 'auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {inventory.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <span style={{ fontSize: sf(18), color: 'var(--color-text-muted)' }}>背包空空如也</span>
            </div>
          ) : (
            inventory.map((item) => (
              <div
                key={item.id}
                style={{
                  ...chromePanelStyle({ padding: '16px 20px' }),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  position: 'relative',
                }}
              >
                <div style={chromeDecorStyle} />
                <div style={chromeInnerFrameStyle} />
                <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: sf(18), fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {item.name}
                  </h3>
                  <p style={{ margin: '0 0 4px 0', fontSize: sf(14), lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                    {item.description}
                  </p>
                  {item.effects && item.effects.length > 0 && (
                    <span style={{ fontSize: sf(14), color: 'var(--color-status-available)', fontWeight: 600 }}>
                      {formatItemEffects(item.effects)}
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <Button onClick={() => handleGift(item)}>赠送</Button>
                </div>
              </div>
            ))
          )}
        </div>

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
          <Button variant="secondary" onClick={handleClose}>关闭</Button>
        </div>

        {giftFeedback && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.36)',
              padding: 24,
            }}
          >
            <div
              style={{
                ...chromePanelStyle({ strong: true, padding: 0 }),
                width: 520,
                maxWidth: '100%',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={chromeDecorStyle} />
              <div style={chromeInnerFrameStyle} />
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  padding: '28px 32px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 18,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--color-status-available)',
                    color: '#fff',
                    fontSize: sf(26),
                    fontWeight: 800,
                    boxShadow: '6px 6px 0 rgba(31, 111, 152, 0.24)',
                  }}
                >
                  !
                </div>
                <div>
                  <div
                    style={{
                      fontSize: sf(24),
                      fontWeight: 800,
                      color: 'var(--color-text-primary)',
                      marginBottom: 8,
                    }}
                  >
                    AI很喜欢
                  </div>
                  <div
                    style={{
                      fontSize: sf(15),
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.6,
                    }}
                  >
                    已赠送：{giftFeedback.itemName}
                  </div>
                </div>
                <div
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    background: 'rgba(137, 209, 255, 0.12)',
                    border: '1px solid var(--color-border-soft)',
                    color: 'var(--color-status-available)',
                    fontSize: sf(18),
                    fontWeight: 800,
                    lineHeight: 1.6,
                  }}
                >
                  {giftFeedback.effectText}
                </div>
                <Button onClick={() => setGiftFeedback(null)} style={{ width: 180 }}>
                  知道了
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackpackModal;
