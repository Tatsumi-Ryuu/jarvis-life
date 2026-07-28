import { getAgentManager } from './agent-manager';
import type { NarrativeEngineConfig, ModelLevel, ModelSelection } from '../../../types';
import { getActiveAIConfig } from '../../../services/ai-config-service';

const DEFAULT_MODEL_SELECTION: ModelSelection = { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' };

const DEFAULT_CONFIG: NarrativeEngineConfig = {
  providers: {},
  models: {
    daily: { ...DEFAULT_MODEL_SELECTION },
    important: { ...DEFAULT_MODEL_SELECTION },
    critical: { ...DEFAULT_MODEL_SELECTION },
  },
};

let initialized = false;
let initPromise: Promise<void> | null = null;

async function resolveBuiltinConfig(config: NarrativeEngineConfig): Promise<NarrativeEngineConfig> {
  const levels = (['daily', 'important', 'critical'] as const)
    .filter(l => config.models[l].provider === 'builtin');

  if (levels.length === 0) return config;

  const { getBuiltinConfig } = await import('../../../services/builtin-config-service');
  const builtin = await getBuiltinConfig();

  if (!builtin.available) {
    console.warn('[NarrativeEngine] Builtin provider referenced but not available in environment');
    return config;
  }

  const next: NarrativeEngineConfig = {
    ...config,
    providers: { ...config.providers },
    models: { ...config.models },
  };

  next.providers['builtin'] = { apiKey: builtin.proxyToken, baseURL: builtin.baseURL || undefined };

  for (const level of levels) {
    next.models[level] = {
      ...next.models[level],
      _resolvedProvider: builtin.provider !== '__proxy__' ? builtin.provider : undefined,
      _resolvedModelId: builtin.provider !== '__proxy__' ? builtin.modelId : undefined,
      displayName: builtin.displayModelName || undefined,
    };
  }

  return next;
}

export async function initNarrativeEngine(
  config?: Partial<NarrativeEngineConfig>,
): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const userConfig = getActiveAIConfig();

    let finalConfig: NarrativeEngineConfig = {
      providers: { ...(userConfig?.providers ?? DEFAULT_CONFIG.providers), ...(config?.providers ?? {}) },
      models: {
        daily: userConfig?.models.daily ?? DEFAULT_CONFIG.models.daily,
        important: userConfig?.models.important ?? DEFAULT_CONFIG.models.important,
        critical: userConfig?.models.critical ?? DEFAULT_CONFIG.models.critical,
        ...(config?.models ?? {}),
      } as Record<ModelLevel, ModelSelection>,
      sessionsDir: config?.sessionsDir,
    };

    finalConfig = await resolveBuiltinConfig(finalConfig);

    const hasProvider = Object.values(finalConfig.providers).some((cred) => cred.apiKey);
    if (!hasProvider) {
      console.warn(
        '[NarrativeEngine] No provider configured. AI generation will use fallback content. ' +
          'Configure an AI channel in Settings to enable provider calls.',
      );
      initialized = true;
      return;
    }

    const manager = getAgentManager();
    await manager.initialize(finalConfig);
    initialized = true;
  })().catch((error) => {
    initPromise = null;
    throw error;
  });

  return initPromise;
}

export function isNarrativeEngineInitialized(): boolean {
  return initialized;
}

export function resetNarrativeEngine(): void {
  initialized = false;
  initPromise = null;
}
