import { Book } from '../../types/index.js';
import { Response } from 'express';

export interface IExportStrategy {
    /**
     * Executes the export process for a given book.
     * @param book The book object to export.
     * @param res The express response object (to stream data or return status).
     * @param options Additional options like authentication context.
     * @returns Promise<void>
     */
    execute(book: Book, res: Response, options?: { token?: string; user?: any }): Promise<void>;
}
