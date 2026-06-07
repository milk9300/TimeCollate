import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { uploadToOss, getSignedUrl, getPresignedUploadUrl } from '../services/OssService.js';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response.js';
import type { Photo } from '../types/index.js';

const router = Router();

// 配置 multer 内存存储
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024, // 最大 20MB
    },
    fileFilter: (_req, file, cb) => {
        // 只允许图片类型
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});

/**
 * GET /api/upload/presigned
 * 获取单张图片直传的预签名 URL 和存储 Key
 * Query: fileName - 原始文件名
 * Query: contentType - MIME 类型
 */
router.get('/presigned', async (req, res) => {
    try {
        const fileName = req.query.fileName as string;
        const contentType = req.query.contentType as string;

        if (!fileName || !contentType) {
            return sendBadRequest(res, 'fileName and contentType are required');
        }

        const { uploadUrl, ossKey } = await getPresignedUploadUrl(fileName, contentType);
        const signedUrl = getSignedUrl(ossKey, 7200);

        sendSuccess(res, {
            uploadUrl,
            ossKey,
            url: signedUrl,
        });
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/upload/presigned/batch
 * 批量获取直传的预签名 URL 和存储 Key
 * Body: { files: { fileName: string; contentType: string }[] }
 */
router.post('/presigned/batch', async (req, res) => {
    try {
        const { files } = req.body;

        if (!files || !Array.isArray(files) || files.length === 0) {
            return sendBadRequest(res, 'files array is required');
        }

        const results = [];
        for (const file of files) {
            const { fileName, contentType } = file;
            if (!fileName || !contentType) {
                return sendBadRequest(res, 'Each file must contain fileName and contentType');
            }
            const { uploadUrl, ossKey } = await getPresignedUploadUrl(fileName, contentType);
            const signedUrl = getSignedUrl(ossKey, 7200);
            results.push({
                fileName,
                uploadUrl,
                ossKey,
                url: signedUrl,
            });
        }

        sendSuccess(res, results);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/upload
 * 上传图片到对象存储
 */
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return sendBadRequest(res, 'No file uploaded');
        }

        const { buffer, originalname } = req.file;

        // 旋转扶正图片并擦除 EXIF 地理隐私数据
        const processedImage = sharp(buffer).rotate();
        const processedBuffer = await processedImage.toBuffer();
        const metadata = await sharp(processedBuffer).metadata();
        const width = metadata.width || undefined;
        const height = metadata.height || undefined;

        // 上传到 OSS
        const { ossKey } = await uploadToOss(processedBuffer, originalname);

        // 记录上传流量
        const { trafficService } = await import('../services/TrafficService.js');
        await trafficService.recordTraffic('upload', processedBuffer.length);

        // 生成签名 URL（2小时有效期）
        const signedUrl = getSignedUrl(ossKey, 7200);

        // 返回 Photo 对象
        const photo: Photo = {
            id: uuidv4(),
            url: signedUrl,  // 使用签名 URL
            ossKey,
            caption: '',
            width,
            height,
        };

        sendSuccess(res, photo, 'File uploaded successfully');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/upload/batch
 * 批量上传图片
 */
router.post('/batch', upload.array('files', 10), async (req, res) => {
    try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return sendBadRequest(res, 'No files uploaded');
        }

        const photos: Photo[] = [];
        let totalBytes = 0;

        for (const file of files) {
            // 旋转扶正图片并擦除 EXIF 地理隐私数据
            const processedImage = sharp(file.buffer).rotate();
            const processedBuffer = await processedImage.toBuffer();
            const metadata = await sharp(processedBuffer).metadata();
            const width = metadata.width || undefined;
            const height = metadata.height || undefined;

            const { ossKey } = await uploadToOss(processedBuffer, file.originalname);
            totalBytes += processedBuffer.length;
            const signedUrl = getSignedUrl(ossKey, 7200);
            photos.push({
                id: uuidv4(),
                url: signedUrl,
                ossKey,
                caption: '',
                width,
                height,
            });
        }

        // 记录批量上传总流量
        const { trafficService } = await import('../services/TrafficService.js');
        await trafficService.recordTraffic('upload', totalBytes);

        sendSuccess(res, photos, `${photos.length} files uploaded successfully`);
    } catch (error) {
        sendError(res, error as Error);
    }
});

export default router;
