import React, { useEffect, useState, useRef } from 'react';
import { Loader2, CheckCircle2, XCircle, Clock, Download } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';

interface ExportProgressModalProps {
    jobId: string | null;
    onClose: () => void;
    title?: string;
}

export const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
    jobId,
    onClose,
    title = '正在准备导出交付物'
}) => {
    const [status, setStatus] = useState<'waiting' | 'active' | 'completed' | 'failed' | 'idle'>('idle');
    const [progress, setProgress] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const hasTriggeredDownload = useRef(false);

    useEffect(() => {
        if (!jobId) return;

        setStatus('waiting');
        setProgress(0);
        setError(null);
        setDownloadUrl(null);
        hasTriggeredDownload.current = false;

        let intervalId: any;

        const checkStatus = async () => {
            const token = useAuthStore.getState().token;
            try {
                const response = await fetch(`/api/export/status/${jobId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                if (data.success) {
                    const { status: jobStatus, progress: jobProgress, downloadUrl: url, error: jobError } = data;
                    
                    setStatus(jobStatus);
                    setProgress(jobProgress || 0);

                    if (jobStatus === 'completed') {
                        setDownloadUrl(url);
                        clearInterval(intervalId);

                        // 自动触发文件下载且仅触发一次
                        if (url && !hasTriggeredDownload.current) {
                            hasTriggeredDownload.current = true;
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', '');
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }
                    } else if (jobStatus === 'failed') {
                        setError(jobError || '导出过程中遇到未知错误，请重试');
                        clearInterval(intervalId);
                    }
                }
            } catch (err) {
                console.error('[ExportProgressModal] Status check failed:', err);
            }
        };

        // 每隔 1.5s 轮询一次状态
        intervalId = setInterval(checkStatus, 1500);
        checkStatus();

        return () => {
            clearInterval(intervalId);
        };
    }, [jobId]);

    if (!jobId) return null;

    const isVideo = title.includes('视频') || title.toLowerCase().includes('video');

    // 根据轮询状态动态匹配视觉组件
    let statusText = '准备中...';
    let subText = '正在建立与导出引擎的连接...';
    let icon = <Loader2 className="w-10 h-10 text-stone-500 animate-spin" />;

    if (status === 'waiting') {
        statusText = '排队中，请稍候...';
        subText = '当前服务器导出引擎正忙，您的导出任务已安全进入待处理队列。';
        icon = <Clock className="w-10 h-10 text-stone-500 animate-pulse" />;
    } else if (status === 'active') {
        statusText = isVideo ? `正在录制视频 (${progress}%)` : `正在渲染页面 (${progress}%)`;
        if (isVideo) {
            subText = progress < 30
                ? '正在云渲染集群中启动 Puppeteer 浏览器...'
                : progress < 80
                ? '正在模拟确定性时钟并进行 3D 逐帧翻页截屏渲染...'
                : '画面录制完成，正在通过 FFmpeg 合成高保真 MP4 视频...';
        } else {
            subText = progress < 50 
                ? '正在通过 Playwright 引擎启动无头浏览器并加载书籍排版...' 
                : progress < 90 
                ? '正在生成高保真 PDF 页面或压缩素材包...'
                : '排版生成完毕，正在上传至云存储服务器...';
        }
        icon = (
            <div className="relative flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-stone-700 animate-spin" />
                <span className="absolute text-[10px] font-bold text-stone-800">{progress}%</span>
            </div>
        );
    } else if (status === 'completed') {
        statusText = '导出生成成功！';
        subText = isVideo
            ? '您的 3D 翻页视频已渲染合成完毕，已自动开始下载。若下载未启动，请点击下方按钮。'
            : '您的书籍文件已就绪，已自动开始下载。若下载未启动，请点击下方按钮。';
        icon = <CheckCircle2 className="w-10 h-10 text-emerald-600" />;
    } else if (status === 'failed') {
        statusText = '导出生成失败';
        subText = error || '未知错误';
        icon = <XCircle className="w-10 h-10 text-red-500" />;
    }

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[420px] bg-white/95 backdrop-blur-xl border border-stone-200/50 shadow-2xl rounded-2xl p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                <div className="w-full flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">{title}</h3>
                    {(status === 'completed' || status === 'failed') && (
                        <button 
                            onClick={onClose} 
                            className="text-stone-400 hover:text-stone-600 text-xs font-medium cursor-pointer"
                        >
                            关闭
                        </button>
                    )}
                </div>

                <div className="my-6">
                    {icon}
                </div>

                <h4 className="text-base font-bold text-stone-900 mb-2">{statusText}</h4>
                <p className="text-xs text-stone-500 leading-relaxed max-w-[320px] mb-6 font-normal">
                    {subText}
                </p>

                {/* 进度条动画 */}
                {status === 'active' && (
                    <div className="w-full bg-stone-100 rounded-full h-1.5 mb-6 overflow-hidden">
                        <div 
                            className="bg-stone-800 h-1.5 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {/* 交互操作 */}
                <div className="w-full flex gap-3">
                    {status === 'completed' && downloadUrl && (
                        <a
                            href={downloadUrl}
                            download
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
                        >
                            <Download size={14} />
                            手动重新下载
                        </a>
                    )}
                    {status === 'failed' && (
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                        >
                            返回
                        </button>
                    )}
                    {(status === 'waiting' || status === 'active') && (
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 px-4 bg-stone-50 hover:bg-stone-100 text-stone-500 rounded-xl text-xs font-semibold border border-stone-200/50 transition-all cursor-pointer"
                        >
                            后台运行 (关闭弹窗)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
