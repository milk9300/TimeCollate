import React from 'react';
import type { Chapter, Page } from '../../types';

interface LayoutProps {
    chapter: Chapter;
    page?: Page;
}

// 简单哈希函数，根据 pageId 生成一个 0-3 的索引
const hashToPresetIndex = (id: string): number => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % 4;
};

// #region 预设模板定义
type PhotoStyle = { top: string; left: string; width: string; height: string; rotate: number; zIndex: number };

const PRESETS: Record<number, Record<number, PhotoStyle[]>> = {
    // Preset 0: 经典品字形
    0: {
        1: [{ top: '8%', left: '15%', width: '70%', height: '68%', rotate: -1, zIndex: 10 }],
        2: [
            { top: '3%', left: '5%', width: '52%', height: '48%', rotate: -2, zIndex: 10 },
            { top: '42%', left: '40%', width: '52%', height: '48%', rotate: 1.5, zIndex: 11 }
        ],
        3: [
            { top: '2%', left: '25%', width: '50%', height: '40%', rotate: -1, zIndex: 10 },
            { top: '38%', left: '3%', width: '45%', height: '38%', rotate: 1.5, zIndex: 11 },
            { top: '40%', left: '50%', width: '45%', height: '40%', rotate: -1.5, zIndex: 12 }
        ],
        4: [
            { top: '0%', left: '3%', width: '45%', height: '38%', rotate: -1.5, zIndex: 10 },
            { top: '2%', left: '50%', width: '45%', height: '36%', rotate: 1, zIndex: 11 },
            { top: '42%', left: '5%', width: '43%', height: '38%', rotate: 1, zIndex: 12 },
            { top: '44%', left: '52%', width: '44%', height: '40%', rotate: -1, zIndex: 13 }
        ]
    },
    // Preset 1: 对角线交错
    1: {
        1: [{ top: '5%', left: '10%', width: '75%', height: '70%', rotate: 2, zIndex: 10 }],
        2: [
            { top: '5%', left: '40%', width: '55%', height: '50%', rotate: 3, zIndex: 11 },
            { top: '45%', left: '5%', width: '50%', height: '45%', rotate: -2, zIndex: 10 }
        ],
        3: [
            { top: '0%', left: '5%', width: '48%', height: '42%', rotate: -3, zIndex: 10 },
            { top: '20%', left: '45%', width: '50%', height: '45%', rotate: 2, zIndex: 11 },
            { top: '55%', left: '15%', width: '45%', height: '38%', rotate: 0, zIndex: 12 }
        ],
        4: [
            { top: '2%', left: '45%', width: '48%', height: '40%', rotate: 2, zIndex: 11 },
            { top: '5%', left: '5%', width: '42%', height: '35%', rotate: -2, zIndex: 10 },
            { top: '40%', left: '50%', width: '45%', height: '42%', rotate: -1, zIndex: 13 },
            { top: '45%', left: '3%', width: '45%', height: '40%', rotate: 1.5, zIndex: 12 }
        ]
    },
    // Preset 2: 居中堆叠
    2: {
        1: [{ top: '10%', left: '18%', width: '64%', height: '65%', rotate: 0, zIndex: 10 }],
        2: [
            { top: '8%', left: '10%', width: '55%', height: '55%', rotate: -4, zIndex: 10 },
            { top: '28%', left: '32%', width: '55%', height: '55%', rotate: 3, zIndex: 11 }
        ],
        3: [
            { top: '5%', left: '8%', width: '50%', height: '48%', rotate: -5, zIndex: 10 },
            { top: '15%', left: '28%', width: '50%', height: '48%', rotate: 0, zIndex: 11 },
            { top: '38%', left: '40%', width: '52%', height: '50%', rotate: 4, zIndex: 12 }
        ],
        4: [
            { top: '0%', left: '5%', width: '45%', height: '42%', rotate: -4, zIndex: 10 },
            { top: '8%', left: '35%', width: '45%', height: '40%', rotate: 2, zIndex: 11 },
            { top: '35%', left: '10%', width: '48%', height: '45%', rotate: 1, zIndex: 12 },
            { top: '42%', left: '45%', width: '48%', height: '45%', rotate: -2, zIndex: 13 }
        ]
    },
    // Preset 3: 横向排列
    3: {
        1: [{ top: '15%', left: '12%', width: '76%', height: '60%', rotate: 0, zIndex: 10 }],
        2: [
            { top: '15%', left: '3%', width: '50%', height: '60%', rotate: -1, zIndex: 10 },
            { top: '18%', left: '47%', width: '50%', height: '58%', rotate: 1, zIndex: 11 }
        ],
        3: [
            { top: '10%', left: '2%', width: '38%', height: '55%', rotate: -2, zIndex: 10 },
            { top: '15%', left: '32%', width: '36%', height: '50%', rotate: 0, zIndex: 11 },
            { top: '12%', left: '60%', width: '38%', height: '55%', rotate: 2, zIndex: 12 }
        ],
        4: [
            { top: '5%', left: '2%', width: '35%', height: '45%', rotate: -2, zIndex: 10 },
            { top: '8%', left: '30%', width: '35%', height: '42%', rotate: 1, zIndex: 11 },
            { top: '45%', left: '10%', width: '38%', height: '42%', rotate: 0, zIndex: 12 },
            { top: '48%', left: '52%', width: '42%', height: '45%', rotate: -1, zIndex: 13 }
        ]
    }
};
// #endregion

