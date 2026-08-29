import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(value),
    decryptString: (value: Buffer) => value.toString('utf-8'),
  },
}));

import {
  buildBuiltinProxyBaseURL,
  resolveAIProxyTarget,
  startAIProxy,
  stopAIProxy,
} from '../src/main/ai-security';

const servers: Server[] = [];
const originalBuiltinKey = process.env.BUILTIN_API_KEY;
const originalBuiltinProvider = process.env.BUILTIN_PROVIDER;
const originalBuiltinBaseURL = process.env.BUILTIN_BASE_URL;

afterEach(async () => {
  await stopAIProxy();
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  })));

  if (originalBuiltinKey === undefined) delete process.env.BUILTIN_API_KEY;
  else process.env.BUILTIN_API_KEY = originalBuiltinKey;
  if (originalBuiltinProvider === undefined) delete process.env.BUILTIN_PROVIDER;
  else process.env.BUILTIN_PROVIDER = originalBuiltinProvider;
  if (originalBuiltinBaseURL === undefined) delete process.env.BUILTIN_BASE_URL;
  else process.env.BUILTIN_BASE_URL = originalBuiltinBaseURL;
});

async function listen(server: Server): Promise<number> {
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  return address.port;
}

describe('Electron AI security proxy', () => {
  it('confines requests to the configured upstream base path', () => {
    const baseURL = new URL('https://provider.example/api/');
    expect(resolveAIProxyTarget(
      baseURL,
      '/api/v1/messages',
      new URLSearchParams('stream=true'),
    )?.href).toBe('https://provider.example/api/v1/messages?stream=true');
    expect(resolveAIProxyTarget(baseURL, '/outside', new URLSearchParams())).toBeNull();
    expect(resolveAIProxyTarget(baseURL, '//attacker.example/steal', new URLSearchParams())).toBeNull();
  });

  it('enforces origin, method, token, path, and provider credential boundaries', async () => {
    const upstream = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({
        url: request.url,
        apiKey: request.headers['x-api-key'],
        authorization: request.headers.authorization,
        origin: request.headers.origin,
        body: Buffer.concat(chunks).toString('utf-8'),
      }));
    });
    const upstreamPort = await listen(upstream);
    process.env.BUILTIN_API_KEY = 'real-provider-key';
    process.env.BUILTIN_PROVIDER = 'anthropic';
    process.env.BUILTIN_BASE_URL = `http://127.0.0.1:${upstreamPort}/api`;

    const proxy = await startAIProxy();
    const builtinBaseURL = buildBuiltinProxyBaseURL();

    const forbiddenOrigin = await fetch(`${builtinBaseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        Origin: 'https://attacker.example',
        'x-api-key': proxy.token,
      },
      body: '{}',
    });
    expect(forbiddenOrigin.status).toBe(403);

    const unsupportedMethod = await fetch(`${builtinBaseURL}/v1/messages`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${proxy.token}` },
    });
    expect(unsupportedMethod.status).toBe(405);
    expect(unsupportedMethod.headers.get('allow')).toBe('GET, HEAD, POST, OPTIONS');

    const unauthorized = await fetch(`${builtinBaseURL}/v1/messages`, {
      method: 'POST',
      body: '{}',
    });
    expect(unauthorized.status).toBe(401);

    const escapedPath = await fetch(`${builtinBaseURL}/v1/../../outside`, {
      method: 'POST',
      headers: { authorization: `Bearer ${proxy.token}` },
      body: '{}',
    });
    expect(escapedPath.status).toBe(400);

    const authorized = await fetch(`${builtinBaseURL}/v1/messages?stream=true`, {
      method: 'POST',
      headers: {
        Origin: 'null',
        'Content-Type': 'application/json',
        'x-api-key': proxy.token,
      },
      body: '{"message":"hello"}',
    });
    expect(authorized.status).toBe(200);
    expect(authorized.headers.get('access-control-allow-origin')).toBe('null');
    expect(await authorized.json()).toEqual({
      url: '/api/v1/messages?stream=true',
      apiKey: 'real-provider-key',
      body: '{"message":"hello"}',
    });
  });

  it('replaces Google query and header tokens with the provider credential', async () => {
    const upstream = createServer((request, response) => {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({
        url: request.url,
        googleApiKey: request.headers['x-goog-api-key'],
        authorization: request.headers.authorization,
      }));
    });
    const upstreamPort = await listen(upstream);
    process.env.BUILTIN_API_KEY = 'real-google-key';
    process.env.BUILTIN_PROVIDER = 'google';
    process.env.BUILTIN_BASE_URL = `http://127.0.0.1:${upstreamPort}/api`;

    const proxy = await startAIProxy();
    const response = await fetch(
      `${buildBuiltinProxyBaseURL()}/v1/models?key=${encodeURIComponent(proxy.token)}`,
      {
        headers: { 'x-goog-api-key': proxy.token },
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: '/api/v1/models?key=real-google-key',
      googleApiKey: 'real-google-key',
    });
  });
});
