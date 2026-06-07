import { pool } from '../db/index.js';

const DECORATIONS = {
    classic: {
        flourish: `<svg viewBox="0 0 200 100" fill="currentColor"><path d="M10,50 Q50,10 100,50 T190,50" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="100" cy="50" r="5"/></svg>`,
        corner: `<svg viewBox="0 0 100 100" fill="currentColor"><path d="M0,100 Q0,0 100,0" stroke="currentColor" stroke-width="3" fill="none"/><circle cx="90" cy="10" r="4"/></svg>`,
    },
    modern: {
        grid: `<svg viewBox="0 0 100 100" fill="none"><rect x="10" y="10" width="80" height="80" stroke="currentColor" stroke-width="1"/><rect x="30" y="30" width="40" height="40" stroke="currentColor" stroke-width="1"/></svg>`,
        circle: `<svg viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="1"/><circle cx="50" cy="50" r="25" stroke="currentColor" stroke-width="1"/></svg>`,
        lines: `<svg viewBox="0 0 100 100" fill="none"><line x1="0" y1="20" x2="100" y2="20" stroke="currentColor" stroke-width="1"/><line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" stroke-width="1"/><line x1="0" y1="80" x2="100" y2="80" stroke="currentColor" stroke-width="1"/></svg>`,
    },
    warm: {
        heart: `<svg viewBox="0 0 100 100" fill="currentColor"><path d="M50,90 C20,60 0,40 25,20 C40,10 50,25 50,25 C50,25 60,10 75,20 C100,40 80,60 50,90Z"/></svg>`,
        star: `<svg viewBox="0 0 100 100" fill="currentColor"><polygon points="50,5 61,40 98,40 68,62 79,97 50,75 21,97 32,62 2,40 39,40"/></svg>`,
        flower: `<svg viewBox="0 0 100 100" fill="currentColor"><circle cx="50" cy="50" r="10"/><ellipse cx="50" cy="25" rx="12" ry="20"/><ellipse cx="50" cy="75" rx="12" ry="20"/><ellipse cx="25" cy="50" rx="20" ry="12"/><ellipse cx="75" cy="50" rx="20" ry="12"/></svg>`,
        cloud: `<svg viewBox="0 0 100 60" fill="currentColor"><ellipse cx="30" cy="40" rx="25" ry="18"/><ellipse cx="50" cy="30" rx="20" ry="15"/><ellipse cx="70" cy="40" rx="28" ry="20"/></svg>`,
    },
    magazine: {
        bolt: `<svg viewBox="0 0 100 100" fill="currentColor"><polygon points="60,5 25,50 45,50 40,95 75,50 55,50"/></svg>`,
        triangle: `<svg viewBox="0 0 100 100" fill="currentColor"><polygon points="50,10 90,90 10,90"/></svg>`,
        splash: `<svg viewBox="0 0 100 100" fill="currentColor"><path d="M50,10 L60,40 L90,35 L70,55 L85,85 L50,70 L15,85 L30,55 L10,35 L40,40 Z"/></svg>`,
    },
};

