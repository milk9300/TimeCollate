import { pool } from '../db/index.js';

async function listUsers() {
    try {
        const [rows]: any = await pool.query('SELECT id, nickname, username, avatar_url FROM users');
        console.log('--- USERS IN DATABASE ---');
        console.log(rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listUsers();
