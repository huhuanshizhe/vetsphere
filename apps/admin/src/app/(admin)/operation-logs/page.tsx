'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  Button,
  Input,
  Select,
  LoadingState,
  EmptyState,
  StatCard,
  TableContainer,
  Pagination,
} from '@/components/ui';

interface OperationLog {
  id: string;
  admin_user_id: string;
  module: string;
  action: string;
  target_type?: string;
  target_id?: string;
  target_name?: string;
  changes_summary?: string;
  ip_address?: string;
  created_at: string;
  admin_user?: { email: string; display_name?: string };
}

const PAGE_SIZE = 30;

const MODULE_LABELS: Record<string, string> = {
  course: '课程', product: '商品', order: '订单', community: '社区',
  ai: 'AI', instructor: '讲师', system: '系统', doctor_verify: '医生审核',
  growth: '成长体系', route: '路由', cms: '内容', lead: '线索',
  course_product: '课程商品', notification: '通知',
};

export default function OperationLogsPage() {
  const supabase = createClient();

  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [filterModule, setFilterModule] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadLogs();
  }, [filterModule, filterAction, searchKeyword, page]);

  async function loadLogs() {
    setLoading(true);
    try {
      let query = supabase
        .from('admin_audit_logs')
        .select(`
          id, admin_user_id, module, action, target_type, target_id, target_name,
          changes_summary, ip_address, created_at,
          admin_users:admin_user_id(email, display_name)
        `, { count: 'exact' });

      if (filterModule) query = query.eq('module', filterModule);
      if (filterAction) query = query.eq('action', filterAction);
      if (searchKeyword) {
        query = query.or(`target_name.ilike.%${searchKeyword}%,changes_summary.ilike.%${searchKeyword}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });

      const { data, count, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((l: any) => ({
        ...l,
        admin_user: Array.isArray(l.admin_users) ? l.admin_users[0] : l.admin_users,
      }));

      setLogs(mapped);
      setTotal(count || 0);

      // Today count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from('admin_audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      setStats({ total: count || 0, today: todayCount || 0 });
    } catch (error) {
      console.error('加载操作日志失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">操作日志</h1>
        <p className="text-slate-500 mt-1">查看管理员操作记录与审计日志</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="总记录数" value={stats.total} />
        <StatCard label="今日操作" value={stats.today} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索操作目标或摘要..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
          </div>
          <div className="w-full md:w-40">
            <select
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer"
              value={filterModule}
              onChange={(e) => { setFilterModule(e.target.value); setPage(1); }}
            >
              <option value="" className="bg-slate-900">全部模块</option>
              {Object.entries(MODULE_LABELS).map(([k, v]) => (
                <option key={k} value={k} className="bg-slate-900">{v}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-40">
            <Select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              options={[
                { value: '', label: '全部操作' },
                { value: 'create', label: '创建' },
                { value: 'update', label: '更新' },
                { value: 'delete', label: '删除' },
                { value: 'publish', label: '发布' },
                { value: 'offline', label: '下线' },
                { value: 'feature', label: '推荐' },
                { value: 'enable', label: '启用' },
                { value: 'disable', label: '禁用' },
              ]}
            />
          </div>
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : logs.length === 0 ? (
          <EmptyState title="暂无操作日志" description="当前筛选条件下没有找到日志记录" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">时间</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">操作人</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">模块</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">操作</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">操作目标</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">摘要</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">
                        {log.admin_user?.display_name || log.admin_user?.email || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                          {MODULE_LABELS[log.module] || log.module}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-500/20 text-slate-600">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-900 text-sm max-w-[200px]">
                        <span className="line-clamp-1">{log.target_name || '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm max-w-[250px]">
                        <span className="line-clamp-1">{log.changes_summary || '-'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200/50">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
