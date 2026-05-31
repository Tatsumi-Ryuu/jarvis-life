import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { AssetSlot } from '../../components/ui/AssetSlot';
import { TopBar } from '../../components/ui/TopBar';
import { ActionCard } from '../../components/ui/ActionCard';
import { ListHeader } from '../../components/ui/ListHeader';
import { StatBar } from '../../components/ui/StatBar';
import { chromeDecorStyle, chromeInnerFrameStyle, chromePanelStyle } from '../../components/ui/chrome';
import { NoWearConfirmModal } from '../../components/feedback/NoWearConfirmModal';
import { PurchaseSuccessModal } from '../../components/feedback/PurchaseSuccessModal';
import { useGameStore } from '../../store/gameStore';
import { useAIInfo, useLocationData } from '../../store/gameSelectors';
import { triggerSpecialEventAfterAction } from '../../engine/special-event-trigger';
import { checkActionAvailable } from '../../engine/action-executor';
import { FIND_CAT_ACTION_ID } from '../../data/cat-trap-action';
import { GOMOKU_AI_TEST_ACTION_ID } from '../../data/gomoku-ai-test-action';
import { recordPurchaseMemory } from '../../services/companion-memory-events';
import type { LocationId, ActionEffect, InventoryItem, AttributeKey } from '../../types';
import { ATTRIBUTE_LABELS } from '../../types';
import { getAttributeDescription } from '../../engine/attribute-calculator';
import { sf } from '../../utils/font';

const LOCATION_BG_MAP: Record<string, string> = {
  home: 'bg_home',
  school: 'bg_school',
  park: 'bg_park',
  company: 'bg_company',
  government: 'bg_government',
  mall: 'bg_mall',
  office: 'bg_office',
  logistics: 'bg_logistics',
};

const PERSONALITY_LABELS: Record<string, string> = {
  expressiveVsSilent: '表达',
  trustVsGuard: '信任',
  rationalVsIntuitive: '理性',
  utilitarianVsDeontological: '功利',
  resilientVsSensitive: '韧性',
  selfishVsAltruistic: '利他',
};

function formatEffects(effects: ActionEffect[], cost: number): string {
  const parts: string[] = [];
  let fundsFromEffects = 0;

  for (const effect of effects) {
    if (effect.type === 'funds') {
      fundsFromEffects = effect.value;
    } else if (effect.type === 'attribute' && effect.target) {
      const label = ATTRIBUTE_LABELS[effect.target as keyof typeof ATTRIBUTE_LABELS] || effect.target;
      parts.push(`${label} +${effect.value}`);
    } else if (effect.type === 'physicalWear') {
      parts.push(`身体磨损 ${effect.value > 0 ? '+' : ''}${effect.value}`);
    } else if (effect.type === 'mentalWear') {
      parts.push(`精神磨损 ${effect.value > 0 ? '+' : ''}${effect.value}`);
    } else if (effect.type === 'personality' && effect.target) {
      const label = PERSONALITY_LABELS[effect.target] || effect.target;
      parts.push(`${label} ${effect.value > 0 ? '+' : ''}${effect.value}`);
    }
  }

  if (fundsFromEffects !== 0) {
    parts.push(`资金 ${fundsFromEffects > 0 ? '+' : ''}${fundsFromEffects}`);
  } else if (cost > 0) {
    parts.push(`资金 -${cost}`);
  }

  return parts.join('  ');
}

function formatPrerequisites(prerequisite: Partial<Record<AttributeKey, number>> | undefined): string {
  if (!prerequisite) return '';
  return Object.entries(prerequisite)
    .map(([key, min]) => {
      const label = ATTRIBUTE_LABELS[key as AttributeKey] || key;
      return `${label} ≥ ${min}`;
    })
    .join(' / ');
}

function hasRepairableWear(actionEffects: ActionEffect[], resources: { mentalWear: number; physicalWear: number }): boolean {
  const repairsMental = actionEffects.some((effect) => effect.type === 'mentalWear' && effect.value < 0);
  const repairsPhysical = actionEffects.some((effect) => effect.type === 'physicalWear' && effect.value < 0);

  return (
    (repairsMental && resources.mentalWear > 0) ||
    (repairsPhysical && resources.physicalWear > 0)
  );
}

