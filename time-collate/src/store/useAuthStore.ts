import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    nickname: string;
    username: string;
    avatarUrl?: string;
    createdAt: number;
    hasSeenAnnouncement?: boolean;
    role: 'user' | 'admin';
    status: 'active' | 'banned';
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
            logout: () => set({ user: null, token: null, isAuthenticated: false }),
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
