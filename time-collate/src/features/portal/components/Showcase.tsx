import React, { useState } from 'react';
import { useDevice } from '../hooks/useDevice';
import { BookOpen, Eye, Heart, ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { GeneratedCover } from '../../editor/components/GeneratedCover';
import { useNavigate } from 'react-router-dom';

const mockHotBooks = [
  { id: 'mock-b1', title: '毕业，是青涩的终点 🎓', author: '同桌的你', coverUrl: 'design://?layout=classic&bg=slate-blue', views: 560, likes: 120 },
  { id: 'mock-b2', title: '西藏骑行记 · 追风少年 🚴‍♂️', author: '旅行家老张', coverUrl: 'design://?layout=modern&bg=sunset-orange', views: 420, likes: 98 },
  { id: 'mock-b3', title: '可乐的成长温暖日记 🐶', author: '可乐排版匠', coverUrl: 'design://?layout=minimal&bg=cotton-white', views: 350, likes: 85 },
  { id: 'mock-b4', title: '我们的恋爱两周年纪念 👩‍❤️‍👨', author: '心动收集器', coverUrl: 'design://?layout=art&bg=peach-summer', views: 280, likes: 72 },
  { id: 'mock-b5', title: '夏日海滨慢生活 🏖️', author: '慵懒的树懒', coverUrl: 'design://?layout=modern&bg=glacier-mist', views: 210, likes: 60 },
  { id: 'mock-b6', title: '深林徒步与篝火之夜 🌲', author: '野营爱好者', coverUrl: 'design://?layout=classic&bg=forest-green', views: 180, likes: 45 },
];

// Mock 已经切好图的极轻量静态 WebP 内页图片 (用于移动端 0 延时预览机制)
const mockInnerPages = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1472289065668-ce650ac443d2?auto=format&fit=crop&w=600&q=80'
];

/**
 * 板块四：热门作品区 (Showcase Cloud Shelf)
 * PC端构建带有高级木质质感搁板的“云端书架”，Hover 时书籍封面平滑移开并旋转微偏露出内页，阅读点赞数通过流态玻璃气泡悬浮展现。
 * 移动端放弃横排搁板，采用自适应瀑布流网格。
 * 极速查看：移动端点击“立即翻阅”时严禁加载 3D 渲染翻书引擎，直接调用基于 CSS Scroll Snap 的超轻量静态内页画册弹出层。
 */
