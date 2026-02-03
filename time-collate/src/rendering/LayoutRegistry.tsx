import type { Chapter, Page } from '../types';
import { FullLayout } from './layouts/FullLayout';
import { GridLayout } from './layouts/GridLayout';
import { CollageLayout } from './layouts/CollageLayout';
import { CoverLayout } from './layouts/CoverLayout';
import { MagazineLayout } from './layouts/MagazineLayout';
import { JournalLayout } from './layouts/JournalLayout';

interface LayoutProps {
    chapter: Chapter;
    page: Page;
}

type LayoutType = Page['layout'];

const REGISTRY: Record<LayoutType, React.FC<LayoutProps>> = {
    single: FullLayout,
    grid: GridLayout,
    collage: CollageLayout,
    cover: CoverLayout,
    magazine: MagazineLayout,
    journal: JournalLayout,
};

export const LayoutRegistry = {
    getRenderer: (layout: LayoutType) => {
        return REGISTRY[layout] || FullLayout;
    }
};
