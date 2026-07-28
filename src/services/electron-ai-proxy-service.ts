export interface ElectronAIProxyConfig {
  baseURL: string;
  token: string;
}

let cachedConfig: ElectronAIProxyConfig | null | undefined;

export function isElectronAIProxyAvailable(): boolean {
  return typeof window !== 'undefined'
    && window.jarvis?.isElectron === true
    && !!window.jarvis.aiProxy;
}

export async function getElectronAIProxyConfig(): Promise<ElectronAIProxyConfig | null> {
  if (!isElectronAIProxyAvailable()) return null;
  if (cachedConfig !== undefined) return cachedConfig;
  cachedConfig = await window.jarvis!.aiProxy.getConfig();
  return cachedConfig;
}

export async function resolveElectronProviderBaseURL(
  providerId: string,
  upstreamBaseURL: string,
): Promise<string> {
  const proxy = await getElectronAIProxyConfig();
  if (!proxy) return upstreamBaseURL;
  const upstream = new URL(upstreamBaseURL);
  const pathname = upstream.pathname === '/' ? '' : upstream.pathname.replace(/\/$/, '');
  return `${proxy.baseURL}/provider/${encodeURIComponent(providerId)}${pathname}`;
}

export async function getElectronAIProxyToken(): Promise<string | null> {
  return (await getElectronAIProxyConfig())?.token ?? null;
}

export function clearElectronAIProxyCache(): void {
  cachedConfig = undefined;
}
