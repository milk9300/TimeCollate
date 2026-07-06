/**
 * @description 图片数据结构
 */
export interface Photo {
  id: string;
  url: string;        // 预览地址 (blob: URL 或 base64)
  thumbnailUrl?: string; // 缩略图地址 (带 OSS 处理参数)
  caption?: string;   // 配文
  width?: number;     // 原始宽度
  height?: number;    // 原始高度
  file?: File;        // 上传的原始文件对象 (仅在上传阶段存在)
  ossKey?: string;    // OSS 存储键
  scale?: number;     // 裁剪缩放比例
  xOffset?: number;   // X 轴偏移量(百分比)
  yOffset?: number;   // Y 轴偏移量(百分比)
  slotIndex?: number;    // 当前分配的槽位索引 (0, 1, 2...)
  styleType?: 'normal' | 'rounded' | 'polaroid' | 'film'; // 图片物理边框样式
  filterType?: 'none' | 'warm' | 'fresh' | 'retro';       // 图片滤镜效果
  assetId?: string;                                       // 资源关联 ID
}

export interface Page {
  id: string;
  bookId?: string;
  pageTitle?: string;
  isChapterStart?: boolean;
  content: string;    // 页面正文
  photos: Photo[];    // 页面图片
  templateId: string;     // 页面布局类型 (支持静态内置或动态模板 ID)
  sortOrder?: number;
  elements?: CanvasElement[]; // 新增：页面自由组件数组
  background?: CanvasBackgroundConfig; // 新增：页面自定义背景配置
  thumbnail?: string; // V2 新增：页面缩略图
  templateOriginType?: 'PAGE' | 'COLLECTION';
  templateOriginId?: string;
  pageType?: string;   // 页面类型 (例如 'cover' | 'inner')
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

export interface Document {
  id: string;
  type: 'cover' | 'page';
  sourceId: string;      // 对应 book_cover.id 或 page.id
  title: string;         // 书封、P1、P2...
  elements: CanvasElement[];
  background: CanvasBackgroundConfig;
  thumbnail: string;
  isChapterStart?: boolean;
  templateId?: string;
}

export interface LayoutElementStyle {
  left: string;
  top: string;
  width: string;
  height: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  color?: string;
  textAlign?: any;
  textShadow?: string;
  borderRadius?: string;
  borderColor?: string;
  borderWidth?: string;
  borderStyle?: string;
  backgroundColor?: string;
  boxShadow?: string;
  zIndex?: number;
  padding?: string;
}

export interface LayoutElement {
  id: string;
  type: 'text' | 'photo';
  role?: 'chapter-title' | 'chapter-date' | 'page-content';
  slotIndex?: number;
  style: LayoutElementStyle;
}

export interface LayoutSchema {
  background?: {
    color?: string;
    gridPattern?: boolean;
  };
  elements: LayoutElement[];
}

//#region Canvas Editor Types
export type CanvasElementType = 'photo-frame' | 'text' | 'sticker' | 'shape';

export interface BaseCanvasElement {
  id: string;
  type: CanvasElementType;
  x: number;       // 虚拟视口绝对坐标系 (例如 A4 宽度基底 1000)
  y: number;       // 虚拟视口绝对坐标系 (例如 A4 高度基底 1414)
  width: number;   // 虚拟宽度 (例如 1000)
  height: number;  // 虚拟高度 (例如 1414)
  rotate: number;  // 顺时针旋转角度 (-360 - 360)
  zIndex: number;  // 图层顺序
  groupId?: string; // 逻辑分组 ID
  locked?: boolean; // 误触编辑锁
  role?: 'chapter-title' | 'chapter-date' | 'page-content' | 'cover-title' | 'cover-author' | 'none';
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
  fontStyle?: string;
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
  templateType?: 'cover' | 'structural' | 'content';
  photoCount: number;
  category: string;
  layoutSchema: {
    background?: any;
    elements: any[];
  };
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

/**
 * @description 作品集（书籍）数据结构
 */
import type { PageSize } from './rendering/PhysicalConstants';

export interface Chapter {
  id: string;
  title: string;      // 章节标题
  date: string;       // ISO Date string (e.g. 2023-10-27)
  pages: Page[];      // 章节包含的页面列表
}

export interface Book {
  id: string;
  userId: string;
  title: string;
  author: string;
  type?: 'book' | 'template';
  createdAt: number;
  updatedAt?: number;
  pages: Page[];
  pageSize: PageSize; // 新增：印刷纸张尺寸
  coordinateSystem?: string; // 坐标系统标识 (例如 'virtual')
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
  imageUrls?: string[]; // 压缩后的访问地址（缩略图）
  originalImageUrls?: string[]; // 原始/高清访问地址
  hasImages?: boolean; // 是否包含图片
  userId?: string;
  createdAt: number;
  status?: 'pending' | 'processed' | 'ignored';
  replyContent?: string;
  replyAt?: number;
}

export interface BookTheme {
  id: string;
  name: string;
  creatorId: string;
  visibility: 'private' | 'public';
  themeSchema: any;
  createdAt?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
