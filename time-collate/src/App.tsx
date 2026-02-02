import { useEffect, useState } from 'react';
import './App.css';
import { useBookStore } from './store';
import { ChapterList } from './components/ChapterList';
import { ChapterEditor } from './components/ChapterEditor';

function App() {
  const { currentBook, createBook, isLoading } = useBookStore();
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  useEffect(() => {
    // 自动加载或创建默认书籍
    const init = async () => {
      // 简单模拟：先尝试加载 ID 为 'demo-book' 的书
      // 如果没有，则创建
      // 注意：LocalBookService 是基于 LocalStorage 的，所以刷新后 demo-book 可能还在
      await createBook('My TimeCollate', 'Author Name');
      // 实际逻辑应该更复杂，这里为了 demo直接创建一个新的或加载
    };
    init();
  }, [createBook]);

  if (isLoading || !currentBook) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-400 animate-pulse">Loading TimeCollate...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-gray-900">
      <ChapterList
        activeChapterId={activeChapterId}
        onSelectChapter={setActiveChapterId}
      />
      <ChapterEditor
        chapterId={activeChapterId}
      />
    </div>
  );
}

export default App;
