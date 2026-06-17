import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const API_PROXY_TARGETS: Record<string, string> = {
  // Coding Plan
  'zai': 'https://api.z.ai',
  'minimax-cn': 'https://api.minimaxi.com',
  'kimi-coding': 'https://api.kimi.com',
  'xiaomi-token-plan-cn': 'https://token-plan-cn.xiaomimimo.com',
  'opencode-go': 'https://opencode.ai',
  // API
  'anthropic': 'https://api.anthropic.com',
  'openai': 'https://api.openai.com',
  'deepseek': 'https://api.deepseek.com',
  'openrouter': 'https://openrouter.ai',
  'google': 'https://generativelanguage.googleapis.com',
};

const ANTHROPIC_STYLE_PROVIDERS = new Set([
  'anthropic', 'minimax-cn', 'kimi-coding', 'xiaomi-token-plan-cn',
]);

function builtinProviderPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'builtin-provider',
    configureServer(server) {
      const apiKey = env.BUILTIN_API_KEY;
      const provider = env.BUILTIN_PROVIDER || 'anthropic';
      const displayName = env.BUILTIN_DISPLAY_NAME || '内置 AI';
      const modelDisplay = env.BUILTIN_MODEL_DISPLAY || '内置 AI';

      // Config endpoint — returns display info only, never the API key
      server.middlewares.use('/api/builtin/config', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({
          available: !!apiKey,
          displayName: apiKey ? displayName : '',
          displayModelName: apiKey ? modelDisplay : '',
        }));
      });

      // API proxy — injects real auth header and forwards to provider
      if (apiKey) {
        const target = env.BUILTIN_BASE_URL || API_PROXY_TARGETS[provider];
        if (!target) return;

        server.middlewares.use('/api/builtin', async (req, res) => {
          try {
            const base = target.endsWith('/') ? target : target + '/';
            const targetUrl = new URL(req.url!.replace(/^\//, ''), base);
            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(chunk);
            const body = Buffer.concat(chunks);

            const headers: Record<string, string> = {};
            for (const [key, value] of Object.entries(req.headers)) {
              if (key.toLowerCase() === 'host') continue;
              if (key.toLowerCase() === 'x-api-key') continue;
              if (key.toLowerCase() === 'authorization') continue;
              if (value) headers[key] = Array.isArray(value) ? value.join(', ') : value;
            }

            // Inject auth header based on provider type
            if (ANTHROPIC_STYLE_PROVIDERS.has(provider)) {
              headers['x-api-key'] = apiKey;
            } else {
              headers['authorization'] = `Bearer ${apiKey}`;
            }

            const response = await fetch(targetUrl.toString(), {
              method: req.method || 'POST',
              headers,
              body: ['GET', 'HEAD'].includes(req.method || '') ? undefined : body,
            });

            res.statusCode = response.status;
            for (const [key, value] of response.headers) {
              if (key.toLowerCase() === 'transfer-encoding') continue;
              if (key.toLowerCase() === 'content-encoding') continue;
              if (value) res.setHeader(key, value);
            }

            if (response.body) {
              const reader = response.body.getReader();
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  res.write(value);
                }
              } finally {
                reader.releaseLock();
              }
            }
            res.end();
          } catch (err) {
            console.error('[builtin-proxy] Error:', err);
            if (!res.headersSent) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Proxy error' }));
            }
          }
        });
      }
    },
  };
}

function customProxyPlugin(): Plugin {
  return {
    name: 'custom-openai-proxy',
    configureServer(server) {
      server.middlewares.use('/api/custom', async (req, res) => {
        const targetUrl = req.headers['x-target-url'];
        if (!targetUrl || typeof targetUrl !== 'string') {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing X-Target-URL header' }));
          return;
        }

        try {
          const base = targetUrl.endsWith('/') ? targetUrl : targetUrl + '/';
          const resolved = new URL(req.url!.replace(/^\//, ''), base);
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = Buffer.concat(chunks);

          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(req.headers)) {
            if (key.toLowerCase() === 'host') continue;
            if (key.toLowerCase() === 'x-target-url') continue;
            if (key.toLowerCase() === 'transfer-encoding') continue;
            if (value) headers[key] = Array.isArray(value) ? value.join(', ') : value;
          }

          const response = await fetch(resolved.toString(), {
            method: req.method || 'POST',
            headers,
            body: ['GET', 'HEAD'].includes(req.method || '') ? undefined : body,
          });

          res.statusCode = response.status;
          for (const [key, value] of response.headers) {
            if (key.toLowerCase() === 'transfer-encoding') continue;
            if (key.toLowerCase() === 'content-encoding') continue;
            if (value) res.setHeader(key, value);
          }

          if (response.body) {
            const reader = response.body.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
            } finally {
              reader.releaseLock();
            }
          }
          res.end();
        } catch (err) {
          console.error('[custom-proxy] Error:', err);
          if (!res.headersSent) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Proxy error' }));
          }
        }
      });
    },
  };
}

function buildProxyConfig(): Record<string, any> {
  const proxy: Record<string, any> = {};

  // Per-provider proxy routes
  for (const [provider, target] of Object.entries(API_PROXY_TARGETS)) {
    proxy[`/api/${provider}`] = {
      target,
      changeOrigin: true,
      secure: true,
      rewrite: (path: string) => path.replace(new RegExp(`^/api/${provider}`), ''),
    };
  }

  return proxy;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), builtinProviderPlugin(env), customProxyPlugin()],
    base: './',
    optimizeDeps: {
      entries: ['index.html'],
      noDiscovery: true,
      include: [
        'howler',
        'ignore',
        'partial-json',
        'react',
        'react-dom/client',
        'react-router-dom',
        '@anthropic-ai/sdk',
      ],
    },
    server: {
      host: '127.0.0.1',
      watch: {
        ignored: [
          '**/.codex-tmp/**',
          '**/.stversions/**',
          '**/docs/**',
          '**/prototypes/**',
          '**/third_party/**',
          '**/dist/**',
          '**/dist-electron/**',
        ],
      },
      proxy: buildProxyConfig(),
    },
  };
})
