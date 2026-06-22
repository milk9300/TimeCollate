import { pool } from '../db/index.js';

const templates = [
    {
        id: 'single',
        name: '高光单图',
        photo_count: 1,
        category: 'classic',
        layout_schema: {
            background: { color: 'var(--theme-bg)', gridPattern: false },
            elements: [
                {
                    id: 'photo-0',
                    type: 'photo',
                    slotIndex: 0,
                    style: { left: '0%', top: '0%', width: '100%', height: '100%' }
                },
                {
                    id: 'tpl-title',
                    type: 'text',
                    role: 'chapter-title',
                    style: { left: '10%', top: '62%', width: '80%', height: '8%', fontSize: '32pt', fontWeight: 'extrabold', color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }
                },
                {
                    id: 'tpl-content',
                    type: 'text',
                    role: 'page-content',
                    style: { left: '10%', top: '72%', width: '80%', height: '16%', fontSize: '13pt', lineHeight: '1.6', color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }
                },
                {
                    id: 'tpl-date',
                    type: 'text',
                    role: 'chapter-date',
                    style: { left: '10%', top: '8%', width: '80%', height: '5%', fontSize: '10pt', textAlign: 'right', color: '#ffffff', fontWeight: 'bold', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }
                }
            ]
        }
    },
    {
        id: 'grid',
        name: '经典网格',
        photo_count: 3,
        category: 'classic',
        layout_schema: {
            background: { color: 'var(--theme-bg)', gridPattern: false },
            elements: [
                {
                    id: 'tpl-title',
                    type: 'text',
                    role: 'chapter-title',
                    style: { left: '8%', top: '8%', width: '84%', height: '6%', fontSize: '20pt', fontWeight: 'black', color: 'var(--theme-primary)' }
                },
                {
                    id: 'tpl-date',
                    type: 'text',
                    role: 'chapter-date',
                    style: { left: '8%', top: '15%', width: '84%', height: '4%', fontSize: '8pt', color: 'var(--theme-accent)', fontWeight: 'bold' }
                },
                {
                    id: 'photo-0',
                    type: 'photo',
                    slotIndex: 0,
                    style: { left: '8%', top: '22%', width: '50%', height: '50%' }
                },
                {
                    id: 'photo-1',
                    type: 'photo',
                    slotIndex: 1,
                    style: { left: '61%', top: '22%', width: '31%', height: '23%' }
                },
                {
                    id: 'photo-2',
                    type: 'photo',
                    slotIndex: 2,
                    style: { left: '61%', top: '49%', width: '31%', height: '23%' }
                },
                {
                    id: 'tpl-content',
                    type: 'text',
                    role: 'page-content',
                    style: { left: '8%', top: '76%', width: '84%', height: '16%', fontSize: '10.5pt', lineHeight: '1.6', color: 'var(--theme-secondary)' }
                }
            ]
        }
    },
    {
        id: 'collage',
        name: '艺术拼贴',
        photo_count: 4,
        category: 'magazine',
        layout_schema: {
            background: { color: 'var(--theme-bg)', gridPattern: false },
            elements: [
                {
                    id: 'photo-0',
                    type: 'photo',
                    slotIndex: 0,
                    style: { left: '8%', top: '8%', width: '40%', height: '36%' }
                },
                {
                    id: 'photo-1',
                    type: 'photo',
                    slotIndex: 1,
                    style: { left: '52%', top: '8%', width: '40%', height: '36%' }
                },
                {
                    id: 'photo-2',
                    type: 'photo',
                    slotIndex: 2,
                    style: { left: '8%', top: '48%', width: '40%', height: '36%' }
                },
                {
                    id: 'photo-3',
                    type: 'photo',
                    slotIndex: 3,
                    style: { left: '52%', top: '48%', width: '40%', height: '36%' }
                },
                {
                    id: 'tpl-content',
                    type: 'text',
                    role: 'page-content',
                    style: { left: '8%', top: '88%', width: '84%', height: '8%', fontSize: '10pt', lineHeight: '1.5', color: 'var(--theme-secondary)', textAlign: 'center' }
                }
            ]
        }
    },
    {
        id: 'cover',
        name: '章节主页',
        photo_count: 1,
        category: 'classic',
        layout_schema: {
            background: { color: 'var(--theme-bg)', gridPattern: false },
            elements: [
                {
                    id: 'photo-0',
                    type: 'photo',
                    slotIndex: 0,
                    style: { left: '15%', top: '15%', width: '70%', height: '42%' }
                },
                {
                    id: 'tpl-title',
                    type: 'text',
                    role: 'chapter-title',
                    style: { left: '15%', top: '65%', width: '70%', height: '8%', fontSize: '26pt', fontWeight: 'black', textAlign: 'center', color: 'var(--theme-primary)' }
                },
                {
                    id: 'tpl-date',
                    type: 'text',
                    role: 'chapter-date',
                    style: { left: '15%', top: '74%', width: '70%', height: '4%', fontSize: '10pt', textAlign: 'center', color: 'var(--theme-accent)', fontWeight: 'bold' }
                },
                {
                    id: 'tpl-content',
                    type: 'text',
                    role: 'page-content',
                    style: { left: '15%', top: '80%', width: '70%', height: '14%', fontSize: '11pt', lineHeight: '1.6', textAlign: 'center', color: 'var(--theme-secondary)' }
                }
            ]
        }
    },
    {
        id: 'magazine',
        name: '风尚杂志',
        photo_count: 3,
        category: 'magazine',
        layout_schema: {
            background: { color: 'var(--theme-bg)', gridPattern: false },
            elements: [
                {
                    id: 'photo-0',
                    type: 'photo',
                    slotIndex: 0,
                    style: { left: '8%', top: '8%', width: '50%', height: '68%' }
                },
                {
                    id: 'photo-1',
                    type: 'photo',
                    slotIndex: 1,
                    style: { left: '62%', top: '8%', width: '30%', height: '31%' }
                },
                {
                    id: 'photo-2',
                    type: 'photo',
                    slotIndex: 2,
                    style: { left: '62%', top: '43%', width: '30%', height: '33%' }
                },
                {
                    id: 'tpl-title',
                    type: 'text',
                    role: 'chapter-title',
                    style: { left: '8%', top: '80%', width: '50%', height: '6%', fontSize: '20pt', fontWeight: 'extrabold', color: 'var(--theme-primary)' }
                },
                {
                    id: 'tpl-content',
                    type: 'text',
                    role: 'page-content',
                    style: { left: '62%', top: '80%', width: '30%', height: '14%', fontSize: '10pt', lineHeight: '1.6', color: 'var(--theme-secondary)' }
                }
            ]
        }
    },
    {
        id: 'journal',
        name: '手账剪贴',
        photo_count: 2,
        category: 'warm',
        layout_schema: {
            background: { color: 'var(--theme-bg)', gridPattern: true },
            elements: [
                {
                    id: 'tpl-title',
                    type: 'text',
                    role: 'chapter-title',
                    style: { left: '10%', top: '8%', width: '60%', height: '6%', fontSize: '16pt', fontWeight: 'bold', color: 'var(--theme-primary)' }
                },
                {
                    id: 'tpl-date',
                    type: 'text',
                    role: 'chapter-date',
                    style: { left: '10%', top: '14%', width: '60%', height: '4%', fontSize: '9pt', color: 'var(--theme-secondary)' }
                },
                {
                    id: 'tpl-content',
                    type: 'text',
                    role: 'page-content',
                    style: { left: '10%', top: '22%', width: '45%', height: '68%', fontSize: '11pt', lineHeight: '1.7', color: 'var(--theme-secondary)' }
                },
                {
                    id: 'photo-0',
                    type: 'photo',
                    slotIndex: 0,
                    style: { left: '60%', top: '22%', width: '30%', height: '32%' }
                },
                {
                    id: 'photo-1',
                    type: 'photo',
                    slotIndex: 1,
                    style: { left: '60%', top: '58%', width: '30%', height: '32%' }
                }
            ]
        }
    },
    {
        id: 'diary',
        name: '心情日记',
        photo_count: 2,
        category: 'warm',
        layout_schema: {
            background: { color: '#FFFDF9', gridPattern: true },
            elements: [
                {
                    id: 'tpl-title',
                    type: 'text',
                    role: 'chapter-title',
                    style: { left: '12%', top: '10%', width: '76%', height: '6%', fontSize: '18pt', fontWeight: 'bold', color: '#5D4037' }
                },
                {
                    id: 'tpl-date',
                    type: 'text',
                    role: 'chapter-date',
                    style: { left: '12%', top: '16%', width: '76%', height: '4%', fontSize: '9pt', color: '#8D6E63' }
                },
                {
                    id: 'photo-0',
                    type: 'photo',
                    slotIndex: 0,
                    style: { left: '12%', top: '23%', width: '36%', height: '36%' }
                },
                {
                    id: 'photo-1',
                    type: 'photo',
                    slotIndex: 1,
                    style: { left: '52%', top: '32%', width: '36%', height: '36%' }
                },
                {
                    id: 'tpl-content',
                    type: 'text',
                    role: 'page-content',
                    style: { left: '12%', top: '72%', width: '76%', height: '20%', fontSize: '11pt', lineHeight: '1.8', color: '#5D4037' }
                }
            ]
        }
    },
    {
        id: 'cinematic',
        name: '宽荧幕电影感',
        photo_count: 1,
        category: 'modern',
        layout_schema: {
            background: { color: '#111111', gridPattern: false },
            elements: [
                {
                    id: 'tpl-title',
                    type: 'text',
                    role: 'chapter-title',
                    style: { left: '10%', top: '6%', width: '80%', height: '6%', fontSize: '12pt', color: '#888888', textAlign: 'center' }
                },
                {
                    id: 'photo-0',
                    type: 'photo',
                    slotIndex: 0,
                    style: { left: '0%', top: '15%', width: '100%', height: '56%' }
                },
                {
                    id: 'tpl-content',
                    type: 'text',
                    role: 'page-content',
                    style: { left: '10%', top: '76%', width: '80%', height: '16%', fontSize: '12pt', lineHeight: '1.8', color: '#FFFFEE', textAlign: 'center' }
                }
            ]
        }
    }
];

