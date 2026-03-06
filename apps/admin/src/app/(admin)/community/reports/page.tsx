'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  Button,
  Input,
  Select,
  StatusBadge,
  LoadingState,
  EmptyState,
  ConfirmDialog,
  StatCard,
  TableContainer,
  Pagination,
} from '@/components/ui';

interface Report {
  id: string;
  post_id?: string;
  comment_id?: string;
  reporter_id?: string;
  reporter?: { full_name: string };
  post?: { title: string };
  report_type: string;
  reason?: string;
  status: string;
  action_taken?: string;
  created_at: string;
}

const PAGE_SIZE = 20;

export default function ReportsPage() {
  const supabase = createClient();
  
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [filterType, setFilterType] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [reportToAction, setReportToAction] = useState<Report | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [actionNote, setActionNote] = useState('');
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, [filterStatus, filterType, page]);

  async function loadReports() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('post_reports')
        .select(`
          id, post_id, comment_id, reporter_id, report_type, reason, status, action_taken, created_at,
          profiles:reporter_id (full_name),
          posts:post_id (title)
        `, { count: 'exact' });
      
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }
      if (filterType) {
        query = query.eq('report_type', filterType);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      const mappedReports = (data || []).map((r: any) => ({
        ...r,
        reporter: r.profiles,
        post: r.posts,
      }));
      
      setReports(mappedReports);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载举报列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const [totalRes, pendingRes, resolvedRes] = await Promise.all([
      supabase.from('post_reports').select('*', { count: 'exact', head: true }),
      supabase.from('post_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('post_reports').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
    ]);
    
    setStats({
      total: totalRes.count || 0,
      pending: pendingRes.count || 0,
      resolved: resolvedRes.count || 0,
    });
  }

  async function handleAction() {
    if (!reportToAction || !actionType) return;
    
    setDialogLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('post_reports')
        .update({
          status: actionType === 'dismiss' ? 'dismissed' : 'resolved',
          action_taken: actionNote || (actionType === 'dismiss' ? '驳回举报' : '已处理'),
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportToAction.id);
      
      if (error) throw error;
      
      // 如果处理举报，同时隐藏帖子
      if (actionType === 'resolve' && reportToAction.post_id) {
        await supabase
          .from('posts')
          .update({ status: 'hidden' })
          .eq('id', reportToAction.post_id);
      }
      
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'community',
        action: actionType === 'dismiss' ? 'dismiss_report' : 'resolve_report',
        target_type: 'post_report',
        target_id: reportToAction.id,
        changes_summary: actionNote || (actionType === 'dismiss' ? '驳回举报' : '处理举报'),
      });
      
      setShowActionDialog(false);
      setReportToAction(null);
      setActionType('');
      setActionNote('');
      loadReports();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  const typeLabels: Record<string, string> = {
    spam: '垃圾内容',
    inappropriate: '不当内容',
    harassment: '骚扰',
    copyright: '侵权',
    other: '其他',
  };

  const statusLabels: Record<string, string> = {
    pending: '待处理',
    reviewed: '已审核',
    resolved: '已处理',
    dismissed: '已驳回',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">举报处理</h1>
        <p className="text-slate-500 mt-1">处理用户举报的内容</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="总举报数" value={stats.total} />
        <StatCard label="待处理" value={stats.pending} />
        <StatCard label="已处理" value={stats.resolved} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <Select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部状态' },
              { value: 'pending', label: '待处理' },
              { value: 'resolved', label: '已处理' },
              { value: 'dismissed', label: '已驳回' },
            ]}
          />
          <Select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部类型' },
              { value: 'spam', label: '垃圾内容' },
              { value: 'inappropriate', label: '不当内容' },
              { value: 'harassment', label: '骚扰' },
              { value: 'copyright', label: '侵权' },
              { value: 'other', label: '其他' },
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : reports.length === 0 ? (
          <EmptyState title="暂无举报" description="当前筛选条件下没有找到举报" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">被举报内容</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">举报人</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">举报类型</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">举报原因</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">时间</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-slate-900 line-clamp-1">{report.post?.title || '评论'}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">
                        {report.reporter?.full_name || '匿名'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                          {typeLabels[report.report_type] || report.report_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm max-w-xs truncate">
                        {report.reason || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {new Date(report.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {report.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" onClick={() => { setReportToAction(report); setActionType('resolve'); setShowActionDialog(true); }}>
                              处理
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setReportToAction(report); setActionType('dismiss'); setShowActionDialog(true); }}>
                              驳回
                            </Button>
                          </div>
                        )}
                        {report.status !== 'pending' && (
                          <span className="text-slate-500 text-sm">{report.action_taken || '-'}</span>
                        )}
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

      {showActionDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {actionType === 'resolve' ? '处理举报' : '驳回举报'}
            </h3>
            <p className="text-slate-500 mb-4">
              {actionType === 'resolve' 
                ? '处理该举报将同时隐藏被举报的内容' 
                : '驳回该举报表示内容没有问题'}
            </p>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">处理说明</label>
              <textarea
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[80px]"
                placeholder="输入处理说明..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => { setShowActionDialog(false); setReportToAction(null); setActionType(''); setActionNote(''); }}>
                取消
              </Button>
              <Button onClick={handleAction} loading={dialogLoading} variant={actionType === 'resolve' ? 'primary' : 'danger'}>
                {actionType === 'resolve' ? '确认处理' : '确认驳回'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
