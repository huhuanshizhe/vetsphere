'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Session {
  id: string;
  visitor_id: string;
  lead_name: string | null;
  lead_email: string | null;
  lead_clinic: string | null;
  lead_country: string | null;
  lead_captured: boolean;
  message_count: number;
  status: string;
  source_page: string | null;
  title: string | null;
  created_at: string;
  inquiry_id: string | null;
  inquiry?: {
    id: string;
    status: string;
  };
}

interface Stats {
  total: number;
  leads: number;
  inquiries: number;
  conversionRate: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: '进行中', className: 'bg-blue-100 text-blue-600' },
  closed: { label: '已关闭', className: 'bg-slate-100 text-slate-600' },
  converted: { label: '已转化', className: 'bg-emerald-100 text-emerald-600' },
};

export default function AIConversationsPage() {
  const supabase = createClient();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    leads: 0,
    inquiries: 0,
    conversionRate: '0',
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [leadOnly, setLeadOnly] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [filter, leadOnly]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (leadOnly) params.set('leadOnly', 'true');

      const response = await fetch(`/api/admin/ai-conversations?${params}`);
      const data = await response.json();

      if (response.ok) {
        setSessions(data.sessions || []);
        setStats(data.stats || { total: 0, leads: 0, inquiries: 0, conversionRate: '0' });
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI对话管理</h1>
            <p className="text-sm text-slate-500 mt-1">VetAssist智能销售顾问对话记录</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={leadOnly}
              onChange={(e) => setLeadOnly(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">仅显示已留资</span>
          </label>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-sm text-slate-500">总对话数</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <p className="text-3xl font-bold text-emerald-600">{stats.leads}</p>
            <p className="text-sm text-slate-500">留资数</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <p className="text-3xl font-bold text-blue-600">{stats.inquiries}</p>
            <p className="text-sm text-slate-500">转询盘数</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <p className="text-3xl font-bold text-purple-600">{stats.conversionRate}%</p>
            <p className="text-sm text-slate-500">转化率</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'all', label: '全部' },
            { key: 'active', label: '进行中' },
            { key: 'closed', label: '已关闭' },
            { key: 'converted', label: '已转化' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sessions Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">访客/留资信息</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">对话标题</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">消息数</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">来源页面</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">状态</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">时间</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    暂无对话记录
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      {session.lead_captured ? (
                        <div>
                          <p className="font-medium text-slate-900">{session.lead_name}</p>
                          <p className="text-xs text-slate-500">{session.lead_email}</p>
                          {session.lead_clinic && (
                            <p className="text-xs text-slate-400">{session.lead_clinic}</p>
                          )}
                          {session.lead_country && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-slate-100 text-xs rounded">
                              {session.lead_country}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-slate-500">匿名访客</p>
                          <p className="text-xs text-slate-400 font-mono">
                            {session.visitor_id.slice(0, 8)}...
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
                        {session.title || '无标题'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{session.message_count}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500 truncate max-w-[150px]">
                        {session.source_page || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${statusConfig[session.status]?.className || statusConfig.active.className}`}
                      >
                        {statusConfig[session.status]?.label || session.status}
                      </span>
                      {session.lead_captured && (
                        <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-xs rounded">
                          已留资
                        </span>
                      )}
                      {session.inquiry_id && (
                        <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs rounded">
                          询盘
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500">
                        {new Date(session.created_at).toLocaleString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/ai-conversations/${session.id}`}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        查看
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
