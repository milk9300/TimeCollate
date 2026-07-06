// #region Import and Database Connection
import { pool } from '../db/index.js';

async function inspectUserAssets() {
    try {
        console.log('--- USER ASSETS COUNT ---');
        const [countRows]: any = await pool.query('SELECT COUNT(*) as total FROM user_assets');
        console.log(`Total records in user_assets: ${countRows[0].total}`);

        console.log('\n--- SAMPLE RECOVERY ASSETS (size = 0 or name like sticker) ---');
        const [rows]: any = await pool.query(
            'SELECT id, user_id, type, name, url, size, created_at FROM user_assets WHERE size = 0 OR name LIKE "%徽章%" OR name LIKE "%车票%" LIMIT 10'
        );
        console.log(JSON.stringify(rows, null, 2));

        console.log('\n--- TYPES OF USER ASSETS ---');
        const [types]: any = await pool.query('SELECT type, COUNT(*) as count FROM user_assets GROUP BY type');
        console.log(JSON.stringify(types, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('Error inspecting user_assets:', error);
        process.exit(1);
    }
}

inspectUserAssets();
// #endregion
