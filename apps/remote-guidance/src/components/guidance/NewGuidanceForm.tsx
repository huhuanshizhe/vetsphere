'use client';

import Link from "next/link";
import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@vetsphere/shared/context/AuthContext";
import { getAccessTokenSafe } from "@vetsphere/shared/services/supabase";
import { guidancePriorityLabels, guidanceSessionTypeLabels } from "@/lib/guidance-display";

type FormState = {
  title: string;
  session_type: string;
  priority: string;
  procedure_name: string;
  patient_species: string;
  patient_identifier: string;
  hospital_name: string;
  department_name: string;
  operating_room_name: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  clinical_summary: string;
  consent_confirmed: boolean;
};

const sessionTypeOptions = Object.entries(guidanceSessionTypeLabels);
const priorityOptions = Object.entries(guidancePriorityLabels);

export default function NewGuidanceForm() {
  const router = useRouter();
  const { user, canAccessDoctorWorkspace } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [state, setState] = useState<FormState>({
    title: "",
    session_type: "live_guidance",
    priority: "routine",
    procedure_name: "",
    patient_species: "犬",
    patient_identifier: "",
    hospital_name: user?.organizationName || "",
    department_name: "",
    operating_room_name: "",
    scheduled_start_at: "",
    scheduled_end_at: "",
    clinical_summary: "",
    consent_confirmed: false,
  });

  const summary = useMemo(() => {
    return [
      state.procedure_name || "未填写术式",
      state.patient_species || "未填写物种",
      state.hospital_name || "未填写机构",
    ].join(" · ");
  }, [state.procedure_name, state.patient_species, state.hospital_name]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setState((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canAccessDoctorWorkspace) {
      setSubmitError("当前账号尚未具备医生工作台权限，暂时不能发起远程指导。");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const token = await getAccessTokenSafe();
      if (!token) {
        throw new Error("未获取到登录态，请先在中国站完成登录。");
      }

      const response = await fetch("/api/guidance/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(state),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "创建会话失败。");
      }

      const createdId = payload?.data?.session?.id;
      if (!createdId) {
        throw new Error("会话创建成功，但未返回会话 ID。");
      }

      startTransition(() => {
        router.push(`/guidance/${createdId}`);
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "创建会话失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="guidance-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-5 py-8 lg:px-8">
        <section className="guidance-card overflow-hidden rounded-[2rem]">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="border-b border-slate-200/80 px-7 py-8 lg:border-b-0 lg:border-r">
              <span className="guidance-pill inline-flex bg-teal-50 text-teal-700">Remote Intake</span>
              <h1 className="mt-4 max-w-2xl font-serif text-4xl leading-tight text-slate-950">
                发起一场真实可追踪的远程指导，而不是提一个“直播需求”。
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                这张表单会直接写入 `guidance_sessions`。当前阶段优先沉淀会话主数据、预约信息与术前摘要，后续再接专家匹配、LiveKit token 和房间内多机位。
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="rounded-full border border-slate-200 px-3 py-1">真实入库</span>
                <span className="rounded-full border border-slate-200 px-3 py-1">复用现有医生认证</span>
                <span className="rounded-full border border-slate-200 px-3 py-1">可继续接排班与 RTC</span>
              </div>
            </div>
            <div className="bg-[linear-gradient(160deg,rgba(13,148,136,0.08),rgba(245,158,11,0.08))] px-7 py-8">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_40px_rgba(16,32,51,0.08)]">
                <div className="text-sm font-semibold text-slate-500">本次申请预览</div>
                <div className="mt-4 text-2xl font-semibold text-slate-950">
                  {state.title || "等待填写会话标题"}
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-600">{summary}</div>
                <dl className="mt-6 grid gap-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-slate-500">会话类型</dt>
                    <dd className="font-semibold text-slate-800">
                      {guidanceSessionTypeLabels[state.session_type]}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-slate-500">优先级</dt>
                    <dd className="font-semibold text-slate-800">
                      {guidancePriorityLabels[state.priority]}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-slate-500">预约开始</dt>
                    <dd className="font-semibold text-slate-800">
                      {state.scheduled_start_at ? state.scheduled_start_at.replace("T", " ") : "待填写"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="guidance-card rounded-[2rem] px-7 py-7">
            <div className="border-b border-slate-200 pb-5">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Case Intake</div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">会话基础信息</h2>
            </div>

            <div className="mt-6 grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">会话标题</span>
                <input
                  required
                  value={state.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="例如：脊柱减压术术中远程指导"
                  className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                />
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">会话类型</span>
                  <select
                    value={state.session_type}
                    onChange={(event) => updateField("session_type", event.target.value)}
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                  >
                    {sessionTypeOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">优先级</span>
                  <select
                    value={state.priority}
                    onChange={(event) => updateField("priority", event.target.value)}
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                  >
                    {priorityOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">术式名称</span>
                  <input
                    value={state.procedure_name}
                    onChange={(event) => updateField("procedure_name", event.target.value)}
                    placeholder="例如：TPLO / 脊柱减压 / 异物取出"
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">动物种类</span>
                  <input
                    value={state.patient_species}
                    onChange={(event) => updateField("patient_species", event.target.value)}
                    placeholder="犬 / 猫 / 异宠"
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">患者标识</span>
                <input
                  value={state.patient_identifier}
                  onChange={(event) => updateField("patient_identifier", event.target.value)}
                  placeholder="病例号 / 院内编号 / 脱敏患者标识"
                  className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                />
              </label>

              <div className="grid gap-5 md:grid-cols-3">
                <label className="grid gap-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">机构名称</span>
                  <input
                    value={state.hospital_name}
                    onChange={(event) => updateField("hospital_name", event.target.value)}
                    placeholder="医院 / 中心 / 教学基地"
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">科室</span>
                  <input
                    value={state.department_name}
                    onChange={(event) => updateField("department_name", event.target.value)}
                    placeholder="骨科 / 外科"
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                  />
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">手术间</span>
                  <input
                    value={state.operating_room_name}
                    onChange={(event) => updateField("operating_room_name", event.target.value)}
                    placeholder="OR-2"
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">预约开始</span>
                  <input
                    type="datetime-local"
                    value={state.scheduled_start_at}
                    onChange={(event) => updateField("scheduled_start_at", event.target.value)}
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">预约结束</span>
                  <input
                    type="datetime-local"
                    value={state.scheduled_end_at}
                    onChange={(event) => updateField("scheduled_end_at", event.target.value)}
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">术前摘要</span>
                <textarea
                  rows={7}
                  value={state.clinical_summary}
                  onChange={(event) => updateField("clinical_summary", event.target.value)}
                  placeholder="填写目前病例情况、手术风险点、希望专家重点关注的阶段。"
                  className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm leading-7 outline-none transition focus:border-teal-500"
                />
              </label>
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <div className="guidance-card rounded-[2rem] px-7 py-7">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Readiness</div>
              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
                <p>这一步只创建会话，不会自动打开直播房间。会话创建后，下一阶段再进入专家分配、开房间与录制流程。</p>
                <label className="flex items-start gap-3 rounded-[1.35rem] bg-slate-50 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={state.consent_confirmed}
                    onChange={(event) => updateField("consent_confirmed", event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600"
                  />
                  <span>
                    我确认本次远程指导已具备必要授权与知情同意，可进入平台留痕与后续录制流程。
                  </span>
                </label>
              </div>
            </div>

            <div className="guidance-card rounded-[2rem] px-7 py-7">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</div>
              <div className="mt-5 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "正在创建会话..." : "创建远程指导会话"}
                </button>
                <Link
                  href="/guidance"
                  className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  返回会话列表
                </Link>
              </div>
              {submitError ? (
                <div className="mt-4 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {submitError}
                </div>
              ) : null}
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
