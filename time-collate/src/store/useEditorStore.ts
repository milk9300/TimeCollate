import { create } from 'zustand';

//#region Types Definition
export interface Element {
  id: string;
  type: 'image' | 'text' | 'sticker';
  x: number;          // 百分比或绝对坐标
  y: number;          // 百分比或绝对坐标
  width: number;      // 宽度
  height: number;     // 高度
  zIndex: number;     // 叠放层次
  aspectRatio?: number; // 宽高比 (针对图片)
  content?: string;   // 文本内容
  src?: string;       // 图片或贴纸资源路径
}

export interface CanvasConfig {
  width: number;            // 物理像素或逻辑宽度
  height: number;           // 物理像素或逻辑高度
  backgroundColor: string;  // 画布背景色
}

export interface CanvasPage {
  id: string;
  elements: Element[];
  config: CanvasConfig;
}

export interface EditorState {
  pages: Record<string, CanvasPage>;
  
  // Actions
  initPage: (pageId: string, config?: Partial<CanvasConfig>) => void;
  addElement: (pageId: string, element: Element) => void;
  updateElement: (pageId: string, elementId: string, partialChange: Partial<Element>) => void;
  deleteElement: (pageId: string, elementId: string) => void;
  bringToFront: (pageId: string, elementId: string) => void;
  sendToBack: (pageId: string, elementId: string) => void;
}
//#endregion

// 默认画布配置 (96 DPI 下的 A4 尺寸)
const DEFAULT_CONFIG: CanvasConfig = {
  width: 794,
  height: 1123,
  backgroundColor: '#ffffff',
};

export const useEditorStore = create<EditorState>((set, get) => ({
  pages: {},

  /**
   * 初始化页面配置
   */
  initPage: (pageId, config) => {
    set((state) => {
      if (state.pages[pageId]) return state;
      return {
        pages: {
          ...state.pages,
          [pageId]: {
            id: pageId,
            elements: [],
            config: { ...DEFAULT_CONFIG, ...config },
          },
        },
      };
    });
  },

  /**
   * 向指定页面添加元素
   */
  addElement: (pageId, element) => {
    set((state) => {
      const page = state.pages[pageId] || {
        id: pageId,
        elements: [],
        config: DEFAULT_CONFIG,
      };

      // 确保新添加的元素具有合理的 zIndex (当前最高 zIndex + 1)
      const maxZIndex = page.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
      const newElement = {
        ...element,
        zIndex: element.zIndex || maxZIndex + 1,
      };

      return {
        pages: {
          ...state.pages,
          [pageId]: {
            ...page,
            elements: [...page.elements, newElement],
          },
        },
      };
    });
  },

  /**
   * 更新单个元素的属性
   */
  updateElement: (pageId, elementId, partialChange) => {
    set((state) => {
      const page = state.pages[pageId];
      if (!page) return state;

      const updatedElements = page.elements.map((el) =>
        el.id === elementId ? { ...el, ...partialChange } : el
      );

      return {
        pages: {
          ...state.pages,
          [pageId]: {
            ...page,
            elements: updatedElements,
          },
        },
      };
    });
  },

  /**
   * 删除指定页面中的元素
   */
  deleteElement: (pageId, elementId) => {
    set((state) => {
      const page = state.pages[pageId];
      if (!page) return state;

      return {
        pages: {
          ...state.pages,
          [pageId]: {
            ...page,
            elements: page.elements.filter((el) => el.id !== elementId),
          },
        },
      };
    });
  },

  /**
   * 调整元素层级到最前面 (bringToFront)
   * 采用重排算法：非目标元素按 zIndex 升序分配 1 到 N-1，目标元素分配 N
   */
  bringToFront: (pageId, elementId) => {
    set((state) => {
      const page = state.pages[pageId];
      if (!page) return state;

      const elements = page.elements;
      const target = elements.find((el) => el.id === elementId);
      if (!target) return state;

      const otherElementsSorted = elements
        .filter((el) => el.id !== elementId)
        .sort((a, b) => a.zIndex - b.zIndex);

      const updatedElements = otherElementsSorted.map((el, index) => ({
        ...el,
        zIndex: index + 1,
      }));

      target.zIndex = elements.length;
      updatedElements.push(target);

      return {
        pages: {
          ...state.pages,
          [pageId]: {
            ...page,
            elements: updatedElements,
          },
        },
      };
    });
  },

  /**
   * 调整元素层级到最底端 (sendToBack)
   * 采用重排算法：目标元素分配 1，非目标元素按 zIndex 升序分配 2 到 N
   */
  sendToBack: (pageId, elementId) => {
    set((state) => {
      const page = state.pages[pageId];
      if (!page) return state;

      const elements = page.elements;
      const target = elements.find((el) => el.id === elementId);
      if (!target) return state;

      const otherElementsSorted = elements
        .filter((el) => el.id !== elementId)
        .sort((a, b) => a.zIndex - b.zIndex);

      const updatedElements = otherElementsSorted.map((el, index) => ({
        ...el,
        zIndex: index + 2,
      }));

      target.zIndex = 1;
      updatedElements.unshift(target);

      return {
        pages: {
          ...state.pages,
          [pageId]: {
            ...page,
            elements: updatedElements,
          },
        },
      };
    });
  },
}));
