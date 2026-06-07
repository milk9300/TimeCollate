import type { BookCoverConfig, CoverElement } from './types';

export class BookCoverRenderer {
  private config: BookCoverConfig;
  private mode: 'design' | 'texture' | 'pdf';
  
  public canvasWidth: number = 0;
  public canvasHeight: number = 0;
  private dpi: number = 96;
  
  // 比例换算：毫米 mm 到 像素 px 的系数
  private mmToPxScale: number = 3.7795275591;

  constructor(config: BookCoverConfig, mode: 'design' | 'texture' | 'pdf') {
    this.config = config;
    this.mode = mode;
    this.setupDpi();
    this.calculateDimensions();
  }

  /**
   * 1. 根据渲染场景模式建立 DPI 规则
   */
  private setupDpi() {
    switch (this.mode) {
      case 'texture':
        this.dpi = 150; // WebGL 贴图/视频导出
        break;
      case 'pdf':
        this.dpi = 300; // 印刷高清级
        break;
      case 'design':
      default:
        this.dpi = 96;  // 2D 预览与弹窗
        break;
    }
    // 1 inch = 25.4 mm
    // px = mm * (dpi / 25.4)
    this.mmToPxScale = this.dpi / 25.4;
  }

  /**
   * 2. 动态计算印刷总物理尺寸的像素长宽
   */
  private calculateDimensions() {
    const { widthMm, heightMm, bleedMm, wrapMm, spineWidthMm } = this.config.specification;
    
    // 平铺总物理尺寸 = 封底 + 书脊 + 封面 + 2 * (出血线 + 包边)
    const totalWidthMm = widthMm * 2 + spineWidthMm + (bleedMm + wrapMm) * 2;
    const totalHeightMm = heightMm + (bleedMm + wrapMm) * 2;

    this.canvasWidth = Math.round(totalWidthMm * this.mmToPxScale);
    this.canvasHeight = Math.round(totalHeightMm * this.mmToPxScale);
  }

  /**
   * 3. 毫米转像素数值换算
   */
  private mmToPx(mm: number): number {
    return Math.round(mm * this.mmToPxScale);
  }

  /**
   * 4. 异步加载并等待所需网络字体，防止 Canvas 渲染时静默降级为系统宋体
   */
  public async loadFonts(): Promise<void> {
    try {
      // 检查浏览器是否支持 FontFace API
      if ('fonts' in document) {
        // 阻塞等待项目中使用的关键字体载入就绪
        // 这里静默等待，如果超时或者报错则优雅降级为本地衬线或无衬线字体
        await Promise.all([
          document.fonts.load('12px "Noto Serif SC"'),
          document.fonts.load('12px "Ma Shan Zheng"'),
          document.fonts.load('12px "Inter"')
        ]).catch(err => {
          console.warn('[BookCoverRenderer] Font loading warning, fallback used:', err);
        });
      }
    } catch (e) {
      console.warn('[BookCoverRenderer] Font Face check failed, skipped waiting:', e);
    }
  }

  /**
   * 5. 核心渲染入口：生成并绘制 Canvas
   */
  public async renderToCanvas(): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('[BookCoverRenderer] Failed to get canvas 2d context');

    // 启用图像平滑，保障渲染质量
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 获取各种排版坐标偏移
    const { widthMm, bleedMm, wrapMm, spineWidthMm } = this.config.specification;
    const sideMarginMm = bleedMm + wrapMm;

    const backOffsetPx = this.mmToPx(sideMarginMm);
    const spineOffsetPx = this.mmToPx(sideMarginMm + widthMm);
    const coverOffsetPx = this.mmToPx(sideMarginMm + widthMm + spineWidthMm);

    const sectionWidthPx = this.mmToPx(widthMm);
    const spineWidthPx = this.mmToPx(spineWidthMm);
    const totalHeightPx = this.canvasHeight;

