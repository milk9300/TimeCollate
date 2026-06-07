import { useState, useEffect } from 'react';
import axios from 'axios';
import { AdminLayout } from '../components/AdminLayout';
import { Shield, Ban, CheckCircle, Search } from 'lucide-react';
import { ConfirmModal } from '../../common/components/ConfirmModal';
import { useAuthStore } from '../../../store/useAuthStore';
import { AdminTable } from '../components/AdminTable';
import type { AdminTableColumn } from '../components/AdminTable';

interface UserData {
    id: string;
    nickname: string;
    username: string;
    avatarUrl?: string | null;
    createdAt: number;
    role: 'user' | 'admin';
    status: 'active' | 'banned';
}

export function AdminUsers() {
    const { user: currentUser } = useAuthStore();
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 20;

    const [search, setSearch] = useState('');
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger'
    });

    const fetchUsers = async (pageNum: number) => {
        if (pageNum === 1) setIsLoading(true);
        else setLoadingMore(true);

        try {
            const response = await axios.get('/admin/users', {
                params: {
                    page: pageNum,
                    pageSize: PAGE_SIZE,
                    search
                }
            });

            if (response.data.success) {
                const { users: newUsers, page: currentPage, totalPages } = response.data.data;

                if (pageNum === 1) {
                    setUsers(newUsers);
                } else {
                    setUsers(prev => [...prev, ...newUsers]);
                }

                setHasMore(currentPage < totalPages);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        setPage(1);
        fetchUsers(1);
    }, [search]);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            fetchUsers(page + 1);
        }
    };

    const handleUpdateUser = async (id: string, updates: Partial<UserData>) => {
        try {
            const response = await axios.patch(`/admin/users/${id}`, updates);
            if (response.data.success) {
                setPage(1);
                fetchUsers(1);
            }
        } catch (error) {
            console.error('Failed to update user:', error);
        } finally {
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
    };

    const triggerConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' = 'danger') => {
        setConfirmConfig({
            isOpen: true,
            title,
            message,
            onConfirm,
            type
        });
    };

    const columns: AdminTableColumn<UserData>[] = [
        {
            key: 'userinfo',
            title: '用户信息',
            render: (u) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-slate-100 shadow-sm overflow-hidden bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                        {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.nickname} className="w-full h-full object-cover" />
                        ) : (
                            u.nickname[0]?.toUpperCase() || '?'
                        )}
                    </div>
                    <div className="truncate">
                        <p className="text-sm font-black text-slate-900 truncate">{u.nickname}</p>
                        <p className="text-xs text-slate-500 font-medium truncate">@{u.username}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'createdAt',
            title: '注册时间',
            width: '180px',
            render: (u) => (
                <p className="text-sm font-bold text-slate-600">
                    {new Date(u.createdAt).toLocaleDateString()}
                </p>
            )
        },
        {
            key: 'role',
            title: '角色',
            width: '120px',
            render: (u) => (
                <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider
                    ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                    {u.role}
                </span>
            )
        },
        {
            key: 'status',
            title: '状态',
            width: '120px',
            render: (u) => (
                <span className={`flex items-center gap-1.5 text-sm font-bold
                    ${u.status === 'active' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {u.status === 'active' ? <CheckCircle size={14} /> : <Ban size={14} />}
                    {u.status === 'active' ? '正常' : '已封禁'}
                </span>
            )
        },
        {
            key: 'actions',
            title: '操作',
            width: '150px',
            align: 'right',
            render: (u) => (
                <div className="flex items-center justify-end gap-2">
                    {currentUser?.id !== u.id && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    triggerConfirm(
                                        u.status === 'active' ? '封禁用户' : '解封用户',
                                        `确定要${u.status === 'active' ? '封禁' : '解封'}用户 ${u.nickname} (@${u.username}) 吗？`,
                                        () => handleUpdateUser(u.id, { status: u.status === 'active' ? 'banned' : 'active' })
                                    );
                                }}
                                className={`p-2 rounded-xl transition-all ${u.status === 'active' ? 'hover:bg-red-50 text-red-500' : 'hover:bg-emerald-50 text-emerald-500'}`}
                                title={u.status === 'active' ? '封禁' : '解封'}
                            >
                                <Ban size={18} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    triggerConfirm(
                                        u.role === 'admin' ? '取消管理员权限' : '设为管理员',
                                        `确定要把用户 ${u.nickname} (@${u.username}) ${u.role === 'admin' ? '降级为普通用户' : '提升为管理员'} 吗？`,
                                        () => handleUpdateUser(u.id, { role: u.role === 'admin' ? 'user' : 'admin' }),
                                        u.role === 'admin' ? 'danger' : 'info'
                                    );
                                }}
                                className="p-2 rounded-xl hover:bg-indigo-50 text-indigo-600 transition-all"
                                title={u.role === 'admin' ? '降为用户' : '设为管理员'}
                            >
                                <Shield size={18} />
                            </button>
                        </>
                    )}
                    {currentUser?.id === u.id && (
                        <span className="text-xs text-slate-400 font-medium px-2">
                            当前用户
                        </span>
                    )}
                </div>
            )
        }
    ];

    return (
        <AdminLayout title="用户管理">
            <div className="p-8 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">用户管理</h2>
                        <p className="text-slate-500 font-medium">查看用户信息，修改权限或执行封禁操作。</p>
                    </div>

                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="搜索昵称或用户名..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <AdminTable<UserData>
                    columns={columns}
                    data={users}
                    rowKey={(u) => u.id}
                    isLoading={isLoading}
                    emptyText="未找到匹配用户"
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                    onLoadMore={handleLoadMore}
                />

                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                    type={confirmConfig.type}
                />
            </div>
        </AdminLayout>
    );
}
