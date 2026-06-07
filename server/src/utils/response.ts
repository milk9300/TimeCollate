import type { Response } from 'express';

/**
 * 统一 API 响应格式
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

/**
 * 发送成功响应
 */
export function sendSuccess<T>(res: Response, data: T, message?: string): void {
    const response: ApiResponse<T> = {
        success: true,
        data,
        message,
    };
    res.json(response);
}

/**
 * 发送错误响应
 */
export function sendError(
    res: Response,
    error: string | Error,
    statusCode: number = 500
): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const response: ApiResponse = {
        success: false,
        error: errorMessage,
    };
    res.status(statusCode).json(response);
}

/**
 * 发送 404 响应
 */
export function sendNotFound(res: Response, message: string = 'Resource not found'): void {
    sendError(res, message, 404);
}

/**
 * 发送 400 响应
 */
export function sendBadRequest(res: Response, message: string = 'Bad request'): void {
    sendError(res, message, 400);
}
