import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AdminLayout } from '../components/AdminLayout';
import { 
    Users, 
    MessageSquare, 
    TrendingUp, 
    Cpu, 
    Server, 
    Activity, 
    LayoutTemplate, 
    FileDown, 
    Layers 
} from 'lucide-react';

interface Stats {
    activeUsers: {
        dau: number;
        wau: number;
        dauWauRatio: number;
        totalUsers: number;
        newUsersToday: number;
    };
    funnel: {
        totalBooks: number;
        draftingBooks: number;
        previewedBooks: number;
        exportedBooks: number;
        formatStats: {
            pdf: number;
            markdown: number;
            video: number;
        };
    };
    system: {
        queueWaiting: number;
        queueActive: number;
        peakWaiting: number;
        avgRenderDuration: number;
        avgPageRenderDuration: number;
        todayUploadBytes: number;
        todayExportBytes: number;
        cdnHitRate: number;
        cdnSavedBytes: number;
        ossStats: {
            storage: number;
            objectCount: number;
        };
    };
    ecosystem: {
        templateHotRank: Array<{
            templateId: string;
            templateName: string;
            count: number;
        }>;
        avgPagesPerBook: number;
        avgPhotosPerBook: number;
        pendingFeedbacks: number;
    };
    activity: Array<{
        date: string;
        activeUsers: number;
        exportCount: number;
        uploadBytes: number;
        exportBytes: number;
    }>;
}

