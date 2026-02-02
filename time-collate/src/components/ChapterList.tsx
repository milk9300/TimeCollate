import React, { useState } from 'react';
import { useBookStore } from '../store';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, PlusCircle, GripVertical } from 'lucide-react';

interface SortableItemProps {
    id: string;
    title: string;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
}

function SortableItem({ id, title, isActive, onSelect, onDelete }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center gap-3 p-3 mb-2 rounded-xl transition-all duration-300 cursor-pointer ${isActive
                    ? 'bg-primary text-white shadow-premium ring-1 ring-white/10'
                    : 'bg-white/50 hover:bg-white text-secondary hover:shadow-md'
                }`}
            onClick={onSelect}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-gray-400 group-hover:text-gray-600 transition-colors"
            >
                <GripVertical size={18} />
            </div>

            <span className="flex-1 font-medium truncate">{title || 'Untitled Chapter'}</span>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${isActive ? 'hover:bg-white/20 text-white/70 hover:text-white' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                    }`}
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}

interface ChapterListProps {
    activeChapterId: string | null;
    onSelectChapter: (id: string) => void;
}

export const ChapterList: React.FC<ChapterListProps> = ({ activeChapterId, onSelectChapter }) => {
    const { currentBook, addChapter, deleteChapter, reorderChapters } = useBookStore();
    const [isCreating, setIsCreating] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    if (!currentBook) return <div className="p-4 text-gray-500 animate-pulse">Loading collection...</div>;

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = currentBook.chapters.findIndex((c) => c.id === active.id);
            const newIndex = currentBook.chapters.findIndex((c) => c.id === over.id);
            const newChapters = arrayMove(currentBook.chapters, oldIndex, newIndex);
            reorderChapters(newChapters);
        }
    };

    const handleAdd = async () => {
        if (isCreating) return;
        setIsCreating(true);
        await addChapter(`Chapter ${currentBook.chapters.length + 1}`);
        setIsCreating(false);
    };

    return (
        <div className="flex flex-col h-full glass-premium border-r border-gray-100 w-80 shadow-premium z-10">
            <div className="p-8 border-b border-gray-50 bg-white/40 backdrop-blur-sm">
                <h2 className="text-2xl font-bold text-primary tracking-tight">{currentBook.title}</h2>
                <p className="text-xs font-semibold uppercase tracking-widest text-cta mt-1 opacity-80">{currentBook.author}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-1">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={currentBook.chapters.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {currentBook.chapters.map((chapter) => (
                            <SortableItem
                                key={chapter.id}
                                id={chapter.id}
                                title={chapter.title}
                                isActive={chapter.id === activeChapterId}
                                onSelect={() => onSelectChapter(chapter.id)}
                                onDelete={() => deleteChapter(chapter.id)}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>

            <div className="p-6 border-t border-gray-50 bg-white/40 backdrop-blur-sm">
                <button
                    onClick={handleAdd}
                    disabled={isCreating}
                    className="group w-full py-3 px-4 bg-primary hover:bg-black text-white rounded-xl shadow-premium transition-all duration-300 font-semibold flex justify-center items-center gap-2 overflow-hidden relative"
                >
                    <div className="absolute inset-0 luxury-gold-gradient opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    <PlusCircle size={20} className="text-cta" />
                    <span>{isCreating ? 'Creating...' : 'New Chapter'}</span>
                </button>
            </div>
        </div>
    );
};
