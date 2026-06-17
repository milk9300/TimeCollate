import { pool } from '../db/index.js';

async function check() {
    try {
        const [triggers] = await pool.query('SHOW TRIGGERS');
        console.log('--- TRIGGERS ---');
        console.log(JSON.stringify(triggers, null, 2));

        const [procedures] = await pool.query('SHOW PROCEDURE STATUS WHERE Db = DATABASE()');
        console.log('--- PROCEDURES ---');
        console.log(JSON.stringify(procedures, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
