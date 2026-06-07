import type { Book, Chapter, Page } from '../types';

/**
 * 将书籍进行克隆并彻底过滤掉原作者图片和正文隐私数据，只保留章节骨架和页面排版 ID
 * 
 * @param originalBook 原始被克隆的公开书籍
 * @param currentUserId 当前登录用户 ID
 * @returns 脱敏后的全新排版模板书籍对象
 */
export const cloneBookLayout = (originalBook: Book, currentUserId: string): Book => {
    // 1. 克隆章节与页面结构，实施脱敏
    const clonedChapters: Chapter[] = originalBook.chapters.map((chapter): Chapter => {
        const clonedPages: Page[] = chapter.pages.map((page): Page => {
            // 对每一页进行个人数据清除，保留排版 ID (layout)
            return {
                id: crypto.randomUUID(),
                layout: page.layout,
                content: page.content ? '在此处键入您的时光记忆...' : '', // 提示性占位文本
                photos: page.photos.map(photo => {
                    // 保留 slotIndex 插槽索引以固定排版结构，彻底清除真实链接与 OSS 键
                    return {
                        id: crypto.randomUUID(),
                        url: '', // 清空原始图片地址
                        caption: '', // 清空配文
                        slotIndex: photo.slotIndex,
                        styleType: photo.styleType || 'normal',
                        filterType: 'none'
                    };
                })
            };
        });

        return {
            id: crypto.randomUUID(),
            title: chapter.title,
            date: chapter.date || new Date().toISOString().split('T')[0],
            pages: clonedPages
        };
    });

    // 2. 构造干净的书籍壳层
    const clonedBook: Book = {
        id: crypto.randomUUID(),
        userId: currentUserId,
        title: `${originalBook.title} (套用排版)`,
        author: '', // 保存时会自动填充当前用户名
        createdAt: Date.now(),
        chapters: clonedChapters,
        theme: originalBook.theme || 'classic',
        pageSize: originalBook.pageSize || 'A4',
        preface: originalBook.preface ? '在此处撰写您的卷首寄语...' : undefined,
        isPublic: false,
        status: 'private',
        coverUrl: undefined,
        coverThumbnailUrl: undefined,
        coverOssKey: undefined
    };
    
    return clonedBook;
};
