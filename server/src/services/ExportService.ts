import { Response } from 'express';
import { IExportStrategy } from './export/IExportStrategy.js';
import { PdfExportStrategy } from './export/PdfExportStrategy.js';
import { bookService } from './BookService.js';

export class ExportService {
    private strategies: Record<string, IExportStrategy>;
    private concurrentPdfCount = 0;
    private readonly MAX_CONCURRENT_PDF = 1; // 2C2G 环境建议设为 1，确保系统绝对稳定

    constructor() {
        this.strategies = {
            'pdf': new PdfExportStrategy()
        };
    }

    async exportBook(bookId: string, format: string, res: Response): Promise<void> {
        const isPdf = format.toLowerCase() === 'pdf';

        // 并发限流检查 (针对高能耗的 PDF 导出)
        if (isPdf && this.concurrentPdfCount >= this.MAX_CONCURRENT_PDF) {
            res.status(429).json({
                success: false,
                error: '服务器当前正忙于处理其他 PDF 导出任务，请 1 分钟后再试。'
            });
            return;
        }

        const strategy = this.strategies[format.toLowerCase()];
        if (!strategy) {
            throw new Error(`Unsupported export format: ${format}`);
        }

        const book = await bookService.getBook(bookId);
        if (!book) {
            throw new Error('Book not found');
        }

        try {
            if (isPdf) this.concurrentPdfCount++;
            await strategy.execute(book, res);
        } finally {
            if (isPdf) this.concurrentPdfCount--;
        }
    }
}

export default new ExportService();
