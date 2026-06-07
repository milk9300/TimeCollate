import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../common/components/MainLayout';
import { BookCard } from '../components/BookCard';
import { BookshelfGrid } from '../components/BookshelfGrid';
import { BookEditModal } from '../components/BookEditModal';
import { GeneratedCover } from '../../editor/components/GeneratedCover';
import { getBookService } from '../../../services/serviceFactory';
import { useAuthStore } from '../../../store/useAuthStore';
import type { Book } from '../../../types';
import { 
    Search, 
    Loader2, 
    BookOpen, 
    ArrowRight, 
    Sparkles, 
    TrendingUp, 
    Heart, 
    Eye, 
    User, 
    RefreshCw 
} from 'lucide-react';

const bookService = getBookService();

const inspirations = [
    { text: "今天天气晴，适合去记录 #毕业青春 里的散场拥抱", category: "graduation", defaultTitle: "#毕业青春# 散场拥抱", theme: "magazine" },
    { text: "微风徐徐，正好去记录 #旅行足迹 里的向海风奔跑", category: "travel", defaultTitle: "#旅行足迹# 向海风奔跑", theme: "classic" },
    { text: "雨天午后，去记录 #萌宠日常 里的暖心依偎", category: "pet", defaultTitle: "#萌宠日常# 暖心依偎", theme: "warm" },
    { text: "星光闪烁，去记录 #恋爱纪念 里的第一次牵手", category: "love", defaultTitle: "#恋爱纪念# 第一次牵手", theme: "classic" },
    { text: "阳光明媚，去记录 #宝贝成长 里的第一声爸爸", category: "baby", defaultTitle: "#宝贝成长# 快乐成长", theme: "warm" }
];

