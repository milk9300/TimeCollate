// #region Description
/**
 * @description 命令调度服务 (CommandService)
 * 负责统一分发和执行所有原子命令，并通过观察者队列完成 History、协作、AI 等事件广播的解耦
 */
// #endregion

import type { Command, CommandObserver } from '../types';

export class CommandService {
    private static instance: CommandService;
    private observers = new Set<CommandObserver>();

    private constructor() {}

    /**
     * 获取 CommandService 全局单例
     */
    public static getInstance(): CommandService {
        if (!CommandService.instance) {
            CommandService.instance = new CommandService();
        }
        return CommandService.instance;
    }

    /**
     * 注册命令观察者
     */
    public registerObserver(observer: CommandObserver): void {
        if (!observer) {
            throw new Error('CommandService.registerObserver: Observer cannot be empty');
        }
        this.observers.add(observer);
    }

    /**
     * 卸载命令观察者
     */
    public unregisterObserver(observer: CommandObserver): void {
        if (!observer) return;
        this.observers.delete(observer);
    }

    /**
     * 执行命令并通知所有观察者
     * @param command 实现了 Command 接口的指令对象
     */
    public async execute(command: Command): Promise<void> {
        // Fail-Fast 验证
        if (!command) {
            throw new Error('CommandService.execute: Command cannot be empty');
        }

        try {
            // 真正执行原子操作逻辑
            await command.execute();

            // 派发事件通知所有的观察者（例如 HistoryObserver 收到后自动入栈）
            this.observers.forEach(observer => {
                try {
                    observer.onCommandExecuted(command);
                } catch (err) {
                    console.error('CommandService.execute: Observer failed during execution callback:', err);
                }
            });
        } catch (err) {
            console.error(`CommandService.execute: Command execution failed (ID: ${command.id}):`, err);
            throw err; // 将异常向上传递给门面层
        }
    }

    /**
     * 撤销命令并通知所有观察者
     * @param command 要回滚的指令对象
     */
    public async undo(command: Command): Promise<void> {
        if (!command) {
            throw new Error('CommandService.undo: Command cannot be empty');
        }

        try {
            // 执行回滚逻辑
            await command.undo();

            // 派发事件通知观察者（例如 HistoryObserver 收到后修改指针位置）
            this.observers.forEach(observer => {
                try {
                    observer.onCommandUndone(command);
                } catch (err) {
                    console.error('CommandService.undo: Observer failed during undo callback:', err);
                }
            });
        } catch (err) {
            console.error(`CommandService.undo: Command rollback failed (ID: ${command.id}):`, err);
            throw err;
        }
    }
}

export const commandService = CommandService.getInstance();
