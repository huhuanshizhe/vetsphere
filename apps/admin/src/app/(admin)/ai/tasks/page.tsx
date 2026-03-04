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

interface AiTask {
  id: string;
  task_key: string;
  name: string;
  description?: string;
  prompt_template: string;
  model_provider?: string;
  model_name?: string;
  is_active: boolean;
  category?: string;
  max_tokens?: number;
  temperature?: number;
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 20;

export default function AiTasksPage() {
  const supabase = createClient();

  const [tasks, setTasks] = useState<AiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<AiTask | null>(null);
  const [editForm, setEditForm] = useState({
    task_key: '', name: '', description: '', prompt_template: '',
    model_provider: '', model_name: '', category: '', max_tokens: 1024, temperature: 0.7,
  });
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [searchKeyword, page]);

  async function loadTasks() {
    setLoading(true);
    try {
      let query = supabase
        .from('ai_task_templates')
        .select('*', { count: 'exact' });

      if (searchKeyword) {
        query = query.or(`name.ilike.%${searchKeyword}%,task_key.ilike.%${searchKeyword}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });

      const { data, count, error } = await query;
      if (error) throw error;

      setTasks(data || []);
      setTotal(count || 0);

      const { count: activeCount } = await supabase
        .from('ai_task_templates')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      setStats({ total: count || 0, active: activeCount || 0 });
    } catch (error) {
      console.error('加载任务模板失败:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingTask(null);
    setEditForm({
      task_key: '', name: '', description: '', prompt_template: '',
      model_provider: '', model_name: '', category: '', max_tokens: 1024, temperature: 0.7,
    });
    setShowEditDialog(true);
  }

  function openEdit(task: AiTask) {
    setEditingTask(task);
    setEditForm({
      task_key: task.task_key,
      name: task.name,
      description: task.description || '',
      prompt_template: task.prompt_template,
      model_provider: task.model_provider || '',
      model_name: task.model_name || '',
      category: task.category || '',
      max_tokens: task.max_tokens || 1024,
      temperature: task.temperature || 0.7,
    });
    setShowEditDialog(true);
  }

  async function handleSave() {
    if (!editForm.task_key.trim() || !editForm.name.trim() || !editForm.prompt_template.trim()) return;
    setDialogLoading(true);
    try {
      const payload = {
        task_key: editForm.task_key.trim(),
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        prompt_template: editForm.prompt_template,
        model_provider: editForm.model_provider.trim() || null,
        model_name: editForm.model_name.trim() || null,
        category: editForm.category.trim() || null,
        max_tokens: editForm.max_tokens,
        temperature: editForm.temperature,
        is_active: true,
      };

      if (editingTask) {
        const { error } = await supabase.from('ai_task_templates').update(payload).eq('id', editingTask.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_task_templates').insert(payload);
        if (error) throw error;
      }

      setShowEditDialog(false);
      loadTasks();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  async function handleToggle(task: AiTask) {
    try {
      const { error } = await supabase.from('ai_task_templates').update({ is_active: !task.is_active }).eq('id', task.id);
      if (error) throw error;
      loadTasks();
    } catch (error) {
      console.error('操作失败:', error);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI 任务模板</h1>
          <p className="text-slate-400 mt-1">管理 AI 任务的 Prompt 模板和模型配置</p>
        </div>
        <Button onClick={openCreate}>新增模板</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="总模板数" value={stats.total} />
        <StatCard label="已启用" value={stats.active} />
      </div>

      <Card>
        <Input
          placeholder="搜索任务名称或 Key..."
          value={searchKeyword}
          onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
        />
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : tasks.length === 0 ? (
          <EmptyState title="暂无任务模板" description="点击上方按钮创建第一个 AI 任务模板" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">任务</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Key</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">分类</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">模型</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">参数</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <span className="text-white font-medium">{task.name}</span>
                          {task.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{task.description}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4"><code className="text-sm text-emerald-400">{task.task_key}</code></td>
                      <td className="px-6 py-4 text-slate-400 text-sm">{task.category || '-'}</td>
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        {task.model_provider ? `${task.model_provider}/${task.model_name}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        <div>tokens: {task.max_tokens}</div>
                        <div>temp: {task.temperature}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          task.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {task.is_active ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(task)}>编辑</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleToggle(task)}>
                            {task.is_active ? '禁用' : '启用'}
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

      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowEditDialog(false)} />
          <div className="relative bg-slate-950 border border-slate-700/50 rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">{editingTask ? '编辑任务模板' : '新增任务模板'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Task Key *" value={editForm.task_key} onChange={(e) => setEditForm(f => ({ ...f, task_key: e.target.value }))} placeholder="如：course_summary" disabled={!!editingTask} />
                <Input label="名称 *" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="如：课程摘要生成" />
              </div>
              <Input label="描述" value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="任务描述" />
              <div className="grid grid-cols-3 gap-4">
                <Input label="分类" value={editForm.category} onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))} placeholder="如：content" />
                <Input label="模型供应商" value={editForm.model_provider} onChange={(e) => setEditForm(f => ({ ...f, model_provider: e.target.value }))} placeholder="gemini" />
                <Input label="模型名称" value={editForm.model_name} onChange={(e) => setEditForm(f => ({ ...f, model_name: e.target.value }))} placeholder="gemini-1.5-flash" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Max Tokens" type="number" value={String(editForm.max_tokens)} onChange={(e) => setEditForm(f => ({ ...f, max_tokens: parseInt(e.target.value) || 1024 }))} />
                <Input label="Temperature" type="number" value={String(editForm.temperature)} onChange={(e) => setEditForm(f => ({ ...f, temperature: parseFloat(e.target.value) || 0.7 }))} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400">Prompt 模板 *</label>
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 font-mono min-h-[200px]"
                  value={editForm.prompt_template}
                  onChange={(e) => setEditForm(f => ({ ...f, prompt_template: e.target.value }))}
                  placeholder="请输入 Prompt 模板，支持 {{variable}} 变量..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowEditDialog(false)}>取消</Button>
              <Button onClick={handleSave} loading={dialogLoading} disabled={!editForm.task_key.trim() || !editForm.name.trim() || !editForm.prompt_template.trim()}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
