export type ProviderCategory = 'coding-plan' | 'api';

export interface ProviderInfo {
  id: string;
  label: string;
  category: ProviderCategory;
  apiFormat: 'anthropic-messages' | 'openai-completions';
  needsBaseURL: boolean;
  needsApiKey: boolean;
  needsModelId: boolean;
  canFetchModels: boolean;
}

export const PROVIDERS: ProviderInfo[] = [
  // Coding Plan
  { id: 'zai', label: 'GLM Coding Plan', category: 'coding-plan', apiFormat: 'openai-completions', needsBaseURL: false, needsApiKey: true, needsModelId: false, canFetchModels: true },
  { id: 'minimax-cn', label: 'MiniMax Token Plan', category: 'coding-plan', apiFormat: 'anthropic-messages', needsBaseURL: false, needsApiKey: true, needsModelId: false, canFetchModels: false },
  { id: 'kimi-coding', label: 'Kimi Coding', category: 'coding-plan', apiFormat: 'anthropic-messages', needsBaseURL: false, needsApiKey: true, needsModelId: false, canFetchModels: false },
  { id: 'xiaomi-token-plan-cn', label: 'Xiaomi MiMo', category: 'coding-plan', apiFormat: 'anthropic-messages', needsBaseURL: false, needsApiKey: true, needsModelId: false, canFetchModels: false },
  { id: 'opencode-go', label: 'OpenCode Go', category: 'coding-plan', apiFormat: 'openai-completions', needsBaseURL: false, needsApiKey: true, needsModelId: false, canFetchModels: true },
  // API
  { id: 'deepseek', label: 'DeepSeek', category: 'api', apiFormat: 'openai-completions', needsBaseURL: false, needsApiKey: true, needsModelId: false, canFetchModels: true },
  { id: 'openai', label: 'OpenAI', category: 'api', apiFormat: 'openai-completions', needsBaseURL: false, needsApiKey: true, needsModelId: false, canFetchModels: true },
  { id: 'openrouter', label: 'OpenRouter', category: 'api', apiFormat: 'openai-completions', needsBaseURL: false, needsApiKey: true, needsModelId: false, canFetchModels: true },
  { id: 'anthropic', label: 'Anthropic', category: 'api', apiFormat: 'anthropic-messages', needsBaseURL: false, needsApiKey: true, needsModelId: false, canFetchModels: false },
  { id: 'google', label: 'Google Gemini', category: 'api', apiFormat: 'openai-completions', needsBaseURL: false, needsApiKey: true, needsModelId: false, canFetchModels: true },
  { id: 'openai-compatible', label: 'OpenAI 兼容', category: 'api', apiFormat: 'openai-completions', needsBaseURL: true, needsApiKey: true, needsModelId: true, canFetchModels: true },
];

const BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]));

export function getProviderInfo(id: string): ProviderInfo | undefined {
  return BY_ID.get(id);
}

export function getProvidersByCategory(category: ProviderCategory): ProviderInfo[] {
  return PROVIDERS.filter((p) => p.category === category);
}

const ANTHROPIC_STYLE_IDS = new Set(
  PROVIDERS.filter((p) => p.apiFormat === 'anthropic-messages').map((p) => p.id),
);

export function isAnthropicStyleAuth(providerId: string): boolean {
  return ANTHROPIC_STYLE_IDS.has(providerId);
}

const MODEL_FETCH_CACHE_KEY = 'jarvis-remote-models-';

export async function fetchRemoteModels(
  providerId: string,
  apiKey: string,
  baseURL?: string,
): Promise<{ id: string; name: string }[]> {
  const cacheKey = MODEL_FETCH_CACHE_KEY + providerId;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch { /* ignore */ }

  const info = getProviderInfo(providerId);
  if (!info || !info.canFetchModels) return [];

  let endpoint: string;
  let requestApiKey = apiKey;
  const electronProxy = await getElectronAIProxyConfig();
  if (electronProxy) {
    const proxyBase = baseURL
      ? await resolveElectronProviderBaseURL(providerId, baseURL)
      : `${electronProxy.baseURL}/provider/${encodeURIComponent(providerId)}`;
    endpoint = `${proxyBase.replace(/\/$/, '')}/models`;
    requestApiKey = electronProxy.token;
  } else if (baseURL) {
    const base = baseURL.endsWith('/') ? baseURL : baseURL + '/';
    endpoint = base + 'models';
  } else if (typeof window !== 'undefined' && !window.jarvis?.isElectron) {
    endpoint = `${window.location.origin}/api/${providerId}/models`;
  } else {
    return [];
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (providerId === 'openai-compatible') {
      if (!baseURL) return [];
      headers['authorization'] = `Bearer ${requestApiKey}`;
    } else if (isAnthropicStyleAuth(providerId)) {
      headers['x-api-key'] = requestApiKey;
    } else {
      headers['authorization'] = `Bearer ${requestApiKey}`;
    }

    const res = await fetch(endpoint, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];

    const json = await res.json();
    const models = (json.data ?? json.models ?? [])
      .map((m: any) => ({ id: m.id ?? m.name, name: m.id ?? m.name }))
      .filter((m: { id: string }) => m.id);

    if (models.length > 0) {
      try { sessionStorage.setItem(cacheKey, JSON.stringify(models)); } catch { /* ignore */ }
    }
    return models;
  } catch {
    return [];
  }
}
import {
  getElectronAIProxyConfig,
  resolveElectronProviderBaseURL,
} from './electron-ai-proxy-service';