export const Square: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 12;

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // 排行榜状态
    const [rankings, setRankings] = useState<{ hotBooks: any[]; activeCreators: any[] }>({ hotBooks: [], activeCreators: [] });
    const [rankingsLoading, setRankingsLoading] = useState(true);
    const [rankTab, setRankTab] = useState<'books' | 'creators'>('books');

    // 灵感状态
    const [inspirationIndex, setInspirationIndex] = useState(0);
    const [creatingBook, setCreatingBook] = useState(false);
    const [showInspirationModal, setShowInspirationModal] = useState(false);

    const categories = [
        { id: 'all', label: '✨ 全部' },
        { id: 'travel', label: '✈️ 旅行足迹' },
        { id: 'baby', label: '👶 宝贝成长' },
        { id: 'love', label: '👩‍❤️‍👨 恋爱纪念' },
        { id: 'graduation', label: '🎓 毕业青春' },
        { id: 'pet', label: '🐾 萌宠日常' }
    ];

    useEffect(() => {
        fetchPublicBooks(1);
        fetchRankings();
        // 根据星期几随机种子初始化今日灵感
        const day = new Date().getDay();
        setInspirationIndex(day % inspirations.length);
    }, []);

    const fetchPublicBooks = async (pageNum: number, categoryId?: string) => {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const cat = categoryId !== undefined ? categoryId : selectedCategory;
            const response = await bookService.getPublicBooks(pageNum, PAGE_SIZE, cat);
            if (pageNum === 1) {
                setBooks(response.items);
            } else {
                setBooks(prev => [...prev, ...response.items]);
            }
            setHasMore(response.page < response.totalPages);
            setPage(pageNum);
        } catch (error) {
            console.error('Failed to fetch public books:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const fetchRankings = async () => {
        setRankingsLoading(true);
        try {
            const response = await bookService.getRankings();
            setRankings(response);
        } catch (error) {
            console.error('Failed to fetch rankings:', error);
        } finally {
            setRankingsLoading(false);
        }
    };

    const handleCategoryChange = (catId: string) => {
        setSelectedCategory(catId);
        setPage(1);
        fetchPublicBooks(1, catId);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            fetchPublicBooks(page + 1);
        }
    };

    // 点击打开灵感建书的确认与定制弹窗
    const handleInspirationClick = () => {
        if (creatingBook) return;
        setShowInspirationModal(true);
    };

    // 执行实际建书并重定向
    const handleFinishInspirationCreate = async (bookData: Partial<Book>) => {
        setCreatingBook(true);
        const currentInspiration = inspirations[inspirationIndex];

        try {
            const newBook: Book = {
                id: crypto.randomUUID(),
                userId: user?.id || '',
                title: bookData.title || currentInspiration.defaultTitle,
                author: bookData.author || user?.nickname || '时光记录者',
                coverUrl: bookData.coverUrl || '',
                coverOssKey: bookData.coverOssKey || undefined,
                isPublic: bookData.isPublic || false,
                category: bookData.category || currentInspiration.category,
                createdAt: Date.now(),
                chapters: [],
                theme: currentInspiration.theme as any,
                pageSize: 'A4'
            };
            await bookService.saveBook(newBook);
            navigate(`/editor/${newBook.id}`);
        } catch (error) {
            console.error('Failed to create book from inspiration:', error);
            alert('创建时光集失败，请重试');
        } finally {
            setCreatingBook(false);
            setShowInspirationModal(false);
        }
    };

    const rotateInspiration = (e: React.MouseEvent) => {
        e.stopPropagation(); // 阻止触发卡片点击事件
        setInspirationIndex(prev => (prev + 1) % inspirations.length);
    };

    const filteredBooks = books.filter(book => {
        const matchesSearch = 
            book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            book.author.toLowerCase().includes(searchQuery.toLowerCase());
            
        if (!matchesSearch) return false;
        if (selectedCategory === 'all') return true;

        if (book.category) {
            return book.category === selectedCategory;
        }

        const title = book.title.toLowerCase();
        const theme = book.theme ? book.theme.toLowerCase() : '';
        
        if (selectedCategory === 'travel') {
            return theme.includes('travel') || title.includes('旅') || title.includes('海') || title.includes('山') || title.includes('行');
        }
        if (selectedCategory === 'baby') {
            return theme.includes('baby') || theme.includes('growth') || title.includes('宝') || title.includes('成长') || title.includes('岁') || title.includes('记');
        }
        if (selectedCategory === 'love') {
            return theme.includes('love') || theme.includes('wedding') || title.includes('爱') || title.includes('情') || title.includes('婚') || title.includes('甜');
        }
        if (selectedCategory === 'graduation') {
            return theme.includes('graduation') || theme.includes('school') || title.includes('毕') || title.includes('学') || title.includes('校') || title.includes('青');
        }
        if (selectedCategory === 'pet') {
            return theme.includes('pets') || theme.includes('animal') || title.includes('猫') || title.includes('狗') || title.includes('宠');
        }
        
        return true;
    });

    return (
        <MainLayout title="广场大厅">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Outfit',_sans-serif]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
                    {/* 左侧 2/3 区域 - 公共书架 (内容主舞台) */}
                    <div className="lg:col-span-2 flex flex-col">
                        
                        {/* 顶部承接 - 搜索与胶囊过滤条 */}
                        <div className="bg-slate-50/50 rounded-3xl p-5 mb-8 border border-slate-100/80">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <div className="relative group flex-1">
                                    <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        placeholder="搜索时光集名称或作者..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-2xl py-3 pl-12 pr-4 text-sm font-semibold placeholder:text-gray-400 transition-all outline-none shadow-sm"
                                    />
                                </div>
                                <div className="text-[11px] font-black text-gray-400 uppercase tracking-wider shrink-0 select-none px-2">
                                    共有 {filteredBooks.length} 本公开作品
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar select-none">
                                {categories.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => handleCategoryChange(c.id)}
                                        className={`px-4.5 py-2 rounded-full text-xs font-black transition-all border cursor-pointer shrink-0 ${
                                            selectedCategory === c.id
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100/50 scale-[1.02]'
                                                : 'bg-white text-gray-500 border-slate-200 hover:border-slate-300 hover:text-gray-900 hover:scale-[1.01]'
                                        }`}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 书架网格 */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                                <Loader2 className="animate-spin mb-4 text-indigo-500" size={40} />
                                <p className="font-bold text-sm">正在加载广场时光...</p>
                            </div>
                        ) : filteredBooks.length > 0 ? (
                            <>
                                <BookshelfGrid 
                                    theme="oak" 
                                    gap={22} 
                                    rowGap={60}
                                    colsClass="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                                >
                                    {filteredBooks.map(book => (
                                        <BookCard
                                            key={book.id}
                                            book={book}
                                            onClick={() => navigate(`/read/${book.id}`, { state: { from: '/square' } })}
                                            showCommunityStats={true}
                                        />
                                    ))}
                                </BookshelfGrid>

                                {/* 加载更多 */}
                                {hasMore && !searchQuery && (
                                    <div className="flex justify-center mt-10">
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={loadingMore}
                                            className="flex items-center gap-2 px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-full font-bold hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 shadow-sm text-sm"
                                        >
                                            {loadingMore ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin text-indigo-500" />
                                                    加载更多精彩...
                                                </>
                                            ) : (
                                                '浏览更多作品'
                                            )}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                                    <BookOpen size={32} />
                                </div>
                                <h3 className="text-base font-black text-gray-900 mb-1">广场空空如也</h3>
                                <p className="text-gray-400 text-xs font-semibold max-w-xs">
                                    {searchQuery ? '没有找到匹配的作品，换个关键词搜搜看吧' : '目前还没有人分享作品到广场，去发布您的第一本时光集吧！'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 右侧 1/3 区域 - 信息与交互枢纽 (社区生态圈) */}
                    <div className="lg:col-span-1 flex flex-col gap-6 lg:sticky lg:top-8">
                        
                        {/* 卡片一：轻量化品牌名片 */}
                        <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl p-6.5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all">
                            <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-100/50 px-3 py-1 rounded-full w-fit mb-4 text-indigo-600 text-[10px] font-black tracking-wider">
                                <Sparkles size={11} className="animate-pulse" />
                                <span>公共时光库</span>
                            </div>
                            <h2 className="text-xl font-black text-slate-900 leading-snug mb-3">
                                在广场，遇见他人的时光
                            </h2>
                            <p className="text-gray-500 text-xs font-medium leading-relaxed mb-6">
                                这里汇聚了社区中每一位拾光者的公开作品。您可以自由翻阅这些珍藏的记忆，也可以套用精美的排版来记录您自己的故事。
                            </p>
                            <button
                                onClick={() => navigate('/')}
                                className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 group cursor-pointer"
                            >
                                <span>开启我的时光集</span>
                                <ArrowRight className="group-hover:translate-x-0.5 transition-transform" size={14} />
                            </button>
                        </div>

                        {/* 卡片二：极简排行榜 */}
                        <div className="bg-white border border-slate-100 rounded-3xl p-6.5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                            <div className="flex border-b border-slate-100 pb-2 mb-4 justify-between items-center select-none">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setRankTab('books')}
                                        className={`text-xs font-black pb-1.5 relative cursor-pointer transition-colors ${
                                            rankTab === 'books' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    >
                                        本周高光作品
                                        {rankTab === 'books' && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-in fade-in duration-300" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setRankTab('creators')}
                                        className={`text-xs font-black pb-1.5 relative cursor-pointer transition-colors ${
                                            rankTab === 'creators' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    >
                                        活跃拾光者
                                        {rankTab === 'creators' && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-in fade-in duration-300" />
                                        )}
                                    </button>
                                </div>
                                <span className="text-[10px] text-gray-400 font-bold tracking-widest flex items-center gap-1">
                                    <TrendingUp size={12} />
                                    <span>前五名</span>
                                </span>
                            </div>

                            {rankingsLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <Loader2 className="animate-spin mb-2 text-indigo-500" size={24} />
                                    <p className="text-[11px] font-bold">获取排行中...</p>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {rankTab === 'books' ? (
                                        rankings.hotBooks.map((item, index) => {
                                            const rankColor = index === 0 ? 'from-amber-500 to-amber-300' : index === 1 ? 'from-slate-400 to-slate-300' : index === 2 ? 'from-amber-700 to-amber-600' : 'from-slate-400 to-slate-400';
                                            return (
                                                <div 
                                                    key={item.id}
                                                    onClick={() => !item.id.startsWith('mock-') && navigate(`/read/${item.id}`, { state: { from: '/square' } })}
                                                    className={`flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50 transition-colors ${item.id.startsWith('mock-') ? 'cursor-default' : 'cursor-pointer group'}`}
                                                >
                                                    <span className={`w-6 text-center font-black text-sm italic bg-gradient-to-r ${rankColor} bg-clip-text text-transparent`}>
                                                        {`0${index + 1}`}
                                                    </span>
                                                    
                                                    {/* 精致 3D 封面缩略图 */}
                                                    <div className="w-[32px] aspect-[3/4] rounded-sm bg-slate-50 shadow-md border border-slate-100 overflow-hidden relative flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                        <div className="w-[150px] h-[200px] absolute top-0 left-0" style={{ transform: 'scale(0.2133)', transformOrigin: 'top left' }}>
                                                            <GeneratedCover
                                                                title={item.title}
                                                                author={item.author || ''}
                                                                coverUrl={item.coverUrl}
                                                                mode="card"
                                                            />
                                                        </div>
                                                        {/* 书脊阴影 */}
                                                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-black/10 z-10" />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                                            {item.title}
                                                        </h4>
                                                        <p className="text-[10px] text-gray-400 font-semibold truncate mt-0.5">
                                                            {item.author}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 pr-1">
                                                        <span className="flex items-center gap-0.5">
                                                            <Eye size={11} />
                                                            {item.views}
                                                        </span>
                                                        <span className="flex items-center gap-0.5">
                                                            <Heart size={11} className="text-rose-400/90" />
                                                            {item.likes}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        rankings.activeCreators.map((item, index) => {
                                            const rankColor = index === 0 ? 'from-amber-500 to-amber-300' : index === 1 ? 'from-slate-400 to-slate-300' : index === 2 ? 'from-amber-700 to-amber-600' : 'from-slate-400 to-slate-400';
                                            return (
                                                <div 
                                                    key={item.id}
                                                    onClick={() => !item.id.startsWith('mock-') && navigate(`/profile/${item.id}`)}
                                                    className={`flex items-center gap-3 p-2 rounded-2xl transition-colors ${
                                                        item.id.startsWith('mock-') 
                                                            ? 'cursor-default select-none' 
                                                            : 'cursor-pointer hover:bg-indigo-50/40 group'
                                                    }`}
                                                >
                                                    <span className={`w-6 text-center font-black text-sm italic bg-gradient-to-r ${rankColor} bg-clip-text text-transparent`}>
                                                        {`0${index + 1}`}
                                                    </span>

                                                    {/* 圆形头像 */}
                                                    <div className="w-8 h-8 rounded-full border border-slate-100 flex-shrink-0 overflow-hidden relative bg-slate-50 flex items-center justify-center">
                                                        {item.avatarUrl ? (
                                                            <img src={item.avatarUrl} className="w-full h-full object-cover" alt="" />
                                                        ) : (
                                                            <User size={14} className="text-slate-300" />
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-650 transition-colors">
                                                            {item.nickname}
                                                        </h4>
                                                        <p className="text-[10px] text-gray-400 font-semibold truncate mt-0.5">
                                                            共公开了 {item.bookCount} 本时光集
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full shrink-0">
                                                        <Heart size={10} className="text-rose-400/80" />
                                                        <span>{item.totalLikes} 获赞</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 卡片三：其他拓展内容（今日拾光灵感） */}
                        <div 
                            onClick={handleInspirationClick}
                            className="relative overflow-hidden bg-gradient-to-br from-indigo-50/60 to-purple-50/40 border border-indigo-100/50 rounded-3xl p-6.5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] cursor-pointer group hover:shadow-md hover:border-indigo-200/80 active:scale-[0.99] transition-all"
                        >
                            {/* 光晕装饰 */}
                            <div className="absolute -right-8 -top-8 w-24 h-24 bg-indigo-300/10 rounded-full blur-2xl group-hover:bg-indigo-300/15 transition-all" />
                            
                            <div className="flex justify-between items-center mb-3 relative z-10 select-none">
                                <div className="flex items-center gap-1.5 text-indigo-600 font-black text-xs tracking-wider">
                                    <Sparkles size={13} className="text-indigo-500" />
                                    <span>今日拾光灵感</span>
                                </div>
                                <button 
                                    onClick={rotateInspiration}
                                    className="p-1 rounded-lg hover:bg-indigo-100/50 text-indigo-500 hover:text-indigo-700 transition-colors cursor-pointer"
                                    title="换一换"
                                >
                                    <RefreshCw size={13} className="group-hover:rotate-180 transition-transform duration-500" />
                                </button>
                            </div>

                            <div className="min-h-[48px] flex items-center relative z-10">
                                {creatingBook ? (
                                    <div className="flex items-center gap-2 text-indigo-600/70 text-xs font-bold py-1">
                                        <Loader2 size={13} className="animate-spin" />
                                        <span>正在精心为您生成时光集...</span>
                                    </div>
                                ) : (
                                    <p className="text-slate-800 text-xs.5 font-bold leading-relaxed group-hover:text-indigo-900 transition-colors">
                                        “{inspirations[inspirationIndex].text}”
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-1 mt-4 text-[10px] font-black text-indigo-600/80 relative z-10 select-none group-hover:translate-x-0.5 transition-transform">
                                <span>点击以此灵感一键建书</span>
                                <ArrowRight size={11} />
                            </div>
                        </div>

                    </div>
                    
                </div>
            </div>

            {/* 灵感建书定制弹窗 */}
            <BookEditModal
                isOpen={showInspirationModal}
                title="使用拾光灵感创建时光集"
                initialData={{
                    title: inspirations[inspirationIndex]?.defaultTitle || '',
                    author: user?.nickname || '时光记录者',
                    category: inspirations[inspirationIndex]?.category || '',
                    isPublic: false
                }}
                onClose={() => setShowInspirationModal(false)}
                onSave={handleFinishInspirationCreate}
            />
        </MainLayout>
    );
};
