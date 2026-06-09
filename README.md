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

```bash
# 安装依赖
npm install

# 启动开发服务器（浏览器）
npm run dev

# 启动 Electron 桌面端开发
npm run dev:electron

# 运行测试
npm test

# 类型检查
npx tsc --noEmit
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

## 策划文档

游戏设计文档位于 `docs/游戏设计文档/`，推荐阅读顺序：

1. `00-游戏总览.md` — 核心参数速查
2. `制作阶段/01-当前最小可玩版本范围.md` — 当前版本边界
3. `共享规范/` — 状态存档、内容格式、组件规范
4. `界面体验/09-完整界面流程与交互逻辑.md` — 全部界面规格
5. `模块细案/01~08` — 各模块详细设计

## 质量门禁

每次提交前须通过：

1. `npx tsc --noEmit` — 零类型错误
2. `npx vitest run` — 所有测试通过
3. `npm run dev` — 浏览器中无 console 报错

## 许可证

私有项目，未经授权不得分发。
