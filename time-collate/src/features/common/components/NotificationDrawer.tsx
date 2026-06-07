import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Heart, Star, MessageSquare, UserPlus, Copy, Info, CheckCheck } from 'lucide-react';
import { notificationService } from '../../../services/notificationService';
import type { Notification, NotificationActionType } from '../../../services/notificationService';

export function NotificationDrawer() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);

    // 获取未读计数
    const fetchUnreadCount = async () => {
        try {
            const count = await notificationService.getUnreadCount();
            setUnreadCount(count);
        } catch (err) {
            console.error('Failed to get unread count:', err);
        }
    };

    // 获取通知列表
    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const list = await notificationService.getNotifications(1, 40);
            setNotifications(list);
        } catch (err) {
            console.error('Failed to get notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    // 周期轮询未读数 (15秒一次)
    useEffect(() => {
        fetchUnreadCount();
        const timer = setInterval(fetchUnreadCount, 15000);
        return () => clearInterval(timer);
    }, []);

    // 抽屉打开时，拉取最新通知列表，并批量标记为已读
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
            // 自动标记全部为已读
            if (unreadCount > 0) {
                notificationService.markAsRead().then(() => {
                    setUnreadCount(0);
                }).catch(err => console.error('Failed to mark read:', err));
            }
        }
    }, [isOpen]);



    // 转换相对时间
    const formatTime = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}小时前`;
        const days = Math.floor(hours / 24);
        return `${days}天前`;
    };

    // 获取对应的操作图标与样式
    const getActionDetails = (action: NotificationActionType) => {
        switch (action) {
            case 'like':
                return {
                    icon: <Heart size={14} className="text-rose-500 fill-rose-500" />,
                    bg: 'bg-rose-50',
                    label: '点赞了你的时光集'
                };
            case 'favorite':
                return {
                    icon: <Star size={14} className="text-amber-500 fill-amber-500" />,
                    bg: 'bg-amber-50',
                    label: '收藏了你的时光集'
                };
            case 'comment':
                return {
                    icon: <MessageSquare size={14} className="text-blue-500" />,
                    bg: 'bg-blue-50',
                    label: '留下了时光贴纸'
                };
            case 'follow':
                return {
                    icon: <UserPlus size={14} className="text-emerald-500" />,
                    bg: 'bg-emerald-50',
                    label: '关注了你'
                };
            case 'clone':
                return {
                    icon: <Copy size={14} className="text-violet-500" />,
                    bg: 'bg-violet-50',
                    label: '套用了你的布局'
                };
            case 'system':
                return {
                    icon: <MessageSquare size={14} className="text-indigo-500" />,
                    bg: 'bg-indigo-50',
                    label: '管理员回复了你的反馈'
                };
            default:
                return {
                    icon: <Info size={14} className="text-slate-500" />,
                    bg: 'bg-slate-50',
                    label: '系统消息'
                };
        }
    };

    // 点击通知卡片跳转
    const handleNotificationClick = (notify: Notification) => {
        if (notify.actionType === 'system') {
            // 系统通知不需要跳转，仅点击时关闭抽屉或保留
            return;
        }
        setIsOpen(false);
        if (notify.actionType === 'follow') {
            // 跳转到关注者的社交个人主页
            navigate(`/profile/${notify.senderId}`);
        } else if (notify.entityType === 'book') {
            // 跳转到对应的时光集阅读页
            navigate(`/reader/${notify.entityId}`);
        }
    };

    // 一键标记已读
    const handleMarkAllRead = async () => {
        try {
            await notificationService.markAsRead();
            setUnreadCount(0);
            // 重新刷新列表，让小圆点状态更新
            const updatedList = notifications.map(n => ({ ...n, isRead: true }));
            setNotifications(updatedList);
        } catch (err) {
            console.error('Mark read failed:', err);
        }
    };

    return (
        <>
            {/* 铃铛触发按钮 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bell-btn-trigger relative p-2.5 bg-slate-100/80 hover:bg-slate-200/60 border border-slate-200/20 text-slate-500 hover:text-slate-700 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center"
                aria-label="Notifications"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* 侧边滑动通知抽屉 - 磨砂玻璃质感 */}
            {createPortal(
                <div
                    className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                >
                    {/* 灰度蒙层 */}
                    <div
                        className="absolute inset-0 bg-slate-900/10 backdrop-blur-xs transition-opacity duration-300"
                    />

                    {/* 抽屉面板 */}
                    <div
                        ref={drawerRef}
                        className={`absolute right-0 top-0 bottom-0 z-10 w-full sm:w-96 max-w-md bg-white/80 backdrop-blur-[30px] border-l border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col transition-transform duration-350 ease-out transform ${
                            isOpen ? 'translate-x-0' : 'translate-x-full'
                        }`}
                    >
                        {/* 头部区域 */}
                        <div className="p-5 border-b border-slate-100/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-800">通知中心</h3>
                                {unreadCount > 0 && (
                                    <span className="bg-rose-100 text-rose-600 text-xs px-2 py-0.5 rounded-full font-bold">
                                        {unreadCount}条未读
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {notifications.some(n => !n.isRead) && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        title="全部已读"
                                        className="p-1.5 hover:bg-slate-100 text-slate-450 hover:text-indigo-650 rounded-lg transition-colors cursor-pointer"
                                    >
                                        <CheckCheck size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 hover:bg-slate-100 text-slate-450 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* 通知列表滚动区 */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {loading && notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs font-medium">加载中...</span>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-350">
                                        <Bell size={24} />
                                    </div>
                                    <span className="text-xs font-semibold">暂无任何消息通知</span>
                                </div>
                            ) : (
                                notifications.map((notify) => {
                                    const details = getActionDetails(notify.actionType);
                                    return (
                                        <div
                                            key={notify.id}
                                            onClick={() => handleNotificationClick(notify)}
                                            className={`group relative p-3.5 bg-white/60 hover:bg-white border rounded-2xl cursor-pointer transition-all duration-200 flex gap-3 shadow-xs hover:shadow-md hover:scale-[1.01] ${
                                                notify.isRead ? 'border-slate-100' : 'border-indigo-100 bg-indigo-50/10'
                                            }`}
                                        >
                                            {/* 发起者头像/系统通知图标 */}
                                            <div className="relative flex-shrink-0">
                                                {notify.senderId ? (
                                                    <img
                                                        src={notify.senderAvatarUrl || '/default-avatar.png'}
                                                        alt={notify.senderNickname}
                                                        className="w-10 h-10 rounded-full object-cover border border-slate-100"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${notify.senderNickname}`;
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                        <Info size={18} />
                                                    </div>
                                                )}
                                                {/* 小状态图标 */}
                                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${details.bg} flex items-center justify-center border border-white shadow-xs`}>
                                                    {details.icon}
                                                </div>
                                            </div>

                                            {/* 消息文本内容 */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-slate-800 leading-snug">
                                                    <span className="font-bold text-slate-900 mr-1.5">
                                                        {notify.senderNickname}
                                                    </span>
                                                    <span className="text-slate-500 font-medium">{details.label}</span>
                                                </div>

                                                {/* 相关时光书标题快照 */}
                                                {notify.entityName && (
                                                    <div className={`mt-1 text-[11px] font-medium p-1.5 px-2.5 rounded-xl border ${
                                                        notify.actionType === 'system'
                                                            ? 'text-indigo-600 bg-indigo-50/40 border-indigo-100/50 whitespace-pre-wrap leading-relaxed'
                                                            : 'text-slate-400 bg-slate-50 border-transparent truncate'
                                                    }`}>
                                                        {notify.entityType === 'book' ? `《${notify.entityName}》` : notify.entityName}
                                                    </div>
                                                )}

                                                {/* 时间和未读状态小圆点 */}
                                                <div className="mt-1.5 flex items-center justify-between">
                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                        {formatTime(notify.createdAt)}
                                                    </span>
                                                    {!notify.isRead && (
                                                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
