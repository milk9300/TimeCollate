import { pool } from '../db/index.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function createAdmin() {
    // 从命令行读取参数：npm run db:create-admin <用户名> <密码> <昵称>
    const username = process.argv[2] || 'admin@timecollate.com';
    const password = process.argv[3] || 'admin123';
    const nickname = process.argv[4] || '系统管理员';

    console.log(`正在创建/升级管理员用户: ${username}...`);

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const now = Date.now();

        // 检查用户是否已存在
        const [existing]: any = await pool.query('SELECT id FROM users WHERE username = ?', [username]);

        if (existing && existing.length > 0) {
            // 已存在，将其提权为 admin 并重置密码
            await pool.query(
                `UPDATE users SET role = 'admin', password_hash = ?, nickname = ? WHERE username = ?`,
                [passwordHash, nickname, username]
            );
            console.log(`✅ 用户 ${username} 已存在，已成功将其权限升级为 [admin] 并更新了密码！`);
        } else {
            // 不存在，创建新管理员
            const id = uuidv4();
            await pool.query(
                `INSERT INTO users (id, nickname, username, password_hash, role, created_at) 
                 VALUES (?, ?, ?, ?, 'admin', ?)`,
                [id, nickname, username, passwordHash, now]
            );
            console.log(`✅ 成功创建全新的管理员用户！`);
            console.log(`   - 昵称: ${nickname}`);
            console.log(`   - 用户名: ${username}`);
            console.log(`   - 密码: ${password}`);
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ 创建管理员失败:', err);
        process.exit(1);
    }
}

createAdmin();
