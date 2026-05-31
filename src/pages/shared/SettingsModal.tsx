import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SavePanel } from './SaveModal';
import { useSettingsStore } from '../../store/settingsStore';
import type { FontSize } from '../../store/settingsStore';
import { useAudioStore } from '../../store/audioStore';
import { sf } from '../../utils/font';
import { assetMap } from '../../data/asset-map';
import { DEFAULT_USER_AI_CONFIG } from '../../services/ai-config-service';
import { getBuiltinConfig, clearBuiltinConfigCache } from '../../services/builtin-config-service';
import type { BuiltinProviderConfig } from '../../types';
import { resetNarrativeEngine } from '../../engine/narrative/core/narrative-engine';
import * as providerRegistry from '../../services/provider-registry';
import {
  changeSaveStorageFolder,
  getSaveAdapter,
  getSaveStorageStatus,
  initSaveSystem,
} from '../../services/save-service';
import type { StoragePortStatus } from '../../services/storage-port';
import { isElectron } from '../../services/electron-save-storage';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  bgAssetId?: string;
  onReturnTitle?: () => void;
  onStorageChanged?: () => void;
}

type SettingsTab = 'general' | 'ai' | 'save' | 'storage';

const rangeStyle: React.CSSProperties = {
  width: '100%',
  height: 28,
  WebkitAppearance: 'none',
  appearance: 'none',
  background: 'var(--color-panel-soft)',
  border: '3px solid var(--color-border-soft)',
  boxShadow: '4px 4px 0 rgba(46, 126, 168, 0.20)',
  cursor: 'pointer',
};

const FONT_SIZE_OPTIONS: { label: string; value: FontSize }[] = [
  { label: '小', value: 'small' },
  { label: '中', value: 'medium' },
  { label: '大', value: 'large' },
];

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'general', label: '常规' },
  { id: 'ai', label: 'AI' },
  { id: 'save', label: '存档' },
  { id: 'storage', label: '存储' },
];

function statusLabel(status: StoragePortStatus): string {
  switch (status.state) {
    case 'ready':
      return '已连接';
    case 'needs-binding':
      return '未选择文件夹';
    case 'needs-permission':
      return '需要重新授权';
    case 'unavailable':
      return status.reason;
    default:
      return '';
  }
}

function folderLabel(status: StoragePortStatus): string {
  if ('folderName' in status && status.folderName) return status.folderName;
  return '未显示';
}

// --- AI Config Panel ---

interface AIConfigPanelProps {
  form: import('../../services/ai-config-service').UserAIConfig;
  onFormChange: (form: import('../../services/ai-config-service').UserAIConfig) => void;
  onSave: () => void;
  onClear: () => void;
  message: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  'builtin': '内置 AI',
  'zai': 'GLM Coding Plan',
  'minimax-cn': 'MiniMax Token Plan',
  'kimi-coding': 'Kimi Coding',
  'xiaomi-token-plan-cn': 'Xiaomi MiMo',
  'opencode-go': 'OpenCode Go',
  'deepseek': 'DeepSeek',
  'openai': 'OpenAI',
  'openrouter': 'OpenRouter',
  'anthropic': 'Anthropic',
  'google': 'Google Gemini',
  'openai-compatible': 'OpenAI 兼容',
};

const CATEGORY_LABELS: Record<string, string> = { 'coding-plan': 'Coding Plan', 'api': 'API' };

const LEVEL_LABELS: Record<string, string> = { daily: '日常', important: '重要', critical: '关键' };

const CUSTOM_MODEL_ID = '__custom__';

