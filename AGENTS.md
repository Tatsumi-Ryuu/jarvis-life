# Jarvis Life — Codex 项目指令

## 项目概览

- **游戏名**：Jarvis Life
- **类型**：叙事养成 + 资源策略游戏（单局 20-30 分钟）
- **技术栈**：React 18 + TypeScript + Vite + Zustand + Tailwind + Framer Motion + Howler.js + Dexie.js
- **架构文档**：`docs/superpowers/specs/2026-05-10-architecture-design.md`
- **策划文档**：`docs/游戏设计文档/阅读说明.md` 是唯一工作版入口

> **注意**：本仓库当前不是 Git 仓库，不要使用任何 Git 命令（如 git init、git commit、git push 等）。

---

## 项目结构

```
src/
├── engine/       # 纯计算函数（回合、属性、事件、磨损等引擎）
├── modules/      # 模块逻辑
├── data/         # 静态配置数据
├── types/        # TypeScript 类型定义
├── store/        # Zustand Store
├── components/   # UI 组件
├── pages/        # 页面组件
├── styles/       # 样式文件
├── App.tsx       # 应用入口
└── main.tsx      # 渲染入口
tests/            # 测试文件
```

---

## 质量门禁

每次提交前必须通过：
1. `npx tsc --noEmit` — 零类型错误
2. `npx vitest run` — 所有测试通过
3. `npm run dev` — 浏览器中无 console 报错
