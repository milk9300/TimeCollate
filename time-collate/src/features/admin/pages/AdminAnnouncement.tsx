import { useState, useEffect } from 'react';
import axios from 'axios';
import { AdminLayout } from '../components/AdminLayout';
import { Bell, Users, Clock, Send, CheckCircle, ShieldAlert } from 'lucide-react';

interface AnnouncementHistory {
    id: string;
    content: string;
    target: string;
    date: string;
    author: string;
}

export function AdminAnnouncement() {
    const [announcement, setAnnouncement] = useState('');
    const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
    const [resetSeen, setResetSeen] = useState(true);
    const [targetAudience, setTargetAudience] = useState('all');
    const [history, setHistory] = useState<AnnouncementHistory[]>([]);

    // 加载当前公告
    useEffect(() => {
        const fetchAnnouncement = async () => {
            try {
                const response = await axios.get('/admin/announcement');
                if (response.data.success) {
                    setAnnouncement(response.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch announcement:', error);
            }
        };

        // 默认模拟一些历史发布公告记录
        const mockHistory: AnnouncementHistory[] = [
            { id: '1', content: '系统即将在 6 月 1 日零点进行 PDF 渲染底层内核平滑升级，届时导出任务可能存在 1-2 分钟延迟，请知悉。', target: '全网用户', date: '2026-05-28 10:00:00', author: '超级管理员' },
            { id: '2', content: '创意市场正式上架《黑白极简排版骨架》，支持人均单次引用超过 10 页，请至书架体验！', target: '活跃创作者', date: '2026-05-15 14:30:00', author: '运营主管' },
        ];
        setHistory(mockHistory);
        fetchAnnouncement();
    }, []);

    // 广播发布公告
    const handleSaveAnnouncement = async () => {
        if (!announcement.trim()) return;
        setIsSavingAnnouncement(true);
        try {
            const response = await axios.post('/admin/announcement', {
                content: announcement,
                resetSeen
            });
            if (response.data.success) {
                alert('系统全局广播成功！消息已持久化入库，并同步重置了用户通知状态。');
                
                // 将新公告推入历史记录头部
                const now = new Date();
                const newRecord: AnnouncementHistory = {
                    id: String(Date.now()),
                    content: announcement,
                    target: targetAudience === 'all' ? '全网用户' : targetAudience === 'active' ? '活跃创作者' : 'VIP 创作者',
                    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
                    author: '超级管理员'
                };
                setHistory(prev => [newRecord, ...prev]);
            }
        } catch (error) {
            console.error('Failed to save announcement:', error);
            alert('发布公告失败');
        } finally {
            setIsSavingAnnouncement(false);
        }
    };

    return (
        <AdminLayout title="系统全局公告">
            <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
                {/* 页面头部 */}
                <div className="mb-8">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">系统全局公告</h2>
                    <p className="text-slate-500 font-medium">配置与撰写全局置顶公告，并在创作者大厅对特定目标人群进行弹窗通知。</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 广播撰写区 */}
                    <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                                <Bell size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900">撰写全局广播公告</h3>
                                <p className="text-xs text-slate-400 font-bold mt-0.5">该公告将在前台 Lobby 首页置顶以磨砂卡片形式警示用户。</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* 选择受众 */}
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">分发受众群 (Target Audience)</span>
                                <div className="flex gap-2.5">
                                    {[
                                        { id: 'all', name: '全网用户', icon: Users },
                                        { id: 'active', name: '仅活跃创作者', icon: Users },
                                        { id: 'vip', name: '仅 VIP 用户群', icon: ShieldAlert }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setTargetAudience(opt.id)}
                                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                                targetAudience === opt.id
                                                    ? 'bg-slate-900 text-white shadow-sm scale-102'
                                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500'
                                            }`}
                                        >
                                            <opt.icon size={13} />
                                            {opt.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 公告文本 */}
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">公告内容 (Announcement Body)</span>
                                <textarea
                                    value={announcement}
                                    onChange={(e) => setAnnouncement(e.target.value)}
                                    placeholder="请输入向用户通知的具体公告事宜（支持简要文字说明）..."
                                    className="w-full h-44 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none placeholder:text-slate-400"
                                />
                            </div>

                            {/* 强推控制项 */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                                <label className="flex items-center gap-2.5 cursor-pointer group/label">
                                    <input
                                        type="checkbox"
                                        checked={resetSeen}
                                        onChange={(e) => setResetSeen(e.target.checked)}
                                        className="appearance-none w-4 h-4 rounded border-2 border-slate-200 checked:bg-indigo-650 checked:border-indigo-650 transition-all cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-slate-500 group-hover/label:text-slate-700 transition-colors">强制标记为所有受众用户未读 (强弹通知)</span>
                                </label>

                                <button
                                    onClick={handleSaveAnnouncement}
                                    disabled={isSavingAnnouncement || !announcement.trim()}
                                    className="px-5 py-3 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/10 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                                >
                                    <Send size={13} />
                                    <span>{isSavingAnnouncement ? '广播推送中...' : '广播公告'}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 公告历史记录 */}
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-6">
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <Clock size={16} className="text-slate-400" />
                            近期历史公告
                        </h3>

                        <div className="space-y-4 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                            {history.map((record) => (
                                <div key={record.id} className="bg-slate-50/70 border border-slate-100 p-4 rounded-2xl space-y-3 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase">
                                            {record.target}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono font-bold">{record.date}</span>
                                    </div>
                                    <p className="text-slate-750 text-[11px] leading-relaxed font-bold break-all">
                                        {record.content}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400">
                                        <CheckCircle size={10} className="text-emerald-500" />
                                        已发送 • 发起人: {record.author}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
