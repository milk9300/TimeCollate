import { pool } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import type { RowDataPacket } from 'mysql2';
import { signAvatarUrl } from './OssService.js';

export interface User {
    id: string;
    nickname: string;
    username: string;
    avatarUrl?: string;
    createdAt: number;
    hasSeenAnnouncement?: boolean;
    role: 'user' | 'creator' | 'admin';
    status: 'active' | 'banned';
    expiresAt?: number;
}

export class AuthService {
    private readonly jwtSecret = process.env.JWT_SECRET || 'timecollate-secret-key-2026';
    /** Access Token 有效期（缩短至 2h，配合 Refresh Token 续签） */
    private readonly accessTokenExpiresIn = '2h';
    /** Refresh Token 有效期（30天，长期无感保持登录） */
    private readonly refreshTokenExpiresMs = 30 * 24 * 60 * 60 * 1000;

    /**
     * 注册新用户
     */
    async register(nickname: string, username: string, password: string): Promise<User> {
        // 1. 检查用户名是否存在
        const [existing] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existing.length > 0) {
            throw new Error('用户名已存在');
        }

        // 2. 哈希密码
        const passwordHash = await bcrypt.hash(password, 10);
        const id = uuidv4();
        const createdAt = Date.now();

        // 3. 存储
        await pool.query(
            'INSERT INTO users (id, nickname, username, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
            [id, nickname, username, passwordHash, createdAt]
        );

