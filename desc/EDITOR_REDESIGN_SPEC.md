# TimeCollate (拾光集) 极致所见即所得编辑器重构设计规范

为了实现用户提出的“高保真拟物画册式编辑器”（如图所示），我们需要对现有的编辑器进行全面架构升级。本设计文件旨在分析目标 UI 的核心交互特征、梳理所需的数据模型与前后端改动，并提供落地路线图。

---

## 1. 拟物化编辑器核心交互特征分析

与我们现有的“左侧抽屉式面板”相比，目标 UI 采用了**三栏式精细化排版布局**，具备以下核心亮点：

1. **三栏式标准视口布局 (Three-Column Layout)**
   * **左侧：页面缩略图导航**：双页对开（Spread）缩略图展示，配有页码、标题、菜单与星标，支持“+ 添加页面”。
   * **中间：主工作区 Canvas**：
     * **拟物化对开书页 (Skeuomorphic Book Spread)**：中央具备明显的书籍装订折痕阴影（Spine Crease）和仿真书页边缘叠纸阴影（Layered Page Shadows）。
     * **底部：媒体素材拖拽栏**：横向滚动的已上传图片池，首张图显示“使用计数徽标 (Badge)”，支持从底部直接拖拽入书页插槽。
   * **右侧：属性检查器面板 (Inspector Panel)**：分“页面”与“背景”两大页签。包含当前选中元素的上下文控制（图片滤镜、图片样式/白边边框、文本字体字号颜色对齐、页面布局模板、装饰元素贴纸池）。

2. **画布直观微调与浮动工具条 (Floating Context Menu)**
   * **文本编辑**：选中文字时，就地弹出浮动微调条（加粗、列表、对齐、删除）。
   * **图片编辑**：点击图片唤起悬浮面板（替换图片、裁剪平移、删除）。
   * **贴纸/装饰元素装饰**：可直接在页面中放置诸如胶带（Tape）、叶片（Leaf）、贝壳、邮票等点缀性矢量/PNG贴纸。

---

## 2. 架构设计与技术调整方案

### 2.1 数据模型扩展 (JSON Schema & Database)

得益于此前重构的 **JSON Schema 驱动的动态排版引擎**，我们无须频繁改动关系型数据库的表字段，所有丰富的交互控制均可以通过扩展 `page.layoutSchema`（页面布局规范）和 `page.content`（用户填充内容）实现。

#### 1. 扩展图片槽样式属性
在 `LayoutElement` 的 `style` 或 `content` 中扩展滤镜和边框样式参数：
```typescript
interface PhotoElementStyle {
    // 滤镜效果
    filter?: 'none' | 'warm' | 'fresh' | 'retro'; 
    // 边框预设：直角 (none)、圆角 (rounded)、白边 (polaroid/border)、胶片 (film)
    borderStyle?: 'rect' | 'rounded' | 'polaroid' | 'film';
    // 已有的裁剪平移偏移量
    scale?: number;
    xOffset?: number;
    yOffset?: number;
}
```

#### 2. 新增装饰贴纸元素 (Stickers)
在页面的 `layoutSchema.elements` 中增加 `sticker` 类型的节点：
```typescript
interface StickerElement {
    id: string;
    type: 'sticker';
    stickerId: string;       // 贴纸素材库 ID
    imageUrl: string;        // 贴纸的静态资源 URL / SVG 路径
    style: {
        left: string;        // 百分比位置 (e.g. "45%")
        top: string;         // 百分比位置 (e.g. "72%")
        width: string;       // 宽度比例 (e.g. "12%")
        height: string;      // 高度比例 (e.g. "12%")
        transform?: string;  // 旋转角度 (e.g. "rotate(15deg)")
        zIndex: number;      // 确保渲染在图片/文字的图层上方
    };
}
```

---

