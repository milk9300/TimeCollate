import React, { useRef, useState } from 'react';
import { useBookStore, getVirtualChapters } from '../../../store';
import { Upload, Trash2, Check, AlertCircle } from 'lucide-react';
import { getPhotoForSlot } from '../../../utils/slotHelper';
import { getThumbnailUrl } from '../../../utils/cdn';

interface PhotoAssetPanelProps {
    activeChapterId: string | null;
    activePageId: string | null;
}

/**
 * @description 侧边栏照片素材管理面板
 * 支持拖拽照片、照片上传、删除以及显示照片在当前页面槽位中的使用状态
 */
export const PhotoAssetPanel: React.FC<PhotoAssetPanelProps> = ({
    activeChapterId,
    activePageId
}) => {
    const { currentBook, uploadPhotoToPage, deletePhotoFromPage, templates } = useBookStore();
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!currentBook) return null;

    const chapters = React.useMemo(() => {
        if (!currentBook || !currentBook.pages) return [];
        return getVirtualChapters(currentBook.pages);
    }, [currentBook]);

    const targetChapterId = activeChapterId || (chapters.length > 0 ? chapters[0].id : null);
    const targetPageId = activePageId || (chapters.length > 0 && chapters[0].pages.length > 0 ? chapters[0].pages[0].id : null);

    if (!targetChapterId || !targetPageId) {
        return (
            <div className="text-center py-6 text-gray-400 text-xs">
                暂无页面，请先在左侧新建页面。
            </div>
        );
    }

    const activeChapter = chapters.find(c => c.id === targetChapterId);
    const activePage = activeChapter?.pages.find(p => p.id === targetPageId);

    const photos = (activePage?.photos || []).filter(p => p && p.url);
    const activeTemplate = templates.find(t => t.id === activePage?.layout);

    // 计算当前页面已在槽位中使用的图片ID集合
    const usedPhotoIds = new Set<string>();
    if (activePage) {
        if (activeTemplate) {
            activeTemplate.layoutSchema.elements.forEach(element => {
                if (element.type === 'photo') {
                    const slotIndex = element.slotIndex ?? 0;
                    const resolvedPhoto = getPhotoForSlot(activePage.photos, slotIndex);
                    if (resolvedPhoto && resolvedPhoto.url) {
                        usedPhotoIds.add(resolvedPhoto.id);
                    }
                }
            });
        } else {
            activePage.photos.forEach(p => {
                if (p.slotIndex !== undefined && p.url) {
                    usedPhotoIds.add(p.id);
                }
            });
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        setIsUploading(true);
        try {
            for (let i = 0; i < files.length; i++) {
                await uploadPhotoToPage(targetChapterId, targetPageId, files[i]);
            }
        } catch (error) {
            console.error('Failed to upload files:', error);
            alert('照片上传失败，请重试');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeletePhoto = async (photoId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('确认删除这张图片吗？')) {
            await deletePhotoFromPage(targetChapterId, targetPageId, photoId);
        }
    };

    const handleDragStart = (e: React.DragEvent, photoUrl: string, photoId: string) => {
        e.dataTransfer.setData('text/plain', photoUrl);
        e.dataTransfer.setData('photoId', photoId);
        e.dataTransfer.setData('sourcePageId', targetPageId);
        e.dataTransfer.setData('sourceChapterId', targetChapterId);
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    return (
        <div className="space-y-3">
            {/* 上传区域 */}
            <div 
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center border border-dashed border-gray-300 hover:border-indigo-500 rounded-lg py-4 px-3 cursor-pointer transition-all hover:bg-indigo-50/10 text-gray-400 hover:text-indigo-600 gap-1 bg-gray-50/50 ${
                    isUploading ? 'opacity-50 pointer-events-none' : ''
                }`}
            >
                <Upload size={14} className={isUploading ? 'animate-bounce' : ''} />
                <span className="text-[10px] font-bold tracking-wide">
                    {isUploading ? '正在上传照片...' : '添加本地照片'}
                </span>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                />
            </div>

            {/* 照片网格列表 */}
            <div className="grid grid-cols-2 gap-2 max-h-[190px] overflow-y-auto pr-1 select-none scrollbar-thin">
                {photos.length > 0 ? (
                    photos.map((photo) => {
                        const isUsed = usedPhotoIds.has(photo.id);
                        return (
                            <div 
                                key={photo.id}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, photo.url, photo.id)}
                                className={`group relative aspect-[4/3] rounded-md overflow-hidden border bg-gray-50 flex-shrink-0 shadow-sm hover:shadow transition-all cursor-grab active:cursor-grabbing ${
                                    isUsed 
                                        ? 'border-green-200 opacity-90 hover:border-indigo-400' 
                                        : 'border-gray-200 hover:border-indigo-400'
                                }`}
                            >
                                <img 
                                    src={getThumbnailUrl(photo.url, 200)} 
                                    className="w-full h-full object-cover pointer-events-none" 
                                    alt="素材照片" 
                                />
                                
                                {/* 已使用状态遮罩 */}
                                {isUsed && (
                                    <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center pointer-events-none">
                                        <span className="bg-green-600 text-white text-[8px] font-bold tracking-wider px-1 py-0.5 rounded shadow flex items-center gap-0.5">
                                            <Check size={8} className="stroke-[3]" />
                                            已使用
                                        </span>
                                    </div>
                                )}

                                {/* Hover 时的垃圾桶删除按钮 */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all z-20">
                                    <button
                                        onClick={(e) => handleDeletePhoto(photo.id, e)}
                                        className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors shadow-md"
                                        title="从本页删除"
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                                
                                {/* 未使用时的轻量级拖拽提示 */}
                                {!isUsed && (
                                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[7px] px-1 py-0.5 rounded opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        可拖拽
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-2 py-6 text-center text-gray-400 border border-dashed border-gray-200 rounded-lg">
                        <span className="text-[10px] font-medium">此页面暂无图片素材</span>
                    </div>
                )}
            </div>

            {/* 友情操作提示 */}
            <div className="text-[9px] text-gray-400 leading-normal flex items-start gap-1 bg-indigo-50/30 border border-indigo-100/50 p-2 rounded-lg">
                <AlertCircle size={10} className="mt-0.5 flex-shrink-0 text-indigo-500" />
                <span>可直接将上方图片或下方贴纸拖拽至画布相应区域。</span>
            </div>
        </div>
    );
};
