import axios from 'axios';
import type { Feedback } from '../types';

export class FeedbackService {
    /**
     * 获取所有反馈（公开广场流）
     */
    async getFeedbacks(): Promise<Feedback[]> {
        const response = await axios.get('/feedbacks/public');
        return response.data.data;
    }

    /**
     * 根据 ID 获取反馈详情（公开广场详情）
     */
    async getFeedbackById(id: string): Promise<Feedback> {
        const response = await axios.get(`/feedbacks/public/${id}`);
        return response.data.data;
    }

    /**
     * 提交反馈
     */
    async submitFeedback(content: string, images?: string[]): Promise<boolean> {
        const response = await axios.post('/feedbacks', {
            content,
            images
        });
        return response.data.success;
    }
}

export const feedbackService = new FeedbackService();
