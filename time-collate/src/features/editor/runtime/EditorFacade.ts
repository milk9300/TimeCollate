// #region Description
/**
 * @description 编辑器运行时统一门面 (EditorFacade)
 * 封装内部微服务细节，提供干净、低成本 of API 给 React UI 层使用
 */
// #endregion

import type { Command, CommandObserver, Resource, RuntimeElement, EditorState } from './types';
import { commandService } from './services/CommandService';
import { historyObserver } from './services/HistoryObserver';
import { resourceService } from './services/ResourceService';
import { renderPipeline } from './services/RenderPipeline';
import { RenderContext } from './services/RenderContext';
import { viewportService } from './services/ViewportService';
import type { Point, DOMRectLike } from './services/ViewportService';
import { clipboardService } from './services/ClipboardService';
import { editorStateService } from './services/EditorStateService';
import { toolManager } from './services/ToolManager';
import type { EditorTool } from './services/ToolManager';

export interface EditorPlugin {
    id: string;
    init(facade: EditorFacade): void;
    dispose(): void;
}

export class EditorFacade {
    private static instance: EditorFacade;
    private plugins = new Map<string, EditorPlugin>();

    private constructor() {}

    /**
     * 获取 EditorFacade 全局单例
     */
    public static getInstance(): EditorFacade {
        if (!EditorFacade.instance) {
            EditorFacade.instance = new EditorFacade();
        }
        return EditorFacade.instance;
    }

    /**
     * 派发并执行原子修改命令
     * @param command 要执行的命令
     */
    public async execute(command: Command): Promise<void> {
        if (!command) {
            throw new Error('EditorFacade.execute: Command cannot be null');
        }
        await commandService.execute(command);
    }

    /**
     * 执行撤销
     */
    public async undo(): Promise<void> {
        await historyObserver.undo();
    }

    /**
     * 执行重做
     */
    public async redo(): Promise<void> {
        await historyObserver.redo();
    }

    /**
     * 注册运行时扩展插件 (Plugin Boundary)
     * @param plugin 实现了 EditorPlugin 接口的外部插件
     */
    public registerPlugin(plugin: EditorPlugin): void {
        // Fail-Fast
        if (!plugin || !plugin.id) {
            throw new Error('EditorFacade.registerPlugin: Invalid plugin input');
        }
        if (this.plugins.has(plugin.id)) {
            console.warn(`EditorFacade: Plugin with ID "${plugin.id}" already registered.`);
            return;
        }

        try {
            plugin.init(this);
            this.plugins.set(plugin.id, plugin);
            console.log(`EditorFacade: Registered plugin "${plugin.id}" successfully.`);
        } catch (err) {
            console.error(`EditorFacade: Failed to initialize plugin "${plugin.id}":`, err);
            throw err;
        }
    }

