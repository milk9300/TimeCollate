// #region Description
/**
 * @description 页面属性与内容原子更新命令 (UpdatePageCommand)
 * 支持更新 page.content、page.elements、以及其他 Page 属性
 */
// #endregion

import type { Command } from '../types';
import { useBookStore } from '../../../../store/index';
import type { Page } from '../../../../types';

export class UpdatePageCommand implements Command {
    public readonly id: string;
    private readonly chapterId: string;
    private readonly pageId: string;
    private readonly previousPageData: Partial<Page>;
    private readonly nextPageData: Partial<Page>;

    constructor(
        chapterId: string,
        pageId: string,
        previousPageData: Partial<Page>,
        nextPageData: Partial<Page>
    ) {
        this.id = `cmd-update-page-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        this.chapterId = chapterId;
        this.pageId = pageId;
        this.previousPageData = previousPageData;
        this.nextPageData = nextPageData;
    }

    /**
     * 执行：将页面指定属性更新为新值
     */
    public async execute(): Promise<void> {
        this.applyPageUpdates(this.nextPageData);
    }

    /**
     * 撤销：将页面指定属性恢复为旧值
     */
    public async undo(): Promise<void> {
        this.applyPageUpdates(this.previousPageData);
    }

    /**
     * 写入 Zustand Store 中的特定页面属性
     */
    private applyPageUpdates(updates: Partial<Page>): void {
        const { currentBook, documents } = useBookStore.getState();
        if (!currentBook) return;

        // 1. 同步更新 documents 数组以保持 Single Source of Truth 的一致性
        const updatedDocs = documents.map((d: any) => {
            if (d.id === this.pageId) {
                return {
                    ...d,
                    title: updates.pageTitle !== undefined ? updates.pageTitle : (updates as any).title !== undefined ? (updates as any).title : d.title,
                    background: updates.background !== undefined ? updates.background : d.background,
                    elements: updates.elements !== undefined ? updates.elements : d.elements,
                    thumbnail: updates.thumbnail !== undefined ? updates.thumbnail : d.thumbnail
                };
            }
            return d;
        });

        // 2. 同步更新 currentBook.pages 列表
        const updatedBook = JSON.parse(JSON.stringify(currentBook));
        updatedBook.pages = (updatedBook.pages || []).map((page: Page) => {
            if (page.id === this.pageId) {
                return {
                    ...page,
                    ...JSON.parse(JSON.stringify(updates))
                };
            }
            return page;
        });

        // 必须以 skipHistoryPush=true 写入 Store，避免双轨栈交叉和二次大快照保存
        useBookStore.setState({
            documents: updatedDocs,
            currentBook: updatedBook,
            saveStatus: 'saving'
        });

        // 触发防抖保存同步
        useBookStore.getState().debouncedSave();
    }
}
