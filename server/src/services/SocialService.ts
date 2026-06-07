import { pool } from '../db/index.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { notificationService } from './NotificationService.js';
import { signAvatarUrl } from './OssService.js';

// 基础脏字黑名单 (符合首阶段只做基础脏处理要求)
const SENSITIVE_WORDS = ['傻逼', '沙比', '蠢货', '脑残', '垃圾系统', '逼样', '狗娘养的', '垃圾软件', '垃圾应用'];

/**
 * 对敏感词进行过滤，替换为 *
 */
function sanitizeContent(content: string): string {
    let clean = content;
    for (const word of SENSITIVE_WORDS) {
        const regex = new RegExp(word, 'gi');
        clean = clean.replace(regex, '*'.repeat(word.length));
    }
    return clean;
}

export class SocialService {
    /**
     * 关注或取消关注用户 (双向切换)
     */
    async toggleFollow(followerId: string, leaderId: string): Promise<{ followed: boolean }> {
        if (followerId === leaderId) {
            throw new Error('不能关注自己');
        }

        // 1. 校验目标用户是否存在
        const [userCheck] = await pool.query<RowDataPacket[]>(
            'SELECT nickname FROM users WHERE id = ?',
            [leaderId]
        );
        if (userCheck.length === 0) {
            throw new Error('目标用户不存在');
        }

        // 2. 检查是否已经关注
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM user_follows WHERE follower_id = ? AND leader_id = ?',
            [followerId, leaderId]
        );

        const alreadyFollowed = rows.length > 0;

