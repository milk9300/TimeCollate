import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../../config/index.js';
import { IStorageService } from './IStorageService.js';
import { UploadResult } from '../OssService.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import crypto from 'crypto';

function hmac(key: Buffer | string, string: string): Buffer {
    return crypto.createHmac('sha256', key).update(string).digest();
}

function hexHmac(key: Buffer | string, string: string): string {
    return crypto.createHmac('sha256', key).update(string).digest('hex');
}

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
    const kDate = hmac('AWS4' + key, dateStamp);
    const kRegion = hmac(kDate, regionName);
    const kService = hmac(kRegion, serviceName);
    const kSigning = hmac(kService, 'aws4_request');
    return kSigning;
}

/**
 * Cloudflare R2 / S3 兼容对象存储驱动实现
 */
export class R2StorageService implements IStorageService {
    private client: S3Client;

    constructor() {
        const cleanRegion = config.oss.region.startsWith('oss-')
            ? config.oss.region.slice(4)
            : config.oss.region;

        const endpoint = config.oss.customDomain 
            ? config.oss.customDomain 
            : `https://oss-${cleanRegion}.aliyuncs.com`;

        this.client = new S3Client({
            region: config.oss.region,
            endpoint: endpoint.startsWith('http') ? endpoint : `https://${endpoint}`,
            credentials: {
                accessKeyId: config.oss.accessKeyId,
                secretAccessKey: config.oss.secretAccessKey,
            },
        });
    }

    /**
     * 服务端上传（中转模式）
     */
    async uploadFile(buffer: Buffer, originalName: string): Promise<UploadResult> {
        const ext = path.extname(originalName).toLowerCase();
        const dateFolder = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
        const fileName = `${uuidv4()}${ext}`;
        const ossKey = `${config.oss.prefix}${dateFolder}/${fileName}`;

        const command = new PutObjectCommand({
            Bucket: config.oss.bucket,
            Key: ossKey,
            Body: buffer,
            ContentType: this.getContentType(ext),
            CacheControl: 'max-age=31536000',
        });

        await this.client.send(command);

        const url = this.getSignedUrl(ossKey, 7200);
        return { url, ossKey };
    }

    /**
     * 获取客户端直传的预签名 URL（PUT 方式上传）
     */
    async getPresignedUploadUrl(originalName: string, contentType: string, expires?: number): Promise<{ uploadUrl: string; ossKey: string }> {
        const ext = path.extname(originalName).toLowerCase();
        const dateFolder = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
        const fileName = `${uuidv4()}${ext}`;
        const ossKey = `${config.oss.prefix}${dateFolder}/${fileName}`;

        const command = new PutObjectCommand({
            Bucket: config.oss.bucket,
            Key: ossKey,
            ContentType: contentType,
        });

        const uploadUrl = await getS3SignedUrl(this.client, command, {
            expiresIn: expires || 900,
        });

        return { uploadUrl, ossKey };
    }

    /**
     * 删除文件
     */
    async deleteFile(key: string): Promise<void> {
        if (!key) return;
        const command = new DeleteObjectCommand({
            Bucket: config.oss.bucket,
            Key: key,
        });
        await this.client.send(command);
    }

