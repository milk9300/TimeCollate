import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    BookOpen,
    Layout,
    User,
    LogOut,
    ShieldCheck,
    Globe,
    MessageSquare,
    Trash2,
    Sparkles,
    CornerDownLeft,
    Plus
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useBookStore } from '../../../store';
import { getBookService } from '../../../services/serviceFactory';
import type { Book, Template } from '../../../types';

const bookService = getBookService();

interface OmniSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SearchItem {
    id: string;
    title: string;
    subtitle?: string;
    category: 'action' | 'book' | 'template';
    icon: React.ComponentType<any>;
    action: () => void;
}

/**
 * 全局 Omni Search (Cmd + K) 弹窗组件
 * 提供对书籍、排版模板与系统快捷指令的跨域搜索
 */
export function OmniSearchModal({ isOpen, onClose }: OmniSearchModalProps) {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const { templates, loadTemplates } = useBookStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [books, setBooks] = useState<Book[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // #region 加载搜索数据源
    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const response = await bookService.getBooks(1, 100);
                if (response && response.items) {
                    setBooks(response.items);
                }
            } catch (error) {
                console.error('Failed to load books for omni search:', error);
            }
        };

        if (isOpen) {
            fetchBooks();
            if (templates.length === 0) {
                loadTemplates();
            }
            setSearchQuery('');
            setSelectedIndex(0);
            // 自动聚焦输入框
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isOpen, templates.length, loadTemplates]);
    // #endregion

    // #region 静态操作条目定义
    const staticActions = useMemo(() => {
        const items = [
            {
                id: 'create-book',
                title: '新建时光集',
                subtitle: '开启你的新故事书',
                category: 'action' as const,
                icon: Plus,
                action: () => {
                    onClose();
                    navigate('/?create=true');
                }
            },
            {
                id: 'go-lobby',
                title: '所有时光集',
                subtitle: '回到我的主页书架',
                category: 'action' as const,
                icon: BookOpen,
                action: () => {
                    onClose();
                    navigate('/');
                }
            },
            {
                id: 'go-square',
                title: '广场大厅',
                subtitle: '浏览他人的公开美好回忆',
                category: 'action' as const,
                icon: Globe,
                action: () => {
                    onClose();
                    navigate('/square');
                }
            },
            {
                id: 'go-layouts',
                title: '我的自定义排版',
                subtitle: '设计与拼贴专属排版模板',
                category: 'action' as const,
                icon: Layout,
                action: () => {
                    onClose();
                    navigate('/my/layouts');
                }
            },
            {
                id: 'go-feedback',
                title: '反馈中心',
                subtitle: '向开发团队提交改进建议',
                category: 'action' as const,
                icon: MessageSquare,
                action: () => {
                    onClose();
                    navigate('/feedback');
                }
            },
            {
                id: 'go-trash',
                title: '回收站',
                subtitle: '查看或恢复已删除的时光集',
                category: 'action' as const,
                icon: Trash2,
                action: () => {
                    onClose();
                    navigate('/trash');
                }
            },
            {
                id: 'go-profile',
                title: '个人信息',
                subtitle: '修改昵称、头像与账户绑定',
                category: 'action' as const,
                icon: User,
                action: () => {
                    onClose();
                    navigate('/profile');
                }
            }
        ];

        // 若是管理员，加入管理后台入口
        if (user?.role === 'admin') {
            items.splice(1, 0, {
                id: 'go-admin',
                title: '进入管理后台',
                subtitle: '系统与数据监控控制台',
                category: 'action' as const,
                icon: ShieldCheck,
                action: () => {
                    onClose();
                    navigate('/admin');
                }
            });
        }

        // 加入退出登录
        items.push({
            id: 'logout',
            title: '退出登录',
            subtitle: '安全退出当前时光合集系统',
            category: 'action' as const,
            icon: LogOut,
            action: () => {
                onClose();
                logout();
                navigate('/login');
            }
        });

        return items;
    }, [user, navigate, onClose, logout]);
    // #endregion

    // #region 过滤并生成全部候选搜索条目
    const searchItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        // 1. 过滤快捷动作
        const filteredActions: SearchItem[] = staticActions.filter(
            item =>
                item.title.toLowerCase().includes(query) ||
                item.subtitle.toLowerCase().includes(query)
        );

        // 2. 过滤时光集
        const filteredBooks: SearchItem[] = books
            .filter(book => book.title.toLowerCase().includes(query))
            .map(book => ({
                id: `book-${book.id}`,
                title: book.title,
                subtitle: `时光集 · 由 ${book.author || '你'} 创建`,
                category: 'book' as const,
                icon: BookOpen,
                action: () => {
                    onClose();
                    navigate(`/editor/${book.id}`);
                }
            }));

        // 3. 过滤模板
        const filteredTemplates: SearchItem[] = (templates || [])
            .filter(t => t.name.toLowerCase().includes(query))
            .map(t => ({
                id: `template-${t.id}`,
                title: t.name,
                subtitle: `排版模板 · ${t.photoCount}张照片 · ${t.category || '自定义排版'}`,
                category: 'template' as const,
                icon: Layout,
                action: () => {
                    onClose();
                    navigate(`/my/layouts`);
                }
            }));

        return [...filteredActions, ...filteredBooks, ...filteredTemplates];
    }, [searchQuery, staticActions, books, templates, navigate, onClose]);
    // #endregion

    // 重置高亮索引，防止搜索词改变导致索引越界
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    // #region 键盘导航与事件处理
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % searchItems.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + searchItems.length) % searchItems.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (searchItems[selectedIndex]) {
                    searchItems[selectedIndex].action();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, searchItems, selectedIndex, onClose]);

    // 选中项滚动进视图
    useEffect(() => {
        const activeEl = listRef.current?.querySelector('[data-active="true"]');
        if (activeEl) {
            activeEl.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);
    // #endregion

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] px-4 font-['Outfit',_sans-serif]">
            {/* 背景虚化暗化遮罩 */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-250"
                onClick={onClose}
            />

            {/* Spotlight 弹窗主体 */}
            <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-xl border border-slate-100 rounded-[28px] 
                          shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden 
                          animate-in fade-in slide-in-from-top-4 duration-300">
                
                {/* 搜索输入区域 */}
                <div className="flex items-center gap-3.5 px-6 py-4.5 border-b border-slate-100">
                    <Search className="text-slate-400 shrink-0" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="搜索我的作品、排版模板或系统指令..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none text-slate-800 placeholder-slate-400 
                                 focus:ring-0 outline-none font-bold text-base"
                    />
                    <span className="text-[10px] font-black text-slate-400 bg-slate-100/80 px-2.5 py-1 rounded-lg uppercase tracking-wider select-none shrink-0">
                        ESC
                    </span>
                </div>

                {/* 搜索结果展示 */}
                <div 
                    ref={listRef}
                    className="flex-1 max-h-[420px] overflow-y-auto p-3.5 space-y-1.5 custom-scrollbar select-none"
                >
                    {searchItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 mb-3.5">
                                <Sparkles size={20} />
                            </div>
                            <p className="text-slate-700 text-xs font-black">未找到相关结果</p>
                            <p className="text-slate-400 text-[10px] mt-1.5 font-medium">请尝试输入其他关键词进行搜索</p>
                        </div>
                    ) : (
                        searchItems.map((item, idx) => {
                            const isSelected = idx === selectedIndex;
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.id}
                                    data-active={isSelected}
                                    onClick={item.action}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={`flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer transition-all duration-150
                                              ${isSelected 
                                                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' 
                                                  : 'text-slate-700 hover:bg-slate-50'}`}
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors
                                                      ${isSelected 
                                                          ? 'bg-indigo-500/20 border-white/10 text-white' 
                                                          : 'bg-slate-50 border-slate-100 text-slate-550'}`}>
                                            <Icon size={18} strokeWidth={isSelected ? 2.5 : 2} />
                                        </div>
                                        <div className="text-left min-w-0">
                                            <p className="text-xs font-black truncate">{item.title}</p>
                                            <p className={`text-[10px] truncate mt-0.5 font-medium
                                                          ${isSelected ? 'text-indigo-150' : 'text-slate-400'}`}>
                                                {item.subtitle}
                                            </p>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <div className="flex items-center gap-1 text-[9px] font-black text-indigo-100 bg-indigo-500/20 px-2 py-0.5 rounded-md">
                                            <span>确认</span>
                                            <CornerDownLeft size={10} strokeWidth={2.5} />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* 辅助底栏 */}
                <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold select-none shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500 shadow-sm">↑↓</span>
                            <span>移动</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500 shadow-sm">Enter</span>
                            <span>选择</span>
                        </span>
                    </div>
                    <div>
                        <span>全局搜索快捷指南</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
