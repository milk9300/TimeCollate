import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical } from 'lucide-react';
import type { Photo } from '../types';

interface SortablePhotoItemProps {
    photo: Photo;
    index: number;
    isOverflow: boolean;
    onDelete: () => void;
}

/**
 * @description 可拖拽排序的照片卡片
 * 使用 @dnd-kit/sortable 实现拖拽功能
 */
export const SortablePhotoItem: React.FC<SortablePhotoItemProps> = ({
    photo,
    index,
    isOverflow,
    onDelete
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: photo.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.8 : undefined
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                aspect-square bg-gray-100 rounded-lg overflow-hidden relative group transition-all duration-200
                ${isOverflow ? 'ring-2 ring-gray-100 grayscale-[0.8] opacity-60' : ''}
                ${isDragging ? 'shadow-xl ring-2 ring-cta scale-105' : ''}
            `}
        >
            <img
                src={photo.url}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                alt="照片"
                draggable={false}
            />

            {/* 溢出标识 */}
            {isOverflow && (
                <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[8px] text-white font-bold py-1 text-center">
                    不在此页显示
                </div>
            )}

            {/* 拖拽手柄 */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-1 left-1 w-5 h-5 rounded bg-white/90 backdrop-blur shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all z-20"
            >
                <GripVertical size={12} className="text-gray-500" />
            </div>

            {/* 排序角标 */}
            <div className="absolute bottom-1 left-1 w-4 h-4 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center text-[8px] font-bold text-gray-600">
                {index + 1}
            </div>

            {/* 删除按钮 */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
            >
                <X size={12} className="text-white" />
            </button>
        </div>
    );
};
