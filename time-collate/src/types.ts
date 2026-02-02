export interface Photo {
  id: string;
  url: string;        // 预览地址 (blob: URL 或 base64)
  caption?: string;   // 配文
  width?: number;     // 原始宽度
  height?: number;    // 原始高度
  file?: File;        // 上传的原始文件对象 (仅在上传阶段存在)
}

export interface Chapter {
  id: string;
  title: string;
  content: string;    // 章节正文
  date: string;       // ISO Date string (e.g. 2023-10-27)
  photos: Photo[];
  layout: 'single' | 'grid' | 'collage';
}

export interface Book {
  id: string;
  title: string;
  author: string;
  createdArt: number; // timestamp
  chapters: Chapter[];
  theme: 'classic' | 'modern' | 'warm';
}