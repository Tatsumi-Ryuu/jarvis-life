import React from 'react';
import { TopBar } from '../ui/TopBar';
import type { ActionItem } from '../../types';

interface LocationPageLayoutProps {
  locationName: string;
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  actions: ActionItem[];
  onAction: (action: ActionItem) => void;
  actionPoints: number;
  funds: number;
  mentalWear: number;
  onBack?: () => void;
}

export const LocationPageLayout: React.FC<LocationPageLayoutProps> = ({
  locationName,
  tabs,
  activeTab,
  onTabChange,
  actions,
  onAction,
  actionPoints,
  funds,
  mentalWear,
  onBack,
}) => {
  const filteredActions = actions.filter((a) => a.category === activeTab);

  return (
    <div className="w-scene-w h-scene-h flex flex-col">
      {/* TopBar */}
      <TopBar
        title={locationName}
        subtitleOn={false}
        actionPoints={actionPoints}
        funds={funds}
        mentalWear={mentalWear}
        onBack={onBack}
      />

      {/* Main body area: 1540px wide, centered */}
      <div
        className="flex-1 flex justify-center pt-[22px]"
        style={{ height: 1008 }}
      >
        <div className="flex gap-[22px]" style={{ width: 1540 }}>
          {/* Left panel: category tabs */}
          <div className="flex flex-col gap-[8px]" style={{ width: 320, minHeight: 736 }}>
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`
                  w-tab-w h-tab-h flex flex-col items-start justify-center px-6
                  border-main transition-colors text-left
                  ${
                    tab === activeTab
                      ? 'bg-action border-border-strong shadow-tab-active'
                      : 'bg-panel border-border-soft hover:bg-panel-soft'
                  }
                `}
              >
                <span
                  className={`text-tab-title ${
                    tab === activeTab ? 'text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  {tab}
                </span>
              </button>
            ))}
          </div>

          {/* Right content panel: action cards */}
          <div className="location-action-list flex flex-col gap-[16px] overflow-y-auto overflow-x-hidden pr-2" style={{ width: 1130, height: 964, minHeight: 0 }}>
            {/* ListHeader */}
            <div
              className="flex shrink-0 items-center px-6 bg-panel-soft border-b-subtle border-border-soft"
              style={{ width: 1118, height: 64, flexShrink: 0 }}
            >
              <span className="text-card-title text-text-primary">{activeTab}</span>
              <span className="ml-auto text-status text-text-muted">
                {filteredActions.length} 项
              </span>
            </div>

            {/* ActionCard list */}
            {filteredActions.map((action) => (
              <button
                key={action.id}
                onClick={() => onAction(action)}
                className={`
                  w-card-w h-card-h flex shrink-0 flex-col justify-center px-8 border-inner text-left
                  transition-colors
                  ${
                    action.status === 'available'
                      ? 'bg-panel border-border-strong shadow-card hover:bg-panel-soft cursor-pointer'
                      : action.status === 'recommended'
                      ? 'bg-warm-accent border-border-strong shadow-card cursor-pointer'
                      : action.status === 'completed'
                      ? 'bg-panel-soft border-border-soft opacity-60 cursor-default'
                      : 'bg-panel border-border-soft opacity-40 cursor-not-allowed'
                  }
                `}
                disabled={action.status === 'locked' || action.status === 'completed'}
              >
                <div className="flex items-center">
                  <span className="text-card-title text-text-primary">{action.name}</span>
                  <span className="ml-auto text-status text-text-secondary">
                    AP {action.ap} | 费用 {action.cost}
                  </span>
                </div>
                <span className="mt-1 text-body text-text-muted line-clamp-2">
                  {action.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
