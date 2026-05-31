import { useEffect, useState } from 'react';
import { loadUserAIConfig, saveUserAIConfig, isAIConfigured } from '@/services/ai-config-service';
import type { NarrativeEngineConfig, ProviderCredential, ModelLevel } from '@/types';
import { getBuiltinConfig } from '@/services/builtin-config-service';
import { initializePlayground } from '../adapter/playground-init';
import { usePlaygroundStore } from '../store/playground-store';
import { PRESET_NAMES, type PresetName } from '../store/mock-presets';

const PROVIDER_OPTIONS = [
  { value: 'builtin', label: 'Builtin' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'minimax-cn', label: 'MiniMax' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'openai-compatible', label: 'OpenAI Compatible' },
];

const COMMON_MODELS: Record<string, { value: string; label: string }[]> = {
  builtin: [
    { value: 'builtin', label: 'Builtin AI' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ],
  openai: [
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { value: 'o3', label: 'o3' },
    { value: 'o4-mini', label: 'o4-mini' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
  ],
  'minimax-cn': [
    { value: 'MiniMax-M2.7', label: 'MiniMax-M2.7' },
  ],
  openrouter: [
    { value: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'openai/gpt-4.1', label: 'GPT-4.1' },
  ],
  'openai-compatible': [],
};

export function ConfigPanel() {
  const initializing = usePlaygroundStore((s) => s.initializing);
  const initError = usePlaygroundStore((s) => s.initError);
  const setInitError = usePlaygroundStore((s) => s.setInitError);

  const existingConfig = isAIConfigured() ? loadUserAIConfig() : null;

  const [provider, setProvider] = useState(existingConfig?.models.daily.provider || 'anthropic');
  const [apiKey, setApiKey] = useState(existingConfig?.providers[existingConfig.models.daily.provider]?.apiKey || '');
  const [modelId, setModelId] = useState(existingConfig?.models.daily.modelId || 'claude-sonnet-4-6');
  const [baseURL, setBaseURL] = useState(existingConfig?.providers['openai-compatible']?.baseURL || '');
  const [customModelId, setCustomModelId] = useState(existingConfig?.providers['openai-compatible']?.customModelId || '');
  const [preset, setPreset] = useState<PresetName>('mid-game');
  const [builtinAvailable, setBuiltinAvailable] = useState<boolean | null>(null);
  const hasExistingConfig = existingConfig !== null;

  useEffect(() => {
    let cancelled = false;
    void getBuiltinConfig().then((builtin) => {
      if (cancelled) return;
      setBuiltinAvailable(builtin.available);
      if (builtin.available && !apiKey && !hasExistingConfig) {
        setProvider('builtin');
        setModelId('builtin');
      }
    });
    return () => { cancelled = true; };
  }, [apiKey, hasExistingConfig]);

  const handleInit = async () => {
    setInitError(null);
    const providers: Record<string, ProviderCredential> = {};
    let selectedProvider = provider;
    let selectedModelId = modelId;

    if (provider === 'openai-compatible') {
      providers['openai-compatible'] = { apiKey, baseURL, customModelId };
    } else if (apiKey) {
      providers[provider] = { apiKey };
    }

    const builtin = await getBuiltinConfig();
    setBuiltinAvailable(builtin.available);
    if (builtin.available) {
      providers.builtin = {
        apiKey: builtin.apiKey,
        baseURL: builtin.baseURL || '/api/builtin',
      };
      if (provider === 'builtin' || (!apiKey && provider !== 'openai-compatible')) {
        selectedProvider = 'builtin';
        selectedModelId = 'builtin';
      }
    }

    const modelSelection = {
      provider: selectedProvider,
      modelId: selectedModelId,
      _resolvedProvider: builtin.provider || undefined,
      _resolvedModelId: builtin.modelId || undefined,
    };
    const engineConfig: NarrativeEngineConfig = {
      providers,
      models: {
        daily: modelSelection,
        important: modelSelection,
        critical: modelSelection,
      },
    };

    // Save for reuse
    try {
      const saveResult = saveUserAIConfig({ providers, models: engineConfig.models });
      if (!saveResult.ok) {
        throw new Error(saveResult.error);
      }

      await initializePlayground(preset, engineConfig);
    } catch (err) {
      setInitError(err instanceof Error ? err.message : String(err));
    }
  };

  const canStart =
    (provider === 'builtin' && builtinAvailable === true) ||
    !!apiKey ||
    (provider === 'openai-compatible' && !!baseURL && !!(customModelId || modelId)) ||
    builtinAvailable === true;

  const inputStyle: React.CSSProperties = {
    background: '#0f1117',
    border: '1px solid #2a2e3a',
    borderRadius: 6,
    color: '#e4e7ed',
    padding: '8px 12px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
  };

  return (
    <div style={{
      width: 420,
      background: '#1a1d28',
      border: '1px solid #2a2e3a',
      borderRadius: 12,
      padding: 28,
    }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#4a9eff' }}>
        Agent Playground 配置
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ fontSize: 12, color: '#8b92a5' }}>
          游戏状态预设
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {PRESET_NAMES.map((name) => (
              <button
                key={name}
                onClick={() => setPreset(name)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  background: preset === name ? '#4a9eff' : '#0f1117',
                  color: preset === name ? '#fff' : '#8b92a5',
                  border: `1px solid ${preset === name ? '#4a9eff' : '#2a2e3a'}`,
                  borderRadius: 4,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </label>

        <label style={{ fontSize: 12, color: '#8b92a5' }}>
          AI Provider
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              const models = COMMON_MODELS[e.target.value];
              if (models?.[0]) setModelId(models[0].value);
            }}
            style={{ ...inputStyle, marginTop: 6 }}
          >
            {PROVIDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        {provider === 'openai-compatible' ? (
          <>
            <label style={{ fontSize: 12, color: '#8b92a5' }}>
              API URL
              <input
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder="https://your-api.example.com/v1"
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </label>
            <label style={{ fontSize: 12, color: '#8b92a5' }}>
              Model ID
              <input
                value={customModelId || modelId}
                onChange={(e) => setCustomModelId(e.target.value)}
                placeholder="model-name"
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </label>
          </>
        ) : provider === 'builtin' ? (
          <div style={{ fontSize: 12, color: builtinAvailable === false ? '#ffaa4a' : '#8b92a5' }}>
            {builtinAvailable === false ? '未检测到内置 AI 配置。' : '将使用 Vite / Electron 提供的内置 AI 代理。'}
          </div>
        ) : (
          <>
            <label style={{ fontSize: 12, color: '#8b92a5' }}>
              API Key
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </label>
            <label style={{ fontSize: 12, color: '#8b92a5' }}>
              Model
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                style={{ ...inputStyle, marginTop: 6 }}
              >
                {(COMMON_MODELS[provider] || []).map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
                {!(COMMON_MODELS[provider] || []).length && (
                  <option value={modelId}>{modelId}</option>
                )}
              </select>
            </label>
          </>
        )}

        {initError && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#f87171' }}>
            {initError}
          </div>
        )}

        <button
          onClick={handleInit}
          disabled={initializing || !canStart}
          style={{
            background: '#4a9eff',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: initializing ? 'wait' : canStart ? 'pointer' : 'default',
            opacity: initializing || !canStart ? 0.6 : 1,
            marginTop: 4,
          }}
        >
          {initializing ? '初始化中...' : '启动 Playground'}
        </button>
      </div>
    </div>
  );
}
