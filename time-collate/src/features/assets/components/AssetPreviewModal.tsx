import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { getThumbnailUrl } from '../../../utils/cdn';

interface AssetPreviewModalProps {
    previewMaterial: any;
    onClose: () => void;
}

export function AssetPreviewModal({ previewMaterial, onClose }: AssetPreviewModalProps) {
    if (!previewMaterial) return null;

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <div
            className="fixed inset-0 bg-slate-900/65 backdrop-blur-[6px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-300 select-none"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-[28px] max-w-2xl w-full border border-slate-100 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col md:flex-row"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Media display */}
                <div className="flex-1 aspect-square md:aspect-auto md:h-96 bg-slate-950 flex items-center justify-center p-4">
                    <img
                        src={getThumbnailUrl(previewMaterial.file_url, 800)}
                        alt={previewMaterial.name}
                        className="max-w-full max-h-full object-contain"
                    />
                </div>

                {/* Details Panel */}
                <div className="w-full md:w-64 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100">
                    <div>
                        <div className="flex items-center justify-end mb-4">
                            <button
                                onClick={onClose}
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
    );
}
