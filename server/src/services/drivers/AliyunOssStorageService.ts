import OSS from 'ali-oss';
import { config } from '../../config/index.js';
import { IStorageService } from './IStorageService.js';
import { UploadResult } from '../OssService.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * 阿里云 OSS 对象存储驱动实现
 */
export class AliyunOssStorageService implements IStorageService {
    private client: OSS;

    constructor() {
        const cleanRegion = config.oss.region.startsWith('oss-')
            ? config.oss.region
            : `oss-${config.oss.region}`;

        this.client = new OSS({
            region: cleanRegion,
            accessKeyId: config.oss.accessKeyId,
            accessKeySecret: config.oss.secretAccessKey,
            bucket: config.oss.bucket,
            secure: true,
        });
    }

    /**
     * 服务端上传（中转模式，常用于备份、系统自动导出等）
     */
    async uploadFile(buffer: Buffer, originalName: string): Promise<UploadResult> {
        const ext = path.extname(originalName).toLowerCase();
        const dateFolder = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
        const fileName = `${uuidv4()}${ext}`;
        const ossKey = `${config.oss.prefix}${dateFolder}/${fileName}`;

        const cleanKey = ossKey.startsWith('/') ? ossKey.slice(1) : ossKey;

        await this.client.put(cleanKey, buffer, {
            headers: {
                'Cache-Control': 'max-age=31536000',
                'Content-Disposition': 'inline',
            },
            mime: this.getContentType(ext),
        });

        // 默认生成 2 小时的临时签名 URL 供查看
        const url = await this.getSignedUrl(ossKey, 7200);
        return { url, ossKey };
    }

    /**
     * 获取客户端直传的预签名 URL（PUT 方式上传）
     * 写入操作直接访问阿里云源端 API，避免 CDN 潜在的限制或缓存问题
     */
    async getPresignedUploadUrl(originalName: string, contentType: string, expires?: number, customKey?: string): Promise<{ uploadUrl: string; ossKey: string }> {
        const ext = path.extname(originalName).toLowerCase();
        const dateFolder = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
        const fileName = `${uuidv4()}${ext}`;
        const ossKey = customKey || `${config.oss.prefix}${dateFolder}/${fileName}`;

        const cleanKey = ossKey.startsWith('/') ? ossKey.slice(1) : ossKey;

        const uploadUrl = this.client.signatureUrl(cleanKey, {
            method: 'PUT',
            'Content-Type': contentType,
            expires: expires || 900, // 默认 15 分钟
        });

        return { uploadUrl, ossKey };
    }

    /**
     * 删除文件
     */
    async deleteFile(key: string): Promise<void> {
        if (!key) return;
        const cleanKey = key.startsWith('/') ? key.slice(1) : key;
        await this.client.delete(cleanKey);
    }

    /**
     * 获取访问签名 URL
     * 针对图片，如果指定了 style 参数（如 thumbnail），会利用阿里云 OSS 的 x-oss-process 进行云端动态裁剪与压缩，降低带宽成本
     * 如果配置了自定义域名，则使用自定义域名重写 Host 部分，提供美观且可控的 CDN 地址
     */
    getSignedUrl(key: string, expires: number = 3600, style?: string): string {
        if (!key) return '';
        const cleanKey = key.startsWith('/') ? key.slice(1) : key;

        let processStr = '';
        if (style) {
            processStr = style;
            if (style === 'thumbnail') {
                // 编辑回显使用缩略图：缩放到300宽度，转为 WebP 格式，画质调为 60
                processStr = 'image/resize,w_300/format,webp/quality,q_60';
            } else if (style === 'normal') {
                // 大图预览：缩放到1080宽度，转为 WebP 格式，画质为 80
                processStr = 'image/resize,w_1080/format,webp/quality,q_80';
            }
        }

        const querySuffix = processStr ? `?x-oss-process=${processStr}` : '';

        // 如果配置了自定义域名，直接拼接自定义域名和 key（公共读且不带过期签名）
        if (config.oss.customDomain) {
            try {
                let baseDomain = config.oss.customDomain;
                if (!/^https?:\/\//i.test(baseDomain)) {
                    baseDomain = `https://${baseDomain}`;
                }
                if (baseDomain.endsWith('/')) {
                    baseDomain = baseDomain.slice(0, -1);
                }
                return `${baseDomain}/${cleanKey}${querySuffix}`;
            } catch (e) {
                console.error('Failed to format OSS URL with custom domain:', e);
            }
        }

        // 备用：默认使用阿里云公共读域名拼接
        return `https://${config.oss.bucket}.${config.oss.region}.aliyuncs.com/${cleanKey}${querySuffix}`;
    }

