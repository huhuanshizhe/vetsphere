'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSite } from '@/context/SiteContext';
import {
  Card,
  Button,
  Input,
  Select,
  LoadingState,
  EmptyState,
  ConfirmDialog,
  StatCard,
  TableContainer,
  Pagination,
} from '@/components/ui';

interface NotificationTemplate {
  id: string;
  code: string;
  name: string;
  type: string;
  channel: string;
  title_template: string;
  content_template: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

interface Notification {
  id: string;
  user_id: string;
  template_code?: string;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  sent_at: string;
  read_at?: string;
  user?: { full_name: string; email: string };
}

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const supabase = createClient();
  const { currentSite } = useSite();
  
  const [activeTab, setActiveTab] = useState<'templates' | 'history'>('templates');
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ templates: 0, todaySent: 0, unread: 0, readRate: 0 });
  const [filterType, setFilterType] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<NotificationTemplate | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [templateToAction, setTemplateToAction] = useState<NotificationTemplate | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'templates') {
      loadTemplates();
    } else {
      loadNotifications();
    }
  }, [activeTab, filterType, searchKeyword, page, currentSite]);

  async function loadTemplates() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('notification_templates')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .eq('site_code', currentSite);
      
      if (filterType) {
        query = query.eq('type', filterType);
      }
      if (searchKeyword) {
        query = query.or(`name.ilike.%${searchKeyword}%,code.ilike.%${searchKeyword}%`);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      setTemplates(data || []);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载通知模板失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadNotifications() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('notifications')
        .select(`
          *,
          profiles:user_id (full_name, email)
        `, { count: 'exact' })
        .eq('site_code', currentSite);
      
      if (filterType) {
        query = query.eq('type', filterType);
      }
      if (searchKeyword) {
        query = query.ilike('title', `%${searchKeyword}%`);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('sent_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      const mappedNotifications = (data || []).map((n: any) => ({
        ...n,
        user: n.profiles,
      }));
      
      setNotifications(mappedNotifications);
      setTotal(count || 0);
    } catch (error) {
      console.error('加载通知列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const [templatesRes, todayRes, unreadRes, totalNotifRes] = await Promise.all([
      supabase.from('notification_templates').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('site_code', currentSite),
      supabase.from('notifications').select('*', { count: 'exact', head: true }).gte('sent_at', todayStart.toISOString()).eq('site_code', currentSite),
      supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false).eq('site_code', currentSite),
      supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('site_code', currentSite),
    ]);
    
    const totalNotif = totalNotifRes.count || 0;
    const unread = unreadRes.count || 0;
    const readRate = totalNotif > 0 ? Math.round(((totalNotif - unread) / totalNotif) * 100) : 0;
    
    setStats({
      templates: templatesRes.count || 0,
      todaySent: todayRes.count || 0,
      unread,
      readRate,
    });
  }

  async function handleToggleActive() {
    if (!templateToAction) return;
    
    setDialogLoading(true);
    try {
      const { error } = await supabase
        .from('notification_templates')
        .update({ is_active: !templateToAction.is_active })
        .eq('id', templateToAction.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'system',
        action: templateToAction.is_active ? 'disable' : 'enable',
        target_type: 'notification_template',
        target_id: templateToAction.id,
        target_name: templateToAction.name,
        changes_summary: `${templateToAction.is_active ? '禁用' : '启用'}通知模板: ${templateToAction.name}`,
      });
      
      setShowActionDialog(false);
      setTemplateToAction(null);
      loadTemplates();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  const typeLabels: Record<string, string> = {
    system: '系统通知',
    order: '订单通知',
    course: '课程通知',
    community: '社区通知',
    promotion: '推广通知',
  };

  const channelLabels: Record<string, string> = {
    in_app: '站内信',
    push: '推送',
    email: '邮件',
    sms: '短信',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">通知管理</h1>
          <p className="text-slate-500 mt-1">管理通知模板与查看发送记录</p>
        </div>
        <Button onClick={() => { setTemplateToEdit(null); setShowEditDialog(true); }}>
          新建模板
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="模板数量" value={stats.templates} />
        <StatCard label="今日发送" value={stats.todaySent} />
        <StatCard label="未读通知" value={stats.unread} />
        <StatCard label="阅读率" value={`${stats.readRate}%`} />
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
            onClick={() => { setActiveTab('templates'); setPage(1); }}
          >
            通知模板
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
            onClick={() => { setActiveTab('history'); setPage(1); }}
          >
            发送记录
          </button>
        </nav>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder={activeTab === 'templates' ? '搜索模板名称或代码...' : '搜索通知标题...'}
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
          </div>
          <Select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部类型' },
              { value: 'system', label: '系统通知' },
              { value: 'order', label: '订单通知' },
              { value: 'course', label: '课程通知' },
              { value: 'community', label: '社区通知' },
              { value: 'promotion', label: '推广通知' },
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : activeTab === 'templates' ? (
          templates.length === 0 ? (
            <EmptyState title="暂无模板" description="当前筛选条件下没有找到通知模板" />
          ) : (
            <>
              <TableContainer>
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">模板</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">代码</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">类型</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">渠道</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {templates.map((template) => (
                      <tr key={template.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{template.name}</div>
                          <div className="text-slate-500 text-xs mt-1 line-clamp-1">{template.title_template}</div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs bg-slate-100/50 px-2 py-1 rounded text-slate-600">
                            {template.code}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-sm">
                          {typeLabels[template.type] || template.type}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-sm">
                          {channelLabels[template.channel] || template.channel}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            template.is_active
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-500/20 text-slate-500'
                          }`}>
                            {template.is_active ? '启用' : '禁用'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setTemplateToAction(template); setShowActionDialog(true); }}
                            >
                              {template.is_active ? '禁用' : '启用'}
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => { setTemplateToEdit(template); setShowEditDialog(true); }}>
                              编辑
                            </Button>
                          </div>
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
          )
        ) : notifications.length === 0 ? (
          <EmptyState title="暂无记录" description="当前筛选条件下没有找到通知记录" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">时间</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">用户</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">标题</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">类型</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {notifications.map((notification) => (
                    <tr key={notification.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 text-sm whitespace-nowrap">
                        {new Date(notification.sent_at).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-slate-600">{notification.user?.full_name || '未知'}</div>
                          {notification.user?.email && <div className="text-slate-500 text-xs">{notification.user.email}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 line-clamp-1">{notification.title}</div>
                        <div className="text-slate-500 text-xs mt-1 line-clamp-1">{notification.content}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {typeLabels[notification.type] || notification.type}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          notification.is_read
                            ? 'bg-slate-500/20 text-slate-500'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {notification.is_read ? '已读' : '未读'}
                        </span>
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

      <ConfirmDialog
        open={showActionDialog}
        title={templateToAction?.is_active ? '禁用模板' : '启用模板'}
        message={`确定要${templateToAction?.is_active ? '禁用' : '启用'}通知模板 "${templateToAction?.name}" 吗？`}
        confirmText="确认"
        onConfirm={handleToggleActive}
        onCancel={() => { setShowActionDialog(false); setTemplateToAction(null); }}
        loading={dialogLoading}
        danger={templateToAction?.is_active}
      />
    </div>
  );
}