#### 3. 页面多文本槽与样式独立编辑设计 (Multi-Text Slots & Style Overrides)
目前系统的 `pages.content` 仅支持存储单一字符串，这意味着如果排版模板中包含多个文本槽（例如：标题、副标题、独白正文），所有文本槽都会显示相同的内容，或者相互覆盖。

为了解决这个问题并支持右侧面板中对文字字体、字号、颜色和对齐方式的单独微调，我们对 `pages.content` 列的存储结构进行升级。我们利用 JSON 格式存储该页面中所有文本槽的“内容与自定义样式重写”：

```typescript
// pages.content 的 JSON 序列化定义
interface PageContentPayload {
    elements?: {
        [elementId: string]: {
            text: string;               // 用户输入的文本内容
            style?: {
                fontFamily?: string;     // 覆盖模板默认字体 (e.g., "霞鹜文楷")
                fontSize?: string;       // 覆盖模板默认字号 (e.g., "24px")
                color?: string;          // 覆盖模板默认颜色 (e.g., "#5c4033")
                textAlign?: 'left' | 'center' | 'right' | 'justify'; // 对齐方式
            }
        }
    };
    // 兼容老数据：如果 content 不是 JSON 对象而是普通 String，则作为默认的正文文本渲染
    legacyText?: string; 
}
```

* **解析逻辑（前端）**：
  In `DynamicLayoutRenderer.tsx` 中渲染 `type === 'text'` 元素时：
  1. 尝试使用 `JSON.parse(page.content)` 解析。
  2. 若解析成功，根据当前元素的 `element.id` 提取 `text` 内容。如果取不到，退而根据其 `role` 取值。如果依旧没有，则返回模板默认值（或空白占位符）。
  3. 若解析失败（旧版本书籍），则直接将整个 `page.content` 字符串渲染到 `role === 'page-content'` 的主要正文槽中，其他辅助文本槽显示占位符或空。
  4. 样式渲染时，将模板的静态样式与 `page.content` 中用户自定义的 `style` 属性进行 `Object.assign` 合并，作为 inline style 赋给 `<EditableText />`。

* **保存逻辑（前端）**：
  In `<EditableText />` 组件触发 `onBlur` 提交更新时，检查当前 `page.content`：
  1. 如果是 JSON，解析并更新 `elements[elementId].text = newValue`，再 `JSON.stringify` 保存。
  2. 如果不是 JSON（老数据），则初始化为 `{ elements: { [elementId]: { text: newValue } } }` 的 JSON 格式保存，实现无缝平滑升级。

---

### 2.2 前端编辑器页面布局重组 (`Editor.tsx`)

我们需要将现有的单栏偏左设计彻底重构为 Flex 或 CSS Grid 比例容器：

```
+----------------------------------------------------------------------------------+
|                              TopBar (标题、状态、撤销重做、预览/编辑模式、导出)    |
+---------------------+-------------------------------------+----------------------+
|                     |                                     |                      |
|                     |            ZoomableCanvas           |      RightPanel      |
|   LeftSidebar       |  +-------------------------------+  |  +----------------+  |
|  +---------------+  |  |   Left Page   |  Right Page   |  |  |   页面 | 背景  |  |
|  |  缩略图列表    |  |  |               |  (拟物化折痕) |  |  |                |  |
|  |  (双页对开)    |  |  +-------------------------------+  |  |  - 页面布局    |  |
|  |               |  |                                     |  |  - 选中元素属性|  |
|  |  + 添加页面    |  |                                     |  |  - 滤镜与边框  |  |
|  |               |  +-------------------------------------+  |  - 贴纸/素材池 |  |
|  |               |  |  BottomTray (照片拖动/上传横条)      |  |  +----------------+  |
|  +---------------+  +-------------------------------------+----------------------+
```