    // A. 绘制背景层 (整张平铺背景以实现无缝过渡)
    await this.drawGlobalBackground(ctx);

    // B. 分区块绘制：封底 (Left Page on spread)
    ctx.save();
    ctx.translate(backOffsetPx, 0);
    this.clipSection(ctx, sectionWidthPx, totalHeightPx);
    await this.drawSection(ctx, 'backCover', sectionWidthPx, totalHeightPx);
    ctx.restore();

    // C. 分区块绘制：书脊 (Center Spine)
    ctx.save();
    ctx.translate(spineOffsetPx, 0);
    this.clipSection(ctx, spineWidthPx, totalHeightPx);
    await this.drawSection(ctx, 'spine', spineWidthPx, totalHeightPx);
    ctx.restore();

    // D. 分区块绘制：封面 (Right Page on spread)
    ctx.save();
    ctx.translate(coverOffsetPx, 0);
    this.clipSection(ctx, sectionWidthPx, totalHeightPx);
    await this.drawSection(ctx, 'cover', sectionWidthPx, totalHeightPx);
    ctx.restore();

    // E. 绘制印刷标记辅助线 (仅在设计预览设计模式下可选开启，普通模式下默认隐藏)
    if (this.mode === 'design') {
      this.drawSafetyGuides(ctx);
    }

