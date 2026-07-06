// #region Description
/**
 * @description 视口变换管理服务 (ViewportService)
 * 独立管理画布的缩放 (Zoom) 与平移 (Pan) 矩阵状态，并提供高精度屏幕/逻辑坐标映射转换
 */
// #endregion

import { eventBus } from '../eventBus';

export interface Point {
    x: number;
    y: number;
}

export interface DOMRectLike {
    left: number;
    top: number;
    width: number;
    height: number;
}

export class ViewportService {
    private static instance: ViewportService;

    private zoom = 1.0;
    private panOffset: Point = { x: 0, y: 0 };

    // 缩放极限边界控制
    private maxZoom = 4.0;
    private minZoom = 0.25;

    private constructor() {}

    /**
     * 获取 ViewportService 全局单例
     */
    public static getInstance(): ViewportService {
        if (!ViewportService.instance) {
            ViewportService.instance = new ViewportService();
        }
        return ViewportService.instance;
    }

    /**
     * 获取当前缩放倍率
     */
    public getZoom(): number {
        return this.zoom;
    }

    /**
     * 设置缩放倍率，带极限约束
     */
    public setZoom(newZoom: number): void {
        const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        if (this.zoom !== clampedZoom) {
            this.zoom = clampedZoom;
            this.notifyChange();
        }
    }

    /**
     * 获取当前的平移偏移量
     */
    public getPanOffset(): Point {
        return { ...this.panOffset };
    }

    /**
     * 设置当前的平移偏移量
     */
    public setPanOffset(offset: Point): void {
        if (this.panOffset.x !== offset.x || this.panOffset.y !== offset.y) {
            this.panOffset = { ...offset };
            this.notifyChange();
        }
    }

    /**
     * 放大 (步长默认 1.2 倍)
     */
    public zoomIn(factor = 1.2): void {
        this.setZoom(this.zoom * factor);
    }

    /**
     * 缩小 (步长默认 1.2 分之一)
     */
    public zoomOut(factor = 1.2): void {
        this.setZoom(this.zoom / factor);
    }

    /**
     * 重置视口
     */
    public reset(): void {
        this.zoom = 1.0;
        this.panOffset = { x: 0, y: 0 };
        this.notifyChange();
    }

    /**
     * 将屏幕/视口物理坐标转换为 Document 内部逻辑坐标
     * @param screenX 物理屏幕 X 坐标 (如 MouseEvent.clientX)
     * @param screenY 物理屏幕 Y 坐标 (如 MouseEvent.clientY)
     * @param canvasRect 画布容器的 getBoundingClientRect 矩形
     */
    public screenToLogical(screenX: number, screenY: number, canvasRect: DOMRectLike): Point {
        // Fail-Fast
        if (!canvasRect) {
            throw new Error('ViewportService.screenToLogical: canvasRect is required');
        }

        // 1. 转为画布局部物理坐标
        const localX = screenX - canvasRect.left;
        const localY = screenY - canvasRect.top;

        // 2. 应用平移与缩放的逆矩阵运算，还原为无畸变逻辑坐标
        const logicalX = (localX - this.panOffset.x) / this.zoom;
        const logicalY = (localY - this.panOffset.y) / this.zoom;

        return {
            x: Math.round(logicalX),
            y: Math.round(logicalY)
        };
    }

    /**
     * 将 Document 内部逻辑坐标映射为视口物理局部坐标
     * @param logicalX 元素逻辑坐标 X
     * @param logicalY 元素逻辑坐标 Y
     * @param canvasRect 画布容器的 getBoundingClientRect 矩形
     */
    public logicalToScreen(logicalX: number, logicalY: number, canvasRect: DOMRectLike): Point {
        if (!canvasRect) {
            throw new Error('ViewportService.logicalToScreen: canvasRect is required');
        }

        // 1. 应用缩放与平移的正向矩阵运算
        const localX = logicalX * this.zoom + this.panOffset.x;
        const localY = logicalY * this.zoom + this.panOffset.y;

        // 2. 转为物理屏幕全局坐标
        return {
            x: Math.round(localX + canvasRect.left),
            y: Math.round(localY + canvasRect.top)
        };
    }

    /**
     * 通知外部视口矩阵参数改变 (用于解耦 React 强绘)
     */
    private notifyChange(): void {
        eventBus.emit('viewport:change', {
            zoom: this.zoom,
            panOffset: { ...this.panOffset }
        });
    }
}

export const viewportService = ViewportService.getInstance();
