import React from 'react';
import { Monitor, Sparkles, BookOpen, Layers, Zap } from 'lucide-react';

/**
 * @description 极具质感的移动端访问适配与拦截宣传页组件
 * 采用毛玻璃背景与磨砂渐变，提供情感化文案引导用户使用桌面端，保障 3D 物理排版引擎的完美体验
 */
export const MobilePromo: React.FC = () => {
    return (
        <div 
            id="mobile-promo-page"
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 text-slate-800 overflow-y-auto bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900"
        >
            {/* 背景散布流光微动画 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] bg-purple-500 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[10%] w-[350px] h-[350px] bg-indigo-500 rounded-full blur-[130px] animate-pulse [animation-delay:2s]" />
            </div>

            {/* 主卡片容器 */}
            <div className="relative w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-center space-y-6">
                
                {/* 顶徽 */}
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Monitor className="text-white" size={28} />
                </div>

                <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-indigo-300">
                        桌面级回忆排版工坊
                    </span>
                    <h1 className="text-xl font-extrabold tracking-tight text-white">
                        大屏创作，方显时光温度
                    </h1>
                </div>

                {/* 装饰分割线 */}
                <div className="h-px bg-white/10 w-full" />

                {/* 情感描述文案 */}
                <div className="text-xs text-slate-300 leading-relaxed text-left space-y-3 font-normal">
                    <p>
                        为了给您提供极致细腻的视觉设计体验，<strong>《时光书》</strong>配备了高精度的 3D 拟真排版物理引擎与高自由度的自由拼贴视窗。
                    </p>
                    <p>
                        我们在桌面端为您准备了更为强大的排版设计工坊：
                    </p>
                    <ul className="grid grid-cols-2 gap-3 pt-2">
                        <li className="flex items-center gap-1.5 text-[11px] text-indigo-200">
                            <Layers size={12} />
                            <span>WYSIWYG 任意摆放</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-[11px] text-indigo-200">
                            <Sparkles size={12} />
                            <span>数百款精美艺术贴纸</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-[11px] text-indigo-200">
                            <BookOpen size={12} />
                            <span>海量对开排版模板</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-[11px] text-indigo-200">
                            <Zap size={12} />
                            <span>无损印刷级 PDF 导出</span>
                        </li>
                    </ul>
                </div>

                <div className="h-px bg-white/10 w-full" />

                {/* 引导操作 */}
                <div className="space-y-4">
                    <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-[11px] text-slate-300 select-all font-mono leading-normal">
                        请使用电脑浏览器访问当前网址进行排版设计
                    </div>
                    
                    <div className="text-[10px] text-slate-400">
                        * 时光漫漫，我们在更大的屏幕前等您。
                    </div>
                </div>
            </div>
        </div>
    );
};
