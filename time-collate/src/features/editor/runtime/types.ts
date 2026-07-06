// #region Description
/**
 * @description Editor Runtime v1 核心类型与契约定义
 * 包含通用资源模型、引用模型、样式结构体系、编辑器临时状态、以及命令模式接口
 */
// #endregion

// #region 1. 资源系统类型 (Resource System Types)

/**
 * 资源生命周期的五个核心状态
 */
export const ResourceState = {
    Idle: 'idle',         // 资源已注册或初始化，未触发下载
    Loading: 'loading',   // 网络请求或物理文件解析中
    Ready: 'ready',       // 资源在浏览器环境中就绪（如字体已载入，图片已加载）
    Failed: 'failed',     // 加载失败，包含异常捕获
    Released: 'released'  // 引用计数清零，物理资源已卸载
} as const;

export type ResourceState = typeof ResourceState[keyof typeof ResourceState];

/**
 * 统一资源模型接口
 */
export interface Resource<T = any> {
    id: string;                                          // 资源唯一标识
    kind: 'font' | 'image' | 'sticker' | 'background' | 'mask'; // 资源大类分类
    name: string;                                        // 展示名称
    thumbnailUrl?: string;                               // 缩略图 URL
    url?: string;                                        // 物理文件网络 URL 或本地静态资源路径
    state: ResourceState;                                // 状态机当前状态
    refCount: number;                                    // 引用计数器，控制自动释放
    error?: string;                                      // 错误信息描述
    metadata?: T;                                        // 特异性配置元数据
}

/**
 * 零依赖文档层面的资源引用模型
 */
export interface ResourceReference {
    resourceId: string; // 指向具体资源 Resource.id
}
// #endregion

// #region 2. 元素样式体系 (Element Style Types)

/**
 * 文本排版样式属性
 */
export interface TypographyStyle {
    font: ResourceReference; // 字体资源引用
    fontSize: number;        // 逻辑分辨率坐标尺寸 (例如 14, 28)
    fontWeight: 'normal' | 'bold';
    lineHeight: number;      // 行高倍数，如 1.5, 1.8
    letterSpacing: string;   // 字间距，如 '0px', '2px'
    textAlign: 'left' | 'center' | 'right' | 'justify';
}

/**
 * 填充/背景样式属性
 */
export interface FillStyle {
    type: 'solid' | 'gradient' | 'image';
    color?: string;                  // solid hex color 或 gradient 配方
    resource?: ResourceReference;    // 图片或纹理资源的引用
}

/**
 * 描边与边框样式属性 (未来扩展)
 */
export interface StrokeStyle {
    color: string;
    width: number;
    type: 'solid' | 'dashed';
}

/**
 * 阴影效果样式属性 (未来扩展)
 */
export interface ShadowStyle {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
}

/**
 * 逻辑物理变换属性
 */
export interface TransformStyle {
    x: number;
    y: number;
    width: number;
    height: number;
    rotate: number; // 旋转弧度或角度，以运行时统一规范为准
}

/**
 * 画布元素统一样式模型
 */
export interface ElementStyle {
    transform: TransformStyle;
    opacity: number;
    typography?: TypographyStyle;
    fill?: FillStyle;
    stroke?: StrokeStyle;
    shadow?: ShadowStyle;
}
// #endregion

// #region 3. 画布文档节点模型 (Document Element Models)

/**
 * 纯数据画布节点定义，不携带任何实例化对象，用于彻底分离持久化与运行时
 */
export interface RuntimeElement {
    id: string;
    type: 'text' | 'photo-frame' | 'sticker';
    style: ElementStyle;
    content?: string; // 针对文本的字符串正文，或贴纸/图片的专属属性
}

/**
 * 文档本身
 */
export interface DocumentModel {
    id: string;
    pages: {
        id: string;
        elements: RuntimeElement[];
    }[];
}
// #endregion

// #region 4. 编辑器临时状态与选区 (Editor State & Selection)

export interface Selection {
    elementIds: string[]; // 当前被选中的 Canvas 元素 ID 数组
    type: 'none' | 'text' | 'photo-frame' | 'sticker' | 'multiple';
}

export interface EditorState {
    selection: Selection;
    hoveredElementId: string | null;
    focusedElementId: string | null;
    currentMode: 'select' | 'drag' | 'crop' | 'readonly';
    activeTool: 'pointer' | 'text-box' | 'sticker-placer' | 'pan';
}
// #endregion

// #region 5. 命令模式接口 (Command Pattern Types)

/**
 * 原子指令操作命令契约
 */
export interface Command {
    id: string;
    execute(): Promise<void>;
    undo(): Promise<void>;
}

/**
 * 命令拦截与观察者契约，用于解耦撤销/重做、宏录制与多人协同
 */
export interface CommandObserver {
    onCommandExecuted(command: Command): void;
    onCommandUndone(command: Command): void;
}
// #endregion