        return { id, nickname, username, createdAt, hasSeenAnnouncement: false, role: 'user', status: 'active' };
    }

    /**
     * 用户登录
     */
    async login(username: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
        // 1. 查找用户
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            throw new Error('用户不存在或密码错误');
        }

        const userRow = rows[0];

        // 2. 校验密码
        const isMatch = await bcrypt.compare(password, userRow.password_hash);
        if (!isMatch) {
            throw new Error('用户不存在或密码错误');
        }

        const user: User = {
            id: userRow.id,
            nickname: userRow.nickname,
            username: userRow.username,
            avatarUrl: signAvatarUrl(userRow.avatar_url) || undefined,
            createdAt: Number(userRow.created_at),
            hasSeenAnnouncement: Boolean(userRow.has_seen_announcement),
            role: userRow.role as 'user' | 'creator' | 'admin',
            status: userRow.status as 'active' | 'banned',
            expiresAt: userRow.expires_at !== null ? Number(userRow.expires_at) : undefined
        };

        // 2.5 检查账号是否过期
        if (userRow.expires_at !== null && userRow.expires_at < Date.now()) {
            await pool.query("UPDATE users SET status = 'banned' WHERE id = ?", [userRow.id]);
            throw new Error('账户已过期，请联系管理员');
        }

        // 3. 检查账户状态
        if (user.status === 'banned') {
            throw new Error('账户已被封禁，请联系管理员');
        }

        // 4. 签发双令牌
        const accessToken = jwt.sign({ userId: user.id }, this.jwtSecret, { expiresIn: this.accessTokenExpiresIn });
        const refreshToken = await this.generateRefreshToken(user.id);

        return { user, accessToken, refreshToken };
    }

    /**
     * 获取用户信息
     */
    async getUserById(id: string): Promise<User | null> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id, nickname, username, avatar_url as avatarUrl, created_at as createdAt, has_seen_announcement as hasSeenAnnouncement, role, status, expires_at as expiresAt FROM users WHERE id = ?',
            [id]
        );

        if (rows.length === 0) return null;

        const row = rows[0];
        return {
            id: row.id,
            nickname: row.nickname,
            username: row.username,
            avatarUrl: signAvatarUrl(row.avatarUrl) || undefined,
            createdAt: Number(row.createdAt),
            hasSeenAnnouncement: Boolean(row.hasSeenAnnouncement),
            role: row.role as 'user' | 'creator' | 'admin',
            status: row.status as 'active' | 'banned',
            expiresAt: row.expiresAt !== null ? Number(row.expiresAt) : undefined
        } as User;
    }

    /**
     * 更新用户资料（如昵称）
     */
    async updateProfile(id: string, updates: { nickname?: string; avatarUrl?: string }): Promise<User> {
        const fields: string[] = [];
        const values: any[] = [];

        if (updates.nickname !== undefined) {
            fields.push('nickname = ?');
            values.push(updates.nickname);
        }

        if (updates.avatarUrl !== undefined) {
            // 防御性设计：如果是临时地址或不合法地址，设为 null，防止脏数据写入云端
            let avatarUrl = updates.avatarUrl;
            if (avatarUrl && (avatarUrl.startsWith('blob:') || avatarUrl.startsWith('data:'))) {
                avatarUrl = null as any;
            }
            fields.push('avatar_url = ?');
            values.push(avatarUrl);
        }

        if (fields.length === 0) {
            const user = await this.getUserById(id);
            if (!user) throw new Error('用户未找到');
            return user;
        }

        values.push(id);
        await pool.query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        const updatedUser = await this.getUserById(id);
        if (!updatedUser) throw new Error('用户未找到');
        return updatedUser;
    }

    /**
     * 更新用户密码
     */
    async updatePassword(id: string, oldPassword: string, newPassword: string): Promise<void> {
        // 1. 获取当前用户
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT password_hash FROM users WHERE id = ?',
            [id]
        );

        if (rows.length === 0) throw new Error('用户未找到');
        const userRow = rows[0];

        // 2. 校验旧密码
        const isMatch = await bcrypt.compare(oldPassword, userRow.password_hash);
        if (!isMatch) {
            throw new Error('旧密码错误');
        }

        // 3. 哈希新密码并更新
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [newPasswordHash, id]
        );
    }

    /**
     * 标记用户已阅读公告
     */
    async markAnnouncementAsSeen(id: string): Promise<void> {
        await pool.query(
            'UPDATE users SET has_seen_announcement = 1 WHERE id = ?',
            [id]
        );
    }

    /**
     * 获取全局公告
     */
    async getGlobalAnnouncement() {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT value FROM system_settings WHERE `key` = ?',
            ['global_announcement']
        );
        return rows[0]?.value || '';
    }

    /**
     * 校验 Access Token 并解析出用户 ID
     */
    verifyToken(token: string): string {
        try {
            const decoded = jwt.verify(token, this.jwtSecret) as { userId: string };
            return decoded.userId;
        } catch (error) {
            throw new Error('无效的认证令牌');
        }
    }

    // #region Refresh Token 管理

    /**
     * 对 Refresh Token 明文计算 SHA-256 哈希
     * 数据库只存哈希，防止数据库泄露导致 Token 被直接利用
     */
    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    /**
     * 生成并持久化 Refresh Token
     * 返回明文（仅此一次可见），数据库存 SHA-256 哈希
     */
    private async generateRefreshToken(userId: string): Promise<string> {
        const rawToken = randomBytes(48).toString('hex');
        const tokenHash = this.hashToken(rawToken);
        const id = uuidv4();
        const now = Date.now();
        const expiresAt = now + this.refreshTokenExpiresMs;

        await pool.query(
            'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
            [id, userId, tokenHash, expiresAt, now]
        );

        return rawToken;
    }

    /**
     * 使用 Refresh Token 续签新的双令牌对
     * 采用轮换策略：旧 Refresh Token 立即失效，签发全新的一对
     */
    async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        const tokenHash = this.hashToken(refreshToken);

        // 1. 查找对应的 Refresh Token 记录
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = ?',
            [tokenHash]
        );

        if (rows.length === 0) {
            throw new Error('无效的刷新令牌');
        }

        const record = rows[0];

        // 2. 检查是否过期
        if (Number(record.expires_at) < Date.now()) {
            // 清理过期记录
            await pool.query('DELETE FROM refresh_tokens WHERE id = ?', [record.id]);
            throw new Error('刷新令牌已过期，请重新登录');
        }

        const userId = record.user_id;

        // 3. 校验用户状态（零信任：不信任缓存，实时查库）
        const user = await this.getUserById(userId);
        if (!user) {
            throw new Error('用户不存在');
        }
        if (user.status === 'banned') {
            // 用户被封禁，吊销所有 Refresh Token
            await this.revokeRefreshTokensByUser(userId);
            throw new Error('账户已被封禁，请联系管理员');
        }
        if (user.expiresAt && user.expiresAt < Date.now()) {
            await pool.query("UPDATE users SET status = 'banned' WHERE id = ?", [userId]);
            await this.revokeRefreshTokensByUser(userId);
            throw new Error('账户已过期，请联系管理员');
        }

        // 4. 轮换：删除旧 Token，签发新的一对
        await pool.query('DELETE FROM refresh_tokens WHERE id = ?', [record.id]);

        const newAccessToken = jwt.sign({ userId }, this.jwtSecret, { expiresIn: this.accessTokenExpiresIn });
        const newRefreshToken = await this.generateRefreshToken(userId);

        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }

    /**
     * 吊销指定用户的所有 Refresh Token（用于登出、封禁等场景）
     */
    async revokeRefreshTokensByUser(userId: string): Promise<void> {
        await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
    }

    /**
     * 清理全局已过期的 Refresh Token（可在应用启动时或定时任务中调用）
     */
    async cleanupExpiredRefreshTokens(): Promise<number> {
        const [result]: any = await pool.query(
            'DELETE FROM refresh_tokens WHERE expires_at < ?',
            [Date.now()]
        );
        return result.affectedRows || 0;
    }

    // #endregion
}

export const authService = new AuthService();
