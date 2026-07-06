import { pool } from '../db/index.js';

async function main() {
    try {
        const [rows]: any = await pool.query('SELECT id, title, author, cover_url, cover_oss_key, updated_at FROM books ORDER BY updated_at DESC');
        console.log('--- Books in database ---');
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

main();
