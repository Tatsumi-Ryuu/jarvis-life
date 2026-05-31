import { useState } from 'react';
import type { FullGameState } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { usePlaygroundStore } from '../store/playground-store';
import { getPreset, PRESET_NAMES, type PresetName } from '../store/mock-presets';

export function GameStateEditor() {
  const gameState = usePlaygroundStore((s) => s.gameState);
  const setGameState = usePlaygroundStore((s) => s.setGameState);
  const [jsonText, setJsonText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentJson = gameState ? JSON.stringify(gameState, null, 2) : '';

  const handleLoad = () => {
    setJsonText(currentJson);
    setLoaded(true);
    setError(null);
  };

  const handleApply = () => {
    try {
      const parsed = JSON.parse(jsonText) as FullGameState;
      const gameStore = useGameStore.getState();
      gameStore.loadFromBundle('save-playground' as any, parsed);
      setGameState(parsed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JSON 格式错误');
    }
  };

  const handlePreset = (name: PresetName) => {
    const preset = getPreset(name);
    const gameStore = useGameStore.getState();
    gameStore.loadFromBundle('save-playground' as any, preset);
    setGameState(preset);
    setJsonText(JSON.stringify(preset, null, 2));
    setLoaded(true);
    setError(null);
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Game State Editor</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {PRESET_NAMES.map((name) => (
            <button
              key={name}
              onClick={() => handlePreset(name)}
              style={{
                background: '#2a2e3a',
                border: 'none',
                color: '#e4e7ed',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {!loaded ? (
        <div>
          <div style={{ marginBottom: 12, fontSize: 13, color: '#8b92a5' }}>
            当前游戏状态概览：
          </div>
          <div style={{
            background: '#14161e',
            border: '1px solid #2a2e3a',
            borderRadius: 8,
            padding: 14,
            fontSize: 12,
            lineHeight: 1.6,
          }}>
            {gameState && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>月份: <span style={{ color: '#4a9eff' }}>{gameState.currentMonth}</span></div>
                <div>阶段: <span style={{ color: '#4a9eff' }}>{gameState.phase}</span></div>
                <div>AI名: <span style={{ color: '#4a9eff' }}>{gameState.aiName}</span></div>
                <div>玩家: <span style={{ color: '#4a9eff' }}>{gameState.player.name}</span></div>
                <div>资金: <span style={{ color: '#ffaa4a' }}>{gameState.resources.funds}</span></div>
                <div>体力磨损: <span style={{ color: gameState.resources.physicalWear > 50 ? '#f87171' : '#3dd68c' }}>{gameState.resources.physicalWear}</span></div>
                <div>精神磨损: <span style={{ color: gameState.resources.mentalWear > 50 ? '#f87171' : '#3dd68c' }}>{gameState.resources.mentalWear}</span></div>
                <div>AP: <span style={{ color: '#3dd68c' }}>{gameState.resources.actionPoints}/{gameState.resources.maxActionPoints}</span></div>
              </div>
            )}
          </div>
          <button onClick={handleLoad} style={{
            background: '#4a9eff',
            border: 'none',
            color: '#fff',
            borderRadius: 4,
            padding: '6px 16px',
            fontSize: 12,
            cursor: 'pointer',
            marginTop: 12,
          }}>
            编辑 JSON
          </button>
        </div>
      ) : (
        <div>
          {error && (
            <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#f87171', marginBottom: 8 }}>
              {error}
            </div>
          )}
          <textarea
            value={jsonText}
            onChange={(e) => { setJsonText(e.target.value); setError(null); }}
            rows={24}
            style={{
              width: '100%',
              background: '#0f1117',
              border: '1px solid #2a2e3a',
              borderRadius: 6,
              color: '#e4e7ed',
              padding: 12,
              fontSize: 12,
              fontFamily: 'monospace',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={handleApply} style={{
              background: '#4a9eff',
              border: 'none',
              color: '#fff',
              borderRadius: 4,
              padding: '6px 16px',
              fontSize: 12,
              cursor: 'pointer',
            }}>
              应用修改
            </button>
            <button onClick={() => setLoaded(false)} style={{
              background: '#2a2e3a',
              border: 'none',
              color: '#e4e7ed',
              borderRadius: 4,
              padding: '6px 16px',
              fontSize: 12,
              cursor: 'pointer',
            }}>
              返回概览
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
