import mysql from 'mysql2/promise';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 提取并转换 React SVGs 为标准 HTML/SVG 属性
const STICKER_SEEDS = [
    // === 复古印章 (Stamps) ===
    {
        id: 'stamp-postal',
        name: '时光邮戳',
        category: 'stamps',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="50" cy="50" r="45" stroke-width="3" /><circle cx="50" cy="50" r="38" stroke-width="1" stroke-dasharray="3 2" /><circle cx="50" cy="50" r="26" stroke-width="1.5" /><path d="M35 50h30" stroke-width="2" /><path d="M50 35v30" stroke-width="1" stroke-dasharray="1 2" /><path d="M22 50 A28 28 0 0 1 78 50" id="stamp-text-path-top" fill="none" stroke="none" /><path d="M78 50 A28 28 0 0 1 22 50" id="stamp-text-path-bottom" fill="none" stroke="none" /><polygon points="50,42 53,48 60,49 55,54 56,60 50,57 44,60 45,54 40,49 47,48" fill="currentColor" stroke="none" /><line x1="50" y1="5" x2="50" y2="9" stroke-width="2" /><line x1="50" y1="91" x2="50" y2="95" stroke-width="2" /><line x1="5" y1="50" x2="9" y2="50" stroke-width="2" /><line x1="91" y1="50" x2="95" y2="50" stroke-width="2" /></svg>`
    },
    {
        id: 'stamp-mail',
        name: '航空邮票章',
        category: 'stamps',
        svg: `<svg viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5h90l10 10v50l-10 10H15L5 65V15z" stroke-width="3" /><path d="M19 9h82l8 8v46l-8 8H19l-8-8V17z" stroke-width="1" stroke-dasharray="2 2" /><g transform="translate(25, 20)"><path d="M35 15l-15-5v-6l20 11 25-3 5 3-30 8-5 12-5 3v-10z" fill="currentColor" stroke="none" /></g><path d="M10 25c25-10 45-10 70 0s25 10 30 5" stroke-width="1.5" /><path d="M8 40c25-10 45-10 70 0s25 10 32 5" stroke-width="1.5" /><path d="M12 55c25-10 45-10 70 0s25 10 28 5" stroke-width="1.5" /></svg>`
    },
    {
        id: 'stamp-wax-seal',
        name: '火漆印章',
        category: 'stamps',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M50 4C73 2 95 18 97 42c2 25-14 51-40 54-25 3-51-12-53-38C2 31 23 6 50 4z" fill="currentColor" fill-opacity="0.85" stroke="none" /><path d="M50 14c18-2 36 10 38 28s-8 38-28 40-36-10-38-28 8-38 28-40z" stroke="rgba(255,255,255,0.4)" stroke-width="3" /><path d="M50 63c-1-1-12-10-12-18s5-10 12-4c7-6 12-4 12 4s-11 17-12 18z" fill="none" stroke="white" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" /></svg>`
    },
    {
        id: 'stamp-ticket',
        name: '回忆车票章',
        category: 'stamps',
        svg: `<svg viewBox="0 0 120 70" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5h100c3 0 5 2 5 5v13a7 7 0 0 0 0 14v13c0 3-2 5-5 5H10c-3 0-5-2-5-5V37a7 7 0 0 0 0-14V10c0-3 2-5 5-5z" stroke-width="3" /><line x1="30" y1="5" x2="30" y2="65" stroke-dasharray="3 3" /><text x="18" y="38" font-size="10" font-family="monospace" font-weight="bold" fill="currentColor" stroke="none" transform="rotate(-90 18 38)">NO.88</text><text x="45" y="28" font-size="11" font-family="sans-serif" font-weight="bold" fill="currentColor" stroke="none">ADMIT ONE</text><text x="45" y="48" font-size="9" font-family="sans-serif" fill="currentColor" stroke="none" opacity="0.8">TIME TRAVEL</text><circle cx="8" cy="8" r="2" fill="none" stroke-width="1.5" /><circle cx="112" cy="8" r="2" fill="none" stroke-width="1.5" /><circle cx="8" cy="62" r="2" fill="none" stroke-width="1.5" /><circle cx="112" cy="62" r="2" fill="none" stroke-width="1.5" /></svg>`
    },
    {
        id: 'stamp-date',
        name: '手记日期章',
        category: 'stamps',
        svg: `<svg viewBox="0 0 120 50" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="110" height="40" rx="3" stroke-width="3" /><rect x="9" y="9" width="102" height="32" rx="1" stroke-width="1" stroke-dasharray="1.5 1.5" /><text x="60" y="22" text-anchor="middle" font-size="10" font-family="sans-serif" font-weight="bold" fill="currentColor" stroke="none">JOURNALED</text><text x="60" y="36" text-anchor="middle" font-size="9" font-family="monospace" fill="currentColor" stroke="none">★ 2026.05.29 ★</text></svg>`
    },
    {
        id: 'stamp-verified',
        name: '认证徽章',
        category: 'stamps',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M50 4l4 8 8-4 1 9 9-2-2 9 9 1-5 8 7 5-7 6 5 8-8 3 2 9-9-1-2 9-8-5-5 8-5-8-8 5-2-9-9 1 2-9-8-3 5-8-7-5 7-6-5-8 9-1 2-9-9 2 1-9 8 4z" stroke-width="2.5" /><circle cx="50" cy="50" r="30" stroke-width="1.5" /><text x="50" y="47" text-anchor="middle" font-size="10" font-family="sans-serif" font-weight="black" fill="currentColor" stroke="none">MEMORIES</text><text x="50" y="61" text-anchor="middle" font-size="11" font-family="sans-serif" font-weight="black" fill="currentColor" stroke="none">VERIFIED</text></svg>`
    },
    {
        id: 'stamp-camera',
        name: '镜头留念章',
        category: 'stamps',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="50" cy="50" r="45" stroke-width="2.5" /><circle cx="50" cy="50" r="41" stroke-width="0.8" stroke-dasharray="2 1.5" /><g transform="translate(30, 32)"><path d="M36 28H4a2 2 0 01-2-2V10a2 2 0 012-2h6l2.5-3.5h11L26 8h6a2 2 0 012 2v16a2 2 0 01-2 2z" stroke-width="2" /><circle cx="18" cy="18" r="6" /><circle cx="18" cy="18" r="2.5" fill="currentColor" stroke="none" /></g><path d="M12 50 A38 38 0 0 1 88 50" id="camera-stamp-path" fill="none" stroke="none" /><text font-size="8" font-weight="bold" fill="currentColor" stroke="none"><textPath href="#camera-stamp-path" startOffset="50%" text-anchor="middle">SNAPSHOT RECORD</textPath></text></svg>`
    },
    {
        id: 'stamp-compass',
        name: '旅行足迹章',
        category: 'stamps',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="50" cy="50" r="45" stroke-width="2.5" /><circle cx="50" cy="50" r="40" stroke-width="1" /><polygon points="50,15 56,50 50,56" fill="currentColor" stroke="currentColor" /><polygon points="50,85 44,50 50,56" fill="none" stroke="currentColor" /><circle cx="50" cy="50" r="3" fill="white" stroke="currentColor" /><text x="50" y="27" text-anchor="middle" font-size="9" font-family="sans-serif" font-weight="bold" fill="currentColor" stroke="none">N</text><text x="50" y="81" text-anchor="middle" font-size="9" font-family="sans-serif" fill="currentColor" stroke="none">S</text><text x="21" y="53" text-anchor="middle" font-size="9" font-family="sans-serif" fill="currentColor" stroke="none">W</text><text x="79" y="53" text-anchor="middle" font-size="9" font-family="sans-serif" fill="currentColor" stroke="none">E</text></svg>`
    },
    // === 彩色手账贴纸 (Stickers) ===
    {
        id: 'sticker-flower',
        name: '手绘粉樱',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M50 50c3-16 12-25 24-20 9 4 7 17.5-1 23-8 5.5-23-3-23-3z" fill="#FECDD3" /><path d="M50 50c16 3 25 12 20 24-4 9-17.5 7-23-1-5.5-8 3-23 3-23z" fill="#FECDD3" /><path d="M50 50c-3 16-12 25-24 20-9-4-7-17.5 1-23 8-5.5 23 3 23 3z" fill="#FECDD3" /><path d="M50 50c-16-3-25-12-20-24 4-9 17.5-7 23 1 5.5 8-3 23-3 23z" fill="#FECDD3" /><path d="M50 50c9-13 22-13 22-2-1 9-12 12-22 2z" fill="#FFE4E6" /><circle cx="50" cy="50" r="6" fill="#FDE047" stroke="#CA8A04" stroke-width="2" /><line x1="50" y1="50" x2="57" y2="40" stroke="#CA8A04" stroke-width="1.5" /><line x1="50" y1="50" x2="43" y2="40" stroke="#CA8A04" stroke-width="1.5" /><line x1="50" y1="50" x2="59" y2="57" stroke="#CA8A04" stroke-width="1.5" /><line x1="50" y1="50" x2="41" y2="57" stroke="#CA8A04" stroke-width="1.5" /></svg>`
    },
    {
        id: 'sticker-clover',
        name: '治愈幸运草',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M50 50c-6-15-20-20-25-12s-1 20 12 22c7 1.5 13-10 13-10z" fill="#86EFAC" /><path d="M50 50c15-6 20-20 12-25s-20-1-22 12c-1.5 7 10 13 10 13z" fill="#86EFAC" /><path d="M50 50c6 15 20 20 25 12s1-20-12-22c-7-1.5-13 10-13 10z" fill="#86EFAC" /><path d="M50 50c-15 6-20 20-12 25s20 1 22-12c1.5-7-10-13-10-13z" fill="#86EFAC" /><path d="M28 41s8-2 15 5M59 28s2 8-5 15M72 59s-8 2-15-5M41 72s-2-8 5-15" stroke="#166534" stroke-width="1.5" opacity="0.6" /><path d="M50 50c-2 14-8 29-18 36" stroke="currentColor" stroke-width="3" /></svg>`
    },
    {
        id: 'sticker-sunflower',
        name: '暖阳向日葵',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g fill="#FDE047"><path d="M50 20c3-10-3-15-10-10s2 15 10 10z" /><path d="M50 80c-3 10 3 15 10 10s-2-15-10-10z" /><path d="M20 50c-10-3-15 3-10 10s15-2 10-10z" /><path d="M80 50c10 3 15-3 10-10s-15 2-10 10z" /><path d="M28 28c-9-5-14 1-9 9s14-2 9-9z" /><path d="M72 72c9 5 14-1 9-9s-14 2-9 9z" /><path d="M28 72c-5 9 1 14 9 9s-2-14-9-9z" /><path d="M72 28c5-9-1-14-9-9s2 14 9 9z" /></g><circle cx="50" cy="50" r="18" fill="#78350F" stroke="#451A03" stroke-width="3" /><circle cx="50" cy="50" r="12" fill="#451A03" stroke="none" opacity="0.5" /><path d="M75 75c8-1 12-8 15-15-8-2-15 3-15 15z" fill="#4ADE80" stroke="currentColor" stroke-width="1.5" /></svg>`
    },
    {
        id: 'sticker-leaves',
        name: '秋日枫叶',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M50 10l5 15h12l-8 10 3 15-12-8-12 8 3-15-8-10h12z" fill="#F97316" /><path d="M50 25V75" stroke="#7C2D12" stroke-width="2" /><path d="M50 40l10-8M50 50l12 5M50 40l-10-8M50 50l-12 5" stroke="#7C2D12" stroke-width="1.5" /><path d="M50 75v15" stroke="currentColor" stroke-width="3" /></svg>`
    },
    {
        id: 'sticker-star',
        name: '梦幻星空',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="50,5 63,38 98,38 70,58 81,93 50,72 19,93 30,58 2,38 37,38" fill="#FDE047" stroke="#EAB308" stroke-width="3" /><polygon points="20,15 23,22 30,22 25,26 27,33 20,29 13,33 15,26 10,22 17,22" fill="#FEF08A" stroke="none" /><polygon points="80,18 82,23 88,23 84,26 86,31 80,28 74,31 76,26 72,23 78,23" fill="#FEF08A" stroke="none" /></svg>`
    },
    {
        id: 'sticker-heart',
        name: '手绘爱心',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M50 88C18 56-2 36 22 14c14-13 28 3 28 3s14-16 28-3c24 22 4 42-28 74z" fill="#F87171" stroke="#DC2626" stroke-width="3.5" /><path d="M68 28c8 8 3 18-8 28" stroke="#FEE2E2" stroke-width="2" stroke-linecap="round" opacity="0.6" /><path d="M22 68c-6-6-10-2-5 3s10 7 5-3z" fill="#F472B6" stroke="none" /></svg>`
    },
    {
        id: 'sticker-airplane',
        name: '马卡龙纸飞机',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="90,10 10,40 45,55" fill="#BFDBFE" /><polygon points="90,10 45,55 70,80" fill="#60A5FA" /><polygon points="45,55 45,80 58,68" fill="#3B82F6" /><path d="M12 85c15-15 35-5 45-20" stroke="#93C5FD" stroke-width="3" stroke-dasharray="3 3" /></svg>`
    },
    {
        id: 'sticker-camera',
        name: '手绘拍立得',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="25" width="80" height="58" rx="8" fill="#F1F5F9" stroke="#64748B" stroke-width="4" /><path d="M10 42h80" stroke="#64748B" stroke-width="2.5" /><rect x="25" y="14" width="50" height="11" rx="3" fill="#64748B" stroke="none" /><rect x="18" y="30" width="10" height="7" rx="1" fill="#475569" stroke="none" /><circle cx="78" cy="18" r="4.5" fill="#EF4444" stroke="none" /><circle cx="50" cy="54" r="20" fill="#0D9488" stroke="#115E59" stroke-width="3.5" /><circle cx="50" cy="54" r="12" fill="#115E59" stroke="none" /><circle cx="45" cy="49" r="3" fill="white" stroke="none" /></svg>`
    },
    {
        id: 'sticker-backpack',
        name: '户外双肩包',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="20" y="32" width="60" height="56" rx="10" fill="#F59E0B" stroke="#B45309" stroke-width="4" /><path d="M20 45c0-10 10-18 30-18s30 8 30 18z" fill="#D97706" stroke="#B45309" stroke-width="2.5" /><line x1="35" y1="27" x2="35" y2="88" stroke="#78350F" stroke-width="3.5" /><line x1="65" y1="27" x2="65" y2="88" stroke="#78350F" stroke-width="3.5" /><path d="M38 27V18c0-4 6-6 12-6s12 2 12 6v9" stroke="#78350F" stroke-width="3.5" /></svg>`
    },
    {
        id: 'sticker-map',
        name: '手账小地图',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="10,25 36,15 62,25 90,15 90,75 62,85 36,75 10,85" fill="#FEF08A" stroke="#CA8A04" stroke-width="3.5" /><line x1="36" y1="15" x2="36" y2="75" stroke="#CA8A04" stroke-width="1.5" /><line x1="62" y1="25" x2="62" y2="85" stroke="#CA8A04" stroke-width="1.5" /><path d="M22 60c5-10 15-5 25-15s5-15 25-10" stroke="#EF4444" stroke-width="3.5" stroke-dasharray="3 3" /><path d="M72 32l6 6M78 32l-6 6" stroke="#EF4444" stroke-width="4" /></svg>`
    },
    {
        id: 'sticker-pin',
        name: '物理图钉',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M50 50 L25 80 L50 60 L75 80 Z" fill="#94A3B8" stroke="#475569" stroke-width="2" /><circle cx="50" cy="40" r="25" fill="#EF4444" stroke="#B91C1C" stroke-width="4" /><circle cx="42" cy="32" r="6" fill="#FEE2E2" stroke="none" /></svg>`
    },
    {
        id: 'sticker-clip',
        name: '手信别针',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M80 35v30c0 14-11 25-25 25s-25-11-25-25V25c0-8 7-15 15-15s15 7 15 15v35c0 3-3 6-6 6s-6-3-6-6V35" stroke="#F59E0B" /></svg>`
    },
    {
        id: 'sticker-tag',
        name: '文艺行李签',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(-15 50 50)"><path d="M20 30h45l20 20-20 20H20z" fill="#E7E5E4" stroke="#78716C" stroke-width="3" /><circle cx="75" cy="50" r="4" fill="white" stroke="#78716C" stroke-width="2" /><line x1="8" y1="50" x2="71" y2="50" stroke="#78716C" stroke-width="1.5" stroke-dasharray="3 3" /><path d="M79 50c6 0 10-6 12-12" stroke="#78716C" stroke-width="2" /></g></svg>`
    },
    {
        id: 'sticker-letter',
        name: '情书邮包',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="25" width="80" height="52" rx="4" fill="#FEF3C7" stroke="#D97706" stroke-width="4.5" /><path d="M10 27l40 32 40-32" stroke="#D97706" stroke-width="3.5" /><circle cx="50" cy="58" r="9" fill="#EF4444" stroke="none" /><polygon points="50,65 52,61 57,56 50,54 43,56 48,61" fill="#DC2626" stroke="none" /></svg>`
    },
    {
        id: 'sticker-key',
        name: '秘密钥匙',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(45 50 50)"><circle cx="25" cy="50" r="16" fill="#FBBF24" stroke="#D97706" stroke-width="4" /><circle cx="25" cy="50" r="6" fill="white" stroke="#D97706" stroke-width="2" /><line x1="41" y1="50" x2="88" y2="50" stroke="#D97706" stroke-width="5.5" /><path d="M72 50v12M82 50v12" stroke="#D97706" stroke-width="4" stroke-linecap="square" /></g></svg>`
    },
    {
        id: 'sticker-palette',
        name: '童趣调色板',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M50 14c-22 0-38 15-38 36s18 36 38 36c6 0 10-4 10-10 0-3-1-5-3-7-.7-.7-1-1.7-1-2.7 0-2 1.7-4 4-4H78c13 0 14-11 14-23s-20-26-42-26z" fill="#EDD5BE" stroke="#854D0E" stroke-width="4" /><circle cx="34" cy="36" r="8" fill="#EF4444" stroke="none" /><circle cx="50" cy="28" r="8" fill="#3B82F6" stroke="none" /><circle cx="68" cy="38" r="8" fill="#22C55E" stroke="none" /><circle cx="34" cy="62" r="7" fill="#EAB308" stroke="none" /><ellipse cx="64" cy="62" rx="6" ry="8" fill="white" stroke="#854D0E" stroke-width="2" /></svg>`
    },
    {
        id: 'sticker-film',
        name: '黑白胶片卷',
        category: 'stickers',
        svg: `<svg viewBox="0 0 110 70" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10" width="100" height="50" rx="3" fill="#1E293B" stroke="#0F172A" stroke-width="3" /><line x1="5" y1="20" x2="105" y2="20" stroke="white" stroke-width="2.5" /><line x1="5" y1="50" x2="105" y2="50" stroke="white" stroke-width="2.5" /><g fill="white"><rect x="10" y="13" width="5" height="4" /><rect x="25" y="13" width="5" height="4" /><rect x="40" y="13" width="5" height="4" /><rect x="55" y="13" width="5" height="4" /><rect x="70" y="13" width="5" height="4" /><rect x="85" y="13" width="5" height="4" /><rect x="10" y="53" width="5" height="4" /><rect x="25" y="53" width="5" height="4" /><rect x="40" y="53" width="5" height="4" /><rect x="55" y="53" width="5" height="4" /><rect x="70" y="53" width="5" height="4" /><rect x="85" y="53" width="5" height="4" /></g><line x1="38" y1="20" x2="38" y2="50" stroke="white" stroke-width="1.5" /><line x1="72" y1="20" x2="72" y2="50" stroke="white" stroke-width="1.5" /></svg>`
    },
    {
        id: 'sticker-calendar',
        name: '手撕小日历',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="15" y="15" width="70" height="70" rx="6" fill="#F8FAFC" stroke="#475569" stroke-width="4" /><path d="M15 21c0-3 3-6 6-6h58c3 0 6 3 6 6v14H15V21z" fill="#EF4444" stroke="#DC2626" stroke-width="2" /><circle cx="32" cy="25" r="3.5" fill="white" stroke="none" /><circle cx="68" cy="25" r="3.5" fill="white" stroke="none" /><path d="M32 10v10M68 10v10" stroke="#94A3B8" stroke-width="3" /><text x="50" y="72" text-anchor="middle" font-size="32" font-family="monospace" font-weight="black" fill="#1E293B" stroke="none">29</text></svg>`
    },
    {
        id: 'sticker-coffee',
        name: '暖心咖啡杯',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M25 35l10 44c1 4 4 6 7 6h16c3 0 6-2 7-6l10-44H25z" fill="#FEF3C7" stroke="#78350F" stroke-width="3.5" /><path d="M28 48l4 20h36l4-20H28z" fill="#D97706" stroke="none" /><rect x="20" y="27" width="60" height="8" rx="2" fill="#78350F" stroke="none" /><path d="M42 18s4-4 0-8M50 18s4-4 0-8M58 18s4-4 0-8" stroke="#78350F" stroke-width="2" stroke-linecap="round" /></svg>`
    },
    {
        id: 'sticker-croissant',
        name: '金黄牛角包',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 55c5-12 18-20 38-20s35 6 42 16c-8 3-20 7-30 7s-22-2-30-2c-10 0-15-4-20-1z" fill="#F59E0B" stroke="#B45309" stroke-width="3" /><path d="M28 39c4-4 10-4 13 .5M45 35c4-4 12-4 15 1M64 38c3-3.5 10-3 12 1.5" stroke="#B45309" stroke-width="2" /></svg>`
    },
    {
        id: 'sticker-cat',
        name: '橘猫懒洋洋',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M50 82c-20 0-36-12-36-30s12-24 28-24 38 12 38 30v10c0 8-4 14-10 14s-10-6-10-14V50c0-6-4-10-10-10s-10 4-10 10 4 10 10 10" fill="#FB923C" stroke="#C2410C" stroke-width="3.5" /><polygon points="42,28 35,16 31,27" fill="#C2410C" stroke="none" /><polygon points="56,28 63,16 67,27" fill="#C2410C" stroke="none" /><path d="M32 44c2 2 6 2 8 0M60 44c2 2 6 2 8 0" stroke="#7C2D12" stroke-width="2.5" /><path d="M78 55c5 2 12-2 10-8" stroke="#C2410C" stroke-width="2.5" /></svg>`
    },
    {
        id: 'sticker-dog',
        name: '手账小萌犬',
        category: 'stickers',
        svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M50 78c18 0 28-10 28-26V36L64 40c-6-5-14-5-28 0L22 36v16c0 16 10 26 28 26z" fill="#EDD5BE" stroke="#78350F" stroke-width="4" /><path d="M22 42c-5-2-12 2-10 12l10-4z" fill="#78350F" stroke="none" /><path d="M78 42c5-2 12 2 10 12l-10-4z" fill="#78350F" stroke="none" /><circle cx="38" cy="50" r="3.5" fill="#3F2305" stroke="none" /><circle cx="62" cy="50" r="3.5" fill="#3F2305" stroke="none" /><ellipse cx="50" cy="59" rx="5" ry="3.5" fill="#3F2305" stroke="none" /><path d="M47 64c0 3 2 6 3 6s3-3 3-6z" fill="#F87171" stroke="none" /></svg>`
    }
];

