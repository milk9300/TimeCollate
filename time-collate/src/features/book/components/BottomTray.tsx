import React, { useRef, useState } from 'react';
import { useBookStore, getVirtualChapters } from '../../../store';
import { Image as ImageIcon, Upload, Trash2, ChevronDown, ChevronUp, AlertCircle, Check } from 'lucide-react';
import { getPhotoForSlot } from '../../../utils/slotHelper';

interface BottomTrayProps {
    activeChapterId: string | null;
    activePageId: string | null;
    isCollapsed?: boolean;
    onCollapseChange?: (collapsed: boolean) => void;
}

export const BottomTray: React.FC<BottomTrayProps> = ({
    activeChapterId,
    activePageId,
    isCollapsed: propIsCollapsed,
    onCollapseChange
}) => {
    const { currentBook, uploadPhotoToPage, deletePhotoFromPage, templates } = useBookStore();
    const [localIsCollapsed, setLocalIsCollapsed] = useState(false);

    const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : localIsCollapsed;
    const setIsCollapsed = (collapsed: boolean) => {
        if (onCollapseChange) {
            onCollapseChange(collapsed);
        } else {
            setLocalIsCollapsed(collapsed);
        }
    };
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!currentBook) return null;

    const chapters = React.useMemo(() => {
        if (!currentBook || !currentBook.pages) return [];
        return getVirtualChapters(currentBook.pages);
    }, [currentBook]);

    // Resolve target IDs with fallback to the first page of the first chapter
    const targetChapterId = activeChapterId || (chapters.length > 0 ? chapters[0].id : null);
    const targetPageId = activePageId || (chapters.length > 0 && chapters[0].pages.length > 0 ? chapters[0].pages[0].id : null);

    if (!targetChapterId || !targetPageId) return null;

    // Get active chapter and page
    const activeChapter = chapters.find(c => c.id === targetChapterId);
    const activePage = activeChapter?.pages.find(p => p.id === targetPageId);

    const photos = (activePage?.photos || []).filter(p => p && p.url);
    const activeTemplate = templates.find(t => t.id === activePage?.templateId);

    // Compute the set of actually used photos on the active page
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
            // Fallback if template is not loaded yet
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
        <div 
            id="editor-bottom-tray"
            className={`bg-white border-t border-gray-200 shadow-lg transition-all duration-300 flex flex-col relative z-20 ${
                isCollapsed ? 'h-10' : 'h-40'
            }`}
        >
            {/* Tray Header Bar */}
            <div className="px-6 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                <div className="flex items-center gap-2">
                    <ImageIcon size={14} className="text-indigo-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                        照片素材栏 ({photos.length} 张照片)
                    </span>
                    {!isCollapsed && (
                        <span className="text-[9px] text-gray-400 font-bold bg-indigo-50/50 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertCircle size={10} />
                            可直接拖拽照片到画布的图片框中
                        </span>
                    )}
                </div>
                <button 
                    className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
                >
                    {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {/* Tray Content Panel */}
            {!isCollapsed && (
                <div className="flex-1 flex overflow-hidden p-3 gap-3">
                    {/* Upload Section */}
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-indigo-500 rounded-xl px-6 h-full cursor-pointer transition-all hover:bg-indigo-50/5 text-gray-400 hover:text-indigo-600 flex-shrink-0 gap-1.5 ${
                            isUploading ? 'opacity-50 pointer-events-none' : ''
                        }`}
                    >
                        <Upload size={18} />
                        <span className="text-[10px] font-black tracking-wide">
                            {isUploading ? '正在上传...' : '添加本地照片'}
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

                    {/* Scrollable Gallery */}
                    <div className="flex-1 flex gap-3 overflow-x-auto overflow-y-hidden pb-1 items-center">
                        {photos.length > 0 ? (
                            photos.map((photo) => {
                                const isUsed = usedPhotoIds.has(photo.id);
                                return (
                                    <div 
                                        key={photo.id}
                                        draggable={true}
                                        onDragStart={(e) => handleDragStart(e, photo.url, photo.id)}
                                        className={`group relative aspect-square h-[100px] rounded-lg overflow-hidden border bg-gray-50 flex-shrink-0 shadow-sm hover:shadow transition-all cursor-grab active:cursor-grabbing ${
                                            isUsed 
                                                ? 'border-green-200 opacity-60 hover:border-indigo-400' 
                                                : 'border-gray-200/80 hover:border-indigo-400'
                                        }`}
                                    >
                                        <img 
                                            src={photo.url} 
                                            className="w-full h-full object-cover select-none pointer-events-none" 
                                            alt="素材照片" 
                                        />
                                        
                                        {/* Placed indicator */}
                                        {isUsed && (
                                            <>
                                                <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
                                                    <span className="bg-green-600 text-white text-[8px] font-black tracking-wider px-2 py-0.5 rounded shadow flex items-center gap-1">
                                                        <Check size={8} className="stroke-[3.5]" />
                                                        已使用
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        {/* Action Hover overlay (allow deleting from page) */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all z-20">
                                            <button
                                                onClick={(e) => handleDeletePhoto(photo.id, e)}
                                                className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                                                title="从本页删除"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        
                                        {/* Miniature drag visual hint */}
                                        {!isUsed && (
                                            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded font-black opacity-60 group-hover:opacity-100 transition-opacity">
                                                DRAG
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex-1 h-full flex flex-col items-center justify-center border border-dashed border-gray-200/50 rounded-xl text-gray-400">
                                <span className="text-xs font-semibold">此页面暂无图片素材。上传图片即可开始排版。</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
