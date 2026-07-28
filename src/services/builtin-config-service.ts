import type { BuiltinProviderConfig } from '../types';

const EMPTY_CONFIG: BuiltinProviderConfig = {
  available: false,
  provider: '',
  modelId: '',
  displayName: '',
  displayModelName: '',
  proxyToken: '',
  baseURL: '',
};

let cachedConfig: BuiltinProviderConfig | null = null;

export async function getBuiltinConfig(): Promise<BuiltinProviderConfig> {
  if (cachedConfig) return cachedConfig;

  // Electron mode
  if (typeof window !== 'undefined' && window.jarvis?.isElectron && window.jarvis?.builtin) {
    try {
      const result = await window.jarvis.builtin.getConfig();
      if (!result.available) {
        cachedConfig = { ...EMPTY_CONFIG };
        return cachedConfig;
      }
      cachedConfig = {
        available: true,
        provider: result.provider,
        modelId: result.modelId,
        displayName: result.displayName || '内置 AI',
        displayModelName: result.displayModelName || '内置 AI',
        proxyToken: result.proxyToken,
        baseURL: result.baseURL,
      };
      return cachedConfig;
    } catch {
      cachedConfig = { ...EMPTY_CONFIG };
      return cachedConfig;
    }
  }

  // Browser mode: fetch from Vite dev server endpoint
  if (typeof window !== 'undefined') {
    try {
      const resp = await fetch('/api/builtin/config');
      const data = await resp.json();
      if (!data.available) {
        cachedConfig = { ...EMPTY_CONFIG };
        return cachedConfig;
      }
      cachedConfig = {
        available: true,
        provider: '__proxy__',
        modelId: '__proxy__',
        displayName: data.displayName || '内置 AI',
        displayModelName: data.displayModelName || '内置 AI',
        proxyToken: 'builtin-proxy',
        baseURL: `${window.location.origin}/api/builtin`,
      };
      return cachedConfig;
    } catch {
      cachedConfig = { ...EMPTY_CONFIG };
      return cachedConfig;
    }
  }

  cachedConfig = { ...EMPTY_CONFIG };
  return cachedConfig;
}

export function clearBuiltinConfigCache(): void {
  cachedConfig = null;
}
