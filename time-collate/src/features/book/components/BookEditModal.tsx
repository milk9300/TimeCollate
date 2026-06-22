import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Lock, Clock, CheckCircle2, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { getBookService } from '../../../services/serviceFactory';
import { useAuthStore } from '../../../store/useAuthStore';
import type { Book } from '../../../types';

interface BookEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (bookData: Partial<Book>) => Promise<void>;
    initialData?: Partial<Book>;
    title: string;
}

export const BOOK_CATEGORIES = [
    { id: 'travel', name: '旅行足迹', emoji: '✈️' },
    { id: 'baby', name: '宝贝成长', emoji: '👶' },
    { id: 'love', name: '恋爱纪念', emoji: '💑' },
    { id: 'graduation', name: '毕业青春', emoji: '🎓' },
    { id: 'pet', name: '萌宠日常', emoji: '🐾' }
];

/**
 * @description 书籍元数据极简编辑/新建弹窗 (封面个性化设计已移至编辑器边栏)
 */
export const BookEditModal: React.FC<BookEditModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    title
}) => {
    const { user } = useAuthStore();
    const [bookTitle, setBookTitle] = useState(initialData?.title || '');
    const [bookCategory, setBookCategory] = useState<string>(initialData?.category || '');
    const [isPublic, setIsPublic] = useState(initialData?.isPublic || false);
    const [status, setStatus] = useState<Book['status']>(initialData?.status || 'private');
    const [errors, setErrors] = useState<{ title?: string }>({});
    const [isSaving, setIsSaving] = useState(false);

    // 智能命名状态
    const [useAutoName, setUseAutoName] = useState(false);
    const [namePrefix, setNamePrefix] = useState('拾光集#');
    const [nameInitials, setNameInitials] = useState('zx');
    const [suffixType, setSuffixType] = useState<'number' | 'letters' | 'mixed' | 'custom'>('number');
    const [nameSuffix, setNameSuffix] = useState('');
    const [customSuffix, setCustomSuffix] = useState('');

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

    // 同步初始数据
    useEffect(() => {
        if (isOpen && initialData) {
            const titleVal = initialData.title || '';
            setBookTitle(titleVal);
            setIsPublic(!!initialData.isPublic);
            setStatus(initialData.status || 'private');
            setBookCategory(initialData.category || '');
            setErrors({}); // 重置错误

            // 初始化智能命名助手
            if (!titleVal) {
                setUseAutoName(true);
                setNamePrefix('拾光集#');
                setNameInitials('zx');
                setSuffixType('number');
                const initSuffix = generateRandomSuffix('number');
                setNameSuffix(initSuffix);
                setCustomSuffix('');
            } else {
                setUseAutoName(false);
            }
        }
    }, [isOpen, initialData]);

    // 自动合成书籍名称
    useEffect(() => {
        if (useAutoName) {
            const activeSuffix = suffixType === 'custom' ? customSuffix : nameSuffix;
            const generated = `${namePrefix}${nameInitials}${activeSuffix}`;
            setBookTitle(generated);
            if (errors.title) setErrors({});
        }
    }, [useAutoName, namePrefix, nameInitials, suffixType, nameSuffix, customSuffix]);

    // 禁止背景滚动
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleWithdraw = async () => {
        if (!initialData?.id) return;
        setIsSaving(true);
        try {
            const bookService = getBookService();
            await bookService.updateStatus(initialData.id, 'private');
            setStatus('private');
            setIsPublic(false);
        } catch (error) {
            console.error('Failed to withdraw book:', error);
            alert('撤回失败，请稍后重试');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        // 校验
        if (!bookTitle.trim()) {
            setErrors({ title: '请输入书籍名称' });
            return;
        }

        setIsSaving(true);
        try {
            // 如果是已有书籍，保留其封面配置；如果是新书，则使用默认的棉麻暖白经典封面
            const finalCoverUrl = initialData?.coverUrl || 'design://?layout=classic&bg=cotton-white';
            const finalCoverOssKey = initialData?.coverOssKey || undefined;

            await onSave({
                title: bookTitle.trim(),
                author: user?.nickname || '时光记录者',
                coverUrl: finalCoverUrl,
                coverOssKey: finalCoverOssKey,
                isPublic: isPublic,
                status: status,
                category: bookCategory || undefined,
            });

            // 如果是已有书籍，且状态在弹窗内被变更为 pending
            if (initialData?.id && status !== initialData.status) {
                const bookService = getBookService();
                await bookService.updateStatus(initialData.id, status || 'private');
            }

            onClose();
        } catch (error) {
            console.error('Failed to save book info:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/45 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* 弹窗主体 */}
            <div className="relative w-full max-w-[500px] max-h-[90vh] bg-white rounded-[32px] shadow-2xl border border-gray-100 
                          flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-['Outfit',_sans-serif]">

                {/* 顶部彩色装饰条 */}
                <div className="h-2 w-full bg-gradient-to-r from-indigo-500 to-purple-500 shrink-0" />

                {/* 固定 Header */}
                <div className="px-8 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-black text-[#18181B]">{title}</h3>
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 rounded-full hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 内容区 */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 min-h-0">
                    {/* 名称输入 */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">
                            书籍名称
                        </label>
                        <input
                            type="text"
                            value={bookTitle}
                            onChange={(e) => {
                                setBookTitle(e.target.value);
                                setUseAutoName(false); // 手动修改时断开自动命名绑定
                                if (errors.title) setErrors({});
                            }}
                            placeholder="输入合集名称..."
                            disabled={status === 'pending' || status === 'published'}
                            className={`w-full bg-gray-50/50 border-2 rounded-2xl py-3.5 px-5 text-[#18181B] font-bold placeholder-[#94A3B8] 
                                     focus:border-indigo-500 focus:bg-white transition-all outline-none ${errors.title ? 'border-red-500 bg-red-50/30' : 'border-transparent'
                                } ${(status === 'pending' || status === 'published') ? 'opacity-65 cursor-not-allowed' : ''}`}
                        />
                        {errors.title && (
                            <p className="text-xs text-red-500 mt-1 font-bold ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                {errors.title}
                            </p>
                        )}
                    </div>

                    {/* 智能自动命名助手 */}
                    <div className="border border-slate-100/80 rounded-2xl p-4 bg-slate-50/40 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Sparkles size={14} className="text-indigo-600 animate-pulse" />
                                <span className="text-xs font-black text-slate-700">智能命名助手</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={useAutoName}
                                    onChange={(e) => setUseAutoName(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                                <span className="text-[10px] font-black text-slate-500 ml-1.5">自动生成</span>
                            </label>
                        </div>

                        {useAutoName && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-slate-100/60 animate-in fade-in slide-in-from-top-1 duration-250">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">名称前缀</label>
                                    <input
                                        type="text"
                                        value={namePrefix}
                                        onChange={(e) => setNamePrefix(e.target.value)}
                                        placeholder="例: 拾光集#"
                                        className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">双字母标识</label>
                                    <input
                                        type="text"
                                        value={nameInitials}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 2);
                                            setNameInitials(val);
                                        }}
                                        placeholder="例: zx"
                                        maxLength={2}
                                        className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">后缀模式</label>
                                    <select
                                        value={suffixType}
                                        onChange={(e) => handleSuffixTypeChange(e.target.value as any)}
                                        className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold rounded-lg focus:border-indigo-500 outline-none cursor-pointer transition-all"
                                    >
                                        <option value="number">随机 3 位数字 (如 082)</option>
                                        <option value="letters">随机 3 位字母 (如 abc)</option>
                                        <option value="mixed">随机 3 位混编 (如 9k2)</option>
                                        <option value="custom">自定义后缀</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1 justify-end">
                                    {suffixType === 'custom' ? (
                                        <input
                                            type="text"
                                            value={customSuffix}
                                            onChange={(e) => setCustomSuffix(e.target.value)}
                                            placeholder="输入自定义后缀内容"
                                            className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-1.5">
                                            <div className="flex-1 px-3 py-1.5 bg-slate-100 border border-slate-150 text-[11px] font-bold text-slate-650 rounded-lg flex items-center justify-between">
                                                <span>当前后缀: {nameSuffix}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleRegenerateSuffix}
                                                className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all text-slate-500 hover:text-indigo-650 active:scale-95 flex items-center justify-center shrink-0"
                                                title="随机换一个"
                                            >
                                                <RefreshCw size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 书籍分类选择 */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1 block">
                            书籍分类
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {BOOK_CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setBookCategory(cat.id)}
                                    disabled={status === 'pending' || status === 'published'}
                                    className={`py-2 px-3.5 text-xs font-bold border-2 rounded-xl transition-all flex items-center gap-1.5 ${
                                        bookCategory === cat.id 
                                            ? 'border-indigo-600 bg-indigo-50/40 text-indigo-600' 
                                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                    } ${(status === 'pending' || status === 'published') ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}`}
                                >
                                    <span>{cat.emoji}</span>
                                    <span>{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 发布审核状态控制 (仅在已有书籍编辑模式下显示) */}
                    {initialData?.id && (
                        <div className="space-y-2 pt-1 border-t border-gray-100 pt-5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1 block">
                                隐私与广场发布
                            </label>
                            
                            {(status === 'pending' || status === 'published') ? (
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            {status === 'pending' ? (
                                                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center animate-pulse shrink-0">
                                                    <Clock size={16} />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                                    <CheckCircle2 size={16} />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-xs font-black text-slate-900">
                                                    {status === 'pending' ? '审核进行中（暂时不可编辑）' : '已公开至广场大厅（可撤回以编辑）'}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    {status === 'pending' ? '管理员正在审核，请耐心等待' : '其他用户可在广场大厅中浏览此书'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleWithdraw}
                                            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[11px] font-black transition-all shrink-0 flex items-center gap-1 active:scale-95 cursor-pointer"
                                        >
                                            撤回发布
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                                {status === 'rejected' ? (
                                                    <span className="text-red-500 flex items-center gap-1"><AlertCircle size={14} /> 审核未通过：公开申请被退回</span>
                                                ) : (
                                                    <span className="text-slate-700 flex items-center gap-1"><Lock size={14} /> 私密时光集（仅自己可见）</span>
                                                )}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                开启发布后，此书将提交至广场大厅进行审核。审核通过后，所有人均可浏览。
                                            </p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={(status as any) === 'pending'}
                                                onChange={(e) => {
                                                    const shouldPublish = e.target.checked;
                                                    setStatus(shouldPublish ? 'pending' : 'private');
                                                    setIsPublic(shouldPublish);
                                                }}
                                                className="sr-only peer"
                                            />
                                            <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 固定 Footer */}
                <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
                    <div className="text-[10px] font-medium text-slate-400 max-w-[200px]">
                        {status === 'pending' && <span className="text-amber-500 flex items-center gap-1">⏱️ 审核中，暂时不可编辑</span>}
                        {status === 'published' && <span className="text-emerald-500 flex items-center gap-1">🟢 已公开发布，撤回后可编辑</span>}
                        {status === 'rejected' && <span className="text-red-500 flex items-center gap-1 font-bold">❌ 审核未通过，请修改重新提交</span>}
                        {status === 'private' && <span className="text-slate-400 flex items-center gap-1">🔒 私密作品，仅自己可见</span>}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-500 bg-white border border-gray-200 
                                     hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 cursor-pointer"
                        >
                            取消
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black text-white bg-[#18181B] 
                                     hover:bg-black transition-all duration-200 shadow-xl shadow-gray-200 disabled:opacity-50 active:scale-95 cursor-pointer"
                        >
                            {isSaving ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Save size={14} />
                            )}
                            完成设置
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
