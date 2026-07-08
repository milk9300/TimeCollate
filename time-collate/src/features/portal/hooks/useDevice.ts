import { useState, useEffect } from 'react';

/**
 * 响应式设备类型检测 Hook (React 19)
 * 用于在运行时判定当前设备是否为手机端 (宽度 <= 768px)
 * 供首屏及核心板块按端进行动态组件分流懒加载
 */
export function useDevice() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 检查 window 是否定义，防止 SSR 环境崩溃
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    setIsMobile(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return { isMobile };
}
