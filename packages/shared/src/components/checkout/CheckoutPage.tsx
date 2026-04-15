'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart, EnhancedCartItem } from '@vetsphere/shared/context/CartContext';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { getLocaleCurrency, formatPrice } from '@vetsphere/shared/lib/currency';
import { Package, CreditCard, Building2, MapPin, User, Mail, Phone, Building, FileText, Truck, Shield, Check, Loader2, AlertCircle, ArrowLeft, Lock, LogIn, UserPlus, ChevronRight, Pencil } from 'lucide-react';
import dynamic from 'next/dynamic';
import AddressSelector, { Address } from './AddressSelector';
import { api } from '@vetsphere/shared/services/api';
import { supabase } from '@vetsphere/shared/services/supabase';

// 动态导入 Stripe 支付组件以避免 SSR 问题
// 使用 PaymentElement 替代 EmbeddedCheckout，更稳定且配置更简单
const StripePaymentElement = dynamic(
  () => import('./StripePaymentElement'),
  { ssr: false }
);

interface CheckoutPageProps {
  locale: string;
}

interface ShippingMethod {
  id?: string;
  code: string;
  name: string;
  description: string;
  price: number;
  priceFormula?: string;
  estimatedDays: string;
  billingType?: string;
  baseFee?: number;
  perUnitFee?: number;
  freeShippingThreshold?: number | null;
}

interface CheckoutFormData {
  // 联系信息
  email: string;
  phone: string;
  // 收货地址
  name: string;
  company: string;
  country: string;
  state: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  // B2B信息
  companyName: string;
  poNumber: string;
  taxId: string;
  // 配送和支付
  shippingMethod: string;
  paymentMethod: string;
  // 备注
  notes: string;
  // 已选保存地址ID（用于服务端判断是否需要自动保存地址）
  savedAddressId: string;
}

