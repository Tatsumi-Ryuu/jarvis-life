import type { ProviderCredential, ModelLevel, ModelSelection } from '../types';

export interface UserAIConfig {
  providers: Record<string, ProviderCredential>;
  models: Record<ModelLevel, ModelSelection>;
}

export interface ActiveAIConfig {
  providers: Record<string, ProviderCredential>;
  models: Record<ModelLevel, ModelSelection>;
}

export type AIConfigSaveResult =
  | { ok: true; config: UserAIConfig }
  | { ok: false; error: string };

export const AI_CONFIG_STORAGE_KEY = 'jarvis-settings-ai-config';

const DEFAULT_MODEL_SELECTION: ModelSelection = { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' };

export const DEFAULT_USER_AI_CONFIG: UserAIConfig = {
  providers: {},
  models: {
    daily: { ...DEFAULT_MODEL_SELECTION },
    important: { ...DEFAULT_MODEL_SELECTION },
    critical: { ...DEFAULT_MODEL_SELECTION },
  },
};

function getStorage(): Storage | null {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

export function isAllowedAIBaseURL(baseURL: string): boolean {
  try {
    const url = new URL(baseURL);
    if (url.protocol === 'https:') return true;
    if (url.protocol !== 'http:') return false;
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function inferProvider(modelName: string): string {
  if (modelName.startsWith('MiniMax')) return 'minimax-cn';
  if (modelName.startsWith('claude')) return 'anthropic';
  if (modelName.startsWith('gpt') || modelName.startsWith('o1') || modelName.startsWith('o3') || modelName.startsWith('o4')) return 'openai';
  if (modelName.startsWith('deepseek')) return 'deepseek';
  if (modelName.startsWith('gemini')) return 'google';
  if (modelName.startsWith('kimi')) return 'kimi-coding';
  if (modelName.startsWith('glm')) return 'zai';
  if (modelName.startsWith('mimo')) return 'xiaomi-token-plan-cn';
  return 'minimax-cn';
}

function normalizeModelSelection(sel: Partial<ModelSelection> | undefined, fallback: ModelSelection): ModelSelection {
  if (sel && sel.provider && sel.modelId) return { provider: sel.provider, modelId: sel.modelId };
  return { ...fallback };
}

function normalizeUserAIConfig(input: Record<string, unknown>): UserAIConfig {
  const legacyApiKey = (input as Record<string, unknown>).apiKey;
  const legacyBaseURL = (input as Record<string, unknown>).baseURL;
  const legacyDefaultModel = (input as Record<string, unknown>).defaultModel;
  const legacyEnabled = (input as Record<string, unknown>).enabled;

  let providers: Record<string, ProviderCredential>;
  let models: Record<ModelLevel, ModelSelection>;

  if (input.providers && typeof input.providers === 'object' && !Array.isArray(input.providers)) {
    providers = {};
    for (const [name, cred] of Object.entries(input.providers as Record<string, unknown>)) {
      if (cred && typeof cred === 'object') {
        const c = cred as Record<string, unknown>;
        providers[name] = {
          apiKey: typeof c.apiKey === 'string' ? c.apiKey : '',
          baseURL: typeof c.baseURL === 'string' ? c.baseURL : undefined,
          customModelId: typeof c.customModelId === 'string' ? c.customModelId : undefined,
        };
      }
    }

    const rawModels = input.models as Record<string, unknown> | undefined;
    const dailyFallback: ModelSelection = DEFAULT_MODEL_SELECTION;
    const daily = normalizeModelSelection(rawModels?.daily as Partial<ModelSelection> | undefined, dailyFallback);
    models = {
      daily,
      important: normalizeModelSelection(rawModels?.important as Partial<ModelSelection> | undefined, daily),
      critical: normalizeModelSelection(rawModels?.critical as Partial<ModelSelection> | undefined, daily),
    };
  } else {
    // Legacy migration: enabled + apiKey + baseURL + defaultModel
    const apiKey = typeof legacyApiKey === 'string' ? legacyApiKey : '';
    const baseURL = typeof legacyBaseURL === 'string' ? legacyBaseURL : '';
    const modelId = typeof legacyDefaultModel === 'string' && legacyDefaultModel.trim() ? legacyDefaultModel.trim() : 'MiniMax-M2.7';
    const provider = inferProvider(modelId);

    providers = {};
    if (apiKey || legacyEnabled) {
      providers[provider] = { apiKey, baseURL: baseURL || undefined };
    }

    const selection: ModelSelection = { provider, modelId };
    models = {
      daily: { ...selection },
      important: { ...selection },
      critical: { ...selection },
    };
  }

  return { providers, models };
}

export function loadUserAIConfig(): UserAIConfig {
  const storage = getStorage();
  if (!storage) return { ...DEFAULT_USER_AI_CONFIG, providers: {} };

  try {
    const raw = storage.getItem(AI_CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_USER_AI_CONFIG, providers: {} };
    return normalizeUserAIConfig(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return { ...DEFAULT_USER_AI_CONFIG, providers: {} };
  }
}

export function saveUserAIConfig(input: Partial<UserAIConfig>): AIConfigSaveResult {
  const current = loadUserAIConfig();
  const next = normalizeUserAIConfig({ ...current, ...input } as Record<string, unknown>);

  for (const [name, cred] of Object.entries(next.providers)) {
    if (name === 'builtin') continue;
    if (name === 'openai-compatible') {
      if (!cred.baseURL) {
        return { ok: false, error: 'OpenAI 兼容需要提供 API URL。' };
      }
      if (!isAllowedAIBaseURL(cred.baseURL)) {
        return { ok: false, error: 'OpenAI 兼容的 API URL 需要使用 https，或本机 localhost/127.0.0.1。' };
      }
      if (!cred.customModelId) {
        return { ok: false, error: 'OpenAI 兼容需要指定模型 ID。' };
      }
      continue;
    }
    if (!cred.apiKey) {
      return { ok: false, error: `${name} 缺少 API key。` };
    }
    if (cred.baseURL && !isAllowedAIBaseURL(cred.baseURL)) {
      return { ok: false, error: `${name} 的 API URL 需要使用 https，或本机 localhost/127.0.0.1。` };
    }
  }

  for (const level of ['daily', 'important', 'critical'] as ModelLevel[]) {
    const sel = next.models[level];
    if (!sel.provider || !sel.modelId) {
      return { ok: false, error: `${level} 级别缺少模型配置。` };
    }
  }

  const storage = getStorage();
  if (storage) {
    storage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(next));
  }

  return { ok: true, config: next };
}

export function clearUserAIConfig(): UserAIConfig {
  getStorage()?.removeItem(AI_CONFIG_STORAGE_KEY);
  return { ...DEFAULT_USER_AI_CONFIG, providers: {} };
}

export function getActiveAIConfig(): ActiveAIConfig | null {
  const config = loadUserAIConfig();
  const hasProvider = Object.values(config.providers).some((cred) => cred.apiKey);
  const usesBuiltin = (['daily', 'important', 'critical'] as ModelLevel[])
    .some(l => config.models[l].provider === 'builtin');
  if (!hasProvider && !usesBuiltin) return null;
  return config;
}

export function isAIConfigured(): boolean {
  return getActiveAIConfig() !== null;
}
