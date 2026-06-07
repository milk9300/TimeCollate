import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

// #region Types
export interface SystemStats {
    activeUsers: {
        dau: number;
        wau: number;
        dauWauRatio: number;
        totalUsers: number;
        newUsersToday: number;
    };
    funnel: {
        totalBooks: number;
        draftingBooks: number;
        previewedBooks: number;
        exportedBooks: number;
        formatStats: {
            pdf: number;
            markdown: number;
            video: number;
        };
    };
    system: {
        queueWaiting: number;
        queueActive: number;
        peakWaiting: number;
        avgRenderDuration: number;
        avgPageRenderDuration: number;
        todayUploadBytes: number;
        todayExportBytes: number;
        cdnHitRate: number;
        cdnSavedBytes: number;
        ossStats: {
            storage: number;
            objectCount: number;
        };
    };
    ecosystem: {
        templateHotRank: Array<{
            templateId: string;
            templateName: string;
            count: number;
        }>;
        avgPagesPerBook: number;
        avgPhotosPerBook: number;
        pendingFeedbacks: number;
    };
    activity: Array<{
        date: string;
        activeUsers: number;
        exportCount: number;
        uploadBytes: number;
        exportBytes: number;
    }>;
}

interface AdminState {
    env: 'prod' | 'staging';
    stats: SystemStats | null;
    isLoadingStats: boolean;
    isMaintenanceMode: boolean;
    blockedRenderTasks: number;
    activeDangerAction: string | null; // e.g. 'redis_flush', 'db_migrate', 'maintenance_toggle'
    dangerStage: 'none' | 'evaluating' | 'confirming' | 'completed';
    setEnv: (env: 'prod' | 'staging') => void;
    fetchStats: () => Promise<void>;
    setMaintenanceMode: (enabled: boolean) => void;
    setBlockedRenderTasks: (count: number) => void;
    setDangerAction: (action: string | null, stage?: 'none' | 'evaluating' | 'confirming' | 'completed') => void;
}
// #endregion

export const useAdminStore = create<AdminState>()(
    persist(
        (set, get) => ({
            env: 'prod',
            stats: null,
            isLoadingStats: false,
            isMaintenanceMode: false,
            blockedRenderTasks: 3, // 默认有 3 个待重试的阻塞任务
            activeDangerAction: null,
            dangerStage: 'none',

            setEnv: (env) => {
                set({ env });
                // 切换环境时刷新统计数据以模拟真实切换效果
                get().fetchStats();
            },

            fetchStats: async () => {
                set({ isLoadingStats: true });
                try {
                    const response = await axios.get('/admin/stats');
                    if (response.data.success) {
                        const rawData = response.data.data;
                        
                        // 如果是测试沙盒环境，注入模拟测试数据做对比，增强真实系统演进的视觉体验
                        if (get().env === 'staging') {
                            const stagingData: SystemStats = {
                                ...rawData,
                                activeUsers: {
                                    ...rawData.activeUsers,
                                    dau: Math.round(rawData.activeUsers.dau * 0.4),
                                    wau: Math.round(rawData.activeUsers.wau * 0.45),
                                    dauWauRatio: parseFloat((rawData.activeUsers.dauWauRatio * 0.9).toFixed(1)),
                                    newUsersToday: Math.round(rawData.activeUsers.newUsersToday * 0.3),
                                },
                                system: {
                                    ...rawData.system,
                                    queueWaiting: get().blockedRenderTasks, // 与 Store 中的阻塞数联动
                                    queueActive: 1,
                                    cdnHitRate: 88.5, // 不同的 CDN 命中率
                                }
                            };
                            set({ stats: stagingData });
                        } else {
                            // 生产环境
                            set({ 
                                stats: {
                                    ...rawData,
                                    system: {
                                        ...rawData.system,
                                        queueWaiting: rawData.system.queueWaiting || get().blockedRenderTasks
                                    }
                                } 
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch admin stats:', error);
                } finally {
                    set({ isLoadingStats: false });
                }
            },

            setMaintenanceMode: (enabled) => set({ isMaintenanceMode: enabled }),
            
            setBlockedRenderTasks: (count) => {
                set({ blockedRenderTasks: count });
                const currentStats = get().stats;
                if (currentStats) {
                    set({
                        stats: {
                            ...currentStats,
                            system: {
                                ...currentStats.system,
                                queueWaiting: count
                            }
                        }
                    });
                }
            },

            setDangerAction: (action, stage = 'none') => set({
                activeDangerAction: action,
                dangerStage: action ? (stage === 'none' ? 'evaluating' : stage) : 'none'
            })
        }),
        {
            name: 'timecollate-admin',
            partialize: (state) => ({ 
                env: state.env, 
                isMaintenanceMode: state.isMaintenanceMode,
                blockedRenderTasks: state.blockedRenderTasks 
            }),
        }
    )
);
