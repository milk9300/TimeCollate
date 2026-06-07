import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MainLayout } from '../../common/components/MainLayout';
import { useAuthStore } from '../../../store/useAuthStore';
import { getBookService } from '../../../services/serviceFactory';
import { socialService, type SocialStats, type FollowUser } from '../../../services/socialService';
import type { Book } from '../../../types';
import {
    User,
    Mail,
    Calendar,
    BookOpen,
    Edit3,
    Camera,
    ShieldCheck,
    X,
    Check,
    Loader2,
    Lock,
    UserPlus,
    UserMinus,
    Heart,
    Users,
    ChevronLeft,
    Eye
} from 'lucide-react';

const bookService = getBookService();

interface PublicUserInfo {
    id: string;
    nickname: string;
    username: string;
    avatarUrl?: string;
    createdAt: number;
}

export const Profile: React.FC = () => {
    const { userId } = useParams<{ userId?: string }>();
    const navigate = useNavigate();
    const { user: currentUser, updateUser } = useAuthStore();
    
    // 是否为本人的空间
    const isOwnProfile = !userId || userId === currentUser?.id;
    const activeUserId = isOwnProfile ? currentUser?.id : userId;

    // 用户基本信息
    const [profileUser, setProfileUser] = useState<PublicUserInfo | null>(null);
    const [stats, setStats] = useState<SocialStats>({ followingCount: 0, followerCount: 0, totalLikesReceived: 0 });
    const [isFollowing, setIsFollowing] = useState(false);
    
    // 列表数据
    const [books, setBooks] = useState<Book[]>([]);
    const [followers, setFollowers] = useState<FollowUser[]>([]);
    const [followingList, setFollowingList] = useState<FollowUser[]>([]);
    
    // #region State
    // UI 控制状态
    const [activeTab, setActiveTab] = useState<'books' | 'favorites' | 'social'>(isOwnProfile ? 'social' : 'books');
    const [socialSubTab, setSocialSubTab] = useState<'following' | 'followers'>('followers');
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    
    // 收藏的书籍列表
    const [favoritedBooks, setFavoritedBooks] = useState<Book[]>([]);
    // #endregion

    // 编辑资料 & 密码修改模态框状态 (仅限本人)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [nicknameForm, setNicknameForm] = useState('');
    const [passwords, setPasswords] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // 核心数据拉取
    const loadProfileData = async () => {
        if (!activeUserId) return;
        setIsLoading(true);
        try {
            // 1. 获取用户基本资料
            if (isOwnProfile) {
                if (currentUser) {
                    setProfileUser({
                        id: currentUser.id,
                        nickname: currentUser.nickname,
                        username: currentUser.username,
                        avatarUrl: currentUser.avatarUrl,
                        createdAt: currentUser.createdAt
                    });
                }
            } else {
                const res = await axios.get(`/auth/user/${activeUserId}`);
                if (res.data?.success) {
                    setProfileUser(res.data.data);
                }
            }

            // 2. 获取社交统计指标
            const socialStats = await socialService.getSocialStats(activeUserId);
            setStats(socialStats);

            // 3. 获取关注状态
            if (!isOwnProfile && currentUser) {
                const followingStatus = await socialService.isFollowing(activeUserId);
                setIsFollowing(followingStatus);
            }

            // 4. 获取作品列表
            if (isOwnProfile) {
                // 本人获取所有拥有的书
                const res = await bookService.getBooks(1, 100);
                setBooks(res.items);
            } else {
                // 他人获取公开状态的书
                const res = await axios.get('/books/public', {
                    params: { userId: activeUserId, page: 1, pageSize: 100 }
                });
                if (res.data?.success) {
                    setBooks(res.data.data.items);
                }
            }

            // 4.5 获取收藏列表 (Fail-Safe 机制，如遇到非致命错误则静默返回空数组)
            try {
                const favRes = await bookService.getFavoritedBooks(activeUserId, 1, 100);
                setFavoritedBooks(favRes.items);
            } catch (err) {
                console.error('Failed to load favorited books:', err);
                setFavoritedBooks([]);
            }

            // 5. 获取粉丝/关注人列表
            const followersRes = await socialService.getFollowers(activeUserId);
            const followingRes = await socialService.getFollowing(activeUserId);
            setFollowers(followersRes);
            setFollowingList(followingRes);

        } catch (err) {
            console.error('Failed to load profile data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProfileData();
        setActiveTab(isOwnProfile ? 'social' : 'books');
    }, [userId, currentUser]);

    // 关注/取消关注动作
    const handleToggleFollow = async () => {
        if (!activeUserId || isOwnProfile) return;
        setIsActionLoading(true);
        try {
            const res = await socialService.toggleFollow(activeUserId);
            setIsFollowing(res.followed);
            // 动态微调粉丝数
            setStats(prev => ({
                ...prev,
                followerCount: res.followed ? prev.followerCount + 1 : Math.max(0, prev.followerCount - 1)
            }));
            
            // 刷新粉丝列表
            const followersRes = await socialService.getFollowers(activeUserId);
            setFollowers(followersRes);
        } catch (err) {
            console.error('Toggle follow failed:', err);
            alert('操作失败，请重试');
        } finally {
            setIsActionLoading(false);
        }
    };

    // 编辑资料
    const handleEditProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nicknameForm.trim()) return;

        setIsUpdating(true);
        try {
            const response = await axios.put('/auth/profile', { nickname: nicknameForm });
            if (response.data.success) {
                updateUser({ nickname: nicknameForm });
                setIsEditModalOpen(false);
                alert('资料已更新');
            }
        } catch (error: any) {
            alert(error.response?.data?.error || '更新失败');
        } finally {
            setIsUpdating(false);
        }
    };

    // 修改密码
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            alert('两次输入的新密码不一致');
            return;
        }

        setIsUpdating(true);
        try {
            const response = await axios.put('/auth/password', {
                oldPassword: passwords.oldPassword,
                newPassword: passwords.newPassword
            });
            if (response.data.success) {
                setIsPasswordModalOpen(false);
                setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
                alert('密码修改成功');
            }
        } catch (error: any) {
            alert(error.response?.data?.error || '修改失败');
        } finally {
            setIsUpdating(false);
        }
    };

    // 图像压缩工具
    const compressImage = (file: File, maxWidth = 256, maxHeight = 256): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) resolve(blob);
                            else reject(new Error('Canvas toBlob failed'));
                        },
                        'image/jpeg',
                        0.8
                    );
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    const handleAvatarClick = () => {
        if (!isOwnProfile) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        try {
            const compressedBlob = await compressImage(file);
            const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
            const photo = await bookService.uploadPhoto(compressedFile);

            const response = await axios.put('/auth/profile', { avatarUrl: photo.url });
            if (response.data.success) {
                updateUser({ avatarUrl: photo.url });
            }
        } catch (error) {
            console.error('Avatar upload failed:', error);
            alert('头像上传失败');
        } finally {
            setUploadingAvatar(false);
            if (e.target) e.target.value = '';
        }
    };

    const joinDate = profileUser?.createdAt
        ? new Date(profileUser.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
        : '未知';

    const daysJoined = profileUser?.createdAt
        ? Math.max(1, Math.ceil((Date.now() - new Date(profileUser.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

    if (isLoading) {
        return (
            <MainLayout title="加载中...">
                <div className="h-[60vh] flex items-center justify-center">
                    <Loader2 size={36} className="text-indigo-600 animate-spin" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout title={isOwnProfile ? "我的空间" : `${profileUser?.nickname || '用户'} 的创作空间`}>
            <div className="max-w-6xl mx-auto p-4 sm:p-8 font-['Outfit',_sans-serif]">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />


                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 左侧：用户信息名片 & 社交指标 */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-[32px] p-8 shadow-xs border border-slate-100 text-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-500/10 to-purple-500/10" />

                            <div className="relative mt-4 mb-6 inline-block">
                                <div
                                    className={`w-28 h-28 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-50 flex items-center justify-center text-indigo-500 mx-auto relative ${
                                        isOwnProfile ? 'cursor-pointer hover:opacity-90' : ''
                                    }`}
                                    onClick={handleAvatarClick}
                                >
                                    {uploadingAvatar && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                                            <Loader2 size={20} className="text-white animate-spin" />
                                        </div>
                                    )}
                                    {profileUser?.avatarUrl ? (
                                        <img src={profileUser.avatarUrl} alt={profileUser.nickname} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={40} />
                                    )}
                                </div>
                                {isOwnProfile && (
                                    <button
                                        className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg border border-slate-50 flex items-center justify-center text-slate-450 hover:text-indigo-600 transition-colors cursor-pointer"
                                        onClick={handleAvatarClick}
                                    >
                                        <Camera size={14} />
                                    </button>
                                )}
                            </div>

                            <h2 className="text-xl font-black text-slate-800 mb-1">{profileUser?.nickname}</h2>
                            <p className="text-slate-400 font-bold text-xs mb-5">@{profileUser?.username}</p>

                            <div className="flex items-center justify-center gap-1.5 bg-indigo-50/70 text-indigo-600 py-1.5 px-4 rounded-full text-[10px] font-black inline-flex">
                                <ShieldCheck size={12} className="stroke-[2.5]" />
                                {isOwnProfile ? '主理人身份已校验' : '时光书创作者'}
                            </div>

                            {/* 关注按钮 (仅在他人空间显示) */}
                            {!isOwnProfile && (
                                <div className="mt-5">
                                    <button
                                        onClick={handleToggleFollow}
                                        disabled={isActionLoading}
                                        className={`w-full py-2.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                                            isFollowing
                                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100'
                                        }`}
                                    >
                                        {isActionLoading ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : isFollowing ? (
                                            <>
                                                <UserMinus size={14} />
                                                <span>已关注</span>
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus size={14} />
                                                <span>关注</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 社交统计数值面板 */}
                        <div className="bg-white rounded-[32px] p-6 shadow-xs border border-slate-100">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">社交足迹</h3>
                            <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-100">
                                <div>
                                    <p className="text-lg font-black text-slate-800">{stats.followerCount}</p>
                                    <p className="text-[10px] text-slate-450 font-bold mt-0.5">粉丝</p>
                                </div>
                                <div>
                                    <p className="text-lg font-black text-slate-800">{stats.followingCount}</p>
                                    <p className="text-[10px] text-slate-450 font-bold mt-0.5">关注</p>
                                </div>
                                <div>
                                    <p className="text-lg font-black text-slate-800">{stats.totalLikesReceived}</p>
                                    <p className="text-[10px] text-slate-450 font-bold mt-0.5">获赞</p>
                                </div>
                            </div>
                        </div>

                        {/* 时光里程碑 */}
                        <div className="bg-white rounded-[32px] p-6 shadow-xs border border-slate-100">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">拾光历程</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-650 flex items-center justify-center">
                                            <BookOpen size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-800">创作书卷</p>
                                            <p className="text-[9px] text-slate-400 font-bold">累计编辑的册数</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-indigo-600">{books.length} 本</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-650 flex items-center justify-center">
                                            <Calendar size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-800">筑梦时间</p>
                                            <p className="text-[9px] text-slate-400 font-bold">自注册以来的时光天数</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-purple-600">{daysJoined} 天</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 右侧：交互 Tab 内容（时光书架 / 社交圈） */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* 导航 Tab */}
                        {!isOwnProfile ? (
                            <div className="bg-white p-2 rounded-2xl border border-slate-100/80 shadow-xs flex gap-2">
                                <button
                                    onClick={() => setActiveTab('books')}
                                    className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                                        activeTab === 'books'
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-transparent text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    <BookOpen size={14} />
                                    <span>时光书架 ({books.length})</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('social')}
                                    className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                                        activeTab === 'social'
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-transparent text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    <Users size={14} />
                                    <span>社交圈 ({followers.length + followingList.length})</span>
                                </button>
                            </div>
                        ) : (
                            /* 前往我的拾光集横幅 (提供跳转到我的时光集路径) */
                            <div className="bg-gradient-to-r from-indigo-500 via-indigo-650 to-purple-650 rounded-[32px] p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div>
                                    <h3 className="text-sm font-black flex items-center gap-2">
                                        <BookOpen size={16} className="text-indigo-100" />
                                        <span>我的拾光集书架</span>
                                    </h3>
                                    <p className="text-[11px] text-indigo-100 font-semibold mt-1">
                                        前往大厅管理您的时光书作品、编辑页面以及浏览您的个人收藏集。
                                    </p>
                                </div>
                                <button
                                    onClick={() => navigate('/')}
                                    className="px-5 py-2.5 bg-white text-indigo-650 hover:text-indigo-700 rounded-xl text-xs font-black hover:bg-slate-50 transition-all cursor-pointer shrink-0 shadow-xs flex items-center justify-center gap-1.5"
                                >
                                    <span>进入我的拾光集</span>
                                    <span className="text-[10px]">→</span>
                                </button>
                            </div>
                        )}

                        {/* Tab 1: 时光书架 (仅限他人主页查看) */}
                        {activeTab === 'books' && !isOwnProfile && (
                            <div className="space-y-6">
                                {books.length === 0 ? (
                                    <div className="bg-white rounded-[32px] p-12 border border-slate-100 text-center text-slate-400 animate-in fade-in duration-250">
                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-350 mx-auto mb-3">
                                            <BookOpen size={22} />
                                        </div>
                                        <p className="text-xs font-bold">该创作者暂未公开任何时光书</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in fade-in duration-250">
                                        {books.map(book => (
                                            <div 
                                                key={book.id} 
                                                className="bg-white rounded-3xl border border-slate-100 hover:border-indigo-100 p-4 shadow-xs hover:shadow-lg transition-all group relative flex flex-col justify-between"
                                            >
                                                <div className="flex gap-4">
                                                    {/* 书籍封面缩略图 */}
                                                    <div 
                                                        onClick={() => navigate(`/read/${book.id}`)}
                                                        className="w-20 h-28 rounded-xl bg-slate-100 border border-slate-200/50 shadow-sm overflow-hidden flex-shrink-0 cursor-pointer relative group-hover:scale-103 transition-transform"
                                                    >
                                                        {book.coverUrl ? (
                                                            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-350 text-[10px] font-black uppercase bg-gradient-to-br from-indigo-50 to-purple-50">
                                                                No Cover
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                        <div>
                                                            <h4 
                                                                onClick={() => navigate(`/read/${book.id}`)}
                                                                className="font-black text-xs text-slate-800 truncate hover:text-indigo-600 cursor-pointer leading-snug"
                                                            >
                                                                {book.title}
                                                            </h4>
                                                            <p className="text-[10px] text-slate-400 font-bold mt-1">作者: {book.author || '匿名'}</p>
                                                            <span className="inline-block mt-2 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                                                {book.theme}
                                                            </span>
                                                        </div>

                                                        {/* 数据统计指标 */}
                                                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-450 mt-4">
                                                            <span className="flex items-center gap-1"><Eye size={12} /> {book.views || 0}</span>
                                                            <span className="flex items-center gap-1"><Heart size={11} /> {book.likes || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab 2: 社交圈 (粉丝与关注列表) */}
                        {activeTab === 'social' && (
                            <div className="bg-white rounded-[32px] p-6 border border-slate-100 space-y-6">
                                {/* 子 Tabs 切换 */}
                                <div className="flex border-b border-slate-100 pb-3 gap-6 text-xs font-black select-none">
                                    <button
                                        onClick={() => setSocialSubTab('followers')}
                                        className={`pb-2 relative cursor-pointer ${
                                            socialSubTab === 'followers' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-650'
                                        }`}
                                    >
                                        <span>粉丝 ({followers.length})</span>
                                        {socialSubTab === 'followers' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setSocialSubTab('following')}
                                        className={`pb-2 relative cursor-pointer ${
                                            socialSubTab === 'following' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-650'
                                        }`}
                                    >
                                        <span>正在关注 ({followingList.length})</span>
                                        {socialSubTab === 'following' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                                        )}
                                    </button>
                                </div>

                                {/* 人物列表 */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {socialSubTab === 'followers' ? (
                                        followers.length === 0 ? (
                                            <p className="col-span-2 text-center text-xs font-semibold text-slate-400 py-8">暂无粉丝数据</p>
                                        ) : (
                                            followers.map(f => (
                                                <div 
                                                    key={f.id}
                                                    onClick={() => navigate(`/profile/${f.id}`)}
                                                    className="flex items-center gap-3 p-3 bg-slate-50/60 hover:bg-indigo-50/30 border border-slate-100/50 rounded-2xl cursor-pointer hover:scale-[1.01] transition-all"
                                                >
                                                    <img 
                                                        src={f.avatarUrl || '/default-avatar.png'} 
                                                        alt={f.nickname} 
                                                        className="w-10 h-10 rounded-full object-cover border border-white shadow-xs"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${f.nickname}`;
                                                        }}
                                                    />
                                                    <span className="font-black text-xs text-slate-800 truncate">{f.nickname}</span>
                                                </div>
                                            ))
                                        )
                                    ) : (
                                        followingList.length === 0 ? (
                                            <p className="col-span-2 text-center text-xs font-semibold text-slate-400 py-8">暂无关注的人</p>
                                        ) : (
                                            followingList.map(f => (
                                                <div 
                                                    key={f.id}
                                                    onClick={() => navigate(`/profile/${f.id}`)}
                                                    className="flex items-center gap-3 p-3 bg-slate-50/60 hover:bg-indigo-50/30 border border-slate-100/50 rounded-2xl cursor-pointer hover:scale-[1.01] transition-all"
                                                >
                                                    <img 
                                                        src={f.avatarUrl || '/default-avatar.png'} 
                                                        alt={f.nickname} 
                                                        className="w-10 h-10 rounded-full object-cover border border-white shadow-xs"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${f.nickname}`;
                                                        }}
                                                    />
                                                    <span className="font-black text-xs text-slate-800 truncate">{f.nickname}</span>
                                                </div>
                                            ))
                                        )
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 本人专属的后台账号设置卡片 */}
                        {isOwnProfile && (
                            <div className="bg-white rounded-[32px] p-8 border border-slate-100 space-y-6 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800">资料设置</h3>
                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">更改您的登录安全信息与对外公开资料</p>
                                    </div>
                                    <button
                                        onClick={() => { setNicknameForm(currentUser?.nickname || ''); setIsEditModalOpen(true); }}
                                        className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-sm"
                                    >
                                        编辑基本资料
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">显示昵称</label>
                                        <div className="bg-slate-50/60 px-4 py-3 rounded-2xl text-xs font-bold text-slate-700 border border-slate-100">
                                            {currentUser?.nickname}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">账号名称</label>
                                        <div className="bg-slate-50/60 px-4 py-3 rounded-2xl text-xs font-bold text-slate-700 border border-slate-100">
                                            {currentUser?.username}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">注册时间</label>
                                        <div className="bg-slate-50/60 px-4 py-3 rounded-2xl text-xs font-bold text-slate-700 border border-slate-100">
                                            {joinDate}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">安全凭证 ID</label>
                                        <div className="bg-slate-50/60 px-4 py-3 rounded-2xl text-[10px] font-bold text-indigo-500 border border-slate-100 font-mono truncate">
                                            {currentUser?.id}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100/50 flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-emerald-600 font-black text-xs">
                                        <ShieldCheck size={16} />
                                        <span>账号处于受信任的安全保护中</span>
                                    </div>
                                    <button
                                        onClick={() => setIsPasswordModalOpen(true)}
                                        className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-2xl text-xs font-black transition-all cursor-pointer"
                                    >
                                        修改登录密码
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 弹窗：编辑基本资料 (仅限本人) */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" onClick={() => setIsEditModalOpen(false)}></div>
                    <div className="bg-white rounded-[36px] w-full max-w-sm p-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                        <button
                            className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
                            onClick={() => setIsEditModalOpen(false)}
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-black text-slate-800 mb-1">修改个人资料</h3>
                        <p className="text-slate-400 font-bold text-xs mb-6">设置您在拾光集对外公开显示的昵称</p>

                        <form onSubmit={handleEditProfile} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-700">新显示昵称</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        value={nicknameForm}
                                        onChange={(e) => setNicknameForm(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-slate-800 transition-all outline-none"
                                        placeholder="输入新昵称"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    className="flex-1 py-3 bg-slate-100 text-slate-650 rounded-2xl text-xs font-black hover:bg-slate-200 cursor-pointer"
                                    onClick={() => setIsEditModalOpen(false)}
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="flex-[2] py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isUpdating ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                    <span>更新昵称</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 弹窗：修改密码 (仅限本人) */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" onClick={() => setIsPasswordModalOpen(false)}></div>
                    <div className="bg-white rounded-[36px] w-full max-w-sm p-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                        <button
                            className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
                            onClick={() => setIsPasswordModalOpen(false)}
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-black text-slate-800 mb-1">修改密码</h3>
                        <p className="text-slate-400 font-bold text-xs mb-6">定期更换高强度密码可增强账号安全性</p>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-700">当前旧密码</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input
                                        type="password"
                                        value={passwords.oldPassword}
                                        onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold transition-all outline-none"
                                        placeholder="输入当前旧密码"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-700">设置新密码</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input
                                        type="password"
                                        value={passwords.newPassword}
                                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold transition-all outline-none"
                                        placeholder="设置新登录密码"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-700">确认新密码</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input
                                        type="password"
                                        value={passwords.confirmPassword}
                                        onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold transition-all outline-none"
                                        placeholder="再次确认新密码"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    className="flex-1 py-3 bg-slate-100 text-slate-650 rounded-2xl text-xs font-black hover:bg-slate-200 cursor-pointer"
                                    onClick={() => setIsPasswordModalOpen(false)}
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="flex-[2] py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isUpdating ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                    <span>确认修改</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};
