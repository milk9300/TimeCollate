import axios from 'axios';
import { config } from '../config/index.js';
import { redis } from '../utils/redis.js';

// #region Pexels API 类型定义

/** Pexels 原始图片尺寸源 */
export interface PexelsPhotoSrc {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
}

/** Pexels 原始图片对象 */
export interface PexelsPhoto {
    id: number;
    width: number;
    height: number;
    url: string;           // Pexels 网页链接
    photographer: string;
    photographer_url: string;
    photographer_id: number;
    avg_color: string;
    src: PexelsPhotoSrc;
    liked: boolean;
    alt: string;
}

/** Pexels 分页响应 */
export interface PexelsSearchResponse {
    total_results: number;
    page: number;
    per_page: number;
    photos: PexelsPhoto[];
    next_page?: string;
    prev_page?: string;
}

/** 归一化后供前端消费的 Pexels 图片对象 */
export interface NormalizedPexelsPhoto {
    id: string;                // `pexels-{id}` 格式，防止与系统素材 ID 冲突
    name: string;              // alt 描述或 photographer 署名
    url: string;               // large 尺寸 URL（适合编辑器使用）
    thumbnailUrl: string;      // medium 尺寸 URL（适合列表缩略图）
    originalUrl: string;       // 原始尺寸 URL（适合导出）
    width: number;
    height: number;
    photographer: string;
    photographerUrl: string;
    avgColor: string;          // 主色调，用于占位色背景
    pexelsUrl: string;         // Pexels 原始页面链接（归属链接）
    source: 'pexels';          // 固定标识
}

