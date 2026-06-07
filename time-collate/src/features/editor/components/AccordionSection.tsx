import React from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionSectionProps {
    /** 折叠面板标题 */
    title: string;
    /** 标题左侧图标 */
    icon?: React.ReactNode;
    /** 标题右侧徽标（如数量） */
    badge?: React.ReactNode;
    /** 是否展开 */
    isOpen: boolean;
    /** 切换展开/收起 */
    onToggle: () => void;
    children: React.ReactNode;
    className?: string;
}

/**
 * @description 可折叠手风琴面板组件
 * 用于右侧属性面板中各区块的折叠展开控制，统一消除嵌套滚动条
 */
export const AccordionSection: React.FC<AccordionSectionProps> = ({
    title,
    icon,
    badge,
    isOpen,
    onToggle,
    children,
    className = ''
}) => {
    return (
        <div className={`rounded-2xl border border-gray-100/80 bg-white/60 backdrop-blur-sm transition-all duration-300 ${
            isOpen ? 'shadow-sm' : ''
        } ${className}`}>
            {/* 折叠触发器头部 */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-50/50 transition-colors group rounded-2xl"
            >
                <div className="flex items-center gap-2">
                    {icon && <span className="text-indigo-500/70 transition-colors group-hover:text-indigo-600">{icon}</span>}
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider group-hover:text-gray-700 transition-colors">
                        {title}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {badge}
                    <ChevronDown
                        size={13}
                        className={`text-gray-400 transition-transform duration-300 ${isOpen ? '' : '-rotate-90'}`}
                    />
                </div>
            </button>

            {/* 内容区（动画展开/收起） */}
            <div
                className="grid transition-all duration-300 ease-in-out"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
            >
                <div className="overflow-hidden">
                    <div className="px-3.5 pb-3.5 pt-0.5">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};
