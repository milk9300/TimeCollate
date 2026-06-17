/**
 * @description CDN 动态图片裁剪缩微与格式转换 Helper
 * 代码注释 & Docstring 必须是简体中文
 */
export function getThumbnailUrl(url: string | undefined, width: number = 800): string {
    if (!url) return '';

    // 排除本地 blob、base64 占位、design 协议及本地相对路径
    if (
        url.startsWith('blob:') ||
        url.startsWith('data:') ||
        url.startsWith('design:') ||
        url.startsWith('/')
    ) {
        return url;
    }

    // 如果链接中已经包含 x-oss-process 裁剪说明，不再重复追加
    if (url.includes('x-oss-process')) {
        return url;
    }

    try {
        // 主要是针对阿里云 OSS 链接进行 WebP 转换和限宽
        const isAliOss = url.includes('aliyuncs.com');
        if (isAliOss) {
            const separator = url.includes('?') ? '&' : '?';
            // 拼接阿里云 OSS 动态裁切规则：缩放到指定宽度，并强制输出为更高压缩率的 webp 格式
            return `${url}${separator}x-oss-process=image/resize,w_${width}/format,webp`;
        }
    } catch (e) {
        console.error('Failed to append cdn processing params', e);
    }

    return url;
}