export function Showcase() {
  const { isMobile } = useDevice();
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');

  const activeBook = mockHotBooks[activeIndex];

  const handleNextBook = () => {
    setActiveIndex(prev => (prev + 1) % mockHotBooks.length);
  };

  const handlePrevBook = () => {
    setActiveIndex(prev => (prev - 1 + mockHotBooks.length) % mockHotBooks.length);
  };

  const handleBookClick = (bookId: string) => {
    if (bookId.startsWith('mock-')) {
      // 触发轻量静态内页预览
      const book = mockHotBooks.find(b => b.id === bookId);
      if (book) {
        setPreviewTitle(book.title);
        setIsPreviewOpen(true);
      }
    } else {
      navigate(`/read/${bookId}`);
    }
  };

  return (
    <section id="hot-books" className="py-24 px-6 sm:px-12 relative overflow-hidden select-none border-t border-[#EEEBE5]" style={{
      background: 'radial-gradient(circle at center, #FFFDF9 0%, #FAF7EE 100%)',
    }}>
      
      {/* 质感纸纹叠层 */}
      <div className="absolute inset-0 opacity-[0.012] pointer-events-none mix-blend-overlay" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
      }} />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* 头部导航与标题 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 text-[#C5A059] font-black text-[11px] uppercase tracking-widest">
              <Eye size={14} />
              <span>Recent Hot Memory Books</span>
            </div>
            <h3 className="text-3xl sm:text-4.5xl font-black text-[#2C3539] tracking-tight">
              拾光者们的热门作品
            </h3>
            <p className="text-[#9B978E] text-xs.5 font-bold">
              看看其他拾光者的精彩画册，点击书本即可直接打开并沉浸式翻阅
            </p>
          </div>

          {/* 切换按钮（仅PC端） */}
          {!isMobile && (
            <div className="flex gap-3">
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
          )}
        </div>

        {/* 板块主体 (多端分流) */}
        {!isMobile ? (
          /* ==================== PC 端：奢华云端拟物书架 ==================== */
          <div className="flex flex-col lg:flex-row items-center justify-between gap-16 min-h-[460px]">
            
            {/* 左侧：3D 书架及一字排开的精装书 (PC舞台) */}
            <div className="w-full lg:w-[58%] flex flex-col justify-end min-h-[380px] relative">
              
              {/* 木质/大理石质感拟物架板 (Shelf Decor) */}
              <div 
                className="absolute bottom-6 left-[-5%] right-[-5%] h-[16px] rounded-md shadow-lg border-b border-[#523B1E] z-10"
                style={{
                  background: 'linear-gradient(to bottom, #8C6D3E 0%, #6A4F2A 100%)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
                }}
              />
              
              {/* 书本一字排开容器 */}
              <div className="relative w-full flex items-end justify-center gap-8 pb-10 z-20">
                {mockHotBooks.slice(0, 4).map((book, idx) => {
                  const isFocused = idx === activeIndex;
                  return (
                    <div 
                      key={book.id}
                      onClick={() => setActiveIndex(idx)}
                      className="relative transition-all duration-500 ease-out cursor-pointer select-none origin-bottom"
                      style={{
                        transform: isFocused ? 'scale(1.08) translateY(-4px)' : 'scale(0.9) translateY(0px)',
                        zIndex: isFocused ? 30 : 20
                      }}
                    >
                      {/* 2D 拟物书卡片 */}
                      <div className="relative w-[130px] h-[180px] group book-container-2d rounded-r-[8px] rounded-l-[2px]">
                        
                        {/* Page content inside */}
                        <div className="absolute inset-0 bg-[#FAF4ED] rounded-r-[8px] rounded-l-[2px] border border-[#EEEBE5] z-10 flex flex-col justify-between p-3 pointer-events-none shadow-[inset_8px_0_15px_rgba(0,0,0,0.05)]">
                          <div className="absolute right-0 inset-y-0 w-[2px] bg-slate-100 rounded-r-[8px]" />
                          <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <h5 className="text-[8px] font-black text-[#2C3539] leading-tight line-clamp-3">
                              {book.title}
                            </h5>
                          </div>
                          <div className="text-[6px] text-stone-400 font-mono tracking-widest text-center border-t border-stone-200/40 pt-1">
                            TC ALBUM
                          </div>
                        </div>

                        {/* Front Cover (slides left on hover) */}
                        <div className="absolute inset-0 rounded-r-[8px] rounded-l-[2px] bg-[#FAF7EE] shadow-md cover-2d z-20 border border-stone-250/20 overflow-hidden">
                          {/* 书脊凹线 */}
                          <div className="absolute left-[5px] inset-y-0 w-[2px] bg-gradient-to-r from-black/15 to-transparent pointer-events-none" />
                          <div className="w-[300px] h-[420px] absolute top-0 left-0" style={{ transform: 'scale(0.4333)', transformOrigin: 'top left' }}>
                            <GeneratedCover
                              title={book.title}
                              author={book.author}
                              coverUrl={book.coverUrl}
                              mode="card"
                            />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-out pointer-events-none" />
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 右侧：聚焦展示面板 */}
            {activeBook && (
              <div className="w-full lg:w-[38%] flex flex-col justify-center animate-fade-in z-20">
                <div className="bg-white/60 backdrop-blur-[15px] border border-[#EEEBE5]/65 rounded-3xl p-8 shadow-xl shadow-slate-100/30 relative">
                  
                  {/* 流态玻璃气泡定位 */}
                  <span className="text-[10px] font-black text-[#C5A059] bg-[#FAF4ED] px-3 py-1 rounded-full border border-[#C5A059]/20 self-start uppercase tracking-wider">
                    正在预览聚焦
                  </span>

                  <h4 className="text-xl.5 font-black text-[#2C3539] tracking-tight mt-5 leading-snug">
                    {activeBook.title}
                  </h4>

                  <p className="text-[10px] font-bold text-[#9B978E] uppercase tracking-widest mt-2">
                    BY: <span className="text-[#56534C]">@{activeBook.author}</span>
                  </p>

                  <div className="w-full h-[1px] bg-gradient-to-r from-[#EEEBE5] to-transparent my-6" />

                  {/* 悬浮流态气泡展示阅读/喜欢数 */}
                  <div className="flex items-center gap-4 text-xs font-black text-[#9B978E] tracking-wider mb-8">
                    <span className="flex items-center gap-1.5 bg-[#FAF7EE] px-3.5 py-1.5 rounded-lg border border-[#EEEBE5]/65 shadow-inner">
                      <Eye size={13} className="text-[#3A4454]" />
                      <span className="text-[#56534C]">{activeBook.views} 阅读</span>
                    </span>
                    <span className="flex items-center gap-1.5 bg-rose-50/50 px-3.5 py-1.5 rounded-lg border border-rose-100 shadow-sm">
                      <Heart size={12} className="text-rose-500 fill-rose-500/20" />
                      <span className="text-rose-600">{activeBook.likes} 喜欢</span>
                    </span>
                  </div>

                  <button
                    onClick={() => handleBookClick(activeBook.id)}
                    className="w-full py-4 bg-[#3A4454] hover:bg-[#2C3539] hover:shadow-lg text-white font-black text-xs.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span>立即翻阅回忆书</span>
                    <ArrowRight size={15} className="stroke-[3]" />
                  </button>
                </div>
              </div>
            )}

          </div>
        ) : (
          /* ==================== 移动端：高性能瀑布流封面大图卡片 ==================== */
          <div className="grid grid-cols-2 gap-4 w-full">
            {mockHotBooks.map((book) => (
              <div 
                key={book.id} 
                className="bg-white border border-[#EEEBE5] rounded-2xl p-3 shadow-sm flex flex-col space-y-3 cursor-pointer"
                onClick={() => handleBookClick(book.id)}
              >
                {/* 封面占位 */}
                <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border border-stone-200/50">
                  <GeneratedCover
                    title={book.title}
                    author={book.author}
                    coverUrl={book.coverUrl}
                    mode="card"
                  />
                </div>
                {/* 文案 */}
                <div className="space-y-1">
                  <h5 className="text-[10px] font-black text-[#2C3539] line-clamp-2 leading-tight">
                    {book.title}
                  </h5>
                  <p className="text-[8px] text-stone-400 font-medium">@{book.author}</p>
                </div>
                <div className="flex items-center justify-between text-[8px] text-[#9B978E] pt-2 border-t border-stone-200/40">
                  <span className="flex items-center gap-0.5">
                    <Eye size={10} />
                    <span>{book.views}</span>
                  </span>
                  <span className="text-amber-700 font-bold">立即翻阅 →</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ==================== 全屏静态内页极速预览 Lighbox (移动端专用) ==================== */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex flex-col justify-between p-6">
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 text-white">
            <span className="text-xs font-serif font-black tracking-wide truncate max-w-[200px]">
              {previewTitle}
            </span>
            <button 
              onClick={() => setIsPreviewOpen(false)}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* 水平原生 CSS Snap 内页轮播 */}
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-6 w-full max-w-[500px]">
              {mockInnerPages.map((url, idx) => (
                <div 
                  key={idx} 
                  className="snap-center shrink-0 w-full aspect-[4/3] bg-white rounded-2xl shadow-xl overflow-hidden flex items-center justify-center p-2"
                >
                  <img src={url} className="w-full h-full object-cover rounded-xl" alt={`page-${idx}`} />
                </div>
              ))}
            </div>
          </div>

          {/* 脚部说明 */}
          <div className="text-center space-y-3">
            <p className="text-[10px] text-white/50">
              ← 左右滑动极速翻阅静态内页 · 不消耗手机流量 →
            </p>
            <button 
              onClick={() => {
                setIsPreviewOpen(false);
                navigate('/login');
              }}
              className="px-8 py-3 bg-[#C5A059] text-white rounded-full font-bold text-xs.5 tracking-wider shadow-lg cursor-pointer"
            >
              一键制作我的画册
            </button>
          </div>
        </div>
      )}

    </section>
  );
}
