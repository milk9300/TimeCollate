import { useBookStore } from '../../../store';
import { Loader2, CheckCircle2, XCircle, UploadCloud } from 'lucide-react';

/**
 * @description 毛玻璃悬浮直传进度看板
 * 挂载于编辑器右下角，通过订阅 uploadingJobs 自动展现/淡出上传进度
 */
export function UploadProgressBar() {
    const uploadingJobs = useBookStore(state => state.uploadingJobs);
    const clearUploadJob = useBookStore(state => state.clearUploadJob);

    const jobs = Object.entries(uploadingJobs);
    if (jobs.length === 0) return null;

    return (
        <div 
            id="global-upload-progressBar"
            className="fixed bottom-6 right-6 z-50 w-80 max-h-72 overflow-y-auto flex flex-col gap-3 p-4 bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] transition-all duration-300"
        >
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100/50">
                <UploadCloud size={16} className="text-indigo-600 animate-bounce" />
                <span className="text-xs font-bold text-gray-700">素材直传管理</span>
                <span className="ml-auto text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">
                    {jobs.length} 个任务
                </span>
            </div>

            <div className="flex flex-col gap-3">
                {jobs.map(([id, job]) => {
                    const isUploading = job.status === 'uploading';
                    const isSuccess = job.status === 'success';
                    const isError = job.status === 'error';

                    return (
                        <div key={id} className="group space-y-1.5 text-xs">
                            <div className="flex items-center justify-between gap-2">
                                <span 
                                    className="font-medium text-gray-600 truncate max-w-[180px]" 
                                    title={job.name}
                                >
                                    {job.name}
                                </span>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {isUploading && (
                                        <>
                                            <Loader2 size={12} className="text-indigo-600 animate-spin" />
                                            <span className="text-[10px] font-bold text-indigo-600">{job.progress}%</span>
                                        </>
                                    )}
                                    {isSuccess && (
                                        <>
                                            <CheckCircle2 size={13} className="text-emerald-500" />
                                            <span className="text-[10px] font-bold text-emerald-500">已完成</span>
                                        </>
                                    )}
                                    {isError && (
                                        <div className="flex items-center gap-1">
                                            <XCircle size={13} className="text-rose-500" />
                                            <span className="text-[10px] font-bold text-rose-500">上传失败</span>
                                            <button 
                                                onClick={() => clearUploadJob(id)}
                                                className="text-[9px] text-gray-400 hover:text-gray-600 underline ml-1 cursor-pointer"
                                            >
                                                清除
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 进度条轨道 */}
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-200 rounded-full ${
                                        isError 
                                            ? 'bg-rose-500' 
                                            : isSuccess 
                                                ? 'bg-emerald-500' 
                                                : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                    }`}
                                    style={{ width: `${job.progress}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
