import type { Book } from '../../types';

export interface PrefaceTemplate {
    id: string;
    name: string;
    category: 'growth' | 'travel' | 'daily' | 'anniversary';
    content: string;
}

export const PREFACE_TEMPLATES: PrefaceTemplate[] = [
    {
        id: 'growth',
        name: '成长与时光',
        category: 'growth',
        content: '岁月如歌，唱叙着关于成长的故事。\n在这本《{title}》里，记录着 {author} 一路走来的点点滴滴。\n每一次笑颜，每一段攀登，都在时光的刻度里，凝结成最耀眼的琥珀。\n愿我们在未来的旅途中，依然步履不停，心怀赤诚。'
    },
    {
        id: 'travel',
        name: '旅行与远方',
        category: 'travel',
        content: '风从远方吹来，带着山野与海洋的气息。\n在《{title}》的每一页，都镌刻着 {author} 探寻世界的足迹。\n我们翻山越岭，我们步履不停，在世界的坐标里与未知的自己相遇。\n因为最美的风景，永远在出发的路上。'
    },
    {
        id: 'daily',
        name: '日常与美好',
        category: 'daily',
        content: '最珍贵的故事，往往藏在平凡的柴米油盐与碎碎念里。\n《{title}》是 {author} 对日常生活的温柔记录。\n那些微风轻拂的午后，那些欢声笑语的瞬间，\n都在这里汇聚成诗，温暖着每一个往后的日子。'
    },
    {
        id: 'anniversary',
        name: '爱情与纪念',
        category: 'anniversary',
        content: '从相识那一刻起，平凡的日子便有了诗意。\n这本《{title}》是 {author} 关于爱与陪伴的珍贵手记。\n我们在岁月的长河里并肩同行，留下温暖而笃定的印记。\n执子之手，岁岁年年，便是人间最美的时光。'
    }
];

export const DEFAULT_PREFACE_FALLBACK = '有些瞬间转瞬即逝，有些记忆历久弥新。\n在《{title}》的篇章里，{author} 用镜头和文字记录岁月的轨迹。\n翻开此页，愿温暖的回忆常伴左右。';

/**
 * 编译替换金句模板中的占位符
 */
export function compilePrefaceText(templateContent: string, book?: Book | null): string {
    if (!book) return templateContent;
    
    const title = book.title || '拾光画册';
    const author = book.author || '拾光创作者';
    const year = book.createdAt ? new Date(book.createdAt).getFullYear().toString() : new Date().getFullYear().toString();
    const date = book.createdAt ? new Date(book.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

    return templateContent
        .replace(/{title}/g, title)
        .replace(/{author}/g, author)
        .replace(/{year}/g, year)
        .replace(/{date}/g, date);
}
