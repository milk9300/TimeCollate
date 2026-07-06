// #region Description
/**
 * @description 选区与编辑器临时状态管理服务 (EditorStateService)
 * 统一管理选区、悬停、焦点、当前编辑模式和激活的工具，并通过 EventBus 广播状态改变
 */
// #endregion

import { eventBus } from '../eventBus';
import type { Selection, EditorState } from '../types';

export class EditorStateService {
    private static instance: EditorStateService;

    private state: EditorState = {
        selection: { elementIds: [], type: 'none' },
        hoveredElementId: null,
        focusedElementId: null,
        currentMode: 'select',
        activeTool: 'pointer'
    };

    private constructor() {}

    /**
     * 获取 EditorStateService 全局单例
     */
    public static getInstance(): EditorStateService {
        if (!EditorStateService.instance) {
            EditorStateService.instance = new EditorStateService();
        }
        return EditorStateService.instance;
    }

    /**
     * 获取当前状态对象的只读拷贝
     */
    public getState(): Readonly<EditorState> {
        return {
            ...this.state,
            selection: {
                ...this.state.selection,
                elementIds: [...this.state.selection.elementIds]
            }
        };
    }

    /**
     * 设置当前选区
     * @param elementIds 选中的元素 ID 列表
     * @param elementTypes 对应的元素类型列表，用于计算 Selection 聚合类型
     */
    public select(elementIds: string[], elementTypes?: string[]): void {
        // Fail-Fast: 输入防错校验
        if (!elementIds) {
            throw new Error('EditorStateService.select: elementIds cannot be null or undefined');
        }

        let type: Selection['type'] = 'none';

        if (elementIds.length === 1) {
            const firstType = elementTypes?.[0];
            if (firstType === 'text' || firstType === 'photo-frame' || firstType === 'sticker') {
                type = firstType;
            } else {
                type = 'multiple'; // 未提供类型或不符合标准类型时降级为 multiple
            }
        } else if (elementIds.length > 1) {
            type = 'multiple';
        }

        const currentSelection = this.state.selection;
        const isSameLength = currentSelection.elementIds.length === elementIds.length;
        const isSameContent = isSameLength && elementIds.every((id, index) => id === currentSelection.elementIds[index]);
        const isSameType = currentSelection.type === type;

        // 仅当状态发生实质性改变时触发更新和广播
        if (!isSameContent || !isSameType) {
            this.state.selection = {
                elementIds: [...elementIds],
                type
            };
            this.notifySelectionChange();
        }
    }

    /**
     * 清空当前选区
     */
    public clearSelection(): void {
        const currentSelection = this.state.selection;
        if (currentSelection.elementIds.length > 0 || currentSelection.type !== 'none') {
            this.state.selection = {
                elementIds: [],
                type: 'none'
            };
            this.notifySelectionChange();
        }
    }

    /**
     * 设置当前悬停的元素 ID
     * @param id 元素 ID
     */
    public setHover(id: string | null): void {
        if (this.state.hoveredElementId !== id) {
            this.state.hoveredElementId = id;
            this.notifyStateChange('hoveredElementId');
        }
    }

    /**
     * 设置当前焦点的元素 ID
     * @param id 元素 ID
     */
    public setFocused(id: string | null): void {
        if (this.state.focusedElementId !== id) {
            this.state.focusedElementId = id;
            this.notifyStateChange('focusedElementId');
        }
    }

    /**
     * 变更当前编辑器操作模式
     * @param mode 操作模式
     */
    public setMode(mode: EditorState['currentMode']): void {
        // Fail-Fast
        if (!mode) {
            throw new Error('EditorStateService.setMode: Mode cannot be empty');
        }
        if (this.state.currentMode !== mode) {
            this.state.currentMode = mode;
            this.notifyStateChange('currentMode');
        }
    }

    /**
     * 变更当前激活的编辑工具
     * @param tool 工具名称
     */
    public setActiveTool(tool: EditorState['activeTool']): void {
        // Fail-Fast
        if (!tool) {
            throw new Error('EditorStateService.setActiveTool: Tool cannot be empty');
        }
        if (this.state.activeTool !== tool) {
            this.state.activeTool = tool;
            this.notifyStateChange('activeTool');
        }
    }

    /**
     * 派发选区更新事件
     */
    private notifySelectionChange(): void {
        const currentState = this.getState();
        eventBus.emit('selection:change', currentState);
        eventBus.emit('state:change', { key: 'selection', state: currentState });
    }

    /**
     * 派发状态属性更新事件
     */
    private notifyStateChange(key: keyof EditorState): void {
        const currentState = this.getState();
        eventBus.emit('state:change', { key, state: currentState });
    }
}

export const editorStateService = EditorStateService.getInstance();
