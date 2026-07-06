import React, { useEffect, useState, useRef } from 'react';
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
    Check,
    ChevronLeft,
    ChevronRight,
    Play,
    Upload,
    Wand2,
    Edit3,
    Printer,
    Layers,
    Activity,
    BookMarked
} from 'lucide-react';
import { getBookService } from '../../../services/serviceFactory';
import { useAuthStore } from '../../../store/useAuthStore';
import { GeneratedCover } from '../../editor/components/GeneratedCover';
import logoImg from '../../../assets/logo.png';
import type { Book } from '../../../types';

const bookService = getBookService();

// 静态 Mock 数据：用于热门图书在没有数据时的兜底
const mockHotBooks = [
    { id: 'mock-b1', title: '毕业，是青涩的终点 🎓', author: '同桌的你', coverUrl: 'design://?layout=classic&bg=slate-blue', views: 560, likes: 120 },
    { id: 'mock-b2', title: '西藏骑行记 · 追风少年 🚴‍♂️', author: '旅行家老张', coverUrl: 'design://?layout=modern&bg=sunset-orange', views: 420, likes: 98 },
    { id: 'mock-b3', title: '可乐的成长温暖日记 🐶', author: '可乐排版匠', coverUrl: 'design://?layout=minimal&bg=cotton-white', views: 350, likes: 85 },
    { id: 'mock-b4', title: '我们的恋爱两周年纪念 👩‍❤️‍👨', author: '心动收集器', coverUrl: 'design://?layout=art&bg=peach-summer', views: 280, likes: 72 },
    { id: 'mock-b5', title: '夏日海滨慢生活 🏖️', author: '慵懒的树懒', coverUrl: 'design://?layout=modern&bg=glacier-mist', views: 210, likes: 60 },
    { id: 'mock-b6', title: '深林徒步与篝火之夜 🌲', author: '野营爱好者', coverUrl: 'design://?layout=classic&bg=forest-green', views: 180, likes: 45 },
];


/**
 * 拾光集公开落地页 (首页 V2.0 - Apple + Canva 风格)
 * 面向所有用户公开，包含产品亮点介绍及精选公开作品预览
 */
