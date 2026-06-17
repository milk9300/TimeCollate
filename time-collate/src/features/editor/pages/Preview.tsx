import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getBookService } from '../../../services/serviceFactory';
import type { Book } from '../../../types';
import { BookRenderer } from '../../../rendering/BookRenderer';
import { ThemeProvider } from '../../../rendering/ThemeManager';
import { useBookStore } from '../../../store';
import { useMarketStore } from '../../../store/useMarketStore';

export const Preview: React.FC = () => {
    const { bookId } = useParams<{ bookId: string }>();
    const [book, setBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadBook = async () => {
            // 1. 优先检查注入的数据 (PDF 导出场景)
            const injectedData = (window as any).__PREVIEW_DATA__;
            if (injectedData) {
                console.log('[Preview] Using injected data');
                setBook(injectedData);
                setLoading(false);

                // 等待所有图片加载完成后再发出 PDF 就绪信号
                const waitForAllImages = () => {
                    const images = Array.from(document.querySelectorAll('img'));
                    if (images.length === 0) {
                        if (typeof (window as any).onPdfReady === 'function') {
                            (window as any).onPdfReady();
                        }
                        return;
                    }

                    let loaded = 0;
                    const total = images.length;
                    const checkDone = () => {
                        loaded++;
                        if (loaded >= total) {
                            // 所有图片加载完成，再等待一小段时间让布局稳定
                            setTimeout(() => {
                                if (typeof (window as any).onPdfReady === 'function') {
                                    (window as any).onPdfReady();
                                }
                            }, 1000);
                        }
                    };

                    for (const img of images) {
                        if (img.complete && img.naturalWidth > 0) {
                            checkDone();
                        } else {
                            img.addEventListener('load', checkDone, { once: true });
                            img.addEventListener('error', checkDone, { once: true });
                        }
                    }
                };

                // 给 React 渲染留出时间后再检查图片
                setTimeout(waitForAllImages, 500);
                return;
            }

            if (!bookId) return;
            try {
                const service = getBookService();
                // 并行加载书籍详情、模板库及市场资产，确保自定义排版在 PDF 预览页正常解析渲染
                const [data] = await Promise.all([
                    service.getBook(bookId),
                    useBookStore.getState().loadTemplates(),
                    useMarketStore.getState().fetchMarketAssets(),
                ]);
                setBook(data);

                // 普通预览模式也尝试发送信号（不影响正常使用）
                if (typeof (window as any).onPdfReady === 'function') {
                    (window as any).onPdfReady();
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load book');
            } finally {
                setLoading(false);
            }
        };
        loadBook();
    }, [bookId]);

    if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
    if (error || !book) return <div className="flex items-center justify-center h-screen text-red-500">{error || 'Book not found'}</div>;

    return (
        <ThemeProvider theme={book.theme}>
            <div className="min-h-screen bg-gray-100 print:bg-white flex flex-col items-center py-8 print:py-0">
                <style>
                    {`
                    @media print {
                        @page { margin: 0; }
                        body { -webkit-print-color-adjust: exact; margin: 0; }
                    }
                    `}
                </style>

                {book.chapters.map((chapter, cIndex) => (
                    <div key={chapter.id} className="contents">
                        {chapter.pages.map((page, pIndex) => (
                            <div
                                key={page.id}
                                data-pdf-page={`${cIndex}-${pIndex}`}
                                className="mb-8 print:mb-0 shadow-lg print:shadow-none"
                            >
                                <BookRenderer
                                    page={page}
                                    pageSize={book.pageSize}
                                    chapterTitle={pIndex === 0 ? chapter.title : undefined}
                                    chapterDate={pIndex === 0 ? chapter.date : undefined}
                                    chapterIndex={cIndex}
                                    readOnly={true}
                                />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </ThemeProvider>
    );
};
