import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/useAuthStore';
import logoImg from '../../../assets/logo.png';

/**
 * 板块五：优雅尾声与页脚 (Footer)
 * 采用视觉流光暗落过渡，将背景从拾光米白自然融入奢华黑金色。
 * 内置 Final CTA 高光流体微光按钮和半透明人文版权声明。
 */
export function Footer() {
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
    <>
      {/* 视觉暗落过渡过渡带 & Final CTA */}
      <section className="py-28 px-6 sm:px-12 relative overflow-hidden select-none bg-[#3A4454] text-white text-center">
        {/* 暗落背景流光 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#764BA2]/30 to-transparent pointer-events-none z-0" />
        <div className="absolute -right-24 -bottom-24 w-80 h-80 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center space-y-8">
          <h3 className="text-3xl sm:text-4.5xl font-black tracking-tight leading-[1.2] font-sans">
            即刻起航，<br />
            将零落在时光里的片段，装帧成册。
          </h3>
          <p className="text-stone-300 text-sm font-semibold leading-relaxed max-w-xl">
            无论是逝去却闪光的青春毕业季，抑或是旅行中掠过的惊叹号、孩子的第一声呀呀学语。拾光集，让您的生活，翻页有声。
          </p>
          
          {/* Final CTA 黑金极简流光微粒质感按钮 */}
          <button
            onClick={handleStartClick}
            className="px-10 py-4.5 bg-[#C5A059] hover:bg-[#b08e4d] text-white rounded-2xl font-black text-sm transition-all flex items-center gap-2.5 cursor-pointer active:scale-95 shadow-xl shadow-[#C5A059]/20 hover:-translate-y-0.5 relative overflow-hidden group"
          >
            <span className="relative z-10">开始制作属于我的第一本回忆书</span>
            <ArrowRight size={16} className="relative z-10 stroke-[3]" />
            {/* 高光扫过 */}
            <div className="absolute inset-0 w-1/2 h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:animate-shine" />
          </button>
        </div>
      </section>

      {/* 真正底部的 Footer */}
      <footer className="py-12 bg-[#1F2527] text-[#9B978E] text-[10px] font-black tracking-wider uppercase border-t border-slate-900/50 select-none">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-5">
            <img src={logoImg} alt="logo" className="w-7 h-7 opacity-60" />
            <span className="text-[#747067] text-[9.5px]">
              © 2026 TIMECOLLATE (拾光集) PROJECT. ALL RIGHTS RESERVED. 
              <span className="block md:inline md:ml-2 text-[#9B978E] font-serif font-normal lowercase tracking-wide italic">让每一段不可复制的岁月，都有迹可循。</span>
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-[#9B978E] text-[9px]">
            <a href="#" className="hover:text-white transition-colors">用户协议</a>
            <a href="#" className="hover:text-white transition-colors">隐私条款</a>
            <a href="#" className="hover:text-white transition-colors">印刷安全与交付标准</a>
          </div>

        </div>
      </footer>
    </>
  );
}
