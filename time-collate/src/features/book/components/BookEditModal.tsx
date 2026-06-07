import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Upload, Save, Loader2, Lock, Clock, CheckCircle2, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { getBookService } from '../../../services/serviceFactory';
import { useAuthStore } from '../../../store/useAuthStore';
import type { Book, Photo } from '../../../types';
import { GeneratedCover, COVER_PRESET_BACKGROUNDS, parseCoverUrl } from '../../editor/components/GeneratedCover';

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
 * 书籍元数据编辑弹窗
 * 提供一体化、数据同源的封面个性配置面板 (合并背景、版式与配图上传)
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
    const [isUploading, setIsUploading] = useState(false);

    // 封面样式 States (统一由 design:// 序列化协议接管)
    const [designLayout, setDesignLayout] = useState<'classic' | 'minimal' | 'modern' | 'art'>('classic');
    const [designBg, setDesignBg] = useState('cotton-white');
    const [uploadedCoverUrl, setUploadedCoverUrl] = useState<string>(''); // 记录上传的图片 URL
    const [uploadedOssKey, setUploadedOssKey] = useState<string>(''); // 记录上传的 OSS Key

    const fileInputRef = useRef<HTMLInputElement>(null);

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

            // 解析封面配置 (不管是普通图还是 design://, parseCoverUrl 均有高兼容解析)
            const initialCover = initialData.coverThumbnailUrl || initialData.coverUrl || '';
            const parsed = parseCoverUrl(initialCover, titleVal);
            setDesignLayout(parsed.layout);
            setDesignBg(parsed.bgId);
            setUploadedCoverUrl(parsed.image || '');
            setUploadedOssKey(initialData.coverOssKey || parsed.ossKey || '');
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

    // 实时计算用于左侧预览的 design:// 协议串
    const previewCoverUrl = useMemo(() => {
        let url = `design://?layout=${designLayout}&bg=${designBg}`;
        if (uploadedCoverUrl) {
            url += `&image=${encodeURIComponent(uploadedCoverUrl)}`;
        }
        if (uploadedOssKey) {
            url += `&ossKey=${encodeURIComponent(uploadedOssKey)}`;
        }
        return url;
    }, [designLayout, designBg, uploadedCoverUrl, uploadedOssKey]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const bookService = getBookService();
            const photo: Photo = await bookService.uploadPhoto(file);
            setUploadedCoverUrl(photo.url);
            setUploadedOssKey(photo.ossKey || '');
        } catch (error) {
            console.error('Failed to upload cover:', error);
            alert('上传封面失败');
        } finally {
            setIsUploading(false);
        }
    };

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
            // 拼装大一统 design 封面链接
            let finalCoverUrl = `design://?layout=${designLayout}&bg=${designBg}`;
            if (uploadedCoverUrl) {
                finalCoverUrl += `&image=${encodeURIComponent(uploadedCoverUrl)}`;
            }
            if (uploadedOssKey) {
                finalCoverUrl += `&ossKey=${encodeURIComponent(uploadedOssKey)}`;
            }

            await onSave({
                title: bookTitle.trim(),
                author: user?.nickname || '时光记录者',
                coverUrl: finalCoverUrl,
                coverOssKey: uploadedOssKey || undefined,
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

    const renderLayoutWireframe = (layout: 'classic' | 'minimal' | 'modern' | 'art') => {
        const isSelected = designLayout === layout;
        const strokeColor = isSelected ? 'stroke-indigo-600' : 'stroke-slate-400';
        const fillColor = isSelected ? 'fill-indigo-50' : 'fill-slate-50';
        
        switch (layout) {
            case 'classic':
                return (
                    <svg className="w-12 h-16 mx-auto mb-2 border border-slate-200 rounded p-1 bg-white" viewBox="0 0 24 32">
                        <rect x="2" y="2" width="20" height="28" rx="1" fill="none" className={strokeColor} strokeWidth="1" />
                        <rect x="4" y="4" width="16" height="24" rx="0.5" fill="none" className={strokeColor} strokeWidth="0.5" strokeDasharray="1 1" />
                        <rect x="10" y="8" width="4" height="4" rx="0.5" className={`${strokeColor} ${fillColor}`} strokeWidth="1" />
                        <line x1="8" y1="16" x2="16" y2="16" className={strokeColor} strokeWidth="1" strokeLinecap="round" />
                        <line x1="10" y1="20" x2="14" y2="20" className={strokeColor} strokeWidth="1" strokeLinecap="round" />
                    </svg>
                );
            case 'minimal':
                return (
                    <svg className="w-12 h-16 mx-auto mb-2 border border-slate-200 rounded p-1 bg-white" viewBox="0 0 24 32">
                        <rect x="2" y="2" width="20" height="28" rx="1" fill="none" className={strokeColor} strokeWidth="1" />
                        <line x1="5" y1="6" x2="12" y2="6" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
                        <rect x="5" y="10" width="10" height="12" rx="0.5" className={`${strokeColor} ${fillColor}`} strokeWidth="0.8" />
                        <line x1="5" y1="25" x2="15" y2="25" className={strokeColor} strokeWidth="1" strokeLinecap="round" />
                    </svg>
                );
            case 'modern':
                return (
                    <svg className="w-12 h-16 mx-auto mb-2 border border-slate-200 rounded p-1 bg-white" viewBox="0 0 24 32">
                        <rect x="2" y="2" width="20" height="28" rx="1" fill="none" className={strokeColor} strokeWidth="1" />
                        <line x1="2" y1="12" x2="22" y2="12" className={strokeColor} strokeWidth="0.5" strokeDasharray="1 1" />
                        <line x1="7" y1="2" x2="7" y2="30" className={strokeColor} strokeWidth="0.5" strokeDasharray="1 1" />
                        <line x1="9" y1="6" x2="18" y2="6" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="9" y1="9" x2="15" y2="9" className={strokeColor} strokeWidth="1" strokeLinecap="round" />
                        <rect x="9" y="14" width="12" height="9" rx="0.5" className={`${strokeColor} ${fillColor}`} strokeWidth="0.8" />
                    </svg>
                );
            case 'art':
                return (
                    <svg className="w-12 h-16 mx-auto mb-2 border border-slate-200 rounded p-1 bg-white" viewBox="0 0 24 32">
                        <rect x="2" y="2" width="20" height="28" rx="1" fill="none" className={strokeColor} strokeWidth="1" />
                        <path d="M12,6 C16,6 18,10 18,14 L6,14 C6,10 8,6 12,6 Z" className={`${strokeColor} ${fillColor}`} strokeWidth="0.8" />
                        <circle cx="12" cy="18" r="4" className={`${strokeColor} ${fillColor}`} strokeWidth="0.8" />
                        <rect x="5" y="24" width="14" height="4" rx="0.5" fill="none" className={strokeColor} strokeWidth="0.8" />
                    </svg>
                );
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
            <div className="relative w-full max-w-[840px] max-h-[85vh] bg-white rounded-[32px] shadow-2xl border border-gray-100 
                          flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* 顶部彩色装饰条 */}
                <div className="h-2 w-full bg-gradient-to-r from-indigo-500 to-purple-500 shrink-0" />

                {/* 固定 Header */}
                <div className="px-8 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <h3 className="text-xl font-black text-[#18181B]">{title}</h3>
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 rounded-full hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 内容区 */}
                <div className="flex-1 flex flex-col md:flex-row gap-8 p-8 overflow-y-auto md:overflow-hidden min-h-0">
                    {/* 左栏：3:4 实时精美封面预览 */}
                    <div className="w-full md:w-[260px] shrink-0 flex flex-col gap-3">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">
                            封面实时预览
                        </label>
                        <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-lg border border-gray-100 relative bg-slate-50 shrink-0">
                            <div className="absolute inset-0">
                                <GeneratedCover
                                    title={bookTitle}
                                    author={user?.nickname || '时光记录者'}
                                    coverUrl={previewCoverUrl}
                                    mode="card"
                                />
                            </div>
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center text-white z-20">
                                    <Loader2 size={24} className="animate-spin text-indigo-400" />
                                </div>
                            )}
                        </div>
                        <div className="text-[10px] text-gray-400 text-center font-medium leading-relaxed">
                            ✨ 画布同源渲染，大厅卡片、3D书架与PDF导出效果保持100%一致。
                        </div>
                    </div>

                    {/* 右栏：主要设置信息，可独立滚动 */}
                    <div className="flex-1 md:overflow-y-auto md:pr-2 min-h-0 space-y-6">
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
                                    } ${(status === 'pending' || status === 'published') ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                                        } ${(status === 'pending' || status === 'published') ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}`}
                                    >
                                        <span>{cat.emoji}</span>
                                        <span>{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 封面个性化配置区 */}
                        <div className="space-y-4">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1 block">
                                封面个性设计
                            </label>

                            {/* 1. 背景配色选择 */}
                            <div className="space-y-2 border border-gray-100 rounded-2xl p-4 bg-gray-50/10">
                                <span className="text-[11px] font-bold text-gray-400 block pl-1">
                                    选择底色背景: <span className="text-slate-700 font-bold ml-1">{COVER_PRESET_BACKGROUNDS.find(bg => bg.id === designBg)?.name || ''}</span>
                                </span>
                                <div className="flex flex-wrap gap-2.5 pl-1 py-1">
                                    {COVER_PRESET_BACKGROUNDS.map((bg) => (
                                        <button
                                            key={bg.id}
                                            type="button"
                                            onClick={() => setDesignBg(bg.id)}
                                            disabled={status === 'pending' || status === 'published'}
                                            className={`w-8 h-8 rounded-full cursor-pointer flex items-center justify-center transition-all duration-300 hover:scale-115 shadow-sm border border-black/10 relative ${
                                                designBg === bg.id 
                                                    ? 'ring-2 ring-indigo-600 ring-offset-2 scale-110 shadow-md shadow-indigo-100' 
                                                    : ''
                                            }`}
                                            style={{ background: bg.value }}
                                            title={bg.name}
                                        >
                                            {designBg === bg.id && (
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bg.textColor }} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2. 排版格局选择 */}
                            <div className="space-y-2 border border-gray-100 rounded-2xl p-4 bg-gray-50/10">
                                <span className="text-[11px] font-bold text-gray-400 block pl-1">选择版式格局</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {(['classic', 'minimal', 'modern', 'art'] as const).map((l) => (
                                        <button
                                            key={l}
                                            type="button"
                                            onClick={() => setDesignLayout(l)}
                                            disabled={status === 'pending' || status === 'published'}
                                            className={`p-2 flex flex-col justify-between border-2 rounded-xl transition-all ${
                                                designLayout === l 
                                                    ? 'border-indigo-600 bg-indigo-50/30 text-indigo-600 shadow-md shadow-indigo-50 scale-[1.02]' 
                                                    : 'border-gray-250 bg-white text-gray-500 hover:border-gray-400 hover:scale-[1.01]'
                                            } ${(status === 'pending' || status === 'published') ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            {renderLayoutWireframe(l)}
                                            <span className="text-[10px] font-black text-center w-full block mt-1">
                                                {l === 'classic' && '经典精装'}
                                                {l === 'minimal' && '大字极简'}
                                                {l === 'modern' && '现代主义'}
                                                {l === 'art' && '几何艺术'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 3. 封面插画配置 (可选) */}
                            <div className="space-y-2 border border-gray-100 rounded-2xl p-4 bg-gray-50/10">
                                <span className="text-[11px] font-bold text-gray-400 block pl-1">封面配图插画 (可选)</span>
                                
                                {uploadedCoverUrl ? (
                                    <div className="flex items-center gap-4 bg-white border border-gray-150 p-2.5 rounded-xl">
                                        <div className="w-12 h-16 bg-slate-100 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                                            <img src={uploadedCoverUrl} className="w-full h-full object-cover" alt="已上传配图" />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                配图已上传，将根据当前版式自适应排布
                                            </span>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={status === 'pending' || status === 'published'}
                                                    className="px-3 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all cursor-pointer"
                                                >
                                                    替换图片
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUploadedCoverUrl('');
                                                        setUploadedOssKey('');
                                                    }}
                                                    disabled={status === 'pending' || status === 'published'}
                                                    className="px-3 py-1.5 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                                >
                                                    清除配图
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => {
                                            if (status !== 'pending' && status !== 'published') {
                                                fileInputRef.current?.click();
                                            }
                                        }}
                                        className={`border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-xl p-4 bg-white text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                                            (status === 'pending' || status === 'published') ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.005]'
                                        }`}
                                    >
                                        <Upload size={18} className="text-gray-400 animate-bounce" />
                                        <span className="text-[11px] font-bold text-gray-500">上传本地插画</span>
                                        <span className="text-[9px] text-gray-400">建议 3:4 比例，将自动融合至排版版面中</span>
                                    </div>
                                )}

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                />
                            </div>
                        </div>

                        {/* 发布审核状态控制 */}
                        {initialData?.id && (
                            <div className="space-y-2 pt-1">
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
                </div>

                {/* 固定 Footer */}
                <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
                    <div className="text-[11px] font-medium text-slate-400">
                        {status === 'pending' && <span className="text-amber-500 flex items-center gap-1">⏱️ 审核中，暂时不可编辑</span>}
                        {status === 'published' && <span className="text-emerald-500 flex items-center gap-1">🟢 已公开发布，撤回后可编辑</span>}
                        {status === 'rejected' && <span className="text-red-500 flex items-center gap-1 font-bold">❌ 审核未通过，请修改重新提交</span>}
                        {status === 'private' && <span className="text-slate-400 flex items-center gap-1">🔒 私密作品，仅自己可见</span>}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-2xl text-xs font-bold text-gray-500 bg-white border border-gray-200 
                                     hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 cursor-pointer"
                        >
                            取消
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || isUploading}
                            className="flex items-center gap-2 px-8 py-2.5 rounded-2xl text-xs font-black text-white bg-[#18181B] 
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

