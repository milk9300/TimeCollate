// src/mockData.ts
import type { Book } from './types';
import { v4 as uuidv4 } from 'uuid';

export const initialBook: Book = {
  id: uuidv4(),
  title: "我们的2023",
  author: "时光记录者",
  createdArt: Date.now(),
  theme: 'modern',
  chapters: [
    {
      id: uuidv4(),
      title: "出发去海边",
      date: "2023-05-20",
      content: "这是一个阳光明媚的早晨，我们收拾好行囊，向着大海出发。风很轻，云很淡。",
      layout: 'grid',
      photos: [
        { id: uuidv4(), url: 'https://via.placeholder.com/300?text=Sea', caption: '海边初见' },
        { id: uuidv4(), url: 'https://via.placeholder.com/300?text=Smile', caption: '你的笑脸' }
      ]
    },
    {
      id: uuidv4(),
      title: "山顶的日落",
      date: "2023-08-15",
      content: "爬了三个小时的山，终于赶上了这场壮丽的日落。",
      layout: 'single',
      photos: [
        { id: uuidv4(), url: 'https://via.placeholder.com/600?text=Sunset', caption: '绝美日落' }
      ]
    }
  ]
};