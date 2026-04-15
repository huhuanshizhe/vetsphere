'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { CheckCircle, Loader2, AlertCircle, CreditCard, Smartphone, Building, Mail, ChevronRight, Pencil, LogIn, UserPlus, User, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import CourseInfoCard from './CourseInfoCard';

const StripePaymentElement = dynamic(
  () => import('../checkout/StripePaymentElement'),
  { ssr: false }
);

interface CourseBuyPageProps {
  courseId: string;
  locale: string;
  site: 'cn' | 'intl';
}

interface CourseData {
  id: string;
  title: string;
  title_zh?: string;
  title_en?: string;
  cover_image_url?: string;
  image_url?: string;
  instructor_names?: any; // JSONB: { zh?: string; en?: string; ... } or string[]
  instructor?: any; // JSONB: { name?: string; ... }
  start_date?: string;
  end_date?: string;
  location?: any; // JSONB: { city?: { zh?: string; en?: string }, venue?: {...}, ... }
  format?: string;
  price: number;
  price_cny?: number;
  price_usd?: number;
  currency?: string;
  max_enrollment?: number;
  current_enrollment?: number;
}

type PaymentMethod = 'stripe' | 'paypal' | 'bank_transfer' | 'wechat' | 'alipay';

export default function CourseBuyPage({ courseId, locale, site }: CourseBuyPageProps) {
  const router = useRouter();
  const { user, isAuthenticated, login: authLogin, logout, refreshSession, updateUser } = useAuth();
  const isZh = locale === 'zh';
  const isCN = site === 'cn';

  // 一页结账账户状态机
  type AccountStep = 'email' | 'checking' | 'login' | 'register' | 'complete';
  const [accountStep, setAccountStep] = useState<AccountStep>(isAuthenticated ? 'complete' : 'email');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountFullName, setAccountFullName] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);

  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(isCN ? 'wechat' : 'stripe');

  // Order state
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderAmount, setOrderAmount] = useState(0);
  const [orderCurrency, setOrderCurrency] = useState('USD');
  const [showStripePayment, setShowStripePayment] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Fetch course data
  useEffect(() => {
    async function fetchCourse() {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        );
        const { data, error: fetchErr } = await supabase
          .from('courses')
          .select('id, title, title_zh, title_en, cover_image_url, image_url, instructor_names, instructor, start_date, end_date, location, format, price, price_cny, price_usd, currency, max_enrollment, current_enrollment')
          .eq('id', courseId)
          .single();

        if (fetchErr || !data) {
          setError(isZh ? '课程未找到' : 'Course not found');
          return;
        }
        setCourse(data as CourseData);
      } catch {
        setError(isZh ? '加载失败' : 'Failed to load course');
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [courseId, isZh]);

  // Auto-fill from auth + sync account step
  useEffect(() => {
    if (isAuthenticated && user) {
      setAccountStep('complete');
      if (user.email && !contactEmail) setContactEmail(user.email);
      if (user.name && !contactName) setContactName(user.name);
      if (user.mobile && !contactPhone) setContactPhone(user.mobile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const courseTitle = useMemo(() => {
    if (!course) return '';
    if (isZh) return course.title_zh || course.title;
    return course.title_en || course.title;
  }, [course, isZh]);

  // Extract instructor name from JSONB
  const instructorName = useMemo(() => {
    if (!course) return '';
    // Try instructor_names first
    const names = course.instructor_names;
    if (names) {
      if (typeof names === 'object' && !Array.isArray(names)) {
        return isZh ? (names.zh || names.en || '') : (names.en || names.zh || '');
      }
      if (Array.isArray(names) && names.length > 0) return names.join(', ');
    }
    // Fallback to instructor JSONB (flat keys: name_zh, name_en, name)
    const inst = course.instructor;
    if (inst && typeof inst === 'object') {
      const suffix = isZh ? '_zh' : '_en';
      return inst[`name${suffix}`] || inst.name_en || inst.name || '';
    }
    return '';
  }, [course, isZh]);

  // Extract location string from JSONB (flat keys like city_zh, venue_en)
  const locationStr = useMemo(() => {
    if (!course?.location) return '';
    const loc = course.location;
    if (typeof loc === 'string') return loc;
    if (typeof loc === 'object') {
      const suffix = isZh ? '_zh' : '_en';
      const city = loc[`city${suffix}`] || loc.city_zh || loc.city_en || loc.city || '';
      const venue = loc[`venue${suffix}`] || loc.venue_zh || loc.venue_en || loc.venue || '';
      return [city, venue].filter(Boolean).join(' · ');
    }
    return '';
  }, [course, isZh]);

  const coursePrice = useMemo(() => {
    if (!course) return 0;
    return isCN ? (course.price_cny || course.price || 0) : (course.price_usd || course.price || 0);
  }, [course, isCN]);

  const currency = isCN ? 'CNY' : (course?.currency || 'USD');

  const paymentMethods: { id: PaymentMethod; label: string; desc?: string; icon: React.ReactNode }[] = isCN
    ? [
        { id: 'wechat', label: '微信支付', icon: <Smartphone className="w-5 h-5" /> },
        { id: 'alipay', label: '支付宝', icon: <CreditCard className="w-5 h-5" /> },
      ]
    : [
        { id: 'stripe', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, Amex', icon: <CreditCard className="w-5 h-5" /> },
        { id: 'paypal', label: 'PayPal', desc: 'Pay with your PayPal account', icon: <span className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">P</span> },
        { id: 'bank_transfer', label: 'Bank Transfer', desc: 'Wire transfer (manual verification)', icon: <Building className="w-5 h-5" /> },
      ];

  // 检查邮箱是否已注册
  const handleEmailCheck = async () => {
    if (!accountEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail)) {
      setAccountError(isZh ? '请输入有效的邮箱地址' : 'Please enter a valid email');
      return;
    }
    setAccountError(null);
    setAccountStep('checking');
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: accountEmail }),
      });
      const data = await res.json();
      setAccountStep(data.exists ? 'login' : 'register');
    } catch {
      setAccountError(isZh ? '检查失败，请重试' : 'Failed to check email. Please try again.');
      setAccountStep('email');
    }
  };

  // 内联登录
  const handleInlineLogin = async () => {
    if (!accountPassword) {
      setAccountError(isZh ? '请输入密码' : 'Password is required');
      return;
    }
    setAccountLoading(true);
    setAccountError(null);
    try {
      const result = await api.login(accountEmail, accountPassword);
      authLogin(result.user);
      setContactEmail(result.user.email || accountEmail);
      setContactName(prev => prev || result.user.name || '');
      setAccountStep('complete');
      refreshSession().catch(() => {});
    } catch {
      setAccountError(isZh ? '邮箱或密码错误' : 'Invalid email or password. Please try again.');
    } finally {
      setAccountLoading(false);
    }
  };

  // 内联注册
  const handleInlineRegister = async () => {
    if (!accountFullName || !accountPassword) {
      setAccountError(isZh ? '请填写所有字段' : 'Please fill in all fields');
      return;
    }
    if (accountPassword.length < 6) {
      setAccountError(isZh ? '密码至少6位' : 'Password must be at least 6 characters');
      return;
    }
    setAccountLoading(true);
    setAccountError(null);
    try {
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: accountEmail,
          password: accountPassword,
          fullName: accountFullName,
          role: 'Doctor',
          locale,
        }),
      });
      const regData = await regRes.json();
      if (!regRes.ok || regData.error) {
        throw new Error(regData.error || 'Registration failed');
      }
      const loginResult = await api.login(accountEmail, accountPassword);
      authLogin(loginResult.user);
      setContactEmail(accountEmail);
      setContactName(accountFullName);
      setAccountStep('complete');
      refreshSession().catch(() => {});
    } catch (err: any) {
      setAccountError(err.message || (isZh ? '注册失败' : 'Registration failed. Please try again.'));
    } finally {
      setAccountLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course || submitting) return;

    // 必须完成登录/注册
    if (accountStep !== 'complete') {
      setError(isZh ? '请先登录或注册账户' : 'Please log in or create an account to continue');
      return;
    }

    if (!contactName.trim() || !contactEmail.trim()) {
      setError(isZh ? '请填写姓名和邮箱' : 'Please fill in name and email');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Get auth token
      let authToken: string | null = null;
      if (isAuthenticated) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        );
        const { data: { session } } = await supabase.auth.getSession();
        authToken = session?.access_token || null;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/course-orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          courseId: course.id,
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          paymentMethod,
          locale,
          currency,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order');
      }

      // 保存手机号到用户资料（fire-and-forget）
      if (user?.id && contactPhone && contactPhone.trim() !== ((user as any).mobile || '')) {
        api.saveUserProfile(user.id, { phone: contactPhone.trim() }).catch(() => {});
        updateUser({ mobile: contactPhone.trim() } as any);
      }

      setOrderId(data.orderId);
      setOrderNumber(data.orderNumber);
      setOrderAmount(data.amount);
      setOrderCurrency(data.currency);

      // Branch by payment method
      if (paymentMethod === 'stripe') {
        setShowStripePayment(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (paymentMethod === 'wechat') {
        // Initiate WeChat payment
        const wxRes = await fetch('/api/payment/wechat/create-order', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            orderId: data.orderId,
            amount: data.amount,
            description: courseTitle,
          }),
        });
        const wxData = await wxRes.json();
        if (wxData.success && wxData.codeUrl) {
          // For now, show the QR code URL - in production this would render a QR code
          setOrderSuccess(true);
        } else {
          throw new Error(wxData.error || 'WeChat payment failed');
        }
      } else if (paymentMethod === 'alipay') {
        const aliRes = await fetch('/api/payment/alipay/create-order', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            orderId: data.orderId,
            amount: data.amount,
            description: courseTitle,
          }),
        });
        const aliData = await aliRes.json();
        if (aliData.success && aliData.payUrl) {
          window.location.href = aliData.payUrl;
          return;
        } else {
          throw new Error(aliData.error || 'Alipay payment failed');
        }
      } else if (paymentMethod === 'paypal') {
        const paypalRes = await fetch('/api/payment/paypal/create-order', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            orderId: data.orderId,
            amount: data.amount,
            currency: data.currency,
          }),
        });
        const paypalData = await paypalRes.json();
        if (paypalData.approvalUrl) {
          window.location.href = paypalData.approvalUrl;
          return;
        } else {
          throw new Error(paypalData.error || 'PayPal checkout failed');
        }
      } else if (paymentMethod === 'bank_transfer') {
        // Bank transfer: order created, show success with instructions
        setOrderSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (isZh ? '订单创建失败' : 'Order creation failed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Course not found
  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{error || (isZh ? '课程未找到' : 'Course not found')}</p>
        </div>
      </div>
    );
  }

  // Stripe payment screen
  if (showStripePayment && orderId) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              {isZh ? '完成支付' : 'Complete Payment'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {isZh ? '订单号' : 'Order'}: {orderNumber}
            </p>
            <StripePaymentElement
              orderId={orderId}
              amount={orderAmount}
              currency={orderCurrency}
              onSuccess={() => setOrderSuccess(true)}
              onError={(err) => {
                setShowStripePayment(false);
                setError(err);
              }}
              onCancel={() => setShowStripePayment(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {isZh ? '报名成功！' : 'Enrollment Successful!'}
            </h2>
            <p className="text-gray-600 mb-1">{courseTitle}</p>
            <p className="text-sm text-gray-400 mb-6">
              {isZh ? '订单号' : 'Order'}: {orderNumber}
            </p>
            <div className="space-y-3">
              {isAuthenticated && (
                <button
                  onClick={() => router.push(`/${locale}/user?tab=courses`)}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-500 transition"
                >
                  {isZh ? '查看我的课程' : 'View My Courses'}
                </button>
              )}
              <button
                onClick={() => router.push(`/${locale}/courses`)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                {isZh ? '浏览更多课程' : 'Browse More Courses'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main purchase form
  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-12">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
        {/* Back link */}
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
        >
          &larr; {isZh ? '返回课程详情' : 'Back to course'}
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isZh ? '课程报名' : 'Course Enrollment'}
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            {/* Left column: Course Info + Contact */}
            <div className="lg:col-span-7 space-y-6">
              {/* Course Info */}
              <CourseInfoCard
                title={courseTitle}
                imageUrl={course.cover_image_url || course.image_url}
                instructorName={instructorName}
                startDate={course.start_date}
                endDate={course.end_date}
                location={locationStr}
                format={course.format}
                price={coursePrice}
                currency={currency}
                maxEnrollment={course.max_enrollment}
                currentEnrollment={course.current_enrollment}
                locale={locale}
              />

              {/* Account Section - 登录/注册 */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {isZh ? '账户' : 'Account'}
                  {accountStep === 'complete' && <Check className="w-4 h-4 text-emerald-500 ml-auto" />}
                </h3>

                {/* 已登录 */}
                {accountStep === 'complete' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {isZh ? '已登录：' : 'Logged in as '}<span className="font-bold">{contactEmail || user?.email}</span>
                        </p>
                        {(contactName || user?.name) && (
                          <p className="text-xs text-gray-500">{contactName || user?.name}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await logout();
                          setAccountStep('email');
                          setAccountEmail('');
                          setAccountPassword('');
                          setAccountError(null);
                          setContactEmail('');
                          setContactName('');
                          setContactPhone('');
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 underline whitespace-nowrap"
                      >
                        {isZh ? '切换账户' : 'Use a different account'}
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isZh ? '手机号' : 'Phone'}
                      </label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder={isZh ? '请输入手机号' : 'Enter phone number'}
                      />
                    </div>
                  </div>
                )}

                {/* 邮箱输入 */}
                {accountStep === 'email' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500">{isZh ? '请输入邮箱以继续' : 'Enter your email to continue'}</p>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        value={accountEmail}
                        onChange={(e) => { setAccountEmail(e.target.value); setAccountError(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEmailCheck(); } }}
                        placeholder={isZh ? '邮箱地址' : 'Email'}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleEmailCheck}
                        className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition flex items-center gap-2 font-medium whitespace-nowrap"
                      >
                        {isZh ? '继续' : 'Continue'} <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    {accountError && <p className="text-sm text-red-600">{accountError}</p>}
                  </div>
                )}

                {/* 检查中 */}
                {accountStep === 'checking' && (
                  <div className="flex items-center gap-3 py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                    <span className="text-sm text-gray-500">{isZh ? '检查中...' : 'Checking...'}</span>
                    <span className="text-sm font-medium text-gray-700">{accountEmail}</span>
                  </div>
                )}

                {/* 登录 - 已注册用户 */}
                {accountStep === 'login' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="font-medium">{accountEmail}</span>
                      <button type="button" onClick={() => { setAccountStep('email'); setAccountPassword(''); setAccountError(null); }} className="text-emerald-600 hover:text-emerald-700 ml-1">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">{isZh ? '欢迎回来！请输入密码登录。' : 'Welcome back! Enter your password to log in.'}</p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{isZh ? '密码' : 'Password'}</label>
                      <input
                        type="password"
                        value={accountPassword}
                        onChange={(e) => { setAccountPassword(e.target.value); setAccountError(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInlineLogin(); } }}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        autoComplete="current-password"
                        autoFocus
                      />
                    </div>
                    {accountError && <p className="text-sm text-red-600">{accountError}</p>}
                    <button
                      type="button"
                      onClick={handleInlineLogin}
                      disabled={accountLoading}
                      className="w-full py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 transition flex items-center justify-center gap-2 font-medium"
                    >
                      {accountLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                      {isZh ? '登录' : 'Log In'}
                    </button>
                  </div>
                )}

                {/* 注册 - 新用户 */}
                {accountStep === 'register' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="font-medium">{accountEmail}</span>
                      <button type="button" onClick={() => { setAccountStep('email'); setAccountPassword(''); setAccountFullName(''); setAccountError(null); }} className="text-emerald-600 hover:text-emerald-700 ml-1">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">{isZh ? '该邮箱尚未注册，请创建账户以继续' : 'No account found. Create an account to continue.'}</p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{isZh ? '姓名' : 'Full Name'} *</label>
                      <input
                        type="text"
                        value={accountFullName}
                        onChange={(e) => setAccountFullName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{isZh ? '设置密码' : 'Create a Password'} *</label>
                      <input
                        type="password"
                        value={accountPassword}
                        onChange={(e) => { setAccountPassword(e.target.value); setAccountError(null); }}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        autoComplete="new-password"
                        minLength={6}
                      />
                    </div>
                    {accountError && <p className="text-sm text-red-600">{accountError}</p>}
                    <button
                      type="button"
                      onClick={handleInlineRegister}
                      disabled={accountLoading}
                      className="w-full py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 transition flex items-center justify-center gap-2 font-medium"
                    >
                      {accountLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      {isZh ? '创建账户并继续' : 'Create Account & Continue'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right column: Payment + Submit (sticky) */}
            <div className="lg:col-span-5 mt-6 lg:mt-0">
              <div className="sticky top-8 space-y-6">
                {/* Payment Method */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    {isZh ? '支付方式' : 'Payment Method'}
                  </h3>
                  <div className="space-y-3">
                    {paymentMethods.map(pm => (
                      <label
                        key={pm.id}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          paymentMethod === pm.id
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={pm.id}
                          checked={paymentMethod === pm.id}
                          onChange={() => setPaymentMethod(pm.id)}
                          className="sr-only"
                        />
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          paymentMethod === pm.id ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {pm.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`font-medium ${
                            paymentMethod === pm.id ? 'text-emerald-700' : 'text-gray-700'
                          }`}>{pm.label}</span>
                          {pm.desc && (
                            <p className="text-xs text-gray-500 mt-0.5">{pm.desc}</p>
                          )}
                        </div>
                        {paymentMethod === pm.id && (
                          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">{isZh ? '课程费用' : 'Course Fee'}</span>
                    <span className="text-xl font-bold text-gray-900">
                      {currency === 'CNY' ? `¥${coursePrice.toLocaleString()}` : `$${coursePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>

                  {/* Error message */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-base hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/10"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {isZh ? '处理中...' : 'Processing...'}
                      </span>
                    ) : (
                      isZh ? '确认报名' : 'Confirm Enrollment'
                    )}
                  </button>

                  <p className="mt-3 text-xs text-gray-400 text-center">
                    {isZh ? '点击确认即表示您同意我们的服务条款' : 'By confirming, you agree to our Terms of Service'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
