import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    nickname: string;
    username: string;
    avatarUrl?: string;
    createdAt: number;
    hasSeenAnnouncement?: boolean;
    role: 'user' | 'admin' | 'designer';
    status: 'active' | 'banned';
}

interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    /** 登录成功时设置完整的认证状态 */
    setAuth: (user: User, token: string, refreshToken: string) => void;
    /** 续签成功后仅更新令牌对（不触发用户信息变更） */
    setTokens: (token: string, refreshToken: string) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            setAuth: (user, token, refreshToken) => set({ user, token, refreshToken, isAuthenticated: true }),
            setTokens: (token, refreshToken) => set({ token, refreshToken }),
            logout: () => set({ user: null, token: null, refreshToken: null, isAuthenticated: false }),
            updateUser: (updatedFields) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...updatedFields } : null
                })),
        }),
        {
            name: 'timecollate-auth',
        }
    )
);
