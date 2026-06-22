import React from 'react';
import { LayoutTemplate, Image, Sparkles, Settings2, Sliders } from 'lucide-react';
import { useBookStore } from '../../../store';

interface RightEditorDockProps {
    activeTab: 'templates' | 'photos' | 'decorations' | 'global' | 'inspector' | null;
    setActiveTab: (tab: 'templates' | 'photos' | 'decorations' | 'global' | 'inspector' | null) => void;
    isDrawerOpen: boolean;
    setIsDrawerOpen: (open: boolean) => void;
}

export const RightEditorDock: React.FC<RightEditorDockProps> = ({
    activeTab,
    setActiveTab,
    isDrawerOpen,
    setIsDrawerOpen
}) => {
    const activePhotoEdit = useBookStore(state => state.activePhotoEdit);
    const activeTextEdit = useBookStore(state => state.activeTextEdit);
    const activeStickerEdit = useBookStore(state => state.activeStickerEdit);
    const hasSelection = !!(activePhotoEdit || activeTextEdit || activeStickerEdit);

    const dockItems = React.useMemo(() => [
        { id: 'templates' as const, label: '排版模板', icon: <LayoutTemplate size={20} /> },
        { id: 'photos' as const, label: '照片图库', icon: <Image size={20} /> },
        { id: 'decorations' as const, label: '设计素材', icon: <Sparkles size={20} /> },
        { id: 'global' as const, label: '全局配置', icon: <Settings2 size={20} /> }
    ], []);

    const handleTabClick = (tabId: typeof activeTab) => {
        if (activeTab === tabId && isDrawerOpen) {
            setIsDrawerOpen(false);
            setActiveTab(null);
        } else {
            setActiveTab(tabId);
            setIsDrawerOpen(true);
        }
    };

    return (
        <div className="w-16 bg-[#F8F9FA] border-l border-gray-200/80 flex flex-col items-center py-4 gap-5 select-none shrink-0 h-full z-10 shadow-[inset_1px_0_0_0_rgba(0,0,0,0.02)]">
            {dockItems.map((item) => {
                const isActive = activeTab === item.id && isDrawerOpen;
                return (
                    <button
                        key={item.id}
                        onClick={() => handleTabClick(item.id)}
                        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                            isActive
                                ? 'bg-indigo-650 text-white shadow-md shadow-indigo-100 scale-105'
                                : 'bg-white hover:bg-indigo-50/45 text-gray-500 hover:text-indigo-600 border border-gray-200/60 shadow-sm'
                        }`}
                        title={item.label}
                    >
                        {item.icon}
                        <span className={`text-[8px] font-bold ${isActive ? 'text-white' : 'text-gray-400'}`}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};
// #endregion