const AIConfigPanel: React.FC<AIConfigPanelProps> = ({ form, onFormChange, onSave, onClear, message }) => {
  const [providerModels, setProviderModels] = useState<Record<string, { id: string; name: string }[]>>({});
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; latencyMs?: number; error?: string }>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [addingProvider, setAddingProvider] = useState(false);
  const [newProvider, setNewProvider] = useState('');
  const [builtinConfig, setBuiltinConfig] = useState<BuiltinProviderConfig | null>(null);
  const initializedRef = useRef(false);

  const { PROVIDERS: providerList, getProviderInfo, getProvidersByCategory, fetchRemoteModels } = providerRegistry;

  useEffect(() => {
    getBuiltinConfig().then((cfg) => {
      setBuiltinConfig(cfg);
    });
  }, []);

  // Auto-select builtin as default when available and no config exists
  useEffect(() => {
    if (initializedRef.current || !builtinConfig?.available) return;
    initializedRef.current = true;
    const hasUserProviders = Object.keys(form.providers).length > 0;
    const usesBuiltin = Object.values(form.models).some(m => m.provider === 'builtin');
    if (!hasUserProviders && !usesBuiltin) {
      const builtinSelection = { provider: 'builtin' as const, modelId: 'default' };
      onFormChange({
        ...form,
        models: {
          daily: { ...builtinSelection, displayName: builtinConfig.displayModelName },
          important: { ...builtinSelection, displayName: builtinConfig.displayModelName },
          critical: { ...builtinSelection, displayName: builtinConfig.displayModelName },
        },
      });
    }
  }, [builtinConfig, form, onFormChange]);

  const loadModels = useCallback((provider: string) => {
    if (providerModels[provider]) return;
    if (provider === 'openai-compatible') return;
    import('@earendil-works/pi-ai').then(({ getModels }) => {
      const models = getModels(provider as any);
      setProviderModels((prev) => ({
        ...prev,
        [provider]: models.map((m: any) => ({ id: m.id, name: m.name })),
      }));
    });
  }, [providerModels]);

  const updateProvider = (name: string, patch: Partial<import('../../types').ProviderCredential>) => {
    onFormChange({
      ...form,
      providers: {
        ...form.providers,
        [name]: { ...form.providers[name], ...patch },
      },
    });
  };

  const removeProvider = (name: string) => {
    const next = { ...form.providers };
    delete next[name];
    const nextModels = { ...form.models };
    for (const level of ['daily', 'important', 'critical'] as const) {
      if (nextModels[level].provider === name) {
        nextModels[level] = builtinConfig?.available
          ? { provider: 'builtin', modelId: 'default', displayName: builtinConfig.displayModelName }
          : { ...form.models.daily };
      }
    }
    onFormChange({ ...form, providers: next, models: nextModels });
  };

  const addProvider = () => {
    if (!newProvider || form.providers[newProvider]) { setAddingProvider(false); return; }
    const info = getProviderInfo(newProvider);
    const initial: import('../../types').ProviderCredential = info?.needsModelId
      ? { apiKey: '', baseURL: '', customModelId: '' }
      : { apiKey: '' };
    onFormChange({
      ...form,
      providers: { ...form.providers, [newProvider]: initial },
    });
    if (!info?.needsModelId) loadModels(newProvider);
    setAddingProvider(false);
  };

  const updateModelLevel = (level: string, provider: string, modelId: string) => {
    const next = { ...form.models };
    const displayName = provider === 'builtin' ? builtinConfig?.displayModelName : undefined;
    next[level] = { provider, modelId, displayName };
    onFormChange({ ...form, models: next });
  };

  const handleTest = async (providerName: string) => {
    setTesting((t) => ({ ...t, [providerName]: true }));
    try {
      const { testProviderConnection } = await import('../../services/provider-test-service');
      let result;
      if (providerName === 'builtin') {
        result = await testProviderConnection(
          { provider: 'builtin', modelId: 'default' },
          { apiKey: 'builtin-proxy' },
        );
      } else {
        const cred = form.providers[providerName];
        if (!cred?.apiKey) return;
        const selection = form.models.daily.provider === providerName
          ? form.models.daily
          : { provider: providerName, modelId: providerModels[providerName]?.[0]?.id ?? '' };
        result = await testProviderConnection(selection, cred);
      }
      setTestResults((r) => ({ ...r, [providerName]: result }));
    } finally {
      setTesting((t) => ({ ...t, [providerName]: false }));
    }
  };

  const handleRefreshModels = async (providerName: string) => {
    const cred = form.providers[providerName];
    if (!cred?.apiKey) return;
    const models = await fetchRemoteModels(providerName, cred.apiKey, cred.baseURL);
    if (models.length > 0) {
      setProviderModels((prev) => ({ ...prev, [providerName]: models }));
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
    border: '3px solid var(--color-border-soft)', background: 'var(--color-panel)',
    color: 'var(--color-text-primary)', fontSize: sf(14),
    boxShadow: '3px 3px 0 rgba(46, 126, 168, 0.15)',
  };

  const configuredProviders = Object.keys(form.providers);
  const selectableProviders = [
    ...(builtinConfig?.available ? ['builtin'] : []),
    ...configuredProviders,
  ];

  // Build dropdown options grouped by category
  const unaddedProviders = providerList.filter((p) => !form.providers[p.id] && p.id !== 'builtin');
  const codingPlanUnadded = unaddedProviders.filter((p) => p.category === 'coding-plan');
  const apiUnadded = unaddedProviders.filter((p) => p.category === 'api');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ padding: '16px 18px', background: 'var(--color-panel-soft)', border: '4px solid var(--color-border-soft)', boxShadow: '6px 6px 0 rgba(46, 126, 168, 0.24)' }}>
        <div style={{ fontSize: sf(17), fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>AI 供应商</div>
        <div style={{ fontSize: sf(13), color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          配置至少一个 AI 供应商。API Key 只保存在本机浏览器中，不会上传到任何服务器。
        </div>
      </div>

      {/* Built-in Provider Card */}
      {builtinConfig?.available && (
        <div style={{
          padding: '14px 16px',
          border: '3px solid #2d8a4e',
          background: 'linear-gradient(135deg, var(--color-panel) 0%, rgba(45,138,78,0.08) 100%)',
          boxShadow: '4px 4px 0 rgba(45, 138, 78, 0.18)',
          borderRadius: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: sf(15), fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {builtinConfig.displayName || '内置 AI'}
            </span>
            <span style={{
              padding: '2px 8px',
              background: '#2d8a4e',
              color: '#fff',
              fontSize: sf(11),
              fontWeight: 700,
              letterSpacing: 1,
            }}>
              内置
            </span>
            <button
              onClick={() => handleTest('builtin')}
              disabled={testing['builtin']}
              style={{
                marginLeft: 'auto',
                padding: '5px 14px',
                border: '2px solid #2d8a4e',
                background: testing['builtin'] ? 'var(--color-panel-soft)' : '#2d8a4e',
                color: '#fff',
                fontSize: sf(12),
                fontWeight: 700,
                cursor: testing['builtin'] ? 'wait' : 'pointer',
              }}
            >
              {testing['builtin'] ? '测试中...' : '测试连接'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              flex: 2, padding: '8px 12px',
              border: '2px solid var(--color-border-soft)',
              background: 'var(--color-panel-soft)',
              color: 'var(--color-text-secondary)',
              fontSize: sf(13),
            }}>
              API Key: ••••••••（由服务端管理）
            </div>
          </div>
          {testResults['builtin'] && (
            <div style={{ marginTop: 8, fontSize: sf(13), color: testResults['builtin'].ok ? '#2d8a4e' : '#c0392b' }}>
              {testResults['builtin'].ok
                ? `连接成功 (${testResults['builtin'].latencyMs}ms)`
                : `失败: ${testResults['builtin'].error}`}
            </div>
          )}
        </div>
      )}

      {/* User-configured Provider Cards */}
      {configuredProviders.map((name) => {
        const info = getProviderInfo(name);
        const isOpenAICompat = name === 'openai-compatible';
        const isCodingPlan = info?.category === 'coding-plan';
        return (
          <div key={name} style={{
            padding: '14px 16px',
            border: `3px solid ${isCodingPlan ? '#c8842d' : 'var(--color-border-soft)'}`,
            background: isCodingPlan
              ? 'linear-gradient(135deg, var(--color-panel) 0%, rgba(200,132,45,0.06) 100%)'
              : 'var(--color-panel)',
            boxShadow: '4px 4px 0 rgba(46, 126, 168, 0.18)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: sf(15), fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {PROVIDER_LABELS[name] ?? name}
              </span>
              {isCodingPlan && (
                <span style={{
                  padding: '2px 8px',
                  background: '#c8842d',
                  color: '#fff',
                  fontSize: sf(10),
                  fontWeight: 700,
                  letterSpacing: 1,
                }}>
                  CODING PLAN
                </span>
              )}
              <button onClick={() => removeProvider(name)} style={{
                marginLeft: 'auto', padding: '2px 10px',
                border: '2px solid var(--color-border-soft)',
                background: 'var(--color-panel-soft)',
                cursor: 'pointer', fontSize: sf(13),
                color: 'var(--color-text-secondary)',
              }}>
                移除
              </button>
            </div>
            {isOpenAICompat ? (
              <>
                <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <input type="text" placeholder="API Base URL（如 https://api.example.com/v1）" value={form.providers[name].baseURL ?? ''}
                    onChange={(e) => updateProvider(name, { baseURL: e.target.value || undefined })} style={{ ...inputStyle, flex: 2 }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <input type="password" placeholder="API Key" value={form.providers[name].apiKey}
                    onChange={(e) => updateProvider(name, { apiKey: e.target.value })} style={{ ...inputStyle, flex: 2 }} />
                  <input type="text" placeholder="模型 ID（如 gpt-4o）" value={form.providers[name].customModelId ?? ''}
                    onChange={(e) => updateProvider(name, { customModelId: e.target.value || undefined })} style={{ ...inputStyle, flex: 1 }} />
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <input type="password" placeholder="API Key" value={form.providers[name].apiKey}
                  onChange={(e) => updateProvider(name, { apiKey: e.target.value })} style={{ ...inputStyle, flex: 2 }} />
                <input type="text" placeholder="自定义 URL（可选）" value={form.providers[name].baseURL ?? ''}
                  onChange={(e) => updateProvider(name, { baseURL: e.target.value || undefined })} style={{ ...inputStyle, flex: 1 }} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => handleTest(name)} disabled={testing[name] || !form.providers[name].apiKey}
                style={{
                  padding: '6px 16px', border: '2px solid var(--color-border-strong)',
                  background: testing[name] ? 'var(--color-panel-soft)' : 'var(--color-action)',
                  color: 'var(--color-text-primary)', fontSize: sf(13), fontWeight: 700,
                  cursor: testing[name] ? 'wait' : 'pointer',
                  opacity: !form.providers[name].apiKey ? 0.5 : 1,
                }}>
                {testing[name] ? '测试中...' : '测试连接'}
              </button>
              {testResults[name] && (
                <span style={{ fontSize: sf(13), color: testResults[name].ok ? '#2d8a4e' : '#c0392b' }}>
                  {testResults[name].ok ? `连接成功 (${testResults[name].latencyMs}ms)` : `失败: ${testResults[name].error}`}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Add Provider Dropdown */}
      {addingProvider ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={newProvider} onChange={(e) => setNewProvider(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
            <option value="" disabled>选择供应商...</option>
            {codingPlanUnadded.length > 0 && (
              <optgroup label="Coding Plan">
                {codingPlanUnadded.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </optgroup>
            )}
            {apiUnadded.length > 0 && (
              <optgroup label="API">
                {apiUnadded.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </optgroup>
            )}
          </select>
          <button onClick={addProvider} style={{ padding: '8px 18px', border: '3px solid var(--color-border-strong)', background: 'var(--color-action)', color: 'var(--color-text-primary)', fontSize: sf(14), fontWeight: 700, cursor: 'pointer' }}>确认</button>
          <button onClick={() => setAddingProvider(false)} style={{ padding: '8px 18px', border: '2px solid var(--color-border-soft)', background: 'var(--color-panel-soft)', color: 'var(--color-text-primary)', fontSize: sf(14), cursor: 'pointer' }}>取消</button>
        </div>
      ) : (
        <button onClick={() => { setAddingProvider(true); setNewProvider(''); }}
          style={{ padding: '10px 20px', border: '3px dashed var(--color-border-soft)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: sf(14), cursor: 'pointer' }}>
          + 添加供应商
        </button>
      )}

      {/* Model Configuration */}
      <div style={{ marginTop: 4, padding: '14px 16px', border: '3px solid var(--color-border-soft)', background: 'var(--color-panel)' }}>
        <div style={{ fontSize: sf(15), fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 12 }}>模型配置</div>
        {(['daily', 'important', 'critical'] as const).map((level) => {
          const sel = form.models[level];
          const isBuiltin = sel.provider === 'builtin';
          const isOpenAICompat = sel.provider === 'openai-compatible';
          const models = providerModels[sel.provider] ?? [];
          const info = getProviderInfo(sel.provider);
          const isCustomModel = isOpenAICompat || sel.modelId === CUSTOM_MODEL_ID;

          return (
            <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ width: 48, fontSize: sf(14), fontWeight: 700, color: 'var(--color-text-primary)' }}>{LEVEL_LABELS[level]}</span>
              <select value={sel.provider} onChange={(e) => {
                const p = e.target.value;
                if (p === 'builtin') {
                  updateModelLevel(level, 'builtin', 'default');
                } else if (p === 'openai-compatible') {
                  const cred = form.providers['openai-compatible'];
                  updateModelLevel(level, 'openai-compatible', cred?.customModelId || 'custom');
                } else {
                  loadModels(p);
                  updateModelLevel(level, p, providerModels[p]?.[0]?.id ?? '');
                }
              }} style={{ ...inputStyle, flex: 1, maxWidth: 180 }}>
                {selectableProviders.map((p) => <option key={p} value={p}>{PROVIDER_LABELS[p] ?? p}</option>)}
              </select>
              {isBuiltin ? (
                <div style={{
                  flex: 2, padding: '10px 12px',
                  border: '3px solid #2d8a4e',
                  background: 'rgba(45,138,78,0.06)',
                  color: 'var(--color-text-primary)',
                  fontSize: sf(14),
                  fontWeight: 600,
                }}>
                  {sel.displayName || builtinConfig?.displayModelName || '内置 AI'}
                </div>
              ) : isCustomModel ? (
                <input type="text" placeholder="模型 ID" value={sel.modelId === CUSTOM_MODEL_ID ? '' : sel.modelId}
                  onChange={(e) => updateModelLevel(level, sel.provider, e.target.value || CUSTOM_MODEL_ID)}
                  style={{ ...inputStyle, flex: 2 }} />
              ) : (
                <div style={{ display: 'flex', gap: 6, flex: 2, alignItems: 'center' }}>
                  <select value={sel.modelId} onChange={(e) => {
                    if (e.target.value === CUSTOM_MODEL_ID) {
                      updateModelLevel(level, sel.provider, CUSTOM_MODEL_ID);
                    } else {
                      updateModelLevel(level, sel.provider, e.target.value);
                    }
                  }}
                    onFocus={() => loadModels(sel.provider)}
                    style={{ ...inputStyle, flex: 1 }}>
                    {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    {!(models.length) && <option value={sel.modelId}>{sel.modelId}</option>}
                    <option disabled>──────────────</option>
                    <option value={CUSTOM_MODEL_ID}>自定义模型 ID...</option>
                  </select>
                  {info?.canFetchModels && form.providers[sel.provider]?.apiKey && (
                    <button onClick={() => handleRefreshModels(sel.provider)} title="刷新模型列表"
                      style={{
                        padding: '6px 8px', border: '2px solid var(--color-border-soft)',
                        background: 'var(--color-panel-soft)', cursor: 'pointer',
                        fontSize: sf(12), lineHeight: 1, color: 'var(--color-text-secondary)',
                      }}>
                      Refresh
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onSave} style={{ padding: '12px 28px', border: '3px solid var(--color-border-strong)', background: 'var(--color-action)', color: 'var(--color-text-primary)', fontSize: sf(16), fontWeight: 700, cursor: 'pointer', boxShadow: '6px 6px 0 rgba(46, 126, 168, 0.30)' }}>保存</button>
        <button onClick={onClear} style={{ padding: '12px 28px', border: '3px solid var(--color-border-soft)', background: 'var(--color-panel-soft)', color: 'var(--color-text-primary)', fontSize: sf(16), fontWeight: 700, cursor: 'pointer', boxShadow: '4px 4px 0 rgba(46, 126, 168, 0.20)' }}>清空</button>
        {message && <div style={{ fontSize: sf(14), color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{message}</div>}
      </div>
    </div>
  );
};

const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  bgAssetId,
  onReturnTitle,
  onStorageChanged,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [storageStatus, setStorageStatus] = useState<StoragePortStatus>({ state: 'needs-binding' });
  const [storageBusy, setStorageBusy] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const aiConfig = useSettingsStore((s) => s.aiConfig);
  const saveAIConfig = useSettingsStore((s) => s.saveAIConfig);
  const clearAIConfig = useSettingsStore((s) => s.clearAIConfig);
  const [aiForm, setAIForm] = useState(aiConfig);
  const [aiMessage, setAIMessage] = useState('');

  const musicVolume = useAudioStore((s) => s.musicVolume);
  const sfxVolume = useAudioStore((s) => s.sfxVolume);
  const setMusicVolume = useAudioStore((s) => s.setMusicVolume);
  const setSfxVolume = useAudioStore((s) => s.setSfxVolume);

  useEffect(() => {
    if (!open) return;
    let active = true;
    getSaveStorageStatus().then((status) => {
      if (active) setStorageStatus(status);
    });
    getSaveAdapter().listSaves().then((saves) => {
      if (active) setSaveCount(saves.length);
    }).catch(() => {
      if (active) setSaveCount(0);
    });
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setAIForm(aiConfig);
    setAIMessage('');
  }, [aiConfig, open]);

  if (!open) return null;

  const handleChangeFolder = async () => {
    setStorageBusy(true);
    try {
      const status = await changeSaveStorageFolder();
      setStorageStatus(status);
      if (status.state === 'ready') {
        void initSaveSystem();
        getSaveAdapter().listSaves()
          .then((saves) => setSaveCount(saves.length))
          .catch(() => setSaveCount(0));
        onStorageChanged?.();
      }
    } finally {
      setStorageBusy(false);
    }
  };

  const handleSaveAIConfig = () => {
    const result = saveAIConfig(aiForm);
    if (result.ok) {
      resetNarrativeEngine();
      setAIForm(result.config);
      setAIMessage('AI 渠道已保存');
      return;
    }
    setAIMessage(result.error);
  };

  const handleClearAIConfig = () => {
    const cleared = clearAIConfig();
    resetNarrativeEngine();
    setAIForm(cleared);
    setAIMessage('AI 渠道已清空');
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
        background: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          width: 860,
          height: 650,
          background: bgAssetId && assetMap[bgAssetId] ? 'rgba(248, 253, 255, 0.93)' : 'var(--color-panel)',
          border: '6px solid var(--color-border-strong)',
          boxShadow: '10px 10px 0 rgba(31, 111, 152, 0.30)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
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
            }}
          />
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '4px solid var(--color-border-soft)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: sf(24),
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            设置
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              border: '3px solid var(--color-border-soft)',
              background: 'var(--color-panel-soft)',
              color: 'var(--color-text-primary)',
              fontSize: sf(18),
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '3px 3px 0 rgba(46, 126, 168, 0.30)',
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '18px 24px 0',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {TABS.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 24px',
                  border: selected ? '4px solid var(--color-border-strong)' : '3px solid var(--color-border-soft)',
                  background: selected ? 'var(--color-panel-strong)' : 'var(--color-panel-soft)',
                  color: 'var(--color-text-primary)',
                  fontSize: sf(16),
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: selected ? '4px 4px 0 rgba(46, 126, 168, 0.30)' : 'none',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            flex: 1,
            padding: '24px 40px 32px',
            overflowY: 'auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <label style={{ display: 'block', fontSize: sf(18), fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 12 }}>
                  音乐音量
                </label>
                <input type="range" min={0} max={100} value={musicVolume} onChange={(e) => setMusicVolume(Number(e.target.value))} style={rangeStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: sf(18), fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 12 }}>
                  音效音量
                </label>
                <input type="range" min={0} max={100} value={sfxVolume} onChange={(e) => setSfxVolume(Number(e.target.value))} style={rangeStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: sf(18), fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 12 }}>
                  文字速度
                </label>
                <div style={{ position: 'relative', height: 28, background: 'var(--color-panel-soft)', border: '3px solid var(--color-border-soft)', boxShadow: '4px 4px 0 rgba(46, 126, 168, 0.20)' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '50%', background: 'var(--color-action)' }} />
                  <div style={{ position: 'absolute', top: -4, left: 'calc(50% - 10px)', width: 20, height: 32, background: 'var(--color-panel)', border: '3px solid var(--color-border-strong)', boxShadow: '3px 3px 0 rgba(46, 126, 168, 0.30)' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: sf(18), fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 12 }}>
                  文字大小
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {FONT_SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFontSize(opt.value)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        border: fontSize === opt.value ? '4px solid var(--color-border-strong)' : '3px solid var(--color-border-soft)',
                        background: fontSize === opt.value ? 'var(--color-action)' : 'var(--color-panel-soft)',
                        color: 'var(--color-text-primary)',
                        fontSize: fontSize === opt.value ? sf(20) : sf(16),
                        fontWeight: fontSize === opt.value ? 700 : 400,
                        cursor: 'pointer',
                        boxShadow: fontSize === opt.value ? '4px 4px 0 rgba(46, 126, 168, 0.30)' : '3px 3px 0 rgba(46, 126, 168, 0.20)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {onReturnTitle && (
                <div
                  style={{
                    paddingTop: 8,
                    borderTop: '3px solid var(--color-border-soft)',
                    display: 'flex',
                    justifyContent: 'flex-start',
                  }}
                >
                  <button
                    onClick={onReturnTitle}
                    style={{
                      padding: '12px 28px',
                      border: '3px solid var(--color-border-strong)',
                      background: 'var(--color-panel-soft)',
                      color: 'var(--color-text-primary)',
                      fontSize: sf(16),
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '5px 5px 0 rgba(46, 126, 168, 0.24)',
                    }}
                  >
                    返回标题
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai' && (
            <AIConfigPanel
              form={aiForm}
              onFormChange={setAIForm}
              onSave={handleSaveAIConfig}
              onClear={handleClearAIConfig}
              message={aiMessage}
            />
          )}

          {activeTab === 'save' && (
            <SavePanel active={open && activeTab === 'save'} onLoad={onClose} />
          )}

          {activeTab === 'storage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div
                style={{
                  padding: '22px 24px',
                  background: 'var(--color-panel-soft)',
                  border: '4px solid var(--color-border-soft)',
                  boxShadow: '6px 6px 0 rgba(46, 126, 168, 0.24)',
                }}
              >
                <div style={{ fontSize: sf(18), fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 10 }}>
                  存档文件夹
                </div>
                <div style={{ fontSize: sf(15), color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                  当前状态：{isElectron() ? '应用端文件存储' : statusLabel(storageStatus)}
                  <br />
                  当前目录：{isElectron() ? '应用数据目录' : folderLabel(storageStatus)}
                  <br />
                  网页端会把存档和 AI 记忆写入你选择的本地文件夹。
                  {saveCount > 0 ? ` 当前文件夹中检测到 ${saveCount} 个存档。` : ''}
                </div>
              </div>

              {!isElectron() && (
                <button
                  onClick={handleChangeFolder}
                  disabled={storageBusy}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '12px 28px',
                    border: '3px solid var(--color-border-strong)',
                    background: 'var(--color-action)',
                    color: 'var(--color-text-primary)',
                    fontSize: sf(16),
                    fontWeight: 700,
                    cursor: storageBusy ? 'not-allowed' : 'pointer',
                    opacity: storageBusy ? 0.65 : 1,
                    boxShadow: '6px 6px 0 rgba(46, 126, 168, 0.30)',
                  }}
                >
                  {storageBusy ? '正在选择…' : '更换存档文件夹'}
                </button>
              )}

              {storageStatus.state === 'unavailable' && !isElectron() && (
                <div style={{ fontSize: sf(14), color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
                  {storageStatus.reason}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
