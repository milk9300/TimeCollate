// #region Description
/**
 * @description 历史状态撤销栈观察者 (HistoryObserver)
 * 作为 CommandObserver 的具体实现，负责捕获命令执行与回滚事件，维护 Undo/Redo 栈
 * 支持 Transaction 机制：将 begin~commit 之间的多条命令合并为一步宏命令
 */
// #endregion

import type { Command, CommandObserver } from '../types';
import { commandService } from './CommandService';
import { eventBus } from '../eventBus';
import { useBookStore } from '../../../../store/index';

/**
 * 宏合并命令：将 Transaction 期间收集的多条原子命令合并为一步可撤销/重做的操作
 */
class MacroCommand implements Command {
    public readonly id: string;
    public readonly commands: Command[];
    constructor(commands: Command[]) {
        this.id = `macro-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        this.commands = commands;
    }

    public async execute(): Promise<void> {
        for (const cmd of this.commands) {
            await cmd.execute();
        }
    }

    public async undo(): Promise<void> {
        for (let i = this.commands.length - 1; i >= 0; i--) {
            await this.commands[i].undo();
        }
    }
}

export class HistoryObserver implements CommandObserver {
    private static instance: HistoryObserver;
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];
    private maxStackSize = 50;
    private isPerformingUndoRedo = false;

    // Transaction 事务状态
    private transactionBuffer: Command[] | null = null;

    private constructor() {
        commandService.registerObserver(this);
    }

    /**
     * 获取 HistoryObserver 全局单例
     */
    public static getInstance(): HistoryObserver {
        if (!HistoryObserver.instance) {
            HistoryObserver.instance = new HistoryObserver();
        }
        return HistoryObserver.instance;
    }

    /**
     * 当前是否可执行撤销
     */
    public canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /**
     * 当前是否可执行重做
     */
    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /**
     * 当前是否处于事务中
     */
    public isInTransaction(): boolean {
        return this.transactionBuffer !== null;
    }

    /**
     * 开启事务：后续的命令将被收集而非立即入栈
     */
    public beginTransaction(): void {
        if (this.transactionBuffer !== null) {
            console.warn('HistoryObserver.beginTransaction: Already in a transaction. Ignoring.');
            return;
        }
        this.transactionBuffer = [];
    }

    /**
     * 提交事务：将收集的多条命令合并为一步宏命令，压入撤销栈
     */
    public commitTransaction(): void {
        if (this.transactionBuffer === null) {
            console.warn('HistoryObserver.commitTransaction: Not in a transaction. Ignoring.');
            return;
        }

        const commands = this.transactionBuffer;
        this.transactionBuffer = null;

        if (commands.length === 0) return;

        // 将收集到的子命令合并为一个宏命令
        const macro = commands.length === 1 ? commands[0] : new MacroCommand(commands);
        this.undoStack.push(macro);
        this.redoStack = [];

        // 约束深度，防爆内存
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }

        this.notifyStateChange();
    }

    /**
     * 撤销最上层命令
     */
    public async undo(): Promise<void> {
        if (this.isPerformingUndoRedo) return;
        if (!this.canUndo()) {
            console.warn('HistoryObserver.undo: Undo stack is empty');
            return;
        }

        this.isPerformingUndoRedo = true;
        try {
            const command = this.undoStack.pop();
            if (command) {
                await commandService.undo(command);
                this.redoStack.push(command);
            }
        } finally {
            this.isPerformingUndoRedo = false;
            this.notifyStateChange();
        }
    }

    /**
     * 重做最上层被撤销的命令
     */
    public async redo(): Promise<void> {
        if (this.isPerformingUndoRedo) return;
        if (!this.canRedo()) {
            console.warn('HistoryObserver.redo: Redo stack is empty');
            return;
        }

        this.isPerformingUndoRedo = true;
        try {
            const command = this.redoStack.pop();
            if (command) {
                await commandService.execute(command);
                this.undoStack.push(command);
            }
        } finally {
            this.isPerformingUndoRedo = false;
            this.notifyStateChange();
        }
    }

    /**
     * 当有命令执行完毕时的回调
     */
    public onCommandExecuted(command: Command): void {
        if (this.isPerformingUndoRedo) {
            this.notifyStateChange();
            return;
        }

        // 如果正处于事务中，收集命令但不入栈
        if (this.transactionBuffer !== null) {
            this.transactionBuffer.push(command);
            return;
        }

        // 新的用户主动交互：压入撤销栈，并清空重做栈
        this.undoStack.push(command);
        this.redoStack = [];

        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }

        this.notifyStateChange();
    }

    /**
     * 当有命令撤销完毕时的回调
     */
    public onCommandUndone(command: Command): void {
        if (this.isPerformingUndoRedo) {
            this.notifyStateChange();
            return;
        }

        const index = this.undoStack.indexOf(command);
        if (index !== -1) {
            this.undoStack.splice(index, 1);
            this.redoStack.push(command);
        }

        this.notifyStateChange();
    }

    /**
     * 清空历史栈
     */
    public clear(): void {
        this.undoStack = [];
        this.redoStack = [];
        this.transactionBuffer = null;
        this.notifyStateChange();
    }

    /**
     * 发出事件通知 UI 更新状态
     */
    private notifyStateChange(): void {
        eventBus.emit('history:state-change', {
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            undoStackLength: this.undoStack.length,
            redoStackLength: this.redoStack.length
        });

        // 直接同步状态到 Zustand Store，打通运行时与 React 视图的状态链路
        useBookStore.getState().setCommandHistoryState(this.canUndo(), this.canRedo());
    }
}

export const historyObserver = HistoryObserver.getInstance();
