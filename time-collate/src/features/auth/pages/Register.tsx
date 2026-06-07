import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, ArrowRight, UserCircle, Sparkles } from 'lucide-react';
import axios from 'axios';
import { AuthLayout } from '../components/AuthLayout';

export const Register: React.FC = () => {
    const navigate = useNavigate();

    const [nickname, setNickname] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        // 校验两次密码是否一致
        if (password !== confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }

        setIsLoading(true);
        setError('');

        const isLocal = import.meta.env.VITE_STORAGE_MODE !== 'cloud';
        if (isLocal) {
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 2000);
            setIsLoading(false);
            return;
        }

        try {
            const response = await axios.post('/auth/register', { nickname, username, password });
            if (response.data.success) {
                setSuccess(true);
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || '注册失败，请稍后再试');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <AuthLayout>
                <div className="w-full glass-login rounded-[32px] p-10 text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-green-100/80 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-inner">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">注册成功！</h2>
                    <p className="text-gray-600 font-medium">时光笔记的大门已为您开启，正在跳转到登录页...</p>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <div className="w-full glass-login rounded-[28px] p-8 relative animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">开启时光之旅</h1>
                    <p className="text-gray-500 font-medium text-sm">只需几秒，记录每一个珍贵瞬间</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">昵称 / 显示名称</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors">
                                <UserCircle size={18} />
                            </div>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className="w-full input-login rounded-2xl py-3.5 pl-12 pr-6 focus:outline-none placeholder:text-gray-400 font-medium text-gray-800 text-sm"
                                placeholder="您想被如何称呼？"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">用户名 / 邮箱</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors">
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full input-login rounded-2xl py-3.5 pl-12 pr-6 focus:outline-none placeholder:text-gray-400 font-medium text-gray-800 text-sm"
                                placeholder="作为登录账号使用"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">设置密码</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full input-login rounded-2xl py-3.5 pl-12 pr-6 focus:outline-none placeholder:text-gray-400 font-medium text-gray-800 text-sm"
                                placeholder="输入您的安全密码"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">确认密码</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full input-login rounded-2xl py-3.5 pl-12 pr-6 focus:outline-none placeholder:text-gray-400 font-medium text-gray-800 text-sm"
                                placeholder="再次输入密码"
                                required
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
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl py-3.5 font-black tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-purple-600/20 active:scale-[0.98] hover:scale-[1.01] transition-all duration-300 disabled:opacity-50 cursor-pointer text-sm"
                    >
                        {isLoading ? '正在开启时光门...' : '立即注册'}
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-500 text-xs font-medium">
                        已经有时光笔记了？{' '}
                        <Link to="/login" className="text-purple-600 font-bold hover:text-purple-800 transition-colors decoration-2 underline-offset-4">点此登录</Link>
                    </p>
                </div>
            </div>
        </AuthLayout>
    );
};
