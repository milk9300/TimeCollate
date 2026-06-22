import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminTelemetryPanel } from './AdminTelemetryPanel';
import { Search, User, LogOut, ChevronDown, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useAdminStore } from '../../../store/useAdminStore';
import { ExportTasksDropdown } from '../../common/components/ExportTasksDropdown';
import { OmniSearchModal } from '../../common/components/OmniSearchModal';
import { FeedbackModal } from '../../feedback/components/FeedbackModal';

interface AdminLayoutProps {
    children: ReactNode;
    title: string;
}

/**
 * 管理后台专属布局组件
 * 支持 iOS 磨砂玻璃置顶以及全局 Cmd + K Spotlight 检索
 * 支持右侧 1/3 Telemetry 仪表盘分栏
 */
export function AdminLayout({ children }: AdminLayoutProps) {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const { env, fetchStats } = useAdminStore();
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isOmniOpen, setIsOmniOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    const userName = user?.nickname || '管理员';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // 全局快捷键监听 Cmd+K / Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsOmniOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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

    // 定时轮询拉取系统概览状态数据（每 10 秒刷新）
    useEffect(() => {
        fetchStats(); // 首次加载
        const timer = setInterval(() => {
            fetchStats();
        }, 10000);
        return () => clearInterval(timer);
    }, [fetchStats]);

    return (
        <div className="flex h-screen bg-slate-50">
            {/* 使用管理后台专属侧边栏 */}
            <AdminSidebar />

            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* 如果处于 Staging 环境，顶部添加黄色警示条 */}
                {env === 'staging' && (
                    <div className="h-8 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white flex items-center justify-center text-[10px] font-black select-none z-50 shrink-0 gap-2 tracking-wide shadow-[0_1px_10px_rgba(245,158,11,0.2)]">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
                        测试沙盒模式 (Staging Sandbox) — 影子数据库已连接，此操作不影响生产库！
                    </div>
                )}

                {/* 内部工作区容器：允许 Header 置顶于当前工作区内 */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* 顶部工具栏 - iOS 磨砂玻璃置顶 */}
                    <header className="absolute top-0 left-0 right-0 h-20 bg-white/70 backdrop-blur-[20px] border-b border-slate-100 flex items-center justify-between px-8 z-30 select-none">
                        <div className="relative group">
                            <button
                                onClick={() => setIsOmniOpen(true)}
                                className="flex items-center gap-2.5 px-4 py-2 bg-slate-100 hover:bg-slate-200/60 border border-slate-200/20 text-slate-400 hover:text-slate-600 rounded-xl transition-all font-bold text-xs select-none cursor-pointer group/btn"
                            >
                                <Search size={14} className="text-slate-400 group-hover/btn:text-slate-600 transition-colors" />
                                <span>搜索全局后台...</span>
                                <span className="text-[9px] font-black bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400 uppercase tracking-wide ml-1.5 shadow-sm">
                                    Cmd + K
                                </span>
                            </button>
                        </div>

                        <div className="flex items-center gap-4 relative">
                            {/* 导出任务下拉列表，管理员依然可以监控系统导出状态 */}
                            <ExportTasksDropdown />

                            <div className="relative" ref={menuRef}>
                                <div
                                    className="flex items-center gap-3 cursor-pointer group hover:bg-gray-50/80 p-1.5 pr-3 rounded-2xl transition-all"
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    onMouseEnter={() => setIsMenuOpen(true)}
                                >
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-bold text-[#18181B]">{userName}</p>
                                        <p className="text-[11px] text-[#64748B] font-medium leading-none mt-0.5">超级管理员</p>
                                    </div>
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gradient-to-tr from-indigo-50 to-white flex items-center justify-center text-indigo-600">
                                            {user?.avatarUrl ? (
                                                <img src={user.avatarUrl} alt={userName} className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={20} />
                                            )}
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                                            <ChevronDown size={10} className={`text-gray-400 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                </div>

                                {/* 下拉菜单 */}
                                {isMenuOpen && (
                                    <div
                                        className="absolute right-0 top-full mt-3.5 w-60 bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_20px_40px_-5px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 p-2 animate-in fade-in slide-in-from-top-4 duration-300 select-none font-['Outfit',_sans-serif]"
                                        onMouseLeave={() => setIsMenuOpen(false)}
                                    >
                                        {/* 账号头信息 */}
                                        <div className="px-4 py-3 mb-2 border-b border-slate-100/80">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">账号设置</p>
                                            <p className="text-xs font-bold text-slate-700 truncate font-mono">@{user?.username || 'admin'}</p>
                                        </div>

                                        {/* 个人信息 */}
                                        <button
                                            onClick={() => { navigate('/profile'); setIsMenuOpen(false); }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-650 rounded-xl transition-all duration-200 font-bold text-xs group cursor-pointer hover:translate-x-1"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-650 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-xs border border-indigo-100/20">
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
                    </header>

                    {/* 双分栏工作区：左 2/3 内容区域，右 1/3 Telemetry 监控 */}
                    <div className="flex-1 flex overflow-hidden pt-20">
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {children}
                        </div>
                        {/* 右侧 1/3 Telemetry 面板 */}
                        <AdminTelemetryPanel />
                    </div>
                </div>
            </main>

            {/* 全局 Spotlight 搜索 */}
            <OmniSearchModal isOpen={isOmniOpen} onClose={() => setIsOmniOpen(false)} />

            {/* 发布反馈弹窗 */}
            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
                onSuccess={() => {
                    setIsFeedbackOpen(false);
                    alert('反馈提交成功！管理员处理后会在通知中心回复您。');
                }}
            />
        </div>
    );
}
