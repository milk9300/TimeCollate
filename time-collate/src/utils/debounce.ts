/**
 * @description 通用带 cancel 和 flush 成员的高性能防抖函数
 * 核心用于防抖网络同步保存，防止高频操作对数据库的性能冲击
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): {
    (...args: Parameters<T>): void;
    cancel: () => void;
    flush: () => void;
} {
    let timeout: any = null;
    let lastArgs: Parameters<T> | null = null;

    const debounced = (...args: Parameters<T>) => {
        lastArgs = args;
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func(...args);
            timeout = null;
            lastArgs = null;
        }, wait);
    };

    debounced.cancel = () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        lastArgs = null;
    };

    debounced.flush = () => {
        if (timeout) {
            clearTimeout(timeout);
            if (lastArgs) {
                func(...lastArgs);
            }
            timeout = null;
            lastArgs = null;
        }
    };

    return debounced;
}
