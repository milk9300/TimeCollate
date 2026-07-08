import React, { useState, useRef } from 'react';
import { BookOpen } from 'lucide-react';

/**
 * PC端奢华拟物 3D 书籍组件
 * 基于 CSS 3D Transform 渲染，随鼠标移动产生高保真偏转与开盖视差动效
 */
export default function Desktop3DBook() {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    // 将偏转角安全限制在 [-20, 20] 度范围，防止形变过大
    const rotateX = -(mouseY / height) * 35;
    const rotateY = (mouseX / width) * 35;

    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-[280px] h-[380px] cursor-pointer select-none group"
      style={{
        perspective: '1200px',
      }}
    >
      <div
        className="relative w-full h-full transition-transform duration-300 ease-out"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) translateY(${isHovered ? '-6px' : '0px'})`,
        }}
      >
        {/* 后封底 (3D Page Back) */}
        <div 
          className="absolute inset-0 bg-[#E5DFD3] rounded-r-[16px] rounded-l-[4px] shadow-[15px_15px_40px_rgba(0,0,0,0.12),_-3px_5px_10px_rgba(0,0,0,0.05)] border-r border-amber-800/10" 
          style={{ transform: 'translateZ(-8px)' }} 
        />

        {/* 内层叠纸张页边 (Paper Pages Stack) */}
        <div 
          className="absolute inset-y-[4px] left-[8px] right-[2px] bg-white rounded-r-[14px] shadow-[inset_-8px_0_20px_rgba(0,0,0,0.04),_5px_5px_15px_rgba(0,0,0,0.05)] border-r border-stone-200/80" 
          style={{ transform: 'translateZ(-4px)' }}
        >
          {/* 页褶凹凸拟物感 */}
          <div className="absolute right-0 inset-y-0 w-[4px] bg-gradient-to-r from-stone-100 to-stone-200 rounded-r-[14px]" />
          <div className="absolute right-[4px] inset-y-0 w-[1px] bg-stone-300/40" />
        </div>

        {/* 拟物书脊 (Spine) */}
        <div 
          className="absolute left-0 inset-y-0 w-[16px] bg-gradient-to-r from-amber-700 via-amber-800 to-amber-950 rounded-l-[4px] shadow-[inset_-3px_0_6px_rgba(0,0,0,0.25)]" 
          style={{ transform: 'translateZ(1px)' }} 
        />

        {/* 精美封面 (Front Cover - Hover时利用 3D Origin 沿左轴翻开) */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#FDFBF7] to-[#FAF4ED] rounded-r-[16px] rounded-l-[4px] border border-stone-200/40 shadow-[5px_5px_20px_rgba(0,0,0,0.08)] transition-transform duration-700 ease-out origin-left flex flex-col justify-between p-8 overflow-hidden z-20"
          style={{
            transform: `translateZ(2px) rotateY(${isHovered ? '-25deg' : '0deg'})`,
            boxShadow: isHovered ? '25px 25px 50px rgba(0,0,0,0.18)' : '5px 5px 20px rgba(0,0,0,0.08)'
          }}
        >
          {/* 书脊凹压折痕 */}
          <div className="absolute left-[14px] inset-y-0 w-[1px] bg-stone-300/50" />
          <div className="absolute left-[15px] inset-y-0 w-[1px] bg-white/30" />

          {/* 边缘细金框 */}
          <div className="absolute inset-4 border border-amber-600/10 rounded-r-[12px] rounded-l-[2px] pointer-events-none" />

          {/* 封面中轴设计 */}
          <div className="flex flex-col items-center justify-center text-center flex-1 space-y-6 mt-8">
            <div className="w-16 h-16 rounded-full bg-amber-50/80 flex items-center justify-center border border-amber-600/10 shadow-inner">
              <BookOpen className="w-8 h-8 text-amber-700 stroke-[1.5]" />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif text-2xl font-bold tracking-widest text-stone-800 leading-snug">
                拾光记忆书
              </h3>
              <div className="w-12 h-[2px] bg-amber-600/40 mx-auto" />
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-mono">
                TimeCollate Album
              </p>
            </div>
          </div>

          <div className="text-center text-[9px] text-stone-400 font-serif italic tracking-wide">
            — 留住零落在岁月里的温度 —
          </div>

          {/* 磨砂流扫光 */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-out pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
