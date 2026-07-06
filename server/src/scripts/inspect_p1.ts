import { pool } from '../db/index.js';

async function main() {
    try {
        const bookId = '86b7f59f-1d82-4744-be22-a1eaa6b66716';
        const [pages]: any = await pool.query('SELECT id, book_id, template_id, sort_order, is_chapter_start, page_title, elements FROM pages WHERE book_id = ? ORDER BY sort_order ASC', [bookId]);
        console.log(`--- Pages for book ${bookId} ---`);
        for (const p of pages) {
            console.log(`Page ID: ${p.id}`);
            console.log(`Chapter ID: ${p.chapter_id}`);
            console.log(`Template ID: ${p.template_id}`);
            console.log(`Content (trimmed): ${p.content?.substring(0, 100)}`);
            try {
                const el = typeof p.elements === 'string' ? JSON.parse(p.elements) : p.elements;
                console.log(`Elements (type: ${typeof el}):`);
                console.dir(el, { depth: 2, colors: true });
            } catch (err) {
                console.log(`Elements (raw): ${p.elements}`);
            }
            console.log('--------------------------------------');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

main();
