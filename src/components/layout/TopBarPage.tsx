import React from 'react';
import { TopBar } from '../ui/TopBar';

interface TopBarPageProps {
  title: string;
  subtitle?: string;
  subtitleOn: boolean;
  actionPoints: number;
  funds: number;
  mentalWear: number;
  onBack?: () => void;
  children: React.ReactNode;
}

export const TopBarPage: React.FC<TopBarPageProps> = ({
  title,
  subtitle,
  subtitleOn,
  actionPoints,
  funds,
  mentalWear,
  onBack,
  children,
}) => {
  return (
    <div className="w-scene-w h-scene-h flex flex-col">
      <TopBar
        title={title}
        subtitle={subtitle}
        subtitleOn={subtitleOn}
        actionPoints={actionPoints}
        funds={funds}
        mentalWear={mentalWear}
        onBack={onBack}
      />
      <div className="flex-1 overflow-y-auto" style={{ height: 1008 }}>
        {children}
      </div>
    </div>
  );
};