    return canvas;
  }

  /**
   * 裁切安全工作区，防止背景/图案溢出到相邻页
   */
  private clipSection(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
  }

  /**
   * 绘制底色大背景
   */
  private async drawGlobalBackground(ctx: CanvasRenderingContext2D) {
    const bg = this.config.cover.background;
    ctx.fillStyle = '#FFFFFF'; // 兜底白色
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    if (bg.type === 'color') {
      ctx.fillStyle = bg.value;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    } else if (bg.type === 'gradient') {
      // 解析类似 linear-gradient(135deg, rgb(...) 0%, rgb(...) 100%) 的 CSS 渐变
      // 这里我们在 Canvas 中使用对角线线性渐变模拟 135deg
      const grad = ctx.createLinearGradient(0, 0, this.canvasWidth, this.canvasHeight);
      
      const colors = this.extractColorsFromGradient(bg.value);
      if (colors.length >= 2) {
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(1, colors[colors.length - 1]);
      } else {
        // 兜底渐变色
        grad.addColorStop(0, '#667EEA');
        grad.addColorStop(1, '#764BA2');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    } else if (bg.type === 'image') {
      try {
        const img = await this.loadImageAsync(bg.value);
        this.drawImageCover(ctx, img, 0, 0, this.canvasWidth, this.canvasHeight);
      } catch (err) {
        console.error('[BookCoverRenderer] Failed to draw background image:', err);
      }
    }
  }

  /**
   * 从 CSS 渐变字符串中简易提取色值
   */
  private extractColorsFromGradient(gradientStr: string): string[] {
    // 粗暴地通过正则提取十六进制或 rgb 颜色
    const hexRegex = /#[a-fA-F0-9]{3,8}/g;
    const rgbRegex = /rgb\([^)]+\)/g;
    const rgbaRegex = /rgba\([^)]+\)/g;

    const hexMatches = gradientStr.match(hexRegex) || [];
    const rgbMatches = gradientStr.match(rgbRegex) || [];
    const rgbaMatches = gradientStr.match(rgbaRegex) || [];

    const allMatches = [...hexMatches, ...rgbMatches, ...rgbaMatches];
    return allMatches.length > 0 ? allMatches : ['#667EEA', '#764BA2'];
  }

  /**
   * 绘制具体页分区 (封面, 书脊, 封底) 的子元素
   */
  private async drawSection(
    ctx: CanvasRenderingContext2D, 
    sectionName: 'cover' | 'spine' | 'backCover', 
    width: number, 
    height: number
  ) {
    const section = this.config[sectionName];
    
    // 如果单个分区有自己独立的局部 background，覆盖绘制
    if (section.background && sectionName !== 'cover') {
      const localBg = section.background;
      if (localBg.type === 'color') {
        ctx.fillStyle = localBg.value;
        ctx.fillRect(0, 0, width, height);
      }
    }

    // 按顺序渲染元素
    for (const el of section.elements) {
      ctx.save();
      await this.drawElement(ctx, el, width, height);
      ctx.restore();
    }
  }

  /**
   * 绘制子元素 (Image, Text, Sticker, Divider)
   */
  private async drawElement(
    ctx: CanvasRenderingContext2D,
    el: CoverElement,
    secWidth: number,
    secHeight: number
  ) {
    const x = (el.style.xPercent / 100) * secWidth;
    const y = (el.style.yPercent / 100) * secHeight;

    if (el.type === 'image') {
      const w = ((el.style.widthPercent || 50) / 100) * secWidth;
      const aspectRatio = el.style.aspectRatio || 3/4;
      const h = w / aspectRatio;
      const photoStyle = el.style.photoStyle || 'polaroid';

      if (photoStyle === 'polaroid') {
        // 1. 绘制相框卡片白边背景 (拍立得卡片)
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = this.mmToPx(6);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = this.mmToPx(3);
        ctx.fillStyle = '#FFFFFF';
        
        const cardPadding = this.mmToPx(4); // 4mm 白边
        ctx.beginPath();
        ctx.rect(x - w/2 - cardPadding, y - h/2 - cardPadding, w + cardPadding * 2, h + cardPadding * 3.5);
        ctx.fill();
        ctx.restore();

        // 2. 绘制外层卡纸内嵌微细框线 (1px border-black/5)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - w/2 - cardPadding, y - h/2 - cardPadding, w + cardPadding * 2, h + cardPadding * 3.5);

        // 3. 异步载入并绘制照片本身
        try {
          const img = await this.loadImageAsync(el.content);
          ctx.save();
          // 给照片本身切个微弱的圆角 (0.5mm)
          const imgRadius = this.mmToPx(0.5);
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x - w/2, y - h/2, w, h, imgRadius);
          } else {
            ctx.rect(x - w/2, y - h/2, w, h);
          }
          ctx.clip();
          this.drawImageCover(ctx, img, x - w/2, y - h/2, w, h);
          ctx.restore();

          // 4. 照片周边的极细内阴影描边 (卡纸装裱细节)
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x - w/2, y - h/2, w, h);
        } catch (err) {
          ctx.fillStyle = '#E5E7EB';
          ctx.fillRect(x - w/2, y - h/2, w, h);
          ctx.fillStyle = '#9CA3AF';
          ctx.font = `bold ${this.mmToPx(4)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('图片加载失败', x, y);
        }
      } else if (photoStyle === 'circle') {
        // 几何艺术正圆形插画
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = this.mmToPx(5);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = this.mmToPx(3);

        ctx.beginPath();
        ctx.arc(x, y, w/2, 0, Math.PI * 2);
        ctx.clip();

        try {
          const img = await this.loadImageAsync(el.content);
          this.drawImageCover(ctx, img, x - w/2, y - w/2, w, w);
        } catch (err) {
          ctx.fillStyle = '#E5E7EB';
          ctx.beginPath();
          ctx.arc(x, y, w/2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // 绘制一圈白色粗描边装饰
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = this.mmToPx(1.5);
        ctx.beginPath();
        ctx.arc(x, y, w/2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // rounded 圆角普通卡片 (极简、现代)
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = this.mmToPx(5);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = this.mmToPx(2.5);

        const radius = this.mmToPx(3);
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x - w/2, y - h/2, w, h, radius);
        } else {
          ctx.rect(x - w/2, y - h/2, w, h);
        }
        ctx.clip();

        try {
          const img = await this.loadImageAsync(el.content);
          this.drawImageCover(ctx, img, x - w/2, y - h/2, w, h);
        } catch (err) {
          ctx.fillStyle = '#E5E7EB';
          ctx.fillRect(x - w/2, y - h/2, w, h);
        }
        ctx.restore();

        // 细描边
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x - w/2, y - h/2, w, h, radius);
        } else {
          ctx.rect(x - w/2, y - h/2, w, h);
        }
        ctx.stroke();
      }
    } else if (el.type === 'text') {
      // 绘制格式化文本
      const sizePx = this.mmToPx(el.style.fontSize || 10);
      const font = el.style.fontFamily === 'serif' 
        ? `bold ${sizePx}px "Noto Serif SC", Georgia, serif`
        : el.style.fontFamily === 'sans'
          ? `bold ${sizePx}px "Inter", "SF Pro Display", sans-serif`
          : `${sizePx}px "Ma Shan Zheng", cursive, sans-serif`;

      ctx.font = font;
      ctx.fillStyle = el.style.color || '#333333';
      ctx.textAlign = el.style.align || 'center';
      ctx.textBaseline = 'middle';

      // 字符间距 (Letter Spacing)
      if (el.style.tracking && (ctx as any).letterSpacing !== undefined) {
        (ctx as any).letterSpacing = el.style.tracking;
      }

      // 计算文本限制宽度用于自动换行
      const maxTextWidth = secWidth * 0.85; 
      const lineHeightPx = sizePx * 1.35;

      this.wrapText(ctx, el.content, x, y, maxTextWidth, lineHeightPx);

    } else if (el.type === 'sticker') {
      // 渲染装饰性贴纸组件/几何符号
      const sizePx = this.mmToPx(el.style.fontSize || 8);
      ctx.font = `${sizePx}px "Inter", sans-serif`;
      ctx.fillStyle = el.style.color || 'rgba(0, 0, 0, 0.2)';
      ctx.textAlign = el.style.align || 'center';
      ctx.textBaseline = 'middle';

      if (el.content === 'deco-circle-large') {
        // 几何艺术中的抽象圆球
        ctx.beginPath();
        const rad = ((el.style.widthPercent || 40) / 100) * secWidth / 2;
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fillStyle = el.style.color ? this.getRgba(el.style.color, 0.15) : 'rgba(99, 102, 241, 0.15)';
        ctx.fill();
      } else if (el.content === 'deco-arch') {
        // 拱形背景装饰 (拱顶，底直)
        const w = ((el.style.widthPercent || 44) / 100) * secWidth;
        const h = w * 1.5;
        const r = w / 2;
        ctx.beginPath();
        ctx.moveTo(x - w/2, y + h/2);
        ctx.lineTo(x - w/2, y - h/2 + r);
        ctx.arc(x, y - h/2 + r, r, Math.PI, 0, false);
        ctx.lineTo(x + w/2, y + h/2);
        ctx.closePath();

        const grad = ctx.createLinearGradient(x, y - h/2, x, y + h/2);
        const baseColor = el.style.color || '#818CF8';
        grad.addColorStop(0, this.getRgba(baseColor, 0.25));
        grad.addColorStop(1, this.getRgba(baseColor, 0.03));
        ctx.fillStyle = grad;
        ctx.fill();
      } else if (el.content === 'deco-square-tilt') {
        // 旋转倾斜的正方形装饰
        const w = ((el.style.widthPercent || 18) / 100) * secWidth;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(15 * Math.PI / 180);
        ctx.fillStyle = el.style.color ? this.getRgba(el.style.color, 0.15) : 'rgba(99, 102, 241, 0.15)';
        ctx.fillRect(-w/2, -w/2, w, w);
        ctx.restore();
      } else if (el.content === 'glass-card') {
        // 艺术画报的毛玻璃板底衬板
        const w = ((el.style.widthPercent || 84) / 100) * secWidth;
        const h = secHeight * 0.24; // 卡片占 24% 高度
        
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
        ctx.shadowBlur = this.mmToPx(8);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = this.mmToPx(4);
        
        // 根据传入文字的主颜色深浅自动适配毛玻璃衬板色调
        let cardBg = 'rgba(255, 255, 255, 0.82)';
        let cardBorder = 'rgba(255, 255, 255, 0.5)';
        if (el.style.color && (el.style.color === '#FFFFFF' || el.style.color === '#FFF')) {
          cardBg = 'rgba(15, 23, 42, 0.65)';
          cardBorder = 'rgba(255, 255, 255, 0.15)';
        }
        
        ctx.fillStyle = cardBg;
        const radius = this.mmToPx(5);
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x - w/2, y - h/2, w, h, radius);
        } else {
          ctx.rect(x - w/2, y - h/2, w, h);
        }
        ctx.fill();
        ctx.restore();

        // 玻璃板的外描边
        ctx.strokeStyle = cardBorder;
        ctx.lineWidth = this.mmToPx(0.3);
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x - w/2, y - h/2, w, h, radius);
        } else {
          ctx.rect(x - w/2, y - h/2, w, h);
        }
        ctx.stroke();
      } else if (el.content === 'emblem-star') {
        // 古典双层对角菱形星章徽饰
        ctx.save();
        ctx.translate(x, y);
        
        const strokeColor = el.style.color || '#D97706';
        ctx.strokeStyle = strokeColor;
        
        // 1. 外菱形 (45度)
        ctx.lineWidth = this.mmToPx(0.3);
        ctx.beginPath();
        const size = sizePx * 0.7;
        ctx.moveTo(0, -size);
        ctx.lineTo(size, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size, 0);
        ctx.closePath();
        ctx.stroke();

        // 2. 内菱形 (45度)
        ctx.lineWidth = this.mmToPx(0.15);
        ctx.beginPath();
        const innerSize = size * 0.75;
        ctx.moveTo(0, -innerSize);
        ctx.lineTo(innerSize, 0);
        ctx.lineTo(0, innerSize);
        ctx.lineTo(-innerSize, 0);
        ctx.closePath();
        ctx.stroke();

        // 3. 核心 ✦ 字符
        ctx.fillStyle = strokeColor;
        ctx.font = `${sizePx * 0.7}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✦', 0, 0);

        ctx.restore();
      } else {
        ctx.fillText(el.content, x, y);
      }

    } else if (el.type === 'divider') {
      // 绘制线条/花框
      ctx.strokeStyle = el.style.color || 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = this.mmToPx(0.5);

      if (el.content === 'border-classic-outer') {
        const pct = (el.style.widthPercent || 88) / 100;
        const w = secWidth * pct;
        const h = secHeight * pct;
        ctx.strokeRect((secWidth - w)/2, (secHeight - h)/2, w, h);
      } else if (el.content === 'border-classic-inner') {
        const pct = (el.style.widthPercent || 84) / 100;
        const w = secWidth * pct;
        const h = secHeight * pct;
        ctx.save();
        ctx.lineWidth = this.mmToPx(0.2);
        ctx.strokeRect((secWidth - w)/2, (secHeight - h)/2, w, h);
        ctx.restore();
      } else if (el.content === 'border-classic-corners') {
        // L 形护角折线
        const pct = (el.style.widthPercent || 84) / 100;
        const w = secWidth * pct;
        const h = secHeight * pct;
        const left = (secWidth - w) / 2;
        const right = left + w;
        const top = (secHeight - h) / 2;
        const bottom = top + h;
        const len = this.mmToPx(6); // 折角线长度 6mm

        ctx.save();
        ctx.strokeStyle = el.style.color || '#333333';
        ctx.lineWidth = this.mmToPx(0.35);
        ctx.beginPath();
        
        // 左上角 L
        ctx.moveTo(left, top + len);
        ctx.lineTo(left, top);
        ctx.lineTo(left + len, top);

        // 右上角 L
        ctx.moveTo(right - len, top);
        ctx.lineTo(right, top);
        ctx.lineTo(right, top + len);

        // 左下角 L
        ctx.moveTo(left, bottom - len);
        ctx.lineTo(left, bottom);
        ctx.lineTo(left + len, bottom);

        // 右下角 L
        ctx.moveTo(right - len, bottom);
        ctx.lineTo(right, bottom);
        ctx.lineTo(right, bottom - len);
        
        ctx.stroke();
        ctx.restore();
      } else if (el.content === 'line-horizontal' || el.content === 'line-horizontal-short') {
        const pct = (el.style.widthPercent || 20) / 100;
        const w = secWidth * pct;
        ctx.beginPath();
        if (el.style.align === 'left') {
          ctx.moveTo(x, y);
          ctx.lineTo(x + w, y);
        } else {
          ctx.moveTo(x - w/2, y);
          ctx.lineTo(x + w/2, y);
        }
        ctx.stroke();
      } else if (el.content === 'line-horizontal-full') {
        // 贯穿横网格线
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(secWidth, y);
        ctx.stroke();
      } else if (el.content === 'line-vertical-full') {
        // 贯穿竖网格线
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, secHeight);
        ctx.stroke();
      } else if (el.content === 'bar-vertical') {
        const barH = this.mmToPx(12); // 垂直高 12mm
        ctx.fillStyle = el.style.color || '#333';
        ctx.fillRect(x, y - barH/2, this.mmToPx(1.5), barH);
      } else if (el.content === 'bar-vertical-double') {
        // 包豪斯双竖线 (宽线+窄线)
        const barH = this.mmToPx(12);
        const thickW = this.mmToPx(0.6);
        const thinW = this.mmToPx(0.25);
        const gap = this.mmToPx(0.6);
        
        ctx.save();
        ctx.fillStyle = el.style.color || '#333';
        ctx.fillRect(x, y - barH/2, thickW, barH);
        ctx.fillRect(x + thickW + gap, y - barH/2, thinW, barH);
        ctx.restore();
      }
    }
  }

  /**
   * 自动换行文本绘制核心
   */
  private wrapText(
    ctx: CanvasRenderingContext2D, 
    text: string, 
    x: number, 
    y: number, 
    maxWidth: number, 
    lineHeight: number
  ) {
    // 针对中文/英文混排进行分词和分字处理
    const words = this.segmentText(text);
    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && i > 0) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    // 居中偏移绘制
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, startY + i * lineHeight);
    }
  }

  /**
   * 中英文混合分词/分字算法
   */
  private segmentText(text: string): string[] {
    const segments: string[] = [];
    let i = 0;
    while (i < text.length) {
      const char = text[i];
      // 如果是中文字符，直接按单字拆分，支持中文字自适应换行
      if (this.isChineseChar(char)) {
        segments.push(char);
        i++;
      } else {
        // 如果是英文字符或空格，按完整单词拆分
        let word = char;
        i++;
        while (i < text.length && !this.isChineseChar(text[i])) {
          word += text[i];
          if (text[i] === ' ') {
            i++;
            break;
          }
          i++;
        }
        segments.push(word);
      }
    }
    return segments;
  }

  private isChineseChar(char: string): boolean {
    return char.charCodeAt(0) > 0x4e00 && char.charCodeAt(0) < 0x9fa5;
  }

  /**
   * 异步加载图像并设置 CORS
   */
  private loadImageAsync(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // 必须加上这一行声明，防范 Canvas 受到跨域资源污染而报错
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  }

  /**
   * 将 16 进制颜色转换为 rgba 格式
   */
  private getRgba(colorStr: string, opacity: number): string {
    if (!colorStr) return `rgba(0,0,0,${opacity})`;
    if (colorStr.startsWith('#')) {
      let hex = colorStr.replace('#', '');
      if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
      }
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    if (colorStr.startsWith('rgba')) {
      return colorStr;
    }
    if (colorStr.startsWith('rgb')) {
      return colorStr.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    }
    return colorStr;
  }

  /**
   * 绘制裁切线与出血线辅助层 (仅在 design 预览时显示，对印刷隐藏)
   */
  private drawSafetyGuides(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = 'rgba(60, 132, 244, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const { widthMm, bleedMm, wrapMm } = this.config.specification;
    const sidePx = this.mmToPx(bleedMm + wrapMm);
    const itemWPx = this.mmToPx(widthMm);

    // 绘制裁切边界虚线
    ctx.strokeRect(sidePx, 0, itemWPx * 2 + this.mmToPx(this.config.specification.spineWidthMm), this.canvasHeight);

    // 绘制出血安全边界 (距裁切线内缩 3mm 处)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
    const safetyMm = 3;
    const safetyPx = this.mmToPx(safetyMm);
    
    ctx.strokeRect(sidePx + safetyPx, safetyPx, itemWPx - safetyPx * 2, this.canvasHeight - safetyPx * 2);
    ctx.restore();
  }

  /**
   * 7. 动态渲染单面封面或单面封底为 Canvas (应用于 PDF 印刷高清纯图注入场景)
   */
  public async renderSinglePageToCanvas(pageType: 'cover' | 'backCover'): Promise<HTMLCanvasElement> {
    const { widthMm, heightMm, bleedMm, wrapMm } = this.config.specification;
    
    // 单页包含左右、上下的出血线与包边
    const singleWidthMm = widthMm + (bleedMm + wrapMm) * 2;
    const singleHeightMm = heightMm + (bleedMm + wrapMm) * 2;

    const widthPx = Math.round(singleWidthMm * this.mmToPxScale);
    const heightPx = Math.round(singleHeightMm * this.mmToPxScale);

    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('[BookCoverRenderer] Failed to get canvas 2d context');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // A. 绘制单页背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, widthPx, heightPx);
    
    const bg = this.config.cover.background;
    if (bg.type === 'color') {
      ctx.fillStyle = bg.value;
      ctx.fillRect(0, 0, widthPx, heightPx);
    } else if (bg.type === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, widthPx, heightPx);
      const colors = this.extractColorsFromGradient(bg.value);
      if (colors.length >= 2) {
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(1, colors[colors.length - 1]);
      } else {
        grad.addColorStop(0, '#667EEA');
        grad.addColorStop(1, '#764BA2');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, widthPx, heightPx);
    } else if (bg.type === 'image') {
      try {
        const img = await this.loadImageAsync(bg.value);
        this.drawImageCover(ctx, img, 0, 0, widthPx, heightPx);
      } catch (err) {
        console.error('[BookCoverRenderer] Failed to draw background image:', err);
      }
    }

    // B. 将视口移动至安全区，裁剪并绘制局部元素
    const offsetPx = this.mmToPx(bleedMm + wrapMm);
    const activeWidthPx = this.mmToPx(widthMm);
    const activeHeightPx = this.mmToPx(heightMm);

    ctx.save();
    ctx.translate(offsetPx, offsetPx);
    this.clipSection(ctx, activeWidthPx, activeHeightPx);
    await this.drawSection(ctx, pageType, activeWidthPx, activeHeightPx);
    ctx.restore();

    return canvas;
  }

  /**
   * 实现 Canvas 上的 object-fit: cover 效果绘制图片
   */
  private drawImageCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (iw === 0 || ih === 0) return;

    const r = Math.max(w / iw, h / ih);
    const nw = w / r;
    const nh = h / r;
    const cx = (iw - nw) / 2;
    const cy = (ih - nh) / 2;

    ctx.drawImage(img, cx, cy, nw, nh, x, y, w, h);
  }

  /**
   * 6. 显存资源垃圾回收，促使浏览器立即释放大 Canvas 占用的显卡 Buffer
   */
  public dispose() {
    this.canvasWidth = 0;
    this.canvasHeight = 0;
  }
}
