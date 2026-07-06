// #region Description
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAssetStore } from '../../../store/useAssetStore';
import { useBookStore } from '../../../store';
import { Search, Star, Upload, Loader2, FolderOpen, AlertCircle, Globe, Camera } from 'lucide-react';
import { buildFolderTree } from '../../assets/utils/treeHelper';
import type { FolderNode } from '../../assets/utils/treeHelper';
import { useVirtualWaterfall } from '../hooks/useVirtualWaterfall';
import { PhotoCard } from './PhotoCard';
import { PexelsPhotoCard } from './PexelsPhotoCard';
import type { Material } from '../../assets/services/assetService';
import { pexelsService } from '../../assets/services/pexelsService';
import type { PexelsPhoto } from '../../assets/services/pexelsService';

export interface CustomPhotoBrowserProps {
    activeChapterId: string | null;
    activePageId: string | null;
}

/**
 * 专职照片/图片浏览器组件
 * 实现顶部文件夹切换与上传图片，下方高度虚拟化的双列瀑布流滚动展示。
 * 现已集成 Pexels 公共免版权图库，支持拖拽上版。
 */
export const CustomPhotoBrowser: React.FC<CustomPhotoBrowserProps> = ({
    activeChapterId,
    activePageId
}) => {
    const {
        folders,
        materials,
        totalMaterials,
        currentPage,
        totalPages,
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

    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // 虚拟滚动容器尺寸状态
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(500);
    const [containerWidth, setContainerWidth] = useState(280);

    // 本地累加的照片数组，实现无限滚动追加
    const [photoMaterials, setPhotoMaterials] = useState<Material[]>([]);

    // Pexels 状态管理
    const [dataSource, setDataSource] = useState<'local' | 'pexels'>('local');
    const [pexelsPhotos, setPexelsPhotos] = useState<PexelsPhoto[]>([]);
    const [pexelsQuery, setPexelsQuery] = useState('');
    const [pexelsSearchInput, setPexelsSearchInput] = useState('');
    const [pexelsPage, setPexelsPage] = useState(1);
    const [pexelsTotalPages, setPexelsTotalPages] = useState(1);
    const [isPexelsLoading, setIsPexelsLoading] = useState(false);

    // 1. 初始化，拉取文件夹并将类型设定为 photo
    useEffect(() => {
        fetchFolders();
        setSelectedType('photo');
    }, [fetchFolders, setSelectedType]);

    // 2. 监听筛选条件变化，重置累加数组，重新加载第一页
    useEffect(() => {
        setPhotoMaterials([]);
    }, [selectedFolderId, favoriteOnly, searchQuery]);

    // 3. 监听全局 store materials 更新，如果是第1页则直接替换，否则追加
    useEffect(() => {
        if (materials && selectedType === 'photo') {
            if (currentPage === 1) {
                setPhotoMaterials(materials);
            } else {
                setPhotoMaterials(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const newItems = materials.filter(m => !existingIds.has(m.id));
                    return [...prev, ...newItems];
                });
            }
        }
    }, [materials, currentPage, selectedType]);

    // 切换到 Pexels 模式时自动加载精选
    useEffect(() => {
        if (dataSource === 'pexels' && pexelsPhotos.length === 0) {
            fetchPexelsPhotos('', 1);
        }
    }, [dataSource]);

    // Pexels 获取方法
    const fetchPexelsPhotos = async (query: string, page: number = 1) => {
        setIsPexelsLoading(true);
        try {
            const result = query.trim()
                ? await pexelsService.searchPhotos(query, page)
                : await pexelsService.getCuratedPhotos(page);
            
            if (page === 1) {
                setPexelsPhotos(result.items);
            } else {
                setPexelsPhotos(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newItems = result.items.filter(p => !existingIds.has(p.id));
                    return [...prev, ...newItems];
                });
            }
            setPexelsPage(result.page);
            setPexelsTotalPages(result.totalPages);
        } catch (err) {
            console.error('[Editor Pexels] Fetch error:', err);
        } finally {
            setIsPexelsLoading(false);
        }
    };

    // 4. 解析文件夹树，扁平化带缩进输出
    const userFolders = useMemo(() => folders.filter(f => f.scope === 'user'), [folders]);
    const folderTree = useMemo(() => buildFolderTree(userFolders), [userFolders]);
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

    // 5. 监听容器滚动，计算 scrollTop 并触发无限滚动加载下一页
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        setScrollTop(container.scrollTop);

        if (dataSource === 'local') {
            if (isLoading) return;
            // 距离底部小于 150px 时，加载下一页
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
            if (isNearBottom && currentPage < totalPages) {
                fetchMaterials(currentPage + 1);
            }
        } else {
            if (isPexelsLoading) return;
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
            if (isNearBottom && pexelsPage < pexelsTotalPages) {
                fetchPexelsPhotos(pexelsQuery, pexelsPage + 1);
            }
        }
    };

    // 6. 绑定 ResizeObserver 动态获取容器宽高
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerHeight(entry.contentRect.height);
                setContainerWidth(entry.contentRect.width);
            }
        });
        resizeObserver.observe(container);

        // 初始化读取一次
        setScrollTop(container.scrollTop);
        setContainerHeight(container.getBoundingClientRect().height);
        setContainerWidth(container.getBoundingClientRect().width);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // 7. 处理图片上传
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // 零信任防御性前端校验
        const MAX_SIZE = 15 * 1024 * 1024; // 15MB
        const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const validFiles: File[] = [];

        for (const file of Array.from(files)) {
            if (file.size > MAX_SIZE) {
                alert(`文件 ${file.name} 超过 15MB，已自动拦截。`);
                continue;
            }
            if (!ALLOWED_MIME.includes(file.type)) {
                alert(`文件 ${file.name} 格式不支持，仅限 JPG/PNG/WebP/GIF。`);
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length === 0) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);
        try {
            await uploadMaterials(validFiles, selectedFolderId, 'photo');
        } catch (error: any) {
            console.error('Failed to upload photos:', error);
            alert(`上传失败: ${error.message}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Pexels 搜索提交
    const handlePexelsSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const q = pexelsSearchInput.trim();
        setPexelsQuery(q);
        setPexelsPhotos([]);
        fetchPexelsPhotos(q, 1);
    };

    // Pexels 快捷标签词点击
    const handleCategoryClick = (query: string, label: string) => {
        setPexelsSearchInput(label === '精选' ? '' : label);
        setPexelsQuery(query);
        setPexelsPhotos([]);
        fetchPexelsPhotos(query, 1);
    };

    const pexelsCategories = [
        { label: '精选', query: '' },
        { label: '自然', query: 'nature' },
        { label: '建筑', query: 'architecture' },
        { label: '人物', query: 'people' },
        { label: '美食', query: 'food' },
        { label: '旅行', query: 'travel' },
        { label: '城市', query: 'city' },
        { label: '星空', query: 'stars' },
    ];

    // 7.5 将本地与 Pexels 照片结构归一化，支持虚拟瀑布流布局计算
    const activePhotosList = useMemo(() => {
        if (dataSource === 'local') {
            return photoMaterials;
        } else {
            return pexelsPhotos.map(p => ({
                id: p.id,
                name: p.name,
                file_url: p.thumbnailUrl,
                metadata: {
                    width: p.width,
                    height: p.height
                },
                rawPhoto: p // 保留完整原始对象供 PhotoCard 或 PexelsPhotoCard 使用
            }));
        }
    }, [dataSource, photoMaterials, pexelsPhotos]);

    // 8. 瀑布流布局计算
    const gap = 8;
    const columnCount = 2;
    const paddingRight = 4; // 预留给滚动条的间距
    const availableWidth = containerWidth - paddingRight;
    const columnWidth = Math.max(100, (availableWidth - (columnCount - 1) * gap) / columnCount);

    const { visibleItems, totalContainerHeight } = useVirtualWaterfall({
        items: activePhotosList as any[],
        columnCount,
        columnWidth,
        gap,
        scrollTop,
        viewportHeight: containerHeight
    });

    // 9. 骨架屏占位项定义与布局计算
    const skeletonItems = useMemo(() => {
        return Array.from({ length: 8 }).map((_, i) => ({
            id: `skeleton-${i}`,
            metadata: {
                width: 100,
                height: i % 2 === 0 ? 120 : 80
            }
        }));
    }, []);

    const { visibleItems: visibleSkeletons } = useVirtualWaterfall({
        items: skeletonItems,
        columnCount,
        columnWidth,
        gap,
        scrollTop: 0,
        viewportHeight: 600
    });

    return (
        <div className="flex flex-col min-h-0 flex-1 space-y-3 font-sans">
            
            {/* 数据源切换 Tab */}
            <div className="flex bg-gray-100 p-0.5 rounded-lg flex-shrink-0 text-[10px] font-bold select-none">
                <button
                    onClick={() => setDataSource('local')}
                    className={`flex-1 py-1 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        dataSource === 'local' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <FolderOpen size={10} />
                    <span>我的素材</span>
                </button>
                <button
                    onClick={() => setDataSource('pexels')}
                    className={`flex-1 py-1 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        dataSource === 'pexels' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Globe size={10} />
                    <span>Pexels 图库</span>
                </button>
            </div>

            {dataSource === 'local' ? (
                <>
                    {/* Folder Selector Dropdown */}
                    <div className="flex-shrink-0">
                        <select
                            value={selectedFolderId || ''}
                            onChange={(e) => setSelectedFolderId(e.target.value || null)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:border-indigo-500 shadow-sm transition-all"
                        >
                            <option value="">📁 所有照片</option>
                            {flatFolderOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                    {'\u00A0\u00A0'.repeat(opt.depth * 2)}📁 {opt.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filter Toolbar (Search + Fav + Upload) */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="检索照片..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-7 pr-2.5 py-1 bg-gray-50 border border-gray-200/80 rounded-md text-[10px] text-gray-700 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all font-semibold"
                            />
                        </div>

                        {/* Favorite */}
                        <button
                            onClick={() => setFavoriteOnly(!favoriteOnly)}
                            className={`w-6 h-6 border rounded-md flex items-center justify-center transition-all cursor-pointer ${
                                favoriteOnly 
                                    ? 'bg-amber-50 border-amber-200 text-amber-500 shadow-sm' 
                                    : 'bg-gray-50 border-gray-200 text-gray-450 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                            title={favoriteOnly ? '只看已收藏照片' : '显示所有照片'}
                        >
                            <Star size={11} fill={favoriteOnly ? 'currentColor' : 'none'} />
                        </button>

                        {/* Upload Trigger */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="h-6 px-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-md text-[9px] font-black flex items-center gap-1 cursor-pointer transition-all shadow-sm shadow-indigo-100 flex-shrink-0"
                        >
                            {isUploading ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                            <span>上传照片</span>
                        </button>

                        <input
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                        />
                    </div>
                </>
            ) : (
                <div className="flex flex-col gap-2 flex-shrink-0 select-none">
                    {/* Pexels Search Form */}
                    <form onSubmit={handlePexelsSearchSubmit} className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                            <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="搜索免版权素材..."
                                value={pexelsSearchInput}
                                onChange={(e) => setPexelsSearchInput(e.target.value)}
                                className="w-full pl-7 pr-2.5 py-1 bg-gray-50 border border-gray-200/80 rounded-md text-[10px] text-gray-700 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all font-semibold"
                            />
                        </div>
                        <button
                            type="submit"
                            className="h-6 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[9px] font-black cursor-pointer transition-all shadow-sm"
                        >
                            搜索
                        </button>
                    </form>

                    {/* Horizontal scroll of Pexels Categories */}
                    <div className="flex gap-1 overflow-x-auto py-1 -mx-1 px-1 flex-nowrap scrollbar-none">
                        {pexelsCategories.map(cat => (
                            <button
                                key={cat.label}
                                type="button"
                                onClick={() => handleCategoryClick(cat.query, cat.label)}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                                    pexelsQuery === cat.query
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Uploading progress bars for current component scope */}
            {dataSource === 'local' && Object.keys(uploadProgresses).length > 0 && (
                <div className="flex-shrink-0 bg-indigo-50/50 border border-indigo-100 rounded-lg p-2 space-y-1.5 max-h-20 overflow-y-auto scrollbar-thin">
                    {Object.entries(uploadProgresses).map(([fileName, progress]) => (
                        <div key={fileName} className="flex flex-col gap-0.5">
                            <div className="flex justify-between text-[8px] font-bold text-indigo-700 truncate">
                                <span className="truncate max-w-[80%]">{fileName}</span>
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

            {/* Waterfall Scroll View */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto pr-1 scrollbar-thin select-none relative"
            >
                {activePhotosList.length > 0 ? (
                    <div 
                        className="w-full relative" 
                        style={{ height: totalContainerHeight }}
                    >
                        {visibleItems.map(({ item, style }) => (
                            dataSource === 'local' ? (
                                <PhotoCard
                                    key={item.id}
                                    material={item as Material}
                                    activeChapterId={activeChapterId}
                                    activePageId={activePageId}
                                    style={style}
                                />
                            ) : (
                                <PexelsPhotoCard
                                    key={item.id}
                                    photo={(item as any).rawPhoto}
                                    style={style}
                                />
                            )
                        ))}
                    </div>
                ) : (isLoading || isPexelsLoading) && (dataSource === 'local' ? currentPage === 1 : pexelsPhotos.length === 0) ? (
                    /* Initial Mock Skeleton Waterfall Loading */
                    <div 
                        className="w-full relative" 
                        style={{ height: 300 }}
                    >
                        {visibleSkeletons.map(({ item, style }) => (
                            <div
                                key={item.id}
                                style={style}
                                className="rounded-xl overflow-hidden border border-gray-100 bg-slate-50 relative animate-pulse"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200/50 to-slate-100 bg-[length:200%_100%]" />
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Empty Placeholder */
                    <div className="py-16 text-center text-gray-400 border border-dashed border-gray-200/60 rounded-xl flex flex-col items-center justify-center gap-2">
                        <AlertCircle size={20} className="text-gray-300" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400">
                                {dataSource === 'local' ? '未检索到照片' : '图库未找到结果'}
                            </span>
                            <span className="text-[8px] text-gray-300 mt-0.5">
                                {dataSource === 'local' ? '请尝试切换文件夹或清除搜索条件' : '请尝试更换关键词搜索'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Bottom page loading spinner */}
                {((dataSource === 'local' && isLoading && currentPage > 1) || (dataSource === 'pexels' && isPexelsLoading && pexelsPage > 1)) && (
                    <div className="flex justify-center py-2.5 text-gray-400 items-center gap-1">
                        <Loader2 size={12} className="animate-spin text-indigo-500" />
                        <span className="text-[8px] font-medium">加载更多照片...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// #endregion
