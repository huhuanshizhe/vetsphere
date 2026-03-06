'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ComingSoonTemplate } from '@/types/admin';
import {
  Card,
  Button,
  Input,
  StatusBadge,
  LoadingState,
  EmptyState,
  ConfirmDialog,
  StatCard,
  TableContainer,
} from '@/components/ui';

export default function ComingSoonTemplatesPage() {
  const supabase = createClient();
  
  const [templates, setTemplates] = useState<ComingSoonTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  
  // 编辑弹窗
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ComingSoonTemplate | null>(null);
  const [editForm, setEditForm] = useState({
    code: '',
    name: '',
    title: '',
    subtitle: '',
    description: '',
    primary_button_text: '',
    primary_button_link: '',
    secondary_button_text: '',
    secondary_button_link: '',
    is_active: true,
  });
  const [dialogLoading, setDialogLoading] = useState(false);
  
  // 删除确认
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ComingSoonTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('coming_soon_templates')
        .select('*')
        .order('created_at');
      
      if (error) throw error;
      
      setTemplates(data || []);
      
      const activeCount = (data || []).filter(t => t.is_active).length;
      setStats({
        total: (data || []).length,
        active: activeCount,
      });
    } catch (error) {
      console.error('加载模板失败:', error);
    } finally {
      setLoading(false);
    }
  }

  // 打开编辑弹窗
  function openEditDialog(template?: ComingSoonTemplate) {
    if (template) {
      setEditingTemplate(template);
      setEditForm({
        code: template.code,
        name: template.name,
        title: template.title,
        subtitle: template.subtitle || '',
        description: template.description || '',
        primary_button_text: template.primary_button_text || '',
        primary_button_link: template.primary_button_link || '',
        secondary_button_text: template.secondary_button_text || '',
        secondary_button_link: template.secondary_button_link || '',
        is_active: template.is_active,
      });
    } else {
      setEditingTemplate(null);
      setEditForm({
        code: '',
        name: '',
        title: '',
        subtitle: '',
        description: '',
        primary_button_text: '',
        primary_button_link: '',
        secondary_button_text: '',
        secondary_button_link: '',
        is_active: true,
      });
    }
    setShowEditDialog(true);
  }

  // 保存模板
  async function handleSaveTemplate() {
    if (!editForm.code || !editForm.name || !editForm.title) return;
    
    setDialogLoading(true);
    try {
      const templateData = {
        code: editForm.code,
        name: editForm.name,
        title: editForm.title,
        subtitle: editForm.subtitle || null,
        description: editForm.description || null,
        primary_button_text: editForm.primary_button_text || null,
        primary_button_link: editForm.primary_button_link || null,
        secondary_button_text: editForm.secondary_button_text || null,
        secondary_button_link: editForm.secondary_button_link || null,
        is_active: editForm.is_active,
      };
      
      if (editingTemplate) {
        const { error } = await supabase
          .from('coming_soon_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('coming_soon_templates')
          .insert(templateData);
        
        if (error) throw error;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'route',
        action: editingTemplate ? 'update' : 'create',
        target_type: 'coming_soon_template',
        target_id: editingTemplate?.id,
        target_name: editForm.name,
        changes_summary: `${editingTemplate ? '更新' : '创建'}占位页模板: ${editForm.name}`,
      });
      
      setShowEditDialog(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  // 删除模板
  async function handleDeleteTemplate() {
    if (!templateToDelete) return;
    
    setDialogLoading(true);
    try {
      const { error } = await supabase
        .from('coming_soon_templates')
        .delete()
        .eq('id', templateToDelete.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'route',
        action: 'delete',
        target_type: 'coming_soon_template',
        target_name: templateToDelete.name,
        changes_summary: `删除占位页模板: ${templateToDelete.name}`,
      });
      
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
      loadTemplates();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">占位页模板</h1>
          <p className="text-slate-500 mt-1">管理"即将上线"页面的展示模板</p>
        </div>
        <Button onClick={() => openEditDialog()}>
          新建模板
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="总模板数" value={stats.total} />
        <StatCard label="已启用" value={stats.active} />
      </div>

      {/* 模板列表 */}
      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : templates.length === 0 ? (
          <EmptyState
            title="暂无模板"
            description="点击上方按钮创建第一个占位页模板"
          />
        ) : (
          <TableContainer>
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">模板名称</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">代码</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">标题</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900">{template.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm text-slate-500 bg-white px-2 py-1 rounded">
                        {template.code}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {template.title}
                    </td>
                    <td className="px-6 py-4">
                      {template.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                          已启用
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-500">
                          已禁用
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditDialog(template)}
                        >
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTemplateToDelete(template);
                            setShowDeleteDialog(true);
                          }}
                        >
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        )}
      </Card>

      {/* 编辑弹窗 */}
      {showEditDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingTemplate ? '编辑模板' : '新建模板'}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="模板代码"
                placeholder="如: course_coming_soon"
                value={editForm.code}
                onChange={(e) => setEditForm(prev => ({ ...prev, code: e.target.value }))}
                disabled={!!editingTemplate}
              />
              <Input
                label="模板名称"
                placeholder="如: 课程即将上线"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
              <div className="col-span-2">
                <Input
                  label="页面标题"
                  placeholder="如: 精彩课程即将上线"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="副标题"
                  placeholder="如: 敬请期待..."
                  value={editForm.subtitle}
                  onChange={(e) => setEditForm(prev => ({ ...prev, subtitle: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  描述
                </label>
                <textarea
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[80px]"
                  placeholder="详细描述..."
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <Input
                label="主按钮文字"
                placeholder="如: 返回首页"
                value={editForm.primary_button_text}
                onChange={(e) => setEditForm(prev => ({ ...prev, primary_button_text: e.target.value }))}
              />
              <Input
                label="主按钮链接"
                placeholder="如: /"
                value={editForm.primary_button_link}
                onChange={(e) => setEditForm(prev => ({ ...prev, primary_button_link: e.target.value }))}
              />
              <Input
                label="次按钮文字"
                placeholder="如: 浏览课程"
                value={editForm.secondary_button_text}
                onChange={(e) => setEditForm(prev => ({ ...prev, secondary_button_text: e.target.value }))}
              />
              <Input
                label="次按钮链接"
                placeholder="如: /courses"
                value={editForm.secondary_button_link}
                onChange={(e) => setEditForm(prev => ({ ...prev, secondary_button_link: e.target.value }))}
              />
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-200 bg-slate-100 text-emerald-500"
                  />
                  <span className="text-sm text-slate-600">启用此模板</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingTemplate(null);
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleSaveTemplate}
                loading={dialogLoading}
                disabled={!editForm.code || !editForm.name || !editForm.title}
              >
                {editingTemplate ? '保存' : '创建'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="删除模板"
        message={`确定要删除模板 "${templateToDelete?.name}" 吗？此操作不可撤销。`}
        confirmText="确认删除"
        onConfirm={handleDeleteTemplate}
        onCancel={() => {
          setShowDeleteDialog(false);
          setTemplateToDelete(null);
        }}
        loading={dialogLoading}
        danger
      />
    </div>
  );
}
