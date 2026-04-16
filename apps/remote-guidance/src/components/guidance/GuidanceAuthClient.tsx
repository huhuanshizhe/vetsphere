'use client';

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@vetsphere/shared/services/supabase";
import { useAuth } from "@vetsphere/shared/context/AuthContext";
import { useGuidanceSessionBridge } from "@/components/guidance/GuidanceSessionBridge";

function isValidMobile(mobile: string) {
  return /^1[3-9]\d{9}$/.test(mobile);
}

export default function GuidanceAuthClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, refreshSession } = useAuth();
  const { isSyncing } = useGuidanceSessionBridge();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    const redirect = searchParams.get("redirect");
    if (redirect && redirect.startsWith("/")) {
      return redirect;
    }
    return "/guidance";
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidMobile(mobile)) {
      setError("请输入正确的手机号。");
      return;
    }

    if (!password || password.length < 8) {
      setError("请输入正确的登录密码。");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login-by-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mobile, password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "登录失败，请检查手机号和密码。");
      }

      if (!payload?.session?.accessToken || !payload?.session?.refreshToken) {
        throw new Error("登录成功，但未获取到会话信息。");
      }

      await supabase.auth.setSession({
        access_token: payload.session.accessToken,
        refresh_token: payload.session.refreshToken,
      });
      await refreshSession();
      router.replace(redirectTo);
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "登录失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  if (isAuthenticated || isSyncing) {
    return (
      <main className="guidance-shell">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-5 py-10">
          <section className="guidance-card w-full rounded-[2rem] px-8 py-10 text-center">
            <h1 className="text-3xl font-semibold text-slate-950">
              {isAuthenticated ? "当前已登录" : "正在同步主站登录态"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {isAuthenticated
                ? "远程指导应用已经拿到当前域名下的登录态，可以直接进入手术指导台继续测试。"
                : "如果你已经在 vetsphere.cn 登录，这里会自动接入同一个医生会话，不需要再次输入账号密码。"}
            </p>
            {isAuthenticated ? (
              <Link
                href={redirectTo}
                className="mt-6 inline-flex rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                返回远程指导台
              </Link>
            ) : null}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="guidance-shell">
      <div className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <section className="guidance-card rounded-[2rem] px-7 py-8 lg:px-10 lg:py-10">
          <span className="guidance-pill inline-flex bg-teal-50 text-teal-700">Doctor Login</span>
          <h1 className="mt-5 max-w-2xl font-serif text-4xl leading-tight text-slate-950">
            从当前域名直接登录医生账号，进入跨国手术实时指导。
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            只有当主站当前没有有效登录态时，才需要手动登录。正常情况下，系统会先自动从 vetsphere.cn 同步你的医生会话。
          </p>
        </section>

        <section className="guidance-card rounded-[2rem] px-7 py-8 lg:px-8 lg:py-10">
          <h2 className="text-2xl font-semibold text-slate-950">医生账号登录</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            如果自动同步没有成功，再使用已有的中国站医生账号手动登录。
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">手机号</label>
              <input
                type="tel"
                value={mobile}
                onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="请输入医生账号手机号"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-teal-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">密码</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入密码"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-teal-500 focus:bg-white"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-400"
            >
              {submitting ? "登录中..." : "登录并进入远程指导"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
