# TimeCollate (拾光集) 后续开发任务与交接文档

本文档用作时光集（TimeCollate）项目在切换对话上下文或交接开发任务时的官方蓝图，供后续开发人员（或 AI 助手）无缝衔接当前工作。

---

## 1. 当前已完成工作归纳 (Current Status)

在当前阶段，我们已经打通了 **WYSIWYG 画布编辑器的物理边框样式、艺术滤镜与剪裁微调系统**：
*   **高保真排版渲染**：在 `EditablePhoto.tsx` 与右侧属性栏中实现了：
    *   **相框物理样式 (Frame Styles)**：`Normal` (常规)、`Rounded` (精致圆角)、`Polaroid` (带阴影与文字说明留白的拍立得拟物卡纸)、`Film` (带胶片孔与深色背景的复古胶卷风)。
    *   **CSS 艺术滤镜 (Photo Filters)**：`None` (原色)、`Warm` (温暖午后)、`Fresh` (日系清新)、`Retro` (摩登复古)。
    *   **局部微调控制条 (Micro-adjust Control Panel)**：支持在底部托盘调节插槽内图片的 `Scale` (缩放)、`Offset X` 与 `Offset Y` (平移剪裁)。
*   **本地测试沙盒 (Sandbox Authentication & E2E Bypass)**：
    *   实现了 `addMockPhotoToPage` 动作，支持在 Playwright 等 Headless 测试环境中，拦截物理文件上传并一键注入 Unsplash 高清风景演示图，破解了无头浏览器无法操作原生文件弹窗的痛点。
    *   当环境变量 `VITE_STORAGE_MODE=local` 时，自动进入绕过登录/注册机制，使用前端模拟数据直接登录 `admin` 权限角色。
*   **打包与编译校验**：
    *   运行 `npm run build` 打包无错通过，代码完全符合 TypeScript 严苛的静态类型检查要求。

---

## 2. 接下来的核心模块开发任务 (Next Milestones)

后续的核心开发目标是完成 **模版与主题可视化设计器、模板市场发布系统以及用户收藏订阅机制**。以下为具体排期与实现步骤：

### 阶段 1：模版/主题权限与订阅数据库落地 (MySQL Migration)
*   **任务描述**：扩展表字段并引入多对多订阅表，支撑“私人专属”、“系统预设”、“市场分享”三级权限体系。
*   **开发步骤**：
    1.  **扩展字段**：
        *   对 `book_templates` 和 `book_themes` 表分别添加：
            *   `visibility`: `ENUM('private', 'public')`，默认 `private`。
            *   `creator_id`: `VARCHAR(36)`，系统预置模版填 `'system'`，个人设计则填写当前用户的 UUID。
    2.  **创建收藏关系表**：
        *   新建 `user_collected_templates` 表：主键 `(user_id, template_id)`。
        *   新建 `user_collected_themes` 表：主键 `(user_id, theme_id)`。
        *   设置对应的外键关联约束（`ON DELETE CASCADE`），确保用户注销或模板删除时数据链条完整。

### 阶段 2：后端零信任订阅/收藏 API 开发 (Express + Zod)
*   **任务描述**：为前端提供高安全性、防水平越权的订阅与库加载服务。
*   **开发步骤**：
    1.  **公共市场浏览**：
        *   提供 `GET /api/market/templates` 和 `GET /api/market/themes`。
        *   SQL 过滤条件：`visibility = 'public' AND creator_id != 'system' AND creator_id != :current_user_id`（仅拉取他人公开发布的内容）。
    2.  **收藏与取消收藏 (Fail-Fast 防御)**：
        *   提供 `POST /api/market/templates/:id/collect` 和 `DELETE /api/market/templates/:id/collect`。
        *   **安全防线**：在 `POST` 接口中，必须强制校验目标模版的 `visibility` 是否确实为 `public`，防止攻击者通过拼接 UUID 强行收藏他人的 `private` 模版。
    3.  **用户个人可用库加载**：
        *   提供 `GET /api/my/templates` 和 `GET /api/my/themes`。
        *   SQL 查询合并：**系统内置模版 (creator_id = 'system')** + **自己创作的模版 (creator_id = :user_id)** + **从市场收藏的他人的模版 (联合 user_collected_templates 表)**。
        *   前端编辑器拉取该接口用于装填左侧“排版/模板”抽屉。