    /**
     * 获取文件的 ReadStream 流
     */
    async getFileStream(key: string): Promise<NodeJS.ReadableStream> {
        const cleanKey = key.startsWith('/') ? key.slice(1) : key;
        const result = await this.client.getStream(cleanKey);
        return result.stream;
    }

    /**
     * 统计存储桶数据
     */
    async getBucketStat(): Promise<{ storage: number; objectCount: number }> {
        let totalSize = 0;
        let objectCount = 0;
        let marker: string | undefined = undefined;
        let isTruncated = true;

        while (isTruncated) {
            const result: any = await this.client.list({
                marker,
                'max-keys': 1000,
            }, {});

            if (result.objects) {
                for (const obj of result.objects) {
                    totalSize += obj.size || 0;
                }
                objectCount += result.objects.length;
            }

            isTruncated = result.isTruncated;
            marker = result.nextMarker;
        }

        return {
            storage: totalSize,
            objectCount,
        };
    }

    /**
     * 从 URL 提取 OSS Key
     */
    extractKey(url: string): string | null {
        try {
            const urlObj = new URL(url);

            // 匹配自定义域名
            if (config.oss.customDomain && url.includes(config.oss.customDomain)) {
                const key = url.split(config.oss.customDomain)[1];
                const cleanKey = key.startsWith('/') ? key.slice(1) : key;
                const cleanKeyWithoutQuery = cleanKey.split('?')[0];
                if (cleanKeyWithoutQuery.startsWith(config.oss.prefix)) {
                    return cleanKeyWithoutQuery;
                }
            }

            // 匹配阿里云默认域名
            if (urlObj.hostname.includes('aliyuncs.com')) {
                const key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
                let cleanKey = key;
                if (cleanKey.startsWith(config.oss.bucket + '/')) {
                    cleanKey = cleanKey.slice(config.oss.bucket.length + 1);
                }
                const cleanKeyWithoutQuery = cleanKey.split('?')[0];
                if (cleanKeyWithoutQuery.startsWith(config.oss.prefix)) {
                    return cleanKeyWithoutQuery;
                }
            }
        } catch (e) {
            return null;
        }
        return null;
    }

    /**
     * 获取文件大小（字节数）
     */
    async getFileSize(key: string): Promise<number> {
        if (!key) return 0;
        const cleanKey = key.startsWith('/') ? key.slice(1) : key;
        try {
            const result = await this.client.head(cleanKey);
            return parseInt((result.res.headers as any)['content-length'] || '0', 10);
        } catch (e) {
            console.error('Failed to get Aliyun OSS file size:', e);
            return 0;
        }
    }

    /**
     * 根据扩展名匹配 Content-Type
     */
    private getContentType(ext: string): string {
        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.heic': 'image/heic',
            '.heif': 'image/heif',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * 为存储桶自动配置并更新 CORS 规则，允许跨域访问字体文件
     */
    async setupBucketCORS(): Promise<void> {
        try {
            console.log(`📡 正在为 OSS 存储桶 [${config.oss.bucket}] 配置 CORS 跨域规则...`);
            const rules = [
                {
                    allowedOrigin: '*',
                    allowedMethod: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
                    allowedHeader: '*',
                    exposeHeader: ['ETag', 'x-oss-request-id', 'Content-Length'],
                    maxAgeSeconds: 3000
                }
            ];
            await this.client.putBucketCORS(config.oss.bucket, rules as any);
            console.log(`✅ OSS 跨域 CORS 规则配置成功！`);
        } catch (err: any) {
            console.warn(`⚠️ 无法自动配置 OSS CORS: ${err.message}。如果跨域报错，请手动到阿里云控制台为存储桶配置跨域（Allowed Origin: *）。`);
        }
    }
}

