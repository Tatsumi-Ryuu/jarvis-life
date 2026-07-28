# Jarvis Life — Agent / Contributor Guide

## 项目概览

- 游戏类型：叙事养成 + 资源策略，单局约 20–30 分钟
- 前端：React 19、TypeScript 6、Vite 8、Zustand 5、Tailwind CSS 3
- 桌面端：Electron 42，支持 Windows 与 macOS
- 测试：Vitest

公开仓库不包含被 `.gitignore` 排除的内部策划文档。实现与行为以当前源码、测试和 README 为准，不要假设本地 `docs/` 一定存在。

## 目录

```text
src/
├── engine/       # 游戏计算、叙事与 AI runtime
├── store/        # Zustand 状态
├── pages/        # 按游戏阶段组织的页面
├── components/   # UI 与反馈组件
├── data/         # 静态配置
├── services/     # 存档、供应商与持久化
├── main/         # Electron 主进程与 preload
└── types/        # 共享类型
tests/            # Vitest 测试
```

## 安全边界

- `BUILTIN_API_KEY` 只能留在 Vite 开发代理或 Electron 主进程代理内，禁止通过 IPC、preload 或页面状态返回给 renderer。
- Electron renderer 只能获得短生命周期代理令牌；不要把它改回真实供应商密钥。
- 文件 IPC 必须经过 `src/main/path-guards.ts`，破坏性操作不得接受存档根目录。
- `/dev/*` 预览路由只能在 `import.meta.env.DEV` 下注册。

## 提交前验证

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

上述命令也是 GitHub Actions 的质量门禁。修改 Electron IPC、存档格式或叙事引擎时，应补对应回归测试。
