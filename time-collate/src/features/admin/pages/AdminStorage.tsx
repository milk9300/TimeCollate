import { useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { HardDrive, Globe, RefreshCw, Trash2, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useAdminStore } from '../../../store/useAdminStore';

export function AdminStorage() {
    const { stats } = useAdminStore();
    const [purgeUrl, setPurgeUrl] = useState('');
    const [isPurging, setIsPurging] = useState(false);
    const [whitelist, setWhitelist] = useState('*.timecollate.com, localhost');
    const [isSavingWhitelist, setIsSavingWhitelist] = useState(false);
    const [activeBucket, setActiveBucket] = useState('primary-oss-shanghai');

    const formatBytes = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // 模拟执行 CDN 缓存刷新
    const handlePurge = () => {
        if (!purgeUrl) return;
        setIsPurging(true);
        setTimeout(() => {
            alert('CDN 缓存刷新命令发送成功，全球节点将在 60 秒内同步生效！');
            setPurgeUrl('');
            setIsPurging(false);
        }, 1200);
    };

    // 模拟保存 Referer Whitelist
    const handleSaveWhitelist = () => {
        setIsSavingWhitelist(true);
        setTimeout(() => {
            alert('防盗链白名单白名单已同步至 OSS 策略配置！');
            setIsSavingWhitelist(false);
        }, 1000);
    };

    // 边缘节点数据
    const edges = [
        { name: '华东-上海边缘节点', status: 'healthy', latency: '12ms', qps: 124 },
        { name: '华南-深圳边缘节点', status: 'healthy', latency: '18ms', qps: 98 },
        { name: '华北-北京边缘节点', status: 'healthy', latency: '22ms', qps: 84 },
        { name: '亚太-香港海外出口', status: 'healthy', latency: '35ms', qps: 42 },
    ];

    return (
        <AdminLayout title="资源与存储监控">
            <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
                {/* 页面头部 */}
                <div className="mb-8">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">资源与存储监控</h2>
                    <p className="text-slate-500 font-medium">监控全站图片与 PDF 实体云端储存占用、CDN 流量损耗和防盗链安全机制。</p>
                </div>

                {/* 核心指标统计卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                            <HardDrive size={24} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">OSS 存储桶大小</span>
                            <span className="text-lg font-black text-slate-800">{stats ? formatBytes(stats.system.ossStats.storage) : '48.2 GB'}</span>
                            <span className="text-[10px] font-bold text-slate-400 block mt-0.5">文件总数: {stats?.system.ossStats.objectCount || 2340} 个</span>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
                            <Globe size={24} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">CDN 节点缓存率</span>
                            <span className="text-lg font-black text-slate-800">{stats?.system.cdnHitRate || 94.2}%</span>
                            <span className="text-[10px] font-bold text-slate-400 block mt-0.5">已免去流量: {stats ? formatBytes(stats.system.cdnSavedBytes) : '1.2 TB'}</span>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">热链接防护策略</span>
                            <span className="text-lg font-black text-slate-800">已启用 (Referer)</span>
                            <span className="text-[10px] font-bold text-emerald-500 block mt-0.5">HTTPS 跨域证书完备</span>
                        </div>
                    </div>
                </div>

                {/* 存储桶选择及防盗链配置 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* CDN 缓存清理工具 */}
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-6">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                <RefreshCw size={16} className="text-indigo-500" />
                                CDN 全球节点缓存刷新 (Purge Tool)
                            </h3>
                            <p className="text-xs text-slate-400 font-bold mt-1">输入更新的排版模板、图片链接进行强制缓存失效，加速用户端渲染展示。</p>
                        </div>

                        <div className="space-y-3">
                            <input 
                                type="text"
                                placeholder="输入需要刷新的文件相对路径，如 /templates/modern_a4.json"
                                value={purgeUrl}
                                onChange={(e) => setPurgeUrl(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                            />
                            <button
                                onClick={handlePurge}
                                disabled={!purgeUrl || isPurging}
                                className="px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                <Trash2 size={14} />
                                <span>{isPurging ? '正在分发刷新指令...' : '立即刷新缓存'}</span>
                            </button>
                        </div>
                    </div>

                    {/* 防盗链名单设置 */}
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-6">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                <ShieldCheck size={16} className="text-emerald-500" />
                                OSS 防盗链设置 (Hotlinking Whitelist)
                            </h3>
                            <p className="text-xs text-slate-400 font-bold mt-1">配置 Referer 白名单，阻止第三方非法抓取本系统生成的 PDF 导出链路或用户私人照片。</p>
                        </div>

                        <div className="space-y-3">
                            <input 
                                type="text"
                                value={whitelist}
                                onChange={(e) => setWhitelist(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                            />
                            <button
                                onClick={handleSaveWhitelist}
                                disabled={isSavingWhitelist}
                                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                <span>{isSavingWhitelist ? '同步配置中...' : '同步白名单'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* CDN 节点监视器 */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6">
                    <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                        <span>CDN 核心边缘分发节点 (Edge Logs)</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">{edges.length}</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {edges.map((node, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-100/80 rounded-2xl p-5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 -mr-4 -mt-4 rounded-full blur-lg group-hover:scale-150 transition-transform"></div>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs font-black text-slate-800">{node.name}</span>
                                    <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                                        Active
                                    </span>
                                </div>
                                <div className="space-y-1 mt-4">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                        <span>请求延迟 (Latency)</span>
                                        <span className="text-slate-700 font-mono font-black">{node.latency}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                        <span>当前 QPS 吞吐</span>
                                        <span className="text-slate-700 font-mono font-black">{node.qps} Req/s</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