        if (alreadyFollowed) {
            // 已关注 -> 取消关注
            await pool.query(
                'DELETE FROM user_follows WHERE follower_id = ? AND leader_id = ?',
                [followerId, leaderId]
            );
            return { followed: false };
        } else {
            // 未关注 -> 添加关注
            const id = crypto.randomUUID();
            const now = Date.now();
            await pool.query(
                'INSERT INTO user_follows (id, follower_id, leader_id, created_at) VALUES (?, ?, ?, ?)',
                [id, followerId, leaderId, now]
            );

            // 获取关注发起人的昵称，用于通知备注
            const [followerUser] = await pool.query<RowDataPacket[]>(
                'SELECT nickname FROM users WHERE id = ?',
                [followerId]
            );
            const followerName = followerUser[0]?.nickname || '有人';

            // 异步触发通知
            await notificationService.createNotification(
                leaderId,
                followerId,
                'follow',
                'user',
                followerId,
                followerName
            ).catch(err => console.warn('[SocialService] Failed to create follow notification:', err.message));

            return { followed: true };
        }
    }

    /**
     * 获取关注状态
     */
    async isFollowing(followerId: string, leaderId: string): Promise<boolean> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM user_follows WHERE follower_id = ? AND leader_id = ?',
            [followerId, leaderId]
        );
        return rows.length > 0;
    }

    /**
     * 获取创作者主页的粉丝和关注统计及总获赞量
     */
    async getSocialStats(userId: string) {
        // 1. 获取关注数
        const [followingCountRows] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?',
            [userId]
        );

        // 2. 获取粉丝数
        const [followersCountRows] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM user_follows WHERE leader_id = ?',
            [userId]
        );

        // 3. 获取发布过的书籍总获赞量 (连表 entity_statistics)
        const [likeCountRows] = await pool.query<RowDataPacket[]>(
            `SELECT IFNULL(SUM(es.metric_value), 0) as total_likes 
             FROM books b
             JOIN entity_statistics es ON b.id = es.entity_id AND es.entity_type = 'book' AND es.metric_type = 'like'
             WHERE b.user_id = ? AND b.deleted_at IS NULL`,
            [userId]
        );

        return {
            followingCount: followingCountRows[0].count,
            followerCount: followersCountRows[0].count,
            totalLikesReceived: Number(likeCountRows[0].total_likes)
        };
    }

    /**
     * 获取粉丝列表
     */
    async getFollowers(userId: string) {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT u.id, u.nickname, u.avatar_url 
             FROM user_follows f
             JOIN users u ON f.follower_id = u.id
             WHERE f.leader_id = ?
             ORDER BY f.created_at DESC`,
            [userId]
        );
        return rows.map(row => ({
            id: row.id,
            nickname: row.nickname,
            avatarUrl: signAvatarUrl(row.avatar_url) || undefined
        }));
    }

    /**
     * 获取关注列表
     */
    async getFollowing(userId: string) {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT u.id, u.nickname, u.avatar_url 
             FROM user_follows f
             JOIN users u ON f.leader_id = u.id
             WHERE f.follower_id = ?
             ORDER BY f.created_at DESC`,
            [userId]
        );
        return rows.map(row => ({
            id: row.id,
            nickname: row.nickname,
            avatarUrl: signAvatarUrl(row.avatar_url) || undefined
        }));
    }

    /**
     * 发表一条评论或页面贴纸留言
     */
    async addComment(
        userId: string,
        bookId: string,
        pageId: string | null,
        content: string,
        stickerType?: string,
        xPercent?: number,
        yPercent?: number
    ) {
        if (!content || content.trim().length === 0) {
            throw new Error('评论内容不能为空');
        }

        // 1. 脏字初筛过滤 (Fail-Safe 脏处理)
        const sanitizedContent = sanitizeContent(content);

        // 2. 校验书籍是否存在
        const [bookRows] = await pool.query<RowDataPacket[]>(
            'SELECT user_id, title FROM books WHERE id = ?',
            [bookId]
        );
        if (bookRows.length === 0) {
            throw new Error('书籍不存在');
        }

        const bookAuthorId = bookRows[0].user_id;
        const bookTitle = bookRows[0].title;

        // 3. 极速保存留言到数据库
        const id = crypto.randomUUID();
        const now = Date.now();

        await pool.query(
            `INSERT INTO book_comments (id, book_id, page_id, user_id, content, sticker_type, x_percent, y_percent, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, bookId, pageId || null, userId, sanitizedContent, stickerType || null, xPercent ?? null, yPercent ?? null, now]
        );

        // 4. 异步触发通知给书籍所有者
        if (bookAuthorId && bookAuthorId !== userId) {
            await notificationService.createNotification(
                bookAuthorId,
                userId,
                'comment',
                'book',
                bookId,
                bookTitle
            ).catch(err => console.warn('[SocialService] Failed to create comment notification:', err.message));
        }

        // 5. 获取发布留言的用户详情，以便前端极速渲染
        const [userRows] = await pool.query<RowDataPacket[]>(
            'SELECT nickname, avatar_url FROM users WHERE id = ?',
            [userId]
        );

        return {
            id,
            bookId,
            pageId,
            userId,
            content: sanitizedContent,
            stickerType,
            xPercent,
            yPercent,
            createdAt: now,
            nickname: userRows[0]?.nickname || '匿名时光客',
            avatarUrl: signAvatarUrl(userRows[0]?.avatar_url) || undefined
        };
    }

    /**
     * 获取某时光书下的评论/贴纸列表
     * pageId 存在时获取特定页的贴纸，pageId 为 null 时获取整书留言板留言
     */
    async getComments(bookId: string, pageId: string | null = null) {
        let sql = `
            SELECT c.*, u.nickname, u.avatar_url 
            FROM book_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.book_id = ?
        `;
        const params: any[] = [bookId];

        if (pageId) {
            sql += ' AND c.page_id = ?';
            params.push(pageId);
        } else {
            sql += ' AND c.page_id IS NULL';
        }

        sql += ' ORDER BY c.created_at DESC';

        const [rows] = await pool.query<RowDataPacket[]>(sql, params);

        return rows.map(row => ({
            id: row.id,
            bookId: row.book_id,
            pageId: row.page_id,
            userId: row.user_id,
            content: row.content,
            stickerType: row.sticker_type || undefined,
            xPercent: row.x_percent !== null ? Number(row.x_percent) : undefined,
            yPercent: row.y_percent !== null ? Number(row.y_percent) : undefined,
            createdAt: Number(row.created_at),
            nickname: row.nickname,
            avatarUrl: signAvatarUrl(row.avatar_url) || undefined
        }));
    }

    /**
     * 删除评论 (零信任防越权：只有评论发表者本人或书籍作者有权删除评论)
     */
    async deleteComment(commentId: string, currentUserId: string): Promise<void> {
        // 1. 获取评论数据
        const [commentRows] = await pool.query<RowDataPacket[]>(
            'SELECT user_id, book_id FROM book_comments WHERE id = ?',
            [commentId]
        );

        if (commentRows.length === 0) {
            throw new Error('评论不存在');
        }

        const commentCreatorId = commentRows[0].user_id;
        const bookId = commentRows[0].book_id;

        // 2. 获取书籍所有者数据
        const [bookRows] = await pool.query<RowDataPacket[]>(
            'SELECT user_id FROM books WHERE id = ?',
            [bookId]
        );

        const bookOwnerId = bookRows[0]?.user_id;

        // 3. 鉴权判断
        const isCommentCreator = commentCreatorId === currentUserId;
        const isBookOwner = bookOwnerId === currentUserId;

        if (!isCommentCreator && !isBookOwner) {
            throw new Error('您没有权限删除此评论');
        }

        // 4. 执行删除
        await pool.query('DELETE FROM book_comments WHERE id = ?', [commentId]);
    }
}

export const socialService = new SocialService();
