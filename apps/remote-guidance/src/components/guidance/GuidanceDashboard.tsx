'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@vetsphere/shared/context/AuthContext";
import { getAccessTokenSafe, getSessionSafe } from "@vetsphere/shared/services/supabase";
import { useGuidanceSessionBridge } from "@/components/guidance/GuidanceSessionBridge";

type GuidanceSession = {
  id: string;
  title: string;
  status: string;
  priority: string;
  procedure_name?: string | null;
  scheduled_start_at?: string | null;
  hospital_name?: string | null;
  assigned_expert_user_id?: string | null;
};

const statusLabelMap: Record<string, string> = {
  draft: "草稿",
  requested: "待分诊",
  triaged: "已分诊",
  expert_assigned: "已指派专家",
  scheduled: "已排期",
  ready: "待入会",
  live: "进行中",
  paused: "暂停中",
  ended: "已结束",
  archived: "已归档",
  cancelled: "已取消",
};

export default function GuidanceDashboard() {
  const { loading, isAuthenticated, user, canAccessDoctorWorkspace, doctorPrivilegeStatus } = useAuth();
  const { isSyncing } = useGuidanceSessionBridge();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<GuidanceSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);

  const debugMode = searchParams.get("debugAuth") === "1";

  useEffect(() => {
    if (loading || isSyncing || !isAuthenticated || !canAccessDoctorWorkspace) {
      return;
    }

    let cancelled = false;

    async function loadSessions() {
      setSessionsLoading(true);
      setFetchError(null);

      try {
        const token = await getAccessTokenSafe();
        if (!token) {
          throw new Error("当前没有有效医生会话。");
        }

        const response = await fetch("/api/guidance/sessions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message || "加载远程指导会话失败。");
        }

        if (!cancelled) {
          setSessions(payload?.data?.sessions || []);
        }
      } catch (error) {
        if (!cancelled) {
          setFetchError(error instanceof Error ? error.message : "加载会话失败。");
        }
      } finally {
        if (!cancelled) {
          setSessionsLoading(false);
        }
      }
    }

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [loading, isSyncing, isAuthenticated, canAccessDoctorWorkspace]);

  useEffect(() => {
    if (!debugMode) {
      setDebugInfo(null);
      return;
    }

    let cancelled = false;

    async function loadDebugInfo() {
      try {
        const sessionResult = await getSessionSafe();
        const token = sessionResult.data.session?.access_token || null;
        let authMePayload: unknown = null;

        if (token) {
          const response = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          authMePayload = await response.json();
        }

        if (!cancelled) {
          setDebugInfo({
            authContext: {
              loading,
              isAuthenticated,
              userId: user?.id || null,
              mobile: user?.mobile || null,
              name: user?.name || null,
              doctorPrivilegeStatus,
              canAccessDoctorWorkspace,
              isSyncing,
            },
            session: {
              hasSession: Boolean(sessionResult.data.session),
              userId: sessionResult.data.session?.user?.id || null,
              email: sessionResult.data.session?.user?.email || null,
              hasAccessToken: Boolean(token),
            },
            authMe: authMePayload,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setDebugInfo({
            error: error instanceof Error ? error.message : "debug load failed",
            authContext: {
              loading,
              isAuthenticated,
              userId: user?.id || null,
              mobile: user?.mobile || null,
              doctorPrivilegeStatus,
              canAccessDoctorWorkspace,
              isSyncing,
            },
          });
        }
      }
    }

    void loadDebugInfo();

    return () => {
      cancelled = true;
    };
  }, [
    debugMode,
    loading,
    isAuthenticated,
    user?.id,
    user?.mobile,
    user?.name,
    doctorPrivilegeStatus,
    canAccessDoctorWorkspace,
    isSyncing,
  ]);

  const stats = useMemo(() => {
    return sessions.reduce(
      (acc, session) => {
        acc.total += 1;
        if (session.status === "live") acc.live += 1;
        if (["requested", "triaged", "expert_assigned", "scheduled", "ready"].includes(session.status)) acc.upcoming += 1;
        if (!session.assigned_expert_user_id) acc.unassigned += 1;
        return acc;
      },
      { total: 0, live: 0, upcoming: 0, unassigned: 0 }
    );
  }, [sessions]);

  return (
    <main className="guidance-shell">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 lg:px-8">
        <section className="guidance-card overflow-hidden rounded-[2rem]">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.7fr_0.9fr] lg:px-10">
            <div className="space-y-5">
              <span className="guidance-pill inline-flex bg-teal-50 text-teal-700">Remote Guidance</span>
              <div className="space-y-3">
                <h1 className="max-w-3xl font-serif text-4xl leading-tight text-slate-950 lg:text-5xl">
                  手术实时远程指导已经独立成应用，当前重点是把登录、会话、入房和留痕跑稳。
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-600">
                  只要你已经在 vetsphere.cn 登录，guidance.vetsphere.cn 会优先自动继承这份医生会话，不再要求用户重复登录。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/guidance/new"
                  className="rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  发起远程指导
                </Link>
                <Link
                  href="/auth?redirect=/guidance"
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  打开登录页
                </Link>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.5rem] bg-slate-950 px-5 py-5 text-white">
                <div className="text-sm text-slate-300">当前登录</div>
                <div className="mt-3 text-xl font-semibold">{user?.name || "未登录"}</div>
                <div className="mt-2 text-sm text-slate-300">医生状态：{doctorPrivilegeStatus}</div>
              </div>
              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-5 text-amber-950">
                <div className="text-sm font-semibold">登录策略</div>
                <div className="mt-2 text-sm leading-6">
                  先自动同步主站登录态，只有在主站当前没有会话时，才会退回到手动登录。
                </div>
              </div>
            </div>
          </div>
        </section>

        {debugMode ? (
          <section className="guidance-card rounded-[1.75rem] px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Auth Debug</h2>
                <p className="mt-1 text-sm text-slate-500">
                  这里会显示当前 guidance 实际识别到的用户、session 和 `/api/auth/me` 返回。
                </p>
              </div>
            </div>
            <pre className="mt-5 overflow-auto rounded-[1.25rem] bg-slate-950 px-4 py-4 text-xs leading-6 text-slate-100">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </section>
        ) : null}

        {loading || isSyncing ? (
          <section className="guidance-card rounded-[1.75rem] px-6 py-8">
            <h2 className="text-xl font-semibold text-slate-950">正在同步登录状态</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              如果你已经在 vetsphere.cn 登录，远程指导会自动接管这份医生会话，不需要再次输入账号密码。
            </p>
          </section>
        ) : !isAuthenticated ? (
          <section className="guidance-card rounded-[1.75rem] px-6 py-8">
            <h2 className="text-xl font-semibold text-slate-950">主站当前没有可继承的登录态</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              系统已经尝试自动从主站接管登录，但当前浏览器没有拿到可用的医生会话。只有这时才需要手动登录。
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/auth?redirect=/guidance"
                className="rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                手动登录医生账号
              </Link>
            </div>
          </section>
        ) : !canAccessDoctorWorkspace ? (
          <section className="guidance-card rounded-[1.75rem] px-6 py-8">
            <h2 className="text-xl font-semibold text-slate-950">当前账号暂时没有医生工作台权限</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              当前账号已经登录成功，但它没有医生工作台权限，不能发起远程指导。请切换到已审核通过的医生账号。
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <div className="guidance-card rounded-[1.5rem] px-5 py-5">
                <div className="text-sm text-slate-500">我的会话</div>
                <div className="mt-3 text-3xl font-semibold text-slate-950">{stats.total}</div>
              </div>
              <div className="guidance-card rounded-[1.5rem] px-5 py-5">
                <div className="text-sm text-slate-500">进行中</div>
                <div className="mt-3 text-3xl font-semibold text-teal-700">{stats.live}</div>
              </div>
              <div className="guidance-card rounded-[1.5rem] px-5 py-5">
                <div className="text-sm text-slate-500">待执行</div>
                <div className="mt-3 text-3xl font-semibold text-slate-950">{stats.upcoming}</div>
              </div>
              <div className="guidance-card rounded-[1.5rem] px-5 py-5">
                <div className="text-sm text-slate-500">待指派专家</div>
                <div className="mt-3 text-3xl font-semibold text-amber-600">{stats.unassigned}</div>
              </div>
            </section>

            <section className="guidance-card rounded-[1.75rem] px-6 py-6">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">我的指导会话</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    当前列表来自真实的 guidance 数据表，不是演示内容。
                  </p>
                </div>
                <Link href="/guidance/new" className="text-sm font-semibold text-teal-700">
                  继续发起会话
                </Link>
              </div>

              {sessionsLoading ? (
                <div className="grid gap-4 py-6">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-32 animate-pulse rounded-[1.5rem] bg-slate-100" />
                  ))}
                </div>
              ) : fetchError ? (
                <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                  {fetchError}
                </div>
              ) : sessions.length === 0 ? (
                <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 px-6 py-10 text-sm leading-6 text-slate-500">
                  当前还没有会话数据。下一步可以直接进入“发起远程指导”，用真实医生账号创建一场测试会话。
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {sessions.map((session) => (
                    <article key={session.id} className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="guidance-pill bg-slate-100 text-slate-700">
                              {statusLabelMap[session.status] || session.status}
                            </span>
                            <span className="guidance-pill bg-amber-50 text-amber-700">{session.priority}</span>
                          </div>
                          <h3 className="text-xl font-semibold text-slate-950">{session.title}</h3>
                          <p className="text-sm text-slate-500">
                            {session.procedure_name || "未填写术式"} · {session.hospital_name || "未填写机构"}
                          </p>
                        </div>
                        <div className="flex flex-col gap-3 text-sm text-slate-500 lg:items-end">
                          <div>
                            {session.scheduled_start_at
                              ? new Date(session.scheduled_start_at).toLocaleString("zh-CN")
                              : "待排期"}
                          </div>
                          <Link href={`/guidance/${session.id}`} className="font-semibold text-teal-700">
                            查看会话详情
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
