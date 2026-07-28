import type { Model } from '@earendil-works/pi-ai';
import type { ModelLevel, ModelSelection, NarrativeEngineConfig } from '../../../types';
import {
  getElectronAIProxyToken,
  resolveElectronProviderBaseURL,
} from '../../../services/electron-ai-proxy-service';

export function resolveRuntimeBaseUrl(
  provider: string,
  registryBaseUrl: string,
  userOverride?: string,
): string {
  if (userOverride) return userOverride;

  if (typeof window !== 'undefined' && !window.jarvis?.isElectron) {
    try {
      const url = new URL(registryBaseUrl);
      return `${window.location.origin}/api/${provider}${url.pathname}`;
    } catch {
      return registryBaseUrl;
    }
  }

  return registryBaseUrl;
}

export async function buildModelsForConfig(
  config: NarrativeEngineConfig,
): Promise<Map<ModelLevel, Model<any>>> {
  const { getModel } = await import('@earendil-works/pi-ai');
  const models = new Map<ModelLevel, Model<any>>();

  // Pre-resolve builtin model if any level uses it
  let builtinModel: Model<any> | null = null;
  const builtinCred = config.providers['builtin'];
  const hasBuiltin = (['daily', 'important', 'critical'] as ModelLevel[]).some(
    l => config.models[l].provider === 'builtin',
  );

  if (hasBuiltin && builtinCred) {
    const sampleLevel = (['daily', 'important', 'critical'] as ModelLevel[]).find(
      l => config.models[l].provider === 'builtin',
    )!;
    const sel = config.models[sampleLevel];

    if (sel._resolvedProvider && sel._resolvedModelId) {
      const baseModel = getModel(sel._resolvedProvider as any, sel._resolvedModelId as any);
      if (baseModel) {
        builtinModel = {
          ...baseModel,
          baseUrl: builtinCred.baseURL || baseModel.baseUrl,
        };
      }
    }

    if (!builtinModel) {
      builtinModel = {
        id: 'builtin',
        name: 'Builtin AI',
        api: 'anthropic-messages',
        provider: 'anthropic',
        baseUrl: builtinCred.baseURL || '/api/builtin',
        reasoning: false,
        input: ['text'],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 200000,
        maxTokens: 4800,
      } as Model<any>;
    }
  }

  for (const level of ['daily', 'important', 'critical'] as ModelLevel[]) {
    const selection = config.models[level];

    if (selection.provider === 'builtin' && builtinModel) {
      models.set(level, builtinModel);
      continue;
    }

    // openai-compatible: build synthetic model from user-provided config
    if (selection.provider === 'openai-compatible') {
      const cred = config.providers['openai-compatible'];
      let baseUrl = cred?.baseURL
        ? resolveRuntimeBaseUrl('openai-compatible', cred.baseURL)
        : '/api/custom';
      if (cred?.baseURL && typeof window !== 'undefined' && window.jarvis?.isElectron) {
        baseUrl = await resolveElectronProviderBaseURL('openai-compatible', cred.baseURL);
      }
      models.set(level, {
        id: cred?.customModelId || selection.modelId || 'custom',
        name: cred?.customModelId || selection.modelId || 'Custom Model',
        api: 'openai-completions',
        provider: 'openai-compatible',
        baseUrl,
        reasoning: false,
        input: ['text'],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 200000,
        maxTokens: 4800,
      } as Model<any>);
      continue;
    }

    const baseModel = getModel(selection.provider as any, selection.modelId as any);
    if (!baseModel) {
      throw new Error(`Model not found: ${selection.provider}/${selection.modelId}`);
    }

    const cred = config.providers[selection.provider];
    let baseUrl = resolveRuntimeBaseUrl(
      selection.provider,
      baseModel.baseUrl,
      cred?.baseURL || undefined,
    );
    if (typeof window !== 'undefined' && window.jarvis?.isElectron) {
      baseUrl = await resolveElectronProviderBaseURL(
        selection.provider,
        cred?.baseURL || baseModel.baseUrl,
      );
    }

    models.set(level, { ...baseModel, baseUrl });
  }

  return models;
}

export async function getApiKeyForModel(
  config: NarrativeEngineConfig,
  provider: string,
): Promise<string> {
  const proxyToken = await getElectronAIProxyToken();
  if (proxyToken) return proxyToken;
  if (provider === 'builtin') {
    return config.providers['builtin']?.apiKey ?? 'builtin-proxy';
  }
  return config.providers[provider]?.apiKey ?? '';
}
