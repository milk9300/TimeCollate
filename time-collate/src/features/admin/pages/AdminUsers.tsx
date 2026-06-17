import { useState, useEffect } from 'react';
import axios from 'axios';
import { AdminLayout } from '../components/AdminLayout';
import { Shield, Ban, CheckCircle, Search, UserPlus, Copy, Check, X } from 'lucide-react';
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
    const [isGenerating, setIsGenerating] = useState(false);
    const [genType, setGenType] = useState<'official' | 'test' | null>(null);
    const [phoneInput, setPhoneInput] = useState('');
    const [genResult, setGenResult] = useState<{
        username: string;
        password: string;
        nickname: string;
        expiresAt: number | null;
    } | null>(null);
    const [copied, setCopied] = useState(false);

    const handleGenerateUser = async (type: 'official' | 'test') => {
        if (type === 'official' && !phoneInput) {
            alert('请输入正式账号的手机号');
            return;
        }
        setIsGenerating(true);
        try {
            const response = await axios.post('/admin/users/generate', {
                type,
                phone: type === 'official' ? phoneInput : undefined
            });
            if (response.data.success) {
                setGenResult(response.data.data);
                setGenType(null);
                setPhoneInput('');
                // 刷新用户列表
                setPage(1);
                fetchUsers(1);
            }
        } catch (error: any) {
            alert(error.response?.data?.error || '生成用户失败');
        } finally {
            setIsGenerating(false);
        }
    };
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">用户管理</h2>
                        <p className="text-slate-500 font-medium">查看用户信息，修改权限或执行封禁操作。</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="搜索昵称或用户名..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setGenType('test')}
                            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                            <UserPlus size={14} />
                            生成测试用户
                        </button>
                        <button
                            onClick={() => setGenType('official')}
                            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95"
                        >
                            <UserPlus size={14} />
                            生成正式用户
                        </button>
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

                {/* 账号生成选择/输入弹窗 */}
                {genType && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setGenType(null)} />
                        <div className="relative bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                            <button 
                                onClick={() => setGenType(null)}
                                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                <X size={18} />
                            </button>
                            <h3 className="text-lg font-black text-slate-900 mb-2">
                                {genType === 'official' ? '生成正式用户' : '一键生成测试用户'}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium mb-6">
                                {genType === 'official' 
                                    ? '请输入客户的手机号以生成永久的系统账号。' 
                                    : '测试账号无须填写个人资料，将自动随机生成一个仅有效期 1 天的临时账号。'}
                            </p>

                            {genType === 'official' && (
                                <div className="space-y-2 mb-6">
                                    <label className="text-xs font-bold text-slate-700">客户手机号</label>
                                    <input 
                                        type="text"
                                        placeholder="请输入11位手机号"
                                        value={phoneInput}
                                        onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                                        maxLength={11}
                                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-2xl py-3 px-4 outline-none text-sm font-semibold transition-all text-slate-800"
                                    />
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setGenType(null)}
                                    className="px-5 py-2.5 rounded-2xl text-slate-500 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={() => handleGenerateUser(genType)}
                                    disabled={isGenerating}
                                    className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-600/15 transition-all cursor-pointer disabled:opacity-55"
                                >
                                    {isGenerating ? '正在生成...' : '立即生成'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 账号生成结果展示弹窗 */}
                {genResult && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setGenResult(null)} />
                        <div className="relative bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                            <button 
                                onClick={() => setGenResult(null)}
                                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                <X size={18} />
                            </button>
                            <div className="text-center mb-6">
                                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mb-3 font-semibold text-lg">🎉</span>
                                <h3 className="text-lg font-black text-slate-900">账号生成成功</h3>
                                <p className="text-xs text-slate-400 font-medium mt-1">请复制并妥善保管以下凭证以分发给用户</p>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4 mb-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
                                <div>
                                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">临时昵称</span>
                                    <p className="text-sm font-bold text-slate-800 mt-0.5">{genResult.nickname}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-t border-slate-200/50 pt-3">
                                    <div>
                                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">登录账号 (用户名)</span>
                                        <p className="text-sm font-extrabold text-indigo-600 mt-0.5 select-all">{genResult.username}</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">初始密码</span>
                                        <p className="text-sm font-extrabold text-purple-600 mt-0.5 select-all">{genResult.password}</p>
                                    </div>
                                </div>
                                <div className="border-t border-slate-200/50 pt-3">
                                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">有效期截止</span>
                                    <p className="text-xs font-bold text-slate-600 mt-0.5">
                                        {genResult.expiresAt 
                                            ? new Date(genResult.expiresAt).toLocaleString() 
                                            : '永久有效 (正式账号)'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    const textToCopy = `拾光集账号生成成功！\n昵称：${genResult.nickname}\n用户名/手机号：${genResult.username}\n初始密码：${genResult.password}\n有效期：${genResult.expiresAt ? new Date(genResult.expiresAt).toLocaleString() : '永久有效'}`;
                                    navigator.clipboard.writeText(textToCopy);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all duration-300 shadow-md cursor-pointer
                                    ${copied 
                                        ? 'bg-emerald-500 text-white shadow-emerald-500/10' 
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10 active:scale-[0.98]'}`}
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? '已复制到剪贴板！' : '一键复制账号信息'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
