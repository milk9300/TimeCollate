/**
 * 书籍相关类型定义
 * 与前端 types.ts 保持一致
 */

export interface Photo {
    id: string;
    url: string;
    thumbnailUrl?: string;
    caption?: string;
    width?: number;
    height?: number;
    ossKey?: string;
    scale?: number;
    xOffset?: number;
    yOffset?: number;
    assetId?: string;
}

export interface Page {
    id: string;
    bookId?: string;
    pageTitle?: string;
    isChapterStart?: boolean;
    content: string;
    photos: Photo[];
    layout: string;
    sortOrder?: number;
}

export interface Template {
    id: string;
    name: string;
    photoCount: number;
    category: string;
    layoutSchema: any;
    visibility?: 'private' | 'public';
    creatorId?: string;
    createdAt?: number;
}

export interface BookTheme {
    id: string;
    name: string;
    creatorId: string;
    visibility: 'private' | 'public';
    themeSchema: any;
    createdAt?: number;
}

export type ThemeType = 'classic' | 'modern' | 'warm' | 'magazine';
export type PageSize = 'A4' | 'A5' | 'B5' | 'LETTER';

export interface Book {
    id: string;
    userId: string;
    title: string;
    author: string;
    type?: 'book' | 'template';
    createdAt: number;
    pages: Page[];
    theme: ThemeType;
    pageSize: PageSize;
    coverUrl?: string;
    coverThumbnailUrl?: string;
    coverOssKey?: string;
    preface?: string;
    showPreface?: boolean;
    isPublic?: boolean;
    status?: 'private' | 'pending' | 'published' | 'rejected';
    category?: string;
    views?: number;
    likes?: number;
    favorites?: number;
    liked?: boolean;
    favorited?: boolean;
    pageCount?: number;
    photoCount?: number;
}

export interface Feedback {
    id: string;
    content: string;
    images?: string[]; // OSS keys
    imageUrls?: string[]; // 压缩后的访问地址
    originalImageUrls?: string[]; // 原始/高清访问地址
    userId?: string;
    createdAt: number;
    status?: 'pending' | 'processed' | 'ignored';
    replyContent?: string;
    replyAt?: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

