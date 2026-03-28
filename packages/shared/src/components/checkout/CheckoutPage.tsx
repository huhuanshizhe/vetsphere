'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart, EnhancedCartItem } from '@vetsphere/shared/context/CartContext';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';
import { getLocaleCurrency, formatPrice } from '@vetsphere/shared/lib/currency';
import { Package, CreditCard, Building2, MapPin, User, Mail, Phone, Building, FileText, Truck, Shield, Check, Loader2, AlertCircle } from 'lucide-react';

interface CheckoutPageProps {
  locale: string;
}

interface ShippingMethod {
  code: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: string;
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
}

export default function CheckoutPage({ locale }: CheckoutPageProps) {
  const router = useRouter();
  const { cart, totalAmount, totalWeight, itemCount, clearCart } = useCart();
  const { t } = useLanguage();
  const currency = getLocaleCurrency(locale);
  const c = t.checkout;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

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
    shippingMethod: 'standard',
    paymentMethod: 'stripe',
    notes: '',
  });

  const shippingMethods: ShippingMethod[] = [
    { code: 'standard', name: c.standardShipping, description: c.standardShippingDesc, price: 15, estimatedDays: '5-10' },
    { code: 'express', name: c.expressShipping, description: c.expressShippingDesc, price: 35, estimatedDays: '2-5' },
  ];

  // 计算运费
  const selectedShipping = shippingMethods.find(s => s.code === formData.shippingMethod);
  const shippingFee = selectedShipping?.price || 0;

  // 订单总额
  const orderTotal = totalAmount + shippingFee;

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
            <div className="mt-8 flex gap-4 justify-center">
              <Link
                href={`/${locale}/user`}
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
    setLoading(true);
    setError(null);

    try {
      // 创建订单
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      
      // 根据支付方式处理
      if (formData.paymentMethod === 'stripe') {
        // 跳转Stripe支付
        const stripeResponse = await fetch('/api/payment/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: data.orderId,
            amount: orderTotal,
            currency: currency.toLowerCase(),
          }),
        });
        
        if (stripeResponse.ok) {
          const stripeData = await stripeResponse.json();
          window.location.href = stripeData.url;
          return;
        }
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
        
        if (paypalResponse.ok) {
          const paypalData = await paypalResponse.json();
          window.location.href = paypalData.approvalUrl;
          return;
        }
      }
      
      // 银行转账：直接显示订单成功
      setOrderId(data.orderId);
      setOrderCreated(true);
      clearCart();
      
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
              {/* 1. 联系信息 */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" /> {c.contactInfo}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {c.email} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>
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
              </div>

              {/* 2. 收货地址 */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" /> {c.shippingAddress}
                </h2>
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
                </h2>
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
                          <p className="text-sm text-gray-500">{method.description}</p>
                        </div>
                      </div>
                      <p className="font-medium text-gray-900">{formatPrice(method.price, currency)}</p>
                    </label>
                  ))}
                </div>
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
                    <p className="text-sm text-amber-800">
                      <strong>{c.bankTransferInstructions}</strong><br />
                      {c.bankTransferInstructionsDetail}
                    </p>
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
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        {item.skuCode && (
                          <p className="text-xs text-gray-500">SKU: {item.skuCode}</p>
                        )}
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatPrice(item.price * item.quantity, currency)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* 价格明细 */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{c.subtotalItems.replace('{count}', String(itemCount))}</span>
                    <span>{formatPrice(totalAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{c.shippingFee}</span>
                    <span>{formatPrice(shippingFee, currency)}</span>
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