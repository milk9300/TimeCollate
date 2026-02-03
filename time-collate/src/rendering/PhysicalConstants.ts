/**
 * @description 物理渲染常量定义
 * 遵循 1:1 打印标准，使用 mm 单位
 */

export const PAGE_SIZES = {
    A4: {
        name: 'A4 标准级',
        width: 210,
        height: 297,
    },
    A5: {
        name: 'A5 手账级',
        width: 148,
        height: 210,
    },
    '16K': {
        name: '16开 杂志级',
        width: 184,
        height: 260,
    },
    B5: {
        name: 'B5 简约级',
        width: 176,
        height: 250,
    },
} as const;

export const PRINT_CONSTANTS = {
    SAFE_ZONE: 8,    // 优化后的安全页边距 (mm)
    BLEED: 3,        // 出血位 (mm) - 用于印刷时切除
    DPI: 300,        // 标准打印分辨率
};

export type PageSize = keyof typeof PAGE_SIZES;
