// #region Description
/**
 * @description 统一物理资源加载器 (ResourceLoader)
 * 处理底层的网络载入、防重复并发请求缓存、以及字体的 FontFace/DOM 注入优雅降级与物理卸载
 */
// #endregion

import { ResourceState, type Resource } from '../types';

export class ResourceLoader {
    private static cache = new Map<string, Promise<void>>();

    /**
     * 加载具体资源物理文件
     * @param res 资源对象
     */
    public static async load(res: Resource): Promise<void> {
        // 如果已经加载就绪，直接返回
        if (res.state === ResourceState.Ready) return;

        // 如果已经在加载队列中，直接复用已有的 Promise，防止并发网络请求
        let loadPromise = this.cache.get(res.id);
        if (!loadPromise) {
            loadPromise = this.executeLoad(res);
            this.cache.set(res.id, loadPromise);
        }

        try {
            res.state = ResourceState.Loading;
            await loadPromise;
            res.state = ResourceState.Ready;
            res.error = undefined;
        } catch (err: any) {
            res.state = ResourceState.Failed;
            res.error = err.message || 'Failed to download resource';
            this.cache.delete(res.id); // 允许失败后重试
            throw err;
        }
    }

    /**
     * 执行底层加载分类管线
     */
    private static async executeLoad(res: Resource): Promise<void> {
        // 零信任防御：防范恶意脚本/协议注入
        if (res.url) {
            const trimmedUrl = res.url.trim();
            const isSafe = trimmedUrl.startsWith('http://') || 
                           trimmedUrl.startsWith('https://') || 
                           trimmedUrl.startsWith('/') || 
                           trimmedUrl.startsWith('data:');
            
            if (!isSafe) {
                throw new Error(`Security Exception: Unsafe resource URL protocol: ${res.url}`);
            }
        }

        switch (res.kind) {
            case 'font':
                await this.loadFont(res);
                break;
            case 'image':
                await this.loadImage(res);
                break;
            case 'sticker':
                await this.loadSticker(res);
                break;
            default:
                throw new Error(`Unsupported resource type loader: ${res.kind}`);
        }
    }

    /**
     * 加载字体物理资产
     */
    private static async loadFont(res: Resource): Promise<void> {
        if (!res.url) return;

        // 检测是否为切片后的 CSS 样式表入口 (包含 .css)
        const isCssSheet = res.url.toLowerCase().includes('.css') || res.url.includes('/result.css');

        if (isCssSheet) {
            return new Promise<void>((resolve, reject) => {
                if (typeof document === 'undefined') return resolve();

                const linkId = `font-css-inject-${res.id}`;
                if (document.getElementById(linkId)) return resolve();

                const link = document.createElement('link');
                link.id = linkId;
                link.rel = 'stylesheet';
                
                const isCross = res.url!.includes('://') && !res.url!.includes(window.location.host);
                if (isCross) {
                    link.crossOrigin = 'anonymous';
                }
                link.href = isCross ? `${res.url}${res.url!.includes('?') ? '&' : '?'}cors=1` : res.url!;
                
                link.onload = () => {
                    console.log(`🎉 成功加载云端切片字体样式表: ${res.name}`);
                    resolve();
                };
                link.onerror = () => reject(new Error(`Failed to load CSS font stylesheet: ${res.url}`));
                document.head.appendChild(link);
            });
        }

        // 否则为原始单体 TTF/WOFF/WOFF2 物理文件链接
        // 1. 优先采用原生 FontFace API 以达到更精准的生命周期拦截
        if (typeof window !== 'undefined' && 'FontFace' in window) {
            try {
                const fontFace = new FontFace(res.name, `url(${res.url})`);
                await fontFace.load();
                document.fonts.add(fontFace);
                return;
            } catch (err) {
                console.warn(`FontFace API failed for "${res.name}", attempting style tag fallback:`, err);
            }
        }

        // 2. 优雅降级：向 DOM Head 注入 @font-face style 标签
        return new Promise<void>((resolve, reject) => {
            if (typeof document === 'undefined') return resolve();

            const styleId = `font-face-inject-${res.id}`;
            if (document.getElementById(styleId)) return resolve();

            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                @font-face {
                    font-family: '${res.name}';
                    src: url('${res.url}') format('woff2'),
                         url('${res.url}') format('woff'),
                         url('${res.url}') format('truetype');
                    font-weight: normal;
                    font-style: normal;
                    font-display: swap;
                }
            `;
            style.onload = () => resolve();
            style.onerror = () => reject(new Error(`Failed to mount @font-face style tag for ${res.name}`));
            document.head.appendChild(style);
        });
    }

    /**
     * 加载图片资产
     */
    private static async loadImage(res: Resource): Promise<void> {
        if (!res.url) return;
        return new Promise<void>((resolve, reject) => {
            if (typeof window === 'undefined') return resolve();
            const img = new Image();
            img.src = res.url!;
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Image resource failed to load: ${res.url}`));
        });
    }

    /**
     * 加载贴纸 (SVG/Lottie 等二进制或文本资产)
     */
    private static async loadSticker(res: Resource): Promise<void> {
        if (!res.url) return;
        // 如果是 SVG 文件，这里可以执行额外的异步拉取解析校验（例如防止 XSS）
        return new Promise<void>((resolve, reject) => {
            if (typeof window === 'undefined') return resolve();
            const img = new Image();
            img.src = res.url!;
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Sticker file failed to load: ${res.url}`));
        });
    }

    /**
     * 物理释放/卸载已加载的资源（移除 DOM 或 Fonts 缓存）
     */
    public static unload(res: Resource): void {
        this.cache.delete(res.id);

        if (typeof document === 'undefined') return;

        if (res.kind === 'font') {
            // 1. 清理 DOM 中的 style 标签
            const styleId = `font-face-inject-${res.id}`;
            const el = document.getElementById(styleId);
            if (el) el.remove();

            // 2. 清理 document.fonts 缓存中的 FontFace
            if ('FontFace' in window) {
                try {
                    document.fonts.forEach(f => {
                        if (f.family === res.name) {
                            document.fonts.delete(f);
                        }
                    });
                } catch (e) {
                    console.error(`ResourceLoader.unload: Error clearing FontFace for "${res.name}":`, e);
                }
            }
        }
    }
}
