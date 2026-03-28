'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Package, ArrowRight, Loader2 } from 'lucide-react';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';

interface SuccessClientProps {
  locale: string;
  orderId?: string;
  success?: string;
}

export default function SuccessClient({ locale, orderId, success }: SuccessClientProps) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const { t } = useLanguage();
  const s = t.checkout.success;

  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (response.ok) {
          const data = await response.json();
          setOrder(data.order);
        }
      } catch (err) {
        console.error('Failed to verify order:', err);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* 成功图标 */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            {s.title}
          </h1>

          <p className="mt-4 text-gray-600">
            {s.subtitle}
          </p>

          {orderId && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{s.orderNumber}</p>
              <p className="text-lg font-mono font-bold text-gray-900">{orderId}</p>
            </div>
          )}

          {order && (
            <div className="mt-6 text-left border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{s.orderSummary}</h3>

              <div className="space-y-3">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover rounded" />
                      ) : (
                        <Package className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                      <p className="text-xs text-gray-500">{s.qty} {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.currency?.toUpperCase()} {item.total_price}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-lg font-bold">
                  <span>{s.total}</span>
                  <span>{order.currency?.toUpperCase()} {order.total}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${locale}/user/orders`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              {s.viewOrders}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={`/${locale}/shop`}
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {s.continueShopping}
            </Link>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            {s.emailSent}
          </p>
        </div>

        {/* 帮助信息 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            {s.needHelp.split('Contact')[0]}
            <Link href={`/${locale}/contact`} className="text-emerald-600 hover:text-emerald-700">
              {s.needHelp.includes('Contact') ? s.needHelp.split('Contact')[1]?.trim() : s.needHelp}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}