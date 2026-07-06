// #region Description
/**
 * @description 渲染解析管线控制服务 (RenderPipeline)
 * 协调 Canvas 元素样式与资源引用 (ResourceReference) 的生命周期装配，处理阻塞/非阻塞流控
 */
// #endregion

import { ResourceState, type RuntimeElement } from '../types';
import { resourceService } from './ResourceService';
import { type RenderContext } from './RenderContext';

export class RenderPipeline {
    private static instance: RenderPipeline;

    private constructor() {}

    /**
     * 获取 RenderPipeline 全局单例
     */
    public static getInstance(): RenderPipeline {
        if (!RenderPipeline.instance) {
            RenderPipeline.instance = new RenderPipeline();
        }
        return RenderPipeline.instance;
    }

    /**
     * 当文档载入、或向画布新增元素时，批量占用资源引用
     * @param elements 运行时 Canvas 元素列表
     */
    public acquireResources(elements: RuntimeElement[]): void {
        if (!elements || elements.length === 0) return;

        for (const element of elements) {
            // 占用排版字体资源
            const fontRef = element.style.typography?.font;
            if (fontRef && fontRef.resourceId) {
                resourceService.acquire(fontRef.resourceId);
            }

            // 占用填充图案资源
            const fillRef = element.style.fill?.resource;
            if (fillRef && fillRef.resourceId) {
                resourceService.acquire(fillRef.resourceId);
            }
        }
    }

    /**
     * 在页面/画布绘制前，解析元素中持有的所有资源引用，并依据渲染模式控制加载阻塞
     * @param elements 运行时 Canvas 元素列表
     * @param context 渲染目的上下文
     */
    public async resolveResources(elements: RuntimeElement[], context: RenderContext): Promise<void> {
        if (!elements || elements.length === 0) return;

        const loadPromises: Promise<void>[] = [];

        for (const element of elements) {
            // 1. 扫描文本排版中的字体资源引用
            const fontRef = element.style.typography?.font;
            if (fontRef && fontRef.resourceId) {
                const fontId = fontRef.resourceId;

                // 提取资源状态
                const res = await resourceService.findById(fontId);
                if (res && res.state !== ResourceState.Ready) {
                    // 发起底层的异步加载
                    const loadPromise = resourceService.load(fontId);
                    
                    // 如果渲染目的声明了“硬性阻塞加载”（如印刷 PDF 导出），则加入等候队列
                    if (context.blockOnResourceLoading) {
                        loadPromises.push(loadPromise);
                    }
                }
            }

            // 2. 扫描填充样式中的纹理/图片引用 (未来扩展)
            const fillRef = element.style.fill?.resource;
            if (fillRef && fillRef.resourceId) {
                const resId = fillRef.resourceId;
                const res = await resourceService.findById(resId);
                if (res && res.state !== ResourceState.Ready) {
                    const loadPromise = resourceService.load(resId);
                    if (context.blockOnResourceLoading) {
                        loadPromises.push(loadPromise);
                    }
                }
            }
        }

        // 如果存在需要强等候就绪的资源，在此处进行 Promise 阻塞
        if (loadPromises.length > 0) {
            try {
                await Promise.all(loadPromises);
            } catch (err) {
                console.error('RenderPipeline.resolveResources: Error waiting for critical resources to load:', err);
                throw err; // 向上传递，确保印前导出等模态能够Fail-Fast捕获异常
            }
        }
    }

    /**
     * 当页面卸载、或者元素被删除/替换样式时，批量释放资源引用 (防抖)
     * @param elements 运行时 Canvas 元素列表
     */
    public releaseResources(elements: RuntimeElement[]): void {
        if (!elements || elements.length === 0) return;

        for (const element of elements) {
            // 释放排版字体资源
            const fontRef = element.style.typography?.font;
            if (fontRef && fontRef.resourceId) {
                resourceService.release(fontRef.resourceId);
            }

            // 释放填充图案资源
            const fillRef = element.style.fill?.resource;
            if (fillRef && fillRef.resourceId) {
                resourceService.release(fillRef.resourceId);
            }
        }
    }
}

export const renderPipeline = RenderPipeline.getInstance();
