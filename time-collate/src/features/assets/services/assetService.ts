import axios from 'axios';

export interface MaterialFolder {
    id: string;
    name: string;
    parent_id: string | null;
    scope: 'system' | 'user';
    creator_id: string | null;
    icon: string | null;
    sort_order: number;
    created_at: number;
}

export interface Material {
    id: string;
    folder_id: string | null;
    name: string;
    material_type: 'photo' | 'sticker' | 'background' | 'frame' | 'decorator' | 'font' | 'template';
    scope: 'system' | 'user';
    creator_id: string | null;
    file_url: string;
    cover_url: string | null;
    oss_key: string | null;
    file_size: number;
    metadata: {
        originalName?: string;
        mimeType?: string;
        width?: number;
        height?: number;
        category?: string;
        svg?: string;
        [key: string]: any;
    } | null;
    created_at: number;
    is_favorite: number; // 1 or 0
}

export interface PaginatedMaterials {
    items: Material[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface StorageQuota {
    used: number;
    total: number;
    percentage: number;
}

export class AssetService {
    /**
     * 获取文件夹树
     */
    async getFolders(): Promise<MaterialFolder[]> {
        const response = await axios.get('/assets/folders');
        return response.data.data;
    }

    /**
     * 新建文件夹
     */
    async createFolder(name: string, parentId: string | null = null): Promise<any> {
        const response = await axios.post('/assets/folders', { name, parentId });
        return response.data.data;
    }

    /**
     * 更新文件夹名称或移动文件夹
     */
    async updateFolder(
        id: string,
        updates: { name?: string; parentId?: string | null; sortOrder?: number }
    ): Promise<void> {
        await axios.patch(`/assets/folders/${id}`, updates);
    }

    /**
     * 删除文件夹（递归级联删除）
     */
    async deleteFolder(id: string): Promise<void> {
        await axios.delete(`/assets/folders/${id}`);
    }

    /**
     * 分类、标签、文件夹多维过滤素材列表
     */
    async getMaterials(params: {
        folderId?: string;
        type?: string;
        tag?: string;
        favorite?: boolean;
        search?: string;
        page?: number;
        pageSize?: number;
    }): Promise<PaginatedMaterials> {
        const response = await axios.get('/assets/materials', { params });
        return response.data.data;
    }

    /**
     * 上传个人素材 (带有上传进度回调)
     */
    async uploadMaterial(
        file: File,
        folderId: string | null,
        type: string,
        tags: string[] = [],
        onUploadProgress?: (progress: number) => void
    ): Promise<Material> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        if (folderId) {
            formData.append('folderId', folderId);
        }
        if (tags.length > 0) {
            formData.append('tags', JSON.stringify(tags));
        }

        const response = await axios.post('/assets/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onUploadProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onUploadProgress(progress);
                }
            },
        });
        return response.data.data;
    }

    /**
     * 更新素材（重命名、移动所属文件夹）
     */
    async updateMaterial(
        id: string,
        updates: { name?: string; folderId?: string | null }
    ): Promise<void> {
        await axios.patch(`/assets/materials/${id}`, updates);
    }

    /**
     * 删除素材
     */
    async deleteMaterial(id: string): Promise<void> {
        await axios.delete(`/assets/materials/${id}`);
    }

    /**
     * 收藏或取消收藏素材
     */
    async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
        if (isFavorite) {
            await axios.post(`/assets/materials/${id}/favorite`);
        } else {
            await axios.delete(`/assets/materials/${id}/favorite`);
        }
    }

    /**
     * 获取个人云存储配额及使用情况
     */
    async getStorageQuota(): Promise<StorageQuota> {
        const response = await axios.get('/assets/storage-quota');
        return response.data.data;
    }

    /**
     * 批量删除素材
     */
    async batchDeleteMaterials(ids: string[]): Promise<void> {
        await axios.post('/assets/materials/batch-delete', { ids });
    }

    /**
     * 批量移动素材
     */
    async batchMoveMaterials(ids: string[], folderId: string | null): Promise<void> {
        await axios.post('/assets/materials/batch-move', { ids, folderId });
    }
}

export const assetService = new AssetService();
