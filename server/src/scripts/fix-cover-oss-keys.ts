import { pool } from '../db/index.js';
import { RowDataPacket } from 'mysql2';

/**
 * 修复脚本：针对 cover_oss_key 字段为空的情况，从 cover_url 中尝试还原 OSS Key。
 * 针对格式：https://time-collate.oss-cn-beijing.aliyuncs.com/uploads/2026/02/07/xxxx.png
 */
async function fixCoverOssKeys() {
    console.log('🚀 Starting cover_oss_key repair script...');

    try {
        // 查找所有 cover_oss_key 为空且 cover_url 包含 OSS 域名的记录
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT id, cover_url FROM books 
             WHERE (cover_oss_key IS NULL OR cover_oss_key = '') 
             AND cover_url LIKE '%oss-cn-hangzhou.aliyuncs.com/%'`
        );

        console.log(`🔍 Found ${rows.length} books with missing cover_oss_key.`);

        let successCount = 0;
        for (const row of rows) {
            try {
                const url = new URL(row.cover_url);
                // 路径通常类似 /uploads/2026/02/07/xxx.png
                // 我们需要去掉开头的 /
                const ossKey = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

                if (ossKey) {
                    await pool.query(
                        'UPDATE books SET cover_oss_key = ? WHERE id = ?',
                        [ossKey, row.id]
                    );
                    console.log(`✅ Fixed book ${row.id}: ${ossKey}`);
                    successCount++;
                }
            } catch (e) {
                console.error(`❌ Failed to parse URL for book ${row.id}: ${row.cover_url}`);
            }
        }

        console.log(`\n🎉 Repair finished. ${successCount}/${rows.length} records updated.`);
        process.exit(0);
    } catch (error) {
        console.error('💥 Fatal error during repair:', error);
        process.exit(1);
    }
}

fixCoverOssKeys();