export default function CheckoutPage({ locale }: CheckoutPageProps) {
  const router = useRouter();
  const { cart, totalAmount, totalWeight, itemCount, clearCart } = useCart();
  const { t } = useLanguage();
  const { isAuthenticated, user, login: authLogin, logout, refreshSession, updateUser } = useAuth();
  const currency = getLocaleCurrency(locale);
  const c = t.checkout;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [showStripePayment, setShowStripePayment] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [bankTransferInfo, setBankTransferInfo] = useState<any>(null);
  const [loadingBankInfo, setLoadingBankInfo] = useState(false);

  // 一页结账账户状态机
  type AccountStep = 'email' | 'checking' | 'login' | 'register' | 'complete';
  const [accountStep, setAccountStep] = useState<AccountStep>(isAuthenticated ? 'complete' : 'email');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountFullName, setAccountFullName] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);

  // 地址选择模式：'saved' = 使用已保存地址, 'manual' = 手动输入
  const [addressMode, setAddressMode] = useState<'saved' | 'manual'>(isAuthenticated ? 'saved' : 'manual');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const [formData, setFormData] = useState<CheckoutFormData>({
    email: '',
    phone: '',
    name: '',
    company: '',
    country: '',
    state: '',
    city: '',
    addressLine1: '',
    addressLine2: '',
    postalCode: '',
    companyName: '',
    poNumber: '',
    taxId: '',
    shippingMethod: '',
    paymentMethod: 'stripe',
    notes: '',
    savedAddressId: '',
  });

  // 登录用户自动填充联系信息 + 更新账户步骤
  useEffect(() => {
    if (isAuthenticated && user) {
      setAccountStep('complete');
      setAddressMode('saved');
      setFormData(prev => ({
        ...prev,
        email: prev.email || user.email || '',
        phone: prev.phone || (user as any).mobile || (user as any).phone || '',
        name: prev.name || (user as any).name || (user as any).full_name || '',
      }));
    }
  }, [isAuthenticated, user]);

  // 选择已保存地址时填充 formData
  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address);
    setFormData(prev => ({
      ...prev,
      name: address.name,
      company: address.company || '',
      email: address.email || prev.email,
      phone: address.phone || prev.phone,
      country: address.country,
      state: address.state || '',
      city: address.city,
      addressLine1: address.address_line1,
      addressLine2: address.address_line2 || '',
      postalCode: address.postal_code || '',
      taxId: address.tax_id || prev.taxId,
      savedAddressId: address.id,
    }));
  };

  // 检查邮箱是否已注册
  const handleEmailCheck = async () => {
    if (!accountEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail)) {
      setAccountError(c.emailRequired || 'Please enter a valid email');
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
      if (data.exists) {
        setAccountStep('login');
      } else {
        // 未注册用户必须创建账户
        setAccountStep('register');
      }
    } catch {
      setAccountError('Failed to check email. Please try again.');
      setAccountStep('email');
    }
  };

  // 内联登录
  const handleInlineLogin = async () => {
    if (!accountPassword) {
      setAccountError(c.password || 'Password is required');
      return;
    }
    setAccountLoading(true);
    setAccountError(null);
    try {
      const result = await api.login(accountEmail, accountPassword);
      authLogin(result.user);
      setFormData(prev => ({
        ...prev,
        email: result.user.email || accountEmail,
        name: prev.name || result.user.name || '',
      }));
      setAccountStep('complete');
      setAddressMode('saved');
      // 在后台刷新完整用户状态
      refreshSession().catch(() => {});
    } catch (err: any) {
      setAccountError(c.loginError || 'Invalid email or password. Please try again.');
    } finally {
      setAccountLoading(false);
    }
  };

  // 内联注册
  const handleInlineRegister = async () => {
    if (!accountFullName || !accountPassword) {
      setAccountError('Please fill in all fields');
      return;
    }
    if (accountPassword.length < 6) {
      setAccountError('Password must be at least 6 characters');
      return;
    }
    setAccountLoading(true);
    setAccountError(null);
    try {
      // 注册
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
      // 登录
      const loginResult = await api.login(accountEmail, accountPassword);
      authLogin(loginResult.user);
      setFormData(prev => ({
        ...prev,
        email: accountEmail,
        name: accountFullName,
      }));
      setAccountStep('complete');
      setAddressMode('saved');
      refreshSession().catch(() => {});
    } catch (err: any) {
      setAccountError(err.message || 'Registration failed. Please try again.');
    } finally {
      setAccountLoading(false);
    }
  };

  // 运费方法（从API获取）
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingZone, setShippingZone] = useState<{ code: string; name: Record<string, string> } | null>(null);

  // 从API获取真实产品重量（修复 localStorage 中旧购物车数据缺失 weight 的问题）
  const [refreshedWeights, setRefreshedWeights] = useState<Record<string, { weight: number | null; weight_unit: string | null }>>({});
  useEffect(() => {
    const productIds = cart.map(item => item.productId).filter(Boolean);
    if (productIds.length === 0) return;
    const uniqueIds = [...new Set(productIds)];
    fetch(`/api/product-weights?ids=${uniqueIds.join(',')}`)
      .then(res => res.json())
      .then(data => {
        if (data.weights) setRefreshedWeights(data.weights);
      })
      .catch(() => {});
  }, [cart]);

  // 使用刷新后的真实重量计算总重（克），覆盖 CartContext 中可能缺失的数据
  const effectiveTotalWeight = useMemo(() => {
    const hasRefreshed = Object.keys(refreshedWeights).length > 0;
    if (!hasRefreshed) return totalWeight; // 还没刷新时使用 CartContext 的值
    return cart.reduce((sum, item) => {
      const pid = item.productId || '';
      const rw = refreshedWeights[pid];
      // 优先使用API刷新的真实重量，其次使用购物车中已有的重量
      const weight = rw?.weight ?? item.weight ?? 0;
      const unit = rw?.weight_unit || item.weightUnit || 'kg';
      let weightInGrams = weight;
      if (unit === 'kg') weightInGrams *= 1000;
      if (unit === 'lb') weightInGrams *= 453.592;
      return sum + weightInGrams * item.quantity;
    }, 0);
  }, [cart, refreshedWeights, totalWeight]);

  // 获取运费方法
  useEffect(() => {
    if (!formData.country) {
      // 如果没有选择国家，清空运费选项，提示用户选择国家
      setShippingMethods([]);
      setShippingZone(null);
      return;
    }

    setLoadingShipping(true);
    // effectiveTotalWeight 单位是克(grams)，API 期望千克(kg)
    const weightInKg = effectiveTotalWeight / 1000;
    fetch(`/api/shipping-methods?country=${formData.country}&weight=${weightInKg}`)
      .then(res => res.json())
      .then(data => {
        if (data.methods && data.methods.length > 0) {
          setShippingZone(data.zone);
          const methods: ShippingMethod[] = data.methods.map((m: any) => ({
            id: m.id,
            code: m.method_code,
            name: m.method_name?.en || m.method_code,
            description: m.price_formula || m.method_description?.en || '',
            price: m.price || 0,
            priceFormula: m.price_formula,
            estimatedDays: m.estimated_days_min && m.estimated_days_max
              ? `${m.estimated_days_min}-${m.estimated_days_max}`
              : '',
            billingType: m.billing_type,
            baseFee: m.base_fee,
            perUnitFee: m.per_unit_fee,
            freeShippingThreshold: m.free_shipping_threshold,
          }));
          setShippingMethods(methods);
          // 自动选择第一个运费方法
          if (methods.length > 0 && !formData.shippingMethod) {
            setFormData(prev => ({ ...prev, shippingMethod: methods[0].code }));
          }
        } else {
          // 如果没有匹配的区域，使用默认运费
          setShippingMethods([
            { code: 'standard', name: c.standardShipping, description: c.standardShippingDesc, price: 15, estimatedDays: '5-10' },
            { code: 'express', name: c.expressShipping, description: c.expressShippingDesc, price: 35, estimatedDays: '2-5' },
          ]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch shipping methods:', err);
        // 出错时使用默认运费
        setShippingMethods([
          { code: 'standard', name: c.standardShipping, description: c.standardShippingDesc, price: 15, estimatedDays: '5-10' },
          { code: 'express', name: c.expressShipping, description: c.expressShippingDesc, price: 35, estimatedDays: '2-5' },
        ]);
      })
      .finally(() => setLoadingShipping(false));
  }, [formData.country, effectiveTotalWeight, c.standardShipping, c.standardShippingDesc, c.expressShipping, c.expressShippingDesc]);

  // 计算运费
  const selectedShipping = shippingMethods.find(s => s.code === formData.shippingMethod);
  const shippingFee = selectedShipping?.price || 0;

  // 订单总额
  const orderTotal = totalAmount + shippingFee;

  // 获取银行转账信息
  useEffect(() => {
    if (formData.paymentMethod === 'bank_transfer') {
      setLoadingBankInfo(true);
      fetch(`/api/bank-transfer?currency=${currency}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setBankTransferInfo(data);
          }
        })
        .catch(err => console.error('Failed to fetch bank transfer info:', err))
        .finally(() => setLoadingBankInfo(false));
    } else {
      setBankTransferInfo(null);
    }
  }, [formData.paymentMethod, currency]);

  // 空购物车检查
  if (cart.length === 0 && !orderCreated) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <Package className="mx-auto h-24 w-24 text-gray-400" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">{c.emptyCart}</h2>
            <p className="mt-2 text-gray-600">{c.emptyCartDesc}</p>
            <Link
              href={`/${locale}/shop`}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              {c.continueShopping}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Stripe 嵌入式支付页面
  if (showStripePayment && orderId && orderNumber) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => {
              setShowStripePayment(false);
              setOrderId(null);
              setOrderNumber(null);
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to checkout
          </button>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Complete Payment</h2>
            <p className="text-gray-600 mb-4">
              Order: <span className="font-mono font-bold">{orderNumber}</span>
            </p>
            <p className="text-gray-600 mb-6">
              Total: <span className="font-bold">{formatPrice(orderTotal, currency)}</span>
            </p>
            <StripePaymentElement
              orderId={orderId}
              amount={orderTotal}
              currency={currency}
              onSuccess={() => {
                setOrderCreated(true);
                setShowStripePayment(false);
                clearCart();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onError={(error) => {
                setError(error);
              }}
              onCancel={() => {
                setShowStripePayment(false);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 订单创建成功页面
  if (orderCreated && orderId) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">{c.orderPlaced}</h1>
            <p className="mt-2 text-gray-600">{c.orderNumber} <span className="font-mono font-bold">{orderId}</span></p>
            <p className="mt-4 text-sm text-gray-500">
              {formData.paymentMethod === 'bank_transfer'
                ? c.bankTransferNote
                : c.confirmationEmail}
            </p>

            {/* 银行转账信息 */}
            {formData.paymentMethod === 'bank_transfer' && bankTransferInfo && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
                <p className="font-bold text-amber-900 mb-3">{c.bankTransferInstructions}</p>
                <div className="space-y-1 text-sm text-amber-800">
                  <p><strong>Bank:</strong> {bankTransferInfo.bankName}</p>
                  <p><strong>Account Name:</strong> {bankTransferInfo.accountName}</p>
                  <p><strong>Account Number:</strong> {bankTransferInfo.accountNumber}</p>
                  <p><strong>SWIFT/BIC:</strong> {bankTransferInfo.swiftBic}</p>
                  <p><strong>Bank Address:</strong> {bankTransferInfo.bankAddress}</p>
                  <p className="mt-3 pt-3 border-t border-amber-200">
                    <strong>Payment Reference:</strong> {orderNumber || orderId}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-8 flex gap-4 justify-center">
              <Link
                href={`/${locale}/user?tab=orders`}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                {c.viewOrders}
              </Link>
              <Link
                href={`/${locale}/shop`}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {c.continueShopping}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleInputChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证账户步骤已完成（必须登录或注册）
    if (accountStep !== 'complete') {
      setError(c.enterEmailToContinue || 'Please log in or create an account to continue');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 获取认证 token
      let authToken: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        authToken = session?.access_token || null;
      } catch { /* continue without auth */ }

      const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) fetchHeaders['Authorization'] = `Bearer ${authToken}`;

      // 创建订单
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({
          items: cart,
          formData,
          currency,
          subtotal: totalAmount,
          shippingFee,
          total: orderTotal,
          locale,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create order');
      }

      const data = await response.json();
      
      // 如果订单创建失败
      if (!data.success || !data.orderId) {
        throw new Error(data.error || 'Failed to create order');
      }

      // 保存手机号到用户资料（fire-and-forget）
      if (user?.id && formData.phone && formData.phone !== (user as any).mobile) {
        api.saveUserProfile(user.id, { phone: formData.phone }).catch(() => {});
        updateUser({ mobile: formData.phone } as any);
      }
      
      // 根据支付方式处理
      if (formData.paymentMethod === 'stripe') {
        // 显示嵌入式 Stripe 支付
        setOrderId(data.orderId);
        setOrderNumber(data.orderNumber || data.orderId);
        setShowStripePayment(true);
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      } else if (formData.paymentMethod === 'paypal') {
        // 跳转PayPal支付
        const paypalResponse = await fetch('/api/payment/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: data.orderId,
            amount: orderTotal,
            currency,
          }),
        });
        
        if (!paypalResponse.ok) {
          const paypalError = await paypalResponse.json();
          throw new Error(paypalError.error || 'Failed to create PayPal checkout');
        }
        
        const paypalData = await paypalResponse.json();
        if (paypalData.approvalUrl) {
          window.location.href = paypalData.approvalUrl;
          return;
        } else {
          throw new Error('No approval URL returned from PayPal');
        }
      }
      
      // 银行转账：直接显示订单成功
      setOrderId(data.orderNumber || data.orderId);
      setOrderCreated(true);
      clearCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{c.title}</h1>

        <form onSubmit={handleSubmit}>
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            {/* 左栏：表单区域 */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1. 账户 - 一页结账集成登录/注册 */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span>{c.accountSection || 'Account'}</span>
                  {accountStep === 'complete' && (
                    <Check className="w-4 h-4 text-emerald-500 ml-auto" />
                  )}
                </h2>

                {/* 已登录状态 */}
                {accountStep === 'complete' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {c.loggedInAs || 'Logged in as'} <span className="font-bold">{formData.email || user?.email}</span>
                        </p>
                        {(formData.name || (user as any)?.name) && (
                          <p className="text-xs text-gray-500">{formData.name || (user as any)?.name}</p>
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
                          setAddressMode('manual');
                          setSelectedAddress(null);
                          setFormData(prev => ({ ...prev, savedAddressId: '' }));
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 underline whitespace-nowrap"
                      >
                        {c.changeAccount || 'Use a different account'}
                      </button>
                    </div>
                    {/* 已登录用户的电话输入 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {c.phone} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* 邮箱输入状态 */}
                {accountStep === 'email' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500">{c.enterEmailToContinue || 'Enter your email to continue'}</p>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input
                          type="email"
                          value={accountEmail}
                          onChange={(e) => { setAccountEmail(e.target.value); setAccountError(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEmailCheck(); } }}
                          placeholder={c.email || 'Email'}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          autoFocus
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleEmailCheck}
                        className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 font-medium whitespace-nowrap"
                      >
                        {c.emailContinue || 'Continue'} <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    {accountError && (
                      <p className="text-sm text-red-600">{accountError}</p>
                    )}
                  </div>
                )}

                {/* 检查中状态 */}
                {accountStep === 'checking' && (
                  <div className="flex items-center gap-3 py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                    <span className="text-sm text-gray-500">{c.checking || 'Checking...'}</span>
                    <span className="text-sm font-medium text-gray-700">{accountEmail}</span>
                  </div>
                )}

                {/* 登录状态 - 已注册用户输入密码 */}
                {accountStep === 'login' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="font-medium">{accountEmail}</span>
                      <button
                        type="button"
                        onClick={() => { setAccountStep('email'); setAccountPassword(''); setAccountError(null); }}
                        className="text-emerald-600 hover:text-emerald-700 ml-1"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">{c.welcomeBack || 'Welcome back! Enter your password to log in.'}</p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {c.password || 'Password'}
                      </label>
                      <input
                        type="password"
                        value={accountPassword}
                        onChange={(e) => { setAccountPassword(e.target.value); setAccountError(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInlineLogin(); } }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        autoComplete="current-password"
                        autoFocus
                      />
                    </div>
                    {accountError && (
                      <p className="text-sm text-red-600">{accountError}</p>
                    )}
                    <button
                      type="button"
                      onClick={handleInlineLogin}
                      disabled={accountLoading}
                      className="w-full py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      {accountLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogIn className="w-4 h-4" />
                      )}
                      {c.loginButton || 'Log In'}
                    </button>
                  </div>
                )}

                {/* 注册状态 - 新用户创建账户 */}
                {accountStep === 'register' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="font-medium">{accountEmail}</span>
                      <button
                        type="button"
                        onClick={() => { setAccountStep('email'); setAccountPassword(''); setAccountFullName(''); setAccountError(null); }}
                        className="text-emerald-600 hover:text-emerald-700 ml-1"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {c.registerName || 'Full Name'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={accountFullName}
                        onChange={(e) => setAccountFullName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {c.registerPassword || 'Create a Password'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={accountPassword}
                        onChange={(e) => { setAccountPassword(e.target.value); setAccountError(null); }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        autoComplete="new-password"
                        minLength={6}
                      />
                    </div>
                    {accountError && (
                      <p className="text-sm text-red-600">{accountError}</p>
                    )}
                    <button
                      type="button"
                      onClick={handleInlineRegister}
                      disabled={accountLoading}
                      className="w-full py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      {accountLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      {c.registerButton || 'Create Account & Continue'}
                    </button>
                  </div>
                )}
              </div>

              {/* 2. 收货地址 */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" /> {c.shippingAddress}
                </h2>

                {/* 登录用户显示地址模式切换 */}
                {isAuthenticated && (
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setAddressMode('saved')}
                      className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                        addressMode === 'saved'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {locale === 'zh' ? '选择已保存地址' : 'Saved Addresses'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddressMode('manual');
                        setSelectedAddress(null);
                        setFormData(prev => ({ ...prev, savedAddressId: '' }));
                      }}
                      className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                        addressMode === 'manual'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {locale === 'zh' ? '手动输入地址' : 'Enter Manually'}
                    </button>
                  </div>
                )}

                {/* 已保存地址选择器 */}
                {isAuthenticated && addressMode === 'saved' ? (
                  <AddressSelector
                    selectedId={selectedAddress?.id}
                    onSelect={handleAddressSelect}
                    onAddNew={() => { setAddressMode('manual'); setFormData(prev => ({ ...prev, savedAddressId: '' })); }}
                    locale={locale}
                  />
                ) : (
                  /* 手动输入地址表单 */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {c.fullName} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{c.company}</label>
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) => handleInputChange('company', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {c.country} <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        required
                      >
                        <option value="">{c.selectCountry}</option>
                        <option value="US">United States</option>
                        <option value="CN">China</option>
                        <option value="JP">Japan</option>
                        <option value="TH">Thailand</option>
                        <option value="SG">Singapore</option>
                        <option value="KR">South Korea</option>
                        <option value="UK">United Kingdom</option>
                        <option value="DE">Germany</option>
                        <option value="FR">France</option>
                        <option value="AU">Australia</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{c.stateProvince}</label>
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {c.city} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{c.postalCode}</label>
                        <input
                          type="text"
                          value={formData.postalCode}
                          onChange={(e) => handleInputChange('postalCode', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {c.addressLine1} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.addressLine1}
                        onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder={c.addressLine1Placeholder}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{c.addressLine2}</label>
                      <input
                        type="text"
                        value={formData.addressLine2}
                        onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder={c.addressLine2Placeholder}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. B2B信息 */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" /> {c.businessInfo}
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{c.companyName}</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{c.poNumber}</label>
                    <input
                      type="text"
                      value={formData.poNumber}
                      onChange={(e) => handleInputChange('poNumber', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{c.taxId}</label>
                    <input
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => handleInputChange('taxId', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. 配送方式 */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5" /> {c.shippingMethod}
                  {shippingZone && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({shippingZone.name?.en || shippingZone.code})
                    </span>
                  )}
                </h2>
                {loadingShipping ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="ml-2 text-gray-500">Loading shipping options...</span>
                  </div>
                ) : shippingMethods.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>{c.selectCountryFirst || 'Please select a country to see shipping options'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shippingMethods.map((method) => (
                      <label
                        key={method.code}
                        className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                          formData.shippingMethod === method.code
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shippingMethod"
                            value={method.code}
                            checked={formData.shippingMethod === method.code}
                            onChange={(e) => handleInputChange('shippingMethod', e.target.value)}
                            className="w-4 h-4 text-emerald-600"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{method.name}</p>
                            <p className="text-sm text-gray-500">
                              {method.estimatedDays && <span>{method.estimatedDays} days</span>}
                              {method.estimatedDays && method.description && ' - '}
                              {method.description}
                            </p>
                          </div>
                        </div>
                        <p className="font-medium text-gray-900">{formatPrice(method.price, currency)}</p>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. 支付方式 */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> {c.paymentMethod}
                </h2>
                <div className="space-y-3">
                  <label
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.paymentMethod === 'stripe'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="stripe"
                      checked={formData.paymentMethod === 'stripe'}
                      onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                      className="w-4 h-4 text-emerald-600"
                    />
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{c.creditCard}</p>
                      <p className="text-sm text-gray-500">{c.creditCardDesc}</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.paymentMethod === 'paypal'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paypal"
                      checked={formData.paymentMethod === 'paypal'}
                      onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                      className="w-4 h-4 text-emerald-600"
                    />
                    <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">P</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{c.paypal}</p>
                      <p className="text-sm text-gray-500">{c.paypalDesc}</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.paymentMethod === 'bank_transfer'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={formData.paymentMethod === 'bank_transfer'}
                      onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                      className="w-4 h-4 text-emerald-600"
                    />
                    <Building className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{c.bankTransfer}</p>
                      <p className="text-sm text-gray-500">{c.bankTransferDesc}</p>
                    </div>
                  </label>
                </div>

                {/* 银行转账信息 */}
                {formData.paymentMethod === 'bank_transfer' && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    {loadingBankInfo ? (
                      <p className="text-sm text-amber-800">Loading bank information...</p>
                    ) : bankTransferInfo ? (
                      <>
                        <p className="text-sm font-bold text-amber-900 mb-3">{c.bankTransferInstructions}</p>
                        <div className="space-y-1 text-sm text-amber-800">
                          <p><strong>Bank:</strong> {bankTransferInfo.bankName}</p>
                          <p><strong>Account Name:</strong> {bankTransferInfo.accountName}</p>
                          <p><strong>Account Number:</strong> {bankTransferInfo.accountNumber}</p>
                          <p><strong>SWIFT/BIC:</strong> {bankTransferInfo.swiftBic}</p>
                          <p><strong>Bank Address:</strong> {bankTransferInfo.bankAddress}</p>
                          <p className="mt-2 pt-2 border-t border-amber-200">
                            <strong>Payment Reference:</strong> {orderNumber || '[Your Order Number]'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-amber-800">
                        <strong>{c.bankTransferInstructions}</strong><br />
                        {c.bankTransferInstructionsDetail}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 备注 */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">{c.orderNotes}</h2>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={3}
                  placeholder={c.orderNotesPlaceholder}
                />
              </div>
            </div>

            {/* 右栏：订单摘要 */}
            <div className="lg:col-span-5 mt-8 lg:mt-0">
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">{c.orderSummary}</h2>

                {/* 商品列表 */}
                <div className="space-y-4 mb-6">
                  {cart.map((item) => {
                    const isUnavailable = item.unavailable;
                    const isOutOfStock = item.inStock === false;
                    const hasIssue = isUnavailable || isOutOfStock;

                    return (
                      <div key={item.id} className={`flex gap-4 ${hasIssue ? 'opacity-60' : ''}`}>
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          {/* 失效/下架标记 */}
                          {isUnavailable && (
                            <div className="absolute inset-0 bg-slate-800/60 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">Unavailable</span>
                            </div>
                          )}
                          {isOutOfStock && !isUnavailable && (
                            <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">Out of Stock</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${hasIssue ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.name}</p>
                          {item.skuCode && (
                            <p className="text-xs text-gray-500">SKU: {item.skuCode}</p>
                          )}
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          {hasIssue && (
                            <p className="text-xs text-red-500 font-medium mt-1">
                              {isUnavailable ? 'Product no longer available' : 'Out of stock'}
                            </p>
                          )}
                        </div>
                        <p className={`text-sm font-medium ${hasIssue ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {formatPrice(item.price * item.quantity, currency)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* 价格明细 */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{c.subtotalItems.replace('{count}', String(itemCount))}</span>
                    <span>{formatPrice(totalAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{c.shippingFee}</span>
                    {!formData.country ? (
                      <span className="text-amber-600">{c.selectCountryFirst || 'Select country first'}</span>
                    ) : (
                      <span>{formatPrice(shippingFee, currency)}</span>
                    )}
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{c.tax}</span>
                    <span>{c.taxCalculated}</span>
                  </div>
                </div>

                {/* 总计 */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between text-lg font-medium text-gray-900">
                    <span>{c.total}</span>
                    <span>{formatPrice(orderTotal, currency)}</span>
                  </div>
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* 提交按钮 */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 px-6 py-4 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {c.processing}
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      {c.placeOrder}
                    </>
                  )}
                </button>

                <p className="mt-4 text-xs text-gray-500 text-center">
                  {c.termsAgreement}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}