export const Home: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();
    const [hotBooks, setHotBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Header 滚动毛玻璃状态
    const [isScrolled, setIsScrolled] = useState(false);


    // 3D CoverFlow 热门画册聚焦索引状态
    const [activeIndex, setActiveIndex] = useState(0);

    const displayHotBooks = hotBooks.length > 0 ? hotBooks : mockHotBooks;
    const activeBook = displayHotBooks[activeIndex];

    const handleNextBook = () => {
        setActiveIndex(prev => {
            const count = displayHotBooks.length > 0 ? displayHotBooks.length : 6;
            return (prev + 1) % count;
        });
    };

    const handlePrevBook = () => {
        setActiveIndex(prev => {
            const count = displayHotBooks.length > 0 ? displayHotBooks.length : 6;
            return (prev - 1 + count) % count;
        });
    };

    // 根据画册标题动态推导高逼真、文艺的描述（防空设计）
    const getBookDescription = (title: string) => {
        if (title.includes('毕业') || title.includes('青涩')) {
            return '记录了四年同窗岁月的欢笑与泪水，用精致手账锁线装帧，致我们终将逝去却永远闪光的青春。';
        }
        if (title.includes('西藏') || title.includes('骑行') || title.includes('旅')) {
            return '骑行 2000 公里穿越雪山、荒漠与圣湖，追寻生命的纯粹自由，倾听风掠过经幡的声音。';
        }
        if (title.includes('成长') || title.includes('宝贝') || title.includes('可乐')) {
            return '从软糯的满月啼哭到蹒跚奔跑的调皮捣蛋，用光影精心定格小生命不可复制的童真瞬间。';
        }
        if (title.includes('恋爱') || title.includes('周年') || title.includes('爱人') || title.includes('心动')) {
            return '两百张拍立得合照、多个城市的足迹，手写涂鸦与票根拼贴，封存两人最真挚甜蜜的恋爱温度。';
        }
        if (title.includes('海滨') || title.includes('慢生活') || title.includes('沙滩')) {
            return '听微风与海浪的低吟，收集那些赤脚踩在沙滩上的慵懒午后，让时间流逝得再慢一些。';
        }
        if (title.includes('深林') || title.includes('徒步') || title.includes('篝火') || title.includes('探险')) {
            return '星空下的荒野呼唤，篝火旁低沉悠扬的吉他民谣，用粗砺的牛皮底纹封存致敬自由的灵魂。';
        }
        return '收集零落在岁月里的精彩碎屑，用拟物手账的纸张厚度与细腻排版，封存专属于你独一无二的时光印记。';
    };

    // 滚动监听
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 20) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 动态启用全局滚动条（解决 index.css 中 html, body { overflow: hidden; } 导致首页无法滚动的问题）
    useEffect(() => {
        const htmlEl = document.documentElement;
        const bodyEl = document.body;

        const originalHtmlOverflow = htmlEl.style.overflow;
        const originalBodyOverflow = bodyEl.style.overflow;

        htmlEl.style.overflow = 'auto';
        bodyEl.style.overflow = 'auto';

        return () => {
            htmlEl.style.overflow = originalHtmlOverflow;
            bodyEl.style.overflow = originalBodyOverflow;
        };
    }, []);

    // 加载热门画册 (广场公开书籍)
    useEffect(() => {
        const fetchHotBooks = async () => {
            try {
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

    // 热门作品 3D 轮播自动播放 (Hover 容器时暂停，离开恢复，每 5 秒平滑切页)
    useEffect(() => {
        if (isLoading || displayHotBooks.length === 0) return;

        let autoplayTimer: any;
        let isHovered = false;

        const container = document.getElementById('hot-books');
        const handleMouseEnter = () => { isHovered = true; };
        const handleMouseLeave = () => { isHovered = false; };

        if (container) {
            container.addEventListener('mouseenter', handleMouseEnter);
            container.addEventListener('mouseleave', handleMouseLeave);
        }

        autoplayTimer = setInterval(() => {
            if (!isHovered) {
                handleNextBook();
            }
        }, 5000);

        return () => {
            clearInterval(autoplayTimer);
            if (container) {
                container.removeEventListener('mouseenter', handleMouseEnter);
                container.removeEventListener('mouseleave', handleMouseLeave);
            }
        };
    }, [isLoading, displayHotBooks.length]);


    const handleStartClick = () => {
        if (isAuthenticated) {
            navigate('/workbench');
        } else {
            navigate('/login');
        }
    };

    const handleBookClick = (bookId: string) => {
        if (bookId.startsWith('mock-')) {
            // Mock 数据无法阅读，提示引导开始制作
            handleStartClick();
        } else {
            navigate(`/read/${bookId}`);
        }
    };


    return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-['Outfit',_sans-serif] overflow-x-hidden selection:bg-[#C5A059] selection:text-white">

            {/* CSS 动画注入 */}
            <style>{`
                @keyframes float-photo-1 {
                    0%, 100% { transform: translateY(0px) rotate(-3deg); }
                    50% { transform: translateY(-15px) rotate(-1deg); }
                }
                @keyframes float-photo-2 {
                    0%, 100% { transform: translateY(0px) rotate(4deg); }
                    50% { transform: translateY(-12px) rotate(6deg); }
                }
                @keyframes float-photo-3 {
                    0%, 100% { transform: translateY(0px) rotate(-2deg); }
                    50% { transform: translateY(-16px) rotate(-4deg); }
                }
                @keyframes bounce-down {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(8px); }
                }
                .animate-float-1 { animation: float-photo-1 6s ease-in-out infinite; }
                .animate-float-2 { animation: float-photo-2 5s ease-in-out infinite; }
                .animate-float-3 { animation: float-photo-3 7s ease-in-out infinite; }
                .animate-bounce-down { animation: bounce-down 1.8s infinite ease-in-out; }
                
                .perspective-1500 { perspective: 1500px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                
                .book-hover-3d {
                    transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1);
                }
                .book-hover-3d:hover {
                    transform: perspective(800px) rotateY(-10deg) translateY(-6px) scale(1.03);
                    box-shadow: 15px 25px 35px rgba(0, 0, 0, 0.15);
                }
                html {
                    scroll-behavior: smooth;
                }
            `}</style>

            {/* 顶部通栏 Header */}
            <header className={`fixed top-0 left-0 right-0 transition-all duration-300 flex items-center justify-between px-6 sm:px-12 z-50 select-none bg-[#FDFBF7]/45 backdrop-blur-[20px] border-b border-[#EEEBE5]/60 ${isScrolled
                ? 'h-16 shadow-[0_8px_30px_rgb(0,0,0,0.03)]'
                : 'h-20 shadow-none'
                }`}>
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
                    <img src={logoImg} alt="拾光集" className="w-10 h-10 object-contain group-hover:scale-105 transition-transform duration-300" />
                    <h1 className="text-xl font-black text-[#2C3539] tracking-tight">拾光集</h1>
                </div>

                <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-[#56534C]">
                    <a href="#features" className="hover:text-[#C5A059] transition-colors">功能特性</a>
                    <a href="#hot-books" className="hover:text-[#C5A059] transition-colors">热门画册</a>
                    <a href="#pricing" className="hover:text-[#C5A059] transition-colors">服务价格</a>
                    <a href="#about" className="hover:text-[#C5A059] transition-colors">关于我们</a>
                </nav>

                <div className="flex items-center gap-4">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/workbench')}
                                className="px-5 py-2.5 bg-[#3A4454] hover:bg-[#2C3539] text-[#FDFBF7] rounded-xl font-bold text-xs.5 transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                            >
                                <Compass size={14} className="stroke-[2.5]" />
                                <span>进入工作台</span>
                            </button>
                            <div className="w-9 h-9 rounded-full border border-[#EEEBE5] overflow-hidden bg-[#FAF4ED] flex items-center justify-center text-[#3A4454]">
                                {user?.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={16} />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/login')}
                                className="px-4 py-2 text-sm font-bold text-[#56534C] hover:text-[#C5A059] transition-all cursor-pointer"
                            >
                                登录
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#b08e4d] text-white rounded-xl font-bold text-xs.5 transition-all shadow-md cursor-pointer active:scale-95"
                            >
                                <span>开始制作</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* 1. Hero 区域 */}
            <section className="relative min-h-[92vh] pt-32 pb-16 px-6 sm:px-12 flex flex-col items-center justify-center text-center overflow-hidden select-none bg-[#FDFBF7]">

                {/* 视频背景与混合遮罩 */}
                <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
                    <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
                        <source src="/videos/hero-bg.mp4" type="video/mp4" />
                        <source src="https://assets.mixkit.co/videos/preview/mixkit-scenic-view-of-clouds-floating-over-mountains-43093-large.mp4" type="video/mp4" />
                    </video>
                    {/* 毛玻璃与米色渐变蒙层 */}
                    <div className="absolute inset-0 bg-white/45 backdrop-blur-[2px] z-10" />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#FDFBF7]/60 via-[#FDFBF7]/85 to-[#FDFBF7] z-20" />
                </div>

                {/* 漂浮照片装饰 (增强情绪价值) */}
                <div className="absolute left-[8%] top-[25%] w-[120px] sm:w-[150px] aspect-[4/5] p-2 bg-[#FAF7EE] shadow-xl border border-slate-200/50 rounded-lg animate-float-1 z-30 hidden lg:block pointer-events-none">
                    <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80" className="w-full h-[80%] object-cover rounded" />
                    <div className="text-[9px] text-[#747067] text-left mt-2 font-serif font-semibold italic">🏔️ 2024.夏 · 旅途</div>
                </div>
                <div className="absolute right-[6%] top-[20%] w-[130px] sm:w-[160px] aspect-[1] p-2 bg-[#FAF7EE] shadow-xl border border-slate-200/50 rounded-lg animate-float-2 z-30 hidden lg:block pointer-events-none">
                    <img src="https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=300&q=80" className="w-full h-[82%] object-cover rounded" />
                    <div className="text-[9px] text-[#747067] text-left mt-2 font-serif font-semibold italic">👩‍❤️‍👨 二周年 · 纪念</div>
                </div>
                <div className="absolute left-[6%] bottom-[15%] w-[140px] p-2 bg-[#FAF7EE] shadow-xl border border-slate-200/50 rounded-lg animate-float-3 z-30 hidden lg:block pointer-events-none">
                    <img src="https://images.unsplash.com/photo-1472289065668-ce650ac443d2?auto=format&fit=crop&w=300&q=80" className="w-full h-[100px] object-cover rounded" />
                    <div className="text-[9px] text-[#747067] text-left mt-2 font-serif font-semibold italic">🐾 小狗的奔跑瞬间</div>
                </div>

                <div className="relative z-30 max-w-4xl flex flex-col items-center mt-6">
                    {/* 📖 Product Badge */}
                    <div className="flex items-center gap-2 bg-[#FAF4ED] border border-[#C5A059]/30 px-4 py-1.5 rounded-full text-[#C5A059] text-xs font-bold tracking-wider mb-8 shadow-sm">
                        <BookOpen size={13} className="text-[#C5A059]" />
                        <span>拟物回忆书 · 零门槛可视化拖拽排版</span>
                    </div>

                    {/* 超大主标题 */}
                    <h2 className="text-4xl sm:text-6xl lg:text-7.5xl font-black text-[#2C3539] tracking-tight leading-[1.05] mb-8 font-sans">
                        将岁月的温度，<br />
                        装订成一本<span className="bg-gradient-to-r from-[#C5A059] via-[#764BA2] to-[#3A4454] bg-clip-text text-transparent font-serif">精致的拟物手账</span>
                    </h2>

                    {/* Description + 3 Features */}
                    <div className="flex flex-col items-center gap-6 mb-12">
                        <p className="text-[#56534C] text-base sm:text-lg font-semibold leading-relaxed max-w-2xl">
                            拾光集是一款高质感的可视化时光手账制作平台。提供自由画布与拟物翻书视效，留住生活最温润的轮廓。
                        </p>

                        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-2">
                            <span className="flex items-center gap-1.5 text-sm font-bold text-[#3A4454]">
                                <Check size={16} className="text-[#C5A059] stroke-[3]" />
                                <span>多款精装主题模板</span>
                            </span>
                            <span className="flex items-center gap-1.5 text-sm font-bold text-[#3A4454]">
                                <Check size={16} className="text-[#C5A059] stroke-[3]" />
                                <span>自由画布拖拽编辑</span>
                            </span>
                            <span className="flex items-center gap-1.5 text-sm font-bold text-[#3A4454]">
                                <Check size={16} className="text-[#C5A059] stroke-[3]" />
                                <span>高仿真 3D 拟物预览</span>
                            </span>
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="flex flex-col items-center gap-4 w-full">
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            <button
                                onClick={handleStartClick}
                                className="px-10 py-4 bg-[#C5A059] hover:bg-[#b08e4d] hover:shadow-lg text-white rounded-2xl font-black text-sm.5 transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <span>立即免费制作</span>
                                <ArrowRight size={16} className="stroke-[2.5]" />
                            </button>

                            <a
                                href="#templates"
                                className="px-10 py-4 bg-white hover:bg-slate-50 text-[#56534C] border border-[#EEEBE5] rounded-2xl font-black text-sm.5 transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
                            >
                                <span>浏览设计模板</span>
                            </a>
                        </div>

                    </div>
                </div>

                {/* Scroll to Explore */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-35 text-[#9B978E]">
                    <span className="text-[10px] font-black uppercase tracking-widest">向下探索</span>
                    <div className="animate-bounce-down">
                        <ArrowRight size={16} className="rotate-90 stroke-[2.5] text-[#C5A059]" />
                    </div>
                </div>
            </section>

            {/* 2. 为什么选择拾光集 (Feature Cards) */}
            <section id="features" className="py-24 px-6 sm:px-12 bg-[#F7F4EF] relative border-t border-[#EEEBE5]/50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-20 select-none">
                        <div className="flex items-center justify-center gap-1.5 text-[#C5A059] font-black text-[11px] uppercase tracking-widest mb-3">
                            <Activity size={14} />
                            <span>Why TimeCollate</span>
                        </div>
                        <h3 className="text-3xl sm:text-4.5xl font-black text-[#2C3539] tracking-tight">
                            为什么选择拾光集？
                        </h3>
                        <p className="text-[#9B978E] text-sm.5 font-bold mt-2.5">
                            为每一段不可复制的岁月，提供量身定制的精工装帧艺术
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                        <div className="bg-[#FDFBF7] border border-[#EEEBE5] p-8 sm:p-10 rounded-[32px] hover:shadow-xl transition-all duration-300 group hover:-translate-y-1.5 flex flex-col justify-between">
                            <div>
                                <div className="w-14 h-14 bg-[#FAF4ED] rounded-2.5xl flex items-center justify-center text-[#C5A059] mb-8 group-hover:scale-105 transition-transform shadow-sm">
                                    <BookMarked size={24} className="stroke-[2]" />
                                </div>
                                <h4 className="text-lg font-black text-[#2C3539] mb-4">精选主题模板一键建册</h4>
                                <p className="text-[#56534C] text-sm font-semibold leading-relaxed">
                                    提供毕业、旅行、情侣恋爱与宝宝成长等多场景模板。导入相片即可根据选定的设计主题，快速生成结构清晰、色彩协调的时光册初稿。
                                </p>
                            </div>
                            <div className="mt-8 text-xs font-black text-[#C5A059] flex items-center gap-1">
                                <span>精美模板 · 快速成册</span>
                            </div>
                        </div>

                        <div className="bg-[#FDFBF7] border border-[#EEEBE5] p-8 sm:p-10 rounded-[32px] hover:shadow-xl transition-all duration-300 group hover:-translate-y-1.5 flex flex-col justify-between">
                            <div>
                                <div className="w-14 h-14 bg-purple-50 rounded-2.5xl flex items-center justify-center text-[#764BA2] mb-8 group-hover:scale-105 transition-transform shadow-sm">
                                    <Edit3 size={24} className="stroke-[2]" />
                                </div>
                                <h4 className="text-lg font-black text-[#2C3539] mb-4">高度自由的拟物手账编辑</h4>
                                <p className="text-[#56534C] text-sm font-semibold leading-relaxed">
                                    提供多达数十款由插画师独立设计的艺术贴纸、复古胶带和纸张底纹。配合强大的画布拖拽编辑器，你可根据喜好无拘无束地二次排版。
                                </p>
                            </div>
                            <div className="mt-8 text-xs font-black text-[#764BA2] flex items-center gap-1">
                                <span>自由拼贴 · 精致拟物</span>
                            </div>
                        </div>

                        <div className="bg-[#FDFBF7] border border-[#EEEBE5] p-8 sm:p-10 rounded-[32px] hover:shadow-xl transition-all duration-300 group hover:-translate-y-1.5 flex flex-col justify-between">
                            <div>
                                <div className="w-14 h-14 bg-blue-50 rounded-2.5xl flex items-center justify-center text-[#3A4454] mb-8 group-hover:scale-105 transition-transform shadow-sm">
                                    <Printer size={24} className="stroke-[2]" />
                                </div>
                                <h4 className="text-lg font-black text-[#2C3539] mb-4">仿真 3D 翻页与实体交付</h4>
                                <p className="text-[#56534C] text-sm font-semibold leading-relaxed">
                                    集成高仿真 3D 物理翻页渲染算法，在屏幕上也能实现极具纸张重力和书脊阴影的预览体验。同时支持高水准印刷工厂对接，顺丰直寄家门。
                                </p>
                            </div>
                            <div className="mt-8 text-xs font-black text-[#3A4454] flex items-center gap-1">
                                <span>3D 视效 · 实物印刷</span>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* 3. 一本书如何诞生 (Timeline) */}
            <section className="py-24 px-6 sm:px-12 bg-[#FDFBF7] relative overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-20 select-none">
                        <div className="flex items-center justify-center gap-1.5 text-[#C5A059] font-black text-[11px] uppercase tracking-widest mb-3">
                            <Layers size={14} />
                            <span>Creation Process</span>
                        </div>
                        <h3 className="text-3xl sm:text-4.5xl font-black text-[#2C3539] tracking-tight">
                            一本回忆书如何诞生？
                        </h3>
                        <p className="text-[#9B978E] text-sm.5 font-bold mt-2.5">
                            仅需五个简单步骤，用指尖将零散的光影拼成时光册
                        </p>
                    </div>

                    {/* Timeline Container */}
                    <div className="relative">
                        {/* Connecting Line */}
                        <div className="absolute top-[48px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-[#C5A059]/20 via-[#764BA2]/30 to-[#3A4454]/20 hidden lg:block z-0" />

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 relative z-10">

                            {/* Step 1 */}
                            <div className="flex flex-col items-center lg:items-start text-center lg:text-left group">
                                <div className="w-24 h-24 rounded-full bg-[#FAF7EE] border border-[#EEEBE5] flex items-center justify-center shadow-md mb-6 relative group-hover:scale-105 transition-transform duration-300">
                                    <Upload size={32} className="text-[#C5A059]" />
                                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#C5A059] text-white text-xs font-black flex items-center justify-center shadow">1</div>
                                </div>
                                <h4 className="text-base font-black text-[#2C3539] mb-2">01. 批量上传照片</h4>
                                <p className="text-xs.5 text-[#56534C] font-semibold leading-relaxed max-w-[200px]">
                                    选择旅行、宝宝成长或校园回忆照，我们支持高清直传。
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="flex flex-col items-center lg:items-start text-center lg:text-left group">
                                <div className="w-24 h-24 rounded-full bg-violet-50 border border-[#EEEBE5] flex items-center justify-center shadow-md mb-6 relative group-hover:scale-105 transition-transform duration-300">
                                    <Compass size={32} className="text-[#764BA2]" />
                                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#764BA2] text-white text-xs font-black flex items-center justify-center shadow">2</div>
                                </div>
                                <h4 className="text-base font-black text-[#2C3539] mb-2">02. 选择精装模板</h4>
                                <p className="text-xs.5 text-[#56534C] font-semibold leading-relaxed max-w-[200px]">
                                    挑选适合回忆场景的设计风格，如小清新旅行、校园毕业或复古手账。
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="flex flex-col items-center lg:items-start text-center lg:text-left group">
                                <div className="w-24 h-24 rounded-full bg-[#FAF4ED] border border-[#EEEBE5] flex items-center justify-center shadow-md mb-6 relative group-hover:scale-105 transition-transform duration-300">
                                    <Wand2 size={32} className="text-[#C5A059]" />
                                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#C5A059] text-white text-xs font-black flex items-center justify-center shadow">3</div>
                                </div>
                                <h4 className="text-base font-black text-[#2C3539] mb-2">03. 一键套用排版</h4>
                                <p className="text-xs.5 text-[#56534C] font-semibold leading-relaxed max-w-[200px]">
                                    相册根据模板设计自动关联相片与页序，极速为您排布好精美基础页。
                                </p>
                            </div>

                            {/* Step 4 */}
                            <div className="flex flex-col items-center lg:items-start text-center lg:text-left group">
                                <div className="w-24 h-24 rounded-full bg-[#FAF7EE] border border-[#EEEBE5] flex items-center justify-center shadow-md mb-6 relative group-hover:scale-105 transition-transform duration-300">
                                    <Edit3 size={32} className="text-[#56534C]" />
                                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#56534C] text-white text-xs font-black flex items-center justify-center shadow">4</div>
                                </div>
                                <h4 className="text-base font-black text-[#2C3539] mb-2">04. 个性化精细修饰</h4>
                                <p className="text-xs.5 text-[#56534C] font-semibold leading-relaxed max-w-[200px]">
                                    随意添加胶带贴纸，手动调整个性排版，让手账富有人文温度。
                                </p>
                            </div>

                            {/* Step 5 */}
                            <div className="flex flex-col items-center lg:items-start text-center lg:text-left group">
                                <div className="w-24 h-24 rounded-full bg-blue-50 border border-[#EEEBE5] flex items-center justify-center shadow-md mb-6 relative group-hover:scale-105 transition-transform duration-300">
                                    <Printer size={32} className="text-[#3A4454]" />
                                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#3A4454] text-white text-xs font-black flex items-center justify-center shadow">5</div>
                                </div>
                                <h4 className="text-base font-black text-[#2C3539] mb-2">05. 3D 阅览与精装打印</h4>
                                <p className="text-xs.5 text-[#56534C] font-semibold leading-relaxed max-w-[200px]">
                                    在网页体验高仿真翻书分享，更可下单实体纸质书精装冲印。
                                </p>
                            </div>

                        </div>
                    </div>
                </div>
            </section>

            {/* 4. 热门作品区 (Center Mode 3D Carousel with Info Panel) */}
            <section id="hot-books" className="py-24 px-6 sm:px-12 relative overflow-hidden select-none border-t border-[#EEEBE5]" style={{
                background: 'radial-gradient(circle at center, #FFFDF9 0%, #FAF7EE 100%)',
            }}>
                {/* Paper texture overlay */}
                <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }} />

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
                        <div>
                            <div className="flex items-center gap-1.5 text-[#C5A059] font-black text-[11px] uppercase tracking-widest mb-3">
                                <TrendingUp size={14} />
                                <span>Recent Hot Memory Books</span>
                            </div>
                            <h3 className="text-3xl sm:text-4.5xl font-black text-[#2C3539] tracking-tight">
                                拾光者们的热门作品
                            </h3>
                            <p className="text-[#9B978E] text-xs.5 font-bold mt-2">
                                看看其他拾光者的精彩画册，点击书本即可直接打开并沉浸式翻阅
                            </p>
                        </div>

                        {/* Navigation buttons */}
                        <div className="flex gap-3 mt-6 md:mt-0">
                            <button
                                onClick={handlePrevBook}
                                className="w-10 h-10 rounded-full border border-[#EEEBE5] bg-[#FDFBF7] hover:bg-slate-50 text-[#56534C] flex items-center justify-center cursor-pointer transition-all shadow-sm active:scale-95"
                            >
                                <ChevronLeft size={18} className="stroke-[2.5]" />
                            </button>
                            <button
                                onClick={handleNextBook}
                                className="w-10 h-10 rounded-full border border-[#EEEBE5] bg-[#FDFBF7] hover:bg-slate-50 text-[#56534C] flex items-center justify-center cursor-pointer transition-all shadow-sm active:scale-95"
                            >
                                <ChevronRight size={18} className="stroke-[2.5]" />
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="h-[420px] bg-[#FAF7EE] border border-[#EEEBE5] rounded-3xl animate-pulse" />
                    ) : (
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-16 min-h-[460px]">

                            {/* Left: 3D CoverFlow Carousel (60% width on large screens) */}
                            <div className="w-full lg:w-[58%] flex items-center justify-center min-h-[420px] relative perspective-1500">
                                <div className="relative w-full max-w-[500px] h-[360px] flex items-center justify-center preserve-3d">
                                    {displayHotBooks.map((book, i) => {
                                        let offset = i - activeIndex;
                                        const count = displayHotBooks.length;
                                        if (offset < -count / 2) offset += count;
                                        if (offset > count / 2) offset -= count;

                                        const isActive = offset === 0;
                                        const isVisible = Math.abs(offset) <= 2;

                                        if (!isVisible) return null;

                                        let zIndex = 30 - Math.abs(offset) * 10;
                                        let opacity = 1 - Math.abs(offset) * 0.35;
                                        let scale = isActive ? 1.05 : 0.8;
                                        let rotateY = offset * -25;
                                        let translateX = offset * 135;
                                        let translateZ = Math.abs(offset) * -120;

                                        return (
                                            <div
                                                key={book.id}
                                                onClick={() => {
                                                    if (isActive) {
                                                        handleBookClick(book.id);
                                                    } else {
                                                        setActiveIndex(i);
                                                    }
                                                }}
                                                className="absolute transition-all duration-700 ease-out cursor-pointer select-none"
                                                style={{
                                                    transform: `translateX(${translateX}px) translateZ(${translateZ}px) scale(${scale}) rotateY(${rotateY}deg)`,
                                                    zIndex,
                                                    opacity,
                                                    transformStyle: 'preserve-3d',
                                                }}
                                            >
                                                {/* 3D 拟物书卡片 */}
                                                <div className="relative w-[220px] h-[310px] preserve-3d group book-container transition-transform duration-500 hover:translate-y-[-8px]">

                                                    {/* Page content inside (rendered behind the cover) */}
                                                    <div className="absolute inset-0 bg-[#FAF7EE] rounded-r-[12px] rounded-l-[3px] border border-slate-200 z-10 flex flex-col justify-between p-5 pointer-events-none select-none shadow-[inset_10px_0_20px_rgba(0,0,0,0.05)]">
                                                        <div className="absolute right-0 top-0 bottom-0 w-[4px] bg-slate-100 border-l border-slate-200 rounded-r-[12px]" />

                                                        <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                                                            <div className="w-10 h-10 rounded-full bg-[#F7F4EF] flex items-center justify-center mb-4 border border-[#EEEBE5]">
                                                                <BookOpen size={18} className="text-[#C5A059]" />
                                                            </div>
                                                            <h5 className="text-[11px] font-black text-[#2C3539] leading-normal px-1 line-clamp-3">
                                                                {book.title}
                                                            </h5>
                                                        </div>
                                                        <div className="text-[8px] text-[#9B978E] text-center font-mono uppercase tracking-widest pt-2 border-t border-[#EEEBE5]/60">
                                                            TimeCollate
                                                        </div>
                                                    </div>

                                                    {/* Front Cover (rotates open on hover) */}
                                                    <div
                                                        className="absolute inset-0 rounded-r-[12px] rounded-l-[3px] bg-[#FAF7EE] shadow-md origin-left transition-transform duration-500 ease-out z-20 group-hover:rotate-y-[-28deg] group-hover:shadow-[20px_20px_35px_rgba(0,0,0,0.22)] border border-slate-200/50 overflow-hidden"
                                                    >
                                                        {/* Spine creases */}
                                                        <div className="absolute left-0 top-0 bottom-0 w-[8px] bg-gradient-to-r from-black/25 via-black/10 to-transparent z-30 pointer-events-none transition-all duration-300 group-hover:w-[12px]" />
                                                        <div className="absolute left-[8px] top-0 bottom-0 w-[1px] bg-white/10 z-30 pointer-events-none" />

                                                        {/* Cover Design */}
                                                        <div className="w-[300px] h-[420px] absolute top-0 left-0" style={{ transform: 'scale(0.7333)', transformOrigin: 'top left' }}>
                                                            <GeneratedCover
                                                                title={book.title}
                                                                author={book.author}
                                                                coverUrl={book.coverUrl}
                                                                mode="card"
                                                            />
                                                        </div>

                                                        {/* Gloss shine overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/12 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-out z-40 pointer-events-none" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right: Info Display Panel (40% width on large screens) */}
                            {activeBook && (
                                <div className="w-full lg:w-[38%] flex flex-col justify-center animate-fade-in">
                                    <div className="bg-white/60 backdrop-blur-[15px] border border-[#EEEBE5]/65 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-100/30 relative">

                                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#C5A059]/5 rounded-full blur-2xl pointer-events-none" />

                                        <span className="text-[10px] font-black text-[#C5A059] uppercase tracking-wider bg-[#FAF4ED] px-3 py-1 rounded-full border border-[#C5A059]/20 self-start">
                                            正在预览聚焦
                                        </span>

                                        <h4 className="text-2xl sm:text-3xl font-black text-[#2C3539] tracking-tight mt-5 leading-snug">
                                            {activeBook.title}
                                        </h4>

                                        <p className="text-[11px] font-bold text-[#9B978E] uppercase tracking-widest mt-2 flex items-center gap-1">
                                            <span>BY:</span>
                                            <span className="text-[#56534C]">@{activeBook.author}</span>
                                        </p>

                                        {/* Divider */}
                                        <div className="w-full h-[1px] bg-gradient-to-r from-[#EEEBE5] to-transparent my-6" />

                                        {/* Description */}
                                        <p className="text-sm font-semibold text-[#56534C] leading-relaxed mb-6 font-serif italic text-left">
                                            “{getBookDescription(activeBook.title)}”
                                        </p>

                                        {/* Metas (Views & Likes) */}
                                        <div className="flex items-center gap-6 text-xs font-black text-[#9B978E] uppercase tracking-wider mb-8">
                                            <span className="flex items-center gap-1.5 bg-[#FAF7EE] px-3.5 py-1.5 rounded-lg border border-[#EEEBE5]/60 shadow-sm">
                                                <Eye size={14} className="text-[#3A4454]" />
                                                <span className="text-[#56534C]">{activeBook.views || 0} 次阅读</span>
                                            </span>
                                            <span className="flex items-center gap-1.5 bg-rose-50/50 px-3.5 py-1.5 rounded-lg border border-rose-100 shadow-sm">
                                                <Heart size={13} className="text-rose-500 fill-rose-500/20" />
                                                <span className="text-rose-600">{activeBook.likes || 0} 个喜欢</span>
                                            </span>
                                        </div>

                                        {/* Action CTA button */}
                                        <button
                                            onClick={() => handleBookClick(activeBook.id)}
                                            className="w-full py-4 bg-[#3A4454] hover:bg-[#2C3539] hover:shadow-lg text-white font-black text-sm.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:-translate-y-0.5 active:translate-y-0"
                                        >
                                            <span>立即翻阅回忆书</span>
                                            <ArrowRight size={15} className="stroke-[3]" />
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </section>



            {/* 7. 服务价格模块 (Pricing Table) */}
            <section id="pricing" className="py-24 px-6 sm:px-12 bg-[#FDFBF7] relative border-t border-[#EEEBE5]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-20 select-none">
                        <div className="flex items-center justify-center gap-1.5 text-[#C5A059] font-black text-[11px] uppercase tracking-widest mb-3">
                            <Layers size={14} />
                            <span>Pricing Plans</span>
                        </div>
                        <h3 className="text-3xl sm:text-4.5xl font-black text-[#2C3539] tracking-tight">
                            服务与价格方案
                        </h3>
                        <p className="text-[#9B978E] text-xs.5 font-bold mt-2.5">
                            免费体验网页版回忆生成，亦可开启无限高级编辑与硬壳实物精装印刷
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">

                        {/* Plan 1 */}
                        <div className="bg-[#FDFBF7] border border-[#EEEBE5] p-8 sm:p-10 rounded-[32px] hover:shadow-lg transition-all flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase text-[#9B978E] tracking-widest">体验版</span>
                                <h4 className="text-xl font-black text-[#2C3539] mt-2 mb-4">网页版免费试用</h4>
                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className="text-3xl font-black text-[#2C3539] font-serif">¥0</span>
                                    <span className="text-xs text-[#9B978E] font-bold">/ 永久免费</span>
                                </div>
                                <ul className="space-y-3.5 text-xs.5 font-semibold text-[#56534C] border-t border-[#EEEBE5] pt-6">
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-[#C5A059] stroke-[2.5]" />
                                        <span>支持创建 2 本回忆画册</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-[#C5A059] stroke-[2.5]" />
                                        <span>AI 智能整理 (每月 50 张)</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-[#C5A059] stroke-[2.5]" />
                                        <span>网页仿真 3D 翻页交互式阅读</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-[#C5A059] stroke-[2.5]" />
                                        <span>极速照片 OSS 直传与安全存储</span>
                                    </li>
                                </ul>
                            </div>
                            <button
                                onClick={handleStartClick}
                                className="w-full mt-8 py-3 bg-[#F7F4EF] hover:bg-[#EEEBE5] text-[#2C3539] font-black text-xs.5 rounded-xl transition-all cursor-pointer"
                            >
                                立即免费开启
                            </button>
                        </div>

                        {/* Plan 2 */}
                        <div className="bg-[#FAF7EE] border-2 border-[#C5A059] p-8 sm:p-10 rounded-[32px] shadow-md hover:shadow-xl transition-all relative flex flex-col justify-between">
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#C5A059] text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-sm">
                                推荐方案
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase text-[#C5A059] tracking-widest">黄金版</span>
                                <h4 className="text-xl font-black text-[#2C3539] mt-2 mb-4">黄金会员包月</h4>
                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className="text-3xl font-black text-[#2C3539] font-serif">¥19</span>
                                    <span className="text-xs text-[#9B978E] font-bold">/ 每月</span>
                                </div>
                                <ul className="space-y-3.5 text-xs.5 font-semibold text-[#56534C] border-t border-[#C5A059]/30 pt-6">
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-[#C5A059] stroke-[2.5]" />
                                        <span className="font-bold">无限次创建回忆书册</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-[#C5A059] stroke-[2.5]" />
                                        <span>高清 PDF/Markdown 打包下载</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-[#C5A059] stroke-[2.5]" />
                                        <span>AI 深度金句生成 (每月 500 张)</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-[#C5A059] stroke-[2.5]" />
                                        <span>解锁所有拟物胶纸、高级模版</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-[#C5A059] stroke-[2.5]" />
                                        <span>线下实体印刷专享 <span className="text-red-600 font-bold">8.5折</span> 优惠</span>
                                    </li>
                                </ul>
                            </div>
                            <button
                                onClick={handleStartClick}
                                className="w-full mt-8 py-3 bg-[#C5A059] hover:bg-[#b08e4d] text-white font-black text-xs.5 rounded-xl transition-all cursor-pointer shadow-md shadow-[#C5A059]/10"
                            >
                                立即订阅升级
                            </button>
                        </div>

                        {/* Plan 3 */}
                        <div className="bg-[#FDFBF7] border border-[#EEEBE5] p-8 sm:p-10 rounded-[32px] hover:shadow-lg transition-all flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase text-[#9B978E] tracking-widest">精装实物</span>
                                <h4 className="text-xl font-black text-[#2C3539] mt-2 mb-4">实体硬壳纪念册</h4>
                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className="text-3xl font-black text-[#2C3539] font-serif">¥128</span>
                                    <span className="text-xs text-[#9B978E] font-bold">/ 单本印制起</span>
                                </div>
                                <ul className="space-y-3.5 text-xs.5 font-semibold text-[#56534C] border-t border-[#EEEBE5] pt-6">
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-[#C5A059] stroke-[2.5]" />
                                        <span>进口哑光艺术相纸双面精印</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-[#C5A059] stroke-[2.5]" />
                                        <span>锁线装订，可 180° 完全平铺</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-[#C5A059] stroke-[2.5]" />
                                        <span>硬面抗指纹覆膜，物理防泼水</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-[#C5A059] stroke-[2.5]" />
                                        <span>精美礼盒包装，顺丰包邮直达</span>
                                    </li>
                                </ul>
                            </div>
                            <button
                                onClick={handleStartClick}
                                className="w-full mt-8 py-3 bg-[#3A4454] hover:bg-[#2C3539] text-[#FDFBF7] font-black text-xs.5 rounded-xl transition-all cursor-pointer"
                            >
                                定制我的实体书
                            </button>
                        </div>

                    </div>
                </div>
            </section>

            {/* 8. 底部二次引导 (Footer CTA) */}
            <section id="about" className="py-24 px-6 sm:px-12 bg-[#3A4454] text-white text-center relative overflow-hidden select-none">
                <div className="absolute inset-0 bg-gradient-to-br from-[#764BA2]/30 to-transparent pointer-events-none z-0" />
                <div className="absolute -right-24 -bottom-24 w-80 h-80 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
                    <h3 className="text-3xl sm:text-4.5xl font-black tracking-tight leading-[1.2] mb-6 font-sans">
                        即刻起航，<br />
                        将零落在时光里的片段，装帧成册。
                    </h3>
                    <p className="text-slate-355 text-sm font-semibold leading-relaxed max-w-xl mb-10">
                        无论是逝去却闪光的青春毕业季，抑或是旅行中掠过的惊叹号、孩子的第一声呀呀学语。拾光集，让您的生活，翻页有声。
                    </p>
                    <button
                        onClick={handleStartClick}
                        className="px-10 py-4.5 bg-[#C5A059] hover:bg-[#b08e4d] hover:shadow-xl text-white rounded-2xl font-black text-sm.5 transition-all flex items-center gap-2.5 cursor-pointer active:scale-95 shadow-lg shadow-[#C5A059]/10"
                    >
                        <span>开始制作属于我的第一本回忆书</span>
                        <ArrowRight size={16} className="stroke-[3]" />
                    </button>
                </div>
            </section>

            {/* Footer 版权 */}
            <footer className="py-10 bg-[#1F2527] text-[#9B978E] text-[10px] font-black tracking-wider uppercase text-center border-t border-slate-900/50 select-none">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2.5">
                        <img src={logoImg} alt="logo" className="w-6 h-6 opacity-60" />
                        <span>© 2026 TimeCollate (拾光集) Project. All Rights Reserved.</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <a href="#" className="hover:text-white transition-colors">用户协议</a>
                        <a href="#" className="hover:text-white transition-colors">隐私条款</a>
                        <a href="#" className="hover:text-white transition-colors">印刷安全与交付标准</a>
                    </div>
                </div>
            </footer>

        </div>
    );
};
