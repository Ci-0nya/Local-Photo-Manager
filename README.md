# PhotoMind

一个**完全离线**的本地桌面照片管理应用，集「照片库 + 分类管理 + 照片查看器 + 思维导图式联想画布」于一体。

> 核心原则：**不修改、不移动、不删除用户原图**。软件只记录原图路径，缩略图单独缓存，所有数据本地保存。

## ✨ 功能特性

### 相册首页

- 以**方形相册卡片**网格展示，卡片包含 2×2 封面拼贴、名称、照片数量、分类色标。
- 导入的照片自动进入「未分类」相册；每个自定义分类也是一个相册卡片（一张照片可属于多个分类）。
- 右下角可切换网格密度：**每行 4 / 6 / 8 个**（默认 6，选择会被记住）。

### 照片管理

- **导入文件夹**：递归扫描 `jpg / jpeg / png / webp / gif / bmp`，按路径去重。
- **新建分类**：首页右下角「+」按钮，输入名称并选择颜色。
- **相册管理**：右键分类相册卡片可「重命名相册 / 删除相册」（删除仅移除分类，不删照片）。

### 照片查看器

- 大图四周留白显示、滚轮缩放、拖拽平移、双击复位。
- 上一张 / 下一张（按钮 + 键盘 ← →）、显示文件名与序号。
- 给当前照片多选分类；**分类后自动无缝切换到下一张**，保持连续浏览。

### 联想画布

- 无限画布，从左侧照片库把照片拖入画布生成图片节点。
- 节点可移动 / 缩放 / 删除；节点间连线、连线标签、删除连线。
- 自动保存，重启后节点、连线、标签、位置全部恢复。

### 性能

- 缩略图缓存（sharp 生成）、图片懒加载、缩略图虚拟列表。

## 🧰 技术栈

| 领域   | 技术                                      |
| ---- | --------------------------------------- |
| 桌面框架 | Electron                                |
| 前端   | React 19 + TypeScript                   |
| 构建   | Vite（electron-vite）                     |
| 数据库  | SQLite（Node 内置 `node:sqlite`，无需 C++ 编译） |
| 画布   | React Flow（`@xyflow/react`）             |
| 状态管理 | Zustand                                 |
| 样式   | Tailwind CSS                            |
| 图像处理 | sharp（缩略图）                              |
| 虚拟列表 | `@tanstack/react-virtual`               |
| 打包   | electron-builder                        |

## 📁 目录结构

```
PhotoMind/
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── index.ts          # 入口、窗口、数据目录
│   │   ├── db.ts             # SQLite 建表与自动迁移
│   │   ├── scanner.ts        # 递归扫描图片
│   │   ├── thumbnail.ts      # 缩略图生成
│   │   ├── protocol.ts       # photomind:// 自定义协议
│   │   ├── ipc.ts            # IPC 处理
│   │   └── *Repo.ts          # 各领域仓储（photo/category/folder/album/map/settings/library）
│   ├── preload/              # contextBridge 暴露 window.api
│   ├── shared/               # 共享类型与 IPC 定义
│   └── renderer/             # React 前端
│       └── src/
│           ├── pages/        # LibraryPage / AlbumDetailPage / CanvasPage
│           ├── components/   # AlbumCard / Viewer / CategoryDialog / GridSizeToggle
│           └── store/        # Zustand store
├── electron.vite.config.ts
├── electron-builder.yml      # 打包配置
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── .npmrc                    # 国内镜像（Electron 下载加速）
└── package.json
```

## 🚀 快速开始

### 环境要求

- Windows 10/11（64 位）
- Node.js ≥ 22.12（推荐，本项目的 `node:sqlite` 需要 Node 22.5+）
- npm

### 安装与运行

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev
```

> 首次安装若 Electron 二进制下载缓慢或失败，项目已内置 `.npmrc` 走国内镜像；也可手动设置：
> `npm config set electron_mirror https://npmmirror.com/mirrors/electron/`

## 📦 打包

```bash
# 打包 Windows 安装版 exe（含免安装版）
npm run build:win
```

产物输出到 `dist/` 目录：

- `PhotoMind Setup 0.1.0.exe` — NSIS 安装版
- `win-unpacked/` — 免安装便携版（内含 `PhotoMind.exe`）

## 🖱️ 使用说明

1. **导入照片**：首页点「导入文件夹」选择目录，照片自动进入「未分类」相册。
2. **新建分类**：首页右下角点「+」，输入名称并选择颜色。
3. **给照片分类**：进入相册 → 点照片打开查看器 → 点右上「分类」勾选 / 取消；分类后自动切到下一张。
4. **管理分类相册**：右键分类相册卡片，可「重命名相册」或「删除相册」。
5. **联想画布**：顶部切到「联想画布」，从左侧拖照片进画布；从节点右侧圆点拖线到另一节点左侧圆点建立连线；点连线中间标签编辑文字。

## 💾 数据存储

所有数据统一存储在**程序所在目录下的** **`data/`** **子目录**（不写入系统 C 盘 AppData）：

```
data/
├── photomind.db     # SQLite 数据库（照片、分类、画布等）
├── thumbnails/      # 缩略图缓存
├── session/         # Electron/Chromium 缓存
├── logs/            # 日志
└── tmp/             # 临时文件
```

数据库表：`photos`、`categories`、`photo_categories`、`folders`、`map_nodes`、`map_edges`、`maps`、`settings`。

## ❓ 常见问题

**Q1：启动时被 Windows SmartScreen 拦截？**
点「更多信息 → 仍要运行」。原因是未购买代码签名证书，属正常现象，本应用无联网上传行为。

**Q2：安装 Electron 时下载失败 / 很慢？**
项目已配置国内镜像。若仍失败，手动执行：
`npm config set electron_mirror https://npmmirror.com/mirrors/electron/`

**Q3：照片显示空白或缩略图打不开？**
可能原图被移动 / 删除或格式损坏。重新导入（或点「补录文件夹」）即可；软件不会修改原图。

**Q4：重装或换电脑后数据还在吗？**
数据保存在 `data/photomind.db`，备份该目录即可迁移。

**Q5：导入大量照片卡顿？**
已内置缩略图缓存与虚拟列表；首次导入需生成缩略图，稍候即可。

## ✅ 验收测试

1. 导入含子文件夹的多格式照片目录 → 首页出现「未分类」相册卡片。
2. 点相册 → 点照片进查看器：滚轮缩放、拖拽平移、双击复位、← → 切换。
3. 查看器内「分类」加入分类 → 自动切下一张；返回首页可见该分类相册。
4. 右键分类相册可重命名 / 删除；右下角「+」可新建分类。
5. 画布拖照片、连线、加标签，重启后恢复。
6. 全程不修改、不删除本地原图。

## 📄 License

本项目暂未声明开源许可证。
