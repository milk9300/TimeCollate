import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/useAuthStore';

interface AdminGuardProps {
    children: ReactNode;
}

/**
 * 管理员路由守卫
 * 校验用户是否已登录且具有管理员角色
 */
export function AdminGuard({ children }: AdminGuardProps) {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
