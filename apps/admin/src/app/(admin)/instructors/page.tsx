'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
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

interface Instructor {
  id: string;
  name: string;
  title?: string;
  specialty?: string;
  avatar_url?: string;
  bio?: string;
  credentials?: string[];
  is_active: boolean;
  course_count?: number;
  created_at: string;
  updated_at: string;
  site_views?: InstructorSiteView[];
}

interface InstructorSiteView {
  id: string;
  instructor_id: string;
  site_code: string;
  is_enabled: boolean;
  display_name?: string;
  bio_override?: string;
}

type ViewTab = 'base' | 'site';
const PAGE_SIZE = 20;

export default function InstructorsPage() {
  const supabase = createClient();
  const { currentSite } = useSite();

  const [viewTab, setViewTab] = useState<ViewTab>('base');
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [siteViews, setSiteViews] = useState<(InstructorSiteView & { instructor?: Instructor })[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterActive, setFilterActive] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [editForm, setEditForm] = useState({ name: '', title: '', specialty: '', bio: '' });
  const [dialogLoading, setDialogLoading] = useState(false);

  const [showToggleDialog, setShowToggleDialog] = useState(false);
  const [instructorToToggle, setInstructorToToggle] = useState<Instructor | null>(null);

  const [initLoading, setInitLoading] = useState<string | null>(null);

  useEffect(() => {
    if (viewTab === 'base') {
      loadInstructors();
    } else {
      loadSiteViews();
    }
  }, [searchKeyword, filterActive, page, viewTab, currentSite]);

  async function loadInstructors() {
    setLoading(true);
    try {
      let query = supabase
        .from('instructors')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

      if (filterActive === 'active') query = query.eq('is_active', true);
      if (filterActive === 'inactive') query = query.eq('is_active', false);
      if (searchKeyword) {
        query = query.or(`name.ilike.%${searchKeyword}%,specialty.ilike.%${searchKeyword}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });

      const { data, count, error } = await query;
      if (error) throw error;

      setInstructors(data || []);
      setTotal(count || 0);

      // Attach site views
      const ids = (data || []).map(i => i.id);
      if (ids.length > 0) {
        const { data: views } = await supabase
          .from('instructor_site_views')
          .select('instructor_id, site_code, is_enabled')
          .in('instructor_id', ids);
        if (views) {
          const viewMap: Record<string, any[]> = {};
          views.forEach(v => {
            if (!viewMap[v.instructor_id]) viewMap[v.instructor_id] = [];
            viewMap[v.instructor_id].push(v);
          });
          setInstructors(prev => prev.map(i => ({ ...i, site_views: viewMap[i.id] || [] })));
        }
      }

      await loadStats();
    } catch (error) {
      console.error('加载讲师列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSiteViews() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('instructor_site_views')
        .select(`*, instructor:instructors(id, name, title, specialty, avatar_url, is_active)`)
        .eq('site_code', currentSite);
      if (error) throw error;
      setSiteViews(data || []);
    } catch (error) {
      console.error('加载站点视图失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const [totalRes, activeRes, inactiveRes] = await Promise.all([
      supabase.from('instructors').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('instructors').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_active', true),
      supabase.from('instructors').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_active', false),
    ]);
    setStats({
      total: totalRes.count || 0,
      active: activeRes.count || 0,
      inactive: inactiveRes.count || 0,
    });
  }

  async function handleInitSiteView(instructorId: string) {
    setInitLoading(instructorId);
    try {
      const { error } = await supabase
        .from('instructor_site_views')
        .upsert({ instructor_id: instructorId, site_code: currentSite, is_enabled: true }, { onConflict: 'instructor_id,site_code' });
      if (error) throw error;
      loadInstructors();
    } catch (error) {
      console.error('初始化站点视图失败:', error);
    } finally {
      setInitLoading(null);
    }
  }

  function openCreateDialog() {
    setEditingInstructor(null);
    setEditForm({ name: '', title: '', specialty: '', bio: '' });
    setShowEditDialog(true);
  }

  function openEditDialog(instructor: Instructor) {
    setEditingInstructor(instructor);
    setEditForm({
      name: instructor.name,
      title: instructor.title || '',
      specialty: instructor.specialty || '',
      bio: instructor.bio || '',
    });
    setShowEditDialog(true);
  }

  async function handleSave() {
    if (!editForm.name.trim()) return;
    setDialogLoading(true);
    try {
      if (editingInstructor) {
        const { error } = await supabase
          .from('instructors')
          .update({
            name: editForm.name,
            title: editForm.title || null,
            specialty: editForm.specialty || null,
            bio: editForm.bio || null,
          })
          .eq('id', editingInstructor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('instructors')
          .insert({
            name: editForm.name,
            title: editForm.title || null,
            specialty: editForm.specialty || null,
            bio: editForm.bio || null,
            is_active: true,
          });
        if (error) throw error;
      }

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'instructor',
        action: editingInstructor ? 'update' : 'create',
        target_type: 'instructor',
        target_id: editingInstructor?.id,
        target_name: editForm.name,
        changes_summary: `${editingInstructor ? '更新' : '创建'}讲师: ${editForm.name}`,
      });

      setShowEditDialog(false);
      loadInstructors();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  async function handleToggleActive() {
    if (!instructorToToggle) return;
    setDialogLoading(true);
    try {
      const newActive = !instructorToToggle.is_active;
      const { error } = await supabase
        .from('instructors')
        .update({ is_active: newActive })
        .eq('id', instructorToToggle.id);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'instructor',
        action: newActive ? 'activate' : 'deactivate',
        target_type: 'instructor',
        target_id: instructorToToggle.id,
        target_name: instructorToToggle.name,
        changes_summary: `${newActive ? '启用' : '禁用'}讲师: ${instructorToToggle.name}`,
      });

      setShowToggleDialog(false);
      setInstructorToToggle(null);
      loadInstructors();
    } catch (error) {
      console.error('操作失败:', error);
    } finally {
      setDialogLoading(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">讲师管理</h1>
          <p className="text-slate-400 mt-1">管理平台讲师与授课人员</p>
        </div>
        <Button onClick={openCreateDialog}>新建讲师</Button>
      </div>

      {/* 视图切换 */}
      <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1 w-fit">
        <button
          onClick={() => { setViewTab('base'); setPage(1); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewTab === 'base' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >Base 资源库</button>
        <button
          onClick={() => { setViewTab('site'); setPage(1); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewTab === 'site' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >{currentSite === 'cn' ? '🇨🇳 CN' : '🌐 INTL'} 站点视图</button>
      </div>

      {viewTab === 'base' ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="总讲师数" value={stats.total} />
            <StatCard label="已启用" value={stats.active} />
            <StatCard label="已禁用" value={stats.inactive} />
          </div>

          <Card>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="搜索讲师姓名、专业..."
                  value={searchKeyword}
                  onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                />
              </div>
              <div className="w-full md:w-40">
                <Select
                  value={filterActive}
                  onChange={(e) => { setFilterActive(e.target.value); setPage(1); }}
                  options={[
                    { value: '', label: '全部状态' },
                    { value: 'active', label: '已启用' },
                    { value: 'inactive', label: '已禁用' },
                  ]}
                />
              </div>
            </div>
          </Card>

          <Card padding="none">
            {loading ? (
              <LoadingState />
            ) : instructors.length === 0 ? (
              <EmptyState title="暂无讲师" description="点击上方按钮创建第一位讲师" />
            ) : (
              <>
                <TableContainer>
                  <table className="w-full">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">讲师</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">职称</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">专业</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">站点视图</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {instructors.map((instructor) => (
                        <tr key={instructor.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden">
                                {instructor.avatar_url ? (
                                  <img src={instructor.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-lg font-bold">
                                    {instructor.name[0]}
                                  </div>
                                )}
                              </div>
                              <span className="font-medium text-white">{instructor.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-300 text-sm">{instructor.title || '-'}</td>
                          <td className="px-6 py-4 text-slate-400 text-sm">{instructor.specialty || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${instructor.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                              {instructor.is_active ? '已启用' : '已禁用'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1.5">
                              {(instructor.site_views || []).map(sv => (
                                <span key={sv.site_code} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${sv.is_enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                  {sv.site_code.toUpperCase()}
                                </span>
                              ))}
                              {(!instructor.site_views || instructor.site_views.length === 0) && (
                                <span className="text-slate-600 text-xs">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="secondary" size="sm" onClick={() => openEditDialog(instructor)}>编辑</Button>
                              {!(instructor.site_views || []).find(v => v.site_code === currentSite) && instructor.is_active && (
                                <Button variant="ghost" size="sm" loading={initLoading === instructor.id} onClick={() => handleInitSiteView(instructor.id)}>
                                  初始化{currentSite.toUpperCase()}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setInstructorToToggle(instructor); setShowToggleDialog(true); }}
                              >
                                {instructor.is_active ? '禁用' : '启用'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableContainer>
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-slate-700/50">
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      ) : (
        <>
          <Card padding="none">
            {loading ? (
              <LoadingState />
            ) : siteViews.length === 0 ? (
              <EmptyState icon="🌐" title={`暂无 ${currentSite.toUpperCase()} 站点视图`} description="请先在 Base 资源库中为讲师初始化站点视图" />
            ) : (
              <TableContainer>
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">讲师</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">显示名称</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">启用</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {siteViews.map((sv) => (
                      <tr key={sv.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-white font-medium">{(sv as any).instructor?.name || sv.instructor_id}</td>
                        <td className="px-6 py-4 text-slate-300 text-sm">{sv.display_name || <span className="text-slate-600">继承 Base</span>}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sv.is_enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {sv.is_enabled ? '已启用' : '已禁用'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="secondary" size="sm" onClick={async () => {
                            await supabase.from('instructor_site_views').update({ is_enabled: !sv.is_enabled }).eq('id', sv.id);
                            loadSiteViews();
                          }}>
                            {sv.is_enabled ? '禁用' : '启用'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            )}
          </Card>
        </>
      )}

      {/* 编辑/新建对话框 */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowEditDialog(false)} />
          <div className="relative bg-slate-950 border border-slate-700/50 rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">{editingInstructor ? '编辑讲师' : '新建讲师'}</h3>
            <div className="space-y-4">
              <Input label="姓名 *" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="讲师姓名" />
              <Input label="职称" value={editForm.title} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="如：副教授、主任医师" />
              <Input label="专业方向" value={editForm.specialty} onChange={(e) => setEditForm(f => ({ ...f, specialty: e.target.value }))} placeholder="如：小动物外科" />
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400">简介</label>
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 min-h-[80px]"
                  value={editForm.bio}
                  onChange={(e) => setEditForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="讲师简介..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowEditDialog(false)}>取消</Button>
              <Button onClick={handleSave} loading={dialogLoading} disabled={!editForm.name.trim()}>保存</Button>
            </div>
          </div>
        </div>
      )}

      {/* 启用/禁用确认 */}
      <ConfirmDialog
        open={showToggleDialog}
        title={instructorToToggle?.is_active ? '禁用讲师' : '启用讲师'}
        message={`确定要${instructorToToggle?.is_active ? '禁用' : '启用'}讲师 "${instructorToToggle?.name}" 吗？`}
        confirmText="确认"
        onConfirm={handleToggleActive}
        onCancel={() => { setShowToggleDialog(false); setInstructorToToggle(null); }}
        loading={dialogLoading}
        danger={instructorToToggle?.is_active}
      />
    </div>
  );
}