async function migrate() {
    console.log('⏳ 开始执行统一素材库（文件夹 + 素材 + 标签）迁移及数据灌注...');

    const connection = await mysql.createConnection({
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        ssl: config.mysql.ssl,
        multipleStatements: true
    });

    try {
        // 1. 读取并运行 DDL 语句创建各表
        const sqlPath = path.join(__dirname, '../../sql/migrations/add_unified_assets.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');

        console.log('👉 正在创建统一素材数据库表...');
        await connection.query(sql);
        console.log('✅ 各素材表创建成功');

        // 2. 判断是否已灌注过系统贴纸
        const [rows] = await connection.query(
            'SELECT COUNT(*) as count FROM materials WHERE scope = "system" AND material_type = "sticker"'
        ) as any[];
        
        if (rows[0].count > 0) {
            console.log('ℹ️ 系统贴纸数据已灌注过，跳过灌注。');
            return;
        }

        console.log('👉 正在初始化系统官方贴纸种子数据...');
        const createdAt = Date.now();

        // 批量拼装插入
        for (const s of STICKER_SEEDS) {
            const metadata = JSON.stringify({
                category: s.category,
                svg: s.svg
            });

            await connection.execute(
                `INSERT INTO materials (id, folder_id, name, material_type, scope, creator_id, file_url, cover_url, oss_key, file_size, metadata, created_at)
                 VALUES (?, NULL, ?, 'sticker', 'system', NULL, '', NULL, NULL, 0, ?, ?)`,
                [s.id, s.name, metadata, createdAt]
            );
        }

        console.log(`✅ 成功初始化并灌入 ${STICKER_SEEDS.length} 枚官方贴纸素材`);
    } catch (error) {
        console.error('❌ 统一素材库迁移及数据初始化失败:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

migrate();
