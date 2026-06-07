import type { Book } from '../../types';
import type { BookCoverConfig, CoverElement } from './types';
import { PAGE_SIZES } from '../PhysicalConstants';
import { parseCoverUrl } from '../../features/editor/components/GeneratedCover';

/**
 * 将常规的 Book 数据库对象，统一解析并推演为画布同源的 BookCoverConfig JSON Schema
 * 100% 向后兼容历史数据
 */
export function buildCoverConfig(book: Book): BookCoverConfig {
  // 1. 获取物理页面尺寸
  const pageSizeName = book.pageSize || 'A4';
  const sizeDef = PAGE_SIZES[pageSizeName] || PAGE_SIZES.A4;
  
  // 2. 动态计算书脊厚度 (根据内页总页数，预设单张纸厚度 0.125mm)
  // 如果没有 chapters，默认为 20 页
  const totalPages = book.chapters?.reduce((sum, chap) => sum + (chap.pages?.length || 0), 0) || 20;
  const spineWidthMm = Math.max(5.0, totalPages * 0.125); // 最少保留 5mm 物理书脊

  // 出血线 (3mm) 与精装包边 (15mm)
  const bleedMm = 3;
  const wrapMm = 0; // 平装包边为 0，精装可预置为 15

  // 3. 解析封面属性
  const coverUrl = book.coverUrl || '';

  let coverBackground: { type: 'color' | 'gradient' | 'image'; value: string };
  let coverElements: CoverElement[] = [];

  const parsedDesign = parseCoverUrl(coverUrl, book.title);

  const isGradient = parsedDesign.bgValue.includes('gradient');
  coverBackground = {
    type: isGradient ? 'gradient' : 'color',
    value: parsedDesign.bgValue
  };

  const layout = parsedDesign.layout;
  const txtColor = parsedDesign.textColor;
  const accentColor = parsedDesign.accentColor;
  const subColor = parsedDesign.subColor;
  const hasImage = !!parsedDesign.image;

  if (layout === 'classic') {
    if (hasImage) {
      coverElements = [
        // 双边框线装饰
        {
          id: 'classic-border-1',
          type: 'divider',
          content: 'border-classic-outer',
          style: { xPercent: 50, yPercent: 50, widthPercent: 88, color: txtColor }
        },
        {
          id: 'classic-border-2',
          type: 'divider',
          content: 'border-classic-inner',
          style: { xPercent: 50, yPercent: 50, widthPercent: 84, color: txtColor }
        },
        {
          id: 'classic-corners',
          type: 'divider',
          content: 'border-classic-corners',
          style: { xPercent: 50, yPercent: 50, widthPercent: 84, color: txtColor }
        },
        // 拍立得相框 (三层卡纸)
        {
          id: 'classic-image',
          type: 'image',
          content: parsedDesign.image!,
          style: {
            xPercent: 50,
            yPercent: 38,
            widthPercent: 62,
            aspectRatio: 3 / 4,
            photoStyle: 'polaroid'
          }
        },
        // 金线 / 细线
        {
          id: 'classic-line',
          type: 'divider',
          content: 'line-horizontal-short',
          style: { xPercent: 50, yPercent: 72, widthPercent: 8, color: accentColor }
        },
        // 标题
        {
          id: 'classic-title',
          type: 'text',
          content: book.title,
          style: {
            xPercent: 50,
            yPercent: 79,
            fontSize: 24,
            fontFamily: 'serif',
            color: txtColor,
            align: 'center'
          }
        },
        // 作者
        {
          id: 'classic-author',
          type: 'text',
          content: book.author || '时光记录者',
          style: {
            xPercent: 50,
            yPercent: 87,
            fontSize: 9,
            color: accentColor,
            align: 'center',
            tracking: '0.4em'
          }
        },
        // 年份
        {
          id: 'classic-edition',
          type: 'text',
          content: '2026 Edition',
          style: {
            xPercent: 50,
            yPercent: 93,
            fontSize: 6,
            color: subColor,
            align: 'center',
            tracking: '0.4em'
          }
        }
      ];
    } else {
      coverElements = [
        // 双边框线装饰
        {
          id: 'classic-border-1',
          type: 'divider',
          content: 'border-classic-outer',
          style: { xPercent: 50, yPercent: 50, widthPercent: 88, color: txtColor }
        },
        {
          id: 'classic-border-2',
          type: 'divider',
          content: 'border-classic-inner',
          style: { xPercent: 50, yPercent: 50, widthPercent: 84, color: txtColor }
        },
        {
          id: 'classic-corners',
          type: 'divider',
          content: 'border-classic-corners',
          style: { xPercent: 50, yPercent: 50, widthPercent: 84, color: txtColor }
        },
        // 古典菱形纹章
        {
          id: 'classic-emblem',
          type: 'sticker',
          content: 'emblem-star',
          style: {
            xPercent: 50,
            yPercent: 24,
            fontSize: 18,
            color: accentColor,
            align: 'center'
          }
        },
        // 标题
        {
          id: 'classic-title',
          type: 'text',
          content: book.title,
          style: {
            xPercent: 50,
            yPercent: 45,
            fontSize: 26,
            fontFamily: 'serif',
            color: txtColor,
            align: 'center'
          }
        },
        // 短线
        {
          id: 'classic-divider',
          type: 'divider',
          content: 'line-horizontal-short',
          style: { xPercent: 50, yPercent: 58, widthPercent: 8, color: txtColor }
        },
        // 作者
        {
          id: 'classic-author',
          type: 'text',
          content: book.author || '时光记录者',
          style: {
            xPercent: 50,
            yPercent: 66,
            fontSize: 11,
            color: accentColor,
            align: 'center',
            tracking: '0.4em'
          }
        },
        // 年份
        {
          id: 'classic-edition',
          type: 'text',
          content: '2026 EDITION',
          style: {
            xPercent: 50,
            yPercent: 84,
            fontSize: 7,
            color: subColor,
            align: 'center',
            tracking: '0.5em'
          }
        }
      ];
    }
  } else if (layout === 'minimal') {
    if (hasImage) {
      coverElements = [
        {
          id: 'minimal-tag',
          type: 'text',
          content: 'MEMORIES ARCHIVE',
          style: {
            xPercent: 20,
            yPercent: 12,
            fontSize: 8,
            color: subColor,
            align: 'left',
            tracking: '0.4em'
          }
        },
        // 极简 4:5 竖版插图
        {
          id: 'minimal-image',
          type: 'image',
          content: parsedDesign.image!,
          style: {
            xPercent: 46,
            yPercent: 38,
            widthPercent: 52,
            aspectRatio: 4 / 5,
            photoStyle: 'rounded'
          }
        },
        // 标题 (左对齐)
        {
          id: 'minimal-title',
          type: 'text',
          content: book.title,
          style: {
            xPercent: 20,
            yPercent: 68,
            fontSize: 22,
            fontFamily: 'serif',
            color: txtColor,
            align: 'left'
          }
        },
        // 左对齐短线
        {
          id: 'minimal-divider',
          type: 'divider',
          content: 'line-horizontal-short',
          style: { xPercent: 20, yPercent: 76, widthPercent: 10, color: txtColor, align: 'left' }
        },
        // 作者
        {
          id: 'minimal-author',
          type: 'text',
          content: book.author || '时光记录者',
          style: {
            xPercent: 20,
            yPercent: 83,
            fontSize: 10,
            color: subColor,
            align: 'left',
            tracking: '0.4em'
          }
        },
        // 年份
        {
          id: 'minimal-edition',
          type: 'text',
          content: 'ALL RIGHTS RESERVED',
          style: {
            xPercent: 20,
            yPercent: 89,
            fontSize: 6,
            color: subColor,
            align: 'left',
            tracking: '0.2em'
          }
        }
      ];
    } else {
      coverElements = [
        // 大字极简无图
        {
          id: 'minimal-tag',
          type: 'text',
          content: 'CHRONICLE SERIES',
          style: {
            xPercent: 50,
            yPercent: 15,
            fontSize: 8,
            color: subColor,
            align: 'center',
            tracking: '0.5em'
          }
        },
        {
          id: 'minimal-title',
          type: 'text',
          content: book.title,
          style: {
            xPercent: 50,
            yPercent: 42,
            fontSize: 30,
            fontFamily: 'serif',
            color: txtColor,
            align: 'center'
          }
        },
        {
          id: 'minimal-divider',
          type: 'divider',
          content: 'line-horizontal-short',
          style: { xPercent: 50, yPercent: 52, widthPercent: 12, color: txtColor }
        },
        {
          id: 'minimal-author',
          type: 'text',
          content: book.author || '时光记录者',
          style: {
            xPercent: 50,
            yPercent: 60,
            fontSize: 11,
            color: subColor,
            align: 'center',
            tracking: '0.6em'
          }
        },
        {
          id: 'minimal-edition',
          type: 'text',
          content: 'ALL RIGHTS RESERVED',
          style: {
            xPercent: 50,
            yPercent: 88,
            fontSize: 7,
            color: subColor,
            align: 'center',
            tracking: '0.3em'
          }
        }
      ];
    }
  } else if (layout === 'modern') {
    if (hasImage) {
      coverElements = [
        // 包豪斯十字网格背景线
        {
          id: 'modern-grid-h',
          type: 'divider',
          content: 'line-horizontal-full',
          style: { xPercent: 50, yPercent: 15, color: `${txtColor}33` }
        },
        {
          id: 'modern-grid-v',
          type: 'divider',
          content: 'line-vertical-full',
          style: { xPercent: 10, yPercent: 50, color: `${txtColor}33` }
        },
        // 双竖装饰侧边条
        {
          id: 'modern-bar',
          type: 'divider',
          content: 'bar-vertical-double',
          style: { xPercent: 10, yPercent: 50, color: accentColor }
        },
        // 小Tag
        {
          id: 'modern-tag',
          type: 'text',
          content: 'LIFE RECORDINGS',
          style: {
            xPercent: 16,
            yPercent: 11,
            fontSize: 8,
            color: accentColor,
            align: 'left',
            tracking: '0.4em'
          }
        },
        // 标题
        {
          id: 'modern-title',
          type: 'text',
          content: book.title,
          style: {
            xPercent: 16,
            yPercent: 20,
            fontSize: 34,
            fontFamily: 'sans',
            color: txtColor,
            align: 'left'
          }
        },
        // 作者
        {
          id: 'modern-author',
          type: 'text',
          content: `BY ${book.author || '时光记录者'}`.toUpperCase(),
          style: {
            xPercent: 16,
            yPercent: 32,
            fontSize: 11,
            color: txtColor,
            align: 'left',
            tracking: '0.2em'
          }
        },
        // 现代主义右下对齐叠盖插图
        {
          id: 'modern-image',
          type: 'image',
          content: parsedDesign.image!,
          style: {
            xPercent: 57,
            yPercent: 62,
            widthPercent: 66,
            aspectRatio: 4 / 3,
            photoStyle: 'rounded'
          }
        },
        // 年份装饰
        {
          id: 'modern-edition',
          type: 'text',
          content: 'EST. 2026 // TIME COLLATED',
          style: {
            xPercent: 16,
            yPercent: 88,
            fontSize: 7,
            color: subColor,
            align: 'left',
            tracking: '0.3em'
          }
        },
        // 辅助logo标志
        {
          id: 'modern-logo',
          type: 'sticker',
          content: 'logo-circle',
          style: {
            xPercent: 84,
            yPercent: 88,
            color: txtColor
          }
        }
      ];
    } else {
      coverElements = [
        // 包豪斯十字网格背景线
        {
          id: 'modern-grid-h',
          type: 'divider',
          content: 'line-horizontal-full',
          style: { xPercent: 50, yPercent: 15, color: `${txtColor}33` }
        },
        {
          id: 'modern-grid-v',
          type: 'divider',
          content: 'line-vertical-full',
          style: { xPercent: 10, yPercent: 50, color: `${txtColor}33` }
        },
        // 双竖装饰侧边条
        {
          id: 'modern-bar',
          type: 'divider',
          content: 'bar-vertical-double',
          style: { xPercent: 10, yPercent: 50, color: accentColor }
        },
        // 水印背景年份
        {
          id: 'modern-watermark-1',
          type: 'text',
          content: 'EST.',
          style: {
            xPercent: 80,
            yPercent: 62,
            fontSize: 48,
            fontFamily: 'sans',
            color: `${txtColor}0d`, // 5% opacity
            align: 'center'
          }
        },
        {
          id: 'modern-watermark-2',
          type: 'text',
          content: '2026',
          style: {
            xPercent: 80,
            yPercent: 78,
            fontSize: 60,
            fontFamily: 'sans',
            color: `${txtColor}0d`,
            align: 'center'
          }
        },
        // 小Tag
        {
          id: 'modern-tag',
          type: 'text',
          content: 'LIFE RECORDINGS',
          style: {
            xPercent: 16,
            yPercent: 11,
            fontSize: 8,
            color: accentColor,
            align: 'left',
            tracking: '0.4em'
          }
        },
        // 标题
        {
          id: 'modern-title',
          type: 'text',
          content: book.title,
          style: {
            xPercent: 16,
            yPercent: 25,
            fontSize: 34,
            fontFamily: 'sans',
            color: txtColor,
            align: 'left'
          }
        },
        // 作者
        {
          id: 'modern-author',
          type: 'text',
          content: `BY ${book.author || '时光记录者'}`.toUpperCase(),
          style: {
            xPercent: 16,
            yPercent: 37,
            fontSize: 11,
            color: txtColor,
            align: 'left',
            tracking: '0.2em'
          }
        },
        // 年份装饰
        {
          id: 'modern-edition',
          type: 'text',
          content: 'EST. 2026 // TIME COLLATED',
          style: {
            xPercent: 16,
            yPercent: 88,
            fontSize: 7,
            color: subColor,
            align: 'left',
            tracking: '0.3em'
          }
        },
        // 辅助logo标志
        {
          id: 'modern-logo',
          type: 'sticker',
          content: 'logo-circle',
          style: {
            xPercent: 84,
            yPercent: 88,
            color: txtColor
          }
        }
      ];
    }
  } else {
    // layout === 'art'
    if (hasImage) {
      coverElements = [
        // 三个层叠交叠背景几何体
        {
          id: 'art-shape-arch',
          type: 'sticker',
          content: 'deco-arch',
          style: { xPercent: 50, yPercent: 36, widthPercent: 44, color: accentColor }
        },
        {
          id: 'art-shape-circle',
          type: 'sticker',
          content: 'deco-circle-large',
          style: { xPercent: 68, yPercent: 26, widthPercent: 28, color: `${txtColor}1a` }
        },
        {
          id: 'art-shape-square',
          type: 'sticker',
          content: 'deco-square-tilt',
          style: { xPercent: 28, yPercent: 38, widthPercent: 18, color: accentColor }
        },
        // 艺术正圆形插图
        {
          id: 'art-image',
          type: 'image',
          content: parsedDesign.image!,
          style: {
            xPercent: 50,
            yPercent: 36,
            widthPercent: 46,
            aspectRatio: 1,
            photoStyle: 'circle'
          }
        },
        // 毛玻璃面板占位元素 (Canvas 用作绘制底衬板)
        {
          id: 'art-glass-card',
          type: 'sticker',
          content: 'glass-card',
          style: {
            xPercent: 50,
            yPercent: 74,
            widthPercent: 84,
            color: txtColor
          }
        },
        // 毛玻璃内的文本
        {
          id: 'art-tag',
          type: 'text',
          content: 'COLLECTION',
          style: {
            xPercent: 50,
            yPercent: 66,
            fontSize: 8,
            color: accentColor,
            align: 'center',
            tracking: '0.5em'
          }
        },
        {
          id: 'art-title',
          type: 'text',
          content: book.title,
          style: {
            xPercent: 50,
            yPercent: 73,
            fontSize: 24,
            fontFamily: 'sans',
            color: txtColor,
            align: 'center'
          }
        },
        {
          id: 'art-divider',
          type: 'divider',
          content: 'line-horizontal-short',
          style: { xPercent: 50, yPercent: 79, widthPercent: 8, color: txtColor }
        },
        {
          id: 'art-author',
          type: 'text',
          content: book.author || '时光记录者',
          style: {
            xPercent: 50,
            yPercent: 83,
            fontSize: 11,
            color: txtColor,
            align: 'center',
            tracking: '0.3em'
          }
        }
      ];
    } else {
      coverElements = [
        // 三个层叠交叠背景几何体
        {
          id: 'art-shape-arch',
          type: 'sticker',
          content: 'deco-arch',
          style: { xPercent: 50, yPercent: 36, widthPercent: 56, color: accentColor }
        },
        {
          id: 'art-shape-circle',
          type: 'sticker',
          content: 'deco-circle-large',
          style: { xPercent: 62, yPercent: 42, widthPercent: 40, color: `${txtColor}1a` }
        },
        {
          id: 'art-shape-square',
          type: 'sticker',
          content: 'deco-square-tilt',
          style: { xPercent: 28, yPercent: 48, widthPercent: 20, color: accentColor }
        },
        // 毛玻璃面板占位元素
        {
          id: 'art-glass-card',
          type: 'sticker',
          content: 'glass-card',
          style: {
            xPercent: 50,
            yPercent: 74,
            widthPercent: 84,
            color: txtColor
          }
        },
        // 标题与文字
        {
          id: 'art-tag',
          type: 'text',
          content: 'COLLECTION',
          style: {
            xPercent: 50,
            yPercent: 66,
            fontSize: 8,
            color: accentColor,
            align: 'center',
            tracking: '0.5em'
          }
        },
        {
          id: 'art-title',
          type: 'text',
          content: book.title,
          style: {
            xPercent: 50,
            yPercent: 73,
            fontSize: 24,
            fontFamily: 'sans',
            color: txtColor,
            align: 'center'
          }
        },
        {
          id: 'art-divider',
          type: 'divider',
          content: 'line-horizontal-short',
          style: { xPercent: 50, yPercent: 79, widthPercent: 8, color: txtColor }
        },
        {
          id: 'art-author',
          type: 'text',
          content: book.author || '时光记录者',
          style: {
            xPercent: 50,
            yPercent: 83,
            fontSize: 11,
            color: txtColor,
            align: 'center',
            tracking: '0.3em'
          }
        }
      ];
    }
  }

  // 4. 封底配置
  const backBackground: { type: 'color' | 'gradient' | 'image'; value: string } = {
    type: parsedDesign.bgValue.includes('gradient') ? 'gradient' : 'color',
    value: parsedDesign.bgValue
  };

  const backCoverElements: CoverElement[] = [
    // 封底三个装饰小圆点
    {
      id: 'back-dots',
      type: 'sticker',
      content: '✦ ✦ ✦',
      style: {
        xPercent: 50,
        yPercent: 44,
        fontSize: 10,
        color: parsedDesign.accentColor,
        align: 'center'
      }
    },
    {
      id: 'back-text-1',
      type: 'text',
      content: '我们的故事',
      style: {
        xPercent: 50,
        yPercent: 52,
        fontSize: 16,
        fontFamily: 'serif',
        color: parsedDesign.textColor,
        align: 'center',
        tracking: '0.3em'
      }
    },
    {
      id: 'back-text-2',
      type: 'text',
      content: '还没有结束...',
      style: {
        xPercent: 50,
        yPercent: 59,
        fontSize: 18,
        fontFamily: 'serif',
        color: parsedDesign.accentColor,
        align: 'center',
        tracking: '0.4em'
      }
    },
    {
      id: 'back-divider',
      type: 'divider',
      content: 'line-horizontal-short',
      style: {
        xPercent: 50,
        yPercent: 68,
        widthPercent: 8,
        color: '#E5E7EB'
      }
    },
    {
      id: 'back-tbc',
      type: 'text',
      content: 'To Be Continued',
      style: {
        xPercent: 50,
        yPercent: 73,
        fontSize: 6,
        color: '#D1D5DB',
        align: 'center',
        tracking: '0.6em'
      }
    },
    {
      id: 'back-logo',
      type: 'text',
      content: 'Created with TimeCollate',
      style: {
        xPercent: 50,
        yPercent: 90,
        fontSize: 7,
        color: '#E5E7EB',
        align: 'center',
        tracking: '0.1em'
      }
    }
  ];

  // 5. 书脊配置
  const spineBackground = {
    type: parsedDesign.bgValue.includes('gradient') ? ('gradient' as const) : ('color' as const),
    value: parsedDesign.bgValue
  };

  const spineElements: CoverElement[] = [
    {
      id: 'spine-title',
      type: 'text',
      content: book.title,
      style: {
        xPercent: 50,
        yPercent: 50,
        fontSize: 10,
        color: parsedDesign.textColor,
        align: 'center'
      }
    }
  ];

  return {
    bookId: book.id,
    specification: {
      widthMm: sizeDef.width,
      heightMm: sizeDef.height,
      bleedMm,
      wrapMm,
      spineWidthMm
    },
    cover: {
      background: coverBackground,
      elements: coverElements
    },
    spine: {
      background: spineBackground,
      elements: spineElements
    },
    backCover: {
      background: backBackground,
      elements: backCoverElements
    }
  };
}
