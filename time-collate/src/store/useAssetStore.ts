import { create } from 'zustand';
import { assetService } from '../features/assets/services/assetService';
import type { MaterialFolder, Material, StorageQuota } from '../features/assets/services/assetService';

interface AssetState {
    // Data
    folders: MaterialFolder[];
    materials: Material[];
    totalMaterials: number;
    currentPage: number;
    totalPages: number;
    pageSize: number;
    storageQuota: StorageQuota | null;
    isLoading: boolean;
    error: string | null;

    // Filters
    selectedFolderId: string | null; // null represents all, 'root' represents root directory
    selectedType: string | null;
    selectedTag: string | null;
    searchQuery: string;
    favoriteOnly: boolean;

    // Upload Jobs
    uploadProgresses: Record<string, number>; // filename -> percentage (0-100)

    // Cache of all loaded assets (sticker, background, font etc) for renderer lookup
    assetCache: Record<string, Material>;

    // Folder Actions
    fetchFolders: () => Promise<void>;
    createFolder: (name: string, parentId?: string | null) => Promise<void>;
    updateFolder: (id: string, name?: string, parentId?: string | null) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;

    // Material Actions
    fetchMaterials: (page?: number) => Promise<void>;
    uploadMaterials: (files: File[], folderId: string | null, type: string, tags?: string[]) => Promise<void>;
    updateMaterial: (id: string, name?: string, folderId?: string | null) => Promise<void>;
    deleteMaterial: (id: string) => Promise<void>;
    toggleFavorite: (id: string) => Promise<void>;
    fetchStorageQuota: () => Promise<void>;
    loadAssetCache: () => Promise<void>;

    // Filter Actions
    setSelectedFolderId: (id: string | null) => void;
    setSelectedType: (type: string | null) => void;
    setSelectedTag: (tag: string | null) => void;
    setSearchQuery: (query: string) => void;
    setFavoriteOnly: (val: boolean) => void;
    clearFilters: () => void;
}

