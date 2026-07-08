# TimeCollate 渐变色功能设计规范

本文档详述了在 TimeCollate 自由画布与编辑器中引入双节点线性渐变色支持的设计规范与适配方案。

## 1. 架构与设计原理

我们采用 **双节点线性渐变（起点色 + 终点色 + 角度）** 作为核心方案。该方案使用标准 CSS 线性渐变字符串作为存储介质，具备零解析成本和多端高兼容性的优点。

### 数据存储格式
所有渐变色在数据库和文档 Store（如 `background.color`, `style.color`, `shapeConfig.fillColor`）中均以符合 CSS 标准的字符串形式存储：
```typescript
"linear-gradient(135deg, #FF7E5F 0%, #FEB47B 100%)"
```

## 2. 设计与接口详情

### 2.1 工具函数设计 (`utils/colorUtils.ts`)
我们引入以下无副作用的工具函数以方便渐变色解析：

*   **`isGradientColor(color: string): boolean`**
    检测颜色字符串是否以 `linear-gradient` 开头。
*   **`parseGradient(colorStr: string): { angle: number; from: string; to: string }`**
    利用正则表达式，安全、容错地提取其中的角度及起点/终点色。
    *   *退避逻辑*：如果传入格式不符，自动降级为默认角度 `180`，以及默认的渐变色 `from: '#667EEA'`, `to: '#764BA2'`。
*   **`serializeGradient(angle: number; from: string; to: string): string`**
    根据提供的属性重新拼装成标准的 CSS `linear-gradient` 字符串。

### 2.2 ColorPicker UI 改造方案 (`ColorPicker.tsx`)
*   **双模式切换 Tabs**：在面板顶部增加“纯色”和“渐变”切换。
*   **渐变交互状态**：
    *   记录当前活跃的渐变控制点 (`from` 还是 `to`)。
    *   左侧展示 `起点色` 和 `终点色` 的两个小圆圈指示器，带有高光状态。点击起点圆圈，HSV 调色盘与 Hex 输入框控制起点色；点击终点圆圈同理。
*   **角度控制器**：增加一条 `0° - 360°` 的角度调节滑块或圆盘，绑定渐变角度属性。
*   **渐变预设 (Presets)**：内置 10 组精美的高级莫兰迪/微渐变色，用户可一键套用：
    *   雅致紫 (`linear-gradient(135deg, #667EEA 0%, #764BA2 100%)`)
    *   暖阳橘 (`linear-gradient(135deg, #FF7E5F 0%, #FEB47B 100%)`)
    *   薄荷绿 (`linear-gradient(135deg, #84FAB0 0%, #8FD3F4 100%)`)
    *   等

---

## 3. 渲染端适配改动 (Rendering Adaptations)

### 3.1 页面背景与容器 (`CanvasContainer.tsx` / `FreeCanvasPage.tsx` / `BookRenderer.tsx`)
*   **当前逻辑**：只将 `backgroundColor` 绑定为页面背景。
*   **适配方案**：当检测到背景色为渐变时，使用 React `style` 的 `background` 或 `backgroundImage` 进行应用。
    ```typescript
    const bgStyle: React.CSSProperties = {
        background: background?.color || '#FFFFFF',
        ...
    };
    ```

### 3.2 几何形状 (`CanvasShapeElement.tsx`)
*   **矩形和圆形 (Rect / Circle)**：在 React Style 中将 `backgroundColor: fillColor` 替换为 `background: fillColor`。
*   **三角形 (Triangle - SVG)**：
    *   如果 `fillColor` 包含 `linear-gradient`，提取 `from` 和 `to` 色值。
    *   动态在 SVG 内渲染 `<defs>` 和 `<linearGradient>` 标签，其 `x1/y1/x2/y2` 对应渲染角度。
    *   设置 `<polygon fill="url(#grad-{elementId})" />`。

### 3.3 文本颜色 (`CanvasTextElement.tsx`)
*   **只读/呈现状态**：如果文本颜色是渐变色，应用 CSS：
    ```css
    background: linear-gradient(...);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-block;
    ```
*   **编辑状态 (ContentEditable)**：双击编辑文本时，强制将颜色恢复为常规纯深色（如 `#1f2937`），确保光标选择和编辑过程没有浏览器视觉 Bug。编辑完成失去焦点 (Blur) 时，重新渲染为渐变色。

---

## 4. 物理 PDF 导出与服务端渲染兼容性 (`BookCoverRenderer.ts`)
*   `BookCoverRenderer` canvas 已具备通过 `extractColorsFromGradient` 粗暴提取第一和最后一色进行渐变渲染的降级机制。该设计模型与现有机制完美契合，无需重构底层物理 Canvas 渲染流。

---

## 5. 验证与测试计划

### 自动化测试 / 单元测试
*   编写 `colorUtils.test.ts` 单元测试，覆盖 `parseGradient` 在标准格式、缺省角度、格式异常等多种边缘输入下的表现，确保 Fallback 机制 100% 运行正常。

### 手动验证
*   在编辑器中，为页面背景设置渐变色，检查画布及顶栏圆形预览框是否支持渐变。
*   对文本插入渐变色，验证输入时退回纯色，失去焦点后呈现完美渐变。
*   对矩形、圆形、三角形应用渐变，缩放元素时确认 SVG 三角形渐变不产生偏移与缺失。
