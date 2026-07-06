import { toBlob } from 'html-to-image';
import axios from 'axios';

/**
 * 捕获特定 DOM 节点为 WebP 格式的 Blob
 * @param element 目标 DOM 节点
 */
export async function captureCoverToBlob(element: HTMLElement): Promise<Blob | null> {
    try {
        // 给字体和图片一些准备时间，确保渲染完毕
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 动态计算目标尺寸，将宽度等比例缩放到 360px，大幅降低多媒体体积
        const originalWidth = element.offsetWidth || 360;
        const originalHeight = element.offsetHeight || 509;
        const targetWidth = 360;
        const targetHeight = Math.round(targetWidth * (originalHeight / originalWidth));

        const blob = await toBlob(element, {
            quality: 0.82,
            type: 'image/webp',
            pixelRatio: 1, // 禁用高分屏倍图，从根本上防止文件体积膨胀
            canvasWidth: targetWidth,
            canvasHeight: targetHeight,
            // 过滤掉所有标注为 canvas-editor-ui 的辅助控件，保证图片干净
            filter: (node) => {
                if (node instanceof HTMLElement) {
                    if (node.classList.contains('canvas-editor-ui')) {
                        return false;
                    }
                }
                return true;
            },
        });
        return blob;
    } catch (error) {
        console.error('Failed to capture DOM node to WebP blob:', error);
        return null;
    }
}

/**
 * 获取预签名上传链接并将缩略图 Blob 上传到 OSS/S3 的固定地址
 * @param bookId 书籍 ID
 * @param blob WebP 图片 Blob
 */
export async function uploadCoverThumbnail(
    bookId: string,
    blob: Blob
): Promise<{ url: string; ossKey: string } | null> {
    try {
        const customKey = `uploads/books/${bookId}/cover.webp`;

        // 1. 请求后端的预签名直传凭证（使用全局 axios 触发，以携带 Token 与 API 相对前缀）
        const res = await axios.get('/upload/presigned', {
            params: {
                fileName: 'cover.webp',
                contentType: 'image/webp',
                customKey,
            },
        });

        if (!res.data || !res.data.success) {
            throw new Error('Failed to get presigned upload URL from backend');
        }

        const { uploadUrl, ossKey, url } = res.data.data;

        // 2. 利用纯净的 axios 实例直传 OSS，避免携带 Bearer Token 头而破坏预签名
        const uploadAxios = axios.create({ baseURL: '' }); // 纯净的 axios 实例
        await uploadAxios.put(uploadUrl, blob, {
            headers: {
                'Content-Type': 'image/webp',
            },
        });

        return { url, ossKey };
    } catch (error) {
        console.error('Failed to upload cover thumbnail:', error);
        return null;
    }
}

/**
 * 获取预签名直传链接，将页面模板的缩略图 Blob 直传至 OSS/S3
 * @param templateId 模板唯一标识 ID
 * @param blob 截屏转换成的 WebP Blob
 */
export async function uploadTemplateThumbnail(
    templateId: string,
    blob: Blob
): Promise<{ url: string; ossKey: string } | null> {
    try {
        const customKey = `uploads/templates/${templateId}/thumbnail.webp`;

        // 1. 请求后端的预签名直传凭证
        const res = await axios.get('/upload/presigned', {
            params: {
                fileName: 'thumbnail.webp',
                contentType: 'image/webp',
                customKey,
            },
        });

        if (!res.data || !res.data.success) {
            throw new Error('Failed to get presigned upload URL for template');
        }

        const { uploadUrl, ossKey, url } = res.data.data;

        // 2. 直传 OSS
        const uploadAxios = axios.create({ baseURL: '' });
        await uploadAxios.put(uploadUrl, blob, {
            headers: {
                'Content-Type': 'image/webp',
            },
        });

        return { url, ossKey };
    } catch (error) {
        console.error('Failed to upload template thumbnail:', error);
        return null;
    }
}

/**
 * 根据云厂商规则拼接图片缩略图裁剪参数，以极大提升网络加载速度和防止内存溢出卡顿
 * @param url 原始图片 URL
 * @param width 目标最大宽度（像素）
 */
export function getResizeImageUrl(url: string | undefined, width = 300): string {
    if (!url) return '';
    
    // 如果是 Base64 或者是动态虚拟路径，不加参数
    if (url.startsWith('data:') || url.startsWith('blob:')) {
        return url;
    }

    // 针对腾讯云 COS 域名使用腾讯云样式参数
    if (url.includes('cos.') || url.includes('myqcloud.com')) {
        return `${url}?imageMogr2/thumbnail/${width}x/interlace/1`;
    }
    
    // 默认兜底使用阿里云 OSS 样式（包括 media.foez.top）
    return `${url}?x-oss-process=image/resize,w_${width}/format,webp/quality,q_80`;
}
