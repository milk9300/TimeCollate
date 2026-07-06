import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { getBookService } from '../../../services/serviceFactory';
import type { Book } from '../../../types';
import { FlipBook } from '../../../rendering/FlipBook';
import { ThemeProvider } from '../../../rendering/ThemeManager';
import { useAuthStore } from '../../../store/useAuthStore';
import { cloneBookLayout } from '../../../utils/cloneHelper';
import { useBookStore } from '../../../store';
import { useMarketStore } from '../../../store/useMarketStore';

/**
 * @description 时光书阅读器页面
 * 直接集成 FlipBook 组件，提供与编辑器一致 of 3D 翻页交互体验
 */
export const Reader: React.FC = () => {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthStore();
    const [book, setBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 获取返回路径，默认返回广场
    const fromPath = (location.state as any)?.from || '/square';

    useEffect(() => {
        const fetchBook = async () => {
            if (!bookId) return;
            try {
                const service = getBookService();
                // 并行获取书籍详情、模板库及市场资产，确保自定义排版正常解析渲染
                const [data] = await Promise.all([
                    service.getBook(bookId),
                    useBookStore.getState().loadTemplates(),
                    useMarketStore.getState().fetchMarketAssets(),
                ]);

                if (data) {
                    setBook({
                        ...data.book,
                        pages: data.pages
                    });
                } else {
                    setError('无法加载该书籍');
                }
            } catch (err) {
                console.error('Fetch book failed:', err);
                setError('该书籍可能已被删除或设为私密');
            } finally {
                setLoading(false);
            }
        };

        fetchBook();
    }, [bookId]);

    // 加载中状态
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin"></div>
                    <BookOpen className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                </div>
                <p className="mt-4 text-white/40 font-black tracking-widest uppercase text-[10px]">开启沉浸式阅读模式...</p>
            </div>
        );
    }

    // 错误或未找到书籍
    if (error || !book) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-white px-4 text-center font-['Outfit']">
                <div className="text-6xl mb-6">🏜️</div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">作品暂不可用</h1>
                <p className="text-gray-400 font-medium mb-8 max-w-xs">{error || '书籍未找到'}</p>
                <button
                    onClick={() => navigate(fromPath)}
                    className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold shadow-xl hover:bg-black transition-all active:scale-95"
                >
                    返回
                </button>
            </div>
        );
    }

    const handleCloneLayout = async () => {
        if (!book) return;
        if (!user) {
            alert('请先登录再套用排版模版。');
            navigate('/login');
            return;
        }

        try {
            const clonedBook = cloneBookLayout(book, user.id);
            clonedBook.author = user.nickname || user.username || '时光记录者';
            
            const service = getBookService();
            await service.saveBook(clonedBook);
            
            alert('🎉 排版套用成功！已为你自动生成新的相册，正在进入编辑器...');
            navigate(`/editor/${clonedBook.id}`);
        } catch (err) {
            console.error('Failed to clone book layout:', err);
            alert('套用排版失败，请稍后重试。');
        }
    };

    // 成功加载：直接渲染 FlipBook
    // onClose 设为 navigate('/square') 使其返回广场
    return (
        <ThemeProvider theme="classic">
            <FlipBook
                book={book}
                onClose={() => navigate(fromPath)}
                isPublicView={true}
                onCTA={() => navigate('/')}
                onCloneLayout={handleCloneLayout}
            />
        </ThemeProvider>
    );
};