async function runMigrationAndSeed() {
    try {
        console.log('正在检测并升级数据库结构...');
        
        // 1. 创建 page_templates 表 (如果不存在)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS page_templates (
                id VARCHAR(36) PRIMARY KEY COMMENT '模板唯一标识UUID',
                name VARCHAR(100) NOT NULL COMMENT '模板名称',
                template_type ENUM('cover', 'preface', 'structural', 'content') NOT NULL DEFAULT 'content' COMMENT '模板结构类型',
                photo_count INT NOT NULL DEFAULT 0 COMMENT '支持/推荐照片数量',
                category VARCHAR(50) NOT NULL DEFAULT 'general' COMMENT '书籍主题分类',
                elements JSON NOT NULL COMMENT '核心 Canvas JSON Schema',
                thumbnail_url VARCHAR(500) DEFAULT NULL COMMENT '预览缩略图 WebP URL',
                creator_id VARCHAR(36) NOT NULL DEFAULT 'system' COMMENT '创作者ID',
                visibility ENUM('private', 'public') NOT NULL DEFAULT 'private' COMMENT '可见性',
                created_at BIGINT NOT NULL COMMENT '创建时间戳(毫秒)',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='排版页模板表'
        `);
        console.log('✅ page_templates 表已就绪');

        // 3. 注入系统内置的全部排版模板 (使用 Schema)
        console.log('正在灌入内置排版模板种子数据...');
        const now = Date.now();
        for (const t of templates) {
            const schemaStr = JSON.stringify(t.layout_schema);
            const templateType = t.id === 'cover' ? 'structural' : 'content';
            await pool.query(
                `INSERT INTO page_templates (id, name, template_type, photo_count, category, elements, visibility, creator_id, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, 'public', 'system', ?) 
                 ON DUPLICATE KEY UPDATE name = ?, template_type = ?, photo_count = ?, category = ?, elements = ?, visibility = 'public', creator_id = 'system'`,
                [
                    t.id, t.name, templateType, t.photo_count, t.category, schemaStr, now,
                    t.name, templateType, t.photo_count, t.category, schemaStr
                ]
            );
            console.log(`- 注入模板: ${t.name} (${t.id})`);
        }

        console.log('✅ 数据库迁移与数据灌入成功！');
        process.exit(0);
    } catch (e) {
        console.error('❌ 迁移和灌入模板失败:', e);
        process.exit(1);
    }
}

runMigrationAndSeed();
