import React from 'react';

/**
 * @description 完全空白页布局
 * 用于模拟真实书籍的衬纸、封二、封三等无需内容的页面
 */
export const EmptyLayout: React.FC = () => {
    return (
        <div className="w-full h-full bg-[var(--theme-bg)] relative overflow-hidden">
            {/* 纸张纹理感 (可选) */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] pointer-events-none" />
        </div>
    );
};
