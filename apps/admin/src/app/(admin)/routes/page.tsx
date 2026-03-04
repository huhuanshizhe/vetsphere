'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RouteRegistry, ComingSoonTemplate, STATUS_COLORS, STATUS_LABELS } from '@/types/admin';
import { useSite } from '@/context/SiteContext';
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

const PAGE_SIZE = 20;

export default function RoutesPage() {
  const supabase = createClient();
  const { currentSite } = useSite();
  
  const [routes, setRoutes] = useState<RouteRegistry[]>([]);
  const [templates, setTemplates] = useState<ComingSoonTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, comingSoon: 0, hidden: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterModule, setFilterModule] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // 编辑弹窗
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteRegistry | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    route_status: 'active' as RouteRegistry['route_status'],
    redirect_target: '',
    placeholder_template_id: '',
    requires_auth: false,
    requires_doctor: false,
  });
  const [dialogLoading, setDialogLoading] = useState(false);
  
  // 新建弹窗
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRoute, setNewRoute] = useState({
    path: '',
    name: '',
    module: '',
    description: '',
    route_status: 'active' as RouteRegistry['route_status'],
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [filterStatus, filterModule, searchKeyword, page, currentSite]);

  async function loadTemplates() {
    const { data } = await supabase
      .from('coming_soon_templates')
      .select('*')
      .eq('is_active', true);
    
    setTemplates(data || []);
  }

  async function loadRoutes() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('route_registry')
        .select('*', { count: 'exact' })
        .eq('site_code', currentSite);
      
      if (filterStatus) {
        query = query.eq('route_status', filterStatus);
      }
      
      if (filterModule) {
        query = query.eq('module', filterModule);
      }
      
      if (searchKeyword) {
        query = query.or(`path.ilike.%${searchKeyword}%,name.ilike.%${searchKeyword}%`);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('module').order('path');
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      setRoutes(data || []);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载路由列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const { count: totalCount } = await supabase
      .from('route_registry')
      .select('*', { count: 'exact', head: true })
      .eq('site_code', currentSite);
    
    const { count: activeCount } = await supabase
      .from('route_registry')
      .select('*', { count: 'exact', head: true })
      .eq('site_code', currentSite)
      .eq('route_status', 'active');
    
    const { count: comingSoonCount } = await supabase
      .from('route_registry')
      .select('*', { count: 'exact', head: true })
      .eq('site_code', currentSite)
      .eq('route_status', 'coming_soon');
    
    const { count: hiddenCount } = await supabase
      .from('route_registry')
      .select('*', { count: 'exact', head: true })
      .eq('site_code', currentSite)
      .eq('route_status', 'hidden');
    
    setStats({
      total: totalCount || 0,
      active: activeCount || 0,
      comingSoon: comingSoonCount || 0,
      hidden: hiddenCount || 0,
    });
  }

  // 获取模块列表
  function getModules(): string[] {
    const modules = new Set(routes.map(r => r.module));
    return Array.from(modules);
  }

  const moduleNames: Record<string, string> = {
    home: '首页',
    courses: '课程',
    growth: '成长体系',
    products: '商品',
    community: '社区',
    doctor: '医生',
    user: '用户',
    auth: '认证',
    admin: '后台',
  };

  // 打开编辑弹窗
  function openEditDialog(route: RouteRegistry) {
    setEditingRoute(route);
    setEditForm({
      name: route.name,
      description: route.description || '',
      route_status: route.route_status,
      redirect_target: route.redirect_target || '',
      placeholder_template_id: route.placeholder_template_id || '',
      requires_auth: route.requires_auth,
      requires_doctor: route.requires_doctor,
    });
    setShowEditDialog(true);
  }

  // 保存编辑
  async function handleSaveEdit() {
    if (!editingRoute) return;
    
    setDialogLoading(true);
    try {
      const { error } = await supabase
        .from('route_registry')
        .update({
          name: editForm.name,
          description: editForm.description || null,
          route_status: editForm.route_status,
          redirect_target: editForm.route_status === 'redirect' ? editForm.redirect_target : null,
          placeholder_template_id: editForm.route_status === 'coming_soon' ? editForm.placeholder_template_id : null,
          requires_auth: editForm.requires_auth,
          requires_doctor: editForm.requires_doctor,
        })
        .eq('id', editingRoute.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'route',
        action: 'update',
        target_type: 'route_registry',
        target_id: editingRoute.id,
        target_name: editingRoute.path,
        changes_summary: `更新路由配置: ${editingRoute.path}`,
      });
      
      setShowEditDialog(false);
      setEditingRoute(null);
      loadRoutes();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  // 创建新路由
  async function handleCreateRoute() {
    if (!newRoute.path || !newRoute.name || !newRoute.module) return;
    
    setDialogLoading(true);
    try {
      const { error } = await supabase
        .from('route_registry')
        .insert({
          path: newRoute.path,
          name: newRoute.name,
          module: newRoute.module,
          description: newRoute.description || null,
          route_status: newRoute.route_status,
          site_code: currentSite,
          requires_auth: false,
          requires_doctor: false,
          requires_admin: false,
        });
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'route',
        action: 'create',
        target_type: 'route_registry',
        target_name: newRoute.path,
        changes_summary: `创建路由: ${newRoute.path}`,
      });
      
      setShowCreateDialog(false);
      setNewRoute({
        path: '',
        name: '',
        module: '',
        description: '',
        route_status: 'active',
      });
      loadRoutes();
    } catch (error) {
      console.error('创建失败:', error);
      alert('创建失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">路由注册表</h1>
          <p className="text-slate-400 mt-1">管理网站页面路由状态与跳转配置</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          新建路由
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总路由数" value={stats.total} />
        <StatCard label="正常" value={stats.active} />
        <StatCard label="占位中" value={stats.comingSoon} />
        <StatCard label="隐藏" value={stats.hidden} />
      </div>

      {/* 筛选栏 */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索路径、名称..."
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
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: '全部状态' },
                { value: 'active', label: '正常' },
                { value: 'coming_soon', label: '占位中' },
                { value: 'hidden', label: '隐藏' },
                { value: 'redirect', label: '重定向' },
              ]}
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
                ...getModules().map(m => ({ value: m, label: moduleNames[m] || m })),
              ]}
            />
          </div>
        </div>
      </Card>

      {/* 列表 */}
      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : routes.length === 0 ? (
          <EmptyState
            title="暂无路由"
            description="点击上方按钮创建第一个路由"
          />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">路径</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">名称</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">模块</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">权限</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {routes.map((route) => (
                    <tr key={route.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <code className="text-sm text-emerald-400 bg-slate-800 px-2 py-1 rounded">
                          {route.path}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-white">{route.name}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {moduleNames[route.module] || route.module}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={route.route_status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {route.requires_auth && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                              登录
                            </span>
                          )}
                          {route.requires_doctor && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                              医生
                            </span>
                          )}
                          {!route.requires_auth && !route.requires_doctor && (
                            <span className="text-slate-500 text-xs">公开</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditDialog(route)}
                        >
                          编辑
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-700/50">
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

      {/* 编辑弹窗 */}
      {showEditDialog && editingRoute && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl max-w-lg w-full p-6 my-8">
            <h3 className="text-lg font-semibold text-white mb-2">
              编辑路由
            </h3>
            <p className="text-emerald-400 text-sm mb-4">{editingRoute.path}</p>
            
            <div className="space-y-4">
              <Input
                label="路由名称"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                label="描述"
                placeholder="路由的用途说明"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              />
              <Select
                label="路由状态"
                value={editForm.route_status}
                onChange={(e) => setEditForm(prev => ({ ...prev, route_status: e.target.value as any }))}
                options={[
                  { value: 'active', label: '正常' },
                  { value: 'coming_soon', label: '占位页' },
                  { value: 'hidden', label: '隐藏' },
                  { value: 'redirect', label: '重定向' },
                ]}
              />
              
              {editForm.route_status === 'coming_soon' && (
                <Select
                  label="占位页模板"
                  value={editForm.placeholder_template_id}
                  onChange={(e) => setEditForm(prev => ({ ...prev, placeholder_template_id: e.target.value }))}
                  options={[
                    { value: '', label: '使用默认模板' },
                    ...templates.map(t => ({ value: t.id, label: t.name })),
                  ]}
                />
              )}
              
              {editForm.route_status === 'redirect' && (
                <Input
                  label="重定向目标"
                  placeholder="/target-path"
                  value={editForm.redirect_target}
                  onChange={(e) => setEditForm(prev => ({ ...prev, redirect_target: e.target.value }))}
                />
              )}
              
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.requires_auth}
                    onChange={(e) => setEditForm(prev => ({ ...prev, requires_auth: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500"
                  />
                  <span className="text-sm text-slate-300">需要登录</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.requires_doctor}
                    onChange={(e) => setEditForm(prev => ({ ...prev, requires_doctor: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500"
                  />
                  <span className="text-sm text-slate-300">需要医生身份</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingRoute(null);
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleSaveEdit}
                loading={dialogLoading}
                disabled={!editForm.name}
              >
                保存
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 新建路由弹窗 */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">新建路由</h3>
            
            <div className="space-y-4">
              <Input
                label="路径"
                placeholder="如: /courses/new-feature"
                value={newRoute.path}
                onChange={(e) => setNewRoute(prev => ({ ...prev, path: e.target.value }))}
              />
              <Input
                label="名称"
                placeholder="如: 新功能页"
                value={newRoute.name}
                onChange={(e) => setNewRoute(prev => ({ ...prev, name: e.target.value }))}
              />
              <Select
                label="所属模块"
                value={newRoute.module}
                onChange={(e) => setNewRoute(prev => ({ ...prev, module: e.target.value }))}
                options={[
                  { value: '', label: '选择模块' },
                  { value: 'home', label: '首页' },
                  { value: 'courses', label: '课程' },
                  { value: 'growth', label: '成长体系' },
                  { value: 'products', label: '商品' },
                  { value: 'community', label: '社区' },
                  { value: 'doctor', label: '医生' },
                  { value: 'user', label: '用户' },
                ]}
              />
              <Select
                label="初始状态"
                value={newRoute.route_status}
                onChange={(e) => setNewRoute(prev => ({ ...prev, route_status: e.target.value as any }))}
                options={[
                  { value: 'active', label: '正常' },
                  { value: 'coming_soon', label: '占位页' },
                  { value: 'hidden', label: '隐藏' },
                ]}
              />
              <Input
                label="描述（可选）"
                placeholder="路由的用途说明"
                value={newRoute.description}
                onChange={(e) => setNewRoute(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewRoute({
                    path: '',
                    name: '',
                    module: '',
                    description: '',
                    route_status: 'active',
                  });
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleCreateRoute}
                loading={dialogLoading}
                disabled={!newRoute.path || !newRoute.name || !newRoute.module}
              >
                创建
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
