'use client';

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessTokenSafe } from "@vetsphere/shared/services/supabase";
import {
  formatGuidanceDate,
  getStatusTone,
  guidanceParticipantRoleLabels,
  guidancePriorityLabels,
  guidanceSessionTypeLabels,
  guidanceStatusLabels,
} from "@/lib/guidance-display";

type GuidanceParticipant = {
  id: string;
  user_id: string;
  participant_role: string;
  invite_status: string;
  joined_at?: string | null;
  last_seen_at?: string | null;
};

type GuidanceEvent = {
  id: string;
  event_type: string;
  actor_role?: string | null;
  event_at: string;
  payload?: Record<string, unknown> | null;
};

type GuidanceRecording = {
  id: string;
  status: string;
  duration_seconds?: number | null;
  ready_at?: string | null;
};

type GuidanceDevice = {
  id: string;
  device_name: string;
  device_type: string;
  status: string;
  is_primary: boolean;
};

type GuidanceSessionDetail = {
  session: {
    id: string;
    title: string;
    status: string;
    priority: string;
    session_type: string;
    procedure_name?: string | null;
    clinical_summary?: string | null;
    hospital_name?: string | null;
    department_name?: string | null;
    operating_room_name?: string | null;
    patient_species?: string | null;
    patient_identifier?: string | null;
    scheduled_start_at?: string | null;
    scheduled_end_at?: string | null;
    actual_started_at?: string | null;
    actual_ended_at?: string | null;
    rtc_provider?: string | null;
    rtc_room_name?: string | null;
    room_status?: string | null;
    consent_confirmed?: boolean | null;
    assigned_expert_user_id?: string | null;
  };
  actorRole: string | null;
  participants: GuidanceParticipant[];
  devices: GuidanceDevice[];
  recordings: GuidanceRecording[];
  recentEvents: GuidanceEvent[];
};

type AnnotationDraft = {
  title: string;
  content: string;
  annotation_type: string;
};

type EmergencyLinkState = {
  expert?: string;
  observer?: string;
};

const eventLabelMap: Record<string, string> = {
  session_requested: "发起会话",
  session_updated: "更新会话",
  session_cancelled: "取消会话",
  expert_assigned: "指派专家",
  participant_invited: "邀请参与者",
  room_opened: "打开房间",
  room_token_requested: "申请房间凭证",
  participant_joined: "成员加入",
  participant_left: "成员离开",
  network_warning: "网络告警",
  snapshot_taken: "截图",
  annotation_added: "添加标注",
  recording_started: "开始录制",
  recording_stopped: "停止录制",
  session_paused: "暂停会话",
  session_resumed: "恢复会话",
  session_ended: "结束会话",
};

