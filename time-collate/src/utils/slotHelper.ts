import type { Photo } from '../types';

/**
 * @description 获取分配给指定槽位的照片，支持历史遗留扁平数组的兼容
 * @param photos 照片列表
 * @param slotIndex 槽位索引
 * @returns 对应的 Photo 或 undefined
 */
export const getPhotoForSlot = (photos: Photo[] | undefined, slotIndex: number): Photo | undefined => {
    if (!photos) return undefined;

    // 1. 优先匹配显式指定 slotIndex 的照片
    const explicitMatch = photos.find(p => p && p.slotIndex === slotIndex);
    if (explicitMatch) return explicitMatch;

    // 2. 如果没有显式匹配，则退回数组下标匹配，但该照片必须未显式分配其他槽位
    const fallbackPhoto = photos[slotIndex];
    if (fallbackPhoto && fallbackPhoto.slotIndex === undefined) {
        return fallbackPhoto;
    }
    return undefined;
};
