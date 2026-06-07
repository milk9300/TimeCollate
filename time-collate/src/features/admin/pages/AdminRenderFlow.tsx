import { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Cpu, Play, Pause, RefreshCw, Layers, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAdminStore } from '../../../store/useAdminStore';

interface RenderTask {
    id: string;
    bookTitle: string;
    format: 'pdf' | 'markdown' | 'video';
    progress: number;
    status: 'waiting' | 'rendering' | 'completed' | 'failed';
    duration: number;
    requestTime: string;
}

export function AdminRenderFlow() {
    const { blockedRenderTasks, setBlockedRenderTasks } = useAdminStore();
    const [isPaused, setIsPaused] = useState(false);
    const [workersCount, setWorkersCount] = useState(3);
    const [tasks, setTasks] = useState<RenderTask[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 生成模拟任务数据
    const generateTasks = (blockedCount: number): RenderTask[] => {
        const baseTasks: RenderTask[] = [
            { id: 'task-1', bookTitle: '拾光三周年纪实', format: 'pdf', progress: 100, status: 'completed', duration: 18, requestTime: '12:05:10' },
            { id: 'task-2', bookTitle: '我的宝宝成长日记', format: 'pdf', progress: 100, status: 'completed', duration: 25, requestTime: '12:06:05' },
            { id: 'task-3', bookTitle: '夏日毕业歌单相册', format: 'video', progress: 75, status: 'rendering', duration: 42, requestTime: '12:08:22' },
        ];

        // 插入被阻塞的失败任务
        for (let i = 0; i < blockedCount; i++) {
            baseTasks.push({
                id: `blocked-task-${i}`,
                bookTitle: `阻塞作品《测试集锦_${i + 1}》`,
                format: 'pdf',
                progress: 0,
                status: 'failed',
                duration: 0,
                requestTime: '11:45:00'
            });
        }

        return baseTasks;
    };

    useEffect(() => {
        setTasks(generateTasks(blockedRenderTasks));
    }, [blockedRenderTasks]);

    // 手动重试所有失败任务
    const handleRetryAll = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setBlockedRenderTasks(0); // 清除 store 中的阻塞任务计数
            setTasks(prev => prev.map(t => t.status === 'failed' ? { ...t, status: 'completed', progress: 100, duration: 12 } : t));
            setIsRefreshing(false);
        }, 1500);
    };

    // 模拟添加堆积任务，便于演示琥珀色呼吸灯
    const handleAddBlockedTask = () => {
        setBlockedRenderTasks(blockedRenderTasks + 1);
    };

    return (
        <AdminLayout title="PDF 渲染引擎流">
            <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
                {/* 页面头部 */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-3">
                            PDF 渲染及导出引擎流
                            {blockedRenderTasks > 0 && (
                                <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping"></span>
                            )}
                        </h2>
                        <p className="text-slate-500 font-medium">查看并维护高负载排版及 PDF 编译任务流，手动解决卡堵积压。</p>
                    </div>

                    {/* 工具条 */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleAddBlockedTask}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                        >
                            + 模拟生成阻塞任务
                        </button>
                        <button
                            onClick={() => setIsPaused(!isPaused)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                                isPaused 
                                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md' 
                                    : 'bg-indigo-50 text-indigo-650 hover:bg-indigo-150'
                            }`}
                        >
                            {isPaused ? <Play size={14} /> : <Pause size={14} />}
                            <span>{isPaused ? '恢复渲染队列' : '暂停渲染队列'}</span>
                        </button>
                    </div>
                </div>

                {/* 核心指标统计卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                            <Cpu size={24} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">队列状态</span>
                            <span className="text-lg font-black text-slate-800">{isPaused ? '已暂停 (PAUSED)' : '运行中 (ACTIVE)'}</span>
                        </div>
                    </div>

                    <div className={`bg-white p-6 rounded-[28px] border shadow-sm flex items-center gap-4 transition-colors ${
                        blockedRenderTasks > 0 ? 'border-amber-100 bg-amber-500/5' : 'border-slate-100'
                    }`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            blockedRenderTasks > 0 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">异常阻塞任务</span>
                            <span className="text-lg font-black text-slate-800">{blockedRenderTasks} 个任务等待处理</span>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <Layers size={24} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">并发 Worker 限制</span>
                            <div className="flex items-center gap-3 mt-1">
                                <button 
                                    onClick={() => setWorkersCount(Math.max(1, workersCount - 1))}
                                    className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center font-bold text-sm cursor-pointer"
                                >
                                    -
                                </button>
                                <span className="text-base font-black text-slate-800">{workersCount} 进程</span>
                                <button 
                                    onClick={() => setWorkersCount(Math.min(6, workersCount + 1))}
                                    className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center font-bold text-sm cursor-pointer"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 阻塞警告栏 */}
                {blockedRenderTasks > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
                        <div className="flex gap-3 items-start">
                            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                            <div>
                                <h4 className="text-sm font-black">检测到 PDF 渲染队列出现任务超时阻塞</h4>
                                <p className="text-xs text-amber-700/80 font-bold mt-1">
                                    有 {blockedRenderTasks} 个生成任务因节点拉取大图超时失败。点击右侧按钮重置并重新分发任务。
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleExecuteRetryAll}
                            disabled={isRefreshing}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-md shadow-amber-500/20 active:scale-95 transition-all self-start sm:self-center shrink-0 cursor-pointer disabled:opacity-50"
                        >
                            {isRefreshing ? '重试分发中...' : '一键恢复并自动重试'}
                        </button>
                    </div>
                )}

                {/* 渲染任务列表 */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-6">
                    <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                        <span>队列任务明细 (Recent Tasks)</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">{tasks.length}</span>
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="py-4 px-2">导出作品</th>
                                    <th className="py-4 px-2">导出类型</th>
                                    <th className="py-4 px-2">编译进度</th>
                                    <th className="py-4 px-2">编译状态</th>
                                    <th className="py-4 px-2">耗时 (S)</th>
                                    <th className="py-4 px-2 text-right">时间</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-655">
                                {tasks.map((task) => (
                                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-2 text-slate-800 font-black">{task.bookTitle}</td>
                                        <td className="py-4 px-2">
                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-black uppercase text-[10px]">
                                                {task.format}
                                            </span>
                                        </td>
                                        <td className="py-4 px-2 w-48">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${
                                                            task.status === 'failed' ? 'bg-red-500' :
                                                            task.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'
                                                        }`}
                                                        style={{ width: `${task.progress}%` }}
                                                    ></div>
                                                </div>
                                                <span>{task.progress}%</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-2">
                                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase ${
                                                task.status === 'completed' ? 'text-emerald-500' :
                                                task.status === 'rendering' ? 'text-indigo-500 animate-pulse' :
                                                task.status === 'failed' ? 'text-red-500' : 'text-slate-400'
                                            }`}>
                                                {task.status === 'completed' && <CheckCircle size={12} />}
                                                {task.status === 'rendering' && <Cpu size={12} className="animate-spin" />}
                                                {task.status === 'failed' && <AlertCircle size={12} />}
                                                {task.status === 'waiting' && <Clock size={12} />}
                                                {task.status === 'completed' && '已完成'}
                                                {task.status === 'rendering' && '渲染中'}
                                                {task.status === 'failed' && '编译失败'}
                                                {task.status === 'waiting' && '等待排队'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-2 font-mono">{task.duration > 0 ? `${task.duration}s` : '--'}</td>
                                        <td className="py-4 px-2 text-right text-slate-400 font-mono">{task.requestTime}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );

    function handleExecuteRetryAll() {
        handleRetryAll();
    }
}
