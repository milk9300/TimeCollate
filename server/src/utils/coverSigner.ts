import { getSignedUrl } from '../services/OssService.js';

/**
 * 集中化签名与格式化书籍封面 URL
 * 确保 `design://` 排版协议中的图片能够获取到新鲜有效的 OSS 签名，同时保留背景色和版式设置。
 *
 * @param coverUrl 数据库中存储的原始 cover_url (可能为 design://... 或普通物理 URL)
 * @param coverOssKey 数据库中存储的 cover_oss_key
 * @param expires 签名有效期，默认 7200 秒 (2小时)
 * @param style OSS 图片处理参数 (如缩略图样式)
 * @returns 签名后的完整 URL，或 null
 */
export function signCoverUrl(
    coverUrl: string | null | undefined,
    coverOssKey: string | null | undefined,
    expires: number = 7200,
    style?: string
): string | null {
    if (!coverUrl) return null;

    // 如果是 design:// 排版序列化协议
    if (coverUrl.startsWith('design://')) {
        try {
            const urlParts = coverUrl.split('?');
            const baseUrl = urlParts[0];
            const queryString = urlParts[1] || '';
            const params = new URLSearchParams(queryString);

            // 优先从 design:// 参数中提取 ossKey
            let ossKey = params.get('ossKey');
            if (ossKey) {
                ossKey = decodeURIComponent(ossKey);
            }

            // 备用：从数据库字段 coverOssKey 提取
            if (!ossKey && coverOssKey) {
                ossKey = coverOssKey;
            }

            if (ossKey) {
                // 生成带新鲜有效签名的 OSS 链接
                const signedImage = getSignedUrl(ossKey, expires, style);
                
                // 由于 nested query params 解析规范，此处写入必须经过 encodeURIComponent。
                // 这样在最终 url.toString() 时才能保证 URL 安全，防止 + & = 等特殊字符造成二级解析分裂。
                params.set('image', encodeURIComponent(signedImage));
                params.set('ossKey', encodeURIComponent(ossKey));
            }

            return `${baseUrl}?${params.toString()}`;
        } catch (e) {
            console.error('Failed to sign designed coverUrl:', coverUrl, e);
            return coverUrl;
        }
    }

    // 后向兼容：如果是普通的物理图片 URL 链接 (非 design://)
    if (coverOssKey) {
        return getSignedUrl(coverOssKey, expires, style);
    }

    // 既不是 design://，又没有 cover_oss_key，直接返回原图 URL（兼容 blob/data 或者是无 OSS 管理的外部图片链接）
    return coverUrl && !coverUrl.startsWith('blob:') && !coverUrl.startsWith('data:') ? coverUrl : null;
}
