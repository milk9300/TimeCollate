import React from 'react';
import { BookOpen } from 'lucide-react';

/**
 * 移动端/平板专属 2D 高性能拟物书籍组件
 * 彻底移除昂贵的 3D GPU 偏转与重度 Lottie 运行时依赖
 * 纯采用高效 CSS @keyframes 帧控制进行封面水平抽拉与柔和呼吸，零重构发热
 */
export default function MobileLottieBook() {
  return (
    <div className="relative w-[210px] h-[280px] flex items-center justify-center">
      {/* 注入极轻量的高性能 CSS 硬件加速动画 */}
      <style>{`
        @keyframes page-breath-2d {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.025) translateY(-5px); }
        }
        @keyframes cover-slide-2d {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          50% { transform: translateX(-10px) rotate(-1.5deg); }
        }
        .animate-book-breath {
          animation: page-breath-2d 6s ease-in-out infinite;
          will-change: transform;
        }
        .animate-cover-slide {
          animation: cover-slide-2d 6s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>

      {/* 2D 拟物书籍外层 (携带呼吸投影) */}
      <div className="relative w-full h-full animate-book-breath rounded-r-[12px] rounded-l-[3px] shadow-[0_15px_30px_rgba(0,0,0,0.1),_0_5px_10px_rgba(0,0,0,0.05)]">
        
        {/* 内层页 (Page Stack behind the cover - 封面滑开时露出) */}
        <div className="absolute inset-0 bg-[#FAF4ED] rounded-r-[12px] rounded-l-[3px] border border-[#EEEBE5] z-10 flex flex-col justify-between p-6 shadow-[inset_12px_0_24px_rgba(0,0,0,0.06),_3px_5px_10px_rgba(0,0,0,0.05)] pointer-events-none select-none">
          <div className="absolute right-0 inset-y-0 w-[4px] bg-stone-100 border-l border-stone-200 rounded-r-[12px]" />
          
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#FAF7EE] flex items-center justify-center border border-[#EEEBE5] shadow-inner">
              <BookOpen className="w-5 h-5 text-amber-700 stroke-[1.5]" />
            </div>
            <h4 className="font-serif text-base font-bold text-stone-800">
              拾光册内页
            </h4>
            <div className="w-6 h-[1px] bg-amber-600/30 mx-auto" />
            <p className="text-[8px] text-stone-400 font-light leading-relaxed max-w-[120px]">
              记录最真挚的故事
            </p>
          </div>
          
          <div className="text-center text-[7px] font-mono text-stone-400 uppercase tracking-widest pt-2 border-t border-stone-200/50">
            TimeCollate Portal
          </div>
        </div>

        {/* 前封面 (Front Cover - 平滑左滑偏转) */}
        <div className="absolute inset-0 bg-[#FAF7EE] rounded-r-[12px] rounded-l-[3px] border border-stone-250/30 z-20 shadow-md animate-cover-slide overflow-hidden flex flex-col justify-between p-6 select-none">
          {/* 书脊凹槽线 */}
          <div className="absolute left-[8px] inset-y-0 w-[3px] bg-gradient-to-r from-black/15 via-transparent to-transparent pointer-events-none" />
          <div className="absolute left-[11px] inset-y-0 w-[1px] bg-white/20 pointer-events-none" />

          {/* 封面文艺线框 */}
          <div className="absolute inset-3 border border-amber-600/10 rounded-r-[9px] rounded-l-[2px] pointer-events-none" />

          {/* 封面标题排版 */}
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 mt-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center border border-amber-600/10 shadow-sm">
              <BookOpen className="w-6 h-6 text-amber-700 stroke-[1.5]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-serif text-lg font-bold text-stone-850 tracking-wider">
                拾光记忆书
              </h4>
              <p className="text-[8px] text-stone-400 font-mono tracking-widest uppercase">TimeCollate</p>
            </div>
          </div>

          <div className="text-center text-[8px] text-stone-400 font-serif italic tracking-wide">
            让翻页，余音绕梁
          </div>

          {/* 2D 扫光反光带 */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-150%] hover:translate-x-[150%] transition-transform duration-1000 ease-out pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
