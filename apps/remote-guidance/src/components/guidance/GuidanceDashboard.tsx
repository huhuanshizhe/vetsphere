'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@vetsphere/shared/context/AuthContext";
import { getAccessTokenSafe } from "@vetsphere/shared/services/supabase";

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
  ready: "待进入",
  live: "进行中",
  paused: "暂停中",
  ended: "已结束",
  archived: "已归档",
  cancelled: "已取消",
};

export default function GuidanceDashboard() {
  const { loading, isAuthenticated, user, canAccessDoctorWorkspace, doctorPrivilegeStatus } = useAuth();
  const [sessions, setSessions] = useState<GuidanceSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !isAuthenticated || !canAccessDoctorWorkspace) {
      return;
    }

    let cancelled = false;

    async function loadSessions() {
      setSessionsLoading(true);
      setFetchError(null);

      try {
        const token = await getAccessTokenSafe();
        if (!token) {
          throw new Error("未获取到登录态，请先完成中国站登录。");
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
  }, [loading, isAuthenticated, canAccessDoctorWorkspace]);

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
              <span className="guidance-pill inline-flex bg-teal-50 text-teal-700">Remote Guidance MVP</span>
              <div className="space-y-3">
                <h1 className="max-w-3xl font-serif text-4xl leading-tight text-slate-950 lg:text-5xl">
                  手术实时远程指导已经拆成独立应用，先把会话流、权限和留痕跑稳。
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-600">
                  这一版优先承接会话申请、会话协同、事件留痕和后续 RTC 接入点，不和中国站已有医生认证体系脱节。
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
                  href="/guidance"
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  查看我的会话
                </Link>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.5rem] bg-slate-950 px-5 py-5 text-white">
                <div className="text-sm text-slate-300">当前登录</div>
                <div className="mt-3 text-xl font-semibold">{user?.name || "未登录"}</div>
                <div className="mt-2 text-sm text-slate-300">
                  医生工作台状态：{doctorPrivilegeStatus}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-5 text-amber-950">
                <div className="text-sm font-semibold">当前阶段</div>
                <div className="mt-2 text-sm leading-6">
                  已完成数据层、会话 API 和独立应用入口，LiveKit token 与录制联调放到下一步接入。
                </div>
              </div>
            </div>
          </div>
        </section>

        {!isAuthenticated ? (
          <section className="guidance-card rounded-[1.75rem] px-6 py-8">
            <h2 className="text-xl font-semibold text-slate-950">需要先登录</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              远程指导应用复用了现有账号体系。请先在中国站完成登录，再回到这里读取同一套会话与权限状态。
            </p>
          </section>
        ) : !canAccessDoctorWorkspace ? (
          <section className="guidance-card rounded-[1.75rem] px-6 py-8">
            <h2 className="text-xl font-semibold text-slate-950">当前账号还不能进入远程指导</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              这一阶段沿用了中国站医生审核结果。只有 `doctor_privilege_status = approved` 且具备医生工作台权限的账号才能发起手术远程指导。
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
                    当前列表来自新建的 `guidance_sessions` 与 `guidance_participants`，不是演示数据。
                  </p>
                </div>
                <Link href="/guidance/new" className="text-sm font-semibold text-teal-700">
                  继续完善发起流程
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
                  还没有会话数据。下一步可以直接对 `POST /api/guidance/sessions` 接入真实发起表单。
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
                            <span className="guidance-pill bg-amber-50 text-amber-700">
                              {session.priority}
                            </span>
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