const themes = [
    {
        id: 'classic',
        name: '经典雅致',
        creator_id: 'system',
        visibility: 'public',
        theme_schema: {
            fontFamily: '"Noto Serif SC", "Playfair Display", Georgia, serif',
            primaryColor: '#2C2C2C',
            secondaryColor: '#5A5A5A',
            accentColor: '#B8860B',
            backgroundColor: '#FFFEF8',
            backgroundGradient: 'linear-gradient(135deg, #FFFEF8 0%, #FFF8E7 100%)',
            borderColor: '#D4C4A8',
            titleStyle: {
                fontWeight: '600',
                letterSpacing: '0.05em'
            },
            decorations: [
                { type: 'svg', content: DECORATIONS.classic.corner, position: 'top-left', size: '80px', opacity: 0.15, rotation: 0 },
                { type: 'svg', content: DECORATIONS.classic.corner, position: 'top-right', size: '80px', opacity: 0.15, rotation: 90 },
                { type: 'svg', content: DECORATIONS.classic.corner, position: 'bottom-left', size: '80px', opacity: 0.15, rotation: -90 },
                { type: 'svg', content: DECORATIONS.classic.corner, position: 'bottom-right', size: '80px', opacity: 0.15, rotation: 180 },
                { type: 'svg', content: DECORATIONS.classic.flourish, position: 'center', size: '200px', opacity: 0.08, rotation: 0 }
            ]
        }
    },
    {
        id: 'modern',
        name: '现代简约',
        creator_id: 'system',
        visibility: 'public',
        theme_schema: {
            fontFamily: '"Inter", "SF Pro Display", -apple-system, sans-serif',
            primaryColor: '#111827',
            secondaryColor: '#4B5563',
            accentColor: '#2563EB',
            backgroundColor: '#FFFFFF',
            backgroundGradient: 'linear-gradient(180deg, #FFFFFF 0%, #F3F4F6 100%)',
            borderColor: '#E5E7EB',
            titleStyle: {
                fontWeight: '700',
                letterSpacing: '-0.02em',
                textTransform: 'uppercase'
            },
            decorations: [
                { type: 'svg', content: DECORATIONS.modern.grid, position: 'top-right', size: '150px', opacity: 0.1, rotation: 0 },
                { type: 'svg', content: DECORATIONS.modern.circle, position: 'bottom-left', size: '120px', opacity: 0.08, rotation: 0 },
                { type: 'svg', content: DECORATIONS.modern.lines, position: 'top-left', size: '100px', opacity: 0.12, rotation: 45 }
            ]
        }
    },
    {
        id: 'warm',
        name: '温馨时光',
        creator_id: 'system',
        visibility: 'public',
        theme_schema: {
            fontFamily: '"Ma Shan Zheng", "ZCOOL XiaoWei", cursive',
            primaryColor: '#5D4037',
            secondaryColor: '#8D6E63',
            accentColor: '#FF6B35',
            backgroundColor: '#FFF9F0',
            backgroundGradient: 'linear-gradient(135deg, #FFF9F0 0%, #FFE8D6 50%, #FFDAB9 100%)',
            borderColor: '#FFCBA4',
            titleStyle: {
                fontWeight: '400',
                letterSpacing: '0.1em'
            },
            decorations: [
                { type: 'svg', content: DECORATIONS.warm.heart, position: 'top-right', size: '80px', opacity: 0.2, rotation: 0 },
                { type: 'svg', content: DECORATIONS.warm.star, position: 'top-left', size: '60px', opacity: 0.15, rotation: 15 },
                { type: 'svg', content: DECORATIONS.warm.flower, position: 'bottom-right', size: '90px', opacity: 0.15, rotation: -10 },
                { type: 'svg', content: DECORATIONS.warm.cloud, position: 'bottom-left', size: '100px', opacity: 0.12, rotation: 0 },
                { type: 'emoji', content: '🌸', position: 'top-right', size: '48px', opacity: 0.3, rotation: 20 },
                { type: 'emoji', content: '✨', position: 'bottom-left', size: '36px', opacity: 0.25, rotation: 0 }
            ]
        }
    },
    {
        id: 'magazine',
        name: '时尚杂志',
        creator_id: 'system',
        visibility: 'public',
        theme_schema: {
            fontFamily: '"Oswald", "Bebas Neue", Impact, sans-serif',
            primaryColor: '#DC2626',
            secondaryColor: '#1F2937',
            accentColor: '#FBBF24',
            backgroundColor: '#FAFAFA',
            backgroundGradient: 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)',
            borderColor: '#E5E5E5',
            titleStyle: {
                fontWeight: '900',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
            },
            decorations: [
                { type: 'svg', content: DECORATIONS.magazine.bolt, position: 'top-right', size: '100px', opacity: 0.15, rotation: -15 },
                { type: 'svg', content: DECORATIONS.magazine.triangle, position: 'bottom-left', size: '120px', opacity: 0.12, rotation: 0 },
                { type: 'svg', content: DECORATIONS.magazine.splash, position: 'top-left', size: '110px', opacity: 0.1, rotation: 45 }
            ]
        }
    }
];

async function seedThemes() {
    console.log('开始注入内置排版主题种子数据...');
    try {
        for (const t of themes) {
            const schemaStr = JSON.stringify(t.theme_schema);
            await pool.query(
                `INSERT INTO book_themes (id, name, creator_id, visibility, theme_schema) 
                 VALUES (?, ?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE name = ?, creator_id = ?, visibility = ?, theme_schema = ?`,
                [
                    t.id, t.name, t.creator_id, t.visibility, schemaStr,
                    t.name, t.creator_id, t.visibility, schemaStr
                ]
            );
            console.log(`- 注入主题: ${t.name} (${t.id})`);
        }
        console.log('✅ 主题种子注入完成！');
        process.exit(0);
    } catch (e) {
        console.error('❌ 注入主题失败:', e);
        process.exit(1);
    }
}

seedThemes();
