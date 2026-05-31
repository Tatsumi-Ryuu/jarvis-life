import React from 'react';
import { AssetSlot } from '../ui/AssetSlot';

interface NarrationPageProps {
  children: React.ReactNode;
  bgAssetId?: string;
}

export const NarrationPage: React.FC<NarrationPageProps> = ({ children, bgAssetId }) => {
  return (
    <div className="relative w-scene-w h-scene-h flex flex-col">
      {/* Optional background */}
      {bgAssetId && (
        <div className="absolute inset-0">
          <AssetSlot assetId={bgAssetId} width={1920} height={1080} />
        </div>
      )}

      {/* Centered text content */}
      <div className="relative flex-1 flex items-center justify-center px-[560px]">
        <div className="w-[800px] text-text-primary text-body leading-relaxed">
          {children}
        </div>
      </div>

      {/* Bottom navigation area */}
      <div className="relative flex items-center justify-center gap-8 pb-12">
        {/* Navigation buttons rendered by page content via children or separately */}
      </div>
    </div>
  );
};
