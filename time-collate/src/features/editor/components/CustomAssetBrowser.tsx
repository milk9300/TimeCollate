import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAssetStore } from '../../../store/useAssetStore';
import { useBookStore } from '../../../store';
import { 
    Image as ImageIcon, 
    Smile, 
    Folder, 
    Search, 
    Upload, 
    Star, 
    Loader2, 
    ExternalLink
} from 'lucide-react';
import { buildFolderTree } from '../../assets/utils/treeHelper';
import type { FolderNode } from '../../assets/utils/treeHelper';
import { getThumbnailUrl } from '../../../utils/cdn';

interface CustomAssetBrowserProps {
    activeChapterId: string | null;
    activePageId: string | null;
    handleAddSticker: (stickerId: string) => void;
}

export const CustomAssetBrowser: React.FC<CustomAssetBrowserProps> = ({
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

    // 1. 初始化拉取素材和文件夹数据
    useEffect(() => {
        fetchFolders();
        setSelectedType('sticker'); // 默认选中贴纸
    }, [fetchFolders, setSelectedType]);

    // 2. 解析扁平化的带缩进文件夹列表，供下拉菜单选择
    const filteredFolders = useMemo(() => {
        if (selectedType === 'photo') {
            return folders.filter(f => f.scope === 'user');
        }
        return folders.filter(f => f.scope === 'system');
    }, [folders, selectedType]);
    const folderTree = useMemo(() => buildFolderTree(filteredFolders), [filteredFolders]);
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

    // 4. 处理素材上传逻辑
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setIsUploading(true);
        try {
            await uploadMaterials(
                Array.from(files), 
                selectedFolderId, 
                selectedType || 'sticker'
            );
        } catch (error: any) {
            console.error('Failed to upload materials:', error);
            alert(`上传失败: ${error.message}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // 7. 处理各类拖拽初始化
    const handleDragStart = (
        e: React.DragEvent, 
        type: string, 
        id: string, 
        url?: string
    ) => {
        if (type === 'photo' && url) {
            e.dataTransfer.setData('text/plain', url);
            e.dataTransfer.setData('photoId', id);
            e.dataTransfer.setData('sourcePageId', activePageId || '');
            e.dataTransfer.setData('sourceChapterId', activeChapterId || '');
            e.dataTransfer.effectAllowed = 'copyMove';
        } else if (type === 'sticker') {
            e.dataTransfer.setData('stickerId', id);
            e.dataTransfer.effectAllowed = 'copy';
        }
    };

    return (
        <div className="flex flex-col min-h-0 flex-1 space-y-3">
            {/* 素材类型快速切换 */}
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-gray-100 rounded-lg flex-shrink-0">
                <button
                    onClick={() => setSelectedType('photo')}
                    className={`flex flex-col items-center justify-center py-1.5 rounded-md transition-all ${selectedType === 'photo' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    title="照片"
                >
                    <ImageIcon size={14} />
                    <span className="text-[9px] mt-0.5">照片</span>
                </button>
                <button
                    onClick={() => setSelectedType('sticker')}
                    className={`flex flex-col items-center justify-center py-1.5 rounded-md transition-all ${selectedType === 'sticker' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    title="贴纸印章"
                >
                    <Smile size={14} />
                    <span className="text-[9px] mt-0.5">贴纸</span>
                </button>
            </div>

            {/* 过滤器工具栏 */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* 搜索框 */}
                <div className="relative flex-1">
                    <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="检索素材..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-[10px] bg-gray-50 border border-gray-200/80 rounded-md pl-6.5 pr-2 py-1 outline-none focus:border-indigo-400 focus:bg-white transition-all text-gray-700"
                    />
                </div>

                {/* 收藏夹按钮 */}
                <button
                    onClick={() => setFavoriteOnly(!favoriteOnly)}
                    className={`p-1.5 border rounded-md transition-all ${favoriteOnly ? 'bg-amber-50 border-amber-200 text-amber-500' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600'}`}
                    title={favoriteOnly ? "仅看收藏" : "全部素材"}
                >
                    <Star size={12} className={favoriteOnly ? "fill-current" : ""} />
                </button>

                {/* 前往素材中心 */}
                <a
                    href="/my/assets"
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-gray-50 border border-gray-200 text-gray-400 hover:text-indigo-600 rounded-md transition-all flex items-center justify-center"
                    title="在新窗口管理素材库"
                >
                    <ExternalLink size={12} />
                </a>
            </div>

            {/* 文件夹分类与上传 */}
            <div className="flex gap-1.5 flex-shrink-0">
                <div className="relative flex-1 flex items-center bg-gray-50 border border-gray-200/80 rounded-md px-2 py-0.5">
                    <Folder size={11} className="text-gray-400 mr-1.5 flex-shrink-0" />
                    <select
                        value={selectedFolderId || ''}
                        onChange={(e) => setSelectedFolderId(e.target.value || null)}
                        className="w-full text-[10px] bg-transparent outline-none text-gray-600 cursor-pointer"
                    >
                        <option value="">所有文件夹</option>
                        {flatFolderOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>
                                {'　'.repeat(opt.depth)}📁 {opt.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 快速上传 */}
                <button
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] rounded-md transition-all flex items-center gap-1 shadow-sm disabled:opacity-50"
                >
                    <Upload size={10} />
                    {isUploading ? '上传中...' : '上传'}
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    multiple
                    className="hidden"
                />
            </div>

            {/* 素材展示网格区域 */}
            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin select-none">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-1.5">
                        <Loader2 size={16} className="animate-spin text-indigo-500" />
                        <span className="text-[10px]">加载云端素材...</span>
                    </div>
                ) : materials.length > 0 ? (
                    /* Photo, Sticker Grid */
                    <div className="grid grid-cols-3 gap-1.5 pr-0.5">
                        {materials.map((mat) => {
                            if (selectedType === 'photo') {
                                return (
                                    <div
                                        key={mat.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, 'photo', mat.id, mat.file_url)}
                                        className="group relative aspect-square rounded-md overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0 cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-sm transition-all"
                                    >
                                        <img
                                            src={getThumbnailUrl(mat.file_url, 150)}
                                            className="w-full h-full object-cover pointer-events-none"
                                            alt={mat.name}
                                        />
                                    </div>
                                );
                            } else {
                                const isSVG = mat.metadata?.svg;
                                return (
                                    <div
                                        key={mat.id}
                                        onDoubleClick={() => handleAddSticker(mat.id)}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, 'sticker', mat.id)}
                                        className="group relative aspect-square rounded-md overflow-hidden border border-[#E7DECD] bg-[#FAF6EE] p-1.5 cursor-grab active:cursor-grabbing hover:scale-105 hover:border-indigo-400 hover:bg-amber-50/30 transition-all flex items-center justify-center"
                                        title={`${mat.name} (拖拽或点击使用)`}
                                    >
                                        {isSVG ? (
                                            <div 
                                                className="w-full h-full flex items-center justify-center text-gray-800 dynamic-svg-sticker"
                                                dangerouslySetInnerHTML={{ __html: mat.metadata?.svg ?? '' }}
                                            />
                                        ) : (
                                            <img
                                                src={mat.file_url}
                                                className="w-full h-full object-contain pointer-events-none"
                                                alt={mat.name}
                                            />
                                        )}
                                    </div>
                                );
                            }
                        })}
                    </div>
                ) : (
                    <div className="py-10 text-center text-gray-400 border border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-1">
                        <span className="text-[10px] font-medium">当前目录下暂无此类素材</span>
                        <span className="text-[8px] text-gray-350">点击右上方上传，或前往素材库添加</span>
                    </div>
                )}
            </div>
        </div>
    );
};
