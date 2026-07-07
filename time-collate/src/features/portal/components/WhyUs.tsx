import React, { useState, useEffect, useRef } from 'react';
import { useDevice } from '../hooks/useDevice';
import { Layers, BookOpen, Truck, Activity } from 'lucide-react';

interface ValueItem {
  id: number;
  title: string;
  subTitle: string;
  desc: string;
  icon: React.ReactNode;
  mediaUrl?: string; 
}

interface ValueShowcasePanelProps {
  activeTab: number;
}

export function ValueShowcasePanel({ activeTab }: ValueShowcasePanelProps) {
  const [videoError, setVideoError] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const failedUrls = useRef<Set<number>>(new Set());

  // 当 tab 切换时检查是否曾加载失败
  useEffect(() => {
    if (failedUrls.current.has(activeTab)) {
      setVideoError(true);
      setIsVideoPlaying(false);
    } else {
      setVideoError(false);
      setIsVideoPlaying(false);
    }
  }, [activeTab]);

  const handleVideoError = () => {
    failedUrls.current.add(activeTab);
    setVideoError(true);
  };

  const mediaUrls: Record<number, string> = {
    1: '/videos/features-canvas.mp4',
    2: '/videos/features-flip.mp4',
    3: '/videos/features-delivery.mp4',
  };

  const currentMediaUrl = mediaUrls[activeTab];

  // 场景 1：自由画布
  const renderCanvasStage = () => {
    return (
      <div className="w-full h-full relative bg-[#FAF7EE] flex flex-col justify-between p-6 transition-colors duration-300">
        {/* 画布网格格线底纹 */}
        <div
          className="absolute inset-0 z-0 opacity-40 pointer-events-none text-[#E1DDD5]"
          style={{
            backgroundSize: '24px 24px',
            backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          }}
        />
        {/* 状态栏 */}
        <div className="relative z-10 flex items-center justify-between border-b border-[#E1DDD5] pb-4 select-none">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400/85" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/85" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/85" />
            <span className="text-[10px] font-mono text-[#9B978E] ml-1">TimeCollate_Canvas_V2.0.snb</span>
          </div>
          <div className="px-2.5 py-0.5 bg-white/90 rounded-md border border-[#E1DDD5] text-[9px] font-bold text-[#C5A059] shadow-sm">
            100% 自适应比例
          </div>
        </div>

        {/* 画布主体编辑区 */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          {/* 模拟相片卡片 */}
          <div className="relative w-[200px] aspect-[4/3] bg-white p-2.5 rounded-xl shadow-[0_12px_24px_rgba(44,53,57,0.08)] border border-stone-200/80 animate-[photo-drag-in_6s_cubic-bezier(0.16,1,0.3,1)_infinite] select-none">
            <img
              src="https://images.unsplash.com/photo-1472289065668-ce650ac443d2?auto=format&fit=crop&w=400&q=80"
              className="w-full h-[80%] object-cover rounded-md pointer-events-none"
              alt="Tibet cycling"
            />
            <div className="text-[8.5px] text-[#56534C] text-left mt-2.5 font-serif font-bold italic">🚴‍♂️ 西藏骑行记 · 318国道</div>

            {/* Moveable 控制把手 */}
            <div className="absolute inset-0 border border-blue-500/80 rounded-xl pointer-events-none animate-[float-controls_6s_cubic-bezier(0.16,1,0.3,1)_infinite]">
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-blue-500 rounded-full" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-blue-500 rounded-full" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-blue-500 rounded-full" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-blue-500 rounded-full" />
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-[1px] h-4 bg-blue-500" />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border border-blue-500 rounded-full" />
            </div>
          </div>

          {/* 装饰复古胶带 */}
          <div className="absolute top-8 right-8 w-16 h-5 bg-[#FAF4ED]/70 border-l border-r border-[#C5A059]/10 shadow-[0_1px_2px_rgba(0,0,0,0.02)] backdrop-blur-[1px] rotate-[15deg] select-none pointer-events-none opacity-80" 
            style={{
              clipPath: 'polygon(0% 0%, 5% 100%, 95% 95%, 100% 0%)'
            }}
          />
          
          {/* 金色徽章贴纸 */}
          <div className="absolute bottom-8 left-10 px-2.5 py-0.5 bg-[#FAF4ED] border border-[#C5A059]/30 text-[7px] text-[#C5A059] font-black rounded shadow-sm rotate-[-8deg] pointer-events-none select-none animate-[float-sticker_4s_ease-in-out_infinite]">
            ★ 青春纪念
          </div>
        </div>

        {/* 工具辅助说明 */}
        <div className="relative z-10 flex items-center justify-between border-t border-[#E1DDD5] pt-3 text-[8.5px] font-bold text-[#9B978E]">
          <span>X: 135px  Y: 96px</span>
          <span>比例已自适应锁定</span>
        </div>
      </div>
    );
  };

  // 场景 2：仿生 3D 物理翻页
  const renderPageFlipStage = () => {
    return (
      <div className="w-full h-full relative bg-[#FAF7EE] flex items-center justify-center p-6 overflow-hidden transition-colors duration-300">
        {/* 3D透视场景 */}
        <div className="w-[300px] h-[200px] relative select-none" style={{ perspective: '1200px' }}>
          
          {/* 整个 3D 书本 */}
          <div className="w-full h-full flex relative transform-style-3d">
            
            {/* 书左半页 (固定) */}
            <div className="w-1/2 h-full bg-[#FDFBF7] rounded-l-md border-y border-l border-[#E1DDD5] relative shadow-[0_8px_16px_rgba(0,0,0,0.04)] origin-right flex items-center justify-center overflow-hidden">
              <div className="w-[85%] h-[85%] border border-[#EEEBE5] rounded p-2 bg-[#FAF7EE]/50 flex flex-col justify-between">
                <div className="w-full h-1/2 bg-[#E1DDD5]/30 rounded" />
                <div className="space-y-1">
                  <div className="w-3/4 h-1.5 bg-[#56534C]/20 rounded" />
                  <div className="w-1/2 h-1 bg-[#56534C]/10 rounded" />
                </div>
              </div>
            </div>

            {/* 书脊阴影过度 */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 w-4 h-full z-20 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.12) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.12) 100%)'
              }}
            />

            {/* 书右半页 (翻动页) */}
            <div className="w-1/2 h-full bg-[#FDFBF7] rounded-r-md border-y border-r border-[#E1DDD5] relative shadow-[0_8px_16px_rgba(0,0,0,0.04)] origin-left transform-style-3d flex items-center justify-center overflow-hidden animate-[page-flip_5s_ease-in-out_infinite]">
              <div className="w-[85%] h-[85%] border border-[#EEEBE5] rounded p-2 bg-[#FAF7EE]/50 flex flex-col justify-between backface-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=150&q=80" 
                  className="w-full h-[60%] object-cover rounded opacity-80" 
                  alt="3D book preview"
                />
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-[#56534C]/20 rounded" />
                  <div className="w-4/5 h-1 bg-[#56534C]/10 rounded" />
                </div>
              </div>
            </div>

            {/* 翻页时的地面阴影随翻动而缩放 */}
            <div className="absolute bottom-[-10px] left-1/4 w-1/2 h-2.5 bg-black/5 rounded-full blur-[3px] z-0 animate-[shadow-pulse_5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  };

  // 场景 3：高定实体印刷
  const renderDeliveryStage = () => {
    return (
      <div className="w-full h-full relative bg-[#FAF7EE] flex items-center justify-center p-6 overflow-hidden transition-colors duration-300">
        {/* 3D 礼盒与开箱动效 */}
        <div className="relative w-[280px] h-[220px] flex items-center justify-center">
          
          {/* 精美礼盒底座 */}
          <div className="absolute w-[200px] h-[140px] bg-[#2C3539] border-2 border-[#C5A059]/40 rounded-xl shadow-lg flex items-center justify-center transform translate-y-3">
            <div className="w-[94%] h-[94%] border border-[#C5A059]/20 rounded-lg bg-[#2C3539]/95 relative overflow-hidden" />
          </div>

          {/* 从盒子中缓缓滑出的高定精装画册 */}
          <div className="absolute w-[160px] h-[120px] bg-[#FAF4ED] border border-[#C5A059]/30 rounded-lg shadow-2xl flex flex-col justify-between p-3 select-none transform z-10 animate-[book-slide-out_6s_ease-in-out_infinite]">
            
            {/* 书本封面扫光 */}
            <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
              <div className="absolute inset-[-100%] bg-gradient-to-r from-transparent via-[#C5A059]/15 to-transparent rotate-45 animate-[gold-shine_4s_ease-in-out_infinite]" />
            </div>
            
            {/* 封面装饰 */}
            <div className="w-full h-full border border-[#C5A059]/10 rounded flex flex-col items-center justify-center space-y-2 p-1.5">
              <div className="w-5 h-5 border border-[#C5A059]/60 rounded-full flex items-center justify-center text-[#C5A059] text-[8px]">
                ★
                  </div>
              <div className="text-[10px] font-serif font-black tracking-widest text-[#2C3539]">拾光集</div>
              <div className="text-[5px] tracking-wider text-[#9B978E] uppercase font-light">Memories Book</div>
            </div>
          </div>

          {/* 顺丰快递标签微动效 */}
          <div className="absolute bottom-5 right-6 px-2.5 py-1 bg-white border border-[#EEEBE5] rounded-md shadow-md text-[8px] font-bold text-[#56534C] flex items-center gap-1 z-20 rotate-[6deg] animate-[float-tag_5s_ease-in-out_infinite]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>顺丰速运直达</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden relative z-10 bg-[#FAF7EE]/50 backdrop-blur-sm flex items-center justify-center border border-[#EEEBE5]/50">
      <style>{`
        @keyframes photo-drag-in {
          0% { transform: translate(60px, 40px) rotate(8deg) scale(0.7); opacity: 0; }
          35% { transform: translate(0px, 0px) rotate(-3deg) scale(1.03); opacity: 1; }
          50% { transform: translate(0px, 0px) rotate(-3deg) scale(1); }
          100% { transform: translate(0px, 0px) rotate(-3deg) scale(1); }
        }
        @keyframes float-controls {
          0%, 35% { opacity: 0; transform: scale(0.9); }
          50%, 100% { opacity: 1; transform: scale(1); }
        }
        @keyframes float-sticker {
          0%, 100% { transform: translateY(0) rotate(-8deg); }
          50% { transform: translateY(-3px) rotate(-6deg); }
        }
        @keyframes page-flip {
          0%, 100% { transform: rotateY(0deg); }
          45%, 55% { transform: rotateY(-140deg); }
        }
        @keyframes shadow-pulse {
          0%, 100% { transform: scaleX(1); opacity: 0.05; }
          45%, 55% { transform: scaleX(0.4) translateX(-40px); opacity: 0.12; }
        }
        @keyframes book-slide-out {
          0%, 100% { transform: translateY(10px) rotate(0deg) scale(0.96); opacity: 0.85; }
          45%, 55% { transform: translateY(-16px) rotate(-1.5deg) scale(1.01); opacity: 1; box-shadow: 0 20px 40px -10px rgba(44,53,57,0.2); }
        }
        @keyframes gold-shine {
          0% { transform: translate(-100%, -100%) rotate(45deg); }
          30%, 100% { transform: translate(100%, 100%) rotate(45deg); }
        }
        @keyframes float-tag {
          0%, 100% { transform: translateY(0) rotate(6deg); }
          50% { transform: translateY(-3px) rotate(7deg); }
        }
      `}</style>

      {currentMediaUrl && !videoError ? (
        <video
          key={activeTab}
          src={currentMediaUrl}
          muted
          autoPlay
          loop
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-500 transform scale-100 group-hover:scale-[1.02] ${
            isVideoPlaying ? 'opacity-100' : 'opacity-0'
          }`}
          onLoadedData={() => setIsVideoPlaying(true)}
          onError={handleVideoError}
        />
      ) : null}

      {(videoError || !currentMediaUrl || !isVideoPlaying) && (
        <div className="absolute inset-0 w-full h-full relative overflow-hidden">
          {/* 自由画布 */}
          <div className={`absolute inset-0 w-full h-full transition-all duration-500 transform ${
            activeTab === 1 
              ? 'opacity-100 scale-100 pointer-events-auto' 
              : 'opacity-0 scale-95 pointer-events-none'
          }`}>
            {renderCanvasStage()}
          </div>

          {/* 仿真3D物理翻页 */}
          <div className={`absolute inset-0 w-full h-full transition-all duration-500 transform ${
            activeTab === 2 
              ? 'opacity-100 scale-100 pointer-events-auto' 
              : 'opacity-0 scale-95 pointer-events-none'
          }`}>
            {renderPageFlipStage()}
          </div>

          {/* 高定实体印刷 */}
          <div className={`absolute inset-0 w-full h-full transition-all duration-500 transform ${
            activeTab === 3 
              ? 'opacity-100 scale-100 pointer-events-auto' 
              : 'opacity-0 scale-95 pointer-events-none'
          }`}>
            {renderDeliveryStage()}
          </div>
        </div>
      )}
    </div>
  );
}

export function WhyUs() {
  const { isMobile } = useDevice();
  const [activeTab, setActiveTab] = useState<number>(1);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 清理 hover 延迟定时器
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const values: ValueItem[] = [
    {
      id: 1,
      title: "自由画布 · 舞台模式",
      subTitle: "FREEDOM CANVAS",
      desc: "打破传统格子容器的刻板束缚。每一页都是独立的舞台，文字、图片、贴纸皆为自由图层。支持绝对坐标任意拖拽与层叠，自动锁定原图比例，让每一次编排都随心所欲，尽显灵动韵味。",
      icon: <Layers className="w-5 h-5" />,
      mediaUrl: "/videos/features-canvas.mp4"
    },
    {
      id: 2,
      title: "仿生 3D · 物理翻页",
      subTitle: "3D PHYSICAL PAGE-FLIP",
      desc: "让数字屏幕流淌出纸张的厚重与柔韧。集成高仿真 3D 物理翻页渲染算法，书脊阴影随光线细腻流转。在屏幕上滑动指尖，即可享受沉浸式模拟实体翻阅的视觉与听觉盛宴。",
      icon: <BookOpen className="w-5 h-5" />,
      mediaUrl: "/videos/features-flip.mp4"
    },
    {
      id: 3,
      title: "高定实体 · 精装印刷",
      subTitle: "PREMIUM PHYSICAL DELIVERY",
      desc: "屏幕上的美好，终将跃然纸上。无缝对接高水准实体纸质精装印刷工厂，采用高克重艺术纸与进口环保油墨。顺丰直寄家门，配以尊贵精美礼盒包装，让转瞬即逝的记忆片段，化为可世代传阅的珍藏家传。",
      icon: <Truck className="w-5 h-5" />,
      mediaUrl: "/videos/features-delivery.mp4"
    }
  ];

  if (isMobile) {
    // 移动端降级方案：垂直上下卡片流，媒体采用零算力损耗的 CSS 微场景 / 原生 `<video>` 兜底播放
    return (
      <section id="features" className="py-16 px-6 bg-[#F7F4EF] space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-widest text-[#C5A059] font-black">WHY TIMECOLLATE</span>
          <h2 className="text-3xl font-serif text-[#2C3539] font-bold">为什么选择拾光集</h2>
        </div>
        
        <div className="space-y-8">
          {values.map((item) => (
            <div key={item.id} className="bg-[#FDFBF7]/90 backdrop-blur-md rounded-2xl p-6 border border-[#EEEBE5] shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#FAF4ED] rounded-xl text-[#C5A059]">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2C3539]">{item.title}</h3>
                  <p className="text-[9px] text-[#9B978E] tracking-wider uppercase font-light">{item.subTitle}</p>
                </div>
              </div>
              <p className="text-sm text-[#56534C] font-medium leading-relaxed">
                {item.desc}
              </p>
              
              <div className="w-full aspect-[16/10] bg-[#FAF7EE] rounded-xl overflow-hidden relative border border-[#EEEBE5]/40">
                <ValueShowcasePanel activeTab={item.id} />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // PC 端奢华互动方案：左右联动的交互大秀场
  return (
    <section id="features" className="py-24 px-6 sm:px-12 lg:px-20 bg-gradient-to-b from-[#F7F4EF] via-[#FAF7EE]/30 to-[#F7F4EF] border-t border-[#EEEBE5]/50 overflow-hidden">
      
      {/* 动态微粒底纹 */}
      <div className="absolute inset-0 opacity-[0.01] pointer-events-none mix-blend-overlay" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
      }} />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 text-[#C5A059] font-black text-[11px] uppercase tracking-widest">
            <Activity size={14} />
            <span>WHY TIMECOLLATE</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-serif tracking-tight text-[#2C3539] font-bold">
            技术与人文交织的三大壁垒
          </h2>
        </div>

        <div className="grid grid-cols-12 gap-12 items-center">
          {/* 左侧：动态视觉秀场区 */}
          <div className="col-span-6 bg-white p-4 rounded-[32px] border border-[#EEEBE5] shadow-xl shadow-stone-100/50 min-h-[450px] flex items-center justify-center relative overflow-hidden group">
            {/* 流态玻璃微光背景 */}
            <div className="absolute -inset-10 bg-gradient-to-tr from-[#FAF4ED] via-transparent to-[#FAF7EE] blur-3xl opacity-70 group-hover:opacity-100 transition-opacity duration-700" />
            
            {/* 动态内容容器：加载视频，并在失败时渲染拟物微场景 */}
            <ValueShowcasePanel activeTab={activeTab} />
          </div>

          {/* 右侧：纵向高阶悬停文本控制区 */}
          <div className="col-span-6 space-y-6">
            {values.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => {
                    if (hoverTimerRef.current) {
                      clearTimeout(hoverTimerRef.current);
                    }
                    hoverTimerRef.current = setTimeout(() => {
                      setActiveTab(item.id);
                    }, 120); // 120ms 防抖延迟，避免鼠标快速滑过时频繁触发加载
                  }}
                  onMouseLeave={() => {
                    if (hoverTimerRef.current) {
                      clearTimeout(hoverTimerRef.current);
                    }
                  }}
                  onClick={() => {
                    // 点击时立即切换，提升即时响应感
                    if (hoverTimerRef.current) {
                      clearTimeout(hoverTimerRef.current);
                    }
                    setActiveTab(item.id);
                  }}
                  className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'bg-white border-[#C5A059]/30 shadow-lg shadow-[#C5A059]/5 translate-x-2'
                      : 'bg-transparent border-transparent hover:bg-[#FAF7EE]/50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl transition-all duration-350 ${
                      isActive ? 'bg-[#C5A059] text-white' : 'bg-[#FAF4ED] text-[#C5A059]'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-col">
                        <span className={`text-[10px] uppercase tracking-widest font-semibold transition-colors ${
                          isActive ? 'text-[#C5A059]' : 'text-[#9B978E]'
                        }`}>{item.subTitle}</span>
                        <h3 className="text-xl font-bold text-[#2C3539] mt-0.5">{item.title}</h3>
                      </div>
                      
                      {/* 高度平滑展开动效，响应 activeTab 释放描述 */}
                      <div className={`transition-all duration-350 overflow-hidden ${
                        isActive ? 'max-h-40 opacity-100 mt-2.5' : 'max-h-0 opacity-0'
                      }`}>
                        <p className="text-sm text-[#56534C] font-medium leading-relaxed">
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
