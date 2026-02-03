/**
 * @description 图片数据结构
 */
export interface Photo {
  id: string;
  url: string;        // 预览地址 (blob: URL 或 base64)
  caption?: string;   // 配文
  width?: number;     // 原始宽度
  height?: number;    // 原始高度
  file?: File;        // 上传的原始文件对象 (仅在上传阶段存在)
}

/**
 * @description 物理页面数据结构
 * 每个 Page 对应一张 A4 物理页面
 */
export interface Page {
  id: string;
  content: string;    // 页面正文
  photos: Photo[];    // 页面图片
  layout: 'single' | 'grid' | 'collage' | 'cover' | 'magazine' | 'journal';  // 页面布局类型
}

/**
 * @description 章节数据结构
 * 一个章节可包含多个物理页面
 */
export interface Chapter {
  id: string;
  title: string;      // 章节标题
  date: string;       // ISO Date string (e.g. 2023-10-27)
  pages: Page[];      // 章节包含的页面列表
}

/**
 * @description 作品集（书籍）数据结构
 */
import type { PageSize } from './rendering/PhysicalConstants';

export interface Book {
  id: string;
  title: string;
  author: string;
  createdAt: number;
  chapters: Chapter[];
  theme: 'classic' | 'modern' | 'warm' | 'magazine';
  pageSize: PageSize; // 新增：印刷纸张尺寸
}