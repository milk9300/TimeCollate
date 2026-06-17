import { useEffect, useState, useRef } from 'react';
import {
    FolderOpen,
    FolderPlus,
    Folder,
    MoreVertical,
    Pencil,
    Trash2,
    Plus,
    Search,
    Heart,
    UploadCloud,
    X,
    ChevronRight,
    ChevronDown,
    Check,
    FileImage,
    Smile,
    Type,
    Layout,
    HardDrive,
    Loader2,
    ExternalLink
} from 'lucide-react';
import { MainLayout } from '../../common/components/MainLayout';
import { useAssetStore } from '../../../store/useAssetStore';
import { buildFolderTree } from '../utils/treeHelper';
import type { FolderNode } from '../utils/treeHelper';

export function AssetCenter() {
    const {
        folders,
        materials,
        totalMaterials,
        currentPage,
        totalPages,
        storageQuota,
        isLoading,
        error,
        selectedFolderId,
        selectedType,
        selectedTag,
        searchQuery,
        favoriteOnly,
        uploadProgresses,
        fetchFolders,
        createFolder,
        updateFolder,
        deleteFolder,
        fetchMaterials,
        uploadMaterials,
        updateMaterial,
        deleteMaterial,
        toggleFavorite,
        fetchStorageQuota,
        setSelectedFolderId,
        setSelectedType,
        setSelectedTag,
        setSearchQuery,
        setFavoriteOnly,
        clearFilters
    } = useAssetStore();

    // UI States
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [activeFolderMenu, setActiveFolderMenu] = useState<string | null>(null);
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingFolderName, setEditingFolderName] = useState('');
    const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Material Action States
    const [previewMaterial, setPreviewMaterial] = useState<any | null>(null);
    const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
    const [editingMaterialName, setEditingMaterialName] = useState('');
    const [movingMaterial, setMovingMaterial] = useState<any | null>(null);
    const [activeMaterialMenu, setActiveMaterialMenu] = useState<string | null>(null);

    // Tags list input for uploads
    const [uploadTags, setUploadTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');

    // File Upload Ref
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    // Click outside handlers refs
    const folderMenuRef = useRef<HTMLDivElement>(null);
    const materialMenuRef = useRef<HTMLDivElement>(null);

    // Initial Data Fetch
    useEffect(() => {
        fetchFolders();
        fetchMaterials(1);
        fetchStorageQuota();
    }, []);

    // Close menus on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (folderMenuRef.current && !folderMenuRef.current.contains(event.target as Node)) {
                setActiveFolderMenu(null);
            }
            if (materialMenuRef.current && !materialMenuRef.current.contains(event.target as Node)) {
                setActiveMaterialMenu(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Format file size
    const formatBytes = (bytes: number, decimals = 2) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    // Toggle folder expand/collapse
    const toggleFolderExpand = (folderId: string) => {
        setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
    };

    // Folder Actions
    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        try {
            await createFolder(newFolderName, newFolderParentId);
            setNewFolderName('');
            setShowNewFolderInput(false);
            setNewFolderParentId(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : '创建文件夹失败');
        }
    };

    const handleRenameFolderSubmit = async (folderId: string) => {
        if (!editingFolderName.trim()) return;
        try {
            await updateFolder(folderId, editingFolderName);
            setEditingFolderId(null);
            setEditingFolderName('');
        } catch (err) {
            alert(err instanceof Error ? err.message : '重命名文件夹失败');
        }
    };

    const handleDeleteFolderConfirm = async (folderId: string) => {
        if (confirm('确定要删除该文件夹吗？其包含的所有子文件夹及素材也将被永久删除，且无法恢复。')) {
            await deleteFolder(folderId);
        }
    };

    // HTML5 Folder Drag & Drop
    const handleFolderDragStart = (e: React.DragEvent, folderId: string) => {
        e.dataTransfer.setData('folderId', folderId);
    };

    const handleFolderDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault();
        const draggedFolderId = e.dataTransfer.getData('folderId');
        const draggedMaterialId = e.dataTransfer.getData('materialId');

        if (draggedFolderId) {
            if (draggedFolderId === targetFolderId) return;
            try {
                await updateFolder(draggedFolderId, undefined, targetFolderId);
            } catch (err) {
                alert(err instanceof Error ? err.message : '移动文件夹失败');
            }
        } else if (draggedMaterialId) {
            try {
                await updateMaterial(draggedMaterialId, undefined, targetFolderId);
            } catch (err) {
                alert(err instanceof Error ? err.message : '移动素材失败');
            }
        }
    };

    // Material Upload Actions
    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        await uploadSelectedFiles(files);
    };

    const uploadSelectedFiles = async (files: File[]) => {
        const type = selectedType || 'photo';
        const folderId = selectedFolderId === 'root' ? null : selectedFolderId;
        try {
            await uploadMaterials(files, folderId, type, uploadTags);
            setUploadTags([]);
        } catch (err) {
            alert(err instanceof Error ? err.message : '文件上传失败');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(true);
    };

    const handleDragLeave = () => {
        setIsDraggingOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await uploadSelectedFiles(files);
        }
    };

    // Material Tag handling
    const addUploadTag = () => {
        if (tagInput.trim() && !uploadTags.includes(tagInput.trim())) {
            setUploadTags([...uploadTags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeUploadTag = (tag: string) => {
        setUploadTags(uploadTags.filter(t => t !== tag));
    };

    // Folder breadcrumbs calculation
    const getBreadcrumbs = () => {
        if (!selectedFolderId || selectedFolderId === 'root') return [];
        const crumbs: MaterialFolder[] = [];
        let current = folders.find(f => f.id === selectedFolderId);
        while (current) {
            crumbs.unshift(current);
            const parentId = current.parent_id;
            current = parentId ? folders.find(f => f.id === parentId) : undefined;
        }
        return crumbs;
    };

    // Build hierarchical folder nodes
    const folderTree = buildFolderTree(folders);

    // Render folder node recursively
    const renderFolderNode = (node: FolderNode, depth = 0) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedFolders[node.id];
        const isSelected = selectedFolderId === node.id;
        const isEditing = editingFolderId === node.id;

        return (
            <div key={node.id} className="select-none">
                <div
                    draggable={node.scope !== 'system'}
                    onDragStart={(e) => handleFolderDragStart(e, node.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleFolderDrop(e, node.id)}
                    className={`flex items-center gap-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all group cursor-pointer relative
                                ${isSelected ? 'bg-indigo-50/70 text-indigo-650' : 'text-slate-600 hover:bg-slate-50'}`}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                    onClick={() => setSelectedFolderId(node.id)}
                >
                    {/* Expand/Collapse arrow */}
                    <button
                        className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleFolderExpand(node.id);
                        }}
                    >
                        {hasChildren ? (
                            isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                        ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1.5" />
                        )}
                    </button>

                    {/* Folder Icon */}
                    <Folder
                        size={14}
                        className={`shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'}`}
                    />

                    {/* Folder Name */}
                    {isEditing ? (
                        <input
                            type="text"
                            value={editingFolderName}
                            onChange={(e) => setEditingFolderName(e.target.value)}
                            onBlur={() => handleRenameFolderSubmit(node.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameFolderSubmit(node.id);
                                if (e.key === 'Escape') setEditingFolderId(null);
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white border border-slate-200 rounded px-1.5 py-0.5 w-32 focus:border-indigo-500 outline-none text-[11px]"
                        />
                    ) : (
                        <span className="truncate max-w-[120px]">{node.name}</span>
                    )}

                    {/* System label */}
                    {node.scope === 'system' && (
                        <span className="text-[9px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded ml-1.5 font-bold uppercase tracking-tight">官方</span>
                    )}

                    {/* Folder Actions Menu Trigger */}
                    {node.scope !== 'system' && !isEditing && (
                        <button
                            className="ml-auto opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-650 hover:bg-slate-200/50 rounded-lg transition-all"
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveFolderMenu(activeFolderMenu === node.id ? null : node.id);
                            }}
                        >
                            <MoreVertical size={12} />
                        </button>
                    )}

                    {/* Folder Action Dropdown */}
                    {activeFolderMenu === node.id && (
                        <div
                            ref={folderMenuRef}
                            className="absolute right-2 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-slate-100 p-1 z-40 animate-in fade-in slide-in-from-top-2 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => {
                                    setNewFolderParentId(node.id);
                                    setShowNewFolderInput(true);
                                    setActiveFolderMenu(null);
                                    setExpandedFolders(prev => ({ ...prev, [node.id]: true }));
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg text-[11px] font-bold text-left cursor-pointer"
                            >
                                <FolderPlus size={11} />
                                <span>新建子文件夹</span>
                            </button>
                            <button
                                onClick={() => {
                                    setEditingFolderId(node.id);
                                    setEditingFolderName(node.name);
                                    setActiveFolderMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg text-[11px] font-bold text-left cursor-pointer"
                            >
                                <Pencil size={11} />
                                <span>重命名</span>
                            </button>
                            <button
                                onClick={() => {
                                    handleDeleteFolderConfirm(node.id);
                                    setActiveFolderMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] font-bold text-left cursor-pointer"
                            >
                                <Trash2 size={11} />
                                <span>删除</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Recursive Children */}
                {hasChildren && isExpanded && (
                    <div className="mt-0.5 space-y-0.5">
                        {node.children.map(child => renderFolderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    // Category Tabs Configuration
    const materialTypes = [
        { key: null, label: '全部', icon: Layout },
        { key: 'photo', label: '照片', icon: FileImage },
        { key: 'sticker', label: '贴纸印章', icon: Smile },
        { key: 'background', label: '背景图', icon: FileImage },
        { key: 'font', label: '字体', icon: Type }
    ];

    return (
        <MainLayout title="我的素材" hideSearch={true}>
            <div className="flex h-[calc(100vh-80px)] font-['Outfit',_sans-serif]">
                
                {/* 1. 左侧素材目录树 (Sidebar) */}
                <aside className="w-60 bg-white border-r border-slate-100 flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-5 select-none">
                    
                    {/* Capacity Quota */}
                    {storageQuota && (
                        <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-[18px]">
                            <div className="flex items-center gap-2 text-slate-600 font-bold text-[10px] uppercase tracking-wider mb-2">
                                <HardDrive size={13} />
                                <span>云盘存储额度</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                                <div
                                    className={`h-full transition-all duration-500 rounded-full ${
                                        storageQuota.percentage > 85
                                            ? 'bg-rose-500'
                                            : storageQuota.percentage > 60
                                            ? 'bg-amber-500'
                                            : 'bg-indigo-600'
                                    }`}
                                    style={{ width: `${storageQuota.percentage}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-black text-slate-400">
                                <span>{formatBytes(storageQuota.used)}</span>
                                <span>{formatBytes(storageQuota.total)}</span>
                            </div>
                        </div>
                    )}

                    {/* Directories Header */}
                    <div className="flex items-center justify-between mb-3.5 px-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">素材文件夹</span>
                        <button
                            onClick={() => {
                                setNewFolderParentId(null);
                                setShowNewFolderInput(true);
                            }}
                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                        >
                            <FolderPlus size={14} />
                        </button>
                    </div>

                    {/* New Folder Creation Inline Form */}
                    {showNewFolderInput && (
                        <form onSubmit={handleCreateFolder} className="mb-3 px-2 flex items-center gap-1.5">
                            <input
                                type="text"
                                placeholder={newFolderParentId ? '子文件夹名...' : '文件夹名...'}
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                autoFocus
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-indigo-500 focus:bg-white text-slate-700 font-bold"
                            />
                            <button
                                type="submit"
                                className="w-6 h-6 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                            >
                                <Check size={11} strokeWidth={2.5} />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowNewFolderInput(false);
                                    setNewFolderParentId(null);
                                    setNewFolderName('');
                                }}
                                className="w-6 h-6 flex items-center justify-center bg-slate-50 text-slate-400 rounded-lg border border-slate-200 hover:bg-slate-100 hover:text-slate-650 transition-all cursor-pointer"
                            >
                                <X size={11} />
                            </button>
                        </form>
                    )}

                    {/* Folder Tree list */}
                    <div className="space-y-1">
                        {/* All / Root directory node */}
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleFolderDrop(e, null)}
                            className={`flex items-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all
                                        ${selectedFolderId === null ? 'bg-indigo-50/70 text-indigo-650' : 'text-slate-600 hover:bg-slate-50'}`}
                            onClick={() => setSelectedFolderId(null)}
                        >
                            <FolderOpen size={14} className={selectedFolderId === null ? 'text-indigo-600' : 'text-slate-400'} />
                            <span>所有素材</span>
                        </div>
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleFolderDrop(e, 'root')}
                            className={`flex items-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all
                                        ${selectedFolderId === 'root' ? 'bg-indigo-50/70 text-indigo-650' : 'text-slate-600 hover:bg-slate-50'}`}
                            onClick={() => setSelectedFolderId('root')}
                        >
                            <Folder size={14} className={selectedFolderId === 'root' ? 'text-indigo-600' : 'text-slate-400'} />
                            <span>根目录</span>
                        </div>

                        {/* Folder tree */}
                        <div className="mt-2 space-y-0.5 border-t border-slate-100/50 pt-2">
                            {folderTree.map(node => renderFolderNode(node))}
                        </div>
                    </div>
                </aside>

                {/* 2. 右侧素材展示与搜索区 */}
                <section className="flex-1 bg-slate-50/40 p-8 overflow-y-auto custom-scrollbar flex flex-col relative"
                         onDragOver={handleDragOver}
                         onDragLeave={handleDragLeave}
                         onDrop={handleDrop}>
                    
                    {/* Drag-over overlay */}
                    {isDraggingOver && (
                        <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-[2px] border-4 border-dashed border-indigo-600/30 rounded-2xl z-50 flex items-center justify-center pointer-events-none m-4 animate-in fade-in duration-200">
                            <div className="bg-white px-8 py-6 rounded-[28px] shadow-xl border border-indigo-100 flex flex-col items-center gap-3">
                                <UploadCloud size={40} className="text-indigo-600 animate-bounce" />
                                <p className="text-sm font-black text-slate-800">释放鼠标将文件拖拽上传至该目录</p>
                                <p className="text-xs font-bold text-slate-400">支持批量图片拖拽</p>
                            </div>
                        </div>
                    )}

                    {/* Breadcrumbs & Search */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 select-none">
                        
                        {/* Directory Breadcrumb path */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                            <span className="hover:text-slate-600 cursor-pointer" onClick={() => setSelectedFolderId(null)}>素材库</span>
                            <ChevronRight size={12} />
                            <span className={`cursor-pointer ${!selectedFolderId ? 'text-slate-800' : 'hover:text-slate-600'}`} onClick={() => setSelectedFolderId(null)}>所有</span>
                            
                            {selectedFolderId === 'root' && (
                                <>
                                    <ChevronRight size={12} />
                                    <span className="text-slate-800">根目录</span>
                                </>
                            )}
                            
                            {getBreadcrumbs().map((crumb, idx, arr) => (
                                <div key={crumb.id} className="flex items-center gap-1.5">
                                    <ChevronRight size={12} />
                                    <span
                                        className={`cursor-pointer ${idx === arr.length - 1 ? 'text-slate-800' : 'hover:text-slate-600'}`}
                                        onClick={() => setSelectedFolderId(crumb.id)}
                                    >
                                        {crumb.name}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Search Input and Favorites Filter */}
                        <div className="flex items-center gap-3">
                            {/* Favorite toggle */}
                            <button
                                onClick={() => setFavoriteOnly(!favoriteOnly)}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all cursor-pointer
                                            ${favoriteOnly
                                                ? 'bg-rose-50 border-rose-200 text-rose-500 shadow-sm'
                                                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
                            >
                                <Heart size={15} className={favoriteOnly ? 'fill-rose-500' : ''} />
                            </button>

                            {/* Search bar */}
                            <div className="relative group">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={13} />
                                <input
                                    type="text"
                                    placeholder="检索素材名称..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-white border border-slate-200 rounded-xl py-1.5 pl-9 pr-4 text-xs font-bold text-slate-700 placeholder-slate-400 focus:border-indigo-500 outline-none w-48 md:w-56 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Category Tabs & Upload Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6 select-none">
                        
                        {/* Material Types Filters */}
                        <div className="flex flex-wrap items-center gap-2">
                            {materialTypes.map(tab => {
                                const Icon = tab.icon;
                                const isTabActive = selectedType === tab.key;
                                return (
                                    <button
                                        key={tab.label}
                                        onClick={() => setSelectedType(tab.key)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
                                                    ${isTabActive
                                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <Icon size={13} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Upload Trigger (only if we're not inside system folders) */}
                        {(!selectedFolderId || folders.find(f => f.id === selectedFolderId)?.scope !== 'system') && (
                            <button
                                onClick={triggerFileSelect}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-[0.98]"
                            >
                                <UploadCloud size={14} />
                                <span>上传素材</span>
                            </button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            multiple
                            accept="image/*"
                            className="hidden"
                        />
                    </div>

                    {/* Upload progress items */}
                    {Object.keys(uploadProgresses).length > 0 && (
                        <div className="mb-6 space-y-2 select-none animate-in fade-in slide-in-from-top-4 duration-300">
                            {Object.entries(uploadProgresses).map(([name, progress]) => (
                                <div key={name} className="bg-white border border-slate-100 rounded-xl p-3.5 flex items-center gap-4 shadow-sm">
                                    <Loader2 size={16} className="text-indigo-600 animate-spin shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                                            <span className="truncate pr-4">{name}</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Materials Grid / Content area */}
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center min-h-[40vh]">
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                <Loader2 size={36} className="animate-spin text-indigo-650" />
                                <span className="text-xs font-bold mt-2">载入素材中...</span>
                            </div>
                        </div>
                    ) : materials.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh] text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50 p-8 m-1 select-none">
                            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                                <FileImage size={24} />
                            </div>
                            <h3 className="text-sm font-black text-slate-800 mb-1">空空如也</h3>
                            <p className="text-xs font-bold text-slate-400 max-w-xs leading-relaxed">
                                该目录暂无素材文件。你可以点击右上角上传，或直接拖拽文件到此处。
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col justify-between">
                            {/* Materials List */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 select-none">
                                {materials.map((m) => {
                                    const isFav = m.is_favorite === 1;
                                    const isMaterialEditing = editingMaterialId === m.id;

                                    return (
                                        <div
                                            key={m.id}
                                            draggable={m.scope !== 'system'}
                                            onDragStart={(e) => e.dataTransfer.setData('materialId', m.id)}
                                            className="group bg-white rounded-2xl border border-slate-200/50 hover:border-indigo-200/60 p-3 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col relative"
                                        >
                                            {/* Preview Container */}
                                            <div
                                                onClick={() => setPreviewMaterial(m)}
                                                className="aspect-square bg-slate-50 hover:bg-slate-100/30 rounded-xl overflow-hidden flex items-center justify-center relative cursor-zoom-in group/preview mb-2.5"
                                            >
                                                {/* Sticker SVGs */}
                                                {m.material_type === 'sticker' && m.metadata?.svg ? (
                                                    <div
                                                        className="w-16 h-16 text-slate-700 fill-slate-700 transition-transform duration-300 group-hover/preview:scale-105"
                                                        dangerouslySetInnerHTML={{ __html: m.metadata.svg }}
                                                    />
                                                ) : (
                                                    <img
                                                        src={m.file_url}
                                                        alt={m.name}
                                                        loading="lazy"
                                                        className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover/preview:scale-105"
                                                    />
                                                )}

                                                {/* Float info detail overlay */}
                                                <div className="absolute bottom-1 right-1 opacity-0 group-hover/preview:opacity-100 bg-slate-900/65 text-white text-[8px] font-black tracking-tight px-1.5 py-0.5 rounded transition-all pointer-events-none uppercase">
                                                    {m.material_type}
                                                </div>
                                            </div>

                                            {/* Material Info */}
                                            <div className="flex-1 flex flex-col justify-between min-w-0 pr-1">
                                                {isMaterialEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editingMaterialName}
                                                        onChange={(e) => setEditingMaterialName(e.target.value)}
                                                        onBlur={async () => {
                                                            if (editingMaterialName.trim() && editingMaterialName.trim() !== m.name) {
                                                                await updateMaterial(m.id, editingMaterialName);
                                                            }
                                                            setEditingMaterialId(null);
                                                        }}
                                                        onKeyDown={async (e) => {
                                                            if (e.key === 'Enter') {
                                                                if (editingMaterialName.trim() && editingMaterialName.trim() !== m.name) {
                                                                    await updateMaterial(m.id, editingMaterialName);
                                                                }
                                                                setEditingMaterialId(null);
                                                            }
                                                            if (e.key === 'Escape') setEditingMaterialId(null);
                                                        }}
                                                        autoFocus
                                                        className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[10px] font-bold outline-none"
                                                    />
                                                ) : (
                                                    <span className="text-[11px] font-bold text-slate-800 truncate block group-hover:text-indigo-650 transition-colors" title={m.name}>
                                                        {m.name}
                                                    </span>
                                                )}

                                                <div className="flex items-center justify-between mt-1 text-[9px] font-black text-slate-400">
                                                    <span>{formatBytes(m.file_size)}</span>
                                                    {m.metadata?.width && (
                                                        <span>{m.metadata.width}x{m.metadata.height}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Favorite Heart & Options button Overlay */}
                                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* Favorite Toggle */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleFavorite(m.id);
                                                    }}
                                                    className={`w-6 h-6 rounded-lg bg-white/95 border border-slate-100 flex items-center justify-center transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95
                                                                ${isFav ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'}`}
                                                >
                                                    <Heart size={11} className={isFav ? 'fill-rose-500' : ''} />
                                                </button>

                                                {/* Actions menu (for owned user assets) */}
                                                {m.scope !== 'system' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveMaterialMenu(activeMaterialMenu === m.id ? null : m.id);
                                                        }}
                                                        className="w-6 h-6 rounded-lg bg-white/95 border border-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all shadow-xs cursor-pointer"
                                                    >
                                                        <MoreVertical size={11} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Actions Dropdown for Material */}
                                            {activeMaterialMenu === m.id && (
                                                <div
                                                    ref={materialMenuRef}
                                                    className="absolute right-2.5 top-9 w-28 bg-white rounded-xl shadow-lg border border-slate-100 p-1 z-40 animate-in fade-in slide-in-from-top-1 duration-200"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() => {
                                                            setEditingMaterialId(m.id);
                                                            setEditingMaterialName(m.name);
                                                            setActiveMaterialMenu(null);
                                                        }}
                                                        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-650 rounded-lg text-[10px] font-bold text-left cursor-pointer"
                                                    >
                                                        <Pencil size={10} />
                                                        <span>重命名</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setMovingMaterial(m);
                                                            setActiveMaterialMenu(null);
                                                        }}
                                                        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-650 rounded-lg text-[10px] font-bold text-left cursor-pointer"
                                                    >
                                                        <FolderOpen size={10} />
                                                        <span>移动到...</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('确定要删除此素材吗？云端物理文件也将被永久清除。')) {
                                                                deleteMaterial(m.id);
                                                            }
                                                            setActiveMaterialMenu(null);
                                                        }}
                                                        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-bold text-left cursor-pointer"
                                                    >
                                                        <Trash2 size={10} />
                                                        <span>物理删除</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-3 mt-8 select-none">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => fetchMaterials(currentPage - 1)}
                                        className="px-4 py-2 border border-slate-200 bg-white text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
                                    >
                                        上一页
                                    </button>
                                    <span className="text-xs font-bold text-slate-500">
                                        第 {currentPage} 页 / 共 {totalPages} 页
                                    </span>
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => fetchMaterials(currentPage + 1)}
                                        className="px-4 py-2 border border-slate-200 bg-white text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
                                    >
                                        下一页
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>

            {/* 3. Media Fullscreen Preview Modal */}
            {previewMaterial && (
                <div
                    className="fixed inset-0 bg-slate-900/65 backdrop-blur-[6px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-300 select-none"
                    onClick={() => setPreviewMaterial(null)}
                >
                    <div
                        className="bg-white rounded-[28px] max-w-2xl w-full border border-slate-100 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col md:flex-row"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Media display */}
                        <div className="flex-1 aspect-square md:aspect-auto md:h-96 bg-slate-950 flex items-center justify-center p-4">
                            {previewMaterial.material_type === 'sticker' && previewMaterial.metadata?.svg ? (
                                <div
                                    className="w-48 h-48 text-white fill-white"
                                    dangerouslySetInnerHTML={{ __html: previewMaterial.metadata.svg }}
                                />
                            ) : (
                                <img
                                    src={previewMaterial.file_url}
                                    alt={previewMaterial.name}
                                    className="max-w-full max-h-full object-contain"
                                />
                            )}
                        </div>

                        {/* Details Panel */}
                        <div className="w-full md:w-64 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                                        {previewMaterial.material_type}
                                    </span>
                                    <button
                                        onClick={() => setPreviewMaterial(null)}
                                        className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-150 text-slate-400 hover:text-slate-650 transition-all cursor-pointer"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <h3 className="text-sm font-black text-slate-800 break-words mb-4" title={previewMaterial.name}>
                                    {previewMaterial.name}
                                </h3>

                                <div className="space-y-2.5 text-xs">
                                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400">文件大小</span>
                                        <span className="font-bold text-slate-700">{formatBytes(previewMaterial.file_size)}</span>
                                    </div>
                                    {previewMaterial.metadata?.width && (
                                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                            <span className="text-slate-400">分辨率</span>
                                            <span className="font-bold text-slate-700">{previewMaterial.metadata.width} x {previewMaterial.metadata.height}px</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400">上传时间</span>
                                        <span className="font-bold text-slate-700">{new Date(previewMaterial.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400">来源属性</span>
                                        <span className="font-bold text-slate-700">{previewMaterial.scope === 'system' ? '系统官方' : '个人上传'}</span>
                                    </div>
                                </div>
                            </div>

                            {previewMaterial.file_url && (
                                <a
                                    href={previewMaterial.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all text-center"
                                >
                                    <ExternalLink size={12} />
                                    <span>查看原始大图</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Folder Picker Modal for Moving Material */}
            {movingMaterial && (
                <div
                    className="fixed inset-0 bg-slate-900/65 backdrop-blur-[6px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-350 select-none"
                    onClick={() => setMovingMaterial(null)}
                >
                    <div
                        className="bg-white rounded-[28px] max-w-sm w-full border border-slate-100 p-6 shadow-2xl animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-slate-800">移动素材</h3>
                            <button
                                onClick={() => setMovingMaterial(null)}
                                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        
                        <p className="text-xs text-slate-400 font-bold mb-4 leading-normal">
                            请选择要移动素材 <span className="text-slate-700">"{movingMaterial.name}"</span> 到的目标文件夹：
                        </p>

                        {/* Flat list of folders for selection */}
                        <div className="max-h-60 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl p-1 mb-6 space-y-0.5">
                            <button
                                onClick={async () => {
                                    await updateMaterial(movingMaterial.id, undefined, null);
                                    setMovingMaterial(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold hover:bg-slate-50 text-slate-600 rounded-lg cursor-pointer"
                            >
                                <FolderOpen size={14} className="text-slate-400" />
                                <span>根目录</span>
                            </button>
                            {folders.filter(f => f.scope !== 'system').map(f => (
                                <button
                                    key={f.id}
                                    onClick={async () => {
                                        await updateMaterial(movingMaterial.id, undefined, f.id);
                                        setMovingMaterial(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold hover:bg-slate-50 text-slate-600 rounded-lg cursor-pointer"
                                >
                                    <Folder size={14} className="text-slate-400" />
                                    <span>{f.name}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setMovingMaterial(null)}
                                className="px-4 py-2 border border-slate-200 text-xs font-bold rounded-xl text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
