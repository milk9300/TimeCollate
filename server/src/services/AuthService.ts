import { pool } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
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
    role: 'user' | 'admin';
    status: 'active' | 'banned';
}

export class AuthService {
    private readonly jwtSecret = process.env.JWT_SECRET || 'timecollate-secret-key-2026';
    private readonly jwtExpiresIn = '7d';

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
    async login(username: string, password: string): Promise<{ user: User; token: string }> {
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
            role: userRow.role as 'user' | 'admin',
            status: userRow.status as 'active' | 'banned'
        };

        // 3. 检查账户状态
        if (user.status === 'banned') {
            throw new Error('账户已被封禁，请联系管理员');
        }

        // 3. 生成 JWT
        const token = jwt.sign({ userId: user.id }, this.jwtSecret, { expiresIn: this.jwtExpiresIn });

        return { user, token };
    }

    /**
     * 获取用户信息
     */
    async getUserById(id: string): Promise<User | null> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id, nickname, username, avatar_url as avatarUrl, created_at as createdAt, has_seen_announcement as hasSeenAnnouncement, role, status FROM users WHERE id = ?',
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
            role: row.role as 'user' | 'admin',
            status: row.status as 'active' | 'banned'
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
     * 校验 Token 并解析出用户 ID
     */
    verifyToken(token: string): string {
        try {
            const decoded = jwt.verify(token, this.jwtSecret) as { userId: string };
            return decoded.userId;
        } catch (error) {
            throw new Error('无效的认证令牌');
        }
    }
}

export const authService = new AuthService();
