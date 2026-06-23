import React from 'react';

interface CanvasContainerProps {
  children?: React.ReactNode;
  backgroundColor?: string;
}

/**
 * CanvasContainer 画布容器
 * A4 物理比例底图容器，应用雅致金视觉光斑与流态玻璃纹理层。
 */
export const CanvasContainer: React.FC<CanvasContainerProps> = ({
  children,
  backgroundColor = '#ffffff'
}) => {
  return (
    <div
      className="relative w-[794px] h-[1123px] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-amber-500/30 overflow-hidden backdrop-blur-xl transition-all duration-500 hover:shadow-[0_30px_70px_-10px_rgba(217,119,6,0.15)] select-none"
      style={{
        backgroundColor,
      }}
    >
      {/* 雅致金高光背景与流态玻璃光晕 */}
      <div className="absolute -top-48 -left-48 w-96 h-96 bg-amber-400/20 rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-yellow-600/10 rounded-full blur-[80px] pointer-events-none z-0" />
      
      {/* 物理纸张边缘与微细边框 */}
      <div className="absolute inset-0 border border-amber-500/10 rounded-2xl pointer-events-none z-30" />
      <div className="absolute inset-[1px] border border-white/40 rounded-2xl pointer-events-none z-30" />

      {/* 纸张微理纹层 */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02] z-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 实际内容渲染区域 */}
      <div className="relative w-full h-full z-20">
        {children}
      </div>
    </div>
  );
};
export default CanvasContainer;
