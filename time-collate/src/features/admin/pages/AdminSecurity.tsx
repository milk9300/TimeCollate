import { useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { ShieldCheck, ShieldAlert, Lock, Shield, Eye } from 'lucide-react';

interface AuditLog {
    id: string;
    operator: string;
    action: string;
    ip: string;
    time: string;
    risk: 'low' | 'medium' | 'high';
}

export function AdminSecurity() {
    const [mfaEnabled, setMfaEnabled] = useState(true);
    const [sessionTimeout, setSessionTimeout] = useState('120'); // 分钟
    const [pwdComplexity, setPwdComplexity] = useState('high');

    // 模拟审核日志数据
    const auditLogs: AuditLog[] = [
        { id: '1', operator: '刘书淮 (SuperAdmin)', action: '更新系统全局公告', ip: '127.0.0.1', time: '12:08:15', risk: 'medium' },
        { id: '2', operator: '刘书淮 (SuperAdmin)', action: '封禁违规用户: 拾光倒影 (@sunset_coll)', ip: '127.0.0.1', time: '11:30:10', risk: 'high' },
        { id: '3', operator: '运维主管', action: '执行 CDN 全球缓存刷新: /templates/modern_a4.json', ip: '183.12.92.15', time: '10:45:00', risk: 'low' },
        { id: '4', operator: '运维主管', action: 'OSS 存储防盗链白名单参数同步', ip: '183.12.92.15', time: '10:43:12', risk: 'medium' },
    ];

    const handleSaveSecurity = () => {
        alert('安全加固策略已在全球服务器应用并生效！');
    };

    return (
        <AdminLayout title="安全策略与审计日志">
            <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
                {/* 页面头部 */}
                <div className="mb-8">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">安全策略与审计</h2>
                    <p className="text-slate-500 font-medium">配置后台运维防御堡垒策略，审查所有超级管理员的敏感行为审计痕迹。</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* 安全防御参数配置 */}
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-6 lg:col-span-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-650 rounded-xl flex items-center justify-center">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900">安全防护堡垒加固</h3>
                                <p className="text-xs text-slate-400 font-bold mt-0.5">控制后台账号的安全参数与会话策略。</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* MFA 开关 */}
                            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                                <div>
                                    <span className="text-xs font-black text-slate-800 block">管理员两步验证 (MFA)</span>
                                    <span className="text-[10px] text-slate-400 font-bold">登录后台时强制进行 Google Authenticator 认证</span>
                                </div>
                                <button
                                    onClick={() => setMfaEnabled(!mfaEnabled)}
                                    className={`w-10 h-6 rounded-full p-0.5 cursor-pointer transition-colors ${mfaEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${mfaEnabled ? 'translate-x-4' : ''}`}></div>
                                </button>
                            </div>

                            {/* 会话过期限制 */}
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">管理员会话失效时长 (Session Lifetime)</span>
                                <select 
                                    value={sessionTimeout}
                                    onChange={(e) => setSessionTimeout(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                >
                                    <option value="30">30 分钟无操作自动退出</option>
                                    <option value="60">60 分钟无操作自动退出</option>
                                    <option value="120">120 分钟无操作自动退出</option>
                                    <option value="240">4 小时无操作自动退出</option>
                                </select>
                            </div>

                            {/* 密码强度规则 */}
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">管理员密码复杂度基准</span>
                                <div className="flex gap-2 text-xs font-bold">
                                    {[
                                        { id: 'medium', name: '中等 (八位+大小写)' },
                                        { id: 'high', name: '严苛 (特殊字符+数字)' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setPwdComplexity(opt.id)}
                                            className={`flex-1 py-2.5 rounded-xl border transition-all cursor-pointer ${
                                                pwdComplexity === opt.id
                                                    ? 'bg-slate-900 text-white border-slate-950 shadow-sm'
                                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200/50'
                                            }`}
                                        >
                                            {opt.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSaveSecurity}
                                className="w-full py-3.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/10 transition-all active:scale-95 cursor-pointer"
                            >
                                保存加固设置
                            </button>
                        </div>
                    </div>

                    {/* 审计日志列表 */}
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 lg:col-span-2">
                        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                            <span>敏感行为审计日志流 (Audit Trail)</span>
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">{auditLogs.length}</span>
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="py-4 px-2">操作主谋</th>
                                        <th className="py-4 px-2">执行命令/变更</th>
                                        <th className="py-4 px-2">来源 IP</th>
                                        <th className="py-4 px-2">风险等级</th>
                                        <th className="py-4 px-2 text-right">时间</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-655">
                                    {auditLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-2 text-slate-800 font-black">{log.operator}</td>
                                            <td className="py-4 px-2 text-slate-600 font-bold">{log.action}</td>
                                            <td className="py-4 px-2 font-mono text-slate-500">{log.ip}</td>
                                            <td className="py-4 px-2">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                    log.risk === 'high' ? 'bg-red-50 text-red-500 border border-red-100/50' :
                                                    log.risk === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-100/50' :
                                                    'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {log.risk === 'high' ? '高危 (High)' :
                                                     log.risk === 'medium' ? '敏感 (Medium)' : '安全 (Low)'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-2 text-right text-slate-450 font-mono">{log.time}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
