import type { ProviderCredential, ModelSelection } from '../types';
import {
  getElectronAIProxyToken,
  resolveElectronProviderBaseURL,
} from './electron-ai-proxy-service';

export interface ProviderTestResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

export async function testProviderConnection(
  selection: ModelSelection,
  credential: ProviderCredential,
): Promise<ProviderTestResult> {
  try {
    // Built-in provider: use the builtin config to test
    if (selection.provider === 'builtin') {
      const { getBuiltinConfig } = await import('./builtin-config-service');
      const builtin = await getBuiltinConfig();
      if (!builtin.available) {
        return { ok: false, error: '内置 AI 不可用（未配置环境变量）' };
      }

      const { getModel, completeSimple } = await import('@earendil-works/pi-ai');

      // In Electron mode we know the actual provider/model
      if (builtin.provider !== '__proxy__') {
        const baseModel = getModel(builtin.provider as any, builtin.modelId as any);
        if (!baseModel) {
          return { ok: false, error: `未找到模型 ${builtin.provider}/${builtin.modelId}` };
        }
        const model = { ...baseModel, baseUrl: builtin.baseURL || baseModel.baseUrl };
        const start = Date.now();
        await completeSimple(model, {
          systemPrompt: 'You are a connectivity test. Reply with exactly: OK',
          messages: [],
          tools: [],
        }, { apiKey: builtin.proxyToken, maxTokens: 5, timeoutMs: 15_000 });
        return { ok: true, latencyMs: Date.now() - start };
      }

      // Browser/proxy mode: test via the proxy
      const syntheticModel = {
        id: 'builtin',
        name: 'Builtin AI',
        api: 'anthropic-messages',
        provider: 'anthropic',
        baseUrl: builtin.baseURL,
        reasoning: false,
        input: ['text'],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 200000,
        maxTokens: 4800,
      } as any;
      const start = Date.now();
      await completeSimple(syntheticModel, {
        systemPrompt: 'You are a connectivity test. Reply with exactly: OK',
        messages: [],
        tools: [],
      }, { apiKey: builtin.proxyToken, maxTokens: 5, timeoutMs: 15_000 });
      return { ok: true, latencyMs: Date.now() - start };
    }

    // openai-compatible: build synthetic model from user config
    if (selection.provider === 'openai-compatible') {
      const { completeSimple } = await import('@earendil-works/pi-ai');
      let baseUrl = credential.baseURL || '';
      if (typeof window !== 'undefined' && !window.jarvis?.isElectron && baseUrl) {
        try {
          const url = new URL(baseUrl);
          baseUrl = `${window.location.origin}/api/custom${url.pathname}`;
        } catch { /* use as-is */ }
      } else if (baseUrl && typeof window !== 'undefined' && window.jarvis?.isElectron) {
        baseUrl = await resolveElectronProviderBaseURL('openai-compatible', baseUrl);
      }
      const model = {
        id: credential.customModelId || 'custom',
        name: credential.customModelId || 'Custom Model',
        api: 'openai-completions',
        provider: 'openai-compatible',
        baseUrl,
        reasoning: false,
        input: ['text'],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 200000,
        maxTokens: 4800,
      } as any;
      const start = Date.now();
      await completeSimple(model, {
        systemPrompt: 'You are a connectivity test. Reply with exactly: OK',
        messages: [],
        tools: [],
      }, {
        apiKey: (await getElectronAIProxyToken()) || credential.apiKey,
        maxTokens: 5,
        timeoutMs: 15_000,
      });
      return { ok: true, latencyMs: Date.now() - start };
    }

    // Standard provider
    const { getModel, completeSimple } = await import('@earendil-works/pi-ai');

    const baseModel = getModel(selection.provider as any, selection.modelId as any);
    if (!baseModel) {
      return { ok: false, error: `未找到模型 ${selection.provider}/${selection.modelId}` };
    }

    let baseUrl = baseModel.baseUrl;
    if (credential.baseURL) {
      baseUrl = credential.baseURL;
    } else if (typeof window !== 'undefined' && !window.jarvis?.isElectron) {
      try {
        const url = new URL(baseModel.baseUrl);
        baseUrl = `${window.location.origin}/api/${selection.provider}${url.pathname}`;
      } catch { /* use registry default */ }
    }
    if (typeof window !== 'undefined' && window.jarvis?.isElectron) {
      baseUrl = await resolveElectronProviderBaseURL(selection.provider, baseUrl);
    }

    const model = { ...baseModel, baseUrl };

    const start = Date.now();
    await completeSimple(
      model,
      {
        systemPrompt: 'You are a connectivity test. Reply with exactly: OK',
        messages: [],
        tools: [],
      },
      {
        apiKey: (await getElectronAIProxyToken()) || credential.apiKey,
        maxTokens: 5,
        timeoutMs: 15_000,
      },
    );
    const latencyMs = Date.now() - start;

    return { ok: true, latencyMs };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
