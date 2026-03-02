'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { api } from '@vetsphere/shared/services/api';
import LoginForm from '@/components/LoginForm';

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, login } = useAuth();
  const router = useRouter();

  // If already logged in as admin, redirect
  if (user && user.role === 'Admin') {
    router.push('/dashboard');
    return null;
  }

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError('');

    try {
      const { user: authUser } = await api.login(email, password);

      if (authUser.role !== 'Admin') {
        throw new Error('权限不足：仅限系统管理员登录');
      }

      login(authUser);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || '登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo & title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 text-black text-3xl font-black mb-6 shadow-lg shadow-emerald-500/20">
            VS
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            系统管理中枢
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            VetSphere Admin Portal
          </p>
        </div>

        {/* Login form */}
        <LoginForm onSubmit={handleLogin} loading={loading} error={error} />

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-8">
          仅限授权管理员访问
        </p>
      </div>
    </div>
  );
}
