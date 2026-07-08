import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, User } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import logoImg from '../../../assets/logo.png';

// 引入五大重构板块
import { HeroSection } from '../components/HeroSection';
import { WhyUs } from '../components/WhyUs';
import { Process } from '../components/Process';
import { Showcase } from '../components/Showcase';
import { Footer } from '../components/Footer';

/**
 * 拾光集公开落地页 (首页 V3.0 - Apple + Canva 莫兰迪黑金设计)
 * 采用多端物理分流设计，将各个重度子模块拆分化并懒加载，确保微信/手机首屏极速开启。
 */
export const Home: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();

    // 动态启用全局滚动条（防抖溢出限制）
    useEffect(() => {
        if (typeof window === 'undefined') return;

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

    return (
        <div className="relative min-h-screen bg-[#FDFBF7] flex flex-col font-['Outfit',_sans-serif] overflow-x-hidden selection:bg-[#C5A059] selection:text-white">

            {/* 全局动效注入与高阶 CSS 扫光效果 */}
            <style>{`
                @keyframes float-photo-1 {
                    0%, 100% { transform: translateY(0px) rotate(-3deg); }
                    50% { transform: translateY(-15px) rotate(-1deg); }
                }
                @keyframes float-photo-2 {
                    0%, 100% { transform: translateY(0px) rotate(4deg); }
                    50% { transform: translateY(-12px) rotate(6deg); }
                }
                .animate-float-1 { animation: float-photo-1 6s ease-in-out infinite; }
                .animate-float-2 { animation: float-photo-2 5s ease-in-out infinite; }
                
                @keyframes shine-flow {
                    0% { left: -100%; }
                    100% { left: 200%; }
                }
                .animate-shine {
                    animation: shine-flow 1.8s infinite ease-out;
                }
                html {
                    scroll-behavior: smooth;
                }
            `}</style>

            {/* 顶部通栏 Header - 采用 absolute 定位，滚动页面时随之向上滚走，不悬浮遮挡内容 */}
            <header className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-6 sm:px-12 z-50 select-none bg-transparent">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
                    <img src={logoImg} alt="拾光集" className="w-10 h-10 object-contain group-hover:scale-105 transition-transform duration-300" />
                    <h1 className="text-xl font-black text-[#2C3539] tracking-tight">拾光集</h1>
                </div>

                <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-[#56534C]">
                    <a href="#features" className="hover:text-[#C5A059] transition-colors">功能特性</a>
                    <a href="#hot-books" className="hover:text-[#C5A059] transition-colors">热门作品</a>
                    <a href="#about" className="hover:text-[#C5A059] transition-colors font-normal">关于我们</a>
                </nav>

                <div className="flex items-center gap-4">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/workbench')}
                                className="px-5 py-2.5 bg-[#3A4454] hover:bg-[#2C3539] text-[#FDFBF7] rounded-xl font-bold text-xs.5 transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 animate-shine-flow"
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
            <HeroSection />

            {/* 2. 为什么选择拾光集 */}
            <WhyUs />

            {/* 3. 一本书如何诞生 */}
            <Process />

            {/* 4. 热门作品区 */}
            <Showcase />

            {/* 5. 页脚与尾声 */}
            <Footer />

        </div>
    );
};
