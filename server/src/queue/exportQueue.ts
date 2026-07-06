import { Queue, Worker, Job } from 'bullmq';
import { config } from '../config/index.js';
import { bookService } from '../services/BookService.js';
import { storageService } from '../services/OssService.js';
import { PdfExportStrategy } from '../services/export/PdfExportStrategy.js';
import { Writable } from 'stream';
import { Response } from 'express';
import { pool } from '../db/index.js';

// 模拟 Express Response 对象以捕获导出策略生成的二进制数据
class BufferResponse extends Writable {
    public chunks: Buffer[] = [];
    public headers: Record<string, string> = {};
    public statusCode: number = 200;

    setHeader(name: string, value: any): this {
        this.headers[name.toLowerCase()] = String(value);
        return this;
    }

    attachment(filename: string): this {
        this.setHeader('content-disposition', `attachment; filename="${filename}"`);
        return this;
    }

    status(code: number): this {
        this.statusCode = code;
        return this;
    }

    send(data: any): this {
        if (Buffer.isBuffer(data)) {
            this.chunks.push(data);
        } else if (typeof data === 'string') {
            this.chunks.push(Buffer.from(data));
        } else {
            this.chunks.push(Buffer.from(JSON.stringify(data)));
        }
        this.end();
        return this;
    }

    json(obj: any): this {
        this.setHeader('content-type', 'application/json');
        this.send(obj);
        return this;
    }

    _write(chunk: any, encoding: string, callback: (error?: Error | null) => void): void {
        this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding as any));
        callback();
    }

    getBuffer(): Buffer {
        return Buffer.concat(this.chunks);
    }
}

// Redis 配置，由 BullMQ 内部自动实例化连接以防 ioredis 版本冲突
const connectionOptions = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
};

export const exportQueue = new Queue('export-jobs', {
    connection: connectionOptions,
});

const strategies = {
    'pdf': new PdfExportStrategy(),
};

// 辅助函数：更新数据库任务状态
const updateTask = async (taskId: string, updates: { status?: string; progress?: number; oss_key?: string; download_url?: string; file_size?: number; error_message?: string }) => {
    try {
        const fields: string[] = [];
        const values: any[] = [];
        
        Object.entries(updates).forEach(([key, val]) => {
            fields.push(`${key} = ?`);
            values.push(val);
        });
        
        if (fields.length === 0) return;
        
        values.push(taskId);
        await pool.query(
            `UPDATE export_tasks SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
    } catch (e) {
        console.error(`[Queue Worker] Failed to update database task ${taskId}:`, e);
    }
};

// 开启后台异步 Worker，设置并发度为 1 (削峰填谷，避免 OOM)
export const exportWorker = new Worker(
    'export-jobs',
    async (job: Job) => {
        const { bookId, format, exportData, token, user } = job.data;
        const taskId = job.id!;
        console.log(`[Queue Worker] Processing job ${taskId} for book ${bookId}, format ${format}`);

        await updateTask(taskId, { status: 'active', progress: 10 });
        await job.updateProgress(10);

        const result = await bookService.getBook(bookId);
        if (!result) {
            throw new Error(`Book not found: ${bookId}`);
        }
        const { book: rawBook, cover, pages } = result;

        const bookPages = [...(pages || [])];
        if (cover) {
            bookPages.unshift({
                id: cover.id,
                bookId: rawBook.id,
                pageTitle: '书封',
                isChapterStart: false,
                content: '',
                photos: [],
                templateId: 'book-cover',
                sortOrder: -1,
                elements: cover.frontElements || [],
                background: { color: '#FFFFFF', gridPattern: false }
            });
        }

        const book = {
            ...rawBook,
            pages: bookPages
        };

        await updateTask(taskId, { progress: 30 });
        await job.updateProgress(30);

        const strategy = strategies[format as 'pdf'];
        if (!strategy) {
            throw new Error(`Unsupported export format: ${format}`);
        }

        await updateTask(taskId, { progress: 50 });
        await job.updateProgress(50);

        const mockRes = new BufferResponse();
        
        // 执行导出策略，传入认证上下文
        await strategy.execute(book, mockRes as unknown as Response, { token, user });

        await updateTask(taskId, { progress: 80 });
        await job.updateProgress(80);

        const buffer = mockRes.getBuffer();
        if (buffer.length === 0) {
            throw new Error('Export strategy produced empty buffer');
        }

        // 根据响应头提取或推导文件后缀名
        const contentDisposition = mockRes.headers['content-disposition'] || '';
        let extension = format === 'pdf' ? '.pdf' : '.zip';
        if (contentDisposition.includes('filename=')) {
            const matches = contentDisposition.match(/filename="?([^"]+)"?/);
            if (matches && matches[1]) {
                const ext = matches[1].split('.').pop();
                if (ext) {
                    extension = `.${ext}`;
                }
            }
        }

        const fileName = `export_${bookId}_${Date.now()}${extension}`;
        console.log(`[Queue Worker] Uploading file ${fileName} to storage service...`);

        const uploadResult = await storageService.uploadFile(buffer, fileName);
        
        await updateTask(taskId, { progress: 95 });
        await job.updateProgress(95);

        // 生成 24 小时有效的预签名下载链接
        const signedUrl = await storageService.getSignedUrl(uploadResult.ossKey, 86400);

        await updateTask(taskId, { 
            status: 'completed', 
            progress: 100, 
            oss_key: uploadResult.ossKey,
            download_url: signedUrl,
            file_size: buffer.length
        });
        
        // 记录导出流量
        const { trafficService } = await import('../services/TrafficService.js');
        await trafficService.recordTraffic('export', buffer.length);
        await job.updateProgress(100);
        
        console.log(`[Queue Worker] Job ${taskId} completed. URL: ${signedUrl}`);
        return signedUrl;
    },
    {
        connection: connectionOptions,
        concurrency: 1,
    }
);

// 异常事件监听与输出
exportWorker.on('failed', async (job, err) => {
    console.error(`[Queue Worker] Job ${job?.id} failed with error:`, err);
    if (job?.id) {
        try {
            await pool.query(
                `UPDATE export_tasks SET status = 'failed', error_message = ? WHERE id = ?`,
                [err.message || 'Unknown error', job.id]
            );
        } catch (e) {
            console.error('[Queue Worker] Failed to save failure state to DB:', e);
        }
    }
});
