import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import type { Identity } from '../../types';
import { AssetSlot } from '../../components/ui/AssetSlot';

const identityInfo: Record<Identity, { name: string; level: string; warning: string }> = {
  researcher: {
    name: '基石工业研究员',
    level: '第二级',
    warning: '※ 您与AI的全部交互将被记录作为项目数据。',
  },
  committee: {
    name: '政府伦理委员',
    level: '第二级',
    warning: '※ 您与AI的全部交互将被记录作为项目数据。\n※ 请勿告知项目外人员本项目的存在。',
  },
  volunteer: {
    name: '签约志愿者',
    level: '第一级',
    warning: '※ 您与AI的全部交互将被记录作为项目数据。',
  },
};

export const IdentityResultPage: React.FC = () => {
  const navigate = useNavigate();
  const player = useGameStore((s) => s.player);
  const identity = identityInfo[player.identity];

  return (
    <div className="relative flex flex-col items-center justify-center"
      style={{ width: 1920, height: 1080, backgroundColor: 'var(--color-canvas)' }}>
      <div className="absolute inset-0">
        <AssetSlot assetId="bg_story" width={1920} height={1080} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 p-12"
        style={{
          backgroundColor: 'var(--color-panel)',
          border: '6px solid var(--color-border-strong)',
          boxShadow: '10px 10px 0 rgba(31,111,152,0.30)',
          maxWidth: 700,
        }}>
        <h2 className="text-page-title" style={{ color: 'var(--color-text-primary)', fontSize: 30, fontWeight: 700 }}>
          您的身份匹配结果
        </h2>

        <div style={{ width: '100%', height: 2, backgroundColor: 'var(--color-border-soft)' }} />

        <p style={{ fontSize: 20, color: 'var(--color-text-secondary)' }}>您已被匹配至：</p>

        <p style={{ fontSize: 36, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          【{identity.name}】
        </p>

        <div className="flex flex-col items-start gap-2 mt-4" style={{ width: '100%' }}>
          <p style={{ fontSize: 20, color: 'var(--color-text-secondary)' }}>
            保密等级：{identity.level}
          </p>
          <p style={{ fontSize: 20, color: 'var(--color-text-secondary)' }}>
            启动关怀金：3000
          </p>
        </div>

        <div className="mt-4 p-4" style={{
          backgroundColor: 'var(--color-panel-soft)',
          border: '4px solid var(--color-border-soft)',
          width: '100%',
        }}>
          <p className="whitespace-pre-line" style={{ fontSize: 16, color: 'var(--color-text-secondary)' }}>
            {identity.warning}
          </p>
        </div>

        <button
          onClick={() => navigate('/profile-creation')}
          className="font-bold cursor-pointer transition-transform hover:-translate-y-1 active:scale-95 mt-4"
          style={{
            width: 260, height: 86,
            backgroundColor: 'var(--color-action)',
            border: '6px solid var(--color-border-strong)',
            boxShadow: '10px 10px 0 rgba(31,111,152,0.30)',
            color: 'var(--color-text-primary)',
            fontSize: 28, fontWeight: 700,
          }}
        >
          确认
        </button>
      </div>
    </div>
  );
};