/**
 * @description 智能拼贴排版
 * 根据页面ID自动选择不同预设模板，每页风格略有不同
 */
export const CollageLayout: React.FC<LayoutProps> = ({ chapter, page }) => {
    const currentPage = page || chapter.pages?.[0];
    const photos = (currentPage?.photos || []).slice(0, 4);
    const content = currentPage?.content || '';
    const photoCount = photos.length;

    // 根据 pageId 选择预设
    const presetIndex = hashToPresetIndex(currentPage?.id || 'default');
    const preset = PRESETS[presetIndex];
    const photoStyles = preset[photoCount] || preset[4] || [];

    return (
        <div className="w-full h-full p-[12mm] relative overflow-hidden bg-[var(--theme-bg)]">
            {/* 背景装饰 */}
            <div className="absolute top-[15%] right-[-8%] w-[35%] h-[35%] rounded-full bg-[var(--theme-accent)] opacity-[0.04] blur-3xl" />

            <div className="relative z-10 flex flex-col h-full overflow-hidden">
                {/* 标题区域 */}
                <header className="flex-shrink-0 mb-[5mm]">
                    <h2 className="text-[24pt] font-extrabold text-[var(--theme-primary)] leading-none tracking-tight line-clamp-1">
                        {chapter.title}
                    </h2>
                    <div className="mt-1.5 flex items-center gap-2">
                        <div className="w-6 h-[2px] bg-[var(--theme-accent)]" />
                        <span className="text-[7pt] font-mono text-[var(--theme-accent)] opacity-70">{chapter.date}</span>
                    </div>
                </header>

                {/* 图片拼贴区域 */}
                <div className="flex-1 relative min-h-0">
                    {photos.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
                            添加图片开始创作
                        </div>
                    ) : (
                        photos.map((photo, idx) => {
                            const style = photoStyles[idx];
                            if (!style) return null;

                            return (
                                <div
                                    key={photo.id}
                                    style={{
                                        position: 'absolute',
                                        top: style.top,
                                        left: style.left,
                                        width: style.width,
                                        height: style.height,
                                        transform: `rotate(${style.rotate}deg)`,
                                        zIndex: style.zIndex,
                                    }}
                                    className="bg-white p-[1.5mm] shadow-md border border-gray-100/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
                                >
                                    <img
                                        src={photo.url}
                                        className="w-full h-full object-cover"
                                        alt={photo.caption || '拼贴照片'}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>

                {/* 文字区域 */}
                {content && (
                    <footer className="flex-shrink-0 pt-[3mm] max-w-[65%] ml-auto text-right">
                        <p className="text-[8pt] text-[var(--theme-secondary)] italic leading-relaxed line-clamp-2">
                            "{content}"
                        </p>
                    </footer>
                )}
            </div>
        </div>
    );
};
