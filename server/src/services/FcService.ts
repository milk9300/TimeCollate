import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import axios from 'axios';
import { config } from '../config/index.js';
import { pool } from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 阿里云函数计算调用服务
 * 
 * 架构选型说明：
 * 原方案使用 FC SDK 管控 API（accountId.region.fc.aliyuncs.com）调用函数，
 * 但该域名在轻量应用服务器的出网策略下无法连通（ConnectTimeout）。
 * 
 * 现改为通过 HTTP 触发器的公网地址（*.fcapp.run）直接发送 POST 请求，
 * 绕过 SDK 管控网络限制，稳定性更高、依赖更少。
 */
export class FcService {

    /**
     * 异步调用阿里云函数计算触发导出功能（支持 3D 视频及 PDF 导出）
     */
    async invokeExportAsync(params: {
        bookId: string;
        taskId: string;
        token: string;
        user: any;
        type: 'pdf' | 'video';
        pageSize?: string;
    }): Promise<boolean> {
        const frontendUrl = process.env.APP_URL || 'http://localhost:5173';
        const callbackUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/export/webhook/video?secret=${config.fc.webhookSecret}`;

        const payload = {
            bookId: params.bookId,
            taskId: params.taskId,
            frontendUrl,
            callbackUrl,
            token: params.token,
            user: params.user,
            exportType: params.type,
            pageSize: params.pageSize || 'A4',
            ossRegion: config.oss.region,
            ossBucket: config.oss.bucket,
            ossPrefix: config.oss.prefix,
            // 直接传递 OSS 凭证，因为 HTTP 触发器模式下 context.credentials 不可用
            ossAccessKeyId: config.oss.accessKeyId,
            ossAccessKeySecret: config.oss.secretAccessKey,
        };

        // 判定是否使用本地开发降级模拟 (development 环境或未配置 FC_HTTP_URL)
        const isLocal = config.nodeEnv === 'development' || !config.fc.httpUrl;

        if (isLocal) {
            console.log(`[FC Service] Local fallback mode: Generating ${params.type} export...`);
            
            // 异步后台运行，避免阻塞前端请求
            const fcGeneratorPath = path.resolve(__dirname, '../../fc-video-generator/index.js');
            // Windows 系统下 ESM 动态 import 必须转换为 file:// 协议，否则会报 ERR_INVALID_URL_SCHEME 错误导致静默失败
            const fileUrl = pathToFileURL(fcGeneratorPath).href;
            console.log(`[FC Service] Dynamic importing local handler from file URL: ${fileUrl}`);
            
            import(fileUrl).then(async (module) => {
                const handler = module.handler || module.default?.handler;
                if (!handler) {
                    throw new Error('Handler function not found in fc-video-generator/index.js');
                }
                
                const mockEvent = Buffer.from(JSON.stringify(payload));
                const mockContext = {
                    credentials: {
                        accessKeyId: config.oss.accessKeyId,
                        accessKeySecret: config.oss.secretAccessKey,
                        securityToken: undefined,
                    }
                };
                
                try {
                    await handler(mockEvent, mockContext);
                } catch (err) {
                    console.error(`[FC Service] Local fallback ${params.type} generation execution error:`, err);
                    await pool.query(
                        `UPDATE export_tasks SET status = 'failed', error_message = ? WHERE id = ?`,
                        [(err as Error).message, params.taskId]
                    );
                }
            }).catch(async (err) => {
                console.error(`[FC Service] Failed to load local ${params.type} generator module:`, err);
                await pool.query(
                    `UPDATE export_tasks SET status = 'failed', error_message = ? WHERE id = ?`,
                    [(err as Error).message, params.taskId]
                    // 标记状态为失败，让前端在界面上能即时看到排队因何终止
                );
            });
            
            return true;
        }

        // ========== 生产环境：通过 HTTP 触发器公网地址直接调用 ==========
        const httpUrl = config.fc.httpUrl;
        console.log(`[FC Service] Invoking FC via HTTP Trigger: ${httpUrl} (type: ${params.type}, book: ${params.bookId})`);
        
        try {
            const response = await axios.post(httpUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    // 指定异步执行，FC 立即返回 202 Accepted，函数在后台运行
                    'x-fc-invocation-type': 'Async',
                },
                timeout: 15000, // 15 秒超时（为冷启动预留充足时间）
            });

            console.log(`[FC Service] FC HTTP Trigger responded: status=${response.status}`);
            return true;
        } catch (error: any) {
            // 提取可读的错误信息
            const errMsg = error.response
                ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
                : error.message;
            console.error(`[FC Service] Failed to invoke FC via HTTP Trigger:`, errMsg);
            throw new Error(`FC invocation failed: ${errMsg}`);
        }
    }
}

export const fcService = new FcService();
