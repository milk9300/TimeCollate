import axios from 'axios';

export interface Comment {
    id: string;
    bookId: string;
    pageId: string | null;
    userId: string;
    content: string;
    stickerType?: string;
    xPercent?: number;
    yPercent?: number;
    createdAt: number;
    nickname: string;
    avatarUrl?: string;
}

export interface SocialStats {
    followingCount: number;
    followerCount: number;
    totalLikesReceived: number;
}

export interface FollowUser {
    id: string;
    nickname: string;
    avatarUrl?: string;
}

export class SocialService {
    /**
     * 关注/取消关注用户 (双向切换)
     */
    async toggleFollow(leaderId: string): Promise<{ followed: boolean }> {
        const response = await axios.post('/social/follow', { leaderId });
        return response.data.data;
    }

    /**
     * 查询是否已关注某用户
     */
    async isFollowing(leaderId: string): Promise<boolean> {
        const response = await axios.get(`/social/follow-status/${leaderId}`);
        return response.data.data.following;
    }

    /**
     * 获取创作者主页的粉丝和关注统计及总获赞量
     */
    async getSocialStats(userId: string): Promise<SocialStats> {
        const response = await axios.get(`/social/stats/${userId}`);
        return response.data.data;
    }

    /**
     * 获取粉丝列表
     */
    async getFollowers(userId: string): Promise<FollowUser[]> {
        const response = await axios.get(`/social/followers/${userId}`);
        return response.data.data;
    }

    /**
     * 获取关注列表
     */
    async getFollowing(userId: string): Promise<FollowUser[]> {
        const response = await axios.get(`/social/following/${userId}`);
        return response.data.data;
    }

    /**
     * 发表评论或页面贴纸留言
     */
    async addComment(params: {
        bookId: string;
        pageId: string | null;
        content: string;
        stickerType?: string;
        xPercent?: number;
        yPercent?: number;
    }): Promise<Comment> {
        const response = await axios.post('/social/comment', params);
        return response.data.data;
    }

    /**
     * 获取单书或单页的评论/贴纸列表
     */
    async getComments(bookId: string, pageId: string | null = null): Promise<Comment[]> {
        const response = await axios.get('/social/comments', {
            params: { bookId, pageId }
        });
        return response.data.data;
    }

    /**
     * 删除评论
     */
    async deleteComment(commentId: string): Promise<boolean> {
        const response = await axios.delete(`/social/comment/${commentId}`);
        return response.data.success;
    }
}

export const socialService = new SocialService();
