# PhotoMind

> 一款**完全离线**的本地桌面照片管理应用，集「照片库 + 标签管理 + 照片查看器 + 思维导图式联想画布」于一体。

PhotoMind 帮助你以「整理 + 联想」的方式管理照片：既能把零散的照片按标签、评分归置清晰，又能把相关照片拖入无限画布、连成联想图谱，沉淀成可随时回看的「联想库」。所有数据保存在本地，**绝不上传**。

---

## 目录

- [项目描述](#项目描述)
  - [背景与目标](#背景与目标)
  - [核心功能](#核心功能)
  - [技术栈](#技术栈)
  - [与同类项目的差异化](#与同类项目的差异化)
  - [解决什么问题、适用于谁](#解决什么问题适用于谁)
- [目录结构](#目录结构)
- [安装指南](#安装指南)
  - [环境要求](#环境要求)
  - [依赖项](#依赖项)
  - [方式一：源码安装（推荐开发者）](#方式一源码安装推荐开发者)
  - [方式二：Windows 安装包](#方式二windows-安装包)
  - [方式三：源码编译打包](#方式三源码编译打包)
  - [常见安装问题](#常见安装问题)
- [使用示例](#使用示例)
  - [基本流程：导入 → 处理 → 标签 → 评分](#基本流程导入--处理--标签--评分)
  - [照片库：搜索、筛选与排序](#照片库搜索筛选与排序)
  - [联想画布：连接照片、沉淀思路](#联想画布连接照片沉淀思路)
  - [联想库：保存与回看快照](#联想库保存与回看快照)
  - [设置：主题、自定义背景与存储目录](#设置主题自定义背景与存储目录)
  - [命令行与 API 调用](#命令行与-api-调用)
- [数据存储](#数据存储)
- [贡献指南](#贡献指南)
  - [开发规范](#开发规范)
  - [代码风格](#代码风格)
  - [提交信息规范](#提交信息规范)
  - [分支管理策略](#分支管理策略)
  - [Pull Request 流程](#pull-request-流程)
  - [报告 Bug 与提出建议](#报告-bug-与提出建议)
- [项目状态与版本历史](#项目状态与版本历史)
- [许可证](#许可证)
- [联系方式](#联系方式)
- [致谢](#致谢)

---

## 项目描述

### 背景与目标

常见的照片管理软件要么依赖云端服务（隐私风险、订阅费），要么只提供单一的文件夹浏览与编辑功能，难以表达「照片之间的关联」。PhotoMind 的目标是提供一个**本地优先、无网络依赖**的照片管理工具，并在此基础上引入「联想画布」——让你像做思维导图一样，把照片拖到画布上、用连线表达它们之间的逻辑关系，从而把「整理照片」升级为「梳理记忆与想法」。

### 核心功能

- **照片库**：递归导入常见图片格式（`jpg / jpeg / png / webp / gif / bmp`），按路径去重；支持标签搜索、评分筛选、排序、多选与批量操作。
- **照片处理（编辑器）**：为照片设置自定义名称、标签（多标签）、星级评分，并标记「处理完毕」；已处理照片按完成时间排序。
- **照片查看器**：大图缩放、拖拽平移、双击复位，键盘 `← / →` 切换，读取 EXIF（拍摄时间、快门、ISO、光圈等）。
- **联想画布**：基于 React Flow 的无限画布，从左侧照片栏拖入照片生成节点，节点可移动/缩放/删除，节点间连线并支持可编辑标签，支持一键自动整理布局。
- **联想库**：将画布一键「保存到库」，生成标准化快照（含节点、连线、标签与位置）及预览图，供只读回看，支持右键删除与多选。
- **个性化设置**：白/黑双主题切换、自定义背景图与不透明度、自定义 `savepicture` 存储目录。
- **数据隔离与保护**：导入的照片会**完整复制**到 `savepicture/` 目录（保留原始格式、名称与元数据），后续一切查看、编辑、转换、分享都基于副本进行，**原始源文件不被改动**。

### 技术栈

| 领域 | 技术 |
| --- | --- |
| 桌面框架 | Electron 44 |
| 前端 | React 19 + TypeScript 5 |
| 构建 | Vite（electron-vite 5） |
| 数据库 | SQLite（Node 内置 `node:sqlite`，无需 C++ 编译） |
| 画布 | React Flow（`@xyflow/react` 12） |
| 状态管理 | Zustand 5 |
| 样式 | Tailwind CSS 3 + CSS 变量（语义主题 token） |
| 图像处理 | sharp（缩略图 / 画布快照合成） |
| 元数据 | exifr（EXIF 读取） |
| 虚拟列表 | `@tanstack/react-virtual` |
| 打包 | electron-builder（NSIS / DMG） |

### 与同类项目的差异化

| 维度 | PhotoMind | 传统相册软件 |
| --- | --- | --- |
| 网络 | **完全离线**，零上传 | 常依赖云端同步 |
| 照片关联 | **联想画布**表达照片间逻辑关系 | 仅文件夹/相册组织 |
| 数据安全 | 副本隔离，原图只读 | 可能直接操作原图 |
| 可移植 | 数据统一存于 `data/`，绿色便携 | 散落于系统盘 AppData |

### 解决什么问题、适用于谁

- **隐私敏感用户**：照片绝不出本机，无账号、无云、无遥测。
- **知识梳理型用户**：摄影师、研究者、设计师等需要为照片建立关联与叙事。
- **本地归档者**：希望用标签 + 评分 + 完成状态系统化整理大量本地照片的人。

---

## 目录结构

```
PhotoMind/
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── index.ts          # 入口、窗口、数据目录
│   │   ├── db.ts             # SQLite 建表与自动迁移
│   │   ├── photoRepo.ts      # 照片导入/删除/迁移仓储
│   │   ├── thumbnail.ts      # 缩略图生成（sharp）
│   │   ├── exif.ts           # EXIF 读取
│   │   ├── canvasExport.ts   # 画布快照图片合成
│   │   ├── mindLibraryRepo.ts# 联想库快照仓储
│   │   ├── mapRepo.ts        # 画布节点/连线仓储
│   │   ├── settings.ts       # settings.json 读写
│   │   ├── protocol.ts       # photomind:// 自定义协议
│   │   └── ipc.ts            # IPC 处理器注册
│   ├── preload/              # contextBridge 暴露 window.api
│   ├── shared/               # 共享类型与 IPC 通道定义
│   └── renderer/             # React 前端
│       └── src/
│           ├── pages/        # LibraryPage / CanvasPage / MindLibraryPage / EditorPage / SettingsPage / PhotoDetailPage
│           ├── components/   # 通用组件（如 Viewer）
│           ├── store/        # Zustand store（library / theme / background / libraryUi）
│           └── styles/       # index.css（主题 CSS 变量）
├── electron.vite.config.ts
├── electron-builder.yml      # 打包配置
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── .npmrc                    # Electron 国内镜像
└── package.json
```

---

## 安装指南

### 环境要求

| 项目 | 要求 |
| --- | --- |
| 操作系统 | Windows 10/11（64 位）；macOS（Intel x64 或 Apple Silicon arm64） |
| Node.js | ≥ 22.5（`node:sqlite` 所需），推荐 22 LTS |
| 包管理器 | npm（项目附带 `package-lock.json`） |
| 磁盘 | 视照片数量而定，建议预留足够空间存放 `savepicture/` 与缩略图缓存 |

> 说明：`node:sqlite`（`DatabaseSync`）由 Electron 44 内置的 Node 22 提供，应用运行时无需为 Node 版本发愁；本机安装的 Node 主要用于开发构建工具链（electron-vite、tsc、electron-builder）。

### 依赖项

运行时依赖（生产）：

- `exifr`：EXIF 元数据读取
- `sharp`：缩略图生成、画布快照图片合成

开发/构建依赖（见 `package.json` 的 `devDependencies`）：`electron`、`electron-builder`、`electron-vite`、`react`、`react-dom`、`typeScript`、`vite`、`tailwindcss`、`zustand`、`@xyflow/react`、`@tanstack/react-virtual` 等。

### 方式一：源码安装（推荐开发者）

```bash
# 1. 克隆仓库
git clone https://github.com/Ci-0nya/Local-Photo-Manager.git
cd Local-Photo-Manager

# 2. 安装依赖
npm install

# 3. 开发模式运行（热更新）
npm run dev

# 4. 类型检查（可选）
npm run typecheck
```

> 首次 `npm install` 会下载 Electron 二进制，国内网络可能较慢。项目已内置 `.npmrc` 使用国内镜像 `https://npmmirror.com/mirrors/electron/`，通常可直连成功。

### 方式二：Windows 安装包

从 [Releases](https://github.com/Ci-0nya/Local-Photo-Manager/releases) 或本地 `release/` 目录下载 `photomind v0.2.1.exe`（NSIS 安装版）：

1. 双击运行安装程序。
2. 可选：自定义安装目录、创建桌面快捷方式。
3. 首次启动若 Windows SmartScreen 提示（未签名应用），点击「更多信息 → 仍要运行」。

### 方式三：源码编译打包

```bash
# Windows（生成 NSIS 安装版到 release/）
npm run build:win

# macOS（生成 DMG 到 release/）
npm run build:mac
```

> 跨平台限制：macOS 的 DMG 只能在 macOS 上构建。macOS 采用双架构矩阵构建（Intel `x64` + Apple Silicon `arm64`），由 `.github/workflows/release-macos.yml` 通过推送 `v*` 标签或手动 `workflow_dispatch` 触发。

### 常见安装问题

**Q1：`npm install` 时 Electron 下载失败 / 很慢？**

```bash
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
```

项目自带 `.npmrc` 已配置该镜像；如仍失败，可改用官方源：`npm config delete electron_mirror`。

**Q2：Windows 启动被 SmartScreen 拦截？**

因未购买代码签名证书，属正常现象，本应用无联网上传行为。点「更多信息 → 仍要运行」。

**Q3：macOS 提示「此 Mac 不支持此应用程序」？**

说明下载的安装包架构不匹配（例如在 Intel Mac 上打开了 arm64 版本）。请下载对应架构：`mac alice v0.2.1-x64.dmg`（Intel）或 `mac alice v0.2.1-arm64.dmg`（Apple Silicon）。

**Q4：macOS 未签名应用无法打开？**

右键安装包或应用 →「打开」，并在「系统设置 → 隐私与安全性」中允许其运行。

**Q5：`node:sqlite` 相关报错？**

确认本机 Node.js ≥ 22.5；应用运行不依赖本机 Node（由 Electron 内置提供）。

---

## 使用示例

### 基本流程：导入 → 处理 → 标签 → 评分

1. **导入照片**：进入「照片库」，点击「导入文件夹」（或选择多张图片）。导入的照片会被**完整复制**到 `savepicture/`，并自动进入照片库。
2. **处理照片**：双击照片（或右键打开）进入编辑器：
   - 设置**自定义名称**（可为空，为空时界面隐藏名称栏）；
   - 添加一个或多个**标签**；
   - 点击星级进行**评分**（0 未评分，1–5 星）。
3. **处理完毕**：点击「处理完毕」进入下一张。已处理照片会按「完成时间」排序（而非导入时间），且切换照片或返回时，之前输入的名称/标签/评分都会保留。

### 照片库：搜索、筛选与排序

- **标签搜索**：点击标签后生成「临时相册」，仅显示含该标签的照片；切换页面再返回，临时相册状态会保留。
- **排序**：支持按创建时间、编辑时间、文件名、评分等排序，可切换升/降序。
- **筛选**：按评分区间筛选。
- **多选**：进入多选模式批量勾选，可批量删除（删除时可选「同时删除本地文件」）。

### 联想画布：连接照片、沉淀思路

1. 切到「联想画布」，从左侧照片栏把照片**拖入画布**生成图片节点。
2. 节点可**拖动 / 缩放 / 删除**；从节点右侧绿色圆点拖线到另一节点左侧蓝色圆点建立**连线**。
3. 点击连线中间的标签可**编辑文字**（Enter 保存、Esc 取消）；连线右侧 × 删除连线。
4. 「自动整理」可按连线方向做分层布局（源节点居左、目标节点居右），自动居中并避免节点重叠。
5. 画布**自动保存**：节点位置、大小、连线与标签在重启后完整恢复。

### 联想库：保存与回看快照

1. 在「联想画布」右上角点击「保存到库」，为当前画布命名。
2. 保存后，画布会以「快照」形式存入「联想库」，并附带一张预览图。
3. 在「联想库」点击卡片可**只读回看**（快照为只读，不支持连接节点）；右键可删除，支持多选。

### 设置：主题、自定义背景与存储目录

- **主题**：白色（默认）/ 黑色两套主题，即时切换、平滑过渡。
- **自定义背景**：上传图片替换软件背景，并通过滑块调整**不透明度**（主题切换不影响背景显示）。
- **存储目录**：自定义 `savepicture` 照片副本目录与数据库/缩略图缓存位置。

### 命令行与 API 调用

**冒烟测试（CI 用）**

设置环境变量 `PHOTOMIND_SMOKE=1` 后启动，应用会完成初始化、打印结果并自动退出：

```bash
PHOTOMIND_SMOKE=1 electron .
# 输出示例：[PhotoMind] SMOKE_OK db=...photomind.db photos=N
```

**渲染进程 API（`window.api`）**

主进程通过 `preload` 的 `contextBridge` 暴露白名单接口（定义见 `src/shared/ipc.ts` 的 `PhotoMindApi`），渲染进程通过 `window.api` 调用。核心方法举例：

```ts
// 导入照片
const { photos, errors } = await window.api.importPhotos(paths)

// 查询全部照片
const photos: Photo[] = await window.api.getPhotos()

// 设置标签 / 评分 / 名称
await window.api.setPhotoTags(id, ['旅行', '2026'])
await window.api.setRating(id, 5)
await window.api.setPhotoName(id, '海边日落')

// 删除照片（deleteFiles=true 时同时删除本地副本）
await window.api.deletePhotos(ids, deleteFiles)

// 保存联想库快照
const item = await window.api.saveMindLibrary('我的联想', snapshot)

// 自定义背景
await window.api.applyBackground(imagePath)
await window.api.setBackgroundOpacity(0.8)
```

完整的通道与类型定义，请查阅 [src/shared/ipc.ts](src/shared/ipc.ts)。

---

## 数据存储

所有生成的数据统一存放在**程序所在目录**（打包版为可执行文件目录，开发版为项目根目录）下的 `data/` 子目录，**不写入系统 C 盘 AppData**：

```
PhotoMind/
├── data/
│   ├── photomind.db     # SQLite 数据库（照片、画布、联想库等）
│   ├── settings.json    # 应用配置（savepicture 路径、背景图、不透明度）
│   ├── thumbnails/      # 缩略图缓存（480px JPEG，GIF 取首帧）
│   ├── backgrounds/     # 自定义背景图
│   ├── session/         # Electron/Chromium 会话缓存
│   ├── logs/            # 日志
│   └── tmp/             # 临时文件
├── savepicture/         # 导入照片的完整副本（隔离保护原图）
└── kushot/              # 联想画布快照导出图片
```

数据库表：`photos`、`maps`、`map_nodes`、`map_edges`、`mind_library`。

> 迁移与备份：重装或换电脑时，备份 `data/` 与 `savepicture/` 目录即可迁移；导入相同路径时按 `source_path` 去重，重新扫描会重新添加已删除记录。

---

## 贡献指南

感谢你考虑为 PhotoMind 做贡献！请先阅读以下约定，以保持代码库的一致性与可维护性。

### 开发规范

- 主进程（`src/main`）负责 SQLite、文件夹扫描、缩略图生成、EXIF 读取与画布导出。
- 渲染进程（`src/renderer`）仅通过 `preload`（`contextBridge`）暴露的白名单 IPC 访问数据，**禁止**直接访问 Node API。
- 所有主进程处理器必须使用 `async/await`，禁止 callback 风格。
- 新增 IPC 时，需在 `src/shared/ipc.ts` 中同时补齐 `CHANNELS`、类型与 `window.api` 接口定义。
- 变更数据库结构时，须在 `src/main/db.ts` 中书写幂等迁移（先补列 / 迁移数据再删旧表），并在加入索引前先在 staging 验证。

### 代码风格

- 使用 TypeScript 严格模式，提交前请运行 `npm run typecheck` 确保无类型错误。
- 使用项目已有的语义主题 token（`text-content` / `text-content-muted` / `border-outline` / `bg-canvas` / `bg-surface` 等），避免硬编码颜色，以保证白/黑双主题自适应。
- 遵循「最小化修改」原则：只改动与当前任务直接相关的代码，不进行无关的重构或过度设计。
- 提交前请运行 `npm run build` 验证可正常构建。

### 提交信息规范

采用 [Conventional Commits](https://www.conventionalcommits.org/) 风格，类型 + 简短中文描述：

```
<type>: <简述>

<可选正文，说明动机/影响>
```

常用类型：

- `feat`：新功能
- `fix`：修复 Bug
- `ci`：CI / 打包流水线变更
- `docs`：文档变更
- `refactor`：重构
- `chore`：杂项（依赖、配置等）

示例：

```
feat: 主题切换、自定义背景图与联想画布自动整理优化

修复黑色主题下部分文字颜色未适配的问题，并新增自定义背景图与不透明度设置。
```

### 分支管理策略

- `main`：稳定分支，始终可构建。
- 功能 / 修复开发建议从 `main` 切出描述性分支（如 `feat/tag-filters`、`fix/editor-state-lost`），完成后提交 PR 合并回 `main`。

### Pull Request 流程

1. Fork 仓库并在本地创建特性分支。
2. 完成改动，运行 `npm run typecheck` 与 `npm run build` 确保通过。
3. 提交（遵循上述提交规范）并推送到你的 Fork。
4. 发起 Pull Request，在描述中说明**动机、改动点与验证方式**。
5. 等待 review；如涉及 SQL 性能优化，请附带优化前后的耗时对比数据。

### 报告 Bug 与提出建议

- **Bug**：在 [Issues](https://github.com/Ci-0nya/Local-Photo-Manager/issues) 中新建 issue，尽量包含：复现步骤、期望/实际行为、操作系统与版本、相关日志（`data/logs/`）。
- **功能建议**：同样通过 Issues 提出，并说明使用场景与价值。

---

## 项目状态与版本历史

**当前状态**：稳定可用（v0.2.1），Windows 安装包已发布；macOS 双架构安装包由 CI 构建。

| 版本 | 说明 |
| --- | --- |
| v0.1.0 | 初版，采用「分类 / 相册」体系 |
| v0.2.0 | Windows 打包，功能完善 |
| v0.2.1 | 标签系统重构（替代分类）、联想画布 / 联想库、白黑主题、自定义背景、存储目录自定义、临时相册状态跨页保留等 |

> 完整提交历史见 [GitHub 提交记录](https://github.com/Ci-0nya/Local-Photo-Manager/commits/main)。

---

## 许可证

本项目采用 [MIT License](LICENSE)：

```
MIT License

Copyright (c) 2026 席怜喵

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**简要说明**：允许自由使用、修改、复制、合并、发布、分发、再许可及销售本软件及其副本；须在软件及其副本中包含上述版权与许可声明；软件按「现状」提供，无任何形式的担保。

---

## 联系方式

- **仓库**：https://github.com/Ci-0nya/Local-Photo-Manager
- **问题反馈 / 功能建议**：[Issues](https://github.com/Ci-0nya/Local-Photo-Manager/issues)
- **作者**：席怜喵（GitHub: [Ci-0nya](https://github.com/Ci-0nya)）

---

## 致谢

PhotoMind 的构建离不开以下优秀的开源项目：

- [Electron](https://www.electronjs.org/) — 跨平台桌面应用框架
- [React](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/) — 前端与类型系统
- [Vite](https://vite.dev/) / [electron-vite](https://electron-vite.org/) — 构建工具链
- [React Flow](https://reactflow.dev/)（`@xyflow/react`）— 联想画布
- [Zustand](https://zustand-demo.pmnd.rs/) — 状态管理
- [Tailwind CSS](https://tailwindcss.com/) — 样式
- [sharp](https://sharp.pixelplumbing.com/) — 图像处理
- [exifr](https://github.com/MikeKovarik/exifr) — EXIF 解析
- [electron-builder](https://www.electron.build/) — 打包分发
- [node:sqlite](https://nodejs.org/api/sqlite.html) — 内置 SQLite

感谢所有贡献者与用户的反馈与支持。