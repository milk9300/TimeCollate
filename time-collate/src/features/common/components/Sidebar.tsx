import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
    Trash2,
    Library,
    Globe,
    ShieldCheck,
    LayoutGrid,
    Layout,
    FolderOpen,
    BookOpen,
    Bookmark
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import logoImg from '../../../assets/logo.png';

/**
 * 通用侧边栏组件
 * 锁定宽度 240px，保持前后台布局无感平滑切换
 */
export function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthStore();

    // 模板市场
    const marketNavItems = [
        { path: '/market/books', label: '书模板市场', icon: BookOpen },
        { path: '/market/layouts', label: '页排版市场', icon: LayoutGrid },
    ];

    // 我的创作
    const creationNavItems = [
        { path: '/', label: '拾光书架', icon: Library },
        { path: '/square', label: '广场', icon: Globe, badge: '新' },
        { path: '/my/assets', label: '我的素材', icon: FolderOpen },
        { path: '/my/book-templates', label: '我的书模板', icon: Bookmark },
        { path: '/my/layouts', label: '我的页排版', icon: Layout },
        { path: '/trash', label: '回收站', icon: Trash2 },
    ];

    const renderNavItem = (item: { path: string; label: string; icon: any; badge?: string }) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
            <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-5 py-3 rounded-[20px] transition-all duration-300 font-bold group relative
                          ${isActive
                        ? 'bg-indigo-50/70 text-indigo-650'
                        : 'text-slate-400 hover:bg-slate-50/50 hover:text-slate-600'}`}
            >
                <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`${isActive ? 'scale-110' : 'group-hover:scale-110 transition-transform duration-300'}`}
                />
                <span className="text-[14px]">{item.label}</span>

                {item.badge && (
                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-black tracking-tighter
                                  ${isActive ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-500'}`}>
                        {item.badge}
                    </span>
                )}

                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 rounded-r-full" />
                )}
            </Link>
        );
    };

    return (
        <aside className="w-[240px] h-full bg-white border-r border-slate-100 flex flex-col shrink-0 font-['Outfit',_sans-serif] select-none">
            {/* Logo 区域 */}
            <div className="p-8 pb-5">
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => navigate('/')}
                >
                    <img
                        src={logoImg}
                        alt="拾光集"
                        className="w-10 h-10 object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">
                        拾光集
                    </h1>
                </div>
            </div>

            {/* 导航菜单 */}
            <nav className="flex-1 px-4 py-2 space-y-6 overflow-y-auto custom-scrollbar">
                {/* 模板市场 */}
                <div>
                    <div className="px-5 mb-2.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
                        模板市场
                    </div>
                    <div className="space-y-1">
                        {marketNavItems.map(renderNavItem)}
                    </div>
                </div>

                {/* 我的创作 */}
                <div>
                    <div className="px-5 mb-2.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
                        我的创作
                    </div>
                    <div className="space-y-1">
                        {creationNavItems.map(renderNavItem)}
                    </div>
                </div>
            </nav>

            {/* 管理后台入口 */}
            {user?.role === 'admin' && (
                <div className="px-5 mt-auto py-6 border-t border-slate-100">
                    <button
                        onClick={() => navigate('/admin')}
                        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-50 text-indigo-650 rounded-[20px]
                                 hover:bg-indigo-100/80 transition-all duration-300 font-bold active:scale-[0.98] text-[15px] cursor-pointer"
                    >
                        <ShieldCheck size={18} strokeWidth={2.5} />
                        <span>进入管理后台</span>
                    </button>
                </div>
            )}
        </aside>
    );
}