export default function GuidanceSessionDetailClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<GuidanceSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [emergencyLinks, setEmergencyLinks] = useState<EmergencyLinkState>({});
  const [annotationDraft, setAnnotationDraft] = useState<AnnotationDraft>({
    title: "",
    content: "",
    annotation_type: "text_note",
  });

  async function fetchDetail() {
    setLoading(true);
    setError(null);

    try {
      const token = await getAccessTokenSafe();
      if (!token) {
        throw new Error("未获取到登录态，请先完成中国站登录。");
      }

      const response = await fetch(`/api/guidance/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "加载会话详情失败。");
      }

      setDetail(payload?.data || null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "加载会话详情失败。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchDetail();
  }, [sessionId]);

  const headerMeta = useMemo(() => {
    if (!detail) return [];

    return [
      `${guidanceSessionTypeLabels[detail.session.session_type] || detail.session.session_type}`,
      `${guidancePriorityLabels[detail.session.priority] || detail.session.priority}`,
      detail.session.procedure_name || "未填写术式",
      detail.session.hospital_name || "未填写机构",
    ];
  }, [detail]);

  async function runAction(path: string, options?: RequestInit, successMessage?: string) {
    setBusyAction(path);
    setActionError(null);
    setActionMessage(null);

    try {
      const token = await getAccessTokenSafe();
      if (!token) {
        throw new Error("未获取到登录态，请先完成中国站登录。");
      }

      const response = await fetch(path, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options?.body ? { "Content-Type": "application/json" } : {}),
        },
        ...options,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "操作失败。");
      }

      setActionMessage(successMessage || payload?.message || "操作成功。");
      await fetchDetail();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "操作失败。");
    } finally {
      setBusyAction(null);
    }
  }

  async function createAnnotation() {
    if (!annotationDraft.title.trim() && !annotationDraft.content.trim()) {
      setActionError("请至少填写一个标注标题或内容。");
      return;
    }

    await runAction(
      `/api/guidance/sessions/${sessionId}/annotations`,
      {
        body: JSON.stringify(annotationDraft),
      },
      "标注已写入会话时间轴。"
    );

    setAnnotationDraft({
      title: "",
      content: "",
      annotation_type: "text_note",
    });
  }

  async function generateEmergencyLink(role: "expert" | "observer") {
    setBusyAction(`emergency:${role}`);
    setActionError(null);
    setActionMessage(null);

    try {
      const token = await getAccessTokenSafe();
      if (!token) {
        throw new Error("未获取到登录态，请先完成中国站登录。");
      }

      const response = await fetch(`/api/guidance/sessions/${sessionId}/emergency-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "生成应急入会链接失败。");
      }

      const joinUrl = payload?.data?.join_url as string | undefined;
      if (joinUrl) {
        setEmergencyLinks((current) => ({ ...current, [role]: joinUrl }));
        await navigator.clipboard.writeText(joinUrl);
      }

      setActionMessage(joinUrl ? `已生成并复制${role === "expert" ? "专家" : "观察员"}应急入会链接。` : "应急入会链接已生成。");
      await fetchDetail();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "生成应急入会链接失败。");
    } finally {
      setBusyAction(null);
    }
  }

  if (loading) {
    return (
      <main className="guidance-shell">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-5 py-8 lg:px-8">
          <div className="guidance-card h-64 animate-pulse rounded-[2rem]" />
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="guidance-card h-96 animate-pulse rounded-[2rem]" />
            <div className="guidance-card h-96 animate-pulse rounded-[2rem]" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="guidance-shell">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-5 py-10 lg:px-8">
          <section className="guidance-card rounded-[2rem] px-7 py-8">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600">Load Failed</div>
            <h1 className="mt-4 text-3xl font-semibold text-slate-950">会话详情暂时无法读取</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">{error || "未找到会话数据。"}</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => void fetchDetail()}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
              >
                重新加载
              </button>
              <Link
                href="/guidance"
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                返回列表
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="guidance-shell">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-5 py-8 lg:px-8">
        <section className="guidance-card overflow-hidden rounded-[2rem]">
          <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="border-b border-slate-200 px-7 py-8 lg:border-b-0 lg:border-r">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`guidance-pill inline-flex ${getStatusTone(detail.session.status)}`}>
                  {guidanceStatusLabels[detail.session.status] || detail.session.status}
                </span>
                <span className="guidance-pill inline-flex bg-amber-500/10 text-amber-700">
                  {guidancePriorityLabels[detail.session.priority] || detail.session.priority}
                </span>
                <span className="guidance-pill inline-flex bg-slate-100 text-slate-700">
                  角色：{detail.actorRole ? guidanceParticipantRoleLabels[detail.actorRole] || detail.actorRole : "未知"}
                </span>
              </div>
              <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight text-slate-950">
                {detail.session.title}
              </h1>
              <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-500">
                {headerMeta.map((item) => (
                  <span key={item} className="rounded-full border border-slate-200 px-3 py-1">
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">
                {detail.session.clinical_summary || "尚未填写术前摘要。这里会逐步承接术前重点、专家关注点和后续 AI 总结来源。"}
              </p>
            </div>

            <div className="bg-[linear-gradient(160deg,rgba(13,148,136,0.08),rgba(245,158,11,0.08))] px-7 py-8">
              <div className="grid gap-4">
                <div className="rounded-[1.4rem] border border-white/70 bg-white/85 px-5 py-4">
                  <div className="text-sm text-slate-500">预约开始</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {formatGuidanceDate(detail.session.scheduled_start_at)}
                  </div>
                </div>
                <div className="rounded-[1.4rem] border border-white/70 bg-white/85 px-5 py-4">
                  <div className="text-sm text-slate-500">RTC 房间</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {detail.session.rtc_room_name || "尚未打开房间"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Provider: {detail.session.rtc_provider || "livekit"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="flex flex-col gap-6">
            <section className="guidance-card rounded-[2rem] px-7 py-7">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Operations</div>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-950">会话操作</h2>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchDetail()}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  刷新
                </button>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {detail.session.rtc_room_name ? (
                  <div className="rounded-[1.35rem] bg-teal-600 px-4 py-4 text-left text-sm font-semibold text-white">
                    <div>房间已打开</div>
                    <div className="mt-2 text-xs font-normal text-teal-100">房间名: {detail.session.rtc_room_name}</div>
                    <Link
                      href={`/guidance/${sessionId}/room`}
                      className="mt-3 inline-block rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-teal-700"
                    >
                      进入房间
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() =>
                      void runAction(`/api/guidance/sessions/${sessionId}/room/open`, undefined, "房间已打开，可以继续接 RTC token。")
                    }
                    className="rounded-[1.35rem] bg-slate-950 px-4 py-4 text-left text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    <div>打开会话房间</div>
                    <div className="mt-2 text-xs font-normal text-slate-300">生成房间名并把会话状态推进到可进入阶段</div>
                  </button>
                )}
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() =>
                    void runAction(`/api/guidance/sessions/${sessionId}/end`, undefined, "会话已结束。")
                  }
                  className="rounded-[1.35rem] border border-slate-300 px-4 py-4 text-left text-sm font-semibold text-slate-800 transition hover:border-slate-400 disabled:opacity-60"
                >
                  <div>结束会话</div>
                  <div className="mt-2 text-xs font-normal text-slate-500">写入结束时间并同步状态</div>
                </button>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() =>
                    void runAction(`/api/guidance/sessions/${sessionId}/cancel`, undefined, "会话已取消。")
                  }
                  className="rounded-[1.35rem] border border-rose-200 bg-rose-50 px-4 py-4 text-left text-sm font-semibold text-rose-700 transition hover:border-rose-300 disabled:opacity-60"
                >
                  <div>取消会话</div>
                  <div className="mt-2 text-xs font-normal text-rose-500">保留留痕，适合预约取消或计划变更</div>
                </button>
              </div>

              {actionMessage ? (
                <div className="mt-4 rounded-[1.25rem] border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
                  {actionMessage}
                </div>
              ) : null}
              {actionError ? (
                <div className="mt-4 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {actionError}
                </div>
              ) : null}

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => void generateEmergencyLink("expert")}
                  className="rounded-[1.35rem] border border-teal-200 bg-teal-50 px-4 py-4 text-left text-sm font-semibold text-teal-800 transition hover:border-teal-300 disabled:opacity-60"
                >
                  <div>生成专家应急链接</div>
                  <div className="mt-2 text-xs font-normal text-teal-700">自动开房并复制一个免登录的海外专家入会地址</div>
                </button>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => void generateEmergencyLink("observer")}
                  className="rounded-[1.35rem] border border-slate-300 bg-white px-4 py-4 text-left text-sm font-semibold text-slate-800 transition hover:border-slate-400 disabled:opacity-60"
                >
                  <div>生成观察员应急链接</div>
                  <div className="mt-2 text-xs font-normal text-slate-500">适合只看不发言的外部旁观者</div>
                </button>
              </div>

              {emergencyLinks.expert ? (
                <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">专家应急链接</div>
                  <div className="mt-2 break-all">{emergencyLinks.expert}</div>
                </div>
              ) : null}
              {emergencyLinks.observer ? (
                <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">观察员应急链接</div>
                  <div className="mt-2 break-all">{emergencyLinks.observer}</div>
                </div>
              ) : null}
            </section>

            <section className="guidance-card rounded-[2rem] px-7 py-7">
              <div className="border-b border-slate-200 pb-5">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Session Snapshot</div>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">会话主数据</h2>
              </div>
              <dl className="mt-6 grid gap-4 md:grid-cols-2">
                <InfoRow label="机构" value={detail.session.hospital_name || "未填写"} />
                <InfoRow label="科室" value={detail.session.department_name || "未填写"} />
                <InfoRow label="手术间" value={detail.session.operating_room_name || "未填写"} />
                <InfoRow label="患者物种" value={detail.session.patient_species || "未填写"} />
                <InfoRow label="患者标识" value={detail.session.patient_identifier || "未填写"} />
                <InfoRow label="知情同意" value={detail.session.consent_confirmed ? "已确认" : "未确认"} />
              </dl>
            </section>

            <section className="guidance-card rounded-[2rem] px-7 py-7">
              <div className="border-b border-slate-200 pb-5">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Timeline</div>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">最近事件</h2>
              </div>
              <div className="mt-6 grid gap-4">
                {detail.recentEvents.length === 0 ? (
                  <div className="rounded-[1.4rem] border border-dashed border-slate-300 px-5 py-8 text-sm text-slate-500">
                    还没有事件记录。创建房间、结束会话和添加标注后，这里会逐步形成真实时间轴。
                  </div>
                ) : (
                  detail.recentEvents.map((event) => (
                    <article key={event.id} className="rounded-[1.4rem] border border-slate-200 bg-white px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {eventLabelMap[event.event_type] || event.event_type}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {event.actor_role ? `${guidanceParticipantRoleLabels[event.actor_role] || event.actor_role} · ` : ""}
                            {formatGuidanceDate(event.event_at)}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-6">
            <section className="guidance-card rounded-[2rem] px-7 py-7">
              <div className="border-b border-slate-200 pb-5">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Participants</div>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">参与者</h2>
              </div>
              <div className="mt-6 grid gap-3">
                {detail.participants.length === 0 ? (
                  <div className="rounded-[1.35rem] border border-dashed border-slate-300 px-5 py-8 text-sm text-slate-500">
                    当前还没有额外参与者。下一步可以继续接专家邀请与协调员分配。
                  </div>
                ) : (
                  detail.participants.map((participant) => (
                    <article key={participant.id} className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {guidanceParticipantRoleLabels[participant.participant_role] || participant.participant_role}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{participant.user_id}</div>
                        </div>
                        <div className="guidance-pill bg-slate-100 text-slate-700">{participant.invite_status}</div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="guidance-card rounded-[2rem] px-7 py-7">
              <div className="border-b border-slate-200 pb-5">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Assets</div>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">设备与录制</h2>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <MetricCard label="设备数" value={String(detail.devices.length)} hint="后续接术野、全景、内窥镜等视频源" />
                <MetricCard label="录制数" value={String(detail.recordings.length)} hint="后续接录制开始/停止与回放" />
              </div>
            </section>

            <section className="guidance-card rounded-[2rem] px-7 py-7">
              <div className="border-b border-slate-200 pb-5">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Annotation</div>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">快速标注</h2>
              </div>
              <div className="mt-6 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">标注类型</span>
                  <select
                    value={annotationDraft.annotation_type}
                    onChange={(event) =>
                      setAnnotationDraft((current) => ({ ...current, annotation_type: event.target.value }))
                    }
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500"
                  >
                    <option value="text_note">文字备注</option>
                    <option value="timeline_marker">时间轴标记</option>
                    <option value="risk_flag">风险提醒</option>
                    <option value="snapshot">截图说明</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">标题</span>
                  <input
                    value={annotationDraft.title}
                    onChange={(event) => setAnnotationDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="例如：切口暴露阶段提醒"
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">内容</span>
                  <textarea
                    rows={5}
                    value={annotationDraft.content}
                    onChange={(event) => setAnnotationDraft((current) => ({ ...current, content: event.target.value }))}
                    placeholder="记录关键判断、专家提醒或术中时间点。"
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-teal-500"
                  />
                </label>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => void createAnnotation()}
                  className="rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
                >
                  写入会话标注
                </button>
              </div>
            </section>
          </div>
        </section>

        <div className="flex gap-3">
          <Link
            href="/guidance"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
          >
            返回会话列表
          </Link>
          <Link
            href={`/guidance/${sessionId}/room`}
            className="rounded-full border border-teal-300 bg-teal-50 px-5 py-3 text-sm font-semibold text-teal-700"
          >
            进入房间准备页
          </Link>
          <button
            type="button"
            onClick={() => startTransition(() => router.push("/guidance/new"))}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            再发起一个会话
          </button>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] bg-slate-50 px-4 py-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-2 text-base font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
      <div className="mt-2 text-xs leading-6 text-slate-500">{hint}</div>
    </div>
  );
}
