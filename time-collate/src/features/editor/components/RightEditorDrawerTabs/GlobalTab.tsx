import React, { useState, useEffect } from 'react';
import { useBookStore } from '../../../../store';
import { useAuthStore } from '../../../../store/useAuthStore';
import { getBookService } from '../../../../services/serviceFactory';
import { PAGE_SIZES, type PageSize } from '../../../../rendering/PhysicalConstants';
import { BOOK_CATEGORIES } from '../../../book/components/BookEditModal';
import {
    Sparkles,
    Lock,
    Clock,
    CheckCircle2,
    AlertCircle,
    RefreshCw
} from 'lucide-react';

export const GlobalTab: React.FC = () => {
    const currentBook = useBookStore((state: any) => state.currentBook);
    const updateBookSettings = useBookStore((state: any) => state.updateBookSettings);
    const { user } = useAuthStore();

    // 智能自动命名状态与后缀生成逻辑
    const generateRandomSuffix = (type: 'number' | 'letters' | 'mixed') => {
        if (type === 'number') {
            const num = Math.floor(Math.random() * 1000); // 0-999
            return num.toString().padStart(3, '0');
        } else if (type === 'letters') {
            const chars = 'abcdefghijklmnopqrstuvwxyz';
            let res = '';
            for (let i = 0; i < 3; i++) {
                res += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return res;
        } else {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let res = '';
            for (let i = 0; i < 3; i++) {
                res += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return res;
        }
    };

    const [useAutoName, setUseAutoName] = useState(false);
    const [namePrefix, setNamePrefix] = useState('拾光集#');
    const [nameInitials, setNameInitials] = useState('zx');
    const [suffixType, setSuffixType] = useState<'number' | 'letters' | 'mixed' | 'custom'>('number');
    const [nameSuffix, setNameSuffix] = useState(() => generateRandomSuffix('number'));
    const [customSuffix, setCustomSuffix] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSuffixTypeChange = (type: 'number' | 'letters' | 'mixed' | 'custom') => {
        setSuffixType(type);
        if (type !== 'custom') {
            const newSuffix = generateRandomSuffix(type);
            setNameSuffix(newSuffix);
        }
    };

    const handleRegenerateSuffix = () => {
        if (suffixType !== 'custom') {
            const newSuffix = generateRandomSuffix(suffixType);
            setNameSuffix(newSuffix);
        }
    };

    // 自动命名的副作用绑定到书名
    useEffect(() => {
        if (useAutoName && currentBook) {
            const actualSuffix = suffixType === 'custom' ? customSuffix : nameSuffix;
            const newTitle = `${namePrefix}${nameInitials.toUpperCase()}-${actualSuffix}`;
            // 避免重复更新引发死循环
            if (currentBook.title !== newTitle) {
                updateBookSettings({ title: newTitle });
            }
        }
    }, [useAutoName, namePrefix, nameInitials, suffixType, nameSuffix, customSuffix, updateBookSettings, currentBook]);

    if (!currentBook) return null;

    const isLocked = currentBook.status === 'pending' || currentBook.status === 'published';

    const handleWithdraw = async () => {
        setIsSaving(true);
        try {
            const bookService = getBookService();
            await bookService.updateStatus(currentBook.id, 'private');
            updateBookSettings({ status: 'private', isPublic: false });
        } catch (error) {
            console.error('Failed to withdraw book:', error);
            alert('撤回失败，请稍后重试');
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusToggle = async (checked: boolean) => {
        const newStatus = checked ? 'pending' : 'private';
        setIsSaving(true);
        try {
            const bookService = getBookService();
            await bookService.updateStatus(currentBook.id, newStatus);
            updateBookSettings({ status: newStatus, isPublic: checked });
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('更新发布状态失败');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 text-xs text-gray-650 font-['Outfit',_sans-serif]">
            {/* 1. 书籍名称编辑 */}
            <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 block">
                    书籍名称
                </label>
                <input
                    type="text"
                    value={currentBook.title || ''}
                    disabled={isLocked}
                    onChange={(e) => {
                        setUseAutoName(false); // 手动修改断开自动命名绑定
                        updateBookSettings({ title: e.target.value });
                    }}
                    placeholder="输入书籍名称..."
                    className={`w-full bg-white border border-gray-200/90 rounded-xl py-2 px-3 text-slate-800 font-bold placeholder-slate-400 outline-none transition-all focus:border-indigo-655 focus:ring-1 focus:ring-indigo-655 ${
                        isLocked ? 'opacity-65 cursor-not-allowed' : ''
                    }`}
                />
            </div>

            {/* 2. 智能自动命名助手 (折叠展示) */}
            {!isLocked && (
                <div className="border border-slate-150 rounded-xl p-3 bg-white/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Sparkles size={13} className="text-indigo-600 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-700">智能命名助手</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={useAutoName}
                                onChange={(e) => setUseAutoName(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-655"></div>
                        </label>
                    </div>

                    {useAutoName && (
                        <div className="space-y-2 pt-2 border-t border-slate-150/60 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex gap-2">
                                <div className="flex-1 flex flex-col gap-0.5">
                                    <label className="text-[8px] font-bold text-slate-400 uppercase">前缀</label>
                                    <input
                                        type="text"
                                        value={namePrefix}
                                        onChange={(e) => setNamePrefix(e.target.value)}
                                        className="px-2.5 py-1 bg-white border border-slate-200 text-[10px] font-bold rounded-lg outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div className="flex-1 flex flex-col gap-0.5">
                                    <label className="text-[8px] font-bold text-slate-400 uppercase">标识</label>
                                    <input
                                        type="text"
                                        value={nameInitials}
                                        maxLength={2}
                                        onChange={(e) => setNameInitials(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 2))}
                                        className="px-2.5 py-1 bg-white border border-slate-200 text-[10px] font-bold rounded-lg outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-0.5">
                                <label className="text-[8px] font-bold text-slate-400 uppercase">模式</label>
                                <select
                                    value={suffixType}
                                    onChange={(e) => handleSuffixTypeChange(e.target.value as any)}
                                    className="px-2 py-1 bg-white border border-slate-200 text-[10px] font-bold rounded-lg outline-none cursor-pointer"
                                >
                                    <option value="number">随机数字 (如 028)</option>
                                    <option value="letters">随机字母 (如 kfy)</option>
                                    <option value="mixed">随机混编 (如 7m3)</option>
                                    <option value="custom">自定义后缀</option>
                                </select>
                            </div>

                            {suffixType === 'custom' ? (
                                <input
                                    type="text"
                                    value={customSuffix}
                                    onChange={(e) => setCustomSuffix(e.target.value)}
                                    placeholder="输入自定义后缀..."
                                    className="w-full px-2.5 py-1 bg-white border border-slate-200 text-[10px] font-bold rounded-lg outline-none focus:border-indigo-500"
                                />
                            ) : (
                                <div className="flex items-center gap-1.5 pt-0.5">
                                    <div className="flex-1 px-2 py-1 bg-slate-100 border border-slate-150 text-[9px] font-black text-slate-600 rounded-lg flex items-center justify-between">
                                        <span>后缀: {nameSuffix}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRegenerateSuffix}
                                        className="p-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all text-slate-500 hover:text-indigo-650 flex items-center justify-center shrink-0"
                                    >
                                        <RefreshCw size={11} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 3. 作者署名编辑 */}
            <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 block">
                    作者署名
                </label>
                <input
                    type="text"
                    value={currentBook.author || ''}
                    disabled={isLocked}
                    onChange={(e) => updateBookSettings({ author: e.target.value })}
                    placeholder="输入作者署名..."
                    className={`w-full bg-white border border-gray-200/90 rounded-xl py-2 px-3 text-slate-800 font-bold placeholder-slate-400 outline-none transition-all focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650 ${
                        isLocked ? 'opacity-65 cursor-not-allowed' : ''
                    }`}
                />
            </div>

            {/* 4. 书籍分类选择 */}
            <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 block">
                    所属分类
                </label>
                <div className="flex flex-wrap gap-1.5">
                    {BOOK_CATEGORIES.map((cat: any) => (
                        <button
                            key={cat.id}
                            type="button"
                            disabled={isLocked}
                            onClick={() => updateBookSettings({ category: cat.id })}
                            className={`py-1.5 px-2.5 text-[10px] font-bold border-2 rounded-xl transition-all flex items-center gap-1 ${
                                currentBook.category === cat.id 
                                    ? 'border-indigo-650 bg-indigo-50/30 text-indigo-655 font-black' 
                                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                            } ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.01]'}`}
                        >
                            <span>{cat.emoji}</span>
                            <span>{cat.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 5. 全局纸张规格 */}
            <div className="space-y-2 border-t border-gray-100 pt-4">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-0.5">
                    全局纸张规格
                </div>
                <select
                    value={currentBook.pageSize}
                    onChange={(e) => updateBookSettings({ pageSize: e.target.value as PageSize })}
                    className="w-full text-xs font-bold bg-white hover:bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none text-gray-700 transition-colors cursor-pointer"
                >
                    {Object.entries(PAGE_SIZES).map(([key, val]) => {
                        const pageVal = val as any;
                        return (
                            <option key={key} value={key}>{pageVal.name} ({pageVal.width}x{pageVal.height}mm)</option>
                        );
                    })}
                </select>
            </div>

            {/* 6. 广场发布与隐私控制项 */}
            <div className="space-y-2 border-t border-gray-100/70 pt-4">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 block">
                    隐私与广场发布
                </label>
                
                {(currentBook.status === 'pending' || currentBook.status === 'published') ? (
                    <div className="bg-white border border-slate-150 rounded-xl p-3">
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center gap-2">
                                {currentBook.status === 'pending' ? (
                                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center animate-pulse shrink-0">
                                        <Clock size={13} />
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={13} />
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] font-black text-slate-800 leading-tight">
                                        {currentBook.status === 'pending' ? '审核中 (当前锁定)' : '已公开至大厅 (当前锁定)'}
                                    </p>
                                    <p className="text-[8px] text-slate-450 mt-0.5 font-medium leading-normal">
                                        {currentBook.status === 'pending' ? '管理员正在审核内容，请耐心等待' : '其他用户可在广场大厅中浏览此书'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={handleWithdraw}
                                className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 active:scale-[0.98] cursor-pointer"
                            >
                                {isSaving && <Clock size={11} className="animate-spin" />}
                                撤回发布以修改
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-150 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5 leading-normal">
                                <p className="text-[10px] font-black text-slate-800 flex items-center gap-1">
                                    {currentBook.status === 'rejected' ? (
                                        <span className="text-red-500 flex items-center gap-0.5"><AlertCircle size={12} /> 公开申请被退回</span>
                                    ) : (
                                        <span className="text-slate-700 flex items-center gap-0.5"><Lock size={12} /> 私密时光集（仅自己可见）</span>
                                    )}
                                </p>
                                <p className="text-[8px] text-slate-400 font-medium">
                                    开启后将提交至广场审核。审核通过后，所有人均可在大厅中浏览。
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-0.5">
                                <input
                                    type="checkbox"
                                    disabled={isSaving}
                                    checked={(currentBook.status as any) === 'pending'}
                                    onChange={(e) => handleStatusToggle(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
