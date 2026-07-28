# Jarvis Life

一款叙事养成 + 资源策略游戏，单局时长 20-30 分钟。玩家通过问卷创建 AI 伴侣，在养成过程中做出抉择，塑造 AI 的人格与命运。

## 技术栈

- **前端框架**：React 19 + TypeScript 6
- **构建工具**：Vite 8
- **状态管理**：Zustand 5
- **样式方案**：Tailwind CSS 3
- **动画库**：Framer Motion
- **音频引擎**：Howler.js
- **桌面端**：Electron 42（支持 macOS / Windows）

## 项目结构

```
src/
├── engine/        # 纯计算函数（属性、经济、磨损、事件选择等引擎）
├── store/         # Zustand Store（游戏状态、音频、设置、UI）
├── pages/         # 页面组件（按游戏阶段划分）
│   ├── stage1-opening/    # 开场问卷
│   ├── stage2-raising/    # 养成阶段
│   ├── stage3-exam/       # 对局裁决
│   └── stage4-endgame/    # 结局呈现
├── components/    # UI 组件（聊天、反馈、布局、通用 UI）
├── data/          # 静态配置数据
├── types/         # TypeScript 类型定义
├── hooks/         # 自定义 Hooks
├── services/      # 服务层
├── main/          # Electron 主进程
├── router/        # 路由配置
├── styles/        # 全局样式
└── utils/         # 工具函数
```

## 游戏模块

| 模块 | 说明 |
|:-----|:-----|
| M1 开场流程 | 问卷映射身份、完成 AI 建档 |
| M2 养成引擎 | 行动点系统、地点行动表、成长曲线 |
| M3 事件系统 | 事件选择塑造 16 种人格 |
| M4 经济系统 | 打工经济、预警和破产 |
| M5 磨损系统 | 磨损阶段、行动点扣减、AI 死亡 |
| M6 对局裁决 | 中间测试 + 终局三轮伦理实验 |
| M7 结局呈现 | 双层报告、AI 大事记、双结局 |
| M8 基础设施 | 存档、主题、音频、资源 |

## 快速开始

需要 Node.js 20.19 或更高版本。

```bash
# 安装依赖
npm ci

# 启动开发服务器（浏览器）
npm run dev

# 启动 Electron 桌面端开发
npm run dev:electron

# 运行测试
npm test

# 类型检查
npm run typecheck

# 代码检查
npm run lint
```

## 构建发布

```bash
# Web 构建
npm run build

# macOS 桌面端构建（ARM64 DMG + ZIP）
npm run build:electron

# Windows 便携版构建（x64）
npm run build:win:portable
```

## AI 配置与安全

- Electron 会用系统安全存储加密玩家自带的 Provider Key；renderer 只拿占位符和进程级代理令牌。
- 浏览器模式仍由玩家本地配置直接调用所选供应商，不适合保存发行方共享密钥。
- 浏览器开发模式的内置 AI 通过 Vite 本地代理转发。
- Electron 的内置 AI 通过仅监听 `127.0.0.1` 的主进程代理转发，真实 `BUILTIN_API_KEY` 不会返回 renderer。
- 不要把发行方长期密钥打进公开安装包；需要为玩家提供平台额度时，应接入带鉴权、限额和审计的远端代理。

内部策划文档不随公开仓库分发。公开贡献请以源码、测试和本 README 为准。

## 质量门禁

每次提交前须通过：

1. `npm run lint` — ESLint 无错误
2. `npm run typecheck` — renderer、构建配置和 Electron 主进程零类型错误
3. `npm test` — 所有测试通过
4. `npm run build` — Web 与 Electron 主进程构建成功

## 许可证

本仓库当前未附开源许可证，默认保留全部权利。复制、修改或分发前请联系维护者取得授权。
