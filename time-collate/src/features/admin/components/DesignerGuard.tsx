import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/useAuthStore';

interface DesignerGuardProps {
    children: ReactNode;
}

/**
 * 设计师/管理员路由守卫
 * 校验用户是否已登录且具有管理员或设计师角色
 */
export function DesignerGuard({ children }: DesignerGuardProps) {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'admin' && user?.role !== 'designer') {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
