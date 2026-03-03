'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GrowthTrack, STATUS_COLORS, STATUS_LABELS } from '@/types/admin';
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
} from '@/components/ui';

export default function GrowthTracksPage() {
  const supabase = createClient();
  
  const [tracks, setTracks] = useState<GrowthTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, ready: 0 });
  const [filterGroup, setFilterGroup] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // 弹窗状态
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTrack, setEditingTrack] = useState<GrowthTrack | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    tagline: '',
    description: '',
    target_audience: '',
    is_active: true,
    is_ready: false,
    fallback_action: 'coming_soon' as 'hide' | 'coming_soon' | 'browse_all',
  });
  const [dialogLoading, setDialogLoading] = useState(false);
  
  const [showToggleDialog, setShowToggleDialog] = useState(false);
  const [trackToToggle, setTrackToToggle] = useState<GrowthTrack | null>(null);

  useEffect(() => {
    loadTracks();
  }, [filterGroup, searchKeyword]);

  async function loadTracks() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('growth_tracks')
        .select('*')
        .order('group_order')
        .order('display_order');
      
      if (filterGroup) {
        query = query.eq('group_name', filterGroup);
      }
      
      if (searchKeyword) {
        query = query.or(`name.ilike.%${searchKeyword}%,slug.ilike.%${searchKeyword}%,tagline.ilike.%${searchKeyword}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setTracks(data || []);
      await loadStats();
    } catch (error) {
      console.error('加载成长方向失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const { count: totalCount } = await supabase
      .from('growth_tracks')
      .select('*', { count: 'exact', head: true });
    
    const { count: activeCount } = await supabase
      .from('growth_tracks')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    const { count: readyCount } = await supabase
      .from('growth_tracks')
      .select('*', { count: 'exact', head: true })
      .eq('is_ready', true);
    
    setStats({
      total: totalCount || 0,
      active: activeCount || 0,
      ready: readyCount || 0,
    });
  }

  // 获取分组列表
  function getGroups(): string[] {
    const groups = new Set(tracks.map(t => t.group_name));
    return Array.from(groups);
  }

  // 打开编辑弹窗
  function openEditDialog(track: GrowthTrack) {
    setEditingTrack(track);
    setEditForm({
      name: track.name,
      tagline: track.tagline || '',
      description: track.description || '',
      target_audience: track.target_audience || '',
      is_active: track.is_active,
      is_ready: track.is_ready,
      fallback_action: track.fallback_action,
    });
    setShowEditDialog(true);
  }

  // 保存编辑
  async function handleSaveEdit() {
    if (!editingTrack) return;
    
    setDialogLoading(true);
    try {
      const { error } = await supabase
        .from('growth_tracks')
        .update({
          name: editForm.name,
          tagline: editForm.tagline || null,
          description: editForm.description || null,
          target_audience: editForm.target_audience || null,
          is_active: editForm.is_active,
          is_ready: editForm.is_ready,
          fallback_action: editForm.fallback_action,
        })
        .eq('id', editingTrack.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'growth',
        action: 'update',
        target_type: 'growth_track',
        target_id: editingTrack.id,
        target_name: editForm.name,
        changes_summary: `更新成长方向: ${editForm.name}`,
      });
      
      setShowEditDialog(false);
      setEditingTrack(null);
      loadTracks();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  // 切换激活状态
  async function handleToggleActive() {
    if (!trackToToggle) return;
    
    setDialogLoading(true);
    try {
      const newActive = !trackToToggle.is_active;
      
      const { error } = await supabase
        .from('growth_tracks')
        .update({ is_active: newActive })
        .eq('id', trackToToggle.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'growth',
        action: newActive ? 'activate' : 'deactivate',
        target_type: 'growth_track',
        target_id: trackToToggle.id,
        target_name: trackToToggle.name,
        changes_summary: `${newActive ? '启用' : '禁用'}成长方向: ${trackToToggle.name}`,
      });
      
      setShowToggleDialog(false);
      setTrackToToggle(null);
      loadTracks();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">成长方向管理</h1>
          <p className="text-slate-400 mt-1">配置医生成长路径与学习方向</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="总方向数" value={stats.total} />
        <StatCard label="已启用" value={stats.active} />
        <StatCard label="内容就绪" value={stats.ready} />
      </div>

      {/* 筛选栏 */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索方向名称..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              options={[
                { value: '', label: '全部分组' },
                ...getGroups().map(g => ({ value: g, label: g })),
              ]}
            />
          </div>
        </div>
      </Card>

      {/* 列表 */}
      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : tracks.length === 0 ? (
          <EmptyState
            title="暂无成长方向"
            description="请先在数据库中初始化成长方向数据"
          />
        ) : (
          <TableContainer>
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">方向名称</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">分组</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">标语</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">内容状态</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">缺省动作</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {tracks.map((track) => (
                  <tr key={track.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {track.icon && (
                          <span className="text-2xl">{track.icon}</span>
                        )}
                        <div>
                          <span className="font-medium text-white">{track.name}</span>
                          <div className="text-xs text-slate-500">{track.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{track.group_name}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm max-w-xs truncate">
                      {track.tagline || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {track.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                          已启用
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400">
                          已禁用
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {track.is_ready ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                          已就绪
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                          建设中
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {track.fallback_action === 'hide' && '隐藏'}
                      {track.fallback_action === 'coming_soon' && '占位页'}
                      {track.fallback_action === 'browse_all' && '浏览全部'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditDialog(track)}
                        >
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTrackToToggle(track);
                            setShowToggleDialog(true);
                          }}
                        >
                          {track.is_active ? '禁用' : '启用'}
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
      {showEditDialog && editingTrack && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full p-6 my-8">
            <h3 className="text-lg font-semibold text-white mb-4">
              编辑成长方向 - {editingTrack.slug}
            </h3>
            
            <div className="space-y-4">
              <Input
                label="方向名称"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                label="标语"
                placeholder="简短描述此方向的特点"
                value={editForm.tagline}
                onChange={(e) => setEditForm(prev => ({ ...prev, tagline: e.target.value }))}
              />
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  详细描述
                </label>
                <textarea
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[100px]"
                  placeholder="描述此成长方向的内容和目标"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <Input
                label="目标受众"
                placeholder="适合什么样的医生"
                value={editForm.target_audience}
                onChange={(e) => setEditForm(prev => ({ ...prev, target_audience: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="内容未就绪时"
                  value={editForm.fallback_action}
                  onChange={(e) => setEditForm(prev => ({ ...prev, fallback_action: e.target.value as any }))}
                  options={[
                    { value: 'coming_soon', label: '显示占位页' },
                    { value: 'browse_all', label: '跳转浏览全部' },
                    { value: 'hide', label: '隐藏方向' },
                  ]}
                />
                <div className="space-y-3 pt-7">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500"
                    />
                    <span className="text-sm text-slate-300">启用此方向</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.is_ready}
                      onChange={(e) => setEditForm(prev => ({ ...prev, is_ready: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500"
                    />
                    <span className="text-sm text-slate-300">内容已就绪</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingTrack(null);
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

      {/* 切换状态确认弹窗 */}
      <ConfirmDialog
        open={showToggleDialog}
        title={trackToToggle?.is_active ? '禁用成长方向' : '启用成长方向'}
        message={
          trackToToggle?.is_active
            ? `确定要禁用 "${trackToToggle?.name}" 吗？禁用后前台将不再展示此方向。`
            : `确定要启用 "${trackToToggle?.name}" 吗？启用后前台将展示此方向。`
        }
        confirmText={trackToToggle?.is_active ? '确认禁用' : '确认启用'}
        onConfirm={handleToggleActive}
        onCancel={() => {
          setShowToggleDialog(false);
          setTrackToToggle(null);
        }}
        loading={dialogLoading}
        danger={trackToToggle?.is_active}
      />
    </div>
  );
}
