import React, { Suspense } from 'react';
import { useDevice } from '../hooks/useDevice';
import { ArrowRight, BookOpen, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/useAuthStore';

const Desktop3DBook = React.lazy(() => import('./Desktop3DBook'));
const MobileLottieBook = React.lazy(() => import('./MobileLottieBook'));

/**
 * 板块一：首屏 (Hero Section)
 * 支持多端分流懒加载，PC端渲染 3D 鼠标微动偏转精装书，移动端降级为高性能 SVG 平移动画
 * 背景配有高阶 CSS Mesh Gradient 弥散动画
 */
export function HeroSection() {
  const { isMobile } = useDevice();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const handleStartClick = () => {
    if (isAuthenticated) {
      navigate('/workbench');
    } else {
      navigate('/login');
    }
  };

  return (
    <section className="relative h-screen min-h-[650px] pt-24 px-6 sm:px-12 lg:px-20 flex flex-col lg:flex-row items-center justify-between overflow-hidden bg-[#FDFBF7]">

      {/* 视频背景与多端弥散网格 (仅PC端加载 mp4 视频，手机端降级为纯 Mesh) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#FDFBF7]">
        {!isMobile && (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover blur-[8px] opacity-60 scale-105"
          >
            <source src="/videos/hero-bg.mp4" type="video/mp4" />
          </video>
        )}

        {/* 动态 2D 弥散渐变网格背景 (Mesh Gradient) */}
        <div className="absolute top-[-10%] left-[-10%] w-[55%] aspect-square rounded-full bg-[#FAF4ED] opacity-75 blur-[130px] animate-mesh-1" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[65%] aspect-square rounded-full bg-[#FAF7EE] opacity-65 blur-[150px] animate-mesh-2" />
        <div className="absolute top-[30%] right-[10%] w-[40%] aspect-square rounded-full bg-[#C5A059]/5 opacity-35 blur-[110px]" />

        {/* 微晶纸张纸张凹凸肌理 */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }} />
        <div className="absolute inset-0 bg-[#FDFBF7]/10 backdrop-blur-[0.5px] z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FDFBF7]/40 to-[#FDFBF7] z-20" />
      </div>



      {/* 诗意文案区 */}
      <div className="max-w-xl z-30 text-center lg:text-left flex flex-col items-center lg:items-start space-y-8 mt-12 lg:mt-16">

        {/* 产品 Badge */}
        <div className="inline-flex items-center gap-2 bg-[#FAF4ED] border border-[#C5A059]/25 px-4 py-1.5 rounded-full text-[#C5A059] text-xs font-bold tracking-wide shadow-sm">
          <BookOpen size={13} className="text-[#C5A059]" />
          <span>拟物回忆书 · 零门槛可视化拖拽排版</span>
        </div>

        {/* 标题 */}
        <h1 className="text-4xl sm:text-5xl lg:text-6.5xl font-black text-[#2C3539] tracking-tight leading-[1.1] font-sans">
          将岁月的温度，<br />
          装订成一本<span className="inline-block px-1 bg-gradient-to-r from-[#C5A059] via-[#764BA2] to-[#3A4454] bg-clip-text text-transparent font-serif">精致的拟物手账</span>
        </h1>

        {/* 描述与核心特性 */}
        <div className="space-y-4">
          <p className="text-[#56534C] text-base sm:text-lg font-normal leading-relaxed max-w-lg">
            拾光集是一款高质感的可视化时光手账制作平台。提供自由画布与拟物翻书视效，留住生活最温润的轮廓。
          </p>

          <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 pt-2">
            <span className="flex items-center gap-1.5 text-xs.5 font-bold text-[#3A4454]">
              <Check size={14} className="text-[#C5A059] stroke-[3]" />
              <span>多款精装主题模板</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs.5 font-bold text-[#3A4454]">
              <Check size={14} className="text-[#C5A059] stroke-[3]" />
              <span>自由画布拖拽编辑</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs.5 font-bold text-[#3A4454]">
              <Check size={14} className="text-[#C5A059] stroke-[3]" />
              <span>高仿真拟物预览</span>
            </span>
          </div>
        </div>

        {/* 按钮 CTA */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button
            onClick={handleStartClick}
            className="px-9 py-4 bg-[#C5A059] hover:bg-[#b08e4d] hover:shadow-lg text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>立即免费制作</span>
            <ArrowRight size={15} className="stroke-[2.5]" />
          </button>

          <a
            href="#templates"
            className="px-9 py-4 bg-white hover:bg-stone-50 text-[#56534C] border border-[#EEEBE5] rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
          >
            <span>浏览设计模板</span>
          </a>
        </div>
      </div>

      {/* 视觉秀场区 (3D/2D 按端动态按需懒加载) */}
      <div className="w-full lg:w-1/2 flex justify-center items-center mt-16 lg:mt-20 min-h-[360px] z-30">
        <Suspense fallback={
          <div className="w-[220px] h-[310px] bg-[#FAF7EE] border border-stone-200/50 rounded-xl shadow-md animate-pulse flex items-center justify-center text-stone-400 font-serif text-sm">
            拾光画册载入中...
          </div>
        }>
          {isMobile ? <MobileLottieBook /> : <Desktop3DBook />}
        </Suspense>
      </div>

    </section>
  );
}
