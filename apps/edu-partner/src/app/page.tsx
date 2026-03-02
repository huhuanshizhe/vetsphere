'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { api } from '@vetsphere/shared/services/api';
import LoginForm from '@/components/LoginForm';

export default function EduPartnerLoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'CourseProvider') {
        router.push('/dashboard');
      } else {
        setError('抱歉，此后台仅限课程合作机构使用');
      }
    }
  }, [user, loading, router]);

  const handleLogin = async (email: string, password: string) => {
    setError('');
    setIsLoggingIn(true);
    try {
      const { user: authUser } = await api.login(email, password);

      if (authUser.role !== 'CourseProvider') {
        throw new Error('权限不足：仅限课程合作机构登录');
      }

      login(authUser);
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '登录失败，请检查邮箱和密码';
      setError(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0A1F]">
        <div className="animate-pulse text-purple-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F0A1F] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl edu-gradient mb-4">
            <span className="text-3xl">📚</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">教育合作伙伴中心</h1>
          <p className="text-gray-400">VetSphere 课程机构管理后台</p>
        </div>

        {/* Login form */}
        <div className="edu-card p-8">
          <LoginForm
            onSubmit={handleLogin}
            loading={isLoggingIn}
            error={error}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          遇到问题？请联系 <a href="mailto:edu@vetsphere.cn" className="text-purple-400 hover:underline">edu@vetsphere.cn</a>
        </p>
      </div>
    </div>
  );
}
