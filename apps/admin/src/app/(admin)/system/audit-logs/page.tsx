'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AdminAuditLog } from '@/types/admin';
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

const PAGE_SIZE = 30;

export default function AuditLogsPage() {
  const supabase = createClient();
  
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });
  const [filterModule, setFilterModule] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // 详情弹窗
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [filterModule, filterAction, searchKeyword, page]);

  async function loadLogs() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('admin_audit_logs')
        .select('*', { count: 'exact' });
      
      if (filterModule) {
        query = query.eq('module', filterModule);
      }
      
      if (filterAction) {
        query = query.eq('action', filterAction);
      }
      
      if (searchKeyword) {
        query = query.or(`admin_name.ilike.%${searchKeyword}%,target_name.ilike.%${searchKeyword}%,changes_summary.ilike.%${searchKeyword}%`);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      setLogs(data || []);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载操作日志失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { count: todayCount } = await supabase
      .from('admin_audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart);
    
    const { count: weekCount } = await supabase
      .from('admin_audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart);
    
    const { count: monthCount } = await supabase
      .from('admin_audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart);
    
    setStats({
      today: todayCount || 0,
      week: weekCount || 0,
      month: monthCount || 0,
    });
  }

  const moduleLabels: Record<string, string> = {
    doctor_verify: '医生审核',
    user: '用户管理',
    cms: 'CMS内容',
    growth: '成长体系',
    course: '课程管理',
    product: '商品管理',
    route: '路由管理',
    system: '系统设置',
    lead: '线索管理',
    community: '社区管理',
    ai: 'AI功能',
  };

  const actionLabels: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    publish: '发布',
    offline: '下线',
    approve: '通过',
    reject: '拒绝',
    feature: '推荐',
    unfeature: '取消推荐',
    activate: '启用',
    deactivate: '禁用',
    assign_role: '分配角色',
    update_role_permissions: '更新权限',
    create_role: '创建角色',
    delete_role: '删除角色',
    deactivate_admin: '移除管理员',
    update_status: '更新状态',
  };

  const actionColors: Record<string, string> = {
    create: 'bg-blue-500/20 text-blue-400',
    update: 'bg-amber-500/20 text-amber-400',
    delete: 'bg-red-500/20 text-red-400',
    publish: 'bg-emerald-500/20 text-emerald-400',
    offline: 'bg-slate-500/20 text-slate-500',
    approve: 'bg-emerald-500/20 text-emerald-400',
    reject: 'bg-red-500/20 text-red-400',
    feature: 'bg-amber-500/20 text-amber-400',
    unfeature: 'bg-slate-500/20 text-slate-500',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">操作日志</h1>
        <p className="text-slate-500 mt-1">查看管理员操作记录</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="今日操作" value={stats.today} />
        <StatCard label="近7天" value={stats.week} />
        <StatCard label="近30天" value={stats.month} />
      </div>

      {/* 筛选栏 */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索操作人、目标、描述..."
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setPage(1);
              }}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <div className="w-full md:w-40">
            <Select
              value={filterModule}
              onChange={(e) => {
                setFilterModule(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: '全部模块' },
                ...Object.entries(moduleLabels).map(([k, v]) => ({ value: k, label: v })),
              ]}
            />
          </div>
          <div className="w-full md:w-40">
            <Select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: '全部操作' },
                { value: 'create', label: '创建' },
                { value: 'update', label: '更新' },
                { value: 'delete', label: '删除' },
                { value: 'publish', label: '发布' },
                { value: 'offline', label: '下线' },
                { value: 'approve', label: '通过' },
                { value: 'reject', label: '拒绝' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* 日志列表 */}
      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : logs.length === 0 ? (
          <EmptyState
            title="暂无日志"
            description="当前筛选条件下没有找到操作日志"
          />
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
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">目标</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">描述</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">详情</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 text-sm whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-900 text-sm">{log.admin_name || '系统'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600 text-sm">
                          {moduleLabels[log.module] || log.module}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionColors[log.action] || 'bg-slate-500/20 text-slate-500'}`}>
                          {actionLabels[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-slate-900">{log.target_name || '-'}</div>
                          {log.target_type && (
                            <div className="text-slate-500 text-xs">{log.target_type}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm max-w-xs truncate">
                        {log.changes_summary || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(log.old_value || log.new_value) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLog(log);
                              setShowDetailDialog(true);
                            }}
                          >
                            查看
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200/50">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* 详情弹窗 */}
      {showDetailDialog && selectedLog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 my-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">操作详情</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm text-slate-500">操作时间</label>
                <p className="text-slate-900 mt-1">
                  {new Date(selectedLog.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <label className="text-sm text-slate-500">操作人</label>
                <p className="text-slate-900 mt-1">{selectedLog.admin_name || '系统'}</p>
              </div>
              <div>
                <label className="text-sm text-slate-500">模块</label>
                <p className="text-slate-900 mt-1">{moduleLabels[selectedLog.module] || selectedLog.module}</p>
              </div>
              <div>
                <label className="text-sm text-slate-500">操作</label>
                <p className="text-slate-900 mt-1">{actionLabels[selectedLog.action] || selectedLog.action}</p>
              </div>
              <div>
                <label className="text-sm text-slate-500">目标类型</label>
                <p className="text-slate-900 mt-1">{selectedLog.target_type || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-slate-500">目标名称</label>
                <p className="text-slate-900 mt-1">{selectedLog.target_name || '-'}</p>
              </div>
              {selectedLog.ip_address && (
                <div className="col-span-2">
                  <label className="text-sm text-slate-500">IP地址</label>
                  <p className="text-slate-900 mt-1">{selectedLog.ip_address}</p>
                </div>
              )}
            </div>
            
            {selectedLog.changes_summary && (
              <div className="mb-6">
                <label className="text-sm text-slate-500">变更摘要</label>
                <p className="text-slate-900 mt-1">{selectedLog.changes_summary}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              {selectedLog.old_value && (
                <div>
                  <label className="text-sm text-slate-500 mb-2 block">变更前</label>
                  <pre className="bg-slate-900 rounded-lg p-4 text-sm text-slate-600 overflow-auto max-h-60">
                    {JSON.stringify(selectedLog.old_value, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.new_value && (
                <div>
                  <label className="text-sm text-slate-500 mb-2 block">变更后</label>
                  <pre className="bg-slate-900 rounded-lg p-4 text-sm text-slate-600 overflow-auto max-h-60">
                    {JSON.stringify(selectedLog.new_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6 pt-4 border-t border-slate-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDetailDialog(false);
                  setSelectedLog(null);
                }}
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
