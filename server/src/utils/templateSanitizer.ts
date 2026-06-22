import { CanvasElement, CanvasBackgroundConfig } from '../types/index.js';
import { assetPromotionService } from '../services/AssetPromotionService.js';

/**
 * 将设计师的画布页面转换为纯净模板排版 Schema
 * 针对照片框组件：若包含私有上传的照片，触发一键转公（Asset Promotion）逻辑；
 * 针对文本框组件：脱敏替换内容为占位词，但完整保留字体、字号、颜色和排版位置。
 */
export async function sanitizePageToTemplate(
    pageElements: CanvasElement[],
    backgroundConfig: CanvasBackgroundConfig,
    creatorId: string
): Promise<{ background: CanvasBackgroundConfig; elements: CanvasElement[] }> {
    
    const sanitizedElements = await Promise.all(
        pageElements.map(async (el): Promise<CanvasElement> => {
            // 深拷贝，防止污染活动状态
            const element = JSON.parse(JSON.stringify(el));

            switch (element.type) {
                case 'photo-frame':
                    if (element.photo) {
                        const photoUrl = element.photo.url;
                        // 如果是私有图片资产，则触发一键转公
                        if (assetPromotionService.isPrivateAsset(photoUrl)) {
                            try {
                                const promoted = await assetPromotionService.promoteAssetToPublic(
                                    element.photo,
                                    creatorId
                                );
                                return {
                                    ...element,
                                    photo: {
                                        ...element.photo,
                                        id: promoted.sysAssetUuid,
                                        url: promoted.publicUrl,
                                        ossKey: promoted.publicOssKey,
                                        caption: '' // 清空创作者私有配文
                                    }
                                };
                            } catch (err) {
                                console.error('[Sanitizer] Asset promotion failed, fallback to empty slot:', err);
                                return {
                                    ...element,
                                    photo: null,
                                    placeholder: 'photo-placeholder'
                                };
                            }
                        }
                    }
                    // 普通系统公版图或者没有照片，保留原图结构但清空私人配文
                    return {
                        ...element,
                        photo: element.photo ? { ...element.photo, caption: '' } : null,
                        placeholder: 'photo-placeholder'
                    };

                case 'text':
                    // 脱敏替换内容为通用引导语，但保留所有其他排版配置（fontFamily, color 等）
                    return {
                        ...element,
                        textConfig: {
                            ...element.textConfig,
                            content: getPlaceholderByRole(element.role)
                        }
                    };

                case 'sticker':
                case 'shape':
                    // 贴纸和形状是排版装点的一部分，原样保留
                    return element;

                default:
                    throw new Error(`Unsupported element type for template sanitization: ${(element as any).type}`);
            }
        })
    );

    return {
        background: {
            color: backgroundConfig.color || '#FFFFFF',
            gridPattern: !!backgroundConfig.gridPattern,
            // 只有系统内置的背景主题图片可以复用，创作者私人上传的背景大图不予保留
            backgroundImage: backgroundConfig.isSystemTheme ? backgroundConfig.backgroundImage : undefined,
            isSystemTheme: backgroundConfig.isSystemTheme
        },
        elements: sanitizedElements
    };
}

/**
 * 依据文本所担当的角色返回对应的提示占位文字
 */
function getPlaceholderByRole(role?: string): string {
    if (role === 'chapter-title') return '章节标题';
    if (role === 'chapter-date') return '2026.06.22';
    return '双击输入此处的感悟文字...';
}
