import { useState, useEffect, useRef } from 'react';
import { DownloadCloud, Loader2, CheckCircle2, XCircle, Clock, ExternalLink, FileText, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';

interface ExportTask {
    id: string;
    book_id: string;
    book_title: string;
    format: 'pdf' | 'markdown' | 'video';
    status: 'waiting' | 'active' | 'completed' | 'failed';
    progress: number;
    download_url: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
}

export function ExportTasksDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [tasks, setTasks] = useState<ExportTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 计算是否有正在运行（排队或活动）的任务
    const activeTasksCount = tasks.filter(t => t.status === 'waiting' || t.status === 'active').length;
    const hasActiveTasks = activeTasksCount > 0;

    // 拉取任务列表
    const fetchTasks = async (showSilently = false) => {
        if (!showSilently) setIsLoading(true);
        const token = useAuthStore.getState().token;
        try {
            const response = await fetch('/api/export/tasks', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setTasks(data.tasks);
                }
            }
        } catch (error) {
            console.error('Fetch export tasks failed:', error);
        } finally {
            if (!showSilently) setIsLoading(false);
        }
    };

    // 首次加载与根据活动任务状态轮询
    useEffect(() => {
        fetchTasks();
    }, []);

    useEffect(() => {
        let intervalId: any;
        if (hasActiveTasks) {
            // 如果有运行中的任务，每 3 秒自动静默刷新一次
            intervalId = setInterval(() => {
                fetchTasks(true);
            }, 3000);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [hasActiveTasks]);

    // 点击外部关闭下拉窗
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 切换打开状态时刷新一次
    const handleToggle = () => {
        if (!isOpen) {
            fetchTasks();
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* 触发图标按钮 */}
            <button
                onClick={handleToggle}
                className="relative w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all cursor-pointer"
                title="导出任务中心"
            >
                <DownloadCloud size={18} className={hasActiveTasks ? 'animate-bounce text-indigo-600' : ''} />
                {activeTasksCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white">
                        {activeTasksCount}
                    </span>
                )}
            </button>

            {/* 下拉面板 */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-[380px] bg-white/95 backdrop-blur-xl border border-gray-100/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] p-4 z-[100] animate-in fade-in slide-in-from-top-4 duration-200">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-50 mb-3">
                        <div className="flex items-center gap-2">
                            <FileText size={16} className="text-gray-400" />
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">导出任务历史</h4>
                        </div>
                        <button
                            onClick={() => fetchTasks()}
                            disabled={isLoading}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                        >
                            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                            刷新
                        </button>
                    </div>

                    <div className="max-h-[280px] overflow-y-auto pr-1 flex flex-col gap-2 custom-scrollbar">
                        {isLoading && tasks.length === 0 ? (
                            <div className="py-8 flex flex-col items-center justify-center text-gray-400 text-xs font-medium gap-2">
                                <Loader2 className="animate-spin text-gray-400" size={18} />
                                正在加载任务列表...
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="py-8 flex flex-col items-center justify-center text-gray-400 text-xs font-medium gap-1">
                                <DownloadCloud size={24} className="text-gray-300 mb-1" />
                                暂无导出任务历史
                                <span className="text-[10px] text-gray-300">您可以在书籍管理菜单或编辑器中导出作品</span>
                            </div>
                        ) : (
                            tasks.map((task) => {
                                const isRunning = task.status === 'waiting' || task.status === 'active';
                                const formatLabel = task.format === 'pdf' ? 'PDF' : task.format === 'markdown' ? 'HTML' : '视频';

                                return (
                                    <div
                                        key={task.id}
                                        className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between gap-3 hover:bg-gray-100/50 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                                    task.format === 'pdf' 
                                                        ? 'bg-red-50 text-red-600 border border-red-100' 
                                                        : task.format === 'markdown'
                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                        : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                }`}>
                                                    {formatLabel}
                                                </span>
                                                <h5 className="text-xs font-bold text-gray-800 truncate" title={task.book_title}>
                                                    {task.book_title}
                                                </h5>
                                            </div>

                                            {/* 进度/状态描述 */}
                                            {task.status === 'waiting' && (
                                                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                                    <Clock size={11} className="animate-pulse" />
                                                    正在排队等待处理...
                                                </div>
                                            )}

                                            {task.status === 'active' && (
                                                <div className="w-full">
                                                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold mb-1">
                                                        <span>正在生成 ({task.progress}%)</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200/60 rounded-full h-1 overflow-hidden">
                                                        <div
                                                            className="bg-indigo-600 h-1 rounded-full transition-all duration-300"
                                                            style={{ width: `${task.progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {task.status === 'completed' && (
                                                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                                                    <CheckCircle2 size={11} />
                                                    导出成功
                                                </div>
                                            )}

                                            {task.status === 'failed' && (
                                                <div 
                                                    className="flex items-center gap-1 text-[10px] text-red-500 font-bold truncate cursor-help"
                                                    title={task.error_message || '未知错误'}
                                                >
                                                    <XCircle size={11} />
                                                    生成失败: {task.error_message || '未知错误'}
                                                </div>
                                            )}
                                        </div>

                                        {/* 操作按钮 */}
                                        <div>
                                            {task.status === 'completed' && task.download_url ? (
                                                <a
                                                    href={task.download_url}
                                                    download
                                                    className="flex items-center gap-1 py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition-all"
                                                >
                                                    <ExternalLink size={10} />
                                                    下载
                                                </a>
                                            ) : isRunning ? (
                                                <Loader2 size={14} className="animate-spin text-indigo-600" />
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
