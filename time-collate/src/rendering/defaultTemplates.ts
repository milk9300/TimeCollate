import type { Template } from '../types';

export const DEFAULT_TEMPLATES: Template[] = [
    {
        id: 'single',
        name: '高光单图',
        photoCount: 1,
        category: 'classic',
        layoutSchema: {
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
                    style: { left: '8%', top: '62%', width: '84%', height: '8%', fontSize: '32pt', fontWeight: 'extrabold', color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }
                },
                {
                    id: 'tpl-content',
                    type: 'text',
                    role: 'page-content',
                    style: { left: '8%', top: '72%', width: '84%', height: '16%', fontSize: '13pt', lineHeight: '1.6', color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }
                },
                {
                    id: 'tpl-date',
                    type: 'text',
                    role: 'chapter-date',
                    style: { left: '8%', top: '8%', width: '84%', height: '5%', fontSize: '10pt', textAlign: 'right', color: '#ffffff', fontWeight: 'bold', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }
                }
            ]
        }
    },
    {
        id: 'grid',
        name: '经典网格',
        photoCount: 3,
        category: 'classic',
        layoutSchema: {
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
        photoCount: 4,
        category: 'magazine',
        layoutSchema: {
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
        photoCount: 1,
        category: 'classic',
        layoutSchema: {
            background: { color: 'var(--theme-bg)', gridPattern: false },
            elements: [
                {
                    id: 'photo-0',
                    type: 'photo',
                    slotIndex: 0,
                    style: { left: '8%', top: '15%', width: '84%', height: '42%' }
                },
                {
                    id: 'tpl-title',
                    type: 'text',
                    role: 'chapter-title',
                    style: { left: '8%', top: '65%', width: '84%', height: '8%', fontSize: '26pt', fontWeight: 'black', textAlign: 'center', color: 'var(--theme-primary)' }
                },
                {
                    id: 'tpl-date',
                    type: 'text',
                    role: 'chapter-date',
                    style: { left: '8%', top: '74%', width: '84%', height: '4%', fontSize: '10pt', textAlign: 'center', color: 'var(--theme-accent)', fontWeight: 'bold' }
                },
                {
                    id: 'tpl-content',
                    type: 'text',
                    role: 'page-content',
                    style: { left: '8%', top: '80%', width: '84%', height: '14%', fontSize: '11pt', lineHeight: '1.6', textAlign: 'center', color: 'var(--theme-secondary)' }
                }
            ]
        }
    },
    {
        id: 'magazine',
        name: '风尚杂志',
        photoCount: 3,
        category: 'magazine',
        layoutSchema: {
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
        photoCount: 2,
        category: 'warm',
        layoutSchema: {
            background: { color: 'var(--theme-bg)', gridPattern: true },
            elements: [
                {
                    id: 'tpl-title',
                    type: 'text',
                    role: 'chapter-title',
                    style: { left: '8%', top: '8%', width: '48%', height: '6%', fontSize: '16pt', fontWeight: 'bold', color: 'var(--theme-primary)' }
                },
                {
                    id: 'tpl-date',
                    type: 'text',
                    role: 'chapter-date',
                    style: { left: '8%', top: '14%', width: '48%', height: '4%', fontSize: '9pt', color: 'var(--theme-secondary)' }
                },
                {
                    id: 'tpl-content',
                    type: 'text',
                    role: 'page-content',
                    style: { left: '8%', top: '22%', width: '48%', height: '68%', fontSize: '11pt', lineHeight: '1.7', color: 'var(--theme-secondary)' }
                },
                {
                    id: 'photo-0',
                    type: 'photo',
                    slotIndex: 0,
                    style: { left: '60%', top: '22%', width: '32%', height: '32%' }
                },
                {
                    id: 'photo-1',
                    type: 'photo',
                    slotIndex: 1,
                    style: { left: '60%', top: '58%', width: '32%', height: '32%' }
                }
            ]
        }
    },
    {
        id: 'diary',
        name: '心情日记',
        photoCount: 2,
        category: 'warm',
        layoutSchema: {
            background: { color: '#FFFDF9', gridPattern: true },
            elements: [
                {
                    id: 'tpl-title',
                    type: 'text',
                    role: 'chapter-title',
                    style: { left: '8%', top: '10%', width: '84%', height: '6%', fontSize: '18pt', fontWeight: 'bold', color: '#5D4037' }
                },
                {
                    id: 'tpl-date',
                    type: 'text',
                    role: 'chapter-date',
                    style: { left: '8%', top: '16%', width: '84%', height: '4%', fontSize: '9pt', color: '#8D6E63' }
                },
                {
                    id: 'photo-0',
                    type: 'photo',
                    slotIndex: 0,
                    style: { left: '8%', top: '23%', width: '40%', height: '36%' }
                },
                {
                    id: 'photo-1',
                    type: 'photo',
                    slotIndex: 1,
                    style: { left: '52%', top: '32%', width: '40%', height: '36%' }
                },
                {
                    id: 'tpl-content',
                    type: 'text',
                    role: 'page-content',
                    style: { left: '8%', top: '72%', width: '84%', height: '20%', fontSize: '11pt', lineHeight: '1.8', color: '#5D4037' }
                }
            ]
        }
    },
    {
        id: 'cinematic',
        name: '宽荧幕电影感',
        photoCount: 1,
        category: 'modern',
        layoutSchema: {
            background: { color: '#111111', gridPattern: false },
            elements: [
                {
                    id: 'tpl-title',
                    type: 'text',
                    role: 'chapter-title',
                    style: { left: '8%', top: '6%', width: '84%', height: '6%', fontSize: '12pt', color: '#888888', textAlign: 'center' }
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
                    style: { left: '8%', top: '76%', width: '84%', height: '16%', fontSize: '12pt', lineHeight: '1.8', color: '#FFFFEE', textAlign: 'center' }
                }
            ]
        }
    }
];
