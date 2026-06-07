import React, { useRef, useMemo, forwardRef, useCallback, useState, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import type { Book, Page } from '../types';
import { BookRenderer } from './BookRenderer';
import { PAGE_SIZES, type PageSize } from './PhysicalConstants';
import { ThemeProvider } from './ThemeManager';
import { ChevronLeft, ChevronRight, X, Rocket, BookOpen, Heart, Star, Eye, MessageSquare, Trash2, Send } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { socialService, type Comment } from '../services/socialService';

// #region 类型定义
interface FlipBookProps {
    book: Book;
    onClose?: () => void;
    isPublicView?: boolean; // 新增：是否为公共/他人分享视图
    onCTA?: () => void;      // 新增：引流按钮点击回调
    onCloneLayout?: () => void; // 新增：套用排版点击回调
}

interface FlattenedPage {
    page: Page;
    chapterTitle: string;
    chapterDate: string;
    chapterIndex: number;
}
// #endregion

// #region 单页渲染组件 (forwardRef 以便 react-pageflip 引用)
interface PageComponentProps {
    pageData: FlattenedPage;
    pageSize: PageSize;
    pageNumber: number;
    totalPages: number;
    book: Book;
    side: 'left' | 'right';
    isVirtualActive?: boolean;
}

const PageComponent = forwardRef<HTMLDivElement, PageComponentProps>(
    ({ pageData, pageSize, pageNumber, totalPages, book, side, isVirtualActive = true }, ref) => {
        const dimensions = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;

        return (
            <div
                ref={ref}
                className="flip-page bg-white shadow-2xl overflow-hidden border border-black/[0.08] relative group"
                style={{
                    width: `${dimensions.width}mm`,
                    height: `${dimensions.height}mm`,
                }}
            >
                {/* 纸质纹理蒙层 */}
                <div 
                    className="absolute inset-0 pointer-events-none opacity-[0.025] z-25 mix-blend-multiply"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    }}
                />

                {/* 立体中缝阴影层 */}
                <div 
                    className="absolute inset-y-0 pointer-events-none z-30"
                    style={{
                        width: '30px',
                        left: side === 'left' ? 'auto' : 0,
                        right: side === 'left' ? 0 : 'auto',
                        background: side === 'left'
                            ? 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.01) 50%, rgba(0,0,0,0.04) 80%, rgba(0,0,0,0.1) 100%)'
                            : 'linear-gradient(to left, rgba(0,0,0,0) 0%, rgba(0,0,0,0.01) 50%, rgba(0,0,0,0.04) 80%, rgba(0,0,0,0.1) 100%)',
                    }}
                />

                {/* 纸张侧切边缘内阴影 */}
                <div 
                    className="absolute inset-0 pointer-events-none z-30"
                    style={{
                        boxShadow: side === 'left' 
                            ? 'inset -15px 0 20px -15px rgba(0,0,0,0.12), inset -1px 0 0 0 rgba(0,0,0,0.04)' 
                            : 'inset 15px 0 20px -15px rgba(0,0,0,0.12), inset 1px 0 0 0 rgba(0,0,0,0.04)',
                    }}
                />

                {isVirtualActive ? (
                    <BookRenderer
                        page={pageData.page}
                        pageSize={pageSize}
                        chapterTitle={pageData.chapterTitle}
                        chapterDate={pageData.chapterDate}
                        chapterIndex={pageData.chapterIndex}
                        book={book}
                        readOnly={true}
                        side={side}
                    />
                ) : (
                    // 动态虚拟化占位骨架屏
                    <div className="absolute inset-0 flex items-center justify-center bg-[#FAF9F6]">
                        {pageData.page.layout === 'book-cover' && book.coverUrl ? (
                            <img 
                                src={book.coverUrl} 
                                alt="cover-preload" 
                                className="w-full h-full object-cover opacity-50 blur-[2px]" 
                            />
                        ) : (
                            <div className="animate-pulse flex flex-col items-center gap-4 w-[60%] opacity-20">
                                <div className="h-4 bg-slate-200 rounded w-1/3" />
                                <div className="h-28 bg-slate-200 rounded w-full" />
                                <div className="space-y-2 w-full">
                                    <div className="h-3 bg-slate-200 rounded" />
                                    <div className="h-3 bg-slate-200 rounded w-[80%]" />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 页码 - 非封面/序言/封底/空白页才显示 */}
                {!['book-cover', 'preface', 'back-cover', 'empty'].includes(pageData.page.layout) && (
                    <div className="absolute bottom-4 left-0 right-0 text-center z-20">
                        <span className="text-[8pt] text-gray-350 tracking-widest font-mono">
                            {pageNumber} / {totalPages}
                        </span>
                    </div>
                )}
            </div>
        );
    }
);

