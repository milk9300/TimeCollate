import React, { useRef } from 'react';
import { useBookStore } from '../store';
import { ImagePlus, Calendar, Plus, MoreHorizontal } from 'lucide-react';

interface ChapterEditorProps {
    chapterId: string | null;
}

export const ChapterEditor: React.FC<ChapterEditorProps> = ({ chapterId }) => {
    const { currentBook, updateChapter, uploadPhotoToChapter } = useBookStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!currentBook || !chapterId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#F9F9F9] text-gray-400">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center mb-4">
                    <MoreHorizontal size={32} strokeWidth={1.5} />
                </div>
                <p className="font-medium tracking-wide">Select a chapter to begin your story</p>
            </div>
        );
    }

    const chapter = currentBook.chapters.find(c => c.id === chapterId);

    if (!chapter) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await uploadPhotoToChapter(chapterId, e.target.files[0]);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-[#F9F9F9] scroll-smooth">
            <div className="max-w-5xl mx-auto py-16 px-8">

                {/* Paper Container */}
                <div className="bg-white rounded-[2rem] shadow-premium border border-gray-100 overflow-hidden flex flex-col min-h-[900px] transition-all duration-500">

                    {/* Header Section */}
                    <div className="p-12 pb-6 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-cta font-bold tracking-[0.2em] uppercase text-xs">
                                <Calendar size={14} />
                                <input
                                    type="date"
                                    value={chapter.date || ''}
                                    onChange={(e) => updateChapter(chapterId, { date: e.target.value })}
                                    className="bg-transparent border-none outline-none cursor-pointer hover:text-primary transition-colors hover:underline decoration-cta/30"
                                />
                            </div>
                            <div className="h-[1px] flex-1 bg-gray-100 mx-6"></div>
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Memoir Series</span>
                        </div>

                        <input
                            type="text"
                            value={chapter.title}
                            onChange={(e) => updateChapter(chapterId, { title: e.target.value })}
                            className="text-5xl font-extrabold text-primary border-none outline-none placeholder-gray-100 w-full tracking-tight focus:ring-0"
                            placeholder="Your Chapter Title"
                        />
                    </div>

                    {/* Editor Body */}
                    <div className="px-12 flex-1 flex flex-col">
                        <textarea
                            value={chapter.content}
                            onChange={(e) => updateChapter(chapterId, { content: e.target.value })}
                            className="w-full flex-1 resize-none border-none outline-none text-xl text-secondary leading-[1.8] min-h-[400px] placeholder-gray-200 focus:ring-0 font-light"
                            placeholder="Start weaving your memories into words..."
                        />
                    </div>

                    <hr className="mx-12 border-gray-50" />

                    {/* Photo Section */}
                    <div className="p-12">
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-cta">
                                    <ImagePlus size={18} />
                                </div>
                                <h3 className="text-xl font-bold text-primary tracking-tight">Visual Memories</h3>
                            </div>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="group flex items-center gap-2 px-5 py-2.5 bg-gray-50 hover:bg-primary hover:text-white rounded-full transition-all duration-300 font-semibold text-sm text-secondary border border-gray-100"
                            >
                                <Plus size={16} className="text-cta group-hover:text-cta" />
                                <span>Add Moments</span>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                            {chapter.photos.map(photo => (
                                <div key={photo.id} className="relative group aspect-[4/5] bg-gray-50 rounded-2xl overflow-hidden shadow-sm hover:shadow-premium transition-all duration-500 cursor-pointer">
                                    <img
                                        src={photo.url}
                                        alt={photo.caption}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                                        <p className="text-white text-xs font-semibold tracking-wide uppercase">{photo.file ? 'Uploading...' : 'Snapshot'}</p>
                                    </div>
                                </div>
                            ))}

                            {chapter.photos.length === 0 && (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square border-2 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center text-gray-300 cursor-pointer hover:border-cta hover:bg-gray-50 hover:text-cta transition-all duration-300 group"
                                >
                                    <ImagePlus size={40} strokeWidth={1} className="mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-semibold tracking-wide">Import Photos</span>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer info */}
                <div className="mt-8 flex justify-center items-center gap-8 text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em]">
                    <span>Auto-Saving Enabled</span>
                    <span className="w-1 h-1 rounded-full bg-cta opacity-50"></span>
                    <span>Luxury Digital Edition</span>
                </div>
            </div>
        </div>
    );
};
