/**
 * @description 同源封面/封底渲染器 JSON 数据协议与类型定义
 */

export interface CoverElementStyle {
  xPercent: number;     // 水平相对坐标百分比 (0-100)
  yPercent: number;     // 垂直相对坐标百分比 (0-100)
  widthPercent?: number;// 相对宽度百分比 (如照片在封面中所占比例)
  fontSize?: number;    // 文字基准字号 (相对基准物理高度计算)
  fontFamily?: string;  // 字体名称
  color?: string;       // 十六进制颜色代码或 CSS 变量
  align?: 'left' | 'center' | 'right';
  tracking?: string;    // 文字间距 (letterSpacing)
  aspectRatio?: number; // 宽高比约束
  photoStyle?: 'polaroid' | 'rounded' | 'circle'; // 物理照片呈现形态样式
}

export interface CoverElement {
  id: string;
  type: 'text' | 'image' | 'sticker' | 'divider';
  content: string;      // 文字内容或图片/OSS 访问 URL
  style: CoverElementStyle;
}

export interface BookCoverSpecification {
  widthMm: number;      // 页面物理净宽度 (如 A4 宽 210mm)
  heightMm: number;     // 页面物理净高度 (如 A4 高 297mm)
  bleedMm: number;      // 印刷出血线宽度 (通常为 3mm)
  wrapMm: number;       // 精装包边宽度 (精装为 15mm，平装为 0)
  spineWidthMm: number; // 书脊物理宽度 (根据总页数动态算得)
}

export interface BookCoverConfig {
  bookId: string;
  specification: BookCoverSpecification;
  cover: {
    background: {
      type: 'color' | 'gradient' | 'image';
      value: string; // 颜色码, 渐变样式, 或背景图 URL
    };
    elements: CoverElement[];
  };
  spine: {
    background: {
      type: 'color' | 'gradient' | 'image';
      value: string;
    };
    elements: CoverElement[];
  };
  backCover: {
    background: {
      type: 'color' | 'gradient' | 'image';
      value: string;
    };
    elements: CoverElement[];
  };
}
