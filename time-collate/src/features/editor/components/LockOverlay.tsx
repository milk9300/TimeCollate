import React from 'react';
import { Lock } from 'lucide-react';

interface LockOverlayProps {
    onUnlock: () => void;
    message?: string;
}

export const LockOverlay: React.FC<LockOverlayProps> = ({ onUnlock, message = "作品已发布，编辑将转为私密状态" }) => {
    return (
        <div className="absolute inset-0 z-[60] bg-white/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-500">
            <div className="flex flex-col items-center gap-4 p-8 bg-white/90 backdrop-blur-md rounded-[32px] shadow-2xl border border-white/50 transform hover:scale-105 transition-transform">
                <button
                    onClick={onUnlock}
                    className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-slate-800 transition-all active:scale-90 group"
                >
                    <Lock size={24} className="group-hover:rotate-12 transition-transform" />
                </button>
                <div className="text-center">
                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">{message}</p>
                    <p className="text-[10px] text-slate-400 font-bold">点击解锁以继续编辑</p>
                </div>
            </div>
        </div>
    );
};
