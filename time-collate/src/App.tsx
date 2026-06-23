import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from './store/useAuthStore';
import './App.css';

// 页面组件懒加载
const Home = lazy(() => import('./features/book/pages/Home').then(m => ({ default: m.Home })));
const Workbench = lazy(() => import('./features/book/pages/Workbench').then(m => ({ default: m.Workbench })));
const Editor = lazy(() => import('./features/editor/pages/Editor').then(m => ({ default: m.Editor })));
const Trash = lazy(() => import('./features/book/pages/Trash').then(m => ({ default: m.Trash })));
const Preview = lazy(() => import('./features/editor/pages/Preview').then(m => ({ default: m.Preview })));
const SharedBookViewer = lazy(() => import('./features/editor/pages/SharedBookViewer').then(m => ({ default: m.SharedBookViewer })));
const Login = lazy(() => import('./features/auth/pages/Login').then(m => ({ default: m.Login })));

const Profile = lazy(() => import('./features/profile/pages/Profile').then(m => ({ default: m.Profile })));
const Square = lazy(() => import('./features/book/pages/Square').then(m => ({ default: m.Square })));
const Reader = lazy(() => import('./features/editor/pages/Reader').then(m => ({ default: m.Reader })));
const Market = lazy(() => import('./features/book/pages/Market').then(m => ({ default: m.Market })));
const BookMarket = lazy(() => import('./features/book/pages/BookMarket').then(m => ({ default: m.BookMarket })));
const MyBookTemplates = lazy(() => import('./features/book/pages/MyBookTemplates').then(m => ({ default: m.MyBookTemplates })));
const AssetCenter = lazy(() => import('./features/assets/pages/AssetCenter').then(m => ({ default: m.AssetCenter })));

// 管理员页面懒加载
const AdminDashboard = lazy(() => import('./features/admin/pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminUsers = lazy(() => import('./features/admin/pages/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminBooks = lazy(() => import('./features/admin/pages/AdminBooks').then(m => ({ default: m.AdminBooks })));
const AdminFeedbacks = lazy(() => import('./features/admin/pages/AdminFeedbacks').then(m => ({ default: m.AdminFeedbacks })));
const AdminBuilder = lazy(() => import('./features/admin/pages/AdminBuilder').then(m => ({ default: m.AdminBuilder })));
const MyLayouts = lazy(() => import('./features/book/pages/MyLayouts').then(m => ({ default: m.MyLayouts })));
const AdminRenderFlow = lazy(() => import('./features/admin/pages/AdminRenderFlow').then(m => ({ default: m.AdminRenderFlow })));
const AdminStorage = lazy(() => import('./features/admin/pages/AdminStorage').then(m => ({ default: m.AdminStorage })));
const AdminAnnouncement = lazy(() => import('./features/admin/pages/AdminAnnouncement').then(m => ({ default: m.AdminAnnouncement })));
const AdminSecurity = lazy(() => import('./features/admin/pages/AdminSecurity').then(m => ({ default: m.AdminSecurity })));
const AdminDanger = lazy(() => import('./features/admin/pages/AdminDanger').then(m => ({ default: m.AdminDanger })));

import { AdminGuard } from './features/admin/components/AdminGuard';

// 配置基础地址
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

// 全局 Axios 请求拦截器，自动注入 Token
axios.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 全局 Axios 响应拦截器，捕获 401 未授权错误，自动清除 Token 并重定向至登录页
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const { isAuthenticated, logout } = useAuthStore.getState();
      if (isAuthenticated) {
        logout();
      }
    }
    return Promise.reject(error);
  }
);

/**
 * 路由守卫组件
 */
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

/**
 * 智能兜底重定向组件
 */
const FallbackRedirect = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/workbench" : "/"} replace />;
};

/**
 * 应用路由容器
 */
function App() {
  const { token, updateUser, logout } = useAuthStore();

  // 应用启动时同步用户信息
  useEffect(() => {
    const isLocal = import.meta.env.VITE_STORAGE_MODE !== 'cloud';
    if (isLocal) return;

    if (token) {
      const syncUser = async () => {
        try {
          const response = await axios.get('/auth/me');
          if (response.data.success) {
            updateUser(response.data.data);
          }
        } catch (error: any) {
          console.error('Failed to sync user status:', error);
          // 如果是 401 错误，说明 Token 无效，自动退出
          if (error.response?.status === 401) {
            logout();
          }
        }
      };
      syncUser();
    }
  }, [token]);

  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      }>
        <Routes>
          {/* 公开路由 */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/s/:slug" element={<SharedBookViewer />} />

          {/* 私有路由（受保护） */}
          <Route path="/workbench" element={<AuthGuard><Workbench /></AuthGuard>} />
          <Route path="/square" element={<AuthGuard><Square /></AuthGuard>} />
          <Route path="/editor/:bookId" element={<AuthGuard><Editor /></AuthGuard>} />
          <Route path="/editor/template/:templateId" element={<AuthGuard><Editor /></AuthGuard>} />
          <Route path="/book/:bookId/preview" element={<AuthGuard><Preview /></AuthGuard>} />
          <Route path="/read/:bookId" element={<AuthGuard><Reader /></AuthGuard>} />
          <Route path="/trash" element={<AuthGuard><Trash /></AuthGuard>} />
          <Route path="/profile/:userId?" element={<AuthGuard><Profile /></AuthGuard>} />
          <Route path="/market/books" element={<AuthGuard><BookMarket /></AuthGuard>} />
          <Route path="/market/layouts" element={<AuthGuard><Market /></AuthGuard>} />
          <Route path="/my/book-templates" element={<AuthGuard><MyBookTemplates /></AuthGuard>} />
          <Route path="/my/layouts" element={<AuthGuard><MyLayouts /></AuthGuard>} />
          <Route path="/my/assets" element={<AuthGuard><AssetCenter /></AuthGuard>} />
          <Route path="/builder" element={<AuthGuard><AdminBuilder /></AuthGuard>} />

          {/* 管理员路由 */}
          <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
          <Route path="/admin/users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
          <Route path="/admin/books" element={<AdminGuard><AdminBooks /></AdminGuard>} />
          <Route path="/admin/feedbacks" element={<AdminGuard><AdminFeedbacks /></AdminGuard>} />
          <Route path="/admin/builder" element={<AdminGuard><AdminBuilder /></AdminGuard>} />
          <Route path="/admin/render-flow" element={<AdminGuard><AdminRenderFlow /></AdminGuard>} />
          <Route path="/admin/storage" element={<AdminGuard><AdminStorage /></AdminGuard>} />
          <Route path="/admin/announcement" element={<AdminGuard><AdminAnnouncement /></AdminGuard>} />
          <Route path="/admin/security" element={<AdminGuard><AdminSecurity /></AdminGuard>} />
          <Route path="/admin/danger" element={<AdminGuard><AdminDanger /></AdminGuard>} />

          {/* 默认重定向 */}
          <Route path="*" element={<FallbackRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
