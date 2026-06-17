import { IExportStrategy } from './IExportStrategy.js';
import { Book } from '../../types/index.js';
import { Response } from 'express';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

// #region 常量定义
/** 1mm = 2.834645669 PDF points */
const MM_TO_PT = 2.834645669;

/** 页面物理尺寸 (mm) */
const PAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
    'A4': { width: 210, height: 297 },
    'A5': { width: 148, height: 210 },
    '16K': { width: 184, height: 260 },
    'B5': { width: 176, height: 250 },
};

/** Playwright viewport 宽度，需容纳最宽页面（210mm ≈ 794px @96dpi），留出余量 */
const VIEWPORT_WIDTH = 1200;
const VIEWPORT_HEIGHT = 900;

/** 截图设备像素比，2x 足够保证高清但不会过大 */
const DEVICE_SCALE_FACTOR = 2;

/** 截图压缩为 JPEG 的质量（1-100），控制 PDF 文件最终体积 */
const JPEG_QUALITY = 78;

/** 等待 onPdfReady 信号的超时时间（ms） */
const READY_SIGNAL_TIMEOUT_MS = 30_000;

/** 每页截图前的额外稳定等待（ms） */
const PER_PAGE_SETTLE_MS = 300;
// #endregion

export class PdfExportStrategy implements IExportStrategy {
    async execute(book: Book, res: Response, options?: { token?: string; user?: any }): Promise<void> {
        let browser;
        try {
            const totalPages = book.pages.length;
            console.log(`[PDF] Starting export: "${book.title}" (${totalPages} pages)`);

            // 1. 启动浏览器，设置 2x 缩放以获取高清截图
            browser = await chromium.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const context = await browser.newContext({
                viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
                deviceScaleFactor: DEVICE_SCALE_FACTOR,
            });
            const page = await context.newPage();

            // 2. 注入书籍数据
            await page.addInitScript((data) => {
                (window as any).__PREVIEW_DATA__ = data;
            }, book);

            // 3. 准备 readiness 信号
            let resolveReady: () => void;
            const readyPromise = new Promise<void>((resolve) => {
                resolveReady = resolve;
            });
            await page.exposeFunction('onPdfReady', () => {
                console.log('[PDF] Frontend signaled readiness');
                resolveReady();
            });

            // 4. 注入认证 localStorage（绕过 AuthGuard）
            const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            if (options?.token && options?.user) {
                console.log(`[PDF] Pre-authenticating on ${frontendBaseUrl}...`);
                try {
                    await page.goto(frontendBaseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                    await page.evaluate(({ token, user }) => {
                        window.localStorage.setItem('timecollate-auth', JSON.stringify({
                            state: { user, token, isAuthenticated: true },
                            version: 0
                        }));
                    }, { token: options.token, user: options.user });
                    console.log(`[PDF] Auth injected.`);
                } catch (authErr) {
                    console.warn('[PDF] Auth injection warning:', (authErr as Error).message);
                }
            }

            // 5. 导航到预览页面，等待网络空闲
            const previewUrl = `${frontendBaseUrl}/book/${book.id}/preview?print=true`;
            console.log(`[PDF] Navigating to ${previewUrl}...`);
            try {
                await page.goto(previewUrl, { waitUntil: 'networkidle', timeout: 60000 });
            } catch (navErr) {
                console.warn('[PDF] Navigation warning:', (navErr as Error).message);
            }

            // 6. 等待前端 readiness 信号（图片加载完成）
            console.log(`[PDF] Waiting for readiness signal...`);
            try {
                await Promise.race([
                    readyPromise,
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Readiness signal timeout')), READY_SIGNAL_TIMEOUT_MS)
                    )
                ]);
            } catch (sigErr) {
                console.warn('[PDF] Signal warning:', (sigErr as Error).message);
            }

            // 7. 再次等待所有图片在浏览器中完成加载
            console.log(`[PDF] Double-checking all images loaded...`);
            await page.evaluate(() => {
                return new Promise<void>((resolve) => {
                    const imgs = Array.from(document.querySelectorAll('img'));
                    if (imgs.length === 0) return resolve();
                    let done = 0;
                    const check = () => { if (++done >= imgs.length) resolve(); };
                    for (const img of imgs) {
                        if (img.complete && img.naturalWidth > 0) check();
                        else {
                            img.addEventListener('load', check, { once: true });
                            img.addEventListener('error', check, { once: true });
                        }
                    }
                });
            });

            // 8. 额外等待让布局彻底稳定
            await page.waitForTimeout(1500);

            // 9. 定位所有页面元素并逐一截图
            const pageWrappers = await page.locator('[data-pdf-page]').all();
            console.log(`[PDF] Found ${pageWrappers.length} page elements in DOM.`);

            if (pageWrappers.length === 0) {
                throw new Error('No page elements found in the Preview DOM. Cannot generate PDF.');
            }

            const dimMm = PAGE_DIMENSIONS[book.pageSize as string] || PAGE_DIMENSIONS.A4;
            const pdfWidthPt = dimMm.width * MM_TO_PT;
            const pdfHeightPt = dimMm.height * MM_TO_PT;

            // 10. 创建 PDF 文档
            const pdfDoc = await PDFDocument.create();

            for (let i = 0; i < pageWrappers.length; i++) {
                console.log(`[PDF] Capturing page ${i + 1}/${pageWrappers.length}...`);

                // 滚动到该元素
                await pageWrappers[i].scrollIntoViewIfNeeded();
                await page.waitForTimeout(PER_PAGE_SETTLE_MS);

                // 截图为 PNG Buffer
                const pngBuffer = await pageWrappers[i].screenshot({ type: 'png' });

                // 使用 Sharp 压缩为 JPEG（大幅减少 PDF 体积）
                const jpegBuffer = await sharp(pngBuffer)
                    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
                    .toBuffer();

                console.log(`[PDF]   Page ${i + 1}: PNG ${(pngBuffer.length / 1024).toFixed(0)}KB -> JPEG ${(jpegBuffer.length / 1024).toFixed(0)}KB`);

                // 嵌入图片并创建 PDF 页
                const jpegImage = await pdfDoc.embedJpg(jpegBuffer);
                const pdfPage = pdfDoc.addPage([pdfWidthPt, pdfHeightPt]);
                pdfPage.drawImage(jpegImage, {
                    x: 0,
                    y: 0,
                    width: pdfWidthPt,
                    height: pdfHeightPt,
                });
            }

            // 11. 序列化 PDF
            const pdfBytes = await pdfDoc.save();
            console.log(`[PDF] Final PDF: ${(pdfBytes.length / 1024).toFixed(0)}KB, ${pageWrappers.length} pages`);

            const filename = `${book.title.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_')}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
            res.setHeader('Content-Length', pdfBytes.length);
            res.end(Buffer.from(pdfBytes));

        } catch (error) {
            console.error('[PDF] Generation Error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: `Failed to generate PDF: ${(error as Error).message}` });
            }
        } finally {
            if (browser) {
                await browser.close();
                console.log(`[PDF] Browser closed`);
            }
        }
    }
}
