import { pool } from '../db/index.js';
import { storageService, extractOssKey } from './OssService.js';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export interface PromotedAssetResult {
    sysAssetUuid: string;
    publicUrl: string;
    publicOssKey: string;
}

export class AssetPromotionService {
    /**
     * 判断是否为用户私有图片 (以 blob: 开头，或者是 user-uploads 目录)
     */
    isPrivateAsset(url: string): boolean {
        return url.startsWith('blob:') || url.startsWith('data:') || url.includes('/user-uploads/') || !url.includes('/public/gallery/');
    }

    /**
     * 将创作者的私照升级为公共资产，并在 assets 表中注册 (user_id = null)
     */
    async promoteAssetToPublic(photo: { id: string; url: string; ossKey?: string }, creatorId: string): Promise<PromotedAssetResult> {
        let privateOssKey = photo.ossKey;
        
        if (!privateOssKey) {
            privateOssKey = extractOssKey(photo.url) || undefined;
        }

        if (!privateOssKey) {
            throw new Error(`Failed to extract OSS Key from private photo URL: ${photo.url}`);
        }

        console.log(`[AssetPromotion] Promoting private asset: ${privateOssKey} uploaded by creator: ${creatorId}`);

        // 1. 获取文件 ReadStream
        const stream = await storageService.getFileStream(privateOssKey);
        const chunks: any[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // 2. 使用 sharp 强行擦除 EXIF 隐私元数据 (sharp 默认在不显式调用 withMetadata 时不写入 EXIF)
        let cleanBuffer: Buffer;
        try {
            cleanBuffer = await sharp(buffer).toBuffer();
            console.log(`[AssetPromotion] Successfully stripped EXIF metadata from photo.`);
        } catch (err) {
            console.error('[AssetPromotion] Sharp processing failed, falling back to original buffer:', err);
            cleanBuffer = buffer;
        }

        // 3. 上传净化后的文件到 OSS
        const originalName = path.basename(privateOssKey);
        // 使用 storageService.uploadFile
        const uploadResult = await storageService.uploadFile(cleanBuffer, originalName);

        // 4. 插入 assets 表 (user_id = NULL 表示系统公开资产)
        const sysAssetUuid = `sys-asset-${uuidv4()}`;
        const now = Date.now();

        await pool.query(
            `INSERT INTO assets (id, user_id, type, name, url, thumbnail, oss_key, size, created_at)
             VALUES (?, NULL, 'photo', ?, ?, ?, ?, ?, ?)`,
            [
                sysAssetUuid,
                originalName,
                uploadResult.url,
                uploadResult.url, // thumbnail
                uploadResult.ossKey,
                cleanBuffer.length,
                now
            ]
        );

        // 5. 插入 photo_metadata 表以保持表关联完整性
        await pool.query(
            `INSERT INTO photo_metadata (id, asset_id, ai_tags) VALUES (?, ?, ?)`,
            [uuidv4(), sysAssetUuid, '[]']
        );

        console.log(`[AssetPromotion] Successfully promoted private photo to public asset. New ID: ${sysAssetUuid}`);

        return {
            sysAssetUuid,
            publicUrl: uploadResult.url,
            publicOssKey: uploadResult.ossKey
        };
    }
}

export const assetPromotionService = new AssetPromotionService();
