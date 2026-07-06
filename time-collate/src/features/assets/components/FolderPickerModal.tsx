import React from 'react';
import { X, FolderOpen, Folder } from 'lucide-react';
import { useAssetStore } from '../../../store/useAssetStore';

interface FolderPickerModalProps {
    title: string;
    description: React.ReactNode;
    onClose: () => void;
    onSelectFolder: (folderId: string | null) => Promise<void> | void;
}

export function FolderPickerModal({
    title,
    description,
    onClose,
    onSelectFolder
}: FolderPickerModalProps) {
    const { folders } = useAssetStore();

    return (
        <div
            className="fixed inset-0 bg-slate-900/65 backdrop-blur-[6px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-350 select-none"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-[28px] max-w-sm w-full border border-slate-100 p-6 shadow-2xl animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-650 cursor-pointer"
                    >
                        <X size={14} />
                    </button>
                </div>
                
                <p className="text-xs text-slate-400 font-bold mb-4 leading-normal">
                    {description}
                </p>

                {/* Flat list of folders for selection */}
                <div className="max-h-60 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl p-1 mb-6 space-y-0.5">
                    <button
                        onClick={() => onSelectFolder(null)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold hover:bg-slate-50 text-slate-600 rounded-lg cursor-pointer"
                    >
                        <FolderOpen size={14} className="text-slate-400" />
                        <span>所有素材</span>
                    </button>
                    {folders.filter(f => f.scope !== 'system').map(f => (
                        <button
                            key={f.id}
                            onClick={() => onSelectFolder(f.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold hover:bg-slate-50 text-slate-600 rounded-lg cursor-pointer"
                        >
                            <Folder size={14} className="text-slate-400" />
                            <span>{f.name}</span>
                        </button>
                    ))}
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-200 text-xs font-bold rounded-xl text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                        取消
                    </button>
                </div>
            </div>
        </div>
    );
}
