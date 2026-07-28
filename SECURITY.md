# Security Policy

## Reporting

Please report suspected vulnerabilities privately to the repository maintainers before opening a public issue. Include the affected version, reproduction steps, and the expected impact.

## Built-in AI credentials

`BUILTIN_API_KEY` is restricted to the Vite development proxy or the Electron main-process loopback proxy. The renderer receives a random, process-lifetime proxy token instead of the provider credential.

This reduces accidental disclosure through DevTools or renderer compromise. It is not a substitute for a remote, authenticated service when distributing publisher-funded AI access: a long-lived publisher secret cannot be made fully confidential on an end user's computer.

In Electron, player-provided provider keys are encrypted with the operating system credential store. The renderer receives a placeholder when loading saved configuration, and provider requests are authenticated by the loopback proxy in the main process. Browser mode cannot offer the same boundary and should only use player-owned credentials.

## Dependency audit notes

The dependency lockfile is reviewed with both:

```bash
npm audit --omit=dev
npm audit
```

The July 2026 production audit reports `GHSA-qwww-vcr4-c8h2` through React Router 7. The advisory only affects unstable RSC APIs; Jarvis Life is a client-only `createHashRouter` application and does not import or enable React Server Components. The patched React Router 8.3 line currently requires Node 22 and does not provide a compatible `react-router-dom` release, so the project remains on the latest compatible 7.x release while Dependabot tracks an upgrade.

Development-only findings in Electron Builder and ExcelJS are kept out of the packaged application by the Electron Builder `files` allowlist. Their scripts operate on repository-controlled inputs only. They should still be upgraded promptly when compatible upstream fixes become available.