/** 归一化后的分页响应 */
export interface NormalizedPexelsResponse {
    items: NormalizedPexelsPhoto[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

// #endregion

// #region 常量定义

const PEXELS_BASE_URL = 'https://api.pexels.com/v1';
const CACHE_PREFIX = 'pexels';

/**
 * Pexels 免费 API 速率限制：200 req/h
 * 内存级简易滑动窗口限流 (进程级，非分布式)
 */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 小时
const RATE_LIMIT_MAX_REQUESTS = 180;          // 保留 20 次余量给突发
let requestTimestamps: number[] = [];

// #endregion

// #region 辅助函数

/**
 * 检查并记录请求速率，超限时抛出异常
 */
function checkRateLimit(): void {
    const now = Date.now();
    // 清除过期时间戳
    requestTimestamps = requestTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

    if (requestTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
        throw new Error('Pexels API rate limit approaching. Please try again later.');
    }

    requestTimestamps.push(now);
}

/**
 * 将 Pexels 原始图片对象归一化为前端统一格式
 */
function normalizePhoto(photo: PexelsPhoto): NormalizedPexelsPhoto {
    return {
        id: `pexels-${photo.id}`,
        name: photo.alt || `Photo by ${photo.photographer}`,
        url: photo.src.large,
        thumbnailUrl: photo.src.medium,
        originalUrl: photo.src.original,
        width: photo.width,
        height: photo.height,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        avgColor: photo.avg_color,
        pexelsUrl: photo.url,
        source: 'pexels',
    };
}

/**
 * 构建 Redis 缓存键
 */
function buildCacheKey(...parts: string[]): string {
    return `${CACHE_PREFIX}:${parts.join(':')}`;
}

// #endregion

// #region PexelsService 核心类

export class PexelsService {
    private readonly apiKey: string;
    private readonly cacheTtl: number;

    constructor() {
        this.apiKey = config.pexels.apiKey;
        this.cacheTtl = config.pexels.cacheTtlSeconds;

        if (!this.apiKey) {
            console.warn('⚠️ PEXELS_API_KEY is not configured. Pexels features will be unavailable.');
        }
    }

    /**
     * 搜索图片
     * @param query 搜索关键词（必填）
     * @param page 页码（默认 1）
     * @param perPage 每页数量（默认 24，最大 80）
     * @param locale 地区代码（默认 zh-CN）
     */
    async searchPhotos(
        query: string,
        page: number = 1,
        perPage: number = 24,
        locale: string = 'zh-CN'
    ): Promise<NormalizedPexelsResponse> {
        this.ensureApiKey();

        // Fail-Fast: 校验参数合法性
        if (!query || query.trim().length === 0) {
            throw new Error('Search query is required');
        }
        const clampedPerPage = Math.min(Math.max(perPage, 1), 80);
        const clampedPage = Math.max(page, 1);
        const normalizedQuery = query.trim().toLowerCase();

        // 1. 尝试从 Redis 缓存读取
        const cacheKey = buildCacheKey('search', normalizedQuery, String(clampedPage), String(clampedPerPage), locale);
        const cached = await this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        // 2. 速率限流检查
        checkRateLimit();

        // 3. 调用 Pexels API
        const response = await axios.get<PexelsSearchResponse>(`${PEXELS_BASE_URL}/search`, {
            headers: { Authorization: this.apiKey },
            params: { query: normalizedQuery, page: clampedPage, per_page: clampedPerPage, locale },
            timeout: 10000,
        });

        const result = this.normalizeResponse(response.data, clampedPage, clampedPerPage);

        // 4. 写入 Redis 缓存
        await this.setToCache(cacheKey, result);

        return result;
    }

    /**
     * 获取精选推荐图片
     * @param page 页码（默认 1）
     * @param perPage 每页数量（默认 24，最大 80）
     */
    async getCuratedPhotos(
        page: number = 1,
        perPage: number = 24
    ): Promise<NormalizedPexelsResponse> {
        this.ensureApiKey();

        const clampedPerPage = Math.min(Math.max(perPage, 1), 80);
        const clampedPage = Math.max(page, 1);

        // 1. 尝试从 Redis 缓存读取
        const cacheKey = buildCacheKey('curated', String(clampedPage), String(clampedPerPage));
        const cached = await this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        // 2. 速率限流检查
        checkRateLimit();

        // 3. 调用 Pexels API
        const response = await axios.get<PexelsSearchResponse>(`${PEXELS_BASE_URL}/curated`, {
            headers: { Authorization: this.apiKey },
            params: { page: clampedPage, per_page: clampedPerPage },
            timeout: 10000,
        });

        const result = this.normalizeResponse(response.data, clampedPage, clampedPerPage);

        // 4. 写入 Redis 缓存
        await this.setToCache(cacheKey, result);

        return result;
    }

    /**
     * 获取单张照片详情
     * @param photoId Pexels 照片 ID (纯数字)
     */
    async getPhotoById(photoId: number): Promise<NormalizedPexelsPhoto> {
        this.ensureApiKey();

        if (!photoId || photoId <= 0) {
            throw new Error('Valid photo ID is required');
        }

        // 1. 尝试从 Redis 缓存读取
        const cacheKey = buildCacheKey('photo', String(photoId));
        try {
            const cachedStr = await redis.get(cacheKey);
            if (cachedStr) {
                return JSON.parse(cachedStr);
            }
        } catch { /* 缓存读取失败不阻塞 */ }

        // 2. 速率限流检查
        checkRateLimit();

        // 3. 调用 Pexels API
        const response = await axios.get<PexelsPhoto>(`${PEXELS_BASE_URL}/photos/${photoId}`, {
            headers: { Authorization: this.apiKey },
            timeout: 10000,
        });

        const normalized = normalizePhoto(response.data);

        // 4. 写入 Redis 缓存 (单张图片缓存更久: 1 小时)
        try {
            await redis.set(cacheKey, JSON.stringify(normalized), 'EX', 3600);
        } catch { /* 缓存写入失败不阻塞 */ }

        return normalized;
    }

    // #region 内部方法

    /**
     * 确保 API Key 已配置，否则快速失败
     */
    private ensureApiKey(): void {
        if (!this.apiKey) {
            throw new Error('Pexels API key is not configured. Set PEXELS_API_KEY in environment variables.');
        }
    }

    /**
     * 将 Pexels 原始响应归一化为统一分页结构
     */
    private normalizeResponse(
        data: PexelsSearchResponse,
        page: number,
        perPage: number
    ): NormalizedPexelsResponse {
        const totalResults = data.total_results || 0;
        return {
            items: (data.photos || []).map(normalizePhoto),
            total: totalResults,
            page,
            perPage,
            totalPages: Math.ceil(totalResults / perPage),
        };
    }

    /**
     * 从 Redis 读取缓存，静默处理异常
     */
    private async getFromCache(key: string): Promise<NormalizedPexelsResponse | null> {
        try {
            const cachedStr = await redis.get(key);
            if (cachedStr) {
                console.log(`[PexelsService] Cache HIT: ${key}`);
                return JSON.parse(cachedStr);
            }
        } catch {
            // 缓存读取失败不阻塞主流程
        }
        return null;
    }

    /**
     * 写入 Redis 缓存，静默处理异常
     */
    private async setToCache(key: string, data: NormalizedPexelsResponse): Promise<void> {
        try {
            await redis.set(key, JSON.stringify(data), 'EX', this.cacheTtl);
            console.log(`[PexelsService] Cache SET: ${key} (TTL: ${this.cacheTtl}s)`);
        } catch {
            // 缓存写入失败不阻塞主流程
        }
    }

    // #endregion
}

// #endregion

/** 全局单例 */
export const pexelsService = new PexelsService();