export function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get('/admin/stats');
                if (response.data.success) {
                    setStats(response.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch admin stats:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    // 智能格式化字节为可读字符串
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const cards = [
        {
            title: '用户活跃与留存',
            value: `${stats?.activeUsers.dau || 0} / ${stats?.activeUsers.wau || 0}`,
            sub: `活跃比(DAU/WAU): ${stats?.activeUsers.dauWauRatio || 0}% | 总用户: ${stats?.activeUsers.totalUsers || 0}`,
            icon: Users,
            color: 'from-violet-500/10 to-violet-500/20',
            iconBg: 'bg-violet-500',
            iconColor: 'text-white',
            link: '/admin/users'
        },
        {
            title: '高负载渲染队列',
            value: `${stats?.system.queueWaiting || 0} / ${stats?.system.queueActive || 0}`,
            sub: `实时等待 / 运行中 | 队列峰值: ${stats?.system.peakWaiting || 0}`,
            icon: Cpu,
            color: 'from-amber-500/10 to-amber-500/20',
            iconBg: 'bg-amber-500',
            iconColor: 'text-white',
            link: '/admin/books'
        },
        {
            title: '渲染引擎平均耗时',
            value: `${stats?.system.avgRenderDuration || 0}s`,
            sub: `单页耗时: ${stats?.system.avgPageRenderDuration || 0}s | 纯净排版`,
            icon: Server,
            color: 'from-blue-500/10 to-blue-500/20',
            iconBg: 'bg-blue-500',
            iconColor: 'text-white'
        },
        {
            title: '当日存储流量吞吐',
            value: stats ? `${formatBytes(stats.system.todayUploadBytes)} / ${formatBytes(stats.system.todayExportBytes)}` : '0 B / 0 B',
            sub: `上传 vs 导出下载 | OSS: ${stats ? formatBytes(stats.system.ossStats.storage) : '0 B'}`,
            icon: Activity,
            color: 'from-emerald-500/10 to-emerald-500/20',
            iconBg: 'bg-emerald-500',
            iconColor: 'text-white'
        },
        {
            title: 'CDN 边缘缓存',
            value: `${stats?.system.cdnHitRate || 0}%`,
            sub: `节省带宽: ${stats ? formatBytes(stats.system.cdnSavedBytes) : '0 B'} | 削减计费`,
            icon: TrendingUp,
            color: 'from-rose-500/10 to-rose-500/20',
            iconBg: 'bg-rose-500',
            iconColor: 'text-white'
        }
    ];

    // 计算图表高度上限
    const maxChartVal = stats ? Math.max(...stats.activity.map(a => Math.max(a.activeUsers, a.exportCount)), 5) : 10;

    return (
        <AdminLayout title="管理控制台">
            <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
                <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
                            运营级系统 telemetry
                            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        </h2>
                        <p className="text-slate-500 font-medium">深度监控系统渲染效率、业务生命周期漏斗、以及 CDN 物理成本。</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <>
                        {/* 1. 五个主卡片区域 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-10">
                            {cards.map((card, idx) => {
                                const CardComponent = card.link ? Link : 'div';
                                return (
                                    <CardComponent
                                        key={idx}
                                        to={card.link as any}
                                        className="group relative overflow-hidden bg-white/80 backdrop-blur-xl p-6 rounded-[28px] border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgba(99,102,241,0.08)] hover:-translate-y-1 transition-all duration-300 block cursor-default min-h-[200px]"
                                    >
                                        <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br ${card.color} -mr-12 -mt-12 rounded-full blur-2xl opacity-40 group-hover:opacity-100 transition-opacity duration-500`}></div>
                                        <div className="relative z-10 flex flex-col justify-between h-full">
                                            <div>
                                                <div className={`w-11 h-11 ${card.iconBg} ${card.iconColor} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 mb-5`}>
                                                    <card.icon size={20} />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{card.title}</span>
                                                <span className="text-2xl font-black text-slate-800 group-hover:translate-x-1 transition-transform duration-300 inline-block tracking-tight">
                                                    {card.value}
                                                </span>
                                            </div>
                                            <p className="text-[12px] text-slate-400 font-semibold mt-3 pt-2 border-t border-slate-100/50">{card.sub}</p>
                                        </div>
                                    </CardComponent>
                                );
                            })}
                        </div>

                        {/* 2. 核心转化漏斗卡片 */}
                        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[36px] border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] mb-10">
                            <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3">
                                <div className="w-2.5 h-6 bg-indigo-500 rounded-full"></div>
                                核心业务转化生命周期漏斗
                            </h3>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                                {/* 步骤 1 */}
                                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 -mr-8 -mt-8 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                                    <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Step 1</span>
                                    <h4 className="text-sm font-black text-slate-700 mt-1">新建时光集 (Drafting)</h4>
                                    <p className="text-3xl font-black text-slate-900 mt-3">{stats?.funnel.totalBooks || 0} <span className="text-xs font-bold text-slate-400">本</span></p>
                                    <div className="mt-4 text-xs font-semibold text-slate-400">
                                        包含仅草稿状态: <span className="text-slate-800 font-bold">{stats?.funnel.draftingBooks || 0}</span> 本
                                    </div>
                                </div>

                                {/* 步骤 2 */}
                                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 -mr-8 -mt-8 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                                    <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Step 2</span>
                                    <h4 className="text-sm font-black text-slate-700 mt-1">生成 3D 预览 (Previewed)</h4>
                                    <p className="text-3xl font-black text-slate-900 mt-3">
                                        {stats ? (stats.funnel.previewedBooks + stats.funnel.exportedBooks) : 0} <span className="text-xs font-bold text-slate-400">本</span>
                                    </p>
                                    <div className="mt-4 flex items-center justify-between text-xs font-semibold">
                                        <span className="text-slate-400">转化率: <span className="text-amber-500 font-extrabold">{stats && stats.funnel.totalBooks > 0 ? (((stats.funnel.previewedBooks + stats.funnel.exportedBooks) / stats.funnel.totalBooks) * 100).toFixed(1) : 0}%</span></span>
                                        <span className="text-slate-400">流失率: <span className="text-slate-600 font-extrabold">{stats && stats.funnel.totalBooks > 0 ? ((stats.funnel.draftingBooks / stats.funnel.totalBooks) * 100).toFixed(1) : 0}%</span></span>
                                    </div>
                                </div>

                                {/* 步骤 3 */}
                                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 -mr-8 -mt-8 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                                    <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Step 3</span>
                                    <h4 className="text-sm font-black text-slate-700 mt-1">最终成功导出 (Exported)</h4>
                                    <p className="text-3xl font-black text-slate-900 mt-3">{stats?.funnel.exportedBooks || 0} <span className="text-xs font-bold text-slate-400">本</span></p>
                                    <div className="mt-4 flex items-center justify-between text-xs font-semibold">
                                        <span className="text-slate-400">总转化率: <span className="text-emerald-500 font-extrabold">{stats && stats.funnel.totalBooks > 0 ? ((stats.funnel.exportedBooks / stats.funnel.totalBooks) * 100).toFixed(1) : 0}%</span></span>
                                        <span className="text-slate-400">PDF/{stats?.funnel.formatStats.markdown || 0}MD/{stats?.funnel.formatStats.video || 0}视频</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. 最近 7 日活跃趋势 (全宽) */}
                        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[36px] border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col min-h-[460px] mb-10">
                            <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-6 bg-violet-500 rounded-full"></div>
                                    最近 7 日活跃用户与导出频次
                                </div>
                                <div className="flex gap-4 p-1 px-3 bg-slate-50 rounded-xl">
                                    <span className="flex items-center gap-1.5 text-[10px] uppercase font-black text-violet-500">
                                        <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                                        日活
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[10px] uppercase font-black text-emerald-500">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        导出
                                    </span>
                                </div>
                            </h3>

                            <div className="flex-1 flex items-end justify-between gap-6 pt-6 px-4">
                                {stats?.activity.map((item, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-4 group relative">
                                        <div className="absolute inset-x-[-8px] inset-y-[-12px] bg-slate-50/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-start p-2 pointer-events-none">
                                            <div className="bg-slate-800 text-white text-[9px] font-black rounded-lg p-1.5 shadow-md flex flex-col gap-1 -translate-y-8 opacity-0 group-hover:opacity-100 transition-all duration-300 z-30">
                                                <span>上传: {formatBytes(item.uploadBytes)}</span>
                                                <span>导出: {formatBytes(item.exportBytes)}</span>
                                            </div>
                                        </div>
                                        <div className="w-full flex justify-center gap-4 items-end h-40 relative z-10">
                                            <div
                                                className="w-4 bg-gradient-to-t from-violet-500 to-violet-400 rounded-t-full transition-all duration-700 shadow-sm shadow-violet-100 group-hover:w-5"
                                                style={{ height: `${(item.activeUsers / maxChartVal) * 100}%` }}
                                                title={`日活用户: ${item.activeUsers}`}
                                            ></div>
                                            <div
                                                className="w-4 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-full transition-all duration-700 shadow-sm shadow-emerald-100 group-hover:w-5"
                                                style={{ height: `${(item.exportCount / maxChartVal) * 100}%` }}
                                                title={`触发导出: ${item.exportCount}`}
                                            ></div>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 p-1 px-3 bg-slate-50 rounded-lg group-hover:text-slate-800 group-hover:bg-slate-100 transition-colors relative z-10">{item.date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 4. 生态指标与模板榜单双列 */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            {/* 模板与骨架热度榜 */}
                            <div className="xl:col-span-2 bg-white/80 backdrop-blur-xl p-8 rounded-[36px] border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
                                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-6 bg-emerald-500 rounded-full"></div>
                                        模板与排版骨架套用热度榜 (Top 5)
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400">基于页面级别套用频次统计</span>
                                </h3>
                                <div className="space-y-5">
                                    {stats?.ecosystem.templateHotRank && stats.ecosystem.templateHotRank.length > 0 ? (
                                        stats.ecosystem.templateHotRank.map((item, idx) => {
                                            const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-slate-400'];
                                            const maxCount = stats.ecosystem.templateHotRank[0].count || 1;
                                            return (
                                                <div key={item.templateId} className="flex items-center justify-between gap-4 group">
                                                    <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 group-hover:bg-slate-200 transition-colors">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                                                            <span>{item.templateName || `未命名模板 (${item.templateId})`}</span>
                                                            <span className="text-slate-400">{item.count} 次套用</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-1000 delay-100`}
                                                                style={{ width: `${(item.count / maxCount) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-xs font-bold gap-2">
                                            <LayoutTemplate size={24} />
                                            <span>暂无模板套用数据</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 生态活跃风向标 */}
                            <div className="xl:col-span-1 bg-white/80 backdrop-blur-xl p-8 rounded-[36px] border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                                        <div className="w-2.5 h-6 bg-blue-500 rounded-full"></div>
                                        用户排版生态与交互
                                    </h3>
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                                    <Layers size={18} />
                                                </div>
                                                <span className="text-xs font-black text-slate-700">人均单本页数</span>
                                            </div>
                                            <span className="text-lg font-black text-slate-950">{stats?.ecosystem.avgPagesPerBook || 0} <span className="text-[10px] font-bold text-slate-400">页</span></span>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                                                    <FileDown size={18} />
                                                </div>
                                                <span className="text-xs font-black text-slate-700">平均单本图片数</span>
                                            </div>
                                            <span className="text-lg font-black text-slate-950">{stats?.ecosystem.avgPhotosPerBook || 0} <span className="text-[10px] font-bold text-slate-400">张</span></span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <Link 
                                        to="/admin/feedbacks"
                                        className="flex items-center justify-between p-4 bg-amber-500/10 text-amber-600 rounded-2xl border border-amber-500/20 hover:bg-amber-500/20 transition-all font-bold text-xs"
                                    >
                                        <span className="flex items-center gap-2">
                                            <MessageSquare size={16} />
                                            待处理用户反馈
                                        </span>
                                        <span className="bg-amber-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black">{stats?.ecosystem.pendingFeedbacks || 0}</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
