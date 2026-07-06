import { create } from 'zustand';
import axios from 'axios';
import type { Template, Book, PaginatedResponse } from '../types';
import { useBookStore } from './index';
import { getBookService } from '../services/serviceFactory';

const bookService = getBookService();

interface MarketState {
    marketTemplates: Template[];
    marketBookTemplates: Book[];
    marketCollections: any[]; // 模板合集市场列表
    isLoading: boolean;
    error: string | null;
    fetchMarketAssets: () => Promise<void>;
    fetchMarketBookTemplates: (page?: number, pageSize?: number, category?: string) => Promise<PaginatedResponse<Book>>;
    fetchMarketCollections: () => Promise<void>;
    collectTemplate: (id: string) => Promise<void>;
    uncollectTemplate: (id: string) => Promise<void>;
}

/**
 * 模板与主题市场全局状态管理 Store
 */
export const useMarketStore = create<MarketState>((set) => ({
    marketTemplates: [],
    marketBookTemplates: [],
    marketCollections: [],
    isLoading: false,
    error: null,

    fetchMarketAssets: async () => {
        set({ isLoading: true, error: null });
        try {
            const templatesRes = await axios.get('/templates/market');
            
            set({
                marketTemplates: templatesRes.data?.success ? templatesRes.data.data : [],
                isLoading: false
            });
        } catch (e) {
            console.error('Failed to fetch market assets:', e);
            set({ isLoading: false, error: '加载市场资产失败' });
        }
    },

    fetchMarketBookTemplates: async (page: number = 1, pageSize: number = 20, category?: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await bookService.getMarketBookTemplates(page, pageSize, category);
            set({
                marketBookTemplates: response.items,
                isLoading: false
            });
            return response;
        } catch (e) {
            console.error('Failed to fetch market book templates:', e);
            set({ isLoading: false, error: '加载书模板市场失败' });
            throw e;
        }
    },

    fetchMarketCollections: async () => {
        set({ isLoading: true, error: null });
        try {
            const collections = await bookService.getMarketTemplateCollections();
            set({ marketCollections: collections, isLoading: false });
        } catch (e) {
            console.error('Failed to fetch market collections:', e);
            set({ isLoading: false, error: '加载市场合集失败' });
        }
    },

    collectTemplate: async (id: string) => {
        try {
            const response = await axios.post(`/templates/${id}/collect`);
            if (response.data && response.data.success) {
                // 成功后，同步刷新编辑器的可用模板缓存
                await useBookStore.getState().loadTemplates();
            }
        } catch (e) {
            console.error('Failed to collect template:', e);
            throw e;
        }
    },

    uncollectTemplate: async (id: string) => {
        try {
            const response = await axios.delete(`/templates/${id}/collect`);
            if (response.data && response.data.success) {
                // 成功后，同步刷新编辑器的可用模板缓存
                await useBookStore.getState().loadTemplates();
            }
        } catch (e) {
            console.error('Failed to uncollect template:', e);
            throw e;
        }
    }
}));