export const useAssetStore = create<AssetState>()((set, get) => ({
    // Initial State
    folders: [],
    materials: [],
    totalMaterials: 0,
    currentPage: 1,
    totalPages: 1,
    pageSize: 24,
    storageQuota: null,
    isLoading: false,
    error: null,

    selectedFolderId: null,
    selectedType: null,
    selectedTag: null,
    searchQuery: '',
    favoriteOnly: false,

    uploadProgresses: {},

    assetCache: {},

    // Filter Setters
    setSelectedFolderId: (id) => {
        set({ selectedFolderId: id, currentPage: 1 });
        get().fetchMaterials(1);
    },
    setSelectedType: (type) => {
        set({ selectedType: type, currentPage: 1 });
        get().fetchMaterials(1);
    },
    setSelectedTag: (tag) => {
        set({ selectedTag: tag, currentPage: 1 });
        get().fetchMaterials(1);
    },
    setSearchQuery: (query) => {
        set({ searchQuery: query, currentPage: 1 });
        get().fetchMaterials(1);
    },
    setFavoriteOnly: (val) => {
        set({ favoriteOnly: val, currentPage: 1 });
        get().fetchMaterials(1);
    },
    clearFilters: () => {
        set({
            selectedFolderId: null,
            selectedType: null,
            selectedTag: null,
            searchQuery: '',
            favoriteOnly: false,
            currentPage: 1
        });
        get().fetchMaterials(1);
    },

    // Folder Actions
    fetchFolders: async () => {
        try {
            const list = await assetService.getFolders();
            set({ folders: list });
        } catch (error: any) {
            set({ error: error.message || 'Failed to fetch folders' });
        }
    },

    createFolder: async (name, parentId = null) => {
        try {
            await assetService.createFolder(name, parentId);
            await get().fetchFolders();
        } catch (error: any) {
            const msg = error.response?.data?.error || error.message || 'Failed to create folder';
            set({ error: msg });
            throw new Error(msg);
        }
    },

    updateFolder: async (id, name, parentId) => {
        try {
            const updates: { name?: string; parentId?: string | null } = {};
            if (name !== undefined) updates.name = name;
            if (parentId !== undefined) updates.parentId = parentId;

            await assetService.updateFolder(id, updates);
            await get().fetchFolders();
        } catch (error: any) {
            const msg = error.response?.data?.error || error.message || 'Failed to update folder';
            set({ error: msg });
            throw new Error(msg);
        }
    },

    deleteFolder: async (id) => {
        try {
            await assetService.deleteFolder(id);
            await get().fetchFolders();
            // If the deleted folder was selected, clear selected folder
            if (get().selectedFolderId === id) {
                get().setSelectedFolderId(null);
            } else {
                get().fetchMaterials();
            }
            get().fetchStorageQuota();
        } catch (error: any) {
            set({ error: error.message || 'Failed to delete folder' });
        }
    },

    // Material Actions
    fetchMaterials: async (page = 1) => {
        set({ isLoading: true, error: null });
        try {
            const { selectedFolderId, selectedType, selectedTag, searchQuery, favoriteOnly, pageSize } = get();
            const result = await assetService.getMaterials({
                folderId: selectedFolderId || undefined,
                type: selectedType || undefined,
                tag: selectedTag || undefined,
                favorite: favoriteOnly || undefined,
                search: searchQuery || undefined,
                page,
                pageSize
            });

            // 增量 merge 到全局素材缓存中，供渲染器同步检索
            const newCache = { ...get().assetCache };
            result.items.forEach(item => {
                newCache[item.id] = item;
            });

            set({
                materials: result.items,
                totalMaterials: result.total,
                currentPage: result.page,
                totalPages: result.totalPages,
                assetCache: newCache,
                isLoading: false
            });
        } catch (error: any) {
            set({
                isLoading: false,
                error: error.message || 'Failed to fetch materials'
            });
        }
    },

    uploadMaterials: async (files, folderId, type, tags = []) => {
        // Clear previous progress
        set({ error: null });
        
        for (const file of files) {
            const fileName = file.name;
            set((state) => ({
                uploadProgresses: {
                    ...state.uploadProgresses,
                    [fileName]: 0
                }
            }));

            try {
                await assetService.uploadMaterial(
                    file,
                    folderId,
                    type,
                    tags,
                    (progress) => {
                        set((state) => ({
                            uploadProgresses: {
                                ...state.uploadProgresses,
                                [fileName]: progress
                            }
                        }));
                    }
                );

                // Success - remove progress or set to 100
                set((state) => {
                    const next = { ...state.uploadProgresses };
                    delete next[fileName];
                    return { uploadProgresses: next };
                });
            } catch (error: any) {
                const msg = error.response?.data?.error || error.message || `Failed to upload ${fileName}`;
                set((state) => {
                    const next = { ...state.uploadProgresses };
                    delete next[fileName];
                    return {
                        uploadProgresses: next,
                        error: msg
                    };
                });
                throw new Error(msg);
            }
        }

        // Refresh lists
        get().fetchMaterials(get().currentPage);
        get().fetchStorageQuota();
    },

    updateMaterial: async (id, name, folderId) => {
        try {
            const updates: { name?: string; folderId?: string | null } = {};
            if (name !== undefined) updates.name = name;
            if (folderId !== undefined) updates.folderId = folderId;

            await assetService.updateMaterial(id, updates);
            get().fetchMaterials(get().currentPage);
        } catch (error: any) {
            const msg = error.response?.data?.error || error.message || 'Failed to update material';
            set({ error: msg });
            throw new Error(msg);
        }
    },

    deleteMaterial: async (id) => {
        try {
            await assetService.deleteMaterial(id);
            get().fetchMaterials(get().currentPage);
            get().fetchStorageQuota();
        } catch (error: any) {
            set({ error: error.message || 'Failed to delete material' });
        }
    },

    toggleFavorite: async (id) => {
        const material = get().materials.find(m => m.id === id);
        if (!material) return;

        const isFavorite = material.is_favorite === 1;
        try {
            // Optimistic update
            set((state) => ({
                materials: state.materials.map(m =>
                    m.id === id ? { ...m, is_favorite: isFavorite ? 0 : 1 } : m
                )
            }));

            await assetService.toggleFavorite(id, !isFavorite);
        } catch (error: any) {
            // Rollback on error
            set((state) => ({
                materials: state.materials.map(m =>
                    m.id === id ? { ...m, is_favorite: isFavorite ? 1 : 0 } : m
                ),
                error: error.message || 'Failed to toggle favorite status'
            }));
        }
    },

    fetchStorageQuota: async () => {
        try {
            const quota = await assetService.getStorageQuota();
            set({ storageQuota: quota });
        } catch (error: any) {
            console.error('Failed to fetch storage quota:', error);
        }
    },

    loadAssetCache: async () => {
        try {
            // 预先拉取前 200 个素材灌入全局缓存（例如官方预设和最新上传）
            const result = await assetService.getMaterials({ pageSize: 200 });
            const cache: Record<string, Material> = {};
            result.items.forEach(item => {
                cache[item.id] = item;
            });
            set((state) => ({
                assetCache: {
                    ...state.assetCache,
                    ...cache
                }
            }));
        } catch (error: any) {
            console.error('Failed to preload asset cache:', error);
        }
    }
}));
