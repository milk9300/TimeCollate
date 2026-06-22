import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Search } from 'lucide-react';
import { OmniSearchModal } from './OmniSearchModal';

interface MainLayoutProps {
    children: ReactNode;
    title: string;
    description?: string;
    onSearch?: (query: string) => void;
    hideSearch?: boolean;
    hideHeader?: boolean; // 新增：支持隐藏头部以实现全高拟物/看板效果
}

/**
 * 应用主布局组件（含极窄侧边栏和通用的顶部导航栏）
 * 支持 iOS 磨砂玻璃效果置顶以及全局 Cmd + K Spotlight 检索
 */
export function MainLayout({ children, title, hideSearch = false, hideHeader = false }: MainLayoutProps) {
    const [isOmniOpen, setIsOmniOpen] = useState(false);

    // 全局快捷键监听 Cmd+K / Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsOmniOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Canva 式极窄侧边栏 (72px) */}
            <Sidebar />

            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* 顶部导航栏 - 如果设置了 hideHeader 则不渲染 */}
                {!hideHeader && (
                    <header className="absolute top-0 left-0 right-0 h-20 bg-white/70 backdrop-blur-[20px] border-b border-slate-100 flex items-center justify-between px-8 z-30 select-none">
                        <div className="flex items-center gap-4">
                            <h2 className="text-base font-black text-slate-800 tracking-tight">{title}</h2>
                        </div>

                        <div className="flex items-center gap-4 relative">
                            {!hideSearch && (
                                <button
                                    onClick={() => setIsOmniOpen(true)}
                                    className="flex items-center gap-2.5 px-4 py-2 bg-slate-100 hover:bg-slate-200/60 border border-slate-200/20 text-slate-400 hover:text-slate-650 rounded-xl transition-all font-bold text-xs select-none cursor-pointer group/btn"
                                >
                                    <Search size={14} className="text-slate-400 group-hover/btn:text-slate-650 transition-colors" />
                                    <span>搜索全局...</span>
                                    <span className="text-[9px] font-black bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400 uppercase tracking-wide ml-1.5 shadow-sm">
                                        Cmd + K
                                    </span>
                                </button>
                            )}
                        </div>
                    </header>
                )}

                {/* 内容容器 - 如果隐藏了头部则不保留顶部内边距 pt-20 */}
                <div className={`flex-1 overflow-y-auto custom-scrollbar ${hideHeader ? 'pt-0' : 'pt-20'}`}>
                    {children}
                </div>
            </main>

            {/* 全局 Spotlight 搜索 */}
            <OmniSearchModal isOpen={isOmniOpen} onClose={() => setIsOmniOpen(false)} />
        </div>
    );
}
