'use client';

import Link from 'next/link';
import { startTransition, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { getAccessTokenSafe } from '@vetsphere/shared/services/supabase';

type FormState = {
  case_title: string;
  title: string;
  consultation_type: string;
  pricing_mode: string;
  procedure_name: string;
  patient_species: string;
  patient_identifier: string;
  hospital_name: string;
  department_name: string;
  desired_response_at: string;
  requested_budget_amount: string;
  currency_code: string;
  question_summary: string;
  consent_confirmed: boolean;
};

const consultationTypeLabels: Record<string, string> = {
  case_plan: '病例方案咨询',
  second_opinion: '第二意见',
  follow_up: '复诊追问',
};

const pricingModeLabels: Record<string, string> = {
  fixed_package: '固定价咨询包',
  subscription_overage: '订阅超额',
};

export default function NewConsultationForm() {
  const router = useRouter();
  const { user, canAccessDoctorWorkspace, loading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [state, setState] = useState<FormState>({
    case_title: '',
    title: '',
    consultation_type: 'case_plan',
    pricing_mode: 'fixed_package',
    procedure_name: '',
    patient_species: '犬',
    patient_identifier: '',
    hospital_name: user?.organizationName || '',
    department_name: '',
    desired_response_at: '',
    requested_budget_amount: '',
    currency_code: 'CNY',
    question_summary: '',
    consent_confirmed: false,
  });

  const summary = useMemo(() => {
    return [
      state.procedure_name || '未填写术式',
      state.patient_species || '未填写物种',
      state.hospital_name || '未填写机构',
    ].join(' · ');
  }, [state.procedure_name, state.patient_species, state.hospital_name]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setState((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // 权限由服务端 API 校验，前端不做提前拦截以避免 auth state 异步更新导致误判

    setSubmitting(true);
    setSubmitError(null);

    try {
      const token = await getAccessTokenSafe();
      if (!token) {
        throw new Error('未获取到登录态，请先在中国站完成登录。');
      }

      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(state),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || '创建付费咨询失败。');
      }

      startTransition(() => {
        router.push('/consultations');
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '创建付费咨询失败。');
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
              <span className="guidance-pill inline-flex bg-amber-50 text-amber-700">
                Paid Consultation
              </span>
              <h1 className="mt-4 max-w-2xl font-serif text-4xl leading-tight text-slate-950">
                先建立病例主档，再发起一次可结算的专家方案咨询。
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                这一步会创建病例主档与咨询订单，作为后续专家报价、交付报告、追问窗口和术中升级的统一入口。
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="rounded-full border border-slate-200 px-3 py-1">Case first</span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  固定价 / 订阅超额
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  可升级到术中指导
                </span>
              </div>
            </div>
            <div className="bg-[linear-gradient(160deg,rgba(245,158,11,0.10),rgba(15,118,110,0.08))] px-7 py-8">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_40px_rgba(16,32,51,0.08)]">
                <div className="text-sm font-semibold text-slate-500">本次咨询预览</div>
                <div className="mt-4 text-2xl font-semibold text-slate-950">
                  {state.case_title || state.title || '等待填写咨询标题'}
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-600">{summary}</div>
                <dl className="mt-6 grid gap-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-slate-500">咨询类型</dt>
                    <dd className="font-semibold text-slate-800">
                      {consultationTypeLabels[state.consultation_type]}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-slate-500">计费模型</dt>
                    <dd className="font-semibold text-slate-800">
                      {pricingModeLabels[state.pricing_mode]}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-slate-500">期望回复</dt>
                    <dd className="font-semibold text-slate-800">
                      {state.desired_response_at
                        ? state.desired_response_at.replace('T', ' ')
                        : '待填写'}
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
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                Consult Intake
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">病例主档与咨询信息</h2>
            </div>

            <div className="mt-6 grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">病例标题</span>
                <input
                  value={state.case_title}
                  onChange={(event) => updateField('case_title', event.target.value)}
                  placeholder="例如：犬胸腰段椎间盘突出病例"
                  className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-amber-500"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">咨询标题</span>
                <input
                  required
                  value={state.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  placeholder="例如：脊柱减压手术方案与风险控制咨询"
                  className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-amber-500"
                />
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">咨询类型</span>
                  <select
                    value={state.consultation_type}
                    onChange={(event) => updateField('consultation_type', event.target.value)}
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-amber-500"
                  >
                    {Object.entries(consultationTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">计费模型</span>
                  <select
                    value={state.pricing_mode}
                    onChange={(event) => updateField('pricing_mode', event.target.value)}
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-amber-500"
                  >
                    {Object.entries(pricingModeLabels).map(([value, label]) => (
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
                    onChange={(event) => updateField('procedure_name', event.target.value)}
                    placeholder="例如：TPLO / 脊柱减压 / 胆囊切除"
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-amber-500"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">动物种类</span>
                  <input
                    value={state.patient_species}
                    onChange={(event) => updateField('patient_species', event.target.value)}
                    placeholder="犬 / 猫 / 异宠"
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-amber-500"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">患者标识</span>
                <input
                  value={state.patient_identifier}
                  onChange={(event) => updateField('patient_identifier', event.target.value)}
                  placeholder="病例号 / 院内编号 / 脱敏患者标识"
                  className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-amber-500"
                />
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">机构名称</span>
                  <input
                    value={state.hospital_name}
                    onChange={(event) => updateField('hospital_name', event.target.value)}
                    placeholder="医院 / 中心 / 教学基地"
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-amber-500"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">科室</span>
                  <input
                    value={state.department_name}
                    onChange={(event) => updateField('department_name', event.target.value)}
                    placeholder="骨科 / 外科 / 影像"
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-amber-500"
                  />
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <label className="grid gap-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">期望回复时间</span>
                  <input
                    type="datetime-local"
                    value={state.desired_response_at}
                    onChange={(event) => updateField('desired_response_at', event.target.value)}
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-amber-500"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">预算</span>
                  <input
                    value={state.requested_budget_amount}
                    onChange={(event) => updateField('requested_budget_amount', event.target.value)}
                    placeholder="例如：299"
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-amber-500"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">问题描述</span>
                <textarea
                  required
                  rows={8}
                  value={state.question_summary}
                  onChange={(event) => updateField('question_summary', event.target.value)}
                  placeholder="请说明目前病例情况、已完成检查、想让专家重点判断的风险点，以及希望交付的方案形式。"
                  className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm leading-7 outline-none transition focus:border-amber-500"
                />
              </label>
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <div className="guidance-card rounded-[2rem] px-7 py-7">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                Delivery
              </div>
              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
                <p>
                  首期交付形式默认为结构化方案报告，后续再叠加追问窗口、报告修订和升级为术中指导。
                </p>
                <label className="flex items-start gap-3 rounded-[1.35rem] bg-slate-50 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={state.consent_confirmed}
                    onChange={(event) => updateField('consent_confirmed', event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600"
                  />
                  <span>
                    我确认本次付费咨询已具备必要授权与知情同意，可进入平台留痕、定价与专家交付流程。
                  </span>
                </label>
              </div>
            </div>

            <div className="guidance-card rounded-[2rem] px-7 py-7">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Actions
              </div>
              <div className="mt-5 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? '正在创建咨询订单...' : '创建付费咨询订单'}
                </button>
                <Link
                  href="/consultations"
                  className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  返回咨询列表
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
