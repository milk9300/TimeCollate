import React, { useEffect, useState, useRef } from 'react';
import {
    FolderOpen,
    FolderPlus,
    Folder,
    MoreVertical,
    Pencil,
    Trash2,
    Check,
    X,
    HardDrive,
    ChevronRight,
    ChevronDown
} from 'lucide-react';
import { useAssetStore } from '../../../store/useAssetStore';
import { buildFolderTree } from '../utils/treeHelper';
import type { FolderNode } from '../utils/treeHelper';
import type { MaterialFolder } from '../services/assetService';

interface AssetSidebarProps {
    isEmbed?: boolean;
    dataSource: 'local' | 'pexels';
    setDataSource: (src: 'local' | 'pexels') => void;
    handleFolderDragStart: (e: React.DragEvent, folderId: string) => void;
    handleFolderDrop: (e: React.DragEvent, targetFolderId: string | null) => void;
}

export function AssetSidebar({
    isEmbed = false,
    dataSource,
    setDataSource,
    handleFolderDragStart,
    handleFolderDrop
}: AssetSidebarProps) {
    const {
        folders,
        storageQuota,
        selectedFolderId,
        setSelectedFolderId,
        createFolder,
        updateFolder,
        deleteFolder
    } = useAssetStore();

    // Sidebar local states
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [activeFolderMenu, setActiveFolderMenu] = useState<string | null>(null);
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingFolderName, setEditingFolderName] = useState('');
    const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const folderMenuRef = useRef<HTMLDivElement>(null);

    // Format bytes utility
    const formatBytes = (bytes: number, decimals = 2) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    // Close folder menu on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (folderMenuRef.current && !folderMenuRef.current.contains(event.target as Node)) {
                setActiveFolderMenu(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleFolderExpand = (folderId: string) => {
        setExpandedFolders(prev => ({
            ...prev,
            [folderId]: !prev[folderId]
        }));
    };

    const handleCreateFolderSubmit = async (e: React.FormEvent) => {
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
                    onClick={() => {
                        setDataSource('local');
                        setSelectedFolderId(node.id);
                    }}
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
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-650 rounded-lg text-[11px] font-bold text-left cursor-pointer"
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

    return (
        <aside className="w-60 bg-white border-r border-slate-100 flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-5 select-none h-full">
            {/* 数据源切换 Tab */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6 select-none shrink-0">
                <button
                    onClick={() => setDataSource('local')}
                    className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer
                                ${dataSource === 'local' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    我的素材
                </button>
                <button
                    onClick={() => setDataSource('pexels')}
                    className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer
                                ${dataSource === 'pexels' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    图库推荐
                </button>
            </div>

            {dataSource === 'local' ? (
                <>
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
                        <form onSubmit={handleCreateFolderSubmit} className="mb-3 px-2 flex items-center gap-1.5">
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
                        {/* All Materials node */}
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleFolderDrop(e, null)}
                            className={`flex items-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all
                                        ${selectedFolderId === null ? 'bg-indigo-50/70 text-indigo-650' : 'text-slate-600 hover:bg-slate-50'}`}
                            onClick={() => {
                                setDataSource('local');
                                setSelectedFolderId(null);
                            }}
                        >
                            <FolderOpen size={14} className={selectedFolderId === null ? 'text-indigo-600' : 'text-slate-400'} />
                            <span>所有素材</span>
                        </div>

                        {/* Folder tree */}
                        <div className="mt-2 space-y-0.5 border-t border-slate-100/50 pt-2">
                            {folderTree.map(node => renderFolderNode(node))}
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-4 text-slate-400">
                    <span className="text-[10px] font-bold">已切换为第三方库</span>
                    <span className="text-[9px] mt-1 text-slate-300">通过右侧搜索框检索 Pexels 资源</span>
                </div>
            )}
        </aside>
    );
}
