# utter-office

utter-office（AI 秘书）独立移动端 APP 骨架。从 Multica fork 独立出来：语音 + BLE 硬件作为需求/任务输入来源，对接 Multica 后端（web/桌面/后端沿用不改）。

本仓库当前为**最小可构建骨架**（issue COD-13），只包含移动端与通信层，不含语音 / BLE / ASR 改造。

## 仓库结构

```
apps/mobile          # Expo / React Native APP 主体（expo-router + nativewind）
packages/core        # 通信层：API client、React Query hooks、Zustand stores（方案 A：直接复制源码，不发布内部包）
packages/eslint-config  # 共享 ESLint 基座（@multica/eslint-config）
packages/tsconfig       # 共享 TS 基座（@multica/tsconfig）
pnpm-workspace.yaml     # workspace 定义 + catalog（版本与 multica 源仓库锁定的解析版本一致）
turbo.json              # turbo 任务配置（裁剪至 mobile + core）
```

## 环境要求

- Node.js 22+
- pnpm 10.28.2（`packageManager` 已固定）

## 快速开始

```bash
pnpm install            # 安装依赖
pnpm dev                # 启动 Expo（等价于 pnpm -C apps/mobile dev）
pnpm typecheck          # turbo typecheck（mobile + core）
pnpm lint               # turbo lint
pnpm test               # turbo test
pnpm build              # expo export --platform android（JS bundle 产物到 dist/）
```

### 本地开发环境变量

`apps/mobile/.env.example` 是模板。本地开发复制为
`apps/mobile/.env.development.local` 并填入真实的
`EXPO_PUBLIC_API_URL`（本仓库当前未连后端，仅保留占位）。

```bash
cp apps/mobile/.env.example apps/mobile/.env.development.local
# 编辑 EXPO_PUBLIC_API_URL 指向后端
```

### 真机 / 模拟器

`apps/mobile` 里各脚本与多环境配置沿用 Multica 源仓库约定
（`dev:staging` / `dev:prod` / `ios:*` 等），见 `apps/mobile/package.json`。
真机运行需要 Xcode / Android 环境，本骨架未在真机验证。

## 验证结果（骨架交付时的状态）

- `pnpm install` 通过（pnpm 10.28.2）
- `pnpm typecheck` 通过（core + mobile）
- `pnpm lint` 通过（0 errors；mobile 有 7 条源仓库遗留 warning）
- `pnpm test` 通过（core 121 文件 / 1343 tests；mobile 11 文件 / 62 tests）
- `pnpm build`（`expo export --platform android`）通过
- `expo start` 可启动，Metro 在 8081 端口正常服务 dev bundle

## 与 Multica 源仓库的差异

- 根 package.json name 改为 `utter-office`，APP 显示名改为 `Utter Office`
  （slug `utter-office`、scheme `utteroffice`）。
- 内部 workspace 包名保留 `@multica/*`（`@multica/mobile`、`@multica/core` 等）：
  因 `apps/mobile` 有 132 处 `@multica/core` 引用，改名会大范围改动源码，
  骨架阶段保留原名以保证可构建性。
- 依赖版本：catalog 与 `apps/mobile/package.json` 中与 core 共享的
  `@tanstack/react-query` / `zod` / `zustand` / `@types/react` 等已对齐到
  multica 源锁文件（pnpm-lock.yaml）的解析版本，避免新鲜安装时的版本漂移。
- `apps/mobile/.env.staging` / `.env.production` 改为占位 host，未连真实后端。

## 待办（后续 issue）

- 语音录制 / BLE 硬件接入 / ASR 转写（先留接口位，按 vendor 文档补专项）
- 与后端真实联调（当前仅保留配置占位）
- core 发布为内部 npm 包（方案 B）
- 建远端仓库
