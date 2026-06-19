'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Session {
  id: string;
  visitor_id: string;
  user_id: string | null;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  lead_clinic: string | null;
  lead_country: string | null;
  lead_budget: string | null;
  lead_captured: boolean;
  lead_captured_at: string | null;
  message_count: number;
  status: string;
  source_page: string | null;
  title: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  inquiry_id: string | null;
  inquiry?: {
    id: string;
    status: string;
    name: string;
    email: string;
  };
}

interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions: string[] | null;
  created_at: string;
}

export default function AIConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSession();
  }, [id]);

  const loadSession = async () => {
    try {
      const response = await fetch(`/api/admin/ai-conversations/${id}`);
      const data = await response.json();

      if (response.ok) {
        setSession(data.session);
        setMessages(data.messages || []);
        setAdminNotes(data.session.admin_notes || '');
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/ai-conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes }),
      });
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">会话未找到</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/ai-conversations"
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">对话详情</h1>
            <p className="text-sm text-slate-500">
              {session.title || '无标题对话'} ·{' '}
              {new Date(session.created_at).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Session Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Visitor Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">访客信息</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-slate-500">访客ID:</span>
                  <p className="font-mono text-xs text-slate-600 mt-0.5">{session.visitor_id}</p>
                </div>
                {session.lead_captured ? (
                  <>
                    <div className="pt-3 border-t border-slate-100">
                      <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded mb-2">
                        已留资
                      </span>
                      <p className="font-medium text-slate-900">{session.lead_name}</p>
                      <p className="text-slate-600">{session.lead_email}</p>
                      {session.lead_phone && <p className="text-slate-600">{session.lead_phone}</p>}
                    </div>
                    {session.lead_clinic && (
                      <div>
                        <span className="text-slate-500">诊所/医院:</span>
                        <p className="text-slate-900">{session.lead_clinic}</p>
                      </div>
                    )}
                    {session.lead_country && (
                      <div>
                        <span className="text-slate-500">国家/地区:</span>
                        <p className="text-slate-900">{session.lead_country}</p>
                      </div>
                    )}
                    {session.lead_budget && (
                      <div>
                        <span className="text-slate-500">预算范围:</span>
                        <p className="text-slate-900">{session.lead_budget}</p>
                      </div>
                    )}
                    {session.lead_captured_at && (
                      <div>
                        <span className="text-slate-500">留资时间:</span>
                        <p className="text-slate-600 text-xs">
                          {new Date(session.lead_captured_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-slate-400 italic">未留资</p>
                )}
              </div>
            </div>

            {/* Session Stats */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">会话统计</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-2xl font-bold text-slate-900">{session.message_count}</p>
                  <p className="text-slate-500">消息数</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {messages.filter((m) => m.role === 'user').length}
                  </p>
                  <p className="text-slate-500">用户消息</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 text-sm">
                <span className="text-slate-500">来源页面:</span>
                <p className="text-slate-900 truncate">{session.source_page || '-'}</p>
              </div>
            </div>

            {/* Related Inquiry */}
            {session.inquiry && (
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
                <h3 className="font-semibold text-blue-900 mb-2">关联询盘</h3>
                <Link
                  href={`/inquiries?id=${session.inquiry.id}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  查看询盘详情 →
                </Link>
              </div>
            )}

            {/* Admin Notes */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-3">内部备注</h3>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
                placeholder="添加内部备注..."
              />
              <button
                onClick={saveNotes}
                disabled={saving}
                className="mt-2 w-full py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存备注'}
              </button>
            </div>
          </div>

          {/* Right Panel - Message Timeline */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">对话记录</h3>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-slate-100 text-slate-900 rounded-tl-none'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-medium ${
                            message.role === 'user' ? 'text-blue-200' : 'text-slate-500'
                          }`}
                        >
                          {message.role === 'user' ? '访客' : 'VetAssist'}
                        </span>
                        <span
                          className={`text-xs ${
                            message.role === 'user' ? 'text-blue-300' : 'text-slate-400'
                          }`}
                        >
                          {new Date(message.created_at).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.actions && message.actions.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200/50">
                          <span className="text-xs text-slate-500">
                            动作: {message.actions.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
