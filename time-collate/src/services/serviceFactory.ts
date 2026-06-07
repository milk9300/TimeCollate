import type { IBookService } from './IBookService';
import { LocalBookService } from './LocalBookService';
import { CloudBookService } from './CloudBookService';

/**
 * 存储模式类型
 */
export type StorageMode = 'local' | 'cloud';

/**
 * 获取当前存储模式
 */
export function getStorageMode(): StorageMode {
    const mode = import.meta.env.VITE_STORAGE_MODE;
    return mode === 'cloud' ? 'cloud' : 'local';
}

/**
 * 服务工厂
 * 根据环境变量创建对应的 BookService 实例
 */
export function createBookService(): IBookService {
    const mode = getStorageMode();
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

    if (mode === 'cloud') {
        console.log('📦 Using CloudBookService:', apiBaseUrl);
        return new CloudBookService(apiBaseUrl);
    } else {
        console.log('💾 Using LocalBookService (localStorage)');
        return new LocalBookService();
    }
}

/**
 * 单例 BookService 实例
 */
let bookServiceInstance: IBookService | null = null;

/**
 * 获取 BookService 单例
 */
export function getBookService(): IBookService {
    if (!bookServiceInstance) {
        bookServiceInstance = createBookService();
    }
    return bookServiceInstance;
}
