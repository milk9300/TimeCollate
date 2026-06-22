import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    BookOpen, 
    Sparkles, 
    Image as ImageIcon, 
    ArrowRight, 
    Heart, 
    Eye, 
    User,
    Compass,
    TrendingUp,
    Shield,
    FolderGit
} from 'lucide-react';
import { getBookService } from '../../../services/serviceFactory';
import { useAuthStore } from '../../../store/useAuthStore';
import { GeneratedCover } from '../../editor/components/GeneratedCover';
import logoImg from '../../../assets/logo.png';
import type { Book } from '../../../types';

const bookService = getBookService();

/**
 * 拾光集公开落地页 (首页)
 * 面向所有用户公开，包含产品亮点介绍及精选公开作品预览
 */
export const Home: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user, logout } = useAuthStore();
    const [hotBooks, setHotBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHotBooks = async () => {
            try {
                // 默认拉取第 1 页的 6 本公开回忆书
                const response = await bookService.getPublicBooks(1, 6, 'all');
                setHotBooks(response.items || []);
            } catch (error) {
                console.error('Failed to load hot books on landing page:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHotBooks();
    }, []);

    const handleStartClick = () => {
        if (isAuthenticated) {
            navigate('/workbench');
        } else {
            navigate('/login');
        }
    };

    const handleBookClick = (bookId: string) => {
        // 免密以只读预览形式打开画册
        navigate(`/read/${bookId}`);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-['Outfit',_sans-serif] overflow-x-hidden selection:bg-indigo-500 selection:text-white">
            
            {/* 顶部通栏 Header - 磨砂玻璃质感 */}
            <header className="fixed top-0 left-0 right-0 h-20 bg-white/70 backdrop-blur-[20px] border-b border-slate-100/85 flex items-center justify-between px-6 sm:px-12 z-50 select-none">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
                    <img src={logoImg} alt="拾光集" className="w-10 h-10 object-contain group-hover:scale-105 transition-transform duration-300" />
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">拾光集</h1>
                </div>

                <nav className="hidden md:flex items-center gap-8 text-sm font-black text-slate-500">
                    <a href="#features" className="hover:text-indigo-600 transition-colors">功能特性</a>
                    <a href="#hot-books" className="hover:text-indigo-600 transition-colors">热门画册</a>
                    <a href="#about" className="hover:text-indigo-600 transition-colors">关于我们</a>
                </nav>

                <div className="flex items-center gap-4">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => navigate('/workbench')} 
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs.5 transition-all shadow-md shadow-indigo-100 flex items-center gap-2.5 cursor-pointer active:scale-95"
                            >
                                <Compass size={14} className="stroke-[2.5]" />
                                <span>进入工作台</span>
                            </button>
                            <div className="w-9 h-9 rounded-full border border-slate-100 overflow-hidden bg-indigo-50 flex items-center justify-center text-indigo-600">
                                {user?.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={16} />
                                )}
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={() => navigate('/login')} 
                            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs.5 transition-all shadow-md cursor-pointer active:scale-95"
                        >
                            <span>登录 / 注册</span>
                        </button>
                    )}
                </div>
            </header>

            {/* 1. Hero Area (项目宣传区) */}
            <section className="relative pt-36 pb-20 sm:pt-44 sm:pb-32 px-6 sm:px-12 flex flex-col items-center text-center select-none bg-gradient-to-b from-indigo-50/70 via-white to-transparent">
                {/* 装饰光环 */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-300/10 to-violet-300/15 rounded-full blur-3xl pointer-events-none z-0" />

                <div className="relative z-10 max-w-4xl flex flex-col items-center">
                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100/50 px-3.5 py-1 rounded-full text-indigo-600 text-[10px] font-black tracking-wider uppercase mb-6 animate-pulse">
                        <Sparkles size={11} />
                        <span>AI 智能画册整理平台</span>
                    </div>

                    <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
                        将岁月的温度，<br />
                        装订成一本<span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">精致的拟物手账</span>
                    </h2>

                    <p className="text-slate-500 text-sm.5 sm:text-base font-semibold leading-relaxed max-w-2xl mb-10">
                        拾光集是为您快捷整理回忆而生的手账生成器。在这里，您可以批量上传照片资产，套用精美的设计师排版模板，或者让 AI 智能提炼时间金句，一键生成拥有仿真 3D 翻页动效的实体质感回忆书。
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <button 
                            onClick={handleStartClick}
                            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer group hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <span>立即开启我的时光册</span>
                            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform stroke-[2.5]" />
                        </button>
                        
                        <a 
                            href="#hot-books"
                            className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <span>浏览精选画册</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* 2. 近期热门回忆书展示区 */}
            <section id="hot-books" className="py-20 px-6 sm:px-12 bg-white relative">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
                        <div>
                            <div className="flex items-center gap-1.5 text-indigo-600 font-black text-[11px] uppercase tracking-widest mb-2">
                                <TrendingUp size={14} />
                                <span>Recent Hot Memory Books</span>
                            </div>
                            <h3 className="text-2xl sm:text-3.5xl font-black text-slate-900 tracking-tight">
                                近期热门回忆书
                            </h3>
                            <p className="text-slate-400 text-xs.5 font-bold mt-1.5">
                                看看其他拾光者的精彩瞬间，点击书本即可免密直接流畅阅读
                            </p>
                        </div>
                        <button 
                            onClick={handleStartClick}
                            className="text-xs.5 font-black text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1 mt-4 md:mt-0 cursor-pointer"
                        >
                            <span>我也要制作一本</span>
                            <ArrowRight size={14} className="stroke-[2.5]" />
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="aspect-[3/4] bg-slate-50 border border-slate-100 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : hotBooks.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                            <BookOpen size={36} className="text-slate-350 mx-auto mb-3" />
                            <p className="text-slate-500 text-xs font-black">暂无公开图书展示。登录去创建您的第一本公开回忆书吧！</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 select-none">
                            {hotBooks.map(book => (
                                <div 
                                    key={book.id}
                                    onClick={() => handleBookClick(book.id)}
                                    className="group flex flex-col cursor-pointer"
                                >
                                    {/* 拟物化封面容器 */}
                                    <div className="w-full aspect-[3/4] rounded-r-[12px] rounded-l-[3px] bg-slate-100 shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden relative border border-slate-200/50">
                                        {/* 书脊折线阴影 */}
                                        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-r from-black/20 to-transparent z-20 pointer-events-none" />
                                        <div className="absolute left-[4px] top-0 bottom-0 w-[1px] bg-white/10 z-20 pointer-events-none" />
                                        
                                        {/* 封面渲染 */}
                                        <div className="w-[300px] h-[400px] absolute top-0 left-0" style={{ transform: 'scale(0.5333)', transformOrigin: 'top left' }}>
                                            <GeneratedCover 
                                                title={book.title} 
                                                author={book.author} 
                                                coverUrl={book.coverUrl} 
                                                mode="card" 
                                            />
                                        </div>
                                    </div>
                                    <h4 className="text-xs.5 font-bold text-slate-800 truncate mt-3.5 group-hover:text-indigo-600 transition-colors">
                                        {book.title}
                                    </h4>
                                    <div className="flex items-center justify-between mt-1 text-[10px] font-black text-slate-400">
                                        <span>@{book.author}</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="flex items-center gap-0.5">
                                                <Eye size={10} />
                                                {book.views || 0}
                                            </span>
                                            <span className="flex items-center gap-0.5">
                                                <Heart size={10} className="text-rose-400" />
                                                {book.likes || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* 3. 模块特色展示 (Features Showcase) */}
            <section id="features" className="py-20 px-6 sm:px-12 bg-slate-50 relative border-t border-slate-100/50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-16 select-none">
                        <div className="flex items-center justify-center gap-1.5 text-indigo-600 font-black text-[11px] uppercase tracking-widest mb-2">
                            <Compass size={14} />
                            <span>Unrivaled Features</span>
                        </div>
                        <h3 className="text-2xl sm:text-3.5xl font-black text-slate-900 tracking-tight">
                            极致的排版与创作体验
                        </h3>
                        <p className="text-slate-400 text-xs.5 font-bold mt-2">
                            每一项细节的精心雕琢，都是为了让您以极低的门槛记录宝贵的回忆。
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 select-none">
                        
                        <div className="bg-white border border-slate-150/40 p-8 rounded-3xl hover:shadow-md transition-all group">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-105 transition-transform shadow-sm">
                                <Sparkles size={20} className="stroke-[2.5]" />
                            </div>
                            <h4 className="text-sm font-black text-slate-800 mb-2">AI 智能金句排版</h4>
                            <p className="text-slate-500 text-xs.5 font-semibold leading-relaxed">
                                上传照片后，AI 可以智能识别画面内容并关联时间轴，自动为您生成符合照片情感的文字排版，省去绞尽脑汁码字的烦恼。
                            </p>
                        </div>

                        <div className="bg-white border border-slate-150/40 p-8 rounded-3xl hover:shadow-md transition-all group">
                            <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 mb-6 group-hover:scale-105 transition-transform shadow-sm">
                                <ImageIcon size={20} className="stroke-[2.5]" />
                            </div>
                            <h4 className="text-sm font-black text-slate-800 mb-2">预签名 OSS 极速直传</h4>
                            <p className="text-slate-500 text-xs.5 font-semibold leading-relaxed">
                                图片直达对象存储 (OSS) 服务器，无需经过应用后端中转。上传大容量的高清相册秒级响应，彻底告别等待与上传卡顿。
                            </p>
                        </div>

                        <div className="bg-white border border-slate-150/40 p-8 rounded-3xl hover:shadow-md transition-all group">
                            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-6 group-hover:scale-105 transition-transform shadow-sm">
                                <BookOpen size={20} className="stroke-[2.5]" />
                            </div>
                            <h4 className="text-sm font-black text-slate-800 mb-2">仿真 3D 拟物翻页预览</h4>
                            <p className="text-slate-500 text-xs.5 font-semibold leading-relaxed">
                                基于高性能渲染技术，为您生成带有精细书脊光影、纸质边缘叠加和物理重力翻页动效的预览视图，仿佛实体相册握在手中。
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* 4. 底部的二次引导与 Footer */}
            <section id="about" className="py-24 px-6 sm:px-12 bg-slate-900 text-white text-center relative overflow-hidden select-none">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-transparent pointer-events-none" />
                <div className="absolute -right-24 -bottom-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
                    <h3 className="text-2xl sm:text-4xl font-black tracking-tight leading-[1.2] mb-6">
                        即刻动身，<br />
                        将那些散落在时光里的温暖拼贴起来。
                    </h3>
                    <p className="text-slate-400 text-xs.5 font-bold leading-relaxed max-w-xl mb-8">
                        无论是青春的散场毕业照，还是旅行的奔跑瞬间、宝贝的第一声爸爸。拾光集让每一次翻阅，都成为一次暖心的心意共鸣。
                    </p>
                    <button 
                        onClick={handleStartClick}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm.5 transition-all shadow-xl shadow-indigo-950/20 flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                        <span>开始我的首部时光集</span>
                        <ArrowRight size={16} className="stroke-[2.5]" />
                    </button>
                </div>
            </section>

            {/* Footer 版权 */}
            <footer className="py-8 bg-slate-950 text-slate-500 text-[10px] font-black tracking-wider uppercase text-center border-t border-slate-900 select-none">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span>© 2026 TimeCollate (拾光集) Project. All Rights Reserved.</span>
                    <div className="flex items-center gap-6">
                        <a href="#" className="hover:text-slate-350 transition-colors">用户协议</a>
                        <a href="#" className="hover:text-slate-350 transition-colors">隐私政策</a>
                        <a href="#" className="hover:text-slate-350 transition-colors">安全声明</a>
                    </div>
                </div>
            </footer>

        </div>
    );
};
