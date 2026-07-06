// src/mockData.ts
import type { Book } from './types';
import { v4 as uuidv4 } from 'uuid';

const bookId = uuidv4();

export const initialBook: Book = {
  id: bookId,
  userId: 'mock-user-id',
  title: "我们的2023",
  author: "时光记录者",
  createdAt: Date.now(),
  pageSize: 'A4',
  pages: [
    {
      id: uuidv4(),
      bookId,
      pageTitle: "出发去海边",
      isChapterStart: true,
      content: "这是一个阳光明媚的早晨，我们收拾好行囊，向着大海出发。风很轻，云很淡。",
      templateId: 'grid',
      photos: [
        { id: uuidv4(), url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=60', caption: '海边初见' },
        { id: uuidv4(), url: 'https://images.unsplash.com/photo-1519074002996-a69e7ac46a42?w=600&auto=format&fit=crop&q=60', caption: '你的笑脸' }
      ],
      sortOrder: 0
    },
    {
      id: uuidv4(),
      bookId,
      pageTitle: "山顶的日落",
      isChapterStart: true,
      content: "爬了三个小时的山，终于赶上了这场壮丽的日落。",
      templateId: 'single',
      photos: [
        { id: uuidv4(), url: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=600&auto=format&fit=crop&q=60', caption: '绝美日落' }
      ],
      sortOrder: 1
    }
  ]
};