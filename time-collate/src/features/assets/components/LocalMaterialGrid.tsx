import React, { useRef, useState } from 'react';
import {
    ChevronRight,
    Search,
    Heart,
    FolderOpen,
    Trash2,
    Check,
    UploadCloud,
    Loader2,
    X,
    MoreVertical,
    Pencil
} from 'lucide-react';
import { useAssetStore } from '../../../store/useAssetStore';
import type { Material } from '../services/assetService';

interface LocalMaterialGridProps {
    isEmbed?: boolean;
    selectedMaterialIds: string[];
    setSelectedMaterialIds: React.Dispatch<React.SetStateAction<string[]>>;
    onPreviewMaterial: (m: Material) => void;
    onMoveMaterial: (m: Material) => void;
    onBatchMove: () => void;
    handleFolderDragStart: (e: React.DragEvent, id: string) => void;
    handleFolderDrop: (e: React.DragEvent, targetId: string | null) => void;
}

export function LocalMaterialGrid({
    selectedMaterialIds,
    setSelectedMaterialIds,
    onPreviewMaterial,
    onMoveMaterial,
    onBatchMove
}: LocalMaterialGridProps) {
    const {
        folders,
        materials,
        totalPages,
        currentPage,
        isLoading,
        selectedFolderId,
        setSelectedFolderId,
        searchQuery,
        setSearchQuery,
        favoriteOnly,
        setFavoriteOnly,
        uploadProgresses,
        fetchMaterials,
        uploadMaterials,
        updateMaterial,
        deleteMaterial,
        batchDeleteMaterials
    } = useAssetStore();

    // Local UI states
    const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
    const [editingMaterialName, setEditingMaterialName] = useState('');
    const [activeMaterialMenu, setActiveMaterialMenu] = useState<string | null>(null);
    const [uploadTags, setUploadTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const materialMenuRef = useRef<HTMLDivElement>(null);

    // Format bytes utility
    const formatBytes = (bytes: number, decimals = 2) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    // Close options dropdown on outside click
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (materialMenuRef.current && !materialMenuRef.current.contains(event.target as Node)) {
                setActiveMaterialMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Selection Helpers
    const toggleSelectMaterial = (id: string) => {
        const mat = materials.find(m => m.id === id);
        if (!mat || mat.scope === 'system') return; // Cannot operate system official assets
        setSelectedMaterialIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        const selectablePageIds = materials
            .filter(m => m.scope !== 'system')
            .map(m => m.id);

        if (selectablePageIds.length === 0) return;

        const isAllSelectablePageSelected = selectablePageIds.every(id => selectedMaterialIds.includes(id));

        if (isAllSelectablePageSelected) {
            setSelectedMaterialIds(prev => prev.filter(id => !selectablePageIds.includes(id)));
        } else {
            setSelectedMaterialIds(prev => {
                const union = new Set([...prev, ...selectablePageIds]);
                return Array.from(union);
            });
        }
    };

    const handleBatchDelete = async () => {
        if (confirm(`确定要物理删除选中的 ${selectedMaterialIds.length} 个素材吗？云端物理文件也将被永久清除，不可恢复。`)) {
            try {
                await batchDeleteMaterials(selectedMaterialIds);
                setSelectedMaterialIds([]);
            } catch (err) {
                alert(err instanceof Error ? err.message : '批量删除失败');
            }
        }
    };

    // Folder breadcrumbs calculation
    const getBreadcrumbs = () => {
        if (!selectedFolderId || selectedFolderId === 'root') return [];
        const crumbs: any[] = [];
        let current = folders.find(f => f.id === selectedFolderId);
        while (current) {
            crumbs.unshift(current);
            const parentId = current.parent_id;
            current = parentId ? folders.find(f => f.id === parentId) : undefined;
        }
        return crumbs;
    };

    // File Upload handlers
    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        await uploadSelectedFiles(files);
    };

    const uploadSelectedFiles = async (files: File[]) => {
        try {
            const uploadFolderId = selectedFolderId === 'root' ? null : selectedFolderId;
            await uploadMaterials(files, uploadFolderId, 'photo', uploadTags);
            setUploadTags([]);
        } catch (err) {
            alert(err instanceof Error ? err.message : '上传素材失败');
        }
    };

    // HTML5 Drag and Drop uploads
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        const activeFolderScope = folders.find(f => f.id === selectedFolderId)?.scope;
        if (activeFolderScope === 'system') return; // Cannot upload to official system directories
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
            const imageFiles = files.filter(f => f.type.startsWith('image/'));
            if (imageFiles.length === 0) {
                alert('只允许拖拽上传图片格式的文件');
                return;
            }
            await uploadSelectedFiles(imageFiles);
        }
    };

    const isCurrentFolderSystem = selectedFolderId && folders.find(f => f.id === selectedFolderId)?.scope === 'system';

    return (
        <section
            className="flex-1 bg-slate-50/40 p-8 overflow-y-auto custom-scrollbar flex flex-col relative h-full"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
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
                                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-650'}`}
                    >
                        <Heart size={15} className={favoriteOnly ? 'fill-rose-500' : ''} />
                    </button>

                    {/* Search bar */}
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-650 transition-colors" size={13} />
                        <input
                            type="text"
                            placeholder="检索图片名称..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl py-1.5 pl-9 pr-4 text-xs font-bold text-slate-700 placeholder-slate-400 focus:border-indigo-500 outline-none w-48 md:w-56 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Upload Button Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 border-b border-slate-100 pb-4 mb-6 select-none">
                {/* Upload Trigger (only if we're not inside system folders) */}
                {!isCurrentFolderSystem && (
                    <button
                        onClick={triggerFileSelect}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-[0.98]"
                    >
                        上传图片
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

            {/* Batch Action Toolbar */}
            {selectedMaterialIds.length > 0 && (
                <div className="mb-6 bg-indigo-600 text-white px-5 py-3 rounded-2xl flex items-center justify-between shadow-lg shadow-indigo-600/20 select-none animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={handleSelectAll}
                            className="text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                        >
                            {materials.filter(m => m.scope !== 'system').every(id => selectedMaterialIds.includes(id.id))
                                ? '取消全选'
                                : '全选本页'}
                        </button>
                        <span className="text-xs font-bold opacity-90">已选中 {selectedMaterialIds.length} 个图片文件</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={onBatchMove}
                            className="flex items-center gap-1.5 text-xs font-bold bg-white text-indigo-650 hover:bg-slate-50 px-4 py-1.5 rounded-xl transition-all shadow-md cursor-pointer"
                        >
                            批量移动...
                        </button>
                        <button
                            onClick={handleBatchDelete}
                            className="flex items-center gap-1.5 text-xs font-bold bg-rose-500 hover:bg-rose-600 border border-rose-450 px-4 py-1.5 rounded-xl transition-all shadow-md cursor-pointer"
                        >
                            批量删除
                        </button>
                        <button
                            onClick={() => setSelectedMaterialIds([])}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Materials Grid / Content area */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center min-h-[40vh]">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Loader2 size={36} className="animate-spin text-indigo-650" />
                        <span className="text-xs font-bold mt-2">载入图片中...</span>
                    </div>
                </div>
            ) : materials.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh] text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50 p-8 m-1 select-none">
                    <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                        <FolderOpen size={24} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 mb-1">暂无文件</h3>
                    <p className="text-xs font-bold text-slate-400 max-w-xs leading-relaxed">
                        该目录暂无图片资源。你可以点击右上角上传，或直接拖拽文件到此处。
                    </p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col justify-between">
                    {/* Materials List */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 select-none">
                        {materials.map((m) => {
                            const isMaterialEditing = editingMaterialId === m.id;
                            const isSelected = selectedMaterialIds.includes(m.id);
                            const canSelect = m.scope !== 'system';

                            return (
                                <div
                                    key={m.id}
                                    draggable={m.scope !== 'system'}
                                    onDragStart={(e) => e.dataTransfer.setData('materialId', m.id)}
                                    onClick={(e) => {
                                        if (selectedMaterialIds.length > 0) {
                                            toggleSelectMaterial(m.id);
                                        }
                                    }}
                                    className={`group bg-white rounded-2xl border p-3 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col relative cursor-pointer
                                                ${isSelected 
                                                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10' 
                                                    : 'border-slate-200/50 hover:border-indigo-200/60'}`}
                                >
                                    {/* Selection Checkbox */}
                                    {canSelect && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSelectMaterial(m.id);
                                            }}
                                            className={`absolute top-2.5 left-2.5 w-6 h-6 rounded-full flex items-center justify-center border transition-all z-20 shadow-xs cursor-pointer
                                                        ${isSelected
                                                            ? 'bg-indigo-600 border-indigo-600 text-white opacity-100'
                                                            : `bg-white/95 border-slate-200 hover:border-slate-350 text-slate-300 hover:text-slate-450
                                                               ${selectedMaterialIds.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}`}
                                        >
                                            <Check size={11} strokeWidth={3} className={isSelected ? 'block' : 'opacity-0 hover:opacity-100 transition-opacity'} />
                                        </button>
                                    )}

                                    {/* Preview Container */}
                                    <div
                                        onClick={(e) => {
                                            if (selectedMaterialIds.length > 0) {
                                                e.stopPropagation();
                                                toggleSelectMaterial(m.id);
                                            } else {
                                                onPreviewMaterial(m);
                                            }
                                        }}
                                        className="aspect-square bg-slate-50 hover:bg-slate-100/30 rounded-xl overflow-hidden flex items-center justify-center relative cursor-zoom-in group/preview mb-2.5"
                                    >
                                        <img
                                            src={m.file_url ? `${m.file_url}?w=300` : ''}
                                            alt={m.name}
                                            loading="lazy"
                                            className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover/preview:scale-105"
                                        />
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

                                    {/* Options button Overlay */}
                                    {selectedMaterialIds.length === 0 && (
                                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMaterialMenu(activeMaterialMenu === m.id ? null : m.id);
                                                }}
                                                className="w-6 h-6 rounded-lg bg-white/95 border border-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all shadow-xs cursor-pointer"
                                            >
                                                <MoreVertical size={11} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Actions Dropdown for Material */}
                                    {activeMaterialMenu === m.id && (
                                        <div
                                            ref={materialMenuRef}
                                            className="absolute right-2.5 top-9 w-28 bg-white rounded-xl shadow-lg border border-slate-200/50 p-1 z-40 animate-in fade-in slide-in-from-top-1 duration-200"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() => {
                                                    setEditingMaterialId(m.id);
                                                    setEditingMaterialName(m.name);
                                                    setActiveMaterialMenu(null);
                                                }}
                                                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-655 rounded-lg text-[10px] font-bold text-left cursor-pointer"
                                            >
                                                <Pencil size={10} />
                                                <span>重命名</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    onMoveMaterial(m);
                                                    setActiveMaterialMenu(null);
                                                }}
                                                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-655 rounded-lg text-[10px] font-bold text-left cursor-pointer"
                                            >
                                                <FolderOpen size={10} />
                                                <span>移动到...</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('确定要删除此图片吗？云端物理文件也将被永久清除。')) {
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
    );
}