### 3. 前端模板市场与订阅组件 (React 19 + Zustand)
*   **任务描述**：提供精美的市场浏览页面，允许用户一键收藏至个人库。
*   **开发步骤**：
    1.  **市场组件 UI**：
        *   新建模板/主题市场页面，采用响应式网格布局，展示模版的卡片式缩略图、作者信息、组件插槽数量。
        *   提供“收藏到库”与“取消收藏”的动态悬浮按钮。
    2.  **Zustand Store 同步**：
        *   扩展 `useBookStore` 或新增 `useMarketStore`，保存市场列表与加载状态。
        *   当用户在市场点击收藏后，瞬时将该模版加入到本地 store 缓存，并在用户切回编辑器时，使得左侧“可用模板列表”实时更新，实现极佳的交互回馈。

### 阶段 4：管理端可视化排版设计器 (Admin Visual Builder)
*   **任务描述**：允许管理员在前端画布通过“所见即所得”拖拽摆放插槽，自动计算百分比宽高并导出 `layoutSchema` JSON 发布至市场。
*   **开发步骤**：
    1.  **设计器独立入口**：
        *   在 React 中新建 `/admin/builder` 路由，仅允许带 `role = 'admin'` 的用户进入（通过 React Router `AdminGuard` 守卫校验）。
    2.  **可视化拖拽画布**：
        *   固定画布比例约束为 210mm x 297mm (标准 A4 纵横比)，确保分辨率适配。
        *   右侧属性面板提供“新增图片插槽”、“新增文字框”按钮。
        *   利用 `interactjs` 或 `@hello-pangea/dnd` 提供位置拖拽、四周 Resize 缩放手柄。
        *   **物理百分比换算**：任何尺寸改变时，监听器自动获取 DOM 的 `left, top, width, height` 的物理 px 像素值，除以当前画布容器的对应物理尺寸，计算出 **百分比定位参数** (例如：`width: "35%", top: "20%"` 等)。
    3.  **Schema 一键发布**：
        *   配置各插槽参数（如图片 slotIndex 映射，文本 role 类别及 fontSize/lineHeight 属性）。
        *   点击“保存并公开发布”按钮，生成 `layoutSchema` JSON 对象，调用 `POST /api/admin/templates` 写入数据库，设置其 `visibility = 'public'`。

---

## 3. 后期架构优化与防御性设计瓶颈 (Limit Scaling Plan)

当项目从测试环境走向 10x 并发与 10x 数据量的生产环境时，必须推进以下防御性重构：

### 3.1 PDF 高能耗异步导出任务队列化 (Redis + BullMQ)
*   **现状问题**：当前的 PDF 导出会在主进程直接创建无头浏览器进行截图，并发 3 个以上会导致低配服务器发生 OOM 内存溢出。
*   **重构方案**：
    1.  引入 Redis 服务端。
    2.  后端 Express 引入 `bullmq`。将 PDF 导出改造为 `Producer/Consumer` 架构。
    3.  Express 接收请求后仅生成 `jobId` 塞入 Redis 队列并立即返回 HTTP 202；
    4.  由独立的并发 Worker 在后台依次拉起 Playwright 浏览器生成 PDF，并保存到 Cloudflare R2 / 阿里云 OSS。
    5.  前端设计 `ExportProgressModal` 浮窗进行任务状态轮询，并在成功后下载临时预签名链接。

### 3.2 图像原图与缩略图隔离 + 元数据提取
*   **现状问题**：用户直接上传手机原图（可能大于 10MB），未处理直接显示导致前端极其卡顿。
*   **重构方案**：
    1.  后端上传拦截器中利用 `sharp` 库自动剥离图片内置的 EXIF 敏感数据（保护地理隐私）；
    2.  利用 `sharp` 自动读取图片的原始 `width` 与 `height` 元数据，写入 `photos` 表，为前端**智能排版比例自适应**提供数据基础；
    3.  同时上传一份 `w_300` 缩略图（命名为 `${key}_thumb`）至存储服务器。编辑器预览一律读取缩略图，大图印刷一律拉取原图，降低 80% 带宽负荷。

---

### 💡 接班 AI / 开发者备忘：
1.  **测试运行方式**：若需开启本地沙盒直接预览编辑器组件，在根目录下配置 `.env` 写入 `VITE_STORAGE_MODE=local`，然后运行 `npm run dev` 即可在本地端口极速打开。
2.  **安全规则**：修改 `server/` 代码时，切记遵守零信任机制（Zero-Trust），所有更新/删除/查询行为必须在 SQL 的 `WHERE` 子句中强制绑定当前会话用户 `req.user.id`。
3.  **设计图与逻辑文档**：可在 [desc/](file:///e:/AI%20Projects/Antigravity%20Project/TimeCollate/desc/) 目录下找到表结构设计 (`USER_SYSTEM_DESIGN.md`)、模板市场架构规范 (`MARKETPLACE_AND_VISUAL_BUILDER_DESIGN.md`) 以及自定义贴纸同步设计稿 (`CUSTOM_STICKER_SYSTEM_DESIGN.md`)。
