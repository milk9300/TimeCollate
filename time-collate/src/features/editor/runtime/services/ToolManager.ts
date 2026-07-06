// #region Description
/**
 * @description 工具事件代理与调度中心 (ToolManager)
 * 定义工具契约接口，注册并管理各类编辑工具，负责将画布的鼠标事件统一路由分发到当前激活的工具
 */
// #endregion

import { eventBus } from '../eventBus';
import { editorStateService } from './EditorStateService';

export interface EditorTool {
    id: string;
    onMouseDown?(event: MouseEvent, logicalPoint: { x: number; y: number }): void;
    onMouseMove?(event: MouseEvent, logicalPoint: { x: number; y: number }): void;
    onMouseUp?(event: MouseEvent, logicalPoint: { x: number; y: number }): void;
    onActivate?(): void;
    onDeactivate?(): void;
}

export class ToolManager {
    private static instance: ToolManager;

    private tools = new Map<string, EditorTool>();
    private activeToolId = 'pointer';

    private constructor() {
        // 默认注册指针和抓手工具
        this.registerTool({ id: 'pointer' });
        this.registerTool({ id: 'pan' });
    }

    /**
     * 获取 ToolManager 全局单例
     */
    public static getInstance(): ToolManager {
        if (!ToolManager.instance) {
            ToolManager.instance = new ToolManager();
        }
        return ToolManager.instance;
    }

    /**
     * 获取当前激活的工具 ID
     */
    public getActiveToolId(): string {
        return this.activeToolId;
    }

    /**
     * 注册新的编辑器工具
     * @param tool 实现了 EditorTool 契约的工具实例
     */
    public registerTool(tool: EditorTool): void {
        // Fail-Fast: 校验输入
        if (!tool || !tool.id) {
            throw new Error('ToolManager.registerTool: Tool must have a valid ID');
        }
        if (this.tools.has(tool.id)) {
            console.warn(`ToolManager: Tool with ID "${tool.id}" is already registered. Overwriting.`);
        }
        this.tools.set(tool.id, tool);
    }

    /**
     * 卸载工具
     * @param toolId 工具 ID
     */
    public unregisterTool(toolId: string): void {
        if (this.activeToolId === toolId) {
            this.setActiveTool('pointer');
        }
        this.tools.delete(toolId);
    }

    /**
     * 切换当前激活的工具
     * @param toolId 要激活的工具 ID
     */
    public setActiveTool(toolId: string): void {
        // Fail-Fast: 工具未注册校验
        if (!this.tools.has(toolId)) {
            throw new Error(`ToolManager.setActiveTool: Tool with ID "${toolId}" is not registered`);
        }

        if (this.activeToolId !== toolId) {
            const oldTool = this.tools.get(this.activeToolId);
            const newTool = this.tools.get(toolId);

            if (oldTool?.onDeactivate) {
                try {
                    oldTool.onDeactivate();
                } catch (err) {
                    console.error(`ToolManager: Error deactivating tool "${this.activeToolId}":`, err);
                }
            }

            const prevToolId = this.activeToolId;
            this.activeToolId = toolId;

            if (newTool?.onActivate) {
                try {
                    newTool.onActivate();
                } catch (err) {
                    console.error(`ToolManager: Error activating tool "${toolId}":`, err);
                }
            }

            // 同步至编辑器状态管理服务
            const builtInTools = ['pointer', 'text-box', 'sticker-placer', 'pan'];
            if (builtInTools.includes(toolId)) {
                editorStateService.setActiveTool(toolId as any);
            }

            // 派发工具变更解耦事件
            eventBus.emit('tool:change', {
                activeToolId: toolId,
                prevToolId
            });
        }
    }

    /**
     * 路由分发鼠标按下事件
     * @param event 鼠标原生事件
     * @param logicalPoint 对应的 Document 逻辑坐标
     */
    public onMouseDown(event: MouseEvent, logicalPoint: { x: number; y: number }): void {
        const tool = this.tools.get(this.activeToolId);
        if (tool && tool.onMouseDown) {
            try {
                tool.onMouseDown(event, logicalPoint);
            } catch (err) {
                console.error(`ToolManager: Error executing onMouseDown for tool "${this.activeToolId}":`, err);
            }
        }
    }

    /**
     * 路由分发鼠标移动事件
     * @param event 鼠标原生事件
     * @param logicalPoint 对应的 Document 逻辑坐标
     */
    public onMouseMove(event: MouseEvent, logicalPoint: { x: number; y: number }): void {
        const tool = this.tools.get(this.activeToolId);
        if (tool && tool.onMouseMove) {
            try {
                tool.onMouseMove(event, logicalPoint);
            } catch (err) {
                console.error(`ToolManager: Error executing onMouseMove for tool "${this.activeToolId}":`, err);
            }
        }
    }

    /**
     * 路由分发鼠标抬起事件
     * @param event 鼠标原生事件
     * @param logicalPoint 对应的 Document 逻辑坐标
     */
    public onMouseUp(event: MouseEvent, logicalPoint: { x: number; y: number }): void {
        const tool = this.tools.get(this.activeToolId);
        if (tool && tool.onMouseUp) {
            try {
                tool.onMouseUp(event, logicalPoint);
            } catch (err) {
                console.error(`ToolManager: Error executing onMouseUp for tool "${this.activeToolId}":`, err);
            }
        }
    }
}

export const toolManager = ToolManager.getInstance();
