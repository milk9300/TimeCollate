// #region Description
/**
 * @description 书籍属性/配置原子更新命令 (UpdateBookSettingsCommand)
 * 支持更新 book.title、book.pageSize、book.author、book.category 等整书属性
 */
// #endregion

import type { Command } from '../types';
import { useBookStore } from '../../../../store/index';
import type { Book } from '../../../../types';

export class UpdateBookSettingsCommand implements Command {
    public readonly id: string;
    private readonly previousSettings: Partial<Book>;
    private readonly nextSettings: Partial<Book>;

    constructor(
        previousSettings: Partial<Book>,
        nextSettings: Partial<Book>
    ) {
        this.id = `cmd-update-book-settings-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        this.previousSettings = previousSettings;
        this.nextSettings = nextSettings;
    }

    /**
     * 执行：将书籍指定属性更新为新值
     */
    public async execute(): Promise<void> {
        this.applySettings(this.nextSettings);
    }

    /**
     * 撤销：将书籍指定属性恢复为旧值
     */
    public async undo(): Promise<void> {
        this.applySettings(this.previousSettings);
    }

    /**
     * 写入 Zustand Store 中的书籍属性并触发防抖保存
     */
    private applySettings(settings: Partial<Book>): void {
        const { currentBook } = useBookStore.getState();
        if (!currentBook) return;

        const updatedBook = {
            ...currentBook,
            ...JSON.parse(JSON.stringify(settings))
        };

        // 必须以 skipHistoryPush=true 写入 Store，避免双轨栈交叉
        useBookStore.setState({
            currentBook: updatedBook,
            saveStatus: 'saving'
        });

        // 触发防抖保存同步
        useBookStore.getState().debouncedSave();
    }
}
