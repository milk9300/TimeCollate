import { bookService } from './BookService.js';
import { deleteFromOss } from './OssService.js';

/**
 * 清理服务
 * 定期检查并永久删除超过30天的软删除书籍
 */
export class CleanupService {
    private intervalId: NodeJS.Timeout | null = null;
    private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24小时

    /**
     * 启动定时清理任务
     */
    start(): void {
        console.log('🧹 CleanupService started - checking expired books every 24 hours');

        // 启动时立即执行一次
        this.cleanup();

        // 设置定时任务
        this.intervalId = setInterval(() => {
            this.cleanup();
        }, this.CLEANUP_INTERVAL);
    }

    /**
     * 停止定时清理任务
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('🧹 CleanupService stopped');
        }
    }

    /**
     * 执行清理任务
     */
    async cleanup(): Promise<void> {
        console.log(`🧹 [${new Date().toISOString()}] Starting cleanup of expired deleted books...`);

        try {
            // 获取超过30天的已删除书籍
            const expiredBooks = await bookService.getExpiredDeletedBooks();

            if (expiredBooks.length === 0) {
                console.log('🧹 No expired books to clean up');
                return;
            }

            console.log(`🧹 Found ${expiredBooks.length} expired books to clean up`);

            for (const book of expiredBooks) {
                try {
                    // 永久删除书籍并获取需要删除的 OSS keys
                    const ossKeys = await bookService.permanentDeleteBook(book.id, book.userId);
                    console.log(`🗑️ Permanently deleted book: ${book.title} (${book.id})`);

                    // 删除 OSS 文件
                    for (const key of ossKeys) {
                        try {
                            await deleteFromOss(key);
                            console.log(`🗑️ Deleted OSS file: ${key}`);
                        } catch (ossError) {
                            console.error(`❌ Failed to delete OSS file: ${key}`, ossError);
                        }
                    }
                } catch (bookError) {
                    console.error(`❌ Failed to delete book: ${book.id}`, bookError);
                }
            }

            console.log(`🧹 Cleanup completed: ${expiredBooks.length} books processed`);
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
        }
    }
}

// 导出单例
export const cleanupService = new CleanupService();
