// #region Description
/**
 * @description 资源管理与仓储服务 (ResourceService)
 * 实现 ResourceRepository 接口，维护运行时的引用计数生命周期，并统一调度 ResourceLoader
 */
// #endregion

import { ResourceState, type Resource, type ResourceReference } from '../types';
import { ResourceLoader } from './ResourceLoader';
import { type ResourceProvider, LocalProvider, CloudProvider } from './ResourceProvider';
import { eventBus } from '../eventBus';

export interface ResourceRepository {
    findById(id: string): Promise<Resource | null>;
    list(kind: 'font' | 'image' | 'sticker' | 'background'): Promise<Resource[]>;
    search(query: string, kind?: string): Promise<Resource[]>;
}

export class ResourceService implements ResourceRepository {
    private static instance: ResourceService;
    
    // 内存中的活跃资源实例映射表 (resourceId -> Resource)
    private activeResources = new Map<string, Resource>();
    
    // 注册的资产提供者
    private providers: ResourceProvider[] = [
        new LocalProvider(),
        new CloudProvider()
    ];

    // 释放定时器映射，防止快速 Undo/Redo 导致反复加载卸载
    private releaseTimers = new Map<string, ReturnType<typeof setTimeout>>();

    private constructor() {}

    /**
     * 获取 ResourceService 全局单例
     */
    public static getInstance(): ResourceService {
        if (!ResourceService.instance) {
            ResourceService.instance = new ResourceService();
        }
        return ResourceService.instance;
    }

    /**
     * 占用/引用一个资源。计数加一，如已被标记释放则重新激活
     * @param resourceId 资源 ID
     */
    public acquire(resourceId: string): void {
        if (!resourceId) return;

        // 清理可能存在的防抖释放定时器
        const timer = this.releaseTimers.get(resourceId);
        if (timer) {
            clearTimeout(timer);
            this.releaseTimers.delete(resourceId);
        }

        let res = this.activeResources.get(resourceId);
        if (!res) {
            // 内存没有，先建立占位资源，防止引用计数丢失
            res = {
                id: resourceId,
                kind: 'font',
                name: '',
                state: ResourceState.Idle,
                refCount: 1
            };
            this.activeResources.set(resourceId, res);
        } else {
            res.refCount++;
            if (res.state === ResourceState.Released) {
                res.state = ResourceState.Idle; // 重新变回 Idle
            }
        }
        this.notifyResourceStateChange(res);
    }

    /**
     * 释放/卸载一个资源。计数减一，清零后防抖 5 秒物理释放
     * @param resourceId 资源 ID
     * @param delayMs 防抖延迟
     */
    public release(resourceId: string, delayMs = 5000): void {
        if (!resourceId) return;

        const res = this.activeResources.get(resourceId);
        if (!res) return;

        res.refCount--;
        if (res.refCount <= 0) {
            res.refCount = 0;

            // 检查并防抖延迟物理注销
            if (this.releaseTimers.has(resourceId)) {
                clearTimeout(this.releaseTimers.get(resourceId)!);
            }

            const timer = setTimeout(() => {
                this.releaseTimers.delete(resourceId);
                // 再次确认在此 5 秒内无任何元素重新 acquire
                if (res.refCount === 0 && res.state !== ResourceState.Released) {
                    res.state = ResourceState.Released;
                    ResourceLoader.unload(res);
                    this.notifyResourceStateChange(res);
                    eventBus.emit('resource:released', res);
                }
            }, delayMs);

            this.releaseTimers.set(resourceId, timer);
        }
        this.notifyResourceStateChange(res);
    }

    /**
     * 触发异步加载一个资源
     * @param resourceId 资源 ID
     */
    public async load(resourceId: string): Promise<void> {
        let res = this.activeResources.get(resourceId);
        if (!res) {
            // 如果内存没有，先从提供者中捞出资源并注册
            const found = await this.findById(resourceId);
            if (!found) {
                throw new Error(`ResourceService.load: Resource not found: ${resourceId}`);
            }
            res = found;
        }

        // 调用物理加载器
        this.notifyResourceStateChange(res);
        try {
            await ResourceLoader.load(res);
            this.notifyResourceStateChange(res);
            eventBus.emit('resource:ready', res);
        } catch (err: any) {
            this.notifyResourceStateChange(res);
            throw err;
        }
    }

