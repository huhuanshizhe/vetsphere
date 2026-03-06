'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSite } from '@/context/SiteContext';
import {
  Card,
  Button,
  Input,
  LoadingState,
  EmptyState,
  ConfirmDialog,
  TableContainer,
} from '@/components/ui';

interface ClinicProgram {
  id: string;
  site_code: string;
  name: string;
  slug?: string;
  tagline?: string;
  target_clinic_type?: string;
  support_level?: string;
  expected_outcome?: string;
  display_order: number;
  publish_status: 'draft' | 'published' | 'offline';
  created_at: string;
  updated_at: string;
}

export default function ClinicProgramsPage() {
  const supabase = createClient();
  const { currentSite, isINTL, isGLOBAL } = useSite();

  const [programs, setPrograms] = useState<ClinicProgram[]>([]);
  const [loading, setLoading] = useState(true);

  // 新建弹窗
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newProgram, setNewProgram] = useState({ name: '', slug: '', tagline: '', target_clinic_type: '' });

  // 删除
  const [deleteTarget, setDeleteTarget] = useState<ClinicProgram | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadPrograms();
  }, []);

  async function loadPrograms() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinic_programs')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('加载诊所项目失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newProgram.name) return;
    setCreateLoading(true);
    try {
      const { error } = await supabase.from('clinic_programs').insert({
        name: newProgram.name,
        slug: newProgram.slug || null,
        tagline: newProgram.tagline || null,
        target_clinic_type: newProgram.target_clinic_type || null,
        site_code: 'intl',
        publish_status: 'draft',
      });
      if (error) throw error;
      setShowCreate(false);
      setNewProgram({ name: '', slug: '', tagline: '', target_clinic_type: '' });
      loadPrograms();
    } catch (error) {
      console.error('创建失败:', error);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handlePublish(program: ClinicProgram, status: 'published' | 'offline') {
    try {
      const { error } = await supabase
        .from('clinic_programs')
        .update({ publish_status: status })
        .eq('id', program.id);
      if (error) throw error;
      loadPrograms();
    } catch (error) {
      console.error('操作失败:', error);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase.from('clinic_programs').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      loadPrograms();
    } catch (error) {
      console.error('删除失败:', error);
    } finally {
      setDeleteLoading(false);
    }
  }

  if (!isINTL && !isGLOBAL) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">诊所项目</h1>
          <p className="text-slate-500 mt-1">INTL 国际站专属功能</p>
        </div>
        <EmptyState
          icon="🏥"
          title="请切换到国际站"
          description="诊所项目仅在国际站 (INTL) 模式下可用，请在顶部切换站点。"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">诊所项目</h1>
          <p className="text-slate-500 mt-1">管理国际站诊所解决方案</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>新建项目</Button>
      </div>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : programs.length === 0 ? (
          <EmptyState
            icon="🏥"
            title="暂无诊所项目"
            description="创建面向国际市场的诊所解决方案"
            action={<Button onClick={() => setShowCreate(true)}>创建第一个项目</Button>}
          />
        ) : (
          <TableContainer>
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">项目名称</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">标语</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">目标诊所类型</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">排序</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {programs.map((program) => (
                  <tr key={program.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-medium text-slate-900">{program.name}</span>
                        {program.slug && <div className="text-xs text-slate-500">{program.slug}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{program.tagline || '-'}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{program.target_clinic_type || '-'}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{program.display_order}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        program.publish_status === 'published' ? 'bg-emerald-500/20 text-emerald-400' :
                        program.publish_status === 'offline' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-500'
                      }`}>
                        {program.publish_status === 'published' ? '已发布' : program.publish_status === 'offline' ? '已下线' : '草稿'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {program.publish_status !== 'published' && (
                          <Button size="sm" onClick={() => handlePublish(program, 'published')}>发布</Button>
                        )}
                        {program.publish_status === 'published' && (
                          <Button variant="ghost" size="sm" onClick={() => handlePublish(program, 'offline')}>下线</Button>
                        )}
                        <Button variant="danger" size="sm" onClick={() => setDeleteTarget(program)}>删除</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        )}
      </Card>

      {/* 新建弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div className="relative bg-slate-950 border border-slate-200/50 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">新建诊所项目</h3>
            <div className="space-y-4">
              <Input
                label="项目名称"
                placeholder="e.g. Starter Clinic Package"
                value={newProgram.name}
                onChange={(e) => setNewProgram(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                label="Slug (URL 标识)"
                placeholder="e.g. starter-package"
                value={newProgram.slug}
                onChange={(e) => setNewProgram(prev => ({ ...prev, slug: e.target.value }))}
              />
              <Input
                label="标语"
                placeholder="一句话介绍"
                value={newProgram.tagline}
                onChange={(e) => setNewProgram(prev => ({ ...prev, tagline: e.target.value }))}
              />
              <Input
                label="目标诊所类型"
                placeholder="e.g. General Practice, Dental, Emergency"
                value={newProgram.target_clinic_type}
                onChange={(e) => setNewProgram(prev => ({ ...prev, target_clinic_type: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>取消</Button>
              <Button onClick={handleCreate} loading={createLoading}>创建</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除项目"
        message={`确定要删除诊所项目 "${deleteTarget?.name}" 吗？此操作不可恢复。`}
        confirmText="确认删除"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
        danger
      />
    </div>
  );
}
