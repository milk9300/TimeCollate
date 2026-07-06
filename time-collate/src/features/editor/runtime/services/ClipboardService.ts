// #region Description
/**
 * @description 运行时复制粘贴服务 (ClipboardService)
 * 维护内存级复制缓冲区，提供元素深拷贝、UUID 重新派发以及粘贴位置叠加偏移保护
 */
// #endregion

export class ClipboardService {
    private static instance: ClipboardService;
    private clipboardBuffer: string | null = null; // 采用 JSON 字符串缓存，彻底切断内存对象引用关联

    private constructor() {}

    /**
     * 获取 ClipboardService 全局单例
     */
    public static getInstance(): ClipboardService {
        if (!ClipboardService.instance) {
            ClipboardService.instance = new ClipboardService();
        }
        return ClipboardService.instance;
    }

    /**
     * 复制选中的元素到内存
     * @param elements 画布元素实体列表
     */
    public copy(elements: any[]): void {
        if (!elements || elements.length === 0) return;
        // 彻底序列化，隔绝内存引用
        this.clipboardBuffer = JSON.stringify(elements);
    }

    /**
     * 剪切元素
     * @param elements 画布元素
     * @param deleteCallback 外部执行物理删除的回调
     */
    public cut(elements: any[], deleteCallback: (ids: string[]) => void): void {
        if (!elements || elements.length === 0) return;
        this.copy(elements);
        const ids = elements.map(el => el.id);
        deleteCallback(ids);
    }

    /**
     * 从内存粘贴已复制的元素，并应用位置偏移防重叠保护
     * @param offset 粘贴重叠偏移量，默认右下偏移 20 像素
     */
    public paste(offset = 20): any[] {
        if (!this.clipboardBuffer) return [];

        try {
            const rawElements = JSON.parse(this.clipboardBuffer) as any[];
            return rawElements.map(el => {
                const cloned = { ...el };
                
                // 1. 为克隆体生成全新的独立 UUID
                cloned.id = `copied-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                // 2. 偏移逻辑位置，防止与原位置完全重合覆盖
                if (cloned.style && cloned.style.transform) {
                    cloned.style.transform = {
                        ...cloned.style.transform,
                        x: cloned.style.transform.x + offset,
                        y: cloned.style.transform.y + offset
                    };
                } else if (cloned.x !== undefined && cloned.y !== undefined) {
                    // 兼容旧版扁平坐标结构
                    cloned.x = cloned.x + offset;
                    cloned.y = cloned.y + offset;
                }

                return cloned;
            });
        } catch (err) {
            console.error('ClipboardService.paste: Failed to parse clipboard JSON buffer:', err);
            return [];
        }
    }

    /**
     * 原地克隆/副本元素 (Duplicate)
     */
    public duplicate(elements: any[], offset = 20): any[] {
        if (!elements || elements.length === 0) return [];
        
        // 临时备份当前剪贴板，执行原地克隆，再复原剪贴板 (防止污染用户原本的 Copy 缓冲区)
        const temp = this.clipboardBuffer;
        this.copy(elements);
        const duplicated = this.paste(offset);
        this.clipboardBuffer = temp;
        
        return duplicated;
    }

    /**
     * 清空剪贴板
     */
    public clear(): void {
        this.clipboardBuffer = null;
    }
}

export const clipboardService = ClipboardService.getInstance();
