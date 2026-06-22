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
  layout: string;     // 页面布局类型 (支持静态内置或动态模板 ID)
  sortOrder?: number;
  elements?: CanvasElement[]; // 新增：页面自由组件数组
  background?: CanvasBackgroundConfig; // 新增：页面自定义背景配置
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
  layoutSchema: {
    background?: any;
    elements: any[];
  };
  thumbnailUrl?: string;
  visibility?: 'private' | 'public';
  creatorId?: string;
  createdAt?: number;
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
  pages: Page[];
  theme: string; // 改为 string 以支持内置主题 and 动态主题 ID
  pageSize: PageSize; // 新增：印刷纸张尺寸
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
