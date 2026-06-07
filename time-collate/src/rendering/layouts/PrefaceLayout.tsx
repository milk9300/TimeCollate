import React from 'react';
import type { Book } from '../../types';
import { EditableText } from '../components/EditableText';
import { compilePrefaceText, DEFAULT_PREFACE_FALLBACK } from '../constants/prefaceTemplates';

interface PrefaceLayoutProps {
    book?: Book;
    content?: string;
    readOnly?: boolean;
}

/**
 * @description 书籍序言/引言布局 (WYSIWYG 支持)
 */
export const PrefaceLayout: React.FC<PrefaceLayoutProps> = ({ book, content = '', readOnly = false }) => {
    const prefaceValue = book ? book.preface || '' : content;
    
    // 只读且无内容时，使用优雅的金句兜底
    const finalValue = readOnly && !prefaceValue && book
        ? compilePrefaceText(DEFAULT_PREFACE_FALLBACK, book)
        : prefaceValue;

    return (
        <div className="w-full h-full p-[25mm] relative overflow-hidden bg-[var(--theme-bg)] flex flex-col items-center select-none">
            {/* 装饰水印 */}
            <div className="absolute top-[10%] opacity-[0.03] select-none pointer-events-none">
                <span className="text-[120pt] font-black italic tracking-widest uppercase">Preface</span>
            </div>

            <div className="relative z-10 w-full max-w-[85%] mt-[20%] flex flex-col items-center text-center">
                {/* 装饰图标 */}
                <div className="w-10 h-10 mb-12 opacity-20 animate-pulse" style={{ color: 'var(--theme-accent)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 21l-8-18h16l-8 18z" strokeLinejoin="round" />
                    </svg>
                </div>

                <h2
                    className="text-[20pt] font-bold mb-16 tracking-[0.4em] uppercase"
                    style={{ color: 'var(--theme-primary)' }}
                >
                    序言 · Preface
                </h2>

                <div className="relative w-full">
                    {/* 引用装饰 */}
                    <span className="absolute -top-12 -left-8 text-[60pt] opacity-10 font-serif" style={{ color: 'var(--theme-accent)' }}>“</span>

                    {book ? (
                        <EditableText
                            value={finalValue}
                            type="book-preface"
                            className="text-[12pt] leading-[2.2] italic"
                            style={{
                                color: 'var(--theme-secondary)',
                                fontFamily: 'var(--theme-font)'
                            }}
                            placeholder="双击这里撰写整本书籍的序言/引言，开启拾光篇章..."
                            readOnly={readOnly}
                        />
                    ) : (
                        <p
                            className="text-[12pt] leading-[2.2] whitespace-pre-wrap italic"
                            style={{
                                color: 'var(--theme-secondary)',
                                fontFamily: 'var(--theme-font)'
                            }}
                        >
                            {prefaceValue || "拾光之集，记录岁月的点滴。每一张照片，每一段文字，都是时间流逝留下的痕迹。"}
                        </p>
                    )}

                    <span className="absolute -bottom-16 -right-8 text-[60pt] opacity-10 font-serif" style={{ color: 'var(--theme-accent)' }}>”</span>
                </div>

                <div className="mt-24 w-16 h-px bg-gray-200" />
            </div>

            {/* 纸张边缘装饰 */}
            <div className="absolute bottom-12 inset-x-12 h-px scale-x-50 opacity-10" style={{ backgroundColor: 'var(--theme-accent)' }} />
        </div>
    );
};
