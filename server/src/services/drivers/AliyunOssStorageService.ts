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
    async getPresignedUploadUrl(originalName: string, contentType: string, expires?: number): Promise<{ uploadUrl: string; ossKey: string }> {
        const ext = path.extname(originalName).toLowerCase();
        const dateFolder = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
        const fileName = `${uuidv4()}${ext}`;
        const ossKey = `${config.oss.prefix}${dateFolder}/${fileName}`;

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

        const options: any = {
            expires,
        };

        if (style) {
            let processStr = style;
            if (style === 'thumbnail') {
                // 编辑回显使用缩略图：缩放到300宽度，转为 WebP 格式，画质调为 60
                processStr = 'image/resize,w_300/format,webp/quality,q_60';
            } else if (style === 'normal') {
                // 大图预览：缩放到1080宽度，转为 WebP 格式，画质为 80
                processStr = 'image/resize,w_1080/format,webp/quality,q_80';
            }
            options.process = processStr;
        }

        let signedUrl = this.client.signatureUrl(cleanKey, options);

        if (config.oss.customDomain) {
            try {
                const urlObj = new URL(signedUrl);
                const customDomainUrl = new URL(config.oss.customDomain);
                urlObj.protocol = customDomainUrl.protocol;
                urlObj.host = customDomainUrl.host;
                if (customDomainUrl.pathname !== '/') {
                    urlObj.pathname = path.join(customDomainUrl.pathname, urlObj.pathname);
                }
                signedUrl = urlObj.toString();
            } catch (e) {
                console.error('Failed to rewrite OSS URL with custom domain:', e);
            }
        }

        return signedUrl;
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
}
