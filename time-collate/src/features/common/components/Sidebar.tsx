import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Plus,
    FolderOpen,
    Palette,
    BookOpen,
    ShieldCheck,
    User,
    LogOut,
    MessageSquare,
    Globe
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { NotificationDrawer } from './NotificationDrawer';
import { ExportTasksDropdown } from './ExportTasksDropdown';
import { FeedbackModal } from '../../feedback/components/FeedbackModal';
import logoImg from '../../../assets/logo.png';

/**
 * Canva 式极窄侧边栏组件
 * 宽度锁定 72px，极简扁平化排版
 */
export function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const userName = user?.nickname || '时光记录者';

    // 根据查询参数或 pathname 判断当前激活项
    const getActiveTab = () => {
        const path = location.pathname;
        const search = new URLSearchParams(location.search);
        const tab = search.get('tab');

        if (path.startsWith('/admin')) return 'admin';
        if (path === '/square') return 'square';
        if (path === '/workbench') {
            if (tab === 'designs') return 'designs';
            if (tab === 'resources') return 'resources';
            return 'books'; // 默认是回忆书
        }
        return '';
    };

    const activeTab = getActiveTab();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // 点击外部关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 导航项定义
    const navItems = [
        {
            id: 'books',
            label: '回忆书',
            icon: BookOpen,
            onClick: () => navigate('/workbench?tab=books')
        },
        {
            id: 'designs',
            label: '设计',
            icon: Palette,
            onClick: () => navigate('/workbench?tab=designs')
        },
        {
            id: 'resources',
            label: '资源',
            icon: FolderOpen,
            onClick: () => navigate('/workbench?tab=resources')
        },
        {
            id: 'square',
            label: '广场',
            icon: Globe,
            onClick: () => navigate('/square')
        }
    ];

    return (
        <aside className="w-[72px] h-full bg-white border-r border-slate-100 flex flex-col items-center pt-4 pb-6 shrink-0 font-['Outfit',_sans-serif] select-none z-40">
            {/* 1. Logo 区域 */}
            <div 
                className="w-10 h-10 mb-3 cursor-pointer group"
                onClick={() => navigate('/')}
                title="回到首页"
            >
                <img
                    src={logoImg}
                    alt="拾光集"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
            </div>

            {/* 2. Canva 式 + 创建按钮 */}
            <button
                onClick={() => navigate('/workbench?create=true')}
                className="w-10 h-10 mb-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-100 hover:shadow-lg transition-all duration-300 cursor-pointer active:scale-95 group"
                title="新建时光集"
            >
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300 stroke-[2.5]" />
            </button>

            {/* 3. 中部导航菜单 */}
            <nav className="flex-1 w-full px-1.5 space-y-4 flex flex-col items-center">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={item.onClick}
                            className={`w-14 py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-300 relative group cursor-pointer
                                      ${isActive 
                                        ? 'bg-indigo-50/70 text-indigo-650 font-black' 
                                        : 'text-slate-400 hover:bg-slate-50/50 hover:text-slate-650 font-bold'}`}
                        >
                            <Icon 
                                size={18} 
                                className={`${isActive ? 'scale-105 text-indigo-650' : 'group-hover:scale-105 transition-transform'}`} 
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            <span className="text-[9px] tracking-tight">{item.label}</span>
                            
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-indigo-600 rounded-r-full" />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* 4. 底部固定区 - 导出、通知、头像 */}
            <div className="w-full flex flex-col items-center gap-4 mt-auto">
                
                {/* 导出任务中心 */}
                <ExportTasksDropdown align="right" />

                {/* 消息通知中心 */}
                <NotificationDrawer />

                {/* 用户头像菜单 */}
                <div className="relative" ref={menuRef}>
                    <div
                        className="w-10 h-10 rounded-full border border-slate-100 shadow-sm overflow-hidden bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center text-indigo-600 cursor-pointer transition-all active:scale-95"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt={userName} className="w-full h-full object-cover" />
                        ) : (
                            <User size={18} />
                        )}
                    </div>

                    {/* 下拉菜单 (向上&右侧展开) */}
                    {isMenuOpen && (
                        <div
                            className="absolute left-full bottom-0 ml-3.5 w-60 bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_20px_40px_-5px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 p-2 animate-in fade-in slide-in-from-left-4 duration-300 select-none font-['Outfit',_sans-serif] z-55"
                            onMouseLeave={() => setIsMenuOpen(false)}
                        >
                            {/* 账号头信息 */}
                            <div className="px-4 py-3 mb-2 border-b border-slate-100/80">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{userName}</p>
                                <p className="text-xs font-bold text-slate-700 truncate font-mono">@{user?.username || 'user'}</p>
                            </div>

                            {/* 个人信息 */}
                            <button
                                onClick={() => { navigate(`/profile/${user?.id || ''}`); setIsMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-650 rounded-xl transition-all duration-200 font-bold text-xs group cursor-pointer hover:translate-x-1"
                            >
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-xs border border-indigo-100/20">
                                    <User size={13} className="stroke-[2.5]" />
                                </div>
                                <span>个人信息</span>
                            </button>

                            {/* 发布反馈 */}
                            <button
                                onClick={() => { setIsFeedbackOpen(true); setIsMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-650 rounded-xl transition-all duration-200 font-bold text-xs group mt-1 cursor-pointer hover:translate-x-1"
                            >
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-650 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-xs border border-indigo-100/20">
                                    <MessageSquare size={13} className="stroke-[2.5]" />
                                </div>
                                <span>发布反馈</span>
                            </button>

                            {/* 管理后台 */}
                            {user?.role === 'admin' && (
                                <button
                                    onClick={() => { navigate('/admin'); setIsMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-650 rounded-xl transition-all duration-200 font-bold text-xs group mt-1 cursor-pointer hover:translate-x-1"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-xs border border-indigo-100/20">
                                        <ShieldCheck size={13} className="stroke-[2.5]" />
                                    </div>
                                    <span>管理后台</span>
                                </button>
                            )}

                            {/* 退出登录 */}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2 text-rose-600 hover:bg-rose-50/60 rounded-xl transition-all duration-200 font-bold text-xs group mt-1 cursor-pointer hover:translate-x-1"
                            >
                                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all duration-300 shadow-xs border border-rose-100/20">
                                    <LogOut size={13} className="stroke-[2.5]" />
                                </div>
                                <span>退出登录</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 发布反馈弹窗 */}
            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
                onSuccess={() => {
                    setIsFeedbackOpen(false);
                    alert('反馈提交成功！管理员处理后会在通知中心回复您。');
                }}
            />
        </aside>
    );
}
