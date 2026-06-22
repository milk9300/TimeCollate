import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Heart, Zap } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../../store/useAuthStore';

interface AnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ isOpen, onClose, content }) => {
    const { updateUser } = useAuthStore();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (isOpen) {
            setCountdown(5); // 重新打开时重置倒计时
        }
    }, [isOpen]);

    // 倒计时逻辑
    useEffect(() => {
        let timer: any;
        if (isOpen && countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isOpen, countdown]);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (countdown > 0) return; // 安全检查

        try {
            // 1. 同步服务端状态
            await axios.put('/auth/announcement-seen');
            // 2. 更新本地状态
            updateUser({ hasSeenAnnouncement: true });
            onClose();
        } catch (error) {
            console.error('Failed to update announcement status:', error);
            // 即使失败也关闭，避免阻碍用户
            onClose();
        }
    };

    const isButtonDisabled = countdown > 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* 背景遮罩 - 极简磨砂 */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500" />

            {/* 弹窗主体 */}
            <div className="relative w-full max-w-xl bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 delay-150">
                {/* 内容区域 */}
                <div className="p-8">
                    {/* 整合后的头部栏 */}
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 leading-none mb-1.5">系统公告</h2>
                                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">System Announcement</p>
                            </div>
                        </div>
                        {/* 装饰性的小标签 */}
                        <div className="hidden sm:block px-3 py-1 bg-indigo-600/5 text-indigo-600 text-[10px] font-bold rounded-full border border-indigo-600/10">
                            NEW UPDATE
                        </div>
                    </div>

                    {/* 公告核心内容 */}
                    <div className="space-y-6 mb-8">
                        {content ? (
                            <div className="max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar text-slate-700 text-base leading-relaxed whitespace-pre-wrap font-medium">
                                <div className="bg-slate-50/50 p-8 rounded-[24px] border border-slate-100/80 shadow-sm">
                                    {content}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <FeatureItem
                                    icon={<Zap className="text-amber-500" size={20} />}
                                    title="灵动编辑器"
                                    desc="沉浸式的排版体验，让您的回忆焕发新生。"
                                />
                                <FeatureItem
                                    icon={<ShieldCheck className="text-emerald-500" size={20} />}
                                    title="私密与安全"
                                    desc="您的数据采用加密存储，且完全由您决定是否公开。"
                                />
                                <FeatureItem
                                    icon={<Heart className="text-rose-500" size={20} />}
                                    title="多维反馈"
                                    desc="全新反馈中心上线，倾听每一位时光记录者的声音。"
                                />
                            </div>
                        )}
                    </div>

                    {/* 底部按钮区域 */}
                    <div className="pt-2">
                        <button
                            onClick={handleConfirm}
                            disabled={isButtonDisabled}
                            className={`w-full flex items-center justify-center gap-2 py-4.5 rounded-2xl font-bold transition-all duration-300 shadow-lg group active:scale-[0.98]
                                      ${isButtonDisabled
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 hover:shadow-indigo-200'}`}
                        >
                            <span className="text-lg">立即开启拾光之旅 {isButtonDisabled && `(${countdown}s)`}</span>
                            {!isButtonDisabled && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                        </button>
                        <p className="text-center text-slate-400 text-xs mt-4 font-medium opacity-60">
                            点击按钮即表示您已阅读并知晓上述公告内容
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex items-start gap-4">
            <div className="mt-1 w-10 h-10 shrink-0 bg-slate-50 rounded-xl flex items-center justify-center">
                {icon}
            </div>
            <div>
                <h4 className="font-bold text-slate-900 text-sm mb-0.5">{title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
