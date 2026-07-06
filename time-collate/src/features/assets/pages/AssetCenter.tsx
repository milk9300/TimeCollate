import React, { useEffect, useState } from 'react';
import { MainLayout } from '../../common/components/MainLayout';
import { useAssetStore } from '../../../store/useAssetStore';
import { AssetSidebar } from '../components/AssetSidebar';
import { LocalMaterialGrid } from '../components/LocalMaterialGrid';
import { AssetPreviewModal } from '../components/AssetPreviewModal';
import { FolderPickerModal } from '../components/FolderPickerModal';

export function AssetCenter({ isEmbed = false }: { isEmbed?: boolean }) {
    const {
        folders,
        selectedFolderId,
        selectedType,
        selectedTag,
        searchQuery,
        favoriteOnly,
        currentPage,
        fetchFolders,
        fetchMaterials,
        fetchStorageQuota,
        updateFolder,
        updateMaterial,
        batchMoveMaterials
    } = useAssetStore();

    // 局部状态维护
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
    
    // 弹窗状态
    const [previewMaterial, setPreviewMaterial] = useState<any | null>(null);
    const [movingMaterial, setMovingMaterial] = useState<any | null>(null);
    const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);

    // 数据初始化拉取
    useEffect(() => {
        fetchFolders();
        fetchMaterials(1);
        fetchStorageQuota();
    }, []);

    // 过滤条件变化时，清空多选状态
    useEffect(() => {
        setSelectedMaterialIds([]);
    }, [selectedFolderId, selectedType, selectedTag, searchQuery, favoriteOnly, currentPage]);


    // HTML5 拖放移动文件夹/素材逻辑
    const handleFolderDragStart = (e: React.DragEvent, folderId: string) => {
        e.dataTransfer.setData('folderId', folderId);
    };

    const handleFolderDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault();
        const draggedFolderId = e.dataTransfer.getData('folderId');
        const draggedMaterialId = e.dataTransfer.getData('materialId');

        if (draggedFolderId) {
            if (draggedFolderId === targetFolderId) return;
            try {
                await updateFolder(draggedFolderId, undefined, targetFolderId);
            } catch (err) {
                alert(err instanceof Error ? err.message : '移动文件夹失败');
            }
        } else if (draggedMaterialId) {
            try {
                await updateMaterial(draggedMaterialId, undefined, targetFolderId);
            } catch (err) {
                alert(err instanceof Error ? err.message : '移动素材失败');
            }
        }
    };

    const content = (
        <div className="flex h-full w-full overflow-hidden font-['Outfit',_sans-serif]">
            {/* 1. 左侧素材目录树 (Sidebar) */}
            <AssetSidebar
                isEmbed={isEmbed}
                handleFolderDragStart={handleFolderDragStart}
                handleFolderDrop={handleFolderDrop}
            />

            {/* 2. 右侧素材展示与搜索区 */}
            <LocalMaterialGrid
                isEmbed={isEmbed}
                selectedMaterialIds={selectedMaterialIds}
                setSelectedMaterialIds={setSelectedMaterialIds}
                onPreviewMaterial={setPreviewMaterial}
                onMoveMaterial={setMovingMaterial}
                onBatchMove={() => setShowBatchMoveModal(true)}
                handleFolderDragStart={handleFolderDragStart}
                handleFolderDrop={handleFolderDrop}
            />

            {/* 3. 素材预览弹窗 */}
            <AssetPreviewModal
                previewMaterial={previewMaterial}
                onClose={() => setPreviewMaterial(null)}
            />

            {/* 4. 单素材移动目标文件夹选择弹窗 */}
            {movingMaterial && (
                <FolderPickerModal
                    title="移动素材"
                    description={
                        <>
                            请选择要移动素材 <span className="text-slate-700 font-bold">"{movingMaterial.name}"</span> 到的目标文件夹：
                        </>
                    }
                    onClose={() => setMovingMaterial(null)}
                    onSelectFolder={async (targetFolderId) => {
                        try {
                            await updateMaterial(movingMaterial.id, undefined, targetFolderId);
                            setMovingMaterial(null);
                        } catch (err) {
                            alert(err instanceof Error ? err.message : '移动素材失败');
                        }
                    }}
                />
            )}

            {/* 5. 批量素材移动目标文件夹选择弹窗 */}
            {showBatchMoveModal && (
                <FolderPickerModal
                    title="批量移动素材"
                    description={
                        <>
                            请选择要将选中的 <span className="text-indigo-650 font-black">{selectedMaterialIds.length}</span> 个素材移动到的目标文件夹：
                        </>
                    }
                    onClose={() => setShowBatchMoveModal(false)}
                    onSelectFolder={async (targetFolderId) => {
                        try {
                            await batchMoveMaterials(selectedMaterialIds, targetFolderId);
                            setSelectedMaterialIds([]);
                            setShowBatchMoveModal(false);
                        } catch (err) {
                            alert(err instanceof Error ? err.message : '批量移动素材失败');
                        }
                    }}
                />
            )}
        </div>
    );

    if (isEmbed) return content;
    return (
        <MainLayout title="我的素材" hideSearch={true}>
            {content}
        </MainLayout>
    );
}