1. **左侧缩略图导航**：提取现有的 `currentBook.chapters` 与页码数据，以双页 spreads 为单位映射出缩略卡片，通过画布的 `activePageId` 联动高亮状态。
2. **拟物化 Canvas 装扮**：
   在 `ZoomableCanvas` 渲染器周围包裹高质感的拟物外壳：
   * **Spine Line**: 在左右页拼接处增加渐变的内阴影阴影层。
   * **Shadows**: 给予 `.book-spread` 强大的 `box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)`，并增加多层叠纸边缘质感。
3. **右侧 Inspector 检查器**：
   * 采用 React Tabs 拆分“页面配置”与“背景配置”。
   * 挂载全局监听器：当用户点击画布上的任意 Photo 或 Text 时，在 Store 中标记当前活动的 `selectedElementId`。
   * 右侧面板自动读取 `selectedElementId` 对应的属性进行响应式绑定。例如：选中文字块时，右侧字体、字号、颜色组件变为激活编辑状态。

---

### 2.3 核心交互与拖拽 (Drag & Drop)

* **底部素材栏拖拽**：
  * 使用 HTML5 Native Drag and Drop API 或 `@hello-pangea/dnd` / `@dnd-kit`。
  * 底部照片设为 `draggable`，拖拽传输数据为照片 URL/ID。
  * 画布上的 `<EditablePhoto />` 槽绑定 `onDragOver`（触发视觉高亮）及 `onDrop`（执行底层 `uploadPhotoToPage` 或 `bindPhotoToSlot`）。
* **贴纸的拖动与摆放**：
  * 用户双击右侧“装饰元素”或将其拖拽入画布，动态向当前 Page 元素的 `layoutSchema.elements` 数组追加一个 `sticker` 节点。
  * 用户可在画布上直接拖拽贴纸进行 x, y 定位微调。

---

## 3. 重构路线与工期预估

为了在开发期间保障现有系统的稳定性，推荐采用**三步走渐进重构战略**：

| 阶段 | 核心任务 | 开发预估 | 风险控制点 |
| :--- | :--- | :--- | :--- |
| **Phase 1: 骨架重组** | 重构 Editor.tsx 页面框架为三栏式；重写左侧双页导航卡片与底部照片素材 Tray。 | 1.0 周 | 确保原有的 `ZoomableCanvas` 缩放平移交互在新的 Grid 栅格下表现依然流畅，不发生抖动或偏移。 |
| **Phase 2: 拟物化与检查器** | 精雕 Canvas 拟物书页阴影与页码渲染；开发右侧 Inspector 属性检查器联动（字体/样式/布局模板快捷更换）。 | 1.0 周 | 文字双击内联编辑与右侧面板输入绑定的状态防抖（避免频繁触发后台保存）。 |
| **Phase 3: 素材贴纸与拖拽** | 实现滤镜与边框（CSS 级别）；引入装饰贴纸 Schema 节点，支持拖拽贴纸定位及底部照片拖拽填充。 | 1.0 周 | HTML5 拖拽事件在缩放画布中的缩放比例换算，确保 Drop 坐标的准确性。 |

---

## 4. 架构权衡 (Pros & Cons)

* **方案优点**：
  * **颜值惊艳**：拟物化仿真书页让回忆手册极具实体印刷的品质感，极大提升产品调性。
  * **操作闭环**：摆脱了抽屉拉来拉去的割裂感，实现完整的“选中-调整-实时回显”闭环。
  * **动态模板复用**：已有的动态 Schema 解析引擎不需要做破坏性表结构重构，纯粹是前端渲染层表现力的扩充。
* **开发难点**：
  * **坐标换算**：在缩放比例（Scale 0.5 ~ 2.0）不等的 Canvas 上拖拽放置贴纸时，需要扣除 Scale 带来的坐标偏移，确保百分比定位精准。
  * **性能瓶颈**：随着单页中贴纸、大图和滤镜的叠加，Canvas 重新渲染的节点变多。需要配合 React 缓存优化（`React.memo`）防止文字输入出现卡顿。
