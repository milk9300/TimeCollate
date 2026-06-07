import { config } from '../config/index.js';
import { IStorageService } from './drivers/IStorageService.js';
import { AliyunOssStorageService } from './drivers/AliyunOssStorageService.js';
import { R2StorageService } from './drivers/R2StorageService.js';

export interface UploadResult {
    url: string;        // 访问 URL
    ossKey: string;     // OSS 存储键
}

/**
 * 实例化底层对象存储驱动。根据 config.storageProvider 动态切换具体驱动。
 */
export const storageService: IStorageService = config.storageProvider === 'r2'
    ? new R2StorageService()
    : new AliyunOssStorageService();

/**
 * 获取存储统计信息
 */
export async function getBucketStat(): Promise<{ storage: number; objectCount: number }> {
    return storageService.getBucketStat();
}

/**
 * 上传文件到云存储（服务端中转模式，常用于备份、系统自动导出等）
 */
export async function uploadToOss(
    buffer: Buffer,
    originalName: string
): Promise<UploadResult> {
    return storageService.uploadFile(buffer, originalName);
}

/**
 * 获取客户端直传的预签名 URL（PUT 方式上传）
 * @param originalName 原始文件名（用于生成具有后缀的唯一存储 key）
 * @param contentType 文件 MIME 类型，客户端上传时必须提供一致的 Content-Type 头
 * @param expires 预签名 URL 有效期（秒），默认 15 分钟
 */
export async function getPresignedUploadUrl(
    originalName: string,
    contentType: string,
    expires?: number
): Promise<{ uploadUrl: string; ossKey: string }> {
    return storageService.getPresignedUploadUrl(originalName, contentType, expires);
}

/**
 * 删除文件
 * @param ossKey OSS 存储键
 */
export async function deleteFromOss(ossKey: string): Promise<void> {
    return storageService.deleteFile(ossKey);
}

/**
 * 获取访问签名 URL（同步方式，支持云端动态裁剪处理）
 * @param ossKey OSS 存储键
 * @param expires 过期时间（秒），默认 3600
 * @param process 图像裁剪/样式参数。兼容历史传参（如 image/resize...）与预设别名（如 thumbnail, normal）
 */
export function getSignedUrl(ossKey: string, expires: number = 3600, process?: string): string {
    if (!ossKey) return '';
    return storageService.getSignedUrl(ossKey, expires, process);
}

/**
 * 获取文件只读流
 * @param ossKey OSS 存储键
 */
export async function getOssStream(ossKey: string): Promise<NodeJS.ReadableStream> {
    return storageService.getFileStream(ossKey);
}

/**
 * 从 URL 中解析和提取 OSS Key
 * @param url
 */
export function extractOssKey(url: string): string | null {
    return storageService.extractKey(url);
}

/**
 * 集中化签名与格式化用户头像 URL
 * @param avatarUrl 数据库中存储的原始头像 URL (可能包含已过期的签名)
 * @param expires 签名有效期，默认 7200 秒 (2小时)
 * @returns 签名后的完整 URL，或 null/原样返回
 */
export function signAvatarUrl(avatarUrl: string | null | undefined, expires: number = 7200): string | null {
    if (!avatarUrl) return null;
    const ossKey = extractOssKey(avatarUrl);
    if (ossKey) {
        return getSignedUrl(ossKey, expires);
    }
    // 兼容普通非 OSS 物理/外部图片 URL
    return avatarUrl && !avatarUrl.startsWith('blob:') && !avatarUrl.startsWith('data:') ? avatarUrl : null;
}

