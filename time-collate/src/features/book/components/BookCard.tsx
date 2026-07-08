import { Lock, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { GeneratedCover } from '../../editor/components/GeneratedCover';

interface BookCardProps {
    book: {
        id: string;
        title: string;
        author?: string;
        createdAt: number;
        updatedAt?: number;
        coverUrl?: string;
        coverThumbnailUrl?: string;
        theme?: string;
        status?: 'private' | 'pending' | 'published' | 'rejected';
        chapters?: any[];
    };
    onClick: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    overlay?: React.ReactNode;
    topRightAction?: React.ReactNode;
    footerInfo?: React.ReactNode;
    showCommunityStats?: boolean;
    isTrash?: boolean;
}

/**
 * 格式化辅助：获取书籍页数、照片数与模拟社区统计
 */
const getBookStats = (book: any) => {
    let pageCount = typeof book.pageCount === 'number' ? book.pageCount : 0;
    let photoCount = typeof book.photoCount === 'number' ? book.photoCount : 0;

    if (pageCount === 0 && book.pages && Array.isArray(book.pages)) {
        pageCount = book.pages.length;
        book.pages.forEach((p: any) => {
            if (p.photos && Array.isArray(p.photos)) {
                photoCount += p.photos.filter((photo: any) => photo && photo.url).length;
            }
        });
    }

    // 只有在 mock 书籍时才兜底生成模拟的数值；真实用户书籍即使为 0 也要如实呈现，避免数据误导
    const isMock = Boolean(book.id && book.id.startsWith('mock-'));
    if (pageCount === 0 && isMock) {
        const num = book.id ? book.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : 10;
        pageCount = (num % 12) + 8; // 8 - 19 页
        photoCount = pageCount * ((num % 3) + 2) - (num % 5);
    }

    const seed = book.id ? book.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : 50;
    const views = book.views !== undefined ? book.views : (isMock ? ((seed % 380) + 120) : 0);
    const likes = book.likes !== undefined ? book.likes : (isMock ? (Math.floor(views * ((seed % 12) + 8) / 100) + 4) : 0);

    return { pageCount, photoCount, views, likes };
};

/**
 * 书籍卡片组件
 * 模拟真实书籍外观的 3D 立体拟物化设计
 */
export function BookCard({ book, onClick, onContextMenu, overlay, topRightAction, footerInfo, showCommunityStats = false, isTrash = false }: BookCardProps) {
    const stats = getBookStats(book);

    return (
        <div className="group relative hover:z-[40] w-full max-w-[200px] sm:max-w-[220px] md:max-w-[240px] mx-auto flex flex-col font-['Outfit',_sans-serif]">

            {/* 书籍主体 - 立体拟物化和 3D 悬浮效果 */}
            <div
                onClick={onClick}
                onContextMenu={(e) => {
                    if (onContextMenu) {
                        e.preventDefault();
                        onContextMenu(e);
                    }
                }}
                className={`relative w-full aspect-[3/4] rounded-r-md rounded-l-[3px] shadow-lg cursor-pointer
                           perspective-1000 preserve-3d transition-all duration-300 ease-out
                           ${isTrash
                        ? 'opacity-80'
                        : 'group-hover:shadow-[12px_20px_35px_rgba(0,0,0,0.18)] group-hover:translate-y-[-8px] group-hover:rotate-y-[-8deg]'}
                           border-y border-r border-black/5`}
            >
                {/* 拟物凹凸书脊效果 (左侧边缘) */}
                <div className="absolute left-0 top-0 bottom-0 w-[10px] bg-gradient-to-r from-black/25 via-black/5 to-white/10 z-20 pointer-events-none rounded-l-[2px]" />
                <div className="absolute left-[9px] top-0 bottom-0 w-[1px] bg-black/10 z-20 pointer-events-none" />

                {/* 拟物立体纸页折叠厚度效果 (右侧与底侧边框) */}
                <div className="absolute right-0 top-[2px] bottom-[2px] w-[3px] bg-slate-100/90 border-r border-slate-300 z-10 pointer-events-none shadow-sm" />
                <div className="absolute right-[3px] top-[2px] bottom-[2px] w-[1px] bg-slate-200 z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-[6px] right-[2px] h-[3px] bg-slate-100/90 border-b border-slate-300 z-10 pointer-events-none shadow-sm" />

                {/* 状态徽章 */}
                {book.status && book.status !== 'private' && (
                    <div className="absolute top-3 left-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 shadow-lg animate-in fade-in slide-in-from-left-2 duration-300">
                        {book.status === 'pending' && (
                            <>
                                <Clock size={10} className="text-amber-400 animate-pulse" />
                                <span className="text-[9px] font-black text-white tracking-widest uppercase">审核中</span>
                            </>
                        )}
                        {book.status === 'published' && (
                            <>
                                {/* 根据 ID 确定性生成精选或实物印刷徽章 */}
                                {(book.id && book.id.charCodeAt(0) % 5 === 0) ? (
                                    <>
                                        <span className="text-amber-400 text-[10px]">★</span>
                                        <span className="text-[9px] font-black text-amber-300 tracking-wider uppercase">精选推荐</span>
                                    </>
                                ) : (book.id && book.id.charCodeAt(1) % 4 === 0) ? (
                                    <>
                                        <span className="text-cyan-400 text-[10px]">💎</span>
                                        <span className="text-[9px] font-black text-cyan-300 tracking-wider uppercase">已印实物</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={10} className="text-emerald-400" />
                                        <span className="text-[9px] font-black text-emerald-100 tracking-widest uppercase">公开分享</span>
                                    </>
                                )}
                            </>
                        )}
                        {book.status === 'rejected' && (
                            <>
                                <AlertCircle size={10} className="text-red-400" />
                                <span className="text-[9px] font-black text-white tracking-widest uppercase">未通过</span>
                            </>
                        )}
                    </div>
                )}

                {/* 私密状态专属图标 */}
                {book.status === 'private' && (
                    <div className="absolute top-3 left-4 z-30 w-6 h-6 rounded-lg bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/40">
                        <Lock size={12} />
                    </div>
                )}

                {/* 书中内页 (封面翻开后露出的第一页，承载拾光简报数据或装饰线条) */}
                {!isTrash && (
                    <div className="absolute inset-y-[2px] left-[9px] right-[4px] bg-[#FCFBF7] border-y border-r border-[#EADFC9] rounded-r-sm z-10 shadow-[inset_2px_0_4px_rgba(0,0,0,0.05)] pointer-events-none flex flex-col select-none transition-all duration-500 group-hover:translate-x-[1px] overflow-hidden">
                        {/* 纸张纹理覆层 */}
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M0 0h1v1H0z\'/%3E%3C/g%3E%3C/svg%3E")' }} />

                        {showCommunityStats ? (
                            /* 拾光简报 —— 社区模式下的数据内页 */
                            <div className="relative z-10 flex flex-col h-full px-4 py-3.5">
                                {/* 标题 */}
                                <div className="text-[8.5px] font-bold text-[#A69B85] uppercase tracking-[0.18em] font-['Georgia','Songti_SC','STSong',serif] border-b border-[#EADFC9]/60 pb-1.5 mb-auto text-center">
                                    拾光简报
                                </div>

                                {/* 数据条目 */}
                                <div className="flex flex-col justify-center space-y-2.5 my-auto text-[9px] text-[#7C6C5E] font-medium font-['Georgia','Songti_SC','STSong',serif]">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[7.5px] text-[#B5A890] tracking-wider">底片 / 切片</span>
                                        <span className="font-bold text-[#5C4033] text-[11px]">{stats.pageCount}帧 / {stats.photoCount}枚</span>
                                    </div>
                                    <div className="w-full h-[1px] bg-[#EADFC9]/50" />
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[7.5px] text-[#B5A890] tracking-wider">阅览 / 回响</span>
                                        <span className="font-bold text-[#5C4033] text-[11px]">{stats.views}次 / {stats.likes}声</span>
                                    </div>
                                </div>

                                {/* 底部装饰 */}
                                <div className="flex justify-between items-center pt-1.5 mt-auto border-t border-[#EADFC9]/40">
                                    <span className="text-[7px] text-[#C4B89E] italic font-serif">TimeCollate</span>
                                    <span className="text-[7px] text-[#C4B89E] font-serif">✦</span>
                                </div>
                            </div>
                        ) : (
                            /* 默认装饰线条内页 */
                            <div className="w-full h-full flex flex-col justify-between py-1.5 px-0.5 p-3.5">
                                <div className="space-y-1.5 mt-1">
                                    <div className="h-[2px] w-3/4 bg-[#EADFC9] rounded-full" />
                                    <div className="h-[2px] w-5/6 bg-[#EADFC9] rounded-full" />
                                    <div className="h-[2px] w-2/3 bg-[#EADFC9] rounded-full" />
                                </div>
                                <div className="flex justify-between items-center text-[8px] text-[#B5A890] font-serif">
                                    <span>第 {stats.pageCount} 页</span>
                                    <span className="italic">TimeCollate</span>
                                </div>
                            </div>
                        )}

                        {/* 页角翘起效果 */}
                        <div className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none z-20"
                            style={{
                                background: 'linear-gradient(135deg, transparent 40%, #E8DFD0 50%, #DDD4C2 55%, #FAF7EE 60%)',
                            }} />
                    </div>
                )}

                {/* 可 3D 旋转翻开的封面皮层 (保留完美封面美感，双面 3D 渲染防止背面文字镜像) */}
                <div className={`absolute inset-0 rounded-r-md rounded-l-[3px] z-20 origin-left 
                                transition-transform duration-500 ease-out preserve-3d
                                ${isTrash
                        ? 'filter grayscale brightness-75'
                        : 'group-hover:rotate-y-[-140deg] group-hover:shadow-[-5px_5px_15px_rgba(0,0,0,0.22)]'}`}>
                    
                    {/* 封面正面 (Front Page) - 指向用户的一面 */}
                    <div 
                        className="absolute inset-0 w-full h-full rounded-r-md rounded-l-[3px] overflow-hidden z-20"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        {(() => {
                            const isGeneratedCover = book.coverUrl && 
                                !book.coverUrl.startsWith('design://') && 
                                (book.coverUrl.includes('/cover.webp') || book.coverUrl.toLowerCase().endsWith('.webp'));
                            if (isGeneratedCover) {
                                const version = book.updatedAt ? new Date(book.updatedAt).getTime() : book.createdAt;
                                const coverSrc = book.coverThumbnailUrl || book.coverUrl;
                                const coverSrcWithVersion = coverSrc ? `${coverSrc}${coverSrc.includes('?') ? '&' : '?'}v=${version}` : '';
                                return (
                                    <img
                                        src={coverSrcWithVersion}
                                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                                        alt={book.title}
                                        loading="lazy"
                                    />
                                );
                            }
                            return (
                                <GeneratedCover
                                    title={book.title}
                                    author={book.author || ''}
                                    coverUrl={book.coverUrl}
                                    mode="card"
                                />
                            );
                        })()}
                        {/* 纸张磨砂哑光质感覆膜 */}
                        <div className="absolute inset-0 bg-white/[0.02] mix-blend-overlay pointer-events-none z-10" />
                    </div>

                    {/* 封面背面/环衬面 (Back/Endpaper Page) - 翻开后看到的真实精致内衬 */}
                    <div 
                        className="absolute inset-0 w-full h-full rounded-r-sm rounded-l-md bg-[#F4EFE6] border border-[#E4DAC5] z-10 flex flex-col justify-between p-4 shadow-[inset_-3px_0_8px_rgba(0,0,0,0.05)]"
                        style={{ 
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)'
                        }}
                    >
                        {/* 环衬折线阴影 */}
                        <div className="absolute right-0 top-0 bottom-0 w-[6px] bg-gradient-to-l from-black/[0.08] to-transparent pointer-events-none" />
                        {/* 模拟纸质感 */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                             style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M0 0h1v1H0z\'/%3E%3C/g%3E%3C/svg%3E")' }} />
                        
                        <div className="m-auto text-center opacity-30 select-none">
                            <div className="text-[11px] text-[#8C7A6B] font-serif tracking-[0.25em] font-medium">拾光集</div>
                            <div className="w-6 h-[1px] bg-[#EADFC9] mx-auto my-1.5" />
                            <div className="text-[6.5px] text-[#A69B85] font-serif uppercase tracking-[0.15em]">TimeCollate</div>
                        </div>
                    </div>
                </div>

                {/* 右上角快捷操作 (如删除) */}
                {topRightAction && (
                    <div className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {topRightAction}
                    </div>
                )}

                {/* 操作遮罩层 */}
                {overlay && (
                    <div className="absolute inset-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="absolute inset-0 pointer-events-auto flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            {overlay}
                        </div>
                    </div>
                )}

            </div>

            {/* 非社区模式下的自定义页脚 */}
            {!showCommunityStats && footerInfo ? (
                <div className="mt-2 px-1.5">
                    {footerInfo}
                </div>
            ) : null}
        </div>
    );
}
