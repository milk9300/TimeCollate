const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer');
const OSS = require('ali-oss');
const axios = require('axios');

// 辅助函数：静默上报进度到主后端的 Webhook
async function reportProgress(callbackUrl, taskId, progress) {
    try {
        await axios.post(callbackUrl, {
            taskId,
            progress
        }, {
            timeout: 5000
        });
        console.log(`[FC Video Generator] Reported progress: ${progress}%`);
    } catch (err) {
        console.error(`[FC Video Generator] Failed to report progress:`, err.message);
    }
}

// 辅助函数：删除目录下的所有文件并删除目录本身
function cleanDir(dirPath) {
    if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const curPath = path.join(dirPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                cleanDir(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        }
        fs.rmdirSync(dirPath);
    }
}

exports.handler = async (event, context) => {
    // 1. 解析 Payload 输入
    let eventObj;
    try {
        eventObj = JSON.parse(event.toString('utf-8'));
    } catch (e) {
        console.error('Failed to parse event payload:', e);
        return { success: false, error: 'Invalid JSON payload' };
    }

    const {
        bookId,
        taskId,
        frontendUrl,
        callbackUrl,
        token,
        user,
        exportType = 'video', // 'video' | 'pdf'
        pageSize = 'A4',
        ossRegion = 'oss-cn-hangzhou',
        ossBucket = 'time-collate',
        ossPrefix = 'uploads/'
    } = eventObj;

    console.log(`[FC Video Generator] Starting task ${taskId} (type: ${exportType}) for book ${bookId}`);
    
    // 初始化进度 10%
    await reportProgress(callbackUrl, taskId, 10);

    const framesDir = path.join('/tmp', `frames_${taskId}`);
    const videoPath = path.join('/tmp', `video_${taskId}.mp4`);
    const pdfPath = path.join('/tmp', `book_${taskId}.pdf`);
    let browser = null;

    try {
        // 创建帧临时目录
        if (!fs.existsSync(framesDir)) {
            fs.mkdirSync(framesDir, { recursive: true });
        }

        // 2. 启动 Puppeteer 浏览器并定位环境中的 Chrome 路径
        const chromePaths = [
            '/opt/bin/chromium',
            '/opt/bin/chrome',
            '/opt/chromium-v1058202-pack/chromium/chrome-linux/chrome',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser'
        ];

        let executablePath = null;
        for (const p of chromePaths) {
            if (fs.existsSync(p)) {
                executablePath = p;
                console.log(`[FC Video Generator] Found chrome binary at: ${p}`);
                break;
            }
        }

        browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--hide-scrollbars'
            ],
            executablePath: executablePath || undefined,
            headless: 'new'
        });

        // 上报进度 20%
        await reportProgress(callbackUrl, taskId, 20);

        // ==========================================
        // 分支 A: PDF 导出逻辑
        // ==========================================
        if (exportType === 'pdf') {
            const page = await browser.newPage();
            // 设置 2x 设备像素比，保证 PDF 渲染出的图片是高保真的
            await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });

            console.log(`[FC Video Generator] [PDF] Navigating to frontend root to inject auth: ${frontendUrl}`);
            await page.goto(frontendUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            
            await page.evaluate((t, u) => {
                const authState = {
                    state: {
                        token: t,
                        user: u,
                        isAuthenticated: true
                    },
                    version: 0
                };
                localStorage.setItem('timecollate-auth', JSON.stringify(authState));
            }, token, user);

            const targetUrl = `${frontendUrl}/book/${bookId}/preview?print=true`;
            console.log(`[FC Video Generator] [PDF] Loading target book preview URL: ${targetUrl}`);
            await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            // 进度 30%
            await reportProgress(callbackUrl, taskId, 30);

            // 等待前端 PDF 就绪信号
            console.log(`[FC Video Generator] [PDF] Waiting for frontend signaled readiness...`);
            let resolveReady;
            const readyPromise = new Promise((resolve) => {
                resolveReady = resolve;
            });
            await page.exposeFunction('onPdfReady', () => {
                console.log('[FC Video Generator] [PDF] Frontend signaled readiness');
                resolveReady();
            });

            try {
                await Promise.race([
                    readyPromise,
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Readiness signal timeout')), 30000)
                    )
                ]);
            } catch (sigErr) {
                console.warn('[FC Video Generator] [PDF] Signal warning:', sigErr.message);
            }

            // 再次确保所有图片加载完毕
            await page.evaluate(() => {
                return new Promise((resolve) => {
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

            // 稳定等待，让布局彻底计算完毕
            await new Promise(r => setTimeout(r, 1500));

            // 获取全部页面元素
            const pageHandles = await page.$$('[data-pdf-page]');
            console.log(`[FC Video Generator] [PDF] Found ${pageHandles.length} page elements in DOM.`);
            if (pageHandles.length === 0) {
                throw new Error('No page elements found in the Preview DOM. Cannot generate PDF.');
            }

            // 进度 50%
            await reportProgress(callbackUrl, taskId, 50);

            // 初始化 pdf-lib 并设定物理页面大小尺寸 (A4, A5, 16K, B5)
            const { PDFDocument } = require('pdf-lib');
            const pdfDoc = await PDFDocument.create();
            const MM_TO_PT = 2.834645669;
            const PAGE_DIMENSIONS = {
                'A4': { width: 210, height: 297 },
                'A5': { width: 148, height: 210 },
                '16K': { width: 184, height: 260 },
                'B5': { width: 176, height: 250 },
            };
            const dimMm = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS.A4;
            const pdfWidthPt = dimMm.width * MM_TO_PT;
            const pdfHeightPt = dimMm.height * MM_TO_PT;

            // 逐页截图并合成 PDF
            for (let i = 0; i < pageHandles.length; i++) {
                console.log(`[FC Video Generator] [PDF] Capturing page ${i + 1}/${pageHandles.length}...`);
                
                // 滚动到该元素并等待稳定
                await page.evaluate(el => el.scrollIntoView(), pageHandles[i]);
                await new Promise(r => setTimeout(r, 300));

                // 截图为 JPEG 格式 (78% 质量，通过 Chromium 内置压缩机制)
                const jpegBuffer = await pageHandles[i].screenshot({
                    type: 'jpeg',
                    quality: 78
                });

                console.log(`[FC Video Generator] [PDF]   Page ${i + 1}: Captured JPEG (${(jpegBuffer.length / 1024).toFixed(0)}KB)`);

                // 嵌入 PDF 并设定物理页面大小
                const jpegImage = await pdfDoc.embedJpg(jpegBuffer);
                const pdfPage = pdfDoc.addPage([pdfWidthPt, pdfHeightPt]);
                pdfPage.drawImage(jpegImage, {
                    x: 0,
                    y: 0,
                    width: pdfWidthPt,
                    height: pdfHeightPt,
                });

                // 更新中间进度 (从 50% 增长到 85%)
                const currentProgress = 50 + Math.min(Math.round(((i + 1) / pageHandles.length) * 35), 35);
                await reportProgress(callbackUrl, taskId, currentProgress);
            }

            const pdfBytes = await pdfDoc.save();
            console.log(`[FC Video Generator] [PDF] Final PDF generated, size: ${(pdfBytes.length / 1024).toFixed(0)}KB`);

            // 写入临时文件
            fs.writeFileSync(pdfPath, pdfBytes);

            // 进度 90%
            await reportProgress(callbackUrl, taskId, 90);
            await browser.close();
            browser = null;

            // 初始化 OSS
            const ossClient = new OSS({
                region: ossRegion,
                accessKeyId: context.credentials.accessKeyId,
                accessKeySecret: context.credentials.accessKeySecret,
                stsToken: context.credentials.securityToken,
                bucket: ossBucket
            });

            const ossKey = `${ossPrefix}pdfs/${taskId}.pdf`;
            console.log(`[FC Video Generator] [PDF] Uploading PDF to OSS: ${ossKey}`);
            const uploadResult = await ossClient.put(ossKey, pdfPath);
            let pdfUrl = uploadResult.url;
            console.log(`[FC Video Generator] [PDF] PDF uploaded successfully: ${pdfUrl}`);

            // 进度 95%
            await reportProgress(callbackUrl, taskId, 95);

            // 成功回调，通知主后端
            await axios.post(callbackUrl, {
                taskId,
                success: true,
                videoUrl: pdfUrl, // 依然以 videoUrl 属性名返回，主后端统一解析并存为 download_url
                ossKey,
                fileSize: pdfBytes.length
            }, {
                timeout: 10000
            });

            // 清除临时文件
            try {
                if (fs.existsSync(pdfPath)) {
                    fs.unlinkSync(pdfPath);
                }
            } catch (cleanupErr) {
                console.error('[FC Video Generator] [PDF] Cleanup failed:', cleanupErr.message);
            }

            return { success: true, pdfUrl };
        }

        // ==========================================
        // 分支 B: 3D 视频录制导出逻辑 (原有逻辑)
        // ==========================================
        const page = await browser.newPage();
        // 设置导出的标准 16:9 高清分辨率
        await page.setViewport({ width: 1280, height: 720 });

        // 3. Zero Trust 绕过认证：导航至主域名注入 LocalStorage，接着跳转至实际录像路由
        console.log(`[FC Video Generator] Navigating to frontend root to inject auth: ${frontendUrl}`);
        await page.goto(frontendUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        await page.evaluate((t, u) => {
            // 兼容 Zustand 中使用 persist 插件持久化的存储格式
            const authState = {
                state: {
                    token: t,
                    user: u,
                    isAuthenticated: true
                },
                version: 0
            };
            localStorage.setItem('timecollate-auth', JSON.stringify(authState));
        }, token, user);

        const targetUrl = `${frontendUrl}/read/${bookId}?mode=record`;
        console.log(`[FC Video Generator] Loading target book URL: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // 等待书籍及翻页组件加载完毕
        console.log(`[FC Video Generator] Waiting for flipBook to be ready...`);
        await page.waitForFunction(() => window.isFlipBookReady === true, { timeout: 20000 });

        // 4. 注入虚拟时钟（Virtual Clock），确保不受 FC CPU 性能波动影响，渲染完全确定性、平滑无掉帧
        await page.evaluate(() => {
            let virtualTime = 0;
            // 劫持物理时钟
            window.performance.now = () => virtualTime;
            Date.now = () => 1600000000000 + virtualTime;
            
            const activeCallbacks = new Map();
            let nextCallbackId = 1;
            
            // 劫持 requestAnimationFrame
            window.requestAnimationFrame = (callback) => {
                const id = nextCallbackId++;
                activeCallbacks.set(id, callback);
                return id;
            };
            
            window.cancelAnimationFrame = (id) => {
                activeCallbacks.delete(id);
            };
            
            // 暴露全局时钟步进函数，供外部 Puppeteer 逐帧驱动
            window.stepVirtualTime = (ms) => {
                virtualTime += ms;
                const callbacksToRun = Array.from(activeCallbacks.values());
                activeCallbacks.clear();
                for (const cb of callbacksToRun) {
                    try {
                        cb(virtualTime);
                    } catch (e) {
                        console.error(e);
                    }
                }
            };
        });

        // 读取页面配置
        const pageCount = await page.evaluate(() => window.flipBookPageCount || 0);
        console.log(`[FC Video Generator] Total pages to process: ${pageCount}`);

        // 上报进度 30%
        await reportProgress(callbackUrl, taskId, 30);

        // 5. 帧捕获与时钟驱动循环
        let frameIndex = 0;
        const fps = 30;
        const frameIntervalMs = 1000 / fps; // 33.33ms

        // 录制单帧的内联辅助函数
        async function recordFrame() {
            const framePath = path.join(framesDir, `frame_${String(frameIndex).padStart(5, '0')}.jpg`);
            await page.screenshot({
                path: framePath,
                type: 'jpeg',
                quality: 85
            });
            frameIndex++;
        }

        // 5.1 停留在封面展示 2 秒 (30fps * 2s = 60帧)
        console.log(`[FC Video Generator] Recording front cover...`);
        for (let i = 0; i < 60; i++) {
            await recordFrame();
            await page.evaluate((ms) => window.stepVirtualTime(ms), frameIntervalMs);
        }

        // 5.2 循环翻页捕获
        // 翻页时长由 react-pageflip 设定，这里每次翻页消耗 600ms = 18帧
        // 翻开每页后停留展示 2 秒 = 60帧
        let hasMoreFlips = true;
        let flipCount = 0;
        // 防无尽循环保护机制：最大翻页动作数限制为页面数的 2 倍，且最少 100 次，防止页面未正确前进时卡起
        const maxFlips = Math.max(pageCount * 2, 100);

        while (hasMoreFlips && flipCount < maxFlips) {
            flipCount++;
            console.log(`[FC Video Generator] Executing page flip #${flipCount}/${maxFlips}...`);
            
            // 触发翻页动作
            const triggered = await page.evaluate(() => {
                if (typeof window.flipBookNext === 'function') {
                    window.flipBookNext();
                    return true;
                }
                return false;
            });

            if (!triggered) {
                console.log(`[FC Video Generator] flipBookNext not found on window, breaking.`);
                break;
            }

            // 录制翻页过程的 18 帧 (600ms)
            for (let i = 0; i < 18; i++) {
                await recordFrame();
                await page.evaluate((ms) => window.stepVirtualTime(ms), frameIntervalMs);
            }

            // 获取当前页码状态，判断是否翻至末尾 (封底)
            const isEnd = await page.evaluate(() => {
                const cur = window.flipBookCurrentPage || 0;
                const total = window.flipBookPageCount || 0;
                return cur >= total - 1;
            });

            // 录制静止展示的 60 帧 (2s)
            for (let i = 0; i < 60; i++) {
                await recordFrame();
                await page.evaluate((ms) => window.stepVirtualTime(ms), frameIntervalMs);
            }

            // 更新导出进度 (从 30% 线性增长到 80%)
            const currentProgress = 30 + Math.min(Math.round((flipCount / (pageCount / 2 || 1)) * 50), 50);
            await reportProgress(callbackUrl, taskId, currentProgress);

            if (isEnd) {
                console.log(`[FC Video Generator] Reached back cover. Recording loop ends.`);
                hasMoreFlips = false;
            }
        }

        console.log(`[FC Video Generator] Capture finished. Total frames captured: ${frameIndex}`);
        
        // 录像结束进度 85%
        await reportProgress(callbackUrl, taskId, 85);
        await browser.close();
        browser = null;

        // 6. 调用本地 FFmpeg 进程合成高保真 MP4 视频
        console.log(`[FC Video Generator] Invoking FFmpeg to compile video...`);
        // 上报进度 90%
        await reportProgress(callbackUrl, taskId, 90);

        let ffmpegPath = 'ffmpeg';
        try {
            const ffmpegStatic = require('ffmpeg-static');
            if (ffmpegStatic) {
                ffmpegPath = ffmpegStatic;
                console.log(`[FC Video Generator] Using ffmpeg-static binary at: ${ffmpegPath}`);
            }
        } catch (e) {
            console.log('[FC Video Generator] ffmpeg-static not found or failed to load, falling back to global ffmpeg');
        }

        const ffmpegCmd = `"${ffmpegPath}" -y -r ${fps} -i "${path.join(framesDir, 'frame_%05d.jpg')}" -c:v libx264 -pix_fmt yuv420p -crf 23 "${videoPath}"`;
        execSync(ffmpegCmd);
        console.log(`[FC Video Generator] FFmpeg video compiled successfully.`);

        // 7. 使用临时 STS 凭证初始化阿里云 OSS 客户端，并将生成的视频上传至 OSS 存储库中
        console.log(`[FC Video Generator] Initializing OSS Client with STS Credentials...`);
        await reportProgress(callbackUrl, taskId, 95);

        const ossClient = new OSS({
            region: ossRegion,
            accessKeyId: context.credentials.accessKeyId,
            accessKeySecret: context.credentials.accessKeySecret,
            stsToken: context.credentials.securityToken,
            bucket: ossBucket
        });

        const ossKey = `${ossPrefix}videos/${taskId}.mp4`;
        console.log(`[FC Video Generator] Uploading to OSS: ${ossKey}`);
        const uploadResult = await ossClient.put(ossKey, videoPath);
        
        let videoUrl = uploadResult.url;
        console.log(`[FC Video Generator] Video uploaded successfully. URL: ${videoUrl}`);

        // 8. 成功回调，通知主后端 (设置 10 秒超时，防止网络黑洞导致函数挂起)
        await axios.post(callbackUrl, {
            taskId,
            success: true,
            videoUrl,
            ossKey
        }, {
            timeout: 10000
        });

        return { success: true, videoUrl };
    } catch (err) {
        console.error('[FC Video Generator] Process execution error:', err);

        if (browser) {
            await browser.close().catch(() => {});
        }

        // 失败回调，通知主后端 (设置 10 秒超时)
        try {
            await axios.post(callbackUrl, {
                taskId,
                success: false,
                errorMessage: err.message || 'Error occurred during video generation'
            }, {
                timeout: 10000
            });
        } catch (callbackErr) {
            console.error('[FC Video Generator] Failed to send failure callback to backend:', callbackErr.message);
        }

        return { success: false, error: err.message };
    } finally {
        // 9. 垃圾清理：清除临时生成的图片帧目录和导出的视频文件，杜绝 FC 实例磁盘空间爆满问题
        console.log(`[FC Video Generator] Cleaning up temporary files...`);
        try {
            cleanDir(framesDir);
            if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath);
            }
            if (fs.existsSync(pdfPath)) {
                fs.unlinkSync(pdfPath);
            }
        } catch (cleanupErr) {
            console.error('[FC Video Generator] Cleanup failed:', cleanupErr.message);
        }
    }
};
