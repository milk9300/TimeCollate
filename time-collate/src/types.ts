// 1. 图片对象接口
export interface Photo {
  id: string;
  url: string;        // 图片的预览地址 (如果是本地上传，通常是 blob: URL 或 base64)
  caption?: string;   // 图片配文（可选）
  width?: number;     // 记录宽高有助于后续排版
  height?: number;
}

// 2. 章节对象接口
export interface Chapter {
  id: string;
  title: string;
  content: string;    // 文案内容
  date: string;       // 发生的时间，存储为 ISO 字符串 (2023-10-27)
  photos: Photo[];    // 包含的图片列表
  layout: 'single' | 'grid' | 'collage'; // 布局模式：单图、网格、拼贴
}

// 3. 书籍对象接口（整体数据结构）
export interface Book {
  title: string;
  author: string;
  createdArt: number; // 创建时间戳
  chapters: Chapter[];
  theme: 'classic' | 'modern' | 'warm'; // 书籍主题风格
}