export const LocationPage: React.FC = () => {
  const { location } = useParams<{ location: string }>();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const resources = useGameStore((s) => s.resources);
  const executeAction = useGameStore((s) => s.executeAction);
  const setCurrentLocationId = useGameStore((s) => s.setCurrentLocationId);
  const addItem = useGameStore((s) => s.addItem);
  const addFunds = useGameStore((s) => s.addFunds);
  const recordCompletedAction = useGameStore((s) => s.recordCompletedAction);
  const currentMonth = useGameStore((s) => s.currentMonth);
  const identity = useGameStore((s) => s.player.identity);
  const { attributes } = useAIInfo();
  const attributeEntries = Object.entries(attributes).map(([key, value]) => ({
    key: key as AttributeKey,
    label: ATTRIBUTE_LABELS[key as AttributeKey] || key,
    value,
  }));

  const locationId = (location || 'school') as LocationId;
  const locationData = useLocationData(locationId);
  const preferredTab = (routeLocation.state as { preferredTab?: string } | null)?.preferredTab;
  const [activeTab, setActiveTab] = useState(
    preferredTab && locationData?.tabs.includes(preferredTab) ? preferredTab : locationData?.tabs[0] || '',
  );
  const [showNoWearConfirm, setShowNoWearConfirm] = useState(false);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const bgAssetId = LOCATION_BG_MAP[locationId] || 'bg_home';

  useEffect(() => {
    setCurrentLocationId(locationId);
  }, [locationId, setCurrentLocationId]);

  useEffect(() => {
    if (!preferredTab || !locationData?.tabs.includes(preferredTab)) return;
    setActiveTab(preferredTab);
    navigate(routeLocation.pathname, { replace: true });
  }, [locationData?.tabs, navigate, preferredTab, routeLocation.pathname]);

  if (!locationData) {
    return (
      <div className="flex items-center justify-center" style={{ width: 1920, height: 1080 }}>
        <span style={{ fontSize: sf(24), color: 'var(--color-text-secondary)' }}>地点未找到</span>
      </div>
    );
  }

  const filteredActions = locationData.actions.filter((action) => action.category === activeTab);

  const executeAndAdvance = (actionId: string) => {
    const action = locationData.actions.find((item) => item.id === actionId);
    if (!action) return;

    executeAction(action);
    triggerSpecialEventAfterAction(action, locationId);

    navigate('/raising/action-progress');
  };

  const handleAction = (actionId: string) => {
    const action = locationData.actions.find((item) => item.id === actionId);
    if (!action) return;
    if (resources.actionPoints < action.ap) return;
    if (action.cost > 0 && resources.funds < action.cost) return;
    if (!checkActionAvailable(action, attributes, identity).available) return;

    setCurrentLocationId(locationId);

    if (action.id === FIND_CAT_ACTION_ID) {
      navigate('/raising/park/find-cat');
      return;
    }

    if (action.id === GOMOKU_AI_TEST_ACTION_ID) {
      navigate('/raising/company/gomoku-ai-test');
      return;
    }

    if (action.category === '购物') {
      const inventoryItem: InventoryItem = {
        id: action.id,
        name: action.name,
        description: action.description,
        iconAssetId: `icon_${action.id}`,
        type: 'gift',
        effects: action.effects.filter((effect) => effect.type !== 'funds'),
      };
      addItem(inventoryItem);
      addFunds(-action.cost);
      recordCompletedAction(action);
      recordPurchaseMemory(action.name, action.cost, inventoryItem.effects ?? []);
      setShowPurchaseSuccess(true);
      return;
    }

    if (action.category === '维护') {
      if (!hasRepairableWear(action.effects, resources)) {
        setPendingActionId(actionId);
        setShowNoWearConfirm(true);
        return;
      }
    }

    executeAndAdvance(actionId);
  };

  const handleNoWearConfirm = () => {
    if (pendingActionId) {
      executeAndAdvance(pendingActionId);
    }
    setShowNoWearConfirm(false);
    setPendingActionId(null);
  };

  const handleNoWearCancel = () => {
    setShowNoWearConfirm(false);
    setPendingActionId(null);
  };

  const handleBack = () => {
    navigate(`/raising/map/${currentMonth}`);
  };

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
      <div style={{ position: 'absolute', top: 0, left: 0, width: 1920, height: 1080, zIndex: 0 }}>
        <AssetSlot assetId={bgAssetId} width={1920} height={1080} />
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: 1920,
          height: 1080,
          backgroundColor: 'rgba(244, 252, 255, 0.20)',
        }}
      >
        <TopBar
          title={locationData.name}
          actionPoints={resources.actionPoints}
          funds={resources.funds}
          mentalWear={resources.mentalWear}
          physicalWear={resources.physicalWear}
          onBack={handleBack}
        />

        <div className="flex-1 flex justify-center pt-[22px]" style={{ height: 1008 }}>
          <div className="flex gap-[22px]" style={{ width: 1540 }}>
            <div className="flex flex-col gap-[8px]" style={{ width: 320, minHeight: 736 }}>
              {locationData.tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="cursor-pointer"
                  style={{
                    ...chromePanelStyle({
                      strong: tab === activeTab,
                      padding: '0 24px',
                      boxShadow: tab === activeTab
                        ? 'inset 0 0 0 1px rgba(255,255,255,0.10), 0 18px 36px rgba(0,0,0,0.22)'
                        : 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 14px 28px rgba(0,0,0,0.18)',
                    }),
                    width: 320,
                    height: 92,
                    fontSize: sf(24),
                    fontWeight: tab === activeTab ? 700 : 400,
                    color: 'var(--color-text-primary)',
                    textAlign: 'left',
                    paddingLeft: 24,
                    fontFamily: 'Inter, "Noto Sans SC", sans-serif',
                  }}
                >
                  <div style={chromeDecorStyle} />
                  <div style={chromeInnerFrameStyle} />
                  <span style={{ position: 'relative', zIndex: 1 }}>{tab}</span>
                </button>
              ))}

              <div
                className="flex flex-col gap-3"
                style={{
                  ...chromePanelStyle({ padding: '18px 16px' }),
                  marginTop: 12,
                }}
              >
                <div style={chromeDecorStyle} />
                <div style={chromeInnerFrameStyle} />
                <span
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    fontSize: sf(18),
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  当前属性
                </span>
                {attributeEntries.map((attr) => (
                  <div key={attr.label} style={{ position: 'relative', zIndex: 1 }}>
                    <StatBar
                      label={attr.label}
                      value={attr.value}
                      max={100}
                      desc={getAttributeDescription(attr.key, attr.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div
              className="location-action-list flex flex-col gap-[16px] overflow-y-auto overflow-x-hidden pr-2"
              style={{ width: 1130, height: 964, minHeight: 0 }}
            >
              <ListHeader
                title={activeTab}
                rightContent={
                  <span style={{ fontSize: sf(16), color: 'var(--color-text-muted)' }}>
                    {filteredActions.length} 项
                  </span>
                }
              />

              {filteredActions.map((action) => (
                <ActionCard
                  key={action.id}
                  title={action.name}
                  description={action.description}
                  status={action.status as 'available' | 'recommended' | 'completed' | 'locked'}
                  effects={formatEffects(action.effects, action.cost)}
                  apCost={action.ap}
                  disabled={resources.actionPoints < action.ap}
                  ctaText={activeTab === '购物' ? '立即购买' : undefined}
                  prerequisites={formatPrerequisites(action.prerequisite)}
                  prerequisite={action.prerequisite}
                  currentAttributes={attributes}
                  onAction={() => handleAction(action.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <NoWearConfirmModal
        open={showNoWearConfirm}
        onConfirm={handleNoWearConfirm}
        onCancel={handleNoWearCancel}
      />
      <PurchaseSuccessModal
        open={showPurchaseSuccess}
        onContinueShopping={() => setShowPurchaseSuccess(false)}
        onGoToBackpack={() => navigate(`/raising/idle/${currentMonth}`, { state: { openBackpack: true } })}
      />
    </div>
  );
};
