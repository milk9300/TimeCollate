import { useState, type ReactNode } from 'react';
import { Loader2, ChevronDown, Inbox } from 'lucide-react';

// #region 类型定义
/**
 * 表格列配置
 * @template T - 行数据类型
 */
export interface AdminTableColumn<T> {
    /** 列唯一标识 */
    key: string;
    /** 表头文案 */
    title: string;
    /** 列宽 CSS 值，如 '120px'、'20%' 等 */
    width?: string;
    /** 文本对齐方式 */
    align?: 'left' | 'center' | 'right';
    /** 自定义单元格渲染 */
    render: (item: T, index: number) => ReactNode;
}

/**
 * AdminTable 组件属性
 * @template T - 行数据类型
 */
export interface AdminTableProps<T> {
    /** 列配置数组 */
    columns: AdminTableColumn<T>[];
    /** 数据源 */
    data: T[];
    /** 行唯一键提取函数 */
    rowKey: (item: T) => string;
    /** 是否正在加载首屏数据 */
    isLoading?: boolean;
    /** 骨架屏行数（加载态） */
    skeletonRows?: number;
    /** 空数据提示文案 */
    emptyText?: string;
    /** 空数据图标 */
    emptyIcon?: ReactNode;
    /** 是否还有更多数据可以加载 */
    hasMore?: boolean;
    /** 是否正在加载更多 */
    loadingMore?: boolean;
    /** 加载更多回调 */
    onLoadMore?: () => void;
    /** 加载更多按钮文案 */
    loadMoreText?: string;
    /** 可展开行渲染（返回 null 或 undefined 表示该行不可展开） */
    expandedRowRender?: (item: T) => ReactNode;
    /** 动态行样式 */
    rowClassName?: (item: T) => string;
}
// #endregion

// #region 骨架屏行组件
/** 单行骨架屏加载占位 */
function SkeletonRow({ columnCount }: { columnCount: number }) {
    return (
        <tr className="animate-pulse">
            {Array.from({ length: columnCount }).map((_, i) => (
                <td key={i} className="px-6 py-5">
                    <div className="flex items-center gap-3">
                        {/* 首列模拟头像 + 文字，其余列模拟单行文本 */}
                        {i === 0 ? (
                            <>
                                <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3.5 bg-slate-100 rounded-full w-24" />
                                    <div className="h-2.5 bg-slate-50 rounded-full w-16" />
                                </div>
                            </>
                        ) : (
                            <div className="h-3.5 bg-slate-100 rounded-full w-20" />
                        )}
                    </div>
                </td>
            ))}
        </tr>
    );
}
// #endregion

// #region 空状态组件
/** 空数据占位 */
function EmptyState({ columnCount, text, icon }: { columnCount: number; text: string; icon?: ReactNode }) {
    return (
        <tr>
            <td colSpan={columnCount} className="px-6 py-24">
                <div className="flex flex-col items-center justify-center gap-4 select-none">
                    <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-slate-200">
                        {icon || <Inbox size={32} />}
                    </div>
                    <p className="text-sm font-bold text-slate-300 tracking-wide">{text}</p>
                </div>
            </td>
        </tr>
    );
}
// #endregion

// #region AdminTable 主组件
/**
 * 管理后台统一表格组件
 * 内置骨架屏加载态、空数据占位、Load More 分页、可展开行
 */
