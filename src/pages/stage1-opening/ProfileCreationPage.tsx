import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ATTRIBUTE_LABELS,
  type AttributeKey,
  type AiGender,
  type PlayerGender,
} from '../../types';
import { generateRandomAttributes, getAttributeDescription } from '../../engine/attribute-calculator';
import { useGameStore } from '../../store/gameStore';
import { AssetSlot } from '../../components/ui/AssetSlot';
import { StatBar } from '../../components/ui/StatBar';

const genderOptions: { value: AiGender; label: string }[] = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
];

const playerGenderOptions: { value: PlayerGender; label: string }[] = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
];

const INITIAL_ATTRIBUTE_VISUAL_MAX = 50;

function getInitialAttributeStage(key: AttributeKey, value: number): string {
  return getAttributeDescription(key, value);
}

export const ProfileCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const initGame = useGameStore((s) => s.initGame);
  const player = useGameStore((s) => s.player);
  const [playerName, setPlayerName] = useState('');
  const [aiName, setAiName] = useState('');
  const [aiGender, setAiGender] = useState<AiGender>('male');
  const [playerGender, setPlayerGender] = useState<PlayerGender>('male');
  const [customAddress, setCustomAddress] = useState('');

  const randomAttributes = useMemo(() => generateRandomAttributes(), []);
  const canSubmit =
    playerName.trim().length > 0 &&
    aiName.trim().length > 0 &&
    customAddress.trim().length > 0;

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: 1920, height: 1080, backgroundColor: 'var(--color-canvas)' }}
    >
      <div className="absolute inset-0">
        <AssetSlot assetId="bg_story" width={1920} height={1080} />
      </div>

      <div className="relative z-10 flex gap-12" style={{ maxWidth: 1100 }}>
        <div
          className="flex flex-col gap-6 p-8"
          style={{
            backgroundColor: 'var(--color-panel)',
            border: '6px solid var(--color-border-strong)',
            boxShadow: '10px 10px 0 rgba(31,111,152,0.30)',
            width: 520,
          }}
        >
          <h2
            className="text-page-title"
            style={{ color: 'var(--color-text-primary)', fontSize: 30, fontWeight: 700 }}
          >
            AI 建档
          </h2>

          <label className="flex flex-col gap-2">
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              您的名称（10字以内）
            </span>
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 10))}
              maxLength={10}
              style={{
                padding: '12px 16px',
                fontSize: 20,
                border: '4px solid var(--color-border-soft)',
                backgroundColor: 'var(--color-panel)',
                color: 'var(--color-text-primary)',
              }}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              AI 名称（12字以内）
            </span>
            <input
              value={aiName}
              onChange={(e) => setAiName(e.target.value.slice(0, 12))}
              maxLength={12}
              style={{
                padding: '12px 16px',
                fontSize: 20,
                border: '4px solid var(--color-border-soft)',
                backgroundColor: 'var(--color-panel)',
                color: 'var(--color-text-primary)',
              }}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              玩家性别
            </span>
            <div className="flex gap-2">
              {playerGenderOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPlayerGender(opt.value)}
                  className="cursor-pointer"
                  style={{
                    padding: '8px 20px',
                    fontSize: 16,
                    backgroundColor:
                      playerGender === opt.value ? 'var(--color-panel-strong)' : 'var(--color-panel-soft)',
                    border:
                      playerGender === opt.value
                        ? '4px solid var(--color-border-strong)'
                        : '3px solid var(--color-border-soft)',
                    color: 'var(--color-text-primary)',
                    fontWeight: playerGender === opt.value ? 700 : 400,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              AI 性别
            </span>
            <div className="flex gap-2">
              {genderOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAiGender(opt.value)}
                  className="cursor-pointer"
                  style={{
                    padding: '8px 20px',
                    fontSize: 16,
                    backgroundColor:
                      aiGender === opt.value ? 'var(--color-panel-strong)' : 'var(--color-panel-soft)',
                    border:
                      aiGender === opt.value
                        ? '4px solid var(--color-border-strong)'
                        : '3px solid var(--color-border-soft)',
                    color: 'var(--color-text-primary)',
                    fontWeight: aiGender === opt.value ? 700 : 400,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              你希望 AI 怎么称呼你？
            </span>
            <input
              placeholder="请输入 AI 对你的称呼"
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value.slice(0, 10))}
              maxLength={10}
              style={{
                padding: '12px 16px',
                fontSize: 18,
                border: '4px solid var(--color-border-soft)',
                backgroundColor: 'var(--color-panel)',
                color: 'var(--color-text-primary)',
              }}
            />
          </label>

          <button
            disabled={!canSubmit}
            onClick={() => {
              initGame(
                {
                  ...player,
                  name: playerName.trim(),
                  gender: playerGender,
                  customAddress: customAddress.trim(),
                },
                aiName.trim(),
                aiGender,
                randomAttributes,
              );
              navigate('/raising/month-start/1');
            }}
            className="mt-4 cursor-pointer font-bold transition-transform hover:-translate-y-1 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              width: 260,
              height: 86,
              alignSelf: 'center',
              backgroundColor: 'var(--color-action)',
              border: '6px solid var(--color-border-strong)',
              boxShadow: '10px 10px 0 rgba(31,111,152,0.30)',
              color: 'var(--color-text-primary)',
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            确认建档
          </button>
        </div>

        <div
          className="flex flex-col gap-4 p-8"
          style={{
            backgroundColor: 'var(--color-panel)',
            border: '6px solid var(--color-border-strong)',
            boxShadow: '10px 10px 0 rgba(31,111,152,0.30)',
            width: 420,
          }}
        >
          <h3 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            AI 初始属性
          </h3>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            属性随机生成，每次开局都会不同。
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)', opacity: 0.92 }}>
            接下来的 12 个月，您将与这位 AI 共同度过。以下是它此刻的初始能力，请好好培养它吧。
          </p>

          <div className="mt-4 flex flex-col gap-4">
            {(Object.entries(randomAttributes) as [AttributeKey, number][]).map(([key, value]) => (
              <div
                key={key}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 14,
                }}
              >
                <StatBar
                  label={ATTRIBUTE_LABELS[key]}
                  value={value}
                  max={INITIAL_ATTRIBUTE_VISUAL_MAX}
                  desc={getInitialAttributeStage(key, value)}
                  showMax
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
