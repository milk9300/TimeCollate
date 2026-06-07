import { pool } from '../src/db/index.js';
import { RowDataPacket } from 'mysql2';

async function checkAndFixPhotos() {
    try {
        console.log('🚀 Scanning photos table for missing oss_keys...');
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT id, url 
             FROM photos 
             WHERE (oss_key IS NULL OR oss_key = '') 
             AND url LIKE '%oss-cn-hangzhou.aliyuncs.com/%'`
        );

        console.log(`🔍 Found ${rows.length} photos with missing oss_key.`);

        let count = 0;
        for (const row of rows) {
            try {
                const url = new URL(row.url);
                const ossKey = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
                if (ossKey) {
                    await pool.query(
                        'UPDATE photos SET oss_key = ? WHERE id = ?',
                        [ossKey, row.id]
                    );
                    console.log(`✅ Fixed photo ${row.id}: ${ossKey}`);
                    count++;
                }
            } catch (e) {
                console.error(`❌ Failed to parse URL for photo ${row.id}: ${row.url}`);
            }
        }
        console.log(`🎉 Repair finished. ${count}/${rows.length} photo records updated.`);
    } catch (e) {
        console.error('Error scanning/fixing photos:', e);
    } finally {
        process.exit(0);
    }
}

checkAndFixPhotos();
