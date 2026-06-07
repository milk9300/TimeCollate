import { pool } from '../db/index.js';

async function queryDb() {
    try {
        console.log('--- USERS ---');
        const [users] = await pool.query('SELECT id, username, nickname, role, created_at FROM users');
        console.log(JSON.stringify(users, null, 2));

        console.log('\n--- BOOKS ---');
        const [books] = await pool.query('SELECT * FROM books');
        console.log(JSON.stringify(books, null, 2));

        console.log('\n--- CHAPTERS ---');
        const [chapters] = await pool.query('SELECT * FROM chapters');
        console.log(JSON.stringify(chapters, null, 2));

        console.log('\n--- PAGES ---');
        const [pages] = await pool.query('SELECT * FROM pages');
        console.log(JSON.stringify(pages, null, 2));

        console.log('\n--- PHOTOS ---');
        const [photos] = await pool.query('SELECT * FROM photos');
        console.log(JSON.stringify(photos, null, 2));

        process.exit(0);
    } catch (e) {
        console.error('Error querying DB:', e);
        process.exit(1);
    }
}

queryDb();

