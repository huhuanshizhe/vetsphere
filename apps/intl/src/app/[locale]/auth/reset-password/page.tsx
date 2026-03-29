'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';

// Loading component for Suspense
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  );
}

// Translations
const translations = {
  en: {
    title: 'Reset Your Password',
    subtitle: 'Enter your new password below',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    passwordPlaceholder: 'Enter new password',
    confirmPasswordPlaceholder: 'Confirm new password',
    resetButton: 'Reset Password',
    resetting: 'Resetting...',
    success: 'Password reset successfully! Redirecting...',
    error: 'Failed to reset password. Please try again.',
    invalidLink: 'Invalid or expired reset link. Please request a new password reset.',
    passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 8 characters',
    backToLogin: 'Back to Login',
  },
  zh: {
    title: '重置密码',
    subtitle: '请输入您的新密码',
    newPassword: '新密码',
    confirmPassword: '确认密码',
    passwordPlaceholder: '输入新密码',
    confirmPasswordPlaceholder: '确认新密码',
    resetButton: '重置密码',
    resetting: '重置中...',
    success: '密码重置成功！正在跳转...',
    error: '密码重置失败，请重试。',
    invalidLink: '重置链接无效或已过期，请重新申请密码重置。',
    passwordMismatch: '两次密码输入不一致',
    passwordTooShort: '密码至少需要8个字符',
    backToLogin: '返回登录',
  },
  ja: {
    title: 'パスワードをリセット',
    subtitle: '新しいパスワードを入力してください',
    newPassword: '新しいパスワード',
    confirmPassword: 'パスワード確認',
    passwordPlaceholder: '新しいパスワードを入力',
    confirmPasswordPlaceholder: 'パスワードを確認',
    resetButton: 'パスワードをリセット',
    resetting: '処理中...',
    success: 'パスワードがリセットされました！リダイレクト中...',
    error: 'パスワードのリセットに失敗しました。もう一度お試しください。',
    invalidLink: 'リセットリンクが無効または期限切れです。新しいパスワードリセットをリクエストしてください。',
    passwordMismatch: 'パスワードが一致しません',
    passwordTooShort: 'パスワードは8文字以上である必要があります',
    backToLogin: 'ログインに戻る',
  },
  th: {
    title: 'รีเซ็ตรหัสผ่าน',
    subtitle: 'กรุณากรอกรหัสผ่านใหม่',
    newPassword: 'รหัสผ่านใหม่',
    confirmPassword: 'ยืนยันรหัสผ่าน',
    passwordPlaceholder: 'กรอกรหัสผ่านใหม่',
    confirmPasswordPlaceholder: 'ยืนยันรหัสผ่าน',
    resetButton: 'รีเซ็ตรหัสผ่าน',
    resetting: 'กำลังดำเนินการ...',
    success: 'รีเซ็ตรหัสผ่านสำเร็จ! กำลังเปลี่ยนหน้า...',
    error: 'รีเซ็ตรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง',
    invalidLink: 'ลิงก์รีเซ็ตไม่ถูกต้องหรือหมดอายุ กรุณาขอรีเซ็ตรหัสผ่านใหม่',
    passwordMismatch: 'รหัสผ่านไม่ตรงกัน',
    passwordTooShort: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
    backToLogin: 'กลับไปหน้าเข้าสู่ระบบ',
  },
};

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { locale } = useLanguage();
  const t = translations[locale as 'en' | 'zh' | 'ja' | 'th'] || translations.en;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidLink, setIsValidLink] = useState(true);

  useEffect(() => {
    // Check if we have the necessary tokens in the URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');

    if (!accessToken || type !== 'recovery') {
      setIsValidLink(false);
    }
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords
    if (password.length < 8) {
      setError(t.passwordTooShort);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (!accessToken || !refreshToken) {
        setError(t.invalidLink);
        setLoading(false);
        return;
      }

      // Set the session using the tokens from the URL
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setError(t.invalidLink);
        setLoading(false);
        return;
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(t.error);
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push(`/${locale}/auth`);
      }, 2000);

    } catch (err) {
      console.error('Password reset error:', err);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  if (!isValidLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.invalidLink}</h2>
          <a
            href={`/${locale}/auth`}
            className="mt-6 inline-block text-purple-600 hover:text-purple-700 font-medium"
          >
            {t.backToLogin}
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.success}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.title}</h1>
          <p className="text-gray-600">{t.subtitle}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleResetPassword} className="space-y-6">
          {/* New Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t.newPassword}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              {t.confirmPassword}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.confirmPasswordPlaceholder}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg shadow-md hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? t.resetting : t.resetButton}
          </button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <a
            href={`/${locale}/auth`}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            {t.backToLogin}
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResetPasswordContent />
    </Suspense>
  );
}