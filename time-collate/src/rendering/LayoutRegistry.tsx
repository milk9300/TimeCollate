import type { Chapter, Page, Book } from '../types';
import { BookCoverLayout } from './layouts/BookCoverLayout';
import { BackCoverLayout } from './layouts/BackCoverLayout';
import { EmptyLayout } from './layouts/EmptyLayout';
import { DynamicLayoutRenderer } from './DynamicLayoutRenderer';

interface LayoutProps {
    chapter: Chapter;
    page: Page;
    chapterIndex?: number;
    book?: Book;
    readOnly?: boolean;
}

const REGISTRY: Record<string, React.FC<LayoutProps>> = {
    'book-cover': (props) => props.book ? <BookCoverLayout book={props.book} page={props.page} chapter={props.chapter} readOnly={props.readOnly} /> : null,
    'back-cover': (props) => <BackCoverLayout book={props.book} />,
    'empty': () => <EmptyLayout />,
};

export const LayoutRegistry = {
    getRenderer: (layout: string) => {
        if (REGISTRY[layout]) {
            return REGISTRY[layout];
        }
        // 对于所有的标准内容页面排版，统一采用动态 JSON 引擎渲染 (从数据库/Zustand缓存拉取 Schema)
        return (props: LayoutProps) => <DynamicLayoutRenderer chapter={props.chapter} page={props.page} readOnly={props.readOnly} />;
    }
};
