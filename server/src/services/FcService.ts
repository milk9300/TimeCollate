import { Readable } from 'stream';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import FC20230330, * as $FC20230330 from '@alicloud/fc20230330';
import * as $OpenApi from '@alicloud/openapi-client';
import { config } from '../config/index.js';
import { pool } from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FcService {
    private client: any = null;

    constructor() {
        const accessKeyId = config.oss.accessKeyId;
        const accessKeySecret = config.oss.secretAccessKey;
        const endpoint = config.fc.endpoint;

        if (accessKeyId && accessKeySecret && endpoint) {
            const apiConfig = new $OpenApi.Config({
                accessKeyId,
                accessKeySecret,
                endpoint,
            });
            const ClientClass = (FC20230330 as any).default || FC20230330;
            this.client = new ClientClass(apiConfig);
        } else {
            console.warn('[FC Service] FC configurations (endpoint) missing. Video export will not function.');
        }
    }

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

        const payload = JSON.stringify({
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
        });

        // 判定是否使用本地开发降级模拟 (development 环境或未配置 FC_ENDPOINT)
        const isLocal = config.nodeEnv === 'development' || !config.fc.endpoint;

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
                
                const mockEvent = Buffer.from(payload);
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

        if (!this.client) {
            throw new Error('Alibaba Cloud FC SDK Client is not initialized. Check your environment variables.');
        }

        // 构造流数据作为请求 Body
        const bodyStream = new Readable();
        bodyStream.push(payload);
        bodyStream.push(null);

        // 指定异步执行 Header: x-fc-invocation-type = Async
        const invokeHeaders: Record<string, string> = {
            'x-fc-invocation-type': 'Async',
        };

        const invokeRequest = new $FC20230330.InvokeFunctionRequest({
            body: bodyStream,
        });
        invokeRequest.headers = invokeHeaders;

        const functionName = config.fc.functionName;
        console.log(`[FC Service] Invoking FC function "${functionName}" asynchronously for book ${params.bookId} (type: ${params.type})...`);
        
        try {
            await this.client.invokeFunction(functionName, invokeRequest);
            console.log(`[FC Service] FC function invoked successfully.`);
            return true;
        } catch (error) {
            console.error('[FC Service] Failed to invoke FC function:', error);
            throw error;
        }
    }
}

export const fcService = new FcService();
