import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, ArrowRight, MessageCircle, Phone, Sparkles } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../../store/useAuthStore';
import { AuthLayout } from '../components/AuthLayout';
import logoImg from '../../../assets/logo.png';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const setAuth = useAuthStore(state => state.setAuth);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const isLocal = import.meta.env.VITE_STORAGE_MODE !== 'cloud';
        if (isLocal) {
            const user = {
                id: 'local-user-id',
                nickname: username || '本地管理员',
                username: username || 'admin@admin.com',
                createdAt: Date.now(),
                role: 'admin',
                status: 'active'
            };
            setAuth(user as any, 'local-mock-token');
            navigate('/');
            setIsLoading(false);
            return;
        }

        try {
            const response = await axios.post('/auth/login', { username, password });
            if (response.data.success) {
                const { user, token } = response.data.data;
                setAuth(user, token);
                navigate('/');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || '登录失败，请检查用户名或密码');
        } finally {
            setIsLoading(false);
        }
    };

    const handleComingSoon = () => {
        alert('该登录方式正在快马加鞭准备中，敬请期待！');
    };

    return (
        <AuthLayout>
            <div className="w-full glass-login rounded-[28px] p-8 relative animate-in fade-in zoom-in duration-500">
                <div className="flex flex-col items-center text-center mb-6">
                    <img src={logoImg} alt="拾光集 Logo" className="w-20 h-20 object-contain mb-4 drop-shadow-lg" />
                    <h1 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">欢迎回来</h1>
                    <p className="text-gray-500 font-medium text-sm">时光笔记，珍藏每一刻的美好</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700 ml-1">用户名 / 邮箱</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full input-login rounded-2xl py-3.5 pl-12 pr-6 focus:outline-none placeholder:text-gray-400 font-medium text-gray-800 text-sm"
                                placeholder="输入您的账号"
                                required
                                tabIndex={1}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-xs font-bold text-gray-700">密码</label>
                            <button type="button" tabIndex={4} className="text-xs text-indigo-600 font-bold hover:text-indigo-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-1">忘记密码？</button>
                        </div>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full input-login rounded-2xl py-3.5 pl-12 pr-6 focus:outline-none placeholder:text-gray-400 font-medium text-gray-800 text-sm"
                                placeholder="输入您的密码"
                                required
                                tabIndex={2}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50/80 backdrop-blur-sm text-red-500 text-sm font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2 duration-300 border border-red-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        tabIndex={3}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl py-3.5 font-black tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20 active:scale-[0.98] hover:scale-[1.01] transition-all duration-300 disabled:opacity-50 cursor-pointer text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
                    >
                        {isLoading ? '正在登录...' : '开始记录时光'}
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-500 text-xs font-medium">
                        还没有账号？{' '}
                        <Link to="/register" tabIndex={5} className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors decoration-2 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-1">立即注册</Link>
                    </p>
                </div>

                <div className="mt-6">
                    <div className="relative flex items-center justify-center mb-5">
                        <div className="w-full h-px bg-white/30" />
                        <span className="absolute bg-white/40 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full text-[10px] font-bold text-indigo-900/60 tracking-widest uppercase">或者使用</span>
                    </div>

                    <div className="flex items-center justify-center gap-6">
                        <button
                            onClick={handleComingSoon}
                            className="flex items-center justify-center w-14 h-14 bg-white/75 hover:bg-white border-0 rounded-full shadow-[0_4px_12px_rgba(255,255,255,0.8),_0_2px_4px_rgba(0,0,0,0.04)] active:scale-95 transition-all duration-300 group cursor-pointer"
                            title="微信登录"
                        >
                            <MessageCircle className="text-gray-400 group-hover:text-[#07C160] transition-colors" size={24} />
                        </button>
                        <button
                            onClick={handleComingSoon}
                            className="flex items-center justify-center w-14 h-14 bg-white/75 hover:bg-white border-0 rounded-full shadow-[0_4px_12px_rgba(255,255,255,0.8),_0_2px_4px_rgba(0,0,0,0.04)] active:scale-95 transition-all duration-300 group cursor-pointer"
                            title="手机登录"
                        >
                            <Phone className="text-gray-400 group-hover:text-indigo-600 transition-colors" size={22} />
                        </button>
                    </div>
                </div>
            </div>
        </AuthLayout>
    );
};
