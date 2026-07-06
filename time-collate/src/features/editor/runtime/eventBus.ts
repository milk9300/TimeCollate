// #region Description
/**
 * @description 运行时事件总线 (EventBus)
 * 用于 Editor Runtime 内部子服务与 React 视图层之间的高效发布-订阅机制，确保架构完全解耦
 */
// #endregion

type EventCallback<T = any> = (data: T) => void;

export class EventBus {
    private static instance: EventBus;
    private listeners = new Map<string, Set<EventCallback>>();

    private constructor() {}

    /**
     * 获取 EventBus 全局单例
     */
    public static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    /**
     * 订阅事件
     * @param event 事件名称
     * @param callback 回调函数
     */
    public on<T = any>(event: string, callback: EventCallback<T>): void {
        // Fail-Fast: 输入验证
        if (!event) {
            throw new Error('EventBus.on: Event name cannot be empty');
        }
        if (typeof callback !== 'function') {
            throw new Error('EventBus.on: Callback must be a function');
        }

        let eventSet = this.listeners.get(event);
        if (!eventSet) {
            eventSet = new Set<EventCallback>();
            this.listeners.set(event, eventSet);
        }
        eventSet.add(callback);
    }

    /**
     * 取消订阅事件
     * @param event 事件名称
     * @param callback 要取消的回调函数
     */
    public off<T = any>(event: string, callback: EventCallback<T>): void {
        if (!event) return;
        const eventSet = this.listeners.get(event);
        if (eventSet) {
            eventSet.delete(callback);
            if (eventSet.size === 0) {
                this.listeners.delete(event);
            }
        }
    }

    /**
     * 发布事件
     * @param event 事件名称
     * @param data 传递的负载数据
     */
    public emit<T = any>(event: string, data?: T): void {
        if (!event) return;
        const eventSet = this.listeners.get(event);
        if (eventSet) {
            // 使用数组复制防止回调中执行 off 破坏正在遍历的迭代器
            const callbacks = Array.from(eventSet);
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (err) {
                    console.error(`EventBus.emit: Error executing callback for event "${event}":`, err);
                }
            });
        }
    }

    /**
     * 清空所有监听器（主要在重载或卸载编辑器时使用，防止内存泄露）
     */
    public clearAll(): void {
        this.listeners.clear();
    }
}

// 导出单例实例
export const eventBus = EventBus.getInstance();
