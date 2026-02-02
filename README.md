# 拾光集 (TimeCollate)

拾光集是一个基于 Web 的“时光书”制作平台，支持极致的编辑体验、精美的视觉排版以及云端化的数据存储。

## 🌟 项目愿景

打造一个极简、优雅的记忆留存工具。用户可以像翻阅实体书一样在 Web 端编辑自己的故事，并最终导出为高质量的 PDF 或离线源码。

## 🛠 技术栈

*   **前端框架**: React 19 (Vite)
*   **样式方案**: Tailwind CSS v4 (使用 `@tailwindcss/vite` 插件)
*   **状态管理**: Zustand
*   **交互增强**: `@dnd-kit` (章节拖拽排序), Lucide Icons (图标系统)
*   **工程规范**: 严格遵循生产级架构设计，采用 `Service` 模式隔离存储逻辑。

## 📁 项目结构

```text
TimeCollate/
├── .agent/             # AI 智能体指令与技能
├── desc/               # 项目文档与路线图
├── design-system/      # 自动生成的 UI 设计规范
└── time-collate/       # 前端工程源代码
    ├── src/
    │   ├── components/ # 通用 UI 组件
    │   ├── services/   # 数据交互服务层
    │   ├── store/      # Zustand 全局状态管理
    │   └── types.ts    # 核心领域模型定义
    └── ...
```

## 🚀 当前进度：阶段一 (Phase 1) 已完工

- [x] **核心架构搭建**：定义了 `Book`, `Chapter`, `Photo` 等领域模型。
- [x] **数据层抽象**：实现了 `IBookService` 接口与 `LocalBookService` (LocalStorage)，为未来迁移 MySQL 预留空间。
- [x] **编辑器基础**：
    - 章节侧边栏管理（新建、删除）。
    - 章节**拖拽排序**实现。
    - 内容表单输入与**本地图片预览**上传。
- [x] **视觉重构 (Luxury Polish)**：
    - 采用 **Luxury/Premium（极简奢华）** 设计风格。
    - 引入“流态玻璃”背景模糊效果与雅致金配色。
    - 全面集成 Lucide 图标系统。

## 🔧 开发与运行

1. 进入工程目录：
   ```bash
   cd time-collate
   ```
2. 安装依赖：
   ```bash
   npm install
   ```
3. 启动开发服务器：
   ```bash
   npm run dev
   ```
4. 构建生产版本：
   ```bash
   npm run build
   ```

---

## 📅 下一步计划：阶段二 (Phase 2)

- 实现“所见即所得”的书籍渲染引擎。
- 开发基于 A4/B5 物理尺寸的动态布局系统。
- 引入多种排版主题模式。