PageComponent.displayName = 'PageComponent';
// #endregion

// #region 主组件
/**
 * @description 3D 翻页电子书阅读器
 * 使用 react-pageflip 实现拟真翻页动画
 */
export const FlipBook: React.FC<FlipBookProps> = ({ book, onClose, isPublicView, onCTA, onCloneLayout }) => {
    const currentUser = useAuthStore(state => state.user);
    const isOwner = currentUser && book.userId === currentUser.id;

    const flipBookRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [scale, setScale] = useState(1);

    // 交互状态与统计
    const [liked, setLiked] = useState(book.liked || false);
    const [favorited, setFavorited] = useState(book.favorited || false);
    const [likeCount, setLikeCount] = useState(book.likes || 0);
    const [favoriteCount, setFavoriteCount] = useState(book.favorites || 0);
    const [viewCount, setViewCount] = useState(book.views || 0);

    // 留言状态
    const [comments, setComments] = useState<Comment[]>([]);
    
    // 全书留言板侧边栏状态
    const [isGuestbookOpen, setIsGuestbookOpen] = useState(false);
    const [guestbookText, setGuestbookText] = useState('');
    const guestbookRef = useRef<HTMLDivElement>(null);

    // 键盘按键按下状态 (用于视觉反馈)
    const [activeKeys, setActiveKeys] = useState({ left: false, right: false, esc: false });

    // 隐藏提示与操作栏状态 (无操作时隐藏)
    const [controlsVisible, setControlsVisible] = useState(true);

    useEffect(() => {
        if (isGuestbookOpen) {
            setControlsVisible(true);
            return;
        }

        let timer: any;
        const resetTimer = () => {
            setControlsVisible(true);
            clearTimeout(timer);
            timer = setTimeout(() => {
                setControlsVisible(false);
            }, 3000);
        };

        const handleActivity = () => {
            resetTimer();
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        
        resetTimer();

        return () => {
            clearTimeout(timer);
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
        };
    }, [isGuestbookOpen]);

    // 拉取当前书籍的所有评论贴纸
    const fetchComments = async () => {
        try {
            const list = await socialService.getComments(book.id);
            setComments(list);
        } catch (err) {
            console.error('Failed to fetch comments:', err);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [book.id]);

    // 记录阅读数 (防刷)
    useEffect(() => {
        axios.post('/interactions/view', { entityType: 'book', entityId: book.id })
            .then(res => {
                if (res.data?.success) {
                    setViewCount(res.data.data.views);
                }
            })
            .catch(err => console.error('Failed to record view:', err));
    }, [book.id]);

    const handleToggleLike = async () => {
        try {
            const res = await axios.post('/interactions/like', { entityType: 'book', entityId: book.id });
            if (res.data?.success) {
                setLiked(res.data.data.liked);
                setLikeCount(res.data.data.likeCount);
            }
        } catch (err) {
            console.error('Failed to toggle like:', err);
        }
    };

    const handleToggleFavorite = async () => {
        try {
            const res = await axios.post('/interactions/favorite', { entityType: 'book', entityId: book.id });
            if (res.data?.success) {
                setFavorited(res.data.data.favorited);
                setFavoriteCount(res.data.data.favoriteCount);
            }
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
        }
    };

    // 提交整书留言墙
    const handleSubmitGuestbook = async () => {
        if (!guestbookText.trim()) return;
        if (!currentUser) {
            alert('请先登录再发表留言');
            return;
        }
        try {
            await socialService.addComment({
                bookId: book.id,
                pageId: null,
                content: guestbookText
            });
            setGuestbookText('');
            fetchComments();
        } catch (err) {
            console.error('Submit guestbook failed:', err);
            alert('发表留言失败');
        }
    };

    // 删除评论
    const handleDeleteComment = async (commentId: string) => {
        if (!window.confirm('确定要删除这条留言吗？')) return;
        try {
            await socialService.deleteComment(commentId);
            fetchComments();
        } catch (err: any) {
            alert(err.response?.data?.error || '删除失败');
        }
    };

    // 过滤出全书留言
    const guestbookComments = useMemo(() => comments.filter(c => c.pageId === null), [comments]);

    // 检测是否为录屏模式
    const isRecordMode = useMemo(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('mode') === 'record';
    }, []);

    // 将所有章节的页面平铺为连续数组，并注入虚拟页以符合真实书籍排版
    const flattenedPages = useMemo<FlattenedPage[]>(() => {
        const pages: FlattenedPage[] = [];

        // 1. 封面页 (Right) - 第 0 页
        pages.push({
            page: { id: 'virtual-cover', content: '', photos: [], layout: 'book-cover' },
            chapterTitle: book.title, chapterDate: '', chapterIndex: -1
        });

        // 2. 封二 (Left) - 空白页
        pages.push({
            page: { id: 'virtual-inside-front-cover', content: '', photos: [], layout: 'empty' },
            chapterTitle: '', chapterDate: '', chapterIndex: -1
        });

        if (book.showPreface !== false) {
            pages.push({
                page: { id: 'virtual-preface', content: book.preface || '', photos: [], layout: 'preface' },
                chapterTitle: '引言', chapterDate: '', chapterIndex: -1
            });
        }

        // 3. 章节主体
        book.chapters.forEach((chapter, chapterIndex) => {
            chapter.pages.forEach((page) => {
                pages.push({
                    page,
                    chapterTitle: chapter.title,
                    chapterDate: chapter.date,
                    chapterIndex,
                });
            });
        });

        // 4. 计算补白
        pages.push({
            page: { id: 'virtual-inside-back-cover', content: '', photos: [], layout: 'empty' },
            chapterTitle: '', chapterDate: '', chapterIndex: -1
        });

        if (pages.length % 2 === 0) {
            pages.push({
                page: { id: `virtual-filler-${pages.length}`, content: '', photos: [], layout: 'empty' },
                chapterTitle: '', chapterDate: '', chapterIndex: -1
            });
        }

        // 5. 放置封底
        pages.push({
            page: { id: 'virtual-back-cover', content: '', photos: [], layout: 'back-cover' },
            chapterTitle: '封底', chapterDate: '', chapterIndex: -1
        });

        return pages;
    }, [book]);

    const firstContentIndex = flattenedPages.findIndex(p =>
        !['book-cover', 'empty', 'preface', 'back-cover'].includes(p.page.layout));

    const startOffset = firstContentIndex === -1 ? 99999 : firstContentIndex;

    const totalRealPages = flattenedPages.filter(p =>
        !['book-cover', 'empty', 'preface', 'back-cover'].includes(p.page.layout)).length;

    const dimensions = PAGE_SIZES[book.pageSize] || PAGE_SIZES.A4;

    // 录制模式下挂载全局翻页控制方法
    useEffect(() => {
        if (isRecordMode) {
            (window as any).flipBookNext = () => {
                flipBookRef.current?.pageFlip()?.flipNext();
            };
            (window as any).flipBookPrev = () => {
                flipBookRef.current?.pageFlip()?.flipPrev();
            };
            (window as any).flipBookTurnTo = (page: number) => {
                flipBookRef.current?.pageFlip()?.turnToPage(page);
            };
            (window as any).flipBookPageCount = flattenedPages.length;
            // 标识翻页书组件已挂载且就绪
            (window as any).isFlipBookReady = true;
        }
        return () => {
            if (isRecordMode) {
                delete (window as any).flipBookNext;
                delete (window as any).flipBookPrev;
                delete (window as any).flipBookTurnTo;
                delete (window as any).flipBookPageCount;
                delete (window as any).isFlipBookReady;
            }
        };
    }, [isRecordMode, flattenedPages.length]);

    // 同步当前页码到 window 对象供云函数状态检测
    useEffect(() => {
        if (isRecordMode) {
            (window as any).flipBookCurrentPage = currentPage;
        }
        return () => {
            delete (window as any).flipBookCurrentPage;
        };
    }, [currentPage, isRecordMode]);

    // 自适应缩放计算
    useEffect(() => {
        const calculateScale = () => {
            if (!containerRef.current) return;

            const containerWidth = containerRef.current.clientWidth;
            const containerHeight = containerRef.current.clientHeight;

            const mmToPx = 96 / 25.4;
            const bookWidth = dimensions.width * 2 * mmToPx; 
            const bookHeight = dimensions.height * mmToPx;

            // 留出边距 (录制模式下不留边距，使画面填满，防止外部杂边干扰)
            const paddingX = isRecordMode ? 0 : 100;
            const paddingY = isRecordMode ? 0 : 100;

            const scaleX = (containerWidth - paddingX) / bookWidth;
            const scaleY = (containerHeight - paddingY) / bookHeight;

            setScale(Math.min(scaleX, scaleY, 1)); 
        };

        calculateScale();
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, [dimensions, isRecordMode]);

    // 翻页控制
    const handlePrevPage = useCallback(() => {
        flipBookRef.current?.pageFlip()?.flipPrev();
    }, []);

    const handleNextPage = useCallback(() => {
        flipBookRef.current?.pageFlip()?.flipNext();
    }, []);

    const handlePageFlip = useCallback((e: any) => {
        setCurrentPage(e.data);
    }, []);

    // 键盘控制 (仅在非录制模式下开启)
    useEffect(() => {
        if (isRecordMode) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                setActiveKeys(prev => ({ ...prev, left: true }));
                handlePrevPage();
            } else if (e.key === 'ArrowRight') {
                setActiveKeys(prev => ({ ...prev, right: true }));
                handleNextPage();
            } else if (e.key === 'Escape') {
                setActiveKeys(prev => ({ ...prev, esc: true }));
                if (onClose) onClose();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                setActiveKeys(prev => ({ ...prev, left: false }));
            } else if (e.key === 'ArrowRight') {
                setActiveKeys(prev => ({ ...prev, right: false }));
            } else if (e.key === 'Escape') {
                setActiveKeys(prev => ({ ...prev, esc: false }));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handlePrevPage, handleNextPage, onClose, isRecordMode]);

    const mmToPx = 96 / 25.4;
    const pageWidthPx = dimensions.width * mmToPx * scale;
    const pageHeightPx = dimensions.height * mmToPx * scale;

    // 计算单页视图（封面/封底）居中所需的 CSS 平移量
    const translationX = useMemo(() => {
        if (currentPage === 0) {
            // 第一页封面在右侧，向左移动半页宽度居中
            return -(dimensions.width * mmToPx) / 2;
        }
        if (currentPage === flattenedPages.length - 1) {
            // 最后一页封底在左侧，向右移动半页宽度居中
            return (dimensions.width * mmToPx) / 2;
        }
        return 0;
    }, [currentPage, flattenedPages.length, dimensions.width, mmToPx]);

    // 点击外部关闭留言板
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isGuestbookOpen && guestbookRef.current && !guestbookRef.current.contains(event.target as Node)) {
                const target = event.target as HTMLElement;
                if (target.closest('.guestbook-btn-trigger')) return;
                setIsGuestbookOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isGuestbookOpen]);

    return (
        <ThemeProvider theme={book.theme || 'classic'}>
            <div
                ref={containerRef}
                className="fixed inset-0 z-50 bg-gradient-to-br from-[#FAF9F6] via-[#F3F2EE] to-[#E5E4DF] flex flex-col overflow-hidden select-none"
            >
                {/* 沉浸式高斯模糊背景层 */}
                {book.coverUrl && (
                    <div 
                        className="absolute inset-0 z-0 opacity-[0.25] filter blur-3xl scale-125 pointer-events-none select-none transition-all duration-1000"
                        style={{
                            backgroundImage: `url(${book.coverUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    />
                )}

                {/* 暖色环境柔和渐变与暗角遮罩滤镜 */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(213,209,199,0.3)_100%)] z-0 pointer-events-none" />

                {/* 顶部工具栏 (录屏模式下隐藏) */}
                {!isRecordMode && (
                    <div className={`flex items-center justify-between px-8 py-3.5 bg-white/70 backdrop-blur-md border-b border-slate-100 z-[60] absolute top-0 inset-x-0 shadow-sm shadow-slate-100/30 transition-all duration-500 ease-in-out transform ${
                        controlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
                    }`}>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-indigo-50 text-indigo-650 rounded-xl flex items-center justify-center shadow-inner border border-indigo-100/20 hover:scale-105 transition-transform duration-200">
                                    <BookOpen className="text-indigo-600 stroke-[2.5]" size={16} />
                                </div>
                                <div className="flex flex-col">
                                    <h1 className="text-slate-900 font-extrabold text-sm tracking-wide leading-tight hover:text-indigo-600 transition-colors">
                                        {book.title}
                                    </h1>
                                    <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest mt-0.5">
                                        {book.author} <span className="text-slate-350 mx-1.5 font-normal">•</span> 时光书
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* 留言控制按钮 */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsGuestbookOpen(!isGuestbookOpen)}
                                    className="guestbook-btn-trigger flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white/80 hover:bg-slate-50 text-slate-650 text-[11px] font-black transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                                    title="查看及发表整书留言板"
                                >
                                    <MessageSquare size={13} className="stroke-[2.5]" />
                                    <span>留言墙 ({guestbookComments.length})</span>
                                </button>
                            </div>

                            <div className="w-px h-4 bg-slate-200/60 mx-1" />

                            {/* 交互统计展示区与操作按钮 */}
                            <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-500 select-none">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50/85 text-slate-500 rounded-full border border-slate-100/80 shadow-sm" title="阅读量">
                                    <Eye size={13} className="text-slate-400 stroke-[2.5]" />
                                    <span>{viewCount}</span>
                                </div>
                                <button 
                                    onClick={handleToggleLike}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
                                        liked 
                                            ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200' 
                                            : 'bg-white/80 border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50/50 hover:border-rose-200'
                                    }`}
                                    title={liked ? "取消赞" : "点赞"}
                                >
                                    <Heart size={13} className={`stroke-[2.5] ${liked ? "fill-white text-white" : "text-slate-400"}`} />
                                    <span>{likeCount}</span>
                                </button>
                                <button 
                                    onClick={handleToggleFavorite}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
                                        favorited 
                                            ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200' 
                                            : 'bg-white/80 border-slate-200 text-slate-500 hover:text-amber-600 hover:bg-amber-50/50 hover:border-amber-200'
                                    }`}
                                    title={favorited ? "取消收藏" : "收藏"}
                                >
                                    <Star size={13} className={`stroke-[2.5] ${favorited ? "fill-white text-white" : "text-slate-400"}`} />
                                    <span>{favoriteCount}</span>
                                </button>
                            </div>

                            {isPublicView && !isOwner && (
                                <div className="flex items-center gap-2">
                                    {onCloneLayout && (
                                        <button
                                            onClick={onCloneLayout}
                                            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-650 hover:to-orange-655 text-white rounded-full text-[11px] font-black shadow-lg shadow-orange-500/15 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 border border-orange-400/20 cursor-pointer"
                                        >
                                            <Rocket size={13} className="stroke-[2.5]" />
                                            <span>套用同款排版</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={onCTA}
                                        className="px-5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-full text-[11px] font-black shadow-sm border border-slate-200/80 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <span>独立制作</span>
                                    </button>
                                </div>
                            )}

                            <div className="w-px h-4 bg-slate-200/60 mx-1" />

                            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50/85 rounded-full border border-slate-100/80 shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none font-mono">
                                    {currentPage + 1} / {flattenedPages.length}
                                </span>
                            </div>

                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-white/85 hover:bg-slate-900 hover:text-white text-slate-400 transition-all border border-slate-200/60 shadow-sm flex items-center justify-center group cursor-pointer"
                                    title={isPublicView ? "返回" : "退出阅读"}
                                >
                                    <X size={15} className="group-hover:rotate-90 transition-transform duration-300 stroke-[2.5]" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* 翻页区域 */}
                <div className="flex-1 flex items-center justify-center relative overflow-hidden z-10">
                    {/* 左翻页按钮 (录屏模式下隐藏) */}
                    {!isRecordMode && (
                        <button
                            onClick={handlePrevPage}
                            disabled={currentPage === 0}
                            className={`absolute left-6 z-20 p-3 rounded-full bg-white/65 hover:bg-white/85 active:scale-95 disabled:opacity-20 disabled:pointer-events-none transition-all duration-500 ease-in-out border border-gray-200/50 hover:border-gray-200 backdrop-blur-md shadow-xl shadow-gray-200/40 group cursor-pointer transform ${
                                controlsVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'
                            }`}
                        >
                            <ChevronLeft className="w-8 h-8 text-gray-700 group-hover:scale-105 transition-transform" />
                        </button>
                    )}

                    {/* 翻页书籍包装容器 - 实现 scale 缩放及单页居中 translateX 平移 */}
                    <div 
                        style={{ 
                            transform: `scale(${scale}) translateX(${translationX}px)`, 
                            transformOrigin: 'center center',
                            transition: 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)'
                        }}
                        className="relative z-10"
                    >
                        {/* 裁切容器 - 封面/封底闭合时用 clip-path 裁切幽灵页 */}
                        <div style={{
                            clipPath: currentPage === 0
                                ? 'inset(-100px -100px -100px 50%)'
                                : currentPage === flattenedPages.length - 1
                                    ? 'inset(-100px 50% -100px -100px)'
                                    : 'none',
                        }}>
                            <HTMLFlipBook
                                ref={flipBookRef}
                                width={pageWidthPx / scale}
                                height={pageHeightPx / scale}
                                size="fixed"
                                minWidth={300}
                                maxWidth={1000}
                                minHeight={400}
                                maxHeight={1500}
                                showCover={true}
                                mobileScrollSupport={true}
                                onFlip={handlePageFlip}
                                className="flipbook-shadow"
                                startPage={0}
                                drawShadow={true}
                                flippingTime={600}
                                usePortrait={false}
                                startZIndex={0}
                                autoSize={false}
                                maxShadowOpacity={0.3}
                                showPageCorners={!isRecordMode}
                                disableFlipByClick={isRecordMode}
                                style={{}}
                                clickEventForward={!isRecordMode}
                                useMouseEvents={!isRecordMode}
                                swipeDistance={isRecordMode ? 0 : 30}
                            >
                                {flattenedPages.map((pageData, index) => {
                                    const pageId = pageData.page.id;
                                    
                                    return (
                                        <PageComponent
                                            key={pageId}
                                            pageData={pageData}
                                            pageSize={book.pageSize}
                                            pageNumber={index - startOffset + 1}
                                            totalPages={totalRealPages}
                                            book={book}
                                            side={index % 2 === 0 ? 'right' : 'left'}
                                            isVirtualActive={Math.abs(index - currentPage) <= 2}
                                        />
                                    );
                                })}
                            </HTMLFlipBook>
                        </div>
                    </div>

                    {/* 右翻页按钮 (录屏模式下隐藏) */}
                    {!isRecordMode && (
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage >= flattenedPages.length - 1}
                            className={`absolute right-6 z-20 p-3 rounded-full bg-white/65 hover:bg-white/85 active:scale-95 disabled:opacity-20 disabled:pointer-events-none transition-all duration-500 ease-in-out border border-gray-200/50 hover:border-gray-200 backdrop-blur-md shadow-xl shadow-gray-200/40 group cursor-pointer transform ${
                                controlsVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'
                            }`}
                        >
                            <ChevronRight className="w-8 h-8 text-gray-700 group-hover:scale-105 transition-transform" />
                        </button>
                    )}
                </div>

                {/* 侧边滑动全书留言板 (毛玻璃磨砂质感) */}
                <div
                    className={`fixed inset-0 z-50 transition-opacity duration-300 ${isGuestbookOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                >
                    <div
                        className="absolute inset-0 bg-slate-900/10 backdrop-blur-xs transition-opacity duration-300"
                        onClick={() => setIsGuestbookOpen(false)}
                    />

                    <div
                        ref={guestbookRef}
                        className={`absolute right-0 top-0 bottom-0 w-full sm:w-96 max-w-md bg-white/80 backdrop-blur-[30px] border-l border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col transition-transform duration-350 ease-out transform ${
                            isGuestbookOpen ? 'translate-x-0' : 'translate-x-full'
                        }`}
                    >
                        {/* 留言板头部 */}
                        <div className="p-5 border-b border-slate-100/50 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">时光集留言墙</h3>
                                <p className="text-[10px] text-slate-400 font-bold tracking-wider mt-0.5">留存你与创作者的瞬间共鸣</p>
                            </div>
                            <button
                                onClick={() => setIsGuestbookOpen(false)}
                                className="p-1.5 hover:bg-slate-100 text-slate-450 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* 留言滚动列表 */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                            {guestbookComments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-350">
                                        <MessageSquare size={24} />
                                    </div>
                                    <span className="text-xs font-semibold">本时光集暂无留言，快来抢沙发吧~</span>
                                </div>
                            ) : (
                                guestbookComments.map((c) => (
                                    <div key={c.id} className="bg-white/60 hover:bg-white border border-slate-100/60 p-3.5 rounded-2xl shadow-xs transition-all flex gap-3 group/item">
                                        <img
                                            src={c.avatarUrl || '/default-avatar.png'}
                                            alt={c.nickname}
                                            className="w-8 h-8 rounded-full object-cover border border-slate-100"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.nickname}`;
                                            }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="font-bold text-[11px] text-slate-800 truncate">{c.nickname}</span>
                                                <span className="text-[9px] text-slate-400 font-bold ml-auto">{new Date(c.createdAt).toLocaleDateString()}</span>
                                                {(currentUser?.id === c.userId || currentUser?.id === book.userId) && (
                                                    <button
                                                        onClick={() => handleDeleteComment(c.id)}
                                                        className="text-red-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer ml-1"
                                                    >
                                                        <Trash2 size={11} />
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-xs leading-relaxed text-slate-650 font-medium whitespace-pre-wrap break-all">{c.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* 留言发布底栏 */}
                        <div className="p-4 border-t border-slate-100/50 bg-slate-50/50">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={guestbookText}
                                    onChange={(e) => setGuestbookText(e.target.value)}
                                    placeholder={currentUser ? "在这里说点什么吧..." : "请登录后发表留言"}
                                    disabled={!currentUser}
                                    maxLength={150}
                                    className="flex-1 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200/55 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSubmitGuestbook();
                                    }}
                                />
                                <button
                                    onClick={handleSubmitGuestbook}
                                    disabled={!guestbookText.trim() || !currentUser}
                                    className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {!isRecordMode && (
                    <div 
                        className="absolute bottom-6 left-1/2 z-20 px-6 py-2.5 bg-white/75 backdrop-blur-md border border-gray-200/50 rounded-full shadow-xl shadow-gray-200/30 flex items-center gap-4 text-[10px] font-black uppercase tracking-wider text-gray-500 pointer-events-auto transition-all duration-500 ease-in-out"
                        style={{
                            transform: `translateX(-50%) translateY(${controlsVisible ? '0' : '24px'}) scale(${controlsVisible ? '1' : '0.95'})`,
                            opacity: controlsVisible ? 1 : 0,
                            pointerEvents: controlsVisible ? 'auto' : 'none'
                        }}
                    >
                        <span className="flex items-center gap-1.5">
                            <kbd className={`px-1.5 py-0.5 border text-[9px] font-mono rounded-md transition-all duration-150 ${
                                activeKeys.left 
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-600 scale-95 shadow-sm shadow-indigo-100/50' 
                                    : 'bg-gray-100 border-gray-200 text-gray-600'
                            }`}>←</kbd>
                            <kbd className={`px-1.5 py-0.5 border text-[9px] font-mono rounded-md transition-all duration-150 ${
                                activeKeys.right 
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-600 scale-95 shadow-sm shadow-indigo-100/50' 
                                    : 'bg-gray-100 border-gray-200 text-gray-600'
                            }`}>→</kbd> 
                            键盘翻页
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                        <span>点击书缘翻页</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                        <span>
                            <kbd className={`px-1.5 py-0.5 border text-[9px] font-mono rounded-md transition-all duration-150 ${
                                activeKeys.esc 
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-600 scale-95 shadow-sm shadow-indigo-100/50' 
                                    : 'bg-gray-100 border-gray-200 text-gray-600'
                            }`}>ESC</kbd> 
                            退出
                        </span>
                    </div>
                )}
            </div>
        </ThemeProvider>
    );
};
// #endregion
