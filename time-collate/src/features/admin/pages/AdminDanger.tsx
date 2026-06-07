import { AdminLayout } from '../components/AdminLayout';
import { AlertTriangle, Database, RefreshCw, EyeOff, CheckCircle } from 'lucide-react';
import { useAdminStore } from '../../../store/useAdminStore';

export function AdminDanger() {
    const { 
        env,
        isMaintenanceMode, 
        setMaintenanceMode, 
        activeDangerAction, 
        dangerStage, 
        setDangerAction 
    } = useAdminStore();

    // 触发操作选择
    const handleSelectAction = (action: string) => {
        setDangerAction(action, 'evaluating');
    };

    // 维护模式开启/关闭切换（在确认后执行）
    const handleToggleMaintenance = () => {
        // 如果是维护模式，直接触发右侧确认
        setDangerAction('maintenance_toggle', 'evaluating');
    };

    return (
        <AdminLayout title="高级设置 / 危险操作隔离区">
            <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
                {/* 页面头部 */}
                <div className="p-6 bg-red-500/10 border border-red-550/15 rounded-3xl text-red-500 mb-8">
                    <div className="flex gap-4 items-start">
                        <AlertTriangle size={32} className="shrink-0 mt-0.5" />
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-wider">高级设置 / 危险操作隔离区 (Danger Zone)</h2>
                            <p className="text-xs text-red-500/80 font-bold mt-1.5 leading-relaxed">
                                此页面下的所有指令对生产系统和正在使用的在线创作者群具有物理级的破坏性或严重中断隐患。
                                点击相应按钮后，需要在**右侧 1/3 Telemetry 仪表盘中通过安全评估及字样校验双重确认**后，才可解锁下发指令。
                            </p>
                        </div>
                    </div>
                </div>

                {/* 危险卡片格 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 清理 Redis */}
                    <div className={`bg-white rounded-3xl border p-6 flex flex-col justify-between h-72 transition-all ${
                        activeDangerAction === 'redis_flush' ? 'border-red-500 ring-4 ring-red-500/5 shadow-md' : 'border-slate-100 shadow-sm'
                    }`}>
                        <div className="space-y-4">
                            <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                                <RefreshCw size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900">清空系统 Redis 缓存</h3>
                                <p className="text-xs text-slate-400 font-bold mt-1.5 leading-relaxed">
                                    清空所有键值对缓存，包括排版引擎临时 JSON 编译物、用户 Session 会话及高开销数据库查询结果。
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400">
                                <span>当前 Redis 载荷</span>
                                <span className="font-mono text-slate-700">~2.45 MB / 1450 Keys</span>
                            </div>
                            <button
                                onClick={() => handleSelectAction('redis_flush')}
                                className="w-full py-2.5 bg-slate-900 hover:bg-red-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
                            >
                                {activeDangerAction === 'redis_flush' ? '已在右侧加载评估...' : '执行清空缓存'}
                            </button>
                        </div>
                    </div>

                    {/* 数据库迁移 */}
                    <div className={`bg-white rounded-3xl border p-6 flex flex-col justify-between h-72 transition-all ${
                        activeDangerAction === 'db_migrate' ? 'border-red-500 ring-4 ring-red-500/5 shadow-md' : 'border-slate-100 shadow-sm'
                    }`}>
                        <div className="space-y-4">
                            <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                                <Database size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900">同步数据库迁移结构</h3>
                                <p className="text-xs text-slate-400 font-bold mt-1.5 leading-relaxed">
                                    执行 DDL 迁移迁移脚本。这将在后台锁定涉及更改表结构的行或整张表，防止脏读、幻读风险。
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400">
                                <span>最新结构版本</span>
                                <span className="font-mono text-slate-700">v1.4.2 (2026053001)</span>
                            </div>
                            <button
                                onClick={() => handleSelectAction('db_migrate')}
                                className="w-full py-2.5 bg-slate-900 hover:bg-red-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
                            >
                                {activeDangerAction === 'db_migrate' ? '已在右侧加载评估...' : '执行 DB 同步迁移'}
                            </button>
                        </div>
                    </div>

                    {/* 系统维护模式 */}
                    <div className={`bg-white rounded-3xl border p-6 flex flex-col justify-between h-72 transition-all ${
                        activeDangerAction === 'maintenance_toggle' ? 'border-red-500 ring-4 ring-red-500/5 shadow-md' : 'border-slate-100 shadow-sm'
                    }`}>
                        <div className="space-y-4">
                            <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                                <EyeOff size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900">系统全局停机维护模式</h3>
                                <p className="text-xs text-slate-400 font-bold mt-1.5 leading-relaxed">
                                    开启后，前台应用服务会切断全部公开路由并定向到系统离线页，管理员可以进行数据重整。
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400">
                                <span>当前维护状态</span>
                                <span className={`font-black ${isMaintenanceMode ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {isMaintenanceMode ? '● 已开启 (MAINTENANCE)' : '○ 正常对外开放'}
                                </span>
                            </div>
                            
                            {/* 如果处于确认阶段，提供状态同步 */}
                            {activeDangerAction === 'maintenance_toggle' && dangerStage === 'completed' ? (
                                <button
                                    onClick={() => {
                                        setMaintenanceMode(!isMaintenanceMode);
                                        setDangerAction(null);
                                    }}
                                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                    <CheckCircle size={12} />
                                    确认应用状态切换
                                </button>
                            ) : (
                                <button
                                    onClick={handleToggleMaintenance}
                                    className={`w-full py-2.5 text-white rounded-xl text-xs font-black transition-all cursor-pointer ${
                                        isMaintenanceMode 
                                            ? 'bg-emerald-600 hover:bg-emerald-700' 
                                            : 'bg-slate-900 hover:bg-red-500'
                                    }`}
                                >
                                    {isMaintenanceMode ? '关闭维护模式' : '开启维护模式'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 指示性说明 */}
                {!activeDangerAction && (
                    <div className="mt-8 text-center text-xs font-bold text-slate-400 border-2 border-dashed border-slate-200 p-8 rounded-3xl">
                        ← 请选择上方任一高危敏感指令卡片，右侧 1/3 数据看板将即刻载入该指令的安全影响评估与解锁确认流程。
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
