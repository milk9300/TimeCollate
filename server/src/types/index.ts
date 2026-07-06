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
    templateId: string;
    sortOrder?: number;
    elements?: CanvasElement[];
    background?: CanvasBackgroundConfig;
    thumbnail?: string; // V2 新增：页面缩略图
    templateOriginType?: 'PAGE' | 'COLLECTION';
    templateOriginId?: string;
    pageType?: string;
}

export interface BookCover {
    id: string;
    bookId: string;
    frontElements: CanvasElement[];
    backElements: CanvasElement[];
    frontBackground?: CanvasBackgroundConfig;
    backBackground?: CanvasBackgroundConfig;
    frontThumbnail?: string;
    backThumbnail?: string;
    version: number;
}

//#region Canvas Editor Types
export type CanvasElementType = 'photo-frame' | 'text' | 'sticker' | 'shape';

export interface BaseCanvasElement {
    id: string;
    type: CanvasElementType;
    x: number;       // 百分比相对坐标系 (0 - 100)
    y: number;       // 百分比相对坐标系 (0 - 100)
    width: number;   // 百分比宽度 (0 - 100)
    height: number;  // 百分比高度 (0 - 100)
    rotate: number;  // 顺时针旋转角度 (-360 - 360)
    zIndex: number;  // 图层顺序
    groupId?: string; // 逻辑分组 ID
    locked?: boolean; // 误触编辑锁
    role?: 'chapter-title' | 'chapter-date' | 'page-content' | 'none';
}

export interface PhotoFrameElement extends BaseCanvasElement {
    type: 'photo-frame';
    photo: {
        id: string;
        url: string;
        ossKey?: string;
        scale?: number;
        xOffset?: number; // 百分比偏移 (-100 - 100)
        yOffset?: number; // 百分比偏移 (-100 - 100)
        styleType?: 'normal' | 'rounded' | 'polaroid' | 'film';
        filterType?: 'none' | 'warm' | 'fresh' | 'retro';
        caption?: string;
        assetId?: string;
        width?: number;
        height?: number;
    } | null;
    placeholder?: string;
}

export interface TextElementConfig {
    content: string;
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    lineHeight?: number;
    letterSpacing?: string;
}

export interface TextElement extends BaseCanvasElement {
    type: 'text';
    textConfig: TextElementConfig;
}

export interface StickerElementConfig {
    stickerId: string;
    imageUrl: string;
    colorTint?: string;
}

export interface StickerElement extends BaseCanvasElement {
    type: 'sticker';
    stickerConfig: StickerElementConfig;
}

export interface ShapeElementConfig {
    shapeType: 'rect' | 'circle' | 'triangle' | 'line';
    fillColor?: string;
    borderColor?: string;
    borderWidth?: number;
}

export interface ShapeElement extends BaseCanvasElement {
    type: 'shape';
    shapeConfig: ShapeElementConfig;
}

export type CanvasElement = PhotoFrameElement | TextElement | StickerElement | ShapeElement;

export interface CanvasBackgroundConfig {
    color?: string;
    backgroundImage?: string;
    gridPattern?: boolean;
    isSystemTheme?: boolean;
}

export interface CanvasLayoutSchema {
    background?: CanvasBackgroundConfig;
    elements: CanvasElement[];
}
//#endregion

export interface Template {
    id: string;
    name: string;
    templateType?: 'cover' | 'preface' | 'structural' | 'content';
    photoCount: number;
    category: string;
    layoutSchema: any; // 对应数据库的 elements JSON
    thumbnailUrl?: string;
    visibility?: 'private' | 'public';
    creatorId?: string;
    createdAt?: number;
    tags?: string[];
    coverUrl?: string;
    favoriteCount?: number;
    useCount?: number;
    templateOriginType?: 'PAGE';
    templateOriginId?: string;
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
    updatedAt?: number;
    pages: Page[];
    pageSize: PageSize;
    coverUrl?: string;
    coverThumbnailUrl?: string;
    coverOssKey?: string;
    coverId?: string; // V2 新增：关联封面 ID
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
    templateOriginType?: 'BOOK';
    templateOriginId?: string;
    useCount?: number;
}

export interface TemplateCollection {
    id: string;
    title: string;
    description?: string;
    cover?: string;
    author: string;
    visibility: 'private' | 'public';
    createdAt: number;
    updatedAt?: number;
}

export interface TemplateCollectionItem {
    collectionId: string;
    pageTemplateId: string;
    sort: number;
    pageTemplate?: Template;
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

