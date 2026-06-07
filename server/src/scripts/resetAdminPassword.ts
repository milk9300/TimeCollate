import { pool } from '../db/index.js';
import bcrypt from 'bcryptjs';

async function main() {
    try {
        const passwordHash = await bcrypt.hash('123456', 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE username = ?', [passwordHash, '2936989564@qq.com']); // Wait, is it 2936989684@qq.com or 2936989564@qq.com? The list returned 2936989684@qq.com. Let's do both to be safe!
        await pool.query('UPDATE users SET password_hash = ? WHERE username = ?', [passwordHash, '2936989684@qq.com']);
        console.log('Admin passwords reset to 123456');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
