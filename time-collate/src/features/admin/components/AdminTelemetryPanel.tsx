import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
    Cpu, Server, Activity, Users, BookOpen, MessageSquare, 
    ShieldCheck, AlertTriangle, TrendingUp, HardDrive, Bell, 
    Lock, Sparkles, RefreshCw, CheckCircle, Database, Ban
} from 'lucide-react';
import { useAdminStore } from '../../../store/useAdminStore';
import axios from 'axios';

// #region SVG Path Helper
const generateSvgPath = (data: number[], width: number, height: number, max: number = 100) => {
    if (data.length === 0) return '';
    const step = width / (data.length - 1);
    return data.map((val, index) => {
        const x = index * step;
        const y = height - (val / max) * (height - 10) - 5; // padding top/bottom
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
};
// #endregion

export function AdminTelemetryPanel() {
    const location = useLocation();
    const pathname = location.pathname;
    const { env, stats, blockedRenderTasks, setBlockedRenderTasks, activeDangerAction, dangerStage, setDangerAction } = useAdminStore();

    // 实时 CPU / Memory 曲线波形数据
    const [cpuData, setCpuData] = useState<number[]>([30, 32, 28, 35, 42, 38, 39, 45, 41, 48, 50, 47, 42, 45, 52]);
    const [memData, setMemData] = useState<number[]>([60, 61, 60, 62, 63, 63, 62, 64, 65, 64, 65, 66, 65, 64, 65]);
    
    // 实时日志滚动数据
    const [logs, setLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'warn' | 'success' }>>([]);

    // 危险区双重验证状态
    const [dangerChecked, setDangerChecked] = useState(false);
    const [dangerVerifyText, setDangerVerifyText] = useState('');
    const [isExecutingDanger, setIsExecutingDanger] = useState(false);

    // 模拟实时日志及硬件曲线跳动
    useEffect(() => {
        // 初始日志
        const initialLogs = [
            { time: '12:00:05', text: 'Telemetry 监控连接建立成功', type: 'success' as const },
            { time: '12:01:12', text: 'CDN 节点缓存命中率 94.2%', type: 'info' as const },
            { time: '12:02:30', text: 'PDF 渲染引擎池保持就绪状态', type: 'info' as const },
        ];
        setLogs(initialLogs);

        const logPool = [
            { text: '匿名反馈接收到一条新提交', type: 'info' as const },
            { text: '时光书《毕业相册》生成 3D 预览成功', type: 'success' as const },
            { text: '检测到 OSS 带宽吞吐升高', type: 'info' as const },
            { text: '用户请求 PDF 导出任务，推入队列', type: 'info' as const },
            { text: '系统健康检查: 100% 连通率', type: 'success' as const },
            { text: 'Staging 影子节点更新完成', type: 'info' as const },
        ];

        const interval = setInterval(() => {
            // 更新 CPU 和 内存
            setCpuData(prev => {
                const nextVal = Math.max(15, Math.min(92, prev[prev.length - 1] + (Math.random() * 16 - 8)));
                return [...prev.slice(1), Math.round(nextVal)];
            });
            setMemData(prev => {
                const nextVal = Math.max(55, Math.min(85, prev[prev.length - 1] + (Math.random() * 4 - 2)));
                return [...prev.slice(1), Math.round(nextVal)];
            });

            // 15% 几率产生新日志
            if (Math.random() < 0.35) {
                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                const randomLog = logPool[Math.floor(Math.random() * logPool.length)];
                setLogs(prev => [{ time: timeStr, ...randomLog }, ...prev.slice(0, 10)]);
            }
        }, 1500);

        return () => clearInterval(interval);
    }, []);

    // 危险区重置
    useEffect(() => {
        if (pathname !== '/admin/danger') {
            setDangerAction(null);
            setDangerChecked(false);
            setDangerVerifyText('');
        }
    }, [pathname, setDangerAction]);

    // 执行高危动作
    const handleExecuteDangerAction = async () => {
        if (!dangerChecked) return;
        const requiredText = env === 'prod' ? 'CONFIRM-PROD' : 'CONFIRM-STAGING';
        if (dangerVerifyText !== requiredText) return;

        setIsExecutingDanger(true);
        setDangerAction(activeDangerAction, 'confirming');
        
        // 模拟执行耗时
        setTimeout(async () => {
            try {
                if (activeDangerAction === 'redis_flush') {
                    // 模拟清除缓存
                    setBlockedRenderTasks(0); // 清空被阻塞任务
                } else if (activeDangerAction === 'db_migrate') {
                    // 模拟数据库迁移
                }
                setDangerAction(activeDangerAction, 'completed');
            } catch (err) {
                console.error(err);
            } finally {
                setIsExecutingDanger(false);
                setDangerVerifyText('');
                setDangerChecked(false);
            }
        }, 2000);
    };

    // 渲染特定路由的 Telemetry 面板
    const renderContent = () => {
        // 危险区面板覆盖
        if (pathname === '/admin/danger' && activeDangerAction) {
            const requiredCode = env === 'prod' ? 'CONFIRM-PROD' : 'CONFIRM-STAGING';
            const actionTitles: Record<string, string> = {
                redis_flush: '清空系统缓存 (Flush Cache)',
                db_migrate: '执行数据库迁移 (Database Migration)',
                maintenance_toggle: '开启全局停机维护模式 (Maintenance Mode)'
            };

            return (
                <div className="space-y-6">
                    <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-3xl text-red-500">
                        <div className="flex gap-3 items-start">
                            <AlertTriangle size={24} className="shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-black text-sm uppercase tracking-wide">高危动作风险确认</h4>
                                <p className="text-xs text-red-500/80 font-bold mt-1">您选择执行：{actionTitles[activeDangerAction]}</p>
                            </div>
                        </div>
                    </div>

                    {dangerStage === 'evaluating' && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">安全风险与影响评估</h5>
                                <div className="space-y-2 bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs font-bold text-slate-600 leading-relaxed">
                                    {activeDangerAction === 'redis_flush' && (
                                        <>
                                            <p className="text-red-500">● 强制让所有在线用户的登录 Session 失效并退出登录。</p>
                                            <p>● 所有页面缓存击穿，直接查询数据库，会导致短暂 CPU 峰值。</p>
                                            <p>● 重置待渲染 PDF 任务流积压状态。</p>
                                        </>
                                    )}
                                    {activeDangerAction === 'db_migrate' && (
                                        <>
                                            <p className="text-red-500">● 对表结构实施 DDL 写入操作，高并发期间会导致行级/表级锁。</p>
                                            <p>● 请确保在迁移前已经对备份盘进行了冷快照备份。</p>
                                            <p>● 失败可能触发回滚流程，导致应用暂时不可用。</p>
                                        </>
                                    )}
                                    {activeDangerAction === 'maintenance_toggle' && (
                                        <>
                                            <p className="text-red-500">● 所有外部流量定向到“系统维护中”静态占位页。</p>
                                            <p>● 除管理员账号外，拒绝一切 API 写请求。</p>
                                            <p>● 适合大规模不停服补丁应用或数据结构转换。</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-start gap-3 cursor-pointer group/label">
                                    <input 
                                        type="checkbox"
                                        checked={dangerChecked}
                                        onChange={(e) => setDangerChecked(e.target.checked)}
                                        className="mt-0.5 appearance-none w-4 h-4 rounded border-2 border-slate-200 checked:bg-red-500 checked:border-red-500 cursor-pointer transition-all"
                                    />
                                    <span className="text-xs font-bold text-slate-500 group-hover/label:text-slate-800 transition-colors">我已仔细阅读并完全理解以上高危操作将带来的物理级影响。</span>
                                </label>

                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                                        <span>请输入验证码以解锁按钮</span>
                                        <span className="text-red-500 font-extrabold">{requiredCode}</span>
                                    </span>
                                    <input 
                                        type="text"
                                        placeholder={`请在此输入 ${requiredCode}`}
                                        value={dangerVerifyText}
                                        onChange={(e) => setVerifyTextCase(e.target.value)}
                                        disabled={!dangerChecked}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black tracking-widest uppercase outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all disabled:bg-slate-50 disabled:text-slate-400"
                                    />
                                </div>

                                <button
                                    onClick={handleExecuteDangerAction}
                                    disabled={dangerVerifyText !== requiredCode || isExecutingDanger}
                                    className="w-full py-3.5 bg-red-500 hover:bg-red-600 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-black shadow-lg shadow-red-500/10 active:scale-95 transition-all duration-300"
                                >
                                    确认执行此操作
                                </button>
                            </div>
                        </div>
                    )}

                    {dangerStage === 'confirming' && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="w-12 h-12 rounded-full border-2 border-t-red-500 animate-spin flex items-center justify-center text-red-500">
                                <Database size={20} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-black text-slate-800">正在与底层服务集群同步...</p>
                                <p className="text-xs font-bold text-slate-400 mt-1">请勿关闭或刷新浏览器窗口</p>
                            </div>
                        </div>
                    )}

                    {dangerStage === 'completed' && (
                        <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl text-center space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 text-sm">操作已成功同步到集群</h4>
                                <p className="text-xs text-slate-500 font-medium mt-1">已安全记录在审计日志中。</p>
                            </div>
                            <button
                                onClick={() => setDangerAction(null)}
                                className="px-4 py-2 bg-white border border-slate-100 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-black shadow-sm transition-all"
                            >
                                返回危险区面板
                            </button>
                        </div>
                    )}
                </div>
            );
        }

        switch (pathname) {
            case '/admin': // 概览
                return (
                    <div className="space-y-6">
                        {/* 硬件负载看板 */}
                        <div className="space-y-4">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Cpu size={12} />
                                物理宿主机实时负载
                            </span>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 border border-slate-100/50 p-4 rounded-2xl text-center">
                                    <span className="text-xs font-bold text-slate-400">CPU 占用</span>
                                    <p className="text-2xl font-black text-slate-800 mt-1">{cpuData[cpuData.length - 1]}%</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-100/50 p-4 rounded-2xl text-center">
                                    <span className="text-xs font-bold text-slate-400">内存 占用</span>
                                    <p className="text-2xl font-black text-slate-800 mt-1">{memData[memData.length - 1]}%</p>
                                </div>
                            </div>
                        </div>

                        {/* 实时活动流 */}
                        <div className="space-y-3">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Activity size={12} />
                                系统实时日志流 (Live Logs)
                            </span>
                            <div className="bg-slate-950 rounded-2xl p-4 font-mono text-[10px] text-slate-400 h-64 overflow-y-auto space-y-2.5 custom-scrollbar">
                                {logs.map((log, idx) => (
                                    <div key={idx} className="flex gap-2 items-start hover:text-slate-200 transition-colors">
                                        <span className="text-slate-600 shrink-0">{log.time}</span>
                                        <span className={`shrink-0 ${log.type === 'success' ? 'text-emerald-500' : log.type === 'warn' ? 'text-amber-500' : 'text-indigo-400'}`}>[SYS]</span>
                                        <span className="break-all font-bold leading-normal">{log.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case '/admin/users': // 用户留存
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Users size={12} />
                                用户活跃率指标 (DAU / WAU)
                            </span>
                            
                            {/* SVG 环形进度条表示留存转化 */}
                            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col items-center justify-center">
                                <div className="relative w-28 h-28 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40" className="stroke-slate-200 fill-none" strokeWidth="8" />
                                        <circle 
                                            cx="50" 
                                            cy="50" 
                                            r="40" 
                                            className="stroke-indigo-650 fill-none transition-all duration-1000" 
                                            strokeWidth="8" 
                                            strokeDasharray="251.2" 
                                            strokeDashoffset={251.2 - (251.2 * (stats?.activeUsers.dauWauRatio || 28.5)) / 100}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-xl font-black text-slate-800">{stats?.activeUsers.dauWauRatio || 28.5}%</span>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wide">黏性比率</span>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-slate-500 mt-4 text-center leading-relaxed">
                                    日活对周活比率 (DAU/WAU) 反映产品用户依赖度，当前指标处于健康区间。
                                </p>
                            </div>
                        </div>

                        {/* 用户漏斗 */}
                        <div className="space-y-3">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <TrendingUp size={12} />
                                创作者转化漏斗分析
                            </span>
                            <div className="space-y-3">
                                {[
                                    { name: '总注册用户', val: stats?.activeUsers.totalUsers || 0, pct: 100, color: 'bg-indigo-500' },
                                    { name: '创建作品用户', val: stats?.funnel.totalBooks || 0, pct: stats && stats.activeUsers.totalUsers > 0 ? (stats.funnel.totalBooks / stats.activeUsers.totalUsers) * 100 : 62, color: 'bg-violet-500' },
                                    { name: '成功导出用户', val: stats?.funnel.exportedBooks || 0, pct: stats && stats.activeUsers.totalUsers > 0 ? (stats.funnel.exportedBooks / stats.activeUsers.totalUsers) * 100 : 38, color: 'bg-emerald-500' },
                                ].map((item, idx) => (
                                    <div key={idx} className="bg-slate-50 border border-slate-100/50 p-4 rounded-2xl">
                                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
                                            <span>{item.name}</span>
                                            <span>{item.val} ({Math.round(item.pct)}%)</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case '/admin/books': // 时光书架审查
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <BookOpen size={12} />
                                公开作品比例 (Public Ratio)
                            </span>
                            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5">
                                <div className="flex justify-between text-xs font-black text-slate-700 mb-2">
                                    <span>公开共享 ({stats ? Math.round((stats.funnel.exportedBooks / Math.max(1, stats.funnel.totalBooks)) * 100) : 42}%)</span>
                                    <span>私有归档 ({stats ? 100 - Math.round((stats.funnel.exportedBooks / Math.max(1, stats.funnel.totalBooks)) * 100) : 58}%)</span>
                                </div>
                                <div className="h-4 w-full bg-slate-100 rounded-xl overflow-hidden flex">
                                    <div className="h-full bg-indigo-500" style={{ width: stats ? `${(stats.funnel.exportedBooks / Math.max(1, stats.funnel.totalBooks)) * 100}%` : '42%' }}></div>
                                    <div className="h-full bg-slate-300" style={{ width: stats ? `${100 - (stats.funnel.exportedBooks / Math.max(1, stats.funnel.totalBooks)) * 100}%` : '58%' }}></div>
                                </div>
                            </div>
                        </div>

                        {/* 状态统计 */}
                        <div className="space-y-3">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                审核队列状态
                            </span>
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center text-xs font-bold p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                                    <span className="text-amber-500">● 待审核作品 (Pending)</span>
                                    <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-lg text-[10px] font-black">{stats?.funnel.draftingBooks || 0}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                                    <span className="text-emerald-500">● 已发布作品 (Published)</span>
                                    <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-lg text-[10px] font-black">{stats?.funnel.exportedBooks || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case '/admin/builder': // 创意市场
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <TrendingUp size={12} />
                                模板资产编译率
                            </span>
                            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 text-center">
                                <span className="text-2xl font-black text-indigo-600">99.85%</span>
                                <p className="text-[10px] font-bold text-slate-400 mt-1">Staging / Prod 自动测试通过率</p>
                            </div>
                        </div>

                        {/* 模板编译耗时 */}
                        <div className="space-y-3">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                排版引擎物理体积限制 (Budgets)
                            </span>
                            <div className="space-y-3 text-xs font-bold">
                                {[
                                    { name: 'Core Engine Bundle', val: '142 KB', pct: 60, status: 'Normal' },
                                    { name: 'Fonts & Font Subset', val: '2.4 MB', pct: 85, status: 'Warning' },
                                    { name: 'Theme Stylesheets', val: '45 KB', pct: 30, status: 'Normal' }
                                ].map((item, idx) => (
                                    <div key={idx} className="bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                                        <div className="flex justify-between text-slate-700 mb-1.5">
                                            <span>{item.name}</span>
                                            <span>{item.val}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${item.status === 'Warning' ? 'bg-amber-400' : 'bg-indigo-500'} rounded-full`} style={{ width: `${item.pct}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case '/admin/feedbacks': // 匿名反馈
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <MessageSquare size={12} />
                                反馈类型分布比例
                            </span>
                            <div className="space-y-3">
                                {[
                                    { name: '程序错误 (Bugs)', pct: 45, color: 'bg-red-500' },
                                    { name: '功能提议 (Features)', pct: 30, color: 'bg-emerald-500' },
                                    { name: '排版布局建议 (Layout)', pct: 15, color: 'bg-amber-500' },
                                    { name: '其他 (Other)', pct: 10, color: 'bg-slate-400' },
                                ].map((item, idx) => (
                                    <div key={idx} className="bg-slate-50 border border-slate-100/50 p-3 rounded-xl flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-700">{item.name}</span>
                                        <span className={`px-2 py-0.5 text-[9px] font-black text-white rounded-md ${item.color}`}>{item.pct}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case '/admin/render-flow': // PDF 渲染引擎流
                return (
                    <div className="space-y-6">
                        {/* 硬件波形图 */}
                        <div className="space-y-3">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Activity size={12} />
                                渲染引擎 CPU/Memory 秒级波动图
                            </span>
                            
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 overflow-hidden relative">
                                <span className="absolute top-3 left-4 text-[9px] font-black font-mono text-slate-500">波浪线: CPU (红) / 内存 (蓝)</span>
                                <div className="h-32 w-full mt-4">
                                    <svg className="w-full h-full" viewBox="0 0 300 120" preserveAspectRatio="none">
                                        {/* CPU 曲线 */}
                                        <path 
                                            d={generateSvgPath(cpuData, 300, 120, 100)} 
                                            fill="none" 
                                            className="stroke-red-500" 
                                            strokeWidth="2" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                        />
                                        {/* Memory 曲线 */}
                                        <path 
                                            d={generateSvgPath(memData, 300, 120, 100)} 
                                            fill="none" 
                                            className="stroke-blue-500" 
                                            strokeWidth="2" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                        />
                                    </svg>
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 font-mono mt-3">
                                    <span>LATEST: CPU {cpuData[cpuData.length - 1]}%</span>
                                    <span>MEM: {memData[memData.length - 1]}%</span>
                                </div>
                            </div>
                        </div>

                        {/* 引擎进程池 */}
                        <div className="space-y-3">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                引擎进程池 (Chromium Worker Pool)
                            </span>
                            <div className="space-y-2 text-xs font-bold text-slate-700">
                                <div className="flex justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl">
                                    <span>Worker #1 (PDF Renderer)</span>
                                    <span>IDLE (空闲中)</span>
                                </div>
                                <div className="flex justify-between p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-650 rounded-xl">
                                    <span>Worker #2 (Preview Core)</span>
                                    <span>ACTIVE (工作中)</span>
                                </div>
                                <div className={`flex justify-between p-3 rounded-xl transition-colors duration-300 ${
                                    blockedRenderTasks > 0 
                                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600' 
                                        : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'
                                }`}>
                                    <span>Worker #3 (Bulk Exporter)</span>
                                    <span>{blockedRenderTasks > 0 ? `BLOCKED (${blockedRenderTasks} 阻塞)` : 'IDLE (空闲中)'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case '/admin/storage': // 存储
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <HardDrive size={12} />
                                OSS 存储分类占比
                            </span>
                            <div className="space-y-3">
                                {[
                                    { name: '用户上传高清图', size: '124 GB', pct: 72, color: 'bg-indigo-500' },
                                    { name: '已生成 PDF 导出物', size: '42 GB', pct: 24, color: 'bg-sky-500' },
                                    { name: '系统模板素材/样式', size: '8.2 GB', pct: 4, color: 'bg-emerald-500' },
                                ].map((item, idx) => (
                                    <div key={idx} className="bg-slate-50 border border-slate-100/50 p-4 rounded-2xl">
                                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
                                            <span>{item.name}</span>
                                            <span>{item.size} ({item.pct}%)</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CDN 吞吐量 */}
                        <div className="space-y-3">
                            <span className="text-[11px] font-black text-slate-400 tracking-widest uppercase">
                                CDN 成本分析
                            </span>
                            <div className="p-4 bg-emerald-50 text-emerald-650 rounded-2xl border border-emerald-100 font-bold text-xs">
                                <p>● 带宽缓存命中率高达 94.2%</p>
                                <p className="mt-1">● CDN 节省已降低 92% 物理流量计费。</p>
                            </div>
                        </div>
                    </div>
                );

            case '/admin/announcement': // 公告
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Bell size={12} />
                                当前公告触达统计
                            </span>
                            
                            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col items-center justify-center">
                                <div className="relative w-28 h-28 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40" className="stroke-slate-200 fill-none" strokeWidth="8" />
                                        <circle 
                                            cx="50" 
                                            cy="50" 
                                            r="40" 
                                            className="stroke-amber-400 fill-none" 
                                            strokeWidth="8" 
                                            strokeDasharray="251.2" 
                                            strokeDashoffset={251.2 - (251.2 * 78.3) / 100}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-xl font-black text-slate-800">78.3%</span>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wide">已读比率</span>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-slate-500 mt-4 text-center leading-relaxed">
                                    发布公告 24 小时后，全网活跃用户的阅读率，帮助分析重要消息的穿透力。
                                </p>
                            </div>
                        </div>
                    </div>
                );

            case '/admin/security': // 安全
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Lock size={12} />
                                系统审计安全状态
                            </span>
                            
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-3xl p-5 flex items-center gap-3">
                                <ShieldCheck size={28} className="shrink-0" />
                                <div>
                                    <h4 className="text-sm font-black uppercase">安全盾保护中</h4>
                                    <p className="text-[10px] font-bold mt-0.5 text-emerald-500/80">未探测到外部暴力破解攻击。</p>
                                </div>
                            </div>
                        </div>

                        {/* 安全快捷项 */}
                        <div className="space-y-3">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                敏感指令审计计数
                            </span>
                            <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-2 text-xs font-bold text-slate-600">
                                <div className="flex justify-between">
                                    <span>封禁/解封用户</span>
                                    <span>2 次</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>下架书籍作品</span>
                                    <span>0 次</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>配置参数更新</span>
                                    <span>1 次</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-xs font-bold gap-2">
                        <Sparkles size={24} />
                        <span>切换至特定菜单查看对应 Telemetry</span>
                    </div>
                );
        }
    };

    // Helper method to set uppercase verification code
    const setVerifyTextCase = (val: string) => {
        setDangerVerifyText(val.toUpperCase());
    };

    // 确定右侧 Telemetry 标题
    const getTitle = () => {
        if (pathname === '/admin/danger' && activeDangerAction) return '高危操作面板';
        
        switch (pathname) {
            case '/admin': return '系统健康与日志监视器';
            case '/admin/users': return '留存与漏斗 Telemetry';
            case '/admin/books': return '书架审核 Telemetry';
            case '/admin/builder': return '创意市场效能看板';
            case '/admin/feedbacks': return '反馈类型 Telemetry';
            case '/admin/render-flow': return 'PDF 渲染物理机看板';
            case '/admin/storage': return '存储空间与 CDN 看板';
            case '/admin/announcement': return '公告阅读率监控';
            case '/admin/security': return '风控审计数据';
            case '/admin/danger': return '高危操作评估看板';
            default: return '数据分析仪 (Telemetry)';
        }
    };

    return (
        <aside className="xl:w-[400px] w-full shrink-0 border-l border-slate-100 bg-white/70 backdrop-blur-[20px] h-full flex flex-col overflow-hidden font-['Outfit',_sans-serif] select-none xl:animate-in xl:slide-in-from-right-4 duration-300">
            {/* 顶部标题区 */}
            <div className="h-20 border-b border-slate-100 flex items-center px-8 shrink-0">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    {getTitle()}
                </h3>
            </div>

            {/* 数据栏主内容 */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {renderContent()}
            </div>
        </aside>
    );
}
