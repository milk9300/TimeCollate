import { create } from 'zustand';
import axios from 'axios';
import type { Template, BookTheme } from '../types';
import { useBookStore } from './index';

interface MarketState {
    marketTemplates: Template[];
    marketThemes: BookTheme[];
    isLoading: boolean;
    error: string | null;
    fetchMarketAssets: () => Promise<void>;
    collectTemplate: (id: string) => Promise<void>;
    uncollectTemplate: (id: string) => Promise<void>;
    collectTheme: (id: string) => Promise<void>;
    uncollectTheme: (id: string) => Promise<void>;
}

/**
 * 模板与主题市场全局状态管理 Store
 */
export const useMarketStore = create<MarketState>((set) => ({
    marketTemplates: [],
    marketThemes: [],
    isLoading: false,
    error: null,

    fetchMarketAssets: async () => {
        set({ isLoading: true, error: null });
        try {
            const [templatesRes, themesRes] = await Promise.all([
                axios.get('/templates/market'),
                axios.get('/themes/market')
            ]);
            
            set({
                marketTemplates: templatesRes.data?.success ? templatesRes.data.data : [],
                marketThemes: themesRes.data?.success ? themesRes.data.data : [],
                isLoading: false
            });
        } catch (e) {
            console.error('Failed to fetch market assets:', e);
            set({ isLoading: false, error: '加载市场资产失败' });
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
    },

    collectTheme: async (id: string) => {
        try {
            const response = await axios.post(`/themes/${id}/collect`);
            if (response.data && response.data.success) {
                // 成功后，同步刷新编辑器的可用主题缓存
                await useBookStore.getState().loadThemes();
            }
        } catch (e) {
            console.error('Failed to collect theme:', e);
            throw e;
        }
    },

    uncollectTheme: async (id: string) => {
        try {
            const response = await axios.delete(`/themes/${id}/collect`);
            if (response.data && response.data.success) {
                // 成功后，同步刷新编辑器的可用主题缓存
                await useBookStore.getState().loadThemes();
            }
        } catch (e) {
            console.error('Failed to uncollect theme:', e);
            throw e;
        }
    }
}));
