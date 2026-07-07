# 🎨 TimeCollate 核心价值区（Why Us）组件重构实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 WhyUs 模块彻底重构为具备 PC 端 Hover 多媒体秀场联动（含 CSS 3D/2D 拟物动画兜底）与移动端原生硬解码视频/轻量拟物卡片无缝降级的全新交互板块。

**架构：**
- 修改 `WhyUs.tsx`，将内部结构重构为左右布局（PC端）和垂直堆叠卡片（移动端）。
- 在 `WhyUs.tsx` 中新增 `ValueShowcasePanel` 组件，实现视频资源错误捕获与三种拟物 CSS 动画微场景（Canvas, 3D Page-Flip, Hardcover Delivery）的完美切换。
- 复用 TimeCollate 已有的莫兰迪黑金与暖调奶油色配色方案。

**技术栈：** React 19, Tailwind CSS v4, Lucide React, CSS 3D Transforms

---

### 任务 1：备份并清理旧的 WhyUs.tsx
**文件：**
- 修改：`time-collate/src/features/portal/components/WhyUs.tsx`
- 备份：`time-collate/src/features/portal/components/WhyUs.bak.tsx`

- [ ] **步骤 1.1：备份现有 WhyUs.tsx 文件**
  运行：将 `WhyUs.tsx` 文件复制一份命名为 `WhyUs.bak.tsx` 作为物理备份。
  
- [ ] **步骤 1.2：运行编译验证备份未破坏系统**
  运行：`npm run build` 确保项目无报错。
  
- [ ] **步骤 1.3：Commit 备份文件**
  ```bash
  git add src/features/portal/components/WhyUs.bak.tsx
  git commit -m "chore: 备份原始 WhyUs 组件"
  ```

---

### 任务 2：实现 ValueShowcasePanel 兜底渲染逻辑
**文件：**
- 修改：`time-collate/src/features/portal/components/WhyUs.tsx`

- [ ] **步骤 2.1：在 WhyUs.tsx 中实现 ValueShowcasePanel 子组件**
  在 `WhyUs.tsx` 顶部或底部，创建 `ValueShowcasePanel` 独立组件。编写 `<video>` 播放逻辑，并编写 `onError`, `onLoadedData` 事件钩子，以及 `videoError` 与 `isVideoPlaying` 状态变量，使之能够在视频加载失败时自动渲染 CSS 拟物微舞台占位。
  
- [ ] **步骤 2.2：编写 3 个微舞台（自由画布、仿生3D翻页、高定开箱）的结构与内置 CSS Keyframes 动效**
  使用 `<style>` 标签在组件内注入如下 3D 动画关键帧：`photo-drag-in`、`float-controls`、`page-flip`、`shadow-pulse`、`book-slide-out`、`gold-shine` 等。
  使用 `switch (activeTab)` 条件分支渲染拟物卡片结构。

- [ ] **步骤 2.3：运行编译验证组件无语法错误**
  运行：`npx tsc -noEmit` 或 `npm run build`。

---

### 任务 3：重构 WhyUs 主组件以支持多端分流与交互
**文件：**
- 修改：`time-collate/src/features/portal/components/WhyUs.tsx`

- [ ] **步骤 3.1：重构 WhyUs 导出组件**
  - 定义 `values` 数组，包含三大核心优势的标题、副标题、长文案段落和图标，映射媒体文件 URL `/videos/features-canvas.mp4` 等。
  - 使用 `useDevice` 钩子判断 `isMobile` 状态。
  - 对于 `isMobile === true`，渲染单列纵向排列卡片布局，每一个卡片底部嵌入原生 `<video>`（附带 `muted playsInline autoPlay loop` 属性），并在其失败时自动应用 `ValueShowcasePanel` 微场景，不使用 Hover 联动。
  - 对于 PC 端，渲染左右对称网格，左侧放置 `ValueShowcasePanel`（绑定 `activeTab`），右侧放置纵向悬停列表，悬停项绑定 `onMouseEnter` 激活 `setActiveTab` 并通过 `max-h` 动画展开对应项的正文段落。

- [ ] **步骤 3.2：应用莫兰迪暖色调系统配色**
  使用 `#FDFBF7` 替换主底色，`#FAF7EE` 替换辅底色，`#C5A059` 替换金黄色强调，`text-[#2C3539]` 替换主标色，`text-[#56534C]` 替换正文暖木灰。

- [ ] **步骤 3.3：进行编译与静态 Lint 校验**
  运行：`npm run lint` 和 `npm run build`。
  
- [ ] **步骤 3.4：Commit 重构修改**
  ```bash
  git add src/features/portal/components/WhyUs.tsx
  git commit -m "feat: 重构核心价值区 WhyUs，实现高定拟物大秀场与多端分流降级"
  ```

---

### 任务 4：删除备份并完成最终回归
**文件：**
- 删除：`time-collate/src/features/portal/components/WhyUs.bak.tsx`

- [ ] **步骤 4.1：确认开发服务器运行及效果**
  启动开发服务器，在浏览器中查看 `WhyUs` 新板块的 PC 悬停展开和视频缺失兜底 3D 动画，并在手机模拟器中验证移动端自适应堆叠效果。

- [ ] **步骤 4.2：物理删除备份文件 `WhyUs.bak.tsx`**
  运行：在文件管理器或终端删除备份。

- [ ] **步骤 4.3：最终编译回归测试**
  运行：`npm run build`，确认打包无错，生成 dist 包。
  
- [ ] **步骤 4.4：最终 Commit 归档**
  ```bash
  git rm src/features/portal/components/WhyUs.bak.tsx
  git commit -m "chore: 清理备份文件，WhyUs 模块重构上线"
  ```
