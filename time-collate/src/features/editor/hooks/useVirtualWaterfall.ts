// #region Description
import { useMemo } from 'react';

export interface WaterfallItem {
    id: string;
    metadata: {
        width?: number;
        height?: number;
        [key: string]: any;
    } | null;
    [key: string]: any;
}

interface UseVirtualWaterfallProps<T extends WaterfallItem> {
    items: T[];
    columnCount: number;
    columnWidth: number;
    gap: number;
    scrollTop: number;
    viewportHeight: number;
    bufferHeight?: number;
}

export interface PositionedItem<T> {
    item: T;
    style: {
        position: 'absolute';
        top: number;
        left: number;
        width: number;
        height: number;
    };
}

/**
 * 自定义虚拟化瀑布流计算 Hook
 * 用于在滚动视口中计算仅处于可见区域内的卡片节点，进行 DOM 视图回收，保障海量素材加载性能。
 */
export function useVirtualWaterfall<T extends WaterfallItem>({
    items,
    columnCount,
    columnWidth,
    gap,
    scrollTop,
    viewportHeight,
    bufferHeight
}: UseVirtualWaterfallProps<T>) {
    // 1. 预计算所有卡片在绝对定位下的坐标 mapping
    const { layoutMap, totalContainerHeight } = useMemo(() => {
        const colHeights = new Array(columnCount).fill(0);
        const map = new Map<string, { top: number; left: number; width: number; height: number }>();

        items.forEach((item) => {
            // 找到当前高度最小的列进行放置
            let minColIndex = 0;
            let minColHeight = colHeights[0];
            for (let i = 1; i < columnCount; i++) {
                if (colHeights[i] < minColHeight) {
                    minColHeight = colHeights[i];
                    minColIndex = i;
                }
            }

            const width = columnWidth;
            // 读取图片尺寸元数据，默认 1:1
            const widthMeta = item.metadata?.width;
            const heightMeta = item.metadata?.height;
            const ratio = (widthMeta && heightMeta) ? (widthMeta / heightMeta) : 1.0;
            
            // 限制宽高比，防止极端窄高图占用过多纵向空间 (限制在 0.618 黄金分割比例到 1.618 之间)
            const clampedRatio = Math.max(0.618, Math.min(ratio, 1.618));
            const height = width / clampedRatio;

            const left = minColIndex * (columnWidth + gap);
            const top = minColHeight;

            map.set(item.id, { top, left, width, height });

            // 累加该列高度
            colHeights[minColIndex] = top + height + gap;
        });

        const totalContainerHeight = Math.max(...colHeights, 0);

        return { layoutMap: map, totalContainerHeight };
    }, [items, columnCount, columnWidth, gap]);

    // 2. 根据滚动偏移量 scrollTop 过滤计算出当前可见的卡片列表
    const visibleItems = useMemo(() => {
        const buffer = bufferHeight ?? viewportHeight; // 默认缓冲区为 1 屏高
        const startY = Math.max(0, scrollTop - buffer);
        const endY = scrollTop + viewportHeight + buffer;

        const result: PositionedItem<T>[] = [];

        items.forEach((item) => {
            const layout = layoutMap.get(item.id);
            if (!layout) return;

            const { top, left, height } = layout;
            // 碰撞检测：项底部大于可见区间起点 且 项顶部小于可见区间终点
            if (top + height >= startY && top <= endY) {
                result.push({
                    item,
                    style: {
                        position: 'absolute',
                        top,
                        left,
                        width: layout.width,
                        height
                    }
                });
            }
        });

        return result;
    }, [items, layoutMap, scrollTop, viewportHeight, bufferHeight]);

    return {
        visibleItems,
        totalContainerHeight
    };
}
// #endregion
