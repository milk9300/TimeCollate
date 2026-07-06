// #region Description
/**
 * @description 渲染上下文 (RenderContext)
 * 封装不同的渲染目的与行为策略（例如编辑态的流畅度优先，与印刷导出的精度优先）
 */
// #endregion

export type RenderMode = 'editor' | 'preview' | 'thumbnail' | 'export';

export class RenderContext {
    public readonly mode: RenderMode;
    public readonly blockOnResourceLoading: boolean; // 资源加载期间是否阻塞渲染
    public readonly targetDpi: number;               // 目标物理分辨率 DPI

    /**
     * 私有构造函数，使用统一静态工厂方法实例化以确保入参控制
     */
    private constructor(mode: RenderMode, blockOnResourceLoading: boolean, targetDpi: number) {
        this.mode = mode;
        this.blockOnResourceLoading = blockOnResourceLoading;
        this.targetDpi = targetDpi;
    }

    /**
     * 创建编辑态渲染上下文 (流畅度优先，异步加载不阻塞，展示 Fallback)
     */
    public static createEditorContext(targetDpi = 72): RenderContext {
        return new RenderContext('editor', false, targetDpi);
    }

    /**
     * 创建预览态渲染上下文 (流畅度优先，异步加载不阻塞)
     */
    public static createPreviewContext(targetDpi = 96): RenderContext {
        return new RenderContext('preview', false, targetDpi);
    }

    /**
     * 创建缩略图渲染上下文 (极速渲染，不阻塞，极低 DPI)
     */
    public static createThumbnailContext(targetDpi = 36): RenderContext {
        return new RenderContext('thumbnail', false, targetDpi);
    }

    /**
     * 创建印前导出渲染上下文 (印刷精度优先，强同步阻塞，必须等候资源 Ready 才可以进行绘制)
     */
    public static createExportContext(targetDpi = 300): RenderContext {
        return new RenderContext('export', true, targetDpi);
    }
}
