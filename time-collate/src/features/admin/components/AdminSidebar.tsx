import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
    Library,
    Users,
    MessageSquare,
    ShieldCheck,
    Layout,
    Cpu,
    HardDrive,
    Bell,
    Lock,
    AlertTriangle,
    ArrowLeft
} from 'lucide-react';
import { useAdminStore } from '../../../store/useAdminStore';
import logoImg from '../../../assets/logo.png';

export function AdminSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { env, setEnv, stats, blockedRenderTasks } = useAdminStore();

    // 职责域菜单项配置
    const domains = [
        {
            title: '📊 全局概览',
            items: [
                { path: '/admin', label: '后台总览', icon: ShieldCheck }
            ]
        },
        {
            title: '🌱 生态运营域 (内容与治理)',
            items: [
                { path: '/admin/users', label: '用户档案管理', icon: Users },
                { path: '/admin/books', label: '时光书架审查', icon: Library },
                { path: '/admin/builder', label: '创意市场热更', icon: Layout },
                {
                    path: '/admin/feedbacks',
                    label: '匿名反馈中心',
                    icon: MessageSquare,
                    badge: () => {
                        const count = stats?.ecosystem.pendingFeedbacks || 0;
                        if (count <= 0) return null;
                        return (
                            <span className="ml-auto bg-red-500 text-white rounded-full px-2 py-0.5 text-[9px] font-black tracking-tight shrink-0 shadow-sm shadow-red-500/20">
                                {count}
                            </span>
                        );
                    }
                }
            ]
        },
        {
            title: '⚙️ 基础设施运维域 (健康监控)',
            items: [
                {
                    path: '/admin/render-flow',
                    label: 'PDF 渲染引擎流',
                    icon: Cpu,
                    badge: () => {
                        if (blockedRenderTasks <= 0) return null;
                        return (
                            <span className="ml-auto flex items-center gap-1 bg-amber-500/10 text-amber-600 rounded-full px-2 py-0.5 text-[9px] font-black shrink-0 border border-amber-500/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                <span className="relative">{blockedRenderTasks} 阻塞</span>
                            </span>
                        );
                    }
                },
                { path: '/admin/storage', label: '资源与存储监控', icon: HardDrive },
                { path: '/admin/announcement', label: '系统全局公告', icon: Bell },
                { path: '/admin/security', label: '安全策略与审计', icon: Lock }
            ]
        }
    ];

    return (
        <aside className="w-[260px] h-full bg-white border-r border-slate-100 flex flex-col shrink-0 font-['Outfit',_sans-serif] select-none z-40">
            {/* Logo 区域 */}
            <div className="p-6 pb-4">
                <div
                    className="flex items-center gap-2.5 cursor-pointer group"
                    onClick={() => navigate('/')}
                >
                    <img
                        src={logoImg}
                        alt="拾光集"
                        className="w-9 h-9 object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="flex items-center gap-1.5">
                        <h1 className="text-lg font-black text-slate-900 tracking-tight">
                            拾光集
                        </h1>
                        <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-1 py-0.5 rounded uppercase tracking-wider scale-90 shrink-0 mt-0.5">
                            Admin
                        </span>
                    </div>
                </div>
            </div>

            {/* iOS 风格环境切换分段滑块 */}
            <div className="px-5 mb-5 shrink-0">
                <div className="flex bg-slate-100 p-1 rounded-xl relative select-none">
                    <button
                        onClick={() => setEnv('prod')}
                        className={`flex-1 text-center py-2 text-[10px] font-black rounded-lg transition-all duration-300 relative z-10 cursor-pointer ${env === 'prod'
                                ? 'bg-white text-indigo-650 shadow-sm scale-102'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        生产环境 (Prod)
                    </button>
                    <button
                        onClick={() => setEnv('staging')}
                        className={`flex-1 text-center py-2 text-[10px] font-black rounded-lg transition-all duration-300 relative z-10 cursor-pointer ${env === 'staging'
                                ? 'bg-white text-amber-600 shadow-sm scale-102'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        测试沙盒 (Staging)
                    </button>
                </div>
            </div>

            {/* 导航菜单分组 */}
            <nav className="flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar">
                {domains.map((group, groupIdx) => (
                    <div key={groupIdx} className="space-y-1.5">
                        <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            {group.title}
                        </h3>
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const isActive = location.pathname === item.path;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-bold group relative text-xs
                                                  ${isActive
                                                ? 'bg-indigo-50/70 text-indigo-650'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                                    >
                                        <Icon
                                            size={16}
                                            strokeWidth={isActive ? 2.5 : 2}
                                            className={`${isActive ? 'scale-105' : 'group-hover:scale-105 transition-transform'}`}
                                        />
                                        <span className="text-[13px]">{item.label}</span>
                                        {item.badge && item.badge()}
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 bg-indigo-600 rounded-r" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* 底部隔离区与退出入口 */}
            <div className="px-4 py-4 mt-auto border-t border-slate-100 flex flex-col gap-2 shrink-0">
                {/* 高危设置区 */}
                <Link
                    to="/admin/danger"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-bold text-xs cursor-pointer group
                              ${location.pathname === '/admin/danger'
                            ? 'bg-red-50 text-red-650 border border-red-100/50 shadow-sm'
                            : 'text-slate-500 hover:bg-red-50/40 hover:text-red-500'}`}
                >
                    <AlertTriangle
                        size={16}
                        className={`text-red-500 ${location.pathname === '/admin/danger' ? 'animate-bounce' : 'group-hover:scale-105 transition-transform'}`}
                    />
                    <span className="text-[13px] font-black text-red-550">【高级设置/危险区】</span>
                </Link>

                {/* 返回创作者大厅 */}
                <button
                    onClick={() => navigate('/')}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-indigo-50/80 text-indigo-650 rounded-xl
                             hover:bg-indigo-100/60 transition-all font-bold active:scale-[0.98] text-[13px] cursor-pointer"
                >
                    <ArrowLeft size={14} strokeWidth={2.5} />
                    <span>返回大厅</span>
                </button>
            </div>
        </aside>
    );
}
