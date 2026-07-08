import React, { useState, useEffect, useRef } from 'react';
import { useDevice } from '../hooks/useDevice';
import { Upload, Layout, Cpu, Smile, Printer } from 'lucide-react';

interface ProcessStep {
  id: number;
  stepNum: string;
  title: string;
  subTitle: string;
  desc: string;
  icon: React.ReactNode;
  canvasState: 'upload' | 'template' | 'auto-layout' | 'sticker' | 'preview-3d';
}

export function Process() {
  const { isMobile } = useDevice();
  const [activeStep, setActiveStep] = useState<number>(1);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 清理 hover 延迟定时器
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const steps: ProcessStep[] = [
    {
      id: 1,
      stepNum: "STEP 01",
      title: "批量上传照片",
      subTitle: "BULK IMAGE UPLOAD",
      desc: "一键无损上传你的旅行碎影、宝宝成长轨迹或毕业留念。系统原生支持超高清原画直传，零压缩，完美保留快门按下那一刻的光影层次与温润细节。",
      icon: <Upload className="w-5 h-5" />,
      canvasState: 'upload'
    },
    {
      id: 2,
      stepNum: "STEP 02",
      title: "挑选独立设计模板",
      subTitle: "CURATED ART THEMES",
      desc: "从数百款由独立插画师与资深设计师倾心打造的精装主题模板中挑选。无论是小清新旅纪还是复古奢华手账，风格随心流转，契合你的每一段故事。",
      icon: <Layout className="w-5 h-5" />,
      canvasState: 'template'
    },
    {
      id: 3,
      stepNum: "STEP 03",
      title: "一键智能排版",
      subTitle: "SMART AUTO-LAYOUT",
      desc: "拾光集独创的时间流与物理尺寸自适应匹配算法。在短短 5 秒内，混乱零散的照片会自动各安其位，严格锁定原始宽高比例，极速为你搭建优雅大气的精美基础页。",
      icon: <Cpu className="w-5 h-5" />,
      canvasState: 'auto-layout'
    },
    {
      id: 4,
      stepNum: "STEP 04",
      title: "个性化贴纸与精修",
      subTitle: "CANVA-STYLE STAGE MODE",
      desc: "激活高自由度“舞台模式”。在画布中随意添加胶带、手绘贴纸或写下文字，所有元素皆为独立图层。支持绝对坐标任意旋转拖拽，赋予每一页手账专属于你的人文温度。",
      icon: <Smile className="w-5 h-5" />,
      canvasState: 'sticker'
    },
    {
      id: 5,
      stepNum: "STEP 05",
      title: "3D 阅览与实体印刷",
      subTitle: "3D PREVIEW & PREMIUM PRINT",
      desc: "在网页端体验震撼的仿生 3D 物理翻页预览，书页厚重、书脊阴影随光流转。更有硬壳精装、锁线胶装等高水准纸质工艺支持，一键下单，顺丰尊贵礼盒直寄家门。",
      icon: <Printer className="w-5 h-5" />,
      canvasState: 'preview-3d'
    }
  ];

  // ================= 📱 移动端降级视图：手势卡片流，彻底规避重度渲染带来的重绘卡顿 =================
  if (isMobile) {
    return (
      <section className="py-16 px-6 bg-[#FDFBF7] space-y-10 border-t border-[#EEEBE5]">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-widest text-[#C5A059] font-black">CREATION PROCESS</span>
          <h2 className="text-3xl font-serif text-[#2C3539] font-bold">一本回忆书如何诞生？</h2>
          <p className="text-xs text-[#9B978E] font-medium">手指轻轻左滑，开启轻盈的手账诞生之旅</p>
        </div>

        {/* 移动端使用原生 CSS snap 横向滑动轨道，性能极致，零卡顿 */}
        <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory px-2">
          {steps.map((item) => (
            <div 
              key={item.id} 
              className="min-w-[85vw] snap-center bg-[#FDFBF7] border border-[#EEEBE5] rounded-3xl p-6 space-y-4 shadow-sm"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-[#C5A059] font-bold tracking-wider">{item.stepNum}</span>
                <div className="p-2 bg-[#FAF4ED] text-[#C5A059] rounded-xl shadow-sm">
                  {item.icon}
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#2C3539]">{item.title}</h3>
                <p className="text-[9px] text-[#9B978E] tracking-widest uppercase font-light">{item.subTitle}</p>
              </div>
              <p className="text-xs.5 text-[#56534C] font-medium leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* 移动端小圆点滚动指示器 */}
        <div className="flex justify-center gap-1.5 pt-2">
          {steps.map((item) => (
            <div 
              key={item.id} 
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                activeStep === item.id ? 'w-4 bg-[#C5A059]' : 'bg-[#E0DDD6]'
              }`} 
            />
          ))}
        </div>
      </section>
    );
  }

  // ================= 💻 PC 端奢华大秀场视图：左侧高拟真画布联动右侧步骤 =================
  return (
    <section className="py-24 px-6 sm:px-12 lg:px-20 bg-gradient-to-b from-[#FDFBF7] via-[#FAF7EE]/40 to-[#FDFBF7] border-t border-[#EEEBE5]/50 overflow-hidden relative">
      
      {/* 注入高拟真动画专用 CSS */}
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes box-glow {
          0%, 100% { box-shadow: 0 10px 30px -10px rgba(0,0,0,0.08); }
          50% { box-shadow: 0 12px 35px -8px rgba(197,160,89,0.15); }
        }
        .animate-box-glow {
          animation: box-glow 4s ease-in-out infinite;
        }

        @keyframes process-shine-flow {
          0% { transform: translate(-100%, -100%) rotate(45deg); }
          30%, 100% { transform: translate(100%, 100%) rotate(45deg); }
        }
        .animate-process-shine {
          animation: process-shine-flow 3.5s ease-in-out infinite;
        }

        @keyframes process-slide-up {
          0%, 100% { transform: translateY(8px) rotate(0deg) scale(0.98); opacity: 0.9; }
          50% { transform: translateY(-10px) rotate(-1deg) scale(1.01); opacity: 1; }
        }
        .animate-process-slide-up {
          animation: process-slide-up 6s ease-in-out infinite;
        }

        @keyframes float-badge {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50% { transform: translateY(-4px) rotate(-4deg); }
        }
        .animate-float-badge {
          animation: float-badge 3s ease-in-out infinite;
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* 顶部诗意标题 */}
        <div className="text-center space-y-3">
          <span className="text-xs uppercase tracking-widest text-[#C5A059] font-black block">CREATION PROCESS</span>
          <h2 className="text-4xl md:text-5xl font-serif tracking-wide text-[#2C3539] font-bold">
            一本回忆书如何诞生？
          </h2>
          <p className="text-[#56534C] font-semibold text-sm">
            用指尖将零散的光影拼成交响，简单五步，翻页有声。
          </p>
        </div>

        {/* 核心双栏架构 */}
        <div className="grid grid-cols-12 gap-16 items-start">
          
          {/* 左侧：跟随步骤高拟真状态变化的智能排版画布 (Sticky 演播厅) */}
          <div className="col-span-6 sticky top-36 bg-[#FAF7EE] p-8 rounded-[32px] border border-[#EEEBE5] shadow-lg min-h-[500px] flex items-center justify-center overflow-hidden group">
            {/* 极奢微光背景 */}
            <div className="absolute -inset-10 bg-gradient-to-tr from-[#C5A059]/5 via-transparent to-[#FAF4ED] blur-3xl opacity-80" />
            
            <div className="w-full h-full rounded-2xl relative z-10 flex items-center justify-center">
              
              {/* 状态 1：批量上传状态 */}
              {steps[activeStep - 1].canvasState === 'upload' && (
                <div className="w-full max-w-sm aspect-[14/10] border-2 border-dashed border-[#C5A059]/30 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-[#FDFBF7]/60 shadow-sm animate-fade-in-up space-y-4">
                  <div className="w-12 h-12 bg-[#FAF4ED] rounded-full flex items-center justify-center text-[#C5A059] animate-pulse">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-[#2C3539]">拖拽上传或点此导入你的记忆碎影</p>
                    <p className="text-[11px] text-[#9B978E] font-medium leading-relaxed">支持 RAW, 高清 WebP, JPG 等无损原画直传</p>
                  </div>
                </div>
              )}

              {/* 状态 2：挑选设计模板状态 */}
              {steps[activeStep - 1].canvasState === 'template' && (
                <div className="grid grid-cols-2 gap-4 w-full max-w-md animate-fade-in-up">
                  {[
                    { name: '极简婚礼册', theme: 'bg-emerald-50 text-emerald-800' },
                    { name: '复古旅行日记', theme: 'bg-amber-50 text-amber-800', isHot: true },
                    { name: '毕业青涩季', theme: 'bg-indigo-50 text-indigo-800' },
                    { name: '成长纪事', theme: 'bg-rose-50 text-rose-800' }
                  ].map((tpl, idx) => {
                    const isSelected = idx === 1; // 默认把第二个“复古旅行日记”设为精选
                    return (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-xl border bg-[#FDFBF7] shadow-sm transition-all duration-500 flex flex-col justify-between min-h-[140px] ${
                          isSelected 
                            ? 'border-[#C5A059] ring-2 ring-[#C5A059]/10 -translate-y-1.5 shadow-md shadow-[#C5A059]/5' 
                            : 'border-[#EEEBE5] hover:border-[#C5A059]/40 hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="w-full h-20 bg-[#FAF7EE] rounded-lg relative overflow-hidden flex items-center justify-center">
                          <div className={`text-[10px] font-serif font-black px-3 py-1.5 rounded shadow-sm ${tpl.theme}`}>
                            {tpl.name}
                          </div>
                          {tpl.isHot && (
                            <div className="absolute top-1 right-1 bg-[#C5A059] text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                              PRO
                            </div>
                          )}
                        </div>
                        <span className={`text-[11px] font-bold mt-2 ${isSelected ? 'text-[#C5A059]' : 'text-[#56534C]'}`}>
                          {tpl.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 状态 3：一键智能排版状态 */}
              {steps[activeStep - 1].canvasState === 'auto-layout' && (
                <div className="w-full max-w-sm aspect-[14/10] bg-[#FDFBF7] rounded-2xl shadow-xl border border-[#EEEBE5] p-6 flex flex-col justify-between animate-fade-in-up relative overflow-hidden animate-box-glow">
                  <div className="grid grid-cols-3 gap-3 h-4/5 items-center">
                    <div className="bg-[#FAF7EE] rounded-lg h-24 animate-pulse border border-[#EEEBE5]/30" />
                    <div className="bg-[#C5A059]/10 border border-[#C5A059]/30 rounded-xl h-32 flex flex-col items-center justify-center text-[10px] text-[#C5A059] font-mono p-3 text-center shadow-inner">
                      <span className="text-xs mb-1">📐</span>
                      <span>3:4 比例</span>
                      <span>自适应锁定</span>
                    </div>
                    <div className="bg-[#FAF7EE] rounded-lg h-20 animate-pulse border border-[#EEEBE5]/30" />
                  </div>
                  <div className="text-[10px] text-[#C5A059] text-center font-bold border-t border-dashed border-[#EEEBE5] pt-3.5 mt-2 animate-pulse">
                    ⚡ 智能排版完成：耗时 4.2 秒，照片不塌陷不失真
                  </div>
                </div>
              )}

              {/* 状态 4：个性化贴纸与精修（舞台模式） */}
              {steps[activeStep - 1].canvasState === 'sticker' && (
                <div className="w-full max-w-sm aspect-[14/10] bg-[#FDFBF7] rounded-2xl shadow-xl border border-[#EEEBE5]/80 p-6 relative font-mono text-[9px] select-none animate-fade-in-up">
                  <div className="w-full h-full bg-[radial-gradient(#EEEBE5_1px,transparent_1px)] [background-size:16px_16px] rounded-xl relative overflow-hidden border border-[#EEEBE5]/30">
                    
                    {/* 模拟绝对定位的自由拖拽照片与把手 */}
                    <div className="absolute left-[15%] top-[15%] p-2 border border-[#C5A059] bg-[#FDFBF7] rounded-xl shadow-lg transform rotate-3 z-20">
                      <div className="w-32 h-24 rounded-lg overflow-hidden relative">
                        <img 
                          src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=200&q=80" 
                          className="w-full h-full object-cover" 
                          alt="Layout demo" 
                        />
                      </div>
                      
                      {/* Moveable 控制点 */}
                      <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#FDFBF7] border border-[#C5A059] rounded-full" />
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FDFBF7] border border-[#C5A059] rounded-full" />
                      <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#FDFBF7] border border-[#C5A059] rounded-full" />
                      <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#FDFBF7] border border-[#C5A059] rounded-full" />
                      {/* 旋转手柄线 */}
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 w-[1px] h-5 bg-[#C5A059]" />
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#FDFBF7] border-2 border-[#C5A059] rounded-full" />
                    </div>

                    {/* 飘浮的精美图层贴纸 */}
                    <span className="absolute top-4 right-8 text-2xl animate-pulse">✨</span>
                    <span className="absolute bottom-6 right-6 px-2.5 py-1 bg-[#FAF4ED] text-[#C5A059] border border-[#C5A059]/30 rounded font-sans text-[8px] transform -rotate-12 shadow-sm animate-float-badge">
                      ★ MEMORY PACK
                    </span>
                    <span className="absolute bottom-4 left-6 px-2 py-0.5 bg-[#56534C] text-white rounded-[4px] font-sans text-[7px] transform rotate-6 shadow-sm">
                      时光胶纸
                    </span>
                  </div>
                </div>
              )}

              {/* 状态 5：3D预览与交付状态 */}
              {steps[activeStep - 1].canvasState === 'preview-3d' && (
                <div className="relative w-[300px] h-[240px] flex items-center justify-center animate-fade-in-up">
                  
                  {/* 精美礼盒底座 */}
                  <div className="absolute w-[220px] h-[160px] bg-[#2C3539] border-2 border-[#C5A059]/40 rounded-2xl shadow-lg flex items-center justify-center transform translate-y-4">
                    <div className="w-[94%] h-[94%] border border-[#C5A059]/20 rounded-xl bg-[#2C3539]/95 relative overflow-hidden" />
                  </div>

                  {/* 从盒子中缓缓滑出的高定精装画册 */}
                  <div className="absolute w-[180px] h-[135px] bg-[#FDFBF7] border border-[#C5A059]/30 rounded-xl shadow-2xl flex flex-col justify-between p-4 select-none transform z-10 animate-process-slide-up">
                    
                    {/* 书本封面扫光 */}
                    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                      <div className="absolute inset-[-100%] bg-gradient-to-r from-transparent via-[#C5A059]/15 to-transparent rotate-45 animate-process-shine" />
                    </div>
                    
                    {/* 封面装饰 */}
                    <div className="w-full h-full border border-[#C5A059]/10 rounded-lg flex flex-col items-center justify-center space-y-2 p-1">
                      <div className="w-6 h-6 border border-[#C5A059]/60 rounded-full flex items-center justify-center text-[#C5A059] text-[9px]">
                        ★
                      </div>
                      <div className="text-xs font-serif font-black tracking-widest text-[#2C3539]">拾光集</div>
                      <div className="text-[6px] tracking-wider text-[#9B978E] uppercase font-light">Memories Book</div>
                    </div>
                  </div>

                  {/* 顺丰快递标签微动效 */}
                  <div className="absolute bottom-1 right-4 px-2.5 py-1 bg-[#FDFBF7] border border-[#EEEBE5] rounded-lg shadow-md text-[8.5px] font-bold text-[#56534C] flex items-center gap-1.5 z-20 rotate-[6deg]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>顺丰高定礼盒直寄</span>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* 右侧：高阶纵向悬停/点击触发步骤控制区 */}
          <div className="col-span-6 space-y-4">
            {steps.map((item) => {
              const isActive = activeStep === item.id;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => {
                    if (hoverTimerRef.current) {
                      clearTimeout(hoverTimerRef.current);
                    }
                    // 120ms 防抖，避免快速移动鼠标时触发闪烁
                    hoverTimerRef.current = setTimeout(() => {
                      setActiveStep(item.id);
                    }, 120);
                  }}
                  onMouseLeave={() => {
                    if (hoverTimerRef.current) {
                      clearTimeout(hoverTimerRef.current);
                    }
                  }}
                  onClick={() => {
                    // 点击立即响应，无延迟，增强操作反馈
                    if (hoverTimerRef.current) {
                      clearTimeout(hoverTimerRef.current);
                    }
                    setActiveStep(item.id);
                  }}
                  className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'bg-[#FDFBF7] border-[#C5A059]/20 shadow-xl shadow-slate-100 translate-x-2'
                      : 'bg-transparent border-transparent hover:bg-[#FDFBF7]/50 hover:translate-x-1'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                      isActive ? 'bg-[#C5A059] text-[#FDFBF7]' : 'bg-[#FAF4ED] text-[#C5A059]'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-baseline">
                        <h3 className="text-lg font-bold text-[#2C3539]">{item.title}</h3>
                        <span className={`text-[10px] font-mono font-bold tracking-wider transition-colors duration-300 ${isActive ? 'text-[#C5A059]' : 'text-[#C2BEB5]'}`}>
                          {item.stepNum}
                        </span>
                      </div>
                      
                      {/* 卡片描述文本根据激活状态平滑滑动展开 */}
                      <div className={`transition-all duration-300 overflow-hidden ${
                        isActive ? 'max-h-32 opacity-100 mt-2' : 'max-h-0 opacity-0'
                      }`}>
                        <p className="text-xs.5 text-[#56534C] font-semibold leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
