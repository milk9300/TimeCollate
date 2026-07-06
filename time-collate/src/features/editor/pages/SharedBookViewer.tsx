import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BookOpen } from 'lucide-react';
import type { Book } from '../../../types';
import { FlipBook } from '../../../rendering/FlipBook';
import { ThemeProvider } from '../../../rendering/ThemeManager';

export const SharedBookViewer: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [book, setBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSharedBook = async () => {
            if (!slug) return;
            try {
                const response = await axios.get(`/share/${slug}`);
                if (response.data.success) {
                    setBook(response.data.data);
                } else {
                    setError('无法加载分享的书籍');
                }
            } catch (err) {
                console.error('Fetch shared book failed:', err);
                setError('该分享链接已失效或不存在');
            } finally {
                setLoading(false);
            }
        };

        fetchSharedBook();
    }, [slug]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin"></div>
                    <BookOpen className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                </div>
                <p className="mt-4 text-white/40 font-black tracking-widest uppercase text-[10px]">开启专属时光分享...</p>
            </div>
        );
    }

    if (error || !book) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-white px-4 text-center font-['Outfit']">
                <div className="text-6xl mb-6">🏜️</div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">分享已失效</h1>
                <p className="text-gray-400 font-medium mb-8 max-w-xs">{error || '书籍未找到'}</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
                >
                    返回首页
                </button>
            </div>
        );
    }

    // 成功加载：渲染 3D 翻页书
    // 在分享模式下，onClose 返回主页界面
    return (
        <ThemeProvider theme="classic">
            <FlipBook
                book={book}
                onClose={() => navigate('/')}
                isPublicView={true}
                onCTA={() => navigate('/')}
            />
        </ThemeProvider>
    );
};
