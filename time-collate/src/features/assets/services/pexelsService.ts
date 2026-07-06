import axios from 'axios';

// #region 类型定义

/** Pexels 归一化图片对象（与后端 NormalizedPexelsPhoto 一一对应） */
export interface PexelsPhoto {
    id: string;                // `pexels-{id}` 格式
    name: string;              // alt 描述或 photographer 署名
    url: string;               // large 尺寸 URL（编辑器使用）
    thumbnailUrl: string;      // medium 尺寸 URL（列表缩略图）
    originalUrl: string;       // 原始尺寸 URL（导出使用）
    width: number;
    height: number;
    photographer: string;
    photographerUrl: string;
    avgColor: string;          // 主色调占位色
    pexelsUrl: string;         // Pexels 原始页面链接
    source: 'pexels';          // 固定来源标识
}

/** Pexels 分页响应 */
export interface PexelsSearchResult {
    items: PexelsPhoto[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

// #endregion

// #region PexelsService

class PexelsService {
    /**
     * 搜索 Pexels 图片
     * @param query 搜索关键词
     * @param page 页码（默认 1）
     * @param perPage 每页数量（默认 24）
     */
    async searchPhotos(
        query: string,
        page: number = 1,
        perPage: number = 24
    ): Promise<PexelsSearchResult> {
        const response = await axios.get('/pexels/search', {
            params: { query, page, per_page: perPage },
        });
        return response.data.data;
    }

    /**
     * 获取精选推荐图片
     * @param page 页码（默认 1）
     * @param perPage 每页数量（默认 24）
     */
    async getCuratedPhotos(
        page: number = 1,
        perPage: number = 24
    ): Promise<PexelsSearchResult> {
        const response = await axios.get('/pexels/curated', {
            params: { page, per_page: perPage },
        });
        return response.data.data;
    }

    /**
     * 获取单张照片详情
     * @param id Pexels 照片 ID（纯数字部分）
     */
    async getPhotoById(id: number): Promise<PexelsPhoto> {
        const response = await axios.get(`/pexels/photos/${id}`);
        return response.data.data;
    }
}

// #endregion

export const pexelsService = new PexelsService();