    // #region 仓储实现 (ResourceRepository Implementation)

    /**
     * 根据唯一 ID 查找资源
     */
    /**
     * 将真实资源数据合并入活跃内存（合并属性以保护现有的 refCount 和 state）
     */
    private mergeToActive(id: string, matched: Resource): Resource {
        let active = this.activeResources.get(id);
        if (!active) {
            active = { ...matched };
            this.activeResources.set(id, active);
        } else {
            active.name = matched.name;
            active.url = matched.url;
            active.thumbnailUrl = matched.thumbnailUrl;
            active.kind = matched.kind;
            active.metadata = matched.metadata;
            // 状态级联就绪：如果之前是 Idle 且预设是 Ready，则设为 Ready
            if (active.state === ResourceState.Idle && matched.state === ResourceState.Ready) {
                active.state = ResourceState.Ready;
            }
        }
        return active;
    }

    public async findById(id: string): Promise<Resource | null> {
        if (!id) return null;

        // 1. 优先从活跃内存查，且必须是完整的资源（具有非空的 name，若为临时占位则穿透）
        const existing = this.activeResources.get(id);
        if (existing && existing.name) {
            return existing;
        }

        // 2. 穿透至各 Provider 扫描
        for (const provider of this.providers) {
            try {
                // 为简便，我们在 findById 里跑列表搜索。在大并发下此处可能有性能瓶颈，但在前端回忆册编辑器下数据量级极轻。
                // 建议后期建立 Provider 级索引缓存。
                const fonts = await provider.provide('font');
                const matched = fonts.find(f => f.id === id);
                if (matched) {
                    return this.mergeToActive(id, matched);
                }
                
                const stickers = await provider.provide('sticker');
                const matchedStk = stickers.find(s => s.id === id);
                if (matchedStk) {
                    return this.mergeToActive(id, matchedStk);
                }
            } catch (e) {
                console.error(`ResourceService.findById: Provider failed scanning for ID "${id}":`, e);
            }
        }

        return existing || null; // 如果 providers 没找到，依然退化返回占位资源
    }

    /**
     * 获取某种类型资源的全列表 (内置 + 云端)
     */
    public async list(kind: 'font' | 'image' | 'sticker' | 'background'): Promise<Resource[]> {
        const resultsMap = new Map<string, Resource>();

        // 并行从所有 Providers 中加载
        const promises = this.providers.map(async (provider) => {
            try {
                const list = await provider.provide(kind);
                list.forEach(res => {
                    // 使用合并缓存，防止覆盖已维护的 refCount
                    const merged = this.mergeToActive(res.id, res);
                    resultsMap.set(res.id, merged);
                });
            } catch (e) {
                console.error('ResourceService.list: Provider provide list failed:', e);
            }
        });

        await Promise.all(promises);
        return Array.from(resultsMap.values());
    }

    /**
     * 根据字符串搜索资源
     */
    public async search(query: string, kind?: string): Promise<Resource[]> {
        if (!query) return [];
        const lowercaseQuery = query.toLowerCase();

        // 确定需要检索的大类
        const kinds: any[] = kind ? [kind] : ['font', 'sticker'];
        const matches: Resource[] = [];

        for (const k of kinds) {
            const list = await this.list(k);
            const filtered = list.filter(
                res => res.name.toLowerCase().includes(lowercaseQuery) || res.id.toLowerCase().includes(lowercaseQuery)
            );
            matches.push(...filtered);
        }

        return matches;
    }

    // #endregion

    /**
     * 清理所有缓存定时器（防止组件被整体销毁时残留定时器）
     */
    public dispose(): void {
        this.releaseTimers.forEach(timer => clearTimeout(timer));
        this.releaseTimers.clear();
        this.activeResources.clear();
    }

    /**
     * 派发底层事件通知 UI 状态修改
     */
    private notifyResourceStateChange(res: Resource): void {
        eventBus.emit('resource:state-change', {
            id: res.id,
            state: res.state,
            refCount: res.refCount,
            error: res.error
        });
    }
}

export const resourceService = ResourceService.getInstance();
