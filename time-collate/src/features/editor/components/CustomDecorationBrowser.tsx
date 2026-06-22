// #region Description
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAssetStore } from '../../../store/useAssetStore';
import { useBookStore } from '../../../store';
import { 
    Smile, 
    Layers, 
    Type, 
    Search, 
    Star, 
    Upload, 
    Loader2, 
    X,
    Check,
    Folder,
    AlertCircle
} from 'lucide-react';
import { buildFolderTree } from '../../assets/utils/treeHelper';
import type { FolderNode } from '../../assets/utils/treeHelper';
import { 
    updatePageBackgroundImage, 
    updatePageFontFamily,
    getPageBackgroundImage,
    getPageFontFamily
} from '../../../utils/textSlotHelper';
import { getThumbnailUrl } from '../../../utils/cdn';

interface CustomDecorationBrowserProps {
    activeChapterId: string | null;
    activePageId: string | null;
    handleAddSticker: (stickerId: string) => void;
}

/**
 * 装饰要素/辅助设计素材浏览器
 * 集成贴纸印章、页面背景和自定义字体的分类检索与在线应用。
 */
export const CustomDecorationBrowser: React.FC<CustomDecorationBrowserProps> = ({
    activeChapterId,
    activePageId,
    handleAddSticker
}) => {
    const { 
        folders, 
        materials, 
        isLoading, 
        selectedFolderId,
        selectedType,
        favoriteOnly,
        searchQuery,
        uploadProgresses,
        fetchFolders,
        fetchMaterials,
        setSelectedFolderId,
        setSelectedType,
        setSearchQuery,
        setFavoriteOnly,
        uploadMaterials
    } = useAssetStore();

    const { currentBook, updatePage } = useBookStore();
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 默认子 Tab，若 store type 不在三者中，置为 sticker
    const [subTab, setSubTab] = useState<'sticker' | 'background' | 'font'>('sticker');

    // 1. 初始化拉取文件夹，设定初值
    useEffect(() => {
        fetchFolders();
        setSelectedType('sticker'); // 默认显示贴纸
    }, [fetchFolders, setSelectedType]);

    // 同步 subTab 与 store selectedType
    useEffect(() => {
        if (selectedType === 'sticker' || selectedType === 'background' || selectedType === 'font') {
            setSubTab(selectedType);
        }
    }, [selectedType]);

    const handleTabChange = (type: 'sticker' | 'background' | 'font') => {
        setSubTab(type);
        setSelectedType(type);
    };

    // 2. 解析文件夹树，供下拉选项使用
    const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
    const flatFolderOptions = useMemo(() => {
        const result: { id: string; name: string; depth: number }[] = [];
        const traverse = (nodes: FolderNode[], depth = 0) => {
            nodes.forEach(node => {
                result.push({ id: node.id, name: node.name, depth });
                if (node.children && node.children.length > 0) {
                    traverse(node.children, depth + 1);
                }
            });
        };
        traverse(folderTree);
        return result;
    }, [folderTree]);

    // 获取当前活动页面及其元数据，用以反显当前背景、字体
    const activePage = useMemo(() => {
        if (!currentBook || !activePageId) return null;
        for (const page of currentBook.pages || []) {
            if (page.id === activePageId) return page;
        }
        return null;
    }, [currentBook, activePageId]);

    const currentBg = activePage ? getPageBackgroundImage(activePage.content) : undefined;
    const currentFont = activePage ? getPageFontFamily(activePage.content) : undefined;

    // 3. 动态将字体引入页面 head 以便实时预览字体效果
    useEffect(() => {
        if (selectedType === 'font' && materials.length > 0) {
            materials.forEach(mat => {
                if (mat.material_type === 'font' && mat.file_url) {
                    const fontId = `sidebar-font-face-${mat.id}`;
                    if (!document.getElementById(fontId)) {
                        const style = document.createElement('style');
                        style.id = fontId;
                        style.innerHTML = `
                            @font-face {
                                font-family: '${mat.name}';
                                src: url('${mat.file_url}') format('woff2'),
                                     url('${mat.file_url}') format('woff'),
                                     url('${mat.file_url}') format('truetype');
                                font-weight: normal;
                                font-style: normal;
                            }
                        `;
                        document.head.appendChild(style);
                    }
                }
            });
        }
    }, [selectedType, materials]);

    // 4. 处理文件上传逻辑
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // 零信任前端防护校验
        const MAX_SIZE = subTab === 'font' ? 30 * 1024 * 1024 : 10 * 1024 * 1024; // 字体文件最大 30MB，贴纸/背景最大 10MB
        const validFiles: File[] = [];

        for (const file of Array.from(files)) {
            if (file.size > MAX_SIZE) {
                alert(`文件 ${file.name} 超过大小限制（当前类别限制 ${MAX_SIZE / (1024 * 1024)}MB），已拦截。`);
                continue;
            }
            if (subTab === 'font') {
                const ext = file.name.split('.').pop()?.toLowerCase();
                if (!ext || !['ttf', 'otf', 'woff', 'woff2'].includes(ext)) {
                    alert(`文件 ${file.name} 格式不支持，字体仅限 TTF/OTF/WOFF/WOFF2。`);
                    continue;
                }
            }
            validFiles.push(file);
        }

        if (validFiles.length === 0) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);
        try {
            await uploadMaterials(validFiles, selectedFolderId, subTab);
        } catch (error: any) {
            console.error('Failed to upload decoration assets:', error);
            alert(`上传失败: ${error.message}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // 5. 应用自定义背景
    const handleSelectBackground = (url: string) => {
        if (!activeChapterId || !activePageId || !activePage) return;
        const updated = updatePageBackgroundImage(activePage.content, url);
        updatePage(activeChapterId, activePageId, { content: updated });
    };

    const handleClearBackground = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!activeChapterId || !activePageId || !activePage) return;
        const updated = updatePageBackgroundImage(activePage.content, null);
        updatePage(activeChapterId, activePageId, { content: updated });
    };

    // 6. 应用自定义字体
    const handleSelectFont = (fontId: string) => {
        if (!activeChapterId || !activePageId || !activePage) return;
        const updated = updatePageFontFamily(activePage.content, fontId);
        updatePage(activeChapterId, activePageId, { content: updated });
    };

    const handleClearFont = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!activeChapterId || !activePageId || !activePage) return;
        const updated = updatePageFontFamily(activePage.content, 'sans'); // 默认恢复为无衬线
        updatePage(activeChapterId, activePageId, { content: updated });
    };

    // 7. 处理拖拽启动
    const handleDragStart = (
        e: React.DragEvent, 
        type: 'sticker' | 'background', 
        id: string, 
        url?: string
    ) => {
        if (type === 'sticker') {
            e.dataTransfer.setData('stickerId', id);
            e.dataTransfer.effectAllowed = 'copy';
        } else if (type === 'background' && url) {
            e.dataTransfer.setData('backgroundImageUrl', url);
            e.dataTransfer.effectAllowed = 'copy';
        }
    };

    return (
        <div className="flex flex-col min-h-0 flex-1 space-y-3 font-sans">
            
            {/* Top Sub-tabs Switcher */}
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-gray-100 rounded-lg flex-shrink-0">
                <button
                    onClick={() => handleTabChange('sticker')}
                    className={`flex flex-col items-center justify-center py-1.5 rounded-md transition-all cursor-pointer ${subTab === 'sticker' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    title="贴纸印章"
                >
                    <Smile size={13} />
                    <span className="text-[9px] mt-0.5">贴纸</span>
                </button>
                <button
                    onClick={() => handleTabChange('background')}
                    className={`flex flex-col items-center justify-center py-1.5 rounded-md transition-all cursor-pointer ${subTab === 'background' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    title="页面背景"
                >
                    <Layers size={13} />
                    <span className="text-[9px] mt-0.5">背景</span>
                </button>
                <button
                    onClick={() => handleTabChange('font')}
                    className={`flex flex-col items-center justify-center py-1.5 rounded-md transition-all cursor-pointer ${subTab === 'font' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    title="自定义字体"
                >
                    <Type size={13} />
                    <span className="text-[9px] mt-0.5">字体</span>
                </button>
            </div>

            {/* Filter Toolbar (Search + Fav + Folder Select + Upload) */}
            <div className="flex flex-col gap-2 flex-shrink-0 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                
                {/* Search & Fav */}
                <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                        <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={`搜索${subTab === 'sticker' ? '贴纸' : subTab === 'background' ? '背景' : '字体'}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-7 pr-2.5 py-1 bg-white border border-gray-200/80 rounded-md text-[10px] text-gray-700 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all font-semibold"
                        />
                    </div>

                    <button
                        onClick={() => setFavoriteOnly(!favoriteOnly)}
                        className={`w-6 h-6 border rounded-md flex items-center justify-center transition-all cursor-pointer ${
                            favoriteOnly 
                                ? 'bg-amber-50 border-amber-200 text-amber-500 shadow-sm' 
                                : 'bg-white border-gray-200 text-gray-450 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                        title={favoriteOnly ? '只看已收藏' : '显示全部'}
                    >
                        <Star size={11} fill={favoriteOnly ? 'currentColor' : 'none'} />
                    </button>
                </div>

                {/* Folder Select & Upload */}
                <div className="flex items-center gap-1.5">
                    <div className="relative flex-1 flex items-center bg-white border border-gray-200 rounded-md px-2 py-1">
                        <Folder size={11} className="text-gray-400 mr-1.5 flex-shrink-0" />
                        <select
                            value={selectedFolderId || ''}
                            onChange={(e) => setSelectedFolderId(e.target.value || null)}
                            className="w-full text-[10px] bg-transparent outline-none text-slate-700 font-semibold cursor-pointer"
                        >
                            <option value="">📁 所有文件夹</option>
                            {flatFolderOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>
                                    {'　'.repeat(opt.depth)}📁 {opt.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="h-6 px-2 bg-indigo-650 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-md text-[9px] font-black flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                    >
                        {isUploading ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                        <span>上传</span>
                    </button>

                    <input
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        type="file"
                        accept={subTab === 'font' ? '.ttf,.otf,.woff,.woff2' : 'image/*'}
                        multiple
                        className="hidden"
                    />
                </div>
            </div>

            {/* Upload progresses */}
            {Object.keys(uploadProgresses).length > 0 && (
                <div className="flex-shrink-0 bg-indigo-50/50 border border-indigo-100 rounded-lg p-2 space-y-1.5 max-h-16 overflow-y-auto scrollbar-thin">
                    {Object.entries(uploadProgresses).map(([fileName, progress]) => (
                        <div key={fileName} className="flex flex-col gap-0.5">
                            <div className="flex justify-between text-[8px] font-bold text-indigo-700 truncate">
                                <span className="truncate max-w-[85%]">{fileName}</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="h-1 bg-indigo-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-indigo-500 transition-all duration-150" 
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Content Display Panel */}
            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin select-none">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-1.5">
                        <Loader2 size={16} className="animate-spin text-indigo-500" />
                        <span className="text-[10px]">加载素材列表中...</span>
                    </div>
                ) : materials.length > 0 ? (
                    subTab === 'font' ? (
                        /* Font List view */
                        <div className="space-y-1.5 pr-0.5">
                            {materials.map((mat) => {
                                const isSelected = currentFont === mat.id;
                                return (
                                    <div
                                        key={mat.id}
                                        onClick={() => handleSelectFont(mat.id)}
                                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer hover:border-indigo-400 transition-all ${
                                            isSelected 
                                                ? 'bg-indigo-50/40 border-indigo-500 shadow-sm font-bold' 
                                                : 'bg-white border-gray-200'
                                        }`}
                                    >
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider scale-90 origin-left">
                                                {mat.name}
                                            </span>
                                            <span 
                                                style={{ fontFamily: `"${mat.name}", sans-serif` }}
                                                className="text-[13px] text-gray-800 font-medium truncate mt-0.5"
                                            >
                                                忆时光整理 collate
                                            </span>
                                        </div>
                                        {isSelected && (
                                            <button 
                                                onClick={handleClearFont}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                                                title="清除自定义字体设定"
                                            >
                                                <X size={10} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : subTab === 'sticker' ? (
                        /* Stickers view: 3 Column Grid */
                        <div className="grid grid-cols-3 gap-1.5 pr-0.5">
                            {materials.map((mat) => {
                                const isSVG = mat.metadata?.svg;
                                return (
                                    <div
                                        key={mat.id}
                                        onDoubleClick={() => handleAddSticker(mat.id)}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, 'sticker', mat.id)}
                                        className="group relative aspect-square rounded-md overflow-hidden border border-[#E7DECD] bg-[#FAF6EE] p-1.5 cursor-grab active:cursor-grabbing hover:scale-105 hover:border-indigo-400 hover:bg-amber-50/30 transition-all flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                                        title={`${mat.name} (双击、点击或拖拽至画布)`}
                                    >
                                        {isSVG ? (
                                            <div 
                                                className="w-full h-full flex items-center justify-center text-gray-800 dynamic-svg-sticker"
                                                dangerouslySetInnerHTML={{ __html: mat.metadata?.svg ?? '' }}
                                            />
                                        ) : (
                                            <img
                                                src={mat.file_url}
                                                className="w-full h-full object-contain pointer-events-none select-none"
                                                alt={mat.name}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Backgrounds view: 3 Column Grid */
                        <div className="grid grid-cols-3 gap-1.5 pr-0.5">
                            {materials.map((mat) => {
                                const isSelected = currentBg === mat.file_url;
                                return (
                                    <div
                                        key={mat.id}
                                        onClick={() => handleSelectBackground(mat.file_url)}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, 'background', mat.id, mat.file_url)}
                                        className={`group relative aspect-[3/4] rounded-md overflow-hidden border cursor-pointer hover:border-indigo-400 hover:shadow-sm transition-all ${
                                            isSelected 
                                                ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                                                : 'border-gray-250 bg-slate-50'
                                        }`}
                                        title="点击应用背景或拖拽至页面背景处"
                                    >
                                        <img
                                            src={getThumbnailUrl(mat.file_url, 150)}
                                            className="w-full h-full object-cover pointer-events-none select-none"
                                            alt={mat.name}
                                        />
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-slate-900/35 flex flex-col items-center justify-center">
                                                <span className="p-0.5 bg-green-500 text-white rounded-full mb-1">
                                                    <Check size={8} />
                                                </span>
                                                <button
                                                    onClick={handleClearBackground}
                                                    className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[8px] rounded cursor-pointer font-bold"
                                                >
                                                    清除
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : (
                    /* Empty state */
                    <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1.5">
                        <AlertCircle size={18} className="text-gray-300" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400">暂无此类别设计素材</span>
                            <span className="text-[8px] text-gray-350 mt-0.5">请尝试切换文件夹分类或添加素材</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
// #endregion
