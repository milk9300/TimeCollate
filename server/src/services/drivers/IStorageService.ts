import { UploadResult } from '../OssService.js';

/**
 * 对象存储服务统一驱动接口
 */
export interface IStorageService {
    /**
     * 服务端上传文件（中转上传/降级方案）
     */
    uploadFile(buffer: Buffer, originalName: string): Promise<UploadResult>;

    /**
     * 获取客户端直传的预签名 URL（PUT 方式上传）
     */
    getPresignedUploadUrl(originalName: string, contentType: string, expires?: number): Promise<{ uploadUrl: string; ossKey: string }>;

    /**
     * 删除文件
     */
    deleteFile(key: string): Promise<void>;

    /**
     * 获取临时访问签名 URL（支持图片处理样式）
     */
    getSignedUrl(key: string, expires?: number, style?: string): string;

    /**
     * 获取文件只读流（用于后端导出等任务）
     */
    getFileStream(key: string): Promise<NodeJS.ReadableStream>;

    /**
     * 获取存储桶统计数据
     */
    getBucketStat(): Promise<{ storage: number; objectCount: number }>;

    /**
     * 提取图片 URL 中的存储 Key
     */
    extractKey(url: string): string | null;

    /**
     * 获取文件大小（字节数）
     */
    getFileSize(key: string): Promise<number>;
}
