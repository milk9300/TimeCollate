import React, { useEffect, useState } from 'react';
import { 
    MessageSquare, 
    Plus, 
    Loader2, 
    Calendar, 
    ArrowRight, 
    ChevronRight,
    Search,
    Sparkles,
    CheckCircle2,
    Flame,
    Info
} from 'lucide-react';
import { MainLayout } from '../../common/components/MainLayout';
import { feedbackService } from '../../../services/FeedbackService';
import type { Feedback as FeedbackType } from '../../../types';
import { FeedbackModal } from '../components/FeedbackModal.tsx';
import { FeedbackDetailView } from '../components/FeedbackDetailView';

export const Feedback: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<FeedbackType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);

    const fetchFeedbacks = async () => {
        setLoading(true);
        try {
            const data = await feedbackService.getFeedbacks();
            setFeedbacks(data);
        } catch (error) {
            console.error('Failed to fetch feedbacks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const filteredFeedbacks = feedbacks.filter(f => {
        const matchesSearch = f.content.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (selectedTag) {
            const keyword = selectedTag.replace('#', '');
            if (keyword === '想要更多3D特效') {
                return f.content.includes('3D') || f.content.includes('特效');
            }
            if (keyword === '木纹书架表白') {
                return f.content.includes('木纹') || f.content.includes('书架');
            }
            if (keyword === '安卓端催更') {
                return f.content.includes('安卓') || f.content.includes('Android') || f.content.includes('手机');
            }
            if (keyword === '时光集备份') {
                return f.content.includes('备份') || f.content.includes('同步');
            }
            if (keyword === '自定义字体') {
                return f.content.includes('字体') || f.content.includes('排版');
            }
            return f.content.toLowerCase().includes(keyword.toLowerCase());
        }
        return true;
    });

    const getRelativeTime = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);

        if (mins < 1) return '刚刚';
        if (mins < 60) return `${mins}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        return `${days}天前`;
    };

    return (
        <MainLayout title="反馈中心">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Outfit',_sans-serif]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
                    {/* 左侧 2/3 区域 - 反馈声音流 */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        
                        {/* 搜索与过滤栏 */}
                        <div className="bg-slate-50/50 rounded-3xl p-5 border border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="relative group flex-1">
                                <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                                <input
                                    type="text"
                                    placeholder="搜索匿名反馈内容..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-2xl py-3 pl-12 pr-4 text-xs.5 font-semibold placeholder:text-gray-400 transition-all outline-none shadow-sm"
                                />
                            </div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider shrink-0 select-none px-2">
                                共有 {filteredFeedbacks.length} 条声音
                            </div>
                        </div>

                        {/* 声音列表流 */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                                <Loader2 className="animate-spin text-indigo-600" size={36} />
                                <p className="text-gray-400 font-bold text-xs">正在倾听回音中...</p>
                            </div>
                        ) : filteredFeedbacks.length === 0 ? (
                            /* 空状态瘦身，嵌套在左侧主栏 */
                            <div className="bg-white rounded-[32px] p-12 text-center shadow-sm border border-gray-100/60 max-w-lg mx-auto w-full">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <MessageSquare className="text-gray-300" size={28} />
                                </div>
                                <h3 className="text-base font-bold text-gray-900 mb-1">暂无相关声音</h3>
                                <p className="text-gray-400 font-medium text-xs max-w-xs mx-auto">
                                    {searchQuery || selectedTag ? '没有找到匹配该筛选条件的反馈声音' : '广场目前静悄悄的，期待您的第一声反馈！'}
                                </p>
                            </div>
                        ) : (
                            /* 单列垂直声音流 */
                            <div className="flex flex-col gap-5 pb-12">
                                {filteredFeedbacks.map((item, index) => {
                                    const gradientIndex = (item.id || '').charCodeAt(0) % 5;
                                    const gradients = [
                                        'from-indigo-400 to-violet-500',
                                        'from-emerald-400 to-teal-500',
                                        'from-amber-400 to-orange-500',
                                        'from-rose-400 to-pink-500',
                                        'from-sky-400 to-blue-500'
                                    ];
                                    const gradient = gradients[gradientIndex];
                                    
                                    const displayId = `#FB-${(item.id || '').slice(0, 6).toUpperCase()}`;
                                    
                                    // 匿名笔名池
                                    const names = ['匿名时光笔', '漂流瓶的信', '星空记录者', '风的呢喃', '时光拾荒人'];
                                    const nameIndex = (item.id || '').charCodeAt(1) % names.length;
                                    const displayAuthor = names[nameIndex];

                                    // 标签分类
                                    let tagText = '创意提案';
                                    let tagClass = 'bg-indigo-50/70 text-indigo-600 border-indigo-100/20';
                                    if (item.content.includes('错') || item.content.includes('故障') || item.content.includes('图片') || item.content.includes('失败') || item.content.includes('慢')) {
                                        tagText = '缺陷反馈';
                                        tagClass = 'bg-rose-50/70 text-rose-500 border-rose-100/20';
                                    } else if (item.content.length > 60) {
                                        tagText = '体验优化';
                                        tagClass = 'bg-amber-50/70 text-amber-600 border-amber-100/20';
                                    } else if (item.content.includes('棒') || item.content.includes('好') || item.content.includes('赞') || item.content.includes('爱') || item.content.includes('喜欢')) {
                                        tagText = '点赞鼓励';
                                        tagClass = 'bg-emerald-50/70 text-emerald-600 border-emerald-100/20';
                                    }

                                    return (
                                        <div
                                            key={item.id}
                                            className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-slate-100/80 hover:shadow-[0_12px_40px_rgb(99,102,241,0.06)] hover:border-indigo-100/70 transition-all duration-300 group cursor-pointer"
                                            onClick={() => setSelectedFeedbackId(item.id)}
                                        >
                                            <div className="flex items-center justify-between mb-4.5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 bg-gradient-to-tr ${gradient} rounded-xl flex items-center justify-center text-white text-xs font-black shadow-sm`}>
                                                        {item.content.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black text-slate-800">{displayAuthor}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold">{displayId}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mt-0.5">
                                                            <Calendar size={10} />
                                                            <span>{getRelativeTime(item.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <span className={`text-[10px] font-black px-2.5 py-1 border rounded-full ${tagClass}`}>
                                                    {tagText}
                                                </span>
                                            </div>

                                            <p className="text-slate-600 font-semibold text-xs leading-relaxed mb-5 line-clamp-3">
                                                {item.content}
                                            </p>

                                            <div className="flex items-center justify-between pt-3.5 border-t border-slate-50">
                                                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                                    {item.hasImages ? '📎 附带截图' : '无附件'}
                                                </span>
                                                <span className="text-xs font-black text-indigo-500 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                                    倾听详情 <ArrowRight size={12} />
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 右侧 1/3 区域 - 档案馆回音壁 */}
                    <div className="lg:col-span-1 flex flex-col gap-6 lg:sticky lg:top-8">
                        
                        {/* 核心动作：大胶囊发布按钮 (方案 A) */}
                        <button
                            onClick={() => setShowModal(true)}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:shadow-indigo-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Plus size={16} className="stroke-[2.5]" />
                            <span>发布反馈声音</span>
                        </button>

                        {/* 卡片一：处理进度晴雨表 */}
                        <div className="bg-white border border-slate-100/80 rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
                            <div className="flex items-center gap-2 mb-5">
                                <div className="w-8 h-8 bg-indigo-50/70 border border-indigo-100/20 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                                    <CheckCircle2 size={16} />
                                </div>
                                <h3 className="text-xs.5 font-black text-slate-800">处理进度晴雨表</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-2.5">
                                <div className="bg-slate-50/60 border border-slate-100/50 rounded-2xl p-3 text-center">
                                    <span className="block text-xl.5 font-black text-emerald-500">42</span>
                                    <span className="block text-[9px] text-gray-400 font-bold mt-1">已采纳上线</span>
                                </div>
                                <div className="bg-slate-50/60 border border-slate-100/50 rounded-2xl p-3 text-center">
                                    <span className="block text-xl.5 font-black text-indigo-500">5</span>
                                    <span className="block text-[9px] text-gray-400 font-bold mt-1">拼命敲代码</span>
                                </div>
                                <div className="bg-slate-50/60 border border-slate-100/50 rounded-2xl p-3 text-center">
                                    <span className="block text-xl.5 font-black text-slate-800">{108 + feedbacks.length}</span>
                                    <span className="block text-[9px] text-gray-400 font-bold mt-1">收到公开建议</span>
                                </div>
                            </div>
                        </div>

                        {/* 卡片二：热议反馈标签 */}
                        <div className="bg-white border border-slate-100/80 rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
                            <div className="flex items-center justify-between mb-4.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-indigo-50/70 border border-indigo-100/20 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                                        <Flame size={16} />
                                    </div>
                                    <h3 className="text-xs.5 font-black text-slate-800">热议反馈标签</h3>
                                </div>
                                {selectedTag && (
                                    <button 
                                        onClick={() => setSelectedTag(null)}
                                        className="text-[10px] text-indigo-500 font-black hover:underline cursor-pointer"
                                    >
                                        清除
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {['#想要更多3D特效', '#木纹书架表白', '#安卓端催更', '#时光集备份', '#自定义字体'].map(tag => {
                                    const isSelected = selectedTag === tag;
                                    return (
                                        <button
                                            key={tag}
                                            onClick={() => setSelectedTag(isSelected ? null : tag)}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
                                                isSelected
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100/50 scale-[1.02]'
                                                    : 'bg-slate-50 text-slate-500 border-slate-100/50 hover:bg-slate-100 hover:text-slate-800 hover:scale-[1.01]'
                                            }`}
                                        >
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 卡片三：广场倾听规范 */}
                        <div className="bg-indigo-50/10 border border-indigo-100/20 rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.005)]">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-6 h-6 bg-white border border-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm">
                                    <Info size={12} />
                                </div>
                                <span className="text-xs font-black text-slate-700">广场倾听规范</span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-bold leading-relaxed">
                                这里是匿名倾听的空间，我们拥抱每一份真诚的吐槽与灵感。我们会定期阅读所有声音，并更新于处理进度中。请保持友善，共同建设更精致的时光集。
                            </p>
                        </div>

                    </div>

                </div>

                {/* Submission Modal */}
                <FeedbackModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        fetchFeedbacks();
                    }}
                />

                {/* Detail Modal */}
                {selectedFeedbackId && (
                    <FeedbackDetailView
                        feedbackId={selectedFeedbackId}
                        onClose={() => setSelectedFeedbackId(null)}
                    />
                )}

            </div>
        </MainLayout>
    );
};