    /**
     * 卸载运行时扩展插件
     * @param pluginId 插件 ID
     */
    public unregisterPlugin(pluginId: string): void {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            try {
                plugin.dispose();
            } catch (err) {
                console.error(`EditorFacade: Error during plugin "${pluginId}" disposal:`, err);
            }
            this.plugins.delete(pluginId);
            console.log(`EditorFacade: Unregistered plugin "${pluginId}".`);
        }
    }

    /**
     * 根据 ID 检索资源实例
     */
    public async getResource(id: string): Promise<Resource | null> {
        return resourceService.findById(id);
    }

    /**
     * 获取指定分类下的资源列表 (本地 + 云端)
     */
    public async listResources(kind: 'font' | 'image' | 'sticker' | 'background'): Promise<Resource[]> {
        return resourceService.list(kind);
    }

    /**
     * 触发异步下载/载入资源
     */
    public async loadResource(id: string): Promise<void> {
        await resourceService.load(id);
    }

    /**
     * 占用引用资源
     */
    public acquireResource(id: string): void {
        resourceService.acquire(id);
    }

    /**
     * 释放引用资源 (防抖)
     */
    public releaseResource(id: string, delayMs?: number): void {
        resourceService.release(id, delayMs);
    }

    /**
     * 占用指定元素列表持有的所有资源引用
     */
    public acquireRenderResources(elements: RuntimeElement[]): void {
        renderPipeline.acquireResources(elements);
    }

    /**
     * 在页面或画布绘制前，解析和绑定所有元素中持有的外部资源
     */
    public async resolveRenderResources(elements: RuntimeElement[], context: RenderContext): Promise<void> {
        await renderPipeline.resolveResources(elements, context);
    }

    /**
     * 释放指定元素持有的资源引用
     */
    public releaseRenderResources(elements: RuntimeElement[]): void {
        renderPipeline.releaseResources(elements);
    }

    /**
     * 获取当前是否可以进行撤销
     */
    public get canUndo(): boolean {
        return historyObserver.canUndo();
    }

    /**
     * 获取当前是否可以进行重做
     */
    public get canRedo(): boolean {
        return historyObserver.canRedo();
    }

    // ==========================================
    // 视口系统接口 (Viewport System APIs)
    // ==========================================

    /**
     * 获取当前缩放倍率
     */
    public getZoom(): number {
        return viewportService.getZoom();
    }

    /**
     * 设置缩放倍率
     */
    public setZoom(newZoom: number): void {
        viewportService.setZoom(newZoom);
    }

    /**
     * 获取平移偏移量
     */
    public getPanOffset(): Point {
        return viewportService.getPanOffset();
    }

    /**
     * 设置平移偏移量
     */
    public setPanOffset(offset: Point): void {
        viewportService.setPanOffset(offset);
    }

    /**
     * 放大
     */
    public zoomIn(factor?: number): void {
        viewportService.zoomIn(factor);
    }

    /**
     * 缩小
     */
    public zoomOut(factor?: number): void {
        viewportService.zoomOut(factor);
    }

    /**
     * 重置视口参数
     */
    public resetViewport(): void {
        viewportService.reset();
    }

    /**
     * 物理屏幕坐标转换为逻辑坐标
     */
    public screenToLogical(screenX: number, screenY: number, canvasRect: DOMRectLike): Point {
        return viewportService.screenToLogical(screenX, screenY, canvasRect);
    }

    /**
     * 逻辑坐标转换为物理屏幕坐标
     */
    public logicalToScreen(logicalX: number, logicalY: number, canvasRect: DOMRectLike): Point {
        return viewportService.logicalToScreen(logicalX, logicalY, canvasRect);
    }

    // ==========================================
    // 剪贴板接口 (Clipboard APIs)
    // ==========================================

    /**
     * 复制元素到剪贴板
     */
    public copy(elements: any[]): void {
        clipboardService.copy(elements);
    }

    /**
     * 剪切元素
     */
    public cut(elements: any[], deleteCallback: (ids: string[]) => void): void {
        clipboardService.cut(elements, deleteCallback);
    }

    /**
     * 从剪贴板粘贴元素
     */
    public paste(offset?: number): any[] {
        return clipboardService.paste(offset);
    }

    /**
     * 克隆副本元素 (Duplicate)
     */
    public duplicate(elements: any[], offset?: number): any[] {
        return clipboardService.duplicate(elements, offset);
    }

    /**
     * 清空剪贴板
     */
    public clearClipboard(): void {
        clipboardService.clear();
    }

    // ==========================================
    // 编辑器临时状态与选区接口 (Editor State & Selection APIs)
    // ==========================================

    /**
     * 获取当前只读的编辑器状态
     */
    public getEditorState(): Readonly<EditorState> {
        return editorStateService.getState();
    }

    /**
     * 选中指定元素
     */
    public selectElements(elementIds: string[], elementTypes?: string[]): void {
        editorStateService.select(elementIds, elementTypes);
    }

    /**
     * 清空选区
     */
    public clearSelection(): void {
        editorStateService.clearSelection();
    }

    /**
     * 设置悬停元素
     */
    public setHoverElement(id: string | null): void {
        editorStateService.setHover(id);
    }

    /**
     * 设置焦点元素
     */
    public setFocusedElement(id: string | null): void {
        editorStateService.setFocused(id);
    }

    /**
     * 改变编辑器交互模式
     */
    public setEditorMode(mode: EditorState['currentMode']): void {
        editorStateService.setMode(mode);
    }

    // ==========================================
    // 统一交互工具调度接口 (Tool Management & Routing APIs)
    // ==========================================

    /**
     * 获取当前激活 of 工具 ID
     */
    public getActiveToolId(): string {
        return toolManager.getActiveToolId();
    }

    /**
     * 激活指定工具
     */
    public setActiveToolId(toolId: string): void {
        toolManager.setActiveTool(toolId);
    }

    /**
     * 注册自定义编辑工具
     */
    public registerTool(tool: EditorTool): void {
        toolManager.registerTool(tool);
    }

    /**
     * 卸载编辑工具
     */
    public unregisterTool(toolId: string): void {
        toolManager.unregisterTool(toolId);
    }

    /**
     * 路由鼠标按下事件
     */
    public dispatchMouseDown(event: MouseEvent, logicalPoint: { x: number; y: number }): void {
        toolManager.onMouseDown(event, logicalPoint);
    }

    /**
     * 路由鼠标移动事件
     */
    public dispatchMouseMove(event: MouseEvent, logicalPoint: { x: number; y: number }): void {
        toolManager.onMouseMove(event, logicalPoint);
    }

    /**
     * 路由鼠标抬起事件
     */
    public dispatchMouseUp(event: MouseEvent, logicalPoint: { x: number; y: number }): void {
        toolManager.onMouseUp(event, logicalPoint);
    }

    // ─── Transaction 事务控制 ───────────────────────────────

    /**
     * 开启事务：后续通过 execute() 执行的命令将被收集，直到 commitTransaction() 合并为一步
     */
    public beginTransaction(): void {
        historyObserver.beginTransaction();
    }

    /**
     * 提交事务：将事务期间收集的多条命令合并为一步宏操作入撤销栈
     */
    public commitTransaction(): void {
        historyObserver.commitTransaction();
    }

    /**
     * 当前是否处于事务中
     */
    public isInTransaction(): boolean {
        return historyObserver.isInTransaction();
    }

    // ─── Feature Flag 控制 ──────────────────────────────────

    /**
     * 切换 Command 双轨制撤销栈的启用状态（运行时热切换）
     */
    public setEnableCommandHistory(enabled: boolean): void {
        // 懒加载 Zustand Store 以避免循环依赖
        import('../../../store/index').then(({ useBookStore }) => {
            useBookStore.getState().setEnableCommandHistory(enabled);
        });
    }

    /**
     * 同步 Command 栈状态到 Zustand Store（供 HistoryObserver 内部调用）
     */
    public syncCommandHistoryState(): void {
        const canUndo = historyObserver.canUndo();
        const canRedo = historyObserver.canRedo();
        import('../../../store/index').then(({ useBookStore }) => {
            useBookStore.getState().setCommandHistoryState(canUndo, canRedo);
        });
    }
}

export const editorFacade = EditorFacade.getInstance();
export default editorFacade;