    /**
     * 同步获取访问签名 URL (S3 Signature Version 4 纯内存计算实现)
     */
    getSignedUrl(key: string, expires: number = 3600, style?: string): string {
        if (!key) return '';
        const cleanKey = key.startsWith('/') ? key.slice(1) : key;

        const accessKeyId = config.oss.accessKeyId;
        const secretAccessKey = config.oss.secretAccessKey;
        const region = config.oss.region.startsWith('oss-') ? config.oss.region.slice(4) : config.oss.region;
        const bucket = config.oss.bucket;

        const cleanRegion = config.oss.region.startsWith('oss-')
            ? config.oss.region.slice(4)
            : config.oss.region;

        const host = `${bucket}.oss-${cleanRegion}.aliyuncs.com`;
        const endpoint = config.oss.customDomain 
            ? config.oss.customDomain.replace(/^https?:\/\//, '') 
            : host;

        const amzDate = new Date().toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
        const dateStamp = amzDate.slice(0, 8);
        const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

        const queryParams: Record<string, string> = {
            'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
            'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
            'X-Amz-Date': amzDate,
            'X-Amz-Expires': expires.toString(),
            'X-Amz-SignedHeaders': 'host',
        };

        const sortedQuery = Object.entries(queryParams)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');

        const canonicalRequest = [
            'GET',
            `/${cleanKey.split('/').map(encodeURIComponent).join('/')}`,
            sortedQuery,
            `host:${endpoint}\n`,
            'host',
            'UNSIGNED-PAYLOAD'
        ].join('\n');

        const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');

        const stringToSign = [
            'AWS4-HMAC-SHA256',
            amzDate,
            credentialScope,
            hashedCanonicalRequest
        ].join('\n');

        const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, 's3');
        const signature = hexHmac(signingKey, stringToSign);

        const protocol = config.oss.customDomain && config.oss.customDomain.startsWith('http:') ? 'http' : 'https';
        let signedUrl = `${protocol}://${endpoint}/${cleanKey}?${sortedQuery}&X-Amz-Signature=${signature}`;

        if (style) {
            let processStr = style;
            if (style === 'thumbnail') {
                processStr = 'image/resize,w_300/format,webp/quality,q_60';
            } else if (style === 'normal') {
                processStr = 'image/resize,w_1080/format,webp/quality,q_80';
            }
            signedUrl += `&x-oss-process=${encodeURIComponent(processStr)}`;
        }

        return signedUrl;
    }

    /**
     * 获取文件流
     */
    async getFileStream(key: string): Promise<NodeJS.ReadableStream> {
        const command = new GetObjectCommand({
            Bucket: config.oss.bucket,
            Key: key,
        });
        const response = await this.client.send(command);
        if (!response.Body) {
            throw new Error(`Failed to get stream from S3 for key: ${key}`);
        }
        return response.Body as NodeJS.ReadableStream;
    }

    /**
     * 统计存储桶数据
     */
    async getBucketStat(): Promise<{ storage: number; objectCount: number }> {
        let totalSize = 0;
        let objectCount = 0;
        let isTruncated = true;
        let continuationToken: string | undefined = undefined;

        while (isTruncated) {
            const command: ListObjectsV2Command = new ListObjectsV2Command({
                Bucket: config.oss.bucket,
                ContinuationToken: continuationToken,
            });
            const response: any = await this.client.send(command);
            objectCount += response.KeyCount || 0;
            if (response.Contents) {
                for (const obj of response.Contents) {
                    totalSize += obj.Size || 0;
                }
            }
            isTruncated = response.IsTruncated || false;
            continuationToken = response.NextContinuationToken;
        }

        return {
            storage: totalSize,
            objectCount,
        };
    }

    /**
     * 提取 Key 逻辑
     */
    extractKey(url: string): string | null {
        try {
            const urlObj = new URL(url);
            
            if (config.oss.customDomain && url.includes(config.oss.customDomain)) {
                const key = url.split(config.oss.customDomain)[1];
                const cleanKey = key.startsWith('/') ? key.slice(1) : key;
                const cleanKeyWithoutQuery = cleanKey.split('?')[0];
                if (cleanKeyWithoutQuery.startsWith(config.oss.prefix)) {
                    return cleanKeyWithoutQuery;
                }
            }

            const key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
            let cleanKey = key;
            if (cleanKey.startsWith(config.oss.bucket + '/')) {
                cleanKey = cleanKey.slice(config.oss.bucket.length + 1);
            }
            const cleanKeyWithoutQuery = cleanKey.split('?')[0];
            if (cleanKeyWithoutQuery.startsWith(config.oss.prefix)) {
                return cleanKeyWithoutQuery;
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