export function AdminTable<T>({
    columns,
    data,
    rowKey,
    isLoading = false,
    skeletonRows = 5,
    emptyText = '暂无数据',
    emptyIcon,
    hasMore = false,
    loadingMore = false,
    onLoadMore,
    loadMoreText = '加载更多',
    expandedRowRender,
    rowClassName,
}: AdminTableProps<T>) {
    // 可展开行状态管理
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

    const toggleExpand = (key: string) => {
        setExpandedKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    /** 表头对齐样式映射 */
    const alignClass = (align?: 'left' | 'center' | 'right') => {
        if (align === 'center') return 'text-center';
        if (align === 'right') return 'text-right';
        return 'text-left';
    };

    return (
        <div className="flex flex-col gap-6">
            {/* 表格容器 */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[28px] border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        {/* 表头 */}
                        <thead>
                            <tr className="bg-slate-50/60">
                                {/* 展开列占位 */}
                                {expandedRowRender && (
                                    <th className="w-12 px-2 py-4" />
                                )}
                                {columns.map(col => (
                                    <th
                                        key={col.key}
                                        className={`px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.12em] ${alignClass(col.align)}`}
                                        style={col.width ? { width: col.width } : undefined}
                                    >
                                        {col.title}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        {/* 表体 */}
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                // 骨架屏加载态
                                Array.from({ length: skeletonRows }).map((_, i) => (
                                    <SkeletonRow
                                        key={`skeleton-${i}`}
                                        columnCount={columns.length + (expandedRowRender ? 1 : 0)}
                                    />
                                ))
                            ) : data.length === 0 ? (
                                // 空数据占位
                                <EmptyState
                                    columnCount={columns.length + (expandedRowRender ? 1 : 0)}
                                    text={emptyText}
                                    icon={emptyIcon}
                                />
                            ) : (
                                // 数据行
                                data.map((item, index) => {
                                    const key = rowKey(item);
                                    const isExpanded = expandedKeys.has(key);
                                    const expandContent = expandedRowRender?.(item);
                                    const canExpand = !!expandContent;

                                    return (
                                        <TableRow
                                            key={key}
                                            item={item}
                                            index={index}
                                            columns={columns}
                                            isExpanded={isExpanded}
                                            canExpand={canExpand}
                                            expandContent={expandContent}
                                            expandedRowRender={expandedRowRender}
                                            toggleExpand={() => toggleExpand(key)}
                                            rowClassName={rowClassName}
                                            alignClass={alignClass}
                                        />
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Load More 分页按钮 */}
            {hasMore && onLoadMore && (
                <div className="flex justify-center">
                    <button
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        className="group flex items-center gap-2.5 px-8 py-3 bg-white/80 backdrop-blur-sm border border-slate-200/80 text-slate-500 rounded-2xl font-bold text-sm 
                                   hover:bg-slate-900 hover:text-white hover:border-slate-900 hover:shadow-xl hover:shadow-slate-200/50 
                                   transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                        {loadingMore ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>加载中...</span>
                            </>
                        ) : (
                            <span>{loadMoreText}</span>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
// #endregion

// #region 表格行子组件
/** 单行渲染（含展开支持） */
function TableRow<T>({
    item,
    index,
    columns,
    isExpanded,
    canExpand,
    expandContent,
    expandedRowRender,
    toggleExpand,
    rowClassName,
    alignClass,
}: {
    item: T;
    index: number;
    columns: AdminTableColumn<T>[];
    isExpanded: boolean;
    canExpand: boolean;
    expandContent: ReactNode;
    expandedRowRender?: (item: T) => ReactNode;
    toggleExpand: () => void;
    rowClassName?: (item: T) => string;
    alignClass: (align?: 'left' | 'center' | 'right') => string;
}) {
    const extraClass = rowClassName?.(item) || '';

    return (
        <>
            <tr
                className={`group hover:bg-slate-50/50 transition-colors duration-200 ${extraClass} ${canExpand ? 'cursor-pointer' : ''}`}
                onClick={canExpand ? toggleExpand : undefined}
            >
                {/* 展开/收起箭头 */}
                {expandedRowRender && (
                    <td className="w-12 px-2 py-4 text-center">
                        {canExpand && (
                            <div className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-300 
                                            ${isExpanded ? 'bg-indigo-50 text-indigo-500 rotate-0' : 'bg-slate-50 text-slate-300 -rotate-90'}
                                            group-hover:bg-indigo-50 group-hover:text-indigo-500`}
                            >
                                <ChevronDown size={14} strokeWidth={2.5} />
                            </div>
                        )}
                    </td>
                )}

                {/* 数据列 */}
                {columns.map(col => (
                    <td
                        key={col.key}
                        className={`px-6 py-4 ${alignClass(col.align)}`}
                        style={col.width ? { width: col.width } : undefined}
                    >
                        {col.render(item, index)}
                    </td>
                ))}
            </tr>

            {/* 展开行内容 */}
            {isExpanded && canExpand && (
                <tr className="bg-slate-50/30">
                    <td
                        colSpan={columns.length + 1}
                        className="px-6 py-5 animate-in slide-in-from-top-2 fade-in duration-300"
                    >
                        {expandContent}
                    </td>
                </tr>
            )}
        </>
    );
}
// #endregion
