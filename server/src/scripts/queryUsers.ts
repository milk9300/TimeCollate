import { pool } from '../db/index.js';

async function main() {
    try {
        const [users] = await pool.query('SELECT username, role, nickname FROM users');
        console.log(users);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
