'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, SESSION_TOKEN_KEY } from '@vetsphere/shared/services/supabase';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { useGuidanceSessionBridge } from '@/components/guidance/GuidanceSessionBridge';

function isValidMobile(mobile: string) {
  return /^1[3-9]\d{9}$/.test(mobile);
}

type GuidanceAuthPayload = {
  session?: {
    accessToken?: string;
    refreshToken?: string;
  } | null;
};

export default function GuidanceAuthClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, refreshSession } = useAuth();
  const { isSyncing } = useGuidanceSessionBridge();
  const [authMode, setAuthMode] = useState<'password' | 'code'>('password');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    const redirect = searchParams.get('redirect');
    if (redirect && redirect.startsWith('/')) {
      return redirect;
    }
    return '/guidance';
  }, [searchParams]);

  async function finalizeLogin(payload: GuidanceAuthPayload) {
    if (!payload?.session?.accessToken || !payload?.session?.refreshToken) {
      throw new Error('登录成功，但未获取到会话信息。');
    }

    await supabase.auth.setSession({
      access_token: payload.session.accessToken,
      refresh_token: payload.session.refreshToken,
    });
    // 备份 token 到 sessionStorage，规避 Supabase SDK Web Lock 超时导致 getAccessTokenSafe 拿不到 token
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, payload.session.accessToken);
    }
    await refreshSession();
    router.replace(redirectTo);
    router.refresh();
  }

  async function handlePasswordLogin() {
    try {
      const response = await fetch('/api/auth/login-by-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobile, password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || '登录失败，请检查手机号和密码。');
      }

      await finalizeLogin(payload);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '登录失败，请稍后重试。');
    }
  }

  async function handleCodeLogin() {
    try {
      const response = await fetch('/api/auth/login-by-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobile, code: smsCode }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || '验证码登录失败，请检查手机号和验证码。');
      }

      await finalizeLogin(payload);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '验证码登录失败，请稍后重试。');
    }
  }

  async function handleSendCode() {
    if (!isValidMobile(mobile)) {
      setError('请输入正确的手机号。');
      return;
    }

    setSendingCode(true);
    setError(null);
    setInfoMessage(null);

    try {
      const response = await fetch('/api/auth/send-sms-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobile, purpose: 'login' }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || '验证码发送失败，请稍后重试。');
      }

      setInfoMessage(
        payload?.code
          ? `验证码已发送。开发环境验证码：${payload.code}`
          : '验证码已发送，请留意短信并在 5 分钟内完成登录。',
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '验证码发送失败，请稍后重试。');
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidMobile(mobile)) {
      setError('请输入正确的手机号。');
      return;
    }

    if (authMode === 'password') {
      if (!password || password.length < 8) {
        setError('请输入正确的登录密码。');
        return;
      }
    } else if (!/^\d{6}$/.test(smsCode)) {
      setError('请输入 6 位验证码。');
      return;
    }

    setSubmitting(true);
    setError(null);
    setInfoMessage(null);

    try {
      if (authMode === 'password') {
        await handlePasswordLogin();
      } else {
        await handleCodeLogin();
      }
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
              {isAuthenticated ? '当前已登录' : '正在同步主站登录态'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {isAuthenticated
                ? '远程指导应用已经拿到当前域名下的登录态，可以直接进入手术指导台继续测试。'
                : '如果你已经在 vetsphere.cn 登录，这里会自动接入同一个医生会话，不需要再次输入账号密码。'}
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
            只有当主站当前没有有效登录态时，才需要手动登录。正常情况下，系统会先自动从 vetsphere.cn
            同步你的医生会话。
          </p>
        </section>

        <section className="guidance-card rounded-[2rem] px-7 py-8 lg:px-8 lg:py-10">
          <h2 className="text-2xl font-semibold text-slate-950">医生账号登录</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            如果自动同步没有成功，再使用已有的中国站医生账号手动登录。
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 rounded-[1.5rem] bg-slate-100 p-2">
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setError(null);
                setInfoMessage(null);
              }}
              className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${
                authMode === 'password' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
              }`}
            >
              密码登录
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('code');
                setError(null);
                setInfoMessage(null);
              }}
              className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${
                authMode === 'code' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
              }`}
            >
              验证码登录
            </button>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">手机号</label>
              <input
                type="tel"
                value={mobile}
                onChange={(event) => setMobile(event.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="请输入医生账号手机号"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-teal-500 focus:bg-white"
              />
            </div>

            {authMode === 'password' ? (
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
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">验证码</label>
                    <input
                      type="text"
                      value={smsCode}
                      onChange={(event) =>
                        setSmsCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      placeholder="请输入 6 位验证码"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-teal-500 focus:bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSendCode()}
                    disabled={sendingCode || submitting}
                    className="rounded-full border border-teal-300 bg-teal-50 px-5 py-3 text-sm font-semibold text-teal-700 transition hover:border-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingCode ? '发送中...' : '发送验证码'}
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
                  如果你当前只有测试手机号和验证码，可以直接切到这里登录，无需先设置密码。
                </div>
              </>
            )}

            {infoMessage ? (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
                {infoMessage}
              </div>
            ) : null}

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
              {submitting
                ? '登录中...'
                : authMode === 'password'
                  ? '密码登录并进入远程指导'
                  : '验证码登录并进入远程指导'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
