# Stripe 嵌入式支付集成指南

> 本文档总结了在 Next.js 项目中成功集成 Stripe 嵌入式支付的经验，避免踩坑，一次性做对。

---

## 一、核心问题：环境变量的构建时内联

### 问题描述

Next.js 的 `NEXT_PUBLIC_*` 环境变量是在**构建时**被内联到客户端代码中的，而不是运行时获取。

这意味着：
- 在 Vercel 上修改环境变量后，**必须重新触发完整构建**
- 否则客户端代码中的值仍然是构建时的旧值（可能是 undefined）

### 解决方案：运行时获取密钥

**创建 API 端点 `/api/stripe-config/route.ts`：**

```typescript
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  const isValid = publishableKey && publishableKey.startsWith('pk_');
  
  if (!isValid) {
    return NextResponse.json({
      error: 'Stripe publishable key not configured',
    }, { status: 503 });
  }
  
  return NextResponse.json({
    publishableKey,
    keyType: publishableKey.startsWith('pk_live_') ? 'live' : 'test',
  });
}
```

**客户端组件运行时获取密钥：**

```typescript
const fetchStripePublishableKey = async (): Promise<string | null> => {
  try {
    const res = await fetch('/api/stripe-config');
    if (!res.ok) return null;
    const data = await res.json();
    return data.publishableKey || null;
  } catch (err) {
    console.error('Failed to fetch publishable key:', err);
    return null;
  }
};

// 使用
let key = await fetchStripePublishableKey();
if (!isValidKey(key)) {
  key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY; // fallback
}
```

---

## 二、支付组件选择：PaymentElement vs EmbeddedCheckout

### 推荐：使用 PaymentElement

**原因：**
- EmbeddedCheckout 需要特殊的 Stripe Dashboard 配置
- PaymentElement 更稳定，兼容性更好
- 支持所有支付方式（信用卡、Apple Pay、Google Pay 等）

### PaymentElement 实现示例

```typescript
'use client';

import { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// 获取 publishable key
const fetchStripePublishableKey = async (): Promise<string | null> => {
  try {
    const res = await fetch('/api/stripe-config');
    if (!res.ok) return null;
    const data = await res.json();
    return data.publishableKey || null;
  } catch (err) {
    return null;
  }
};

const isValidKey = (key: string | null | undefined) => key && key.startsWith('pk_');

// 支付表单组件
function CheckoutForm({ onSuccess, onError, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/checkout/success',
      },
    });

    if (error) {
      onError?.(error.message);
    } else {
      onSuccess?.();
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe || isProcessing}>
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}

// 主组件
export default function StripePayment({ orderId, amount, currency }) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // 1. 获取 publishable key
      let key = await fetchStripePublishableKey();
      if (!isValidKey(key)) {
        key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      }
      
      if (!isValidKey(key)) {
        console.error('Stripe key invalid');
        return;
      }

      // 2. 初始化 Stripe.js
      setStripePromise(loadStripe(key!));

      // 3. 创建 PaymentIntent
      const res = await fetch('/api/payment/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount, currency }),
      });
      
      const data = await res.json();
      setClientSecret(data.clientSecret);
      setLoading(false);
    }
    
    init();
  }, [orderId, amount, currency]);

  if (loading || !clientSecret || !stripePromise) {
    return <div>Loading...</div>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: 'stripe' },
      }}
    >
      <CheckoutForm />
    </Elements>
  );
}
```

---

## 三、后端 API 实现

### 1. 创建 PaymentIntent

```typescript
// /api/payment/stripe/create-payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey || secretKey.includes('placeholder')) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 }
    );
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });

  const body = await request.json();
  const { orderId, amount, currency = 'usd' } = body;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // 转换为分
    currency: currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: { orderId: orderId || '' },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
}
```

### 2. Webhook 处理支付结果

```typescript
// /api/payment/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature!, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.orderId;
      // 更新订单状态，发送确认邮件
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

---

## 四、CORS 配置

如果前端和后端不在同一域名，需要添加 CORS 头：

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 处理 OPTIONS 预检请求
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// 在响应中添加 CORS 头
return NextResponse.json(data, { headers: corsHeaders });
```

---

## 五、邮件通知配置

### 关键点

1. **API 路径正确**：`/api/email` 不是 `/${locale}/api/email`
2. **数据库字段名正确**：检查实际表结构
3. **订单项查询**：从 `order_items` 表查询，不是 `order.items`

### 示例

```typescript
// 发送订单确认邮件
await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'order_confirmation',
    to: customerEmail,
    locale: locale,
    data: {
      orderId: order.order_no,
      customerName: customerName,
      items: orderItems,
      totalAmount: total,
      orderUrl: orderUrl,
    },
  }),
});
```

---

## 六、调试技巧

### 1. 检查密钥配置

```bash
curl https://your-domain.com/api/stripe-config
```

应返回：
```json
{"publishableKey": "pk_live_...", "keyType": "live"}
```

### 2. 检查 PaymentIntent 创建

```bash
curl -X POST https://your-domain.com/api/payment/stripe/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{"amount": 10, "currency": "usd"}'
```

应返回包含 `_secret_` 的 clientSecret：
```json
{"clientSecret": "pi_xxx_secret_xxx", "paymentIntentId": "pi_xxx"}
```

### 3. 浏览器控制台日志

添加详细日志查看初始化过程：
```typescript
console.log('Stripe init:', {
  hasKey: !!key,
  isValid: isValidKey(key),
  clientSecretLength: clientSecret?.length,
  clientSecretIncludesSecret: clientSecret?.includes('_secret_'),
});
```

---

## 七、常见问题排查

### 问题 1：支付表单空白

**原因：**
- publishable key 未正确加载
- clientSecret 格式错误

**解决：**
- 使用运行时 API 获取密钥
- 确认 clientSecret 包含 `_secret_`

### 问题 2：构建后环境变量不生效

**原因：**
- `NEXT_PUBLIC_*` 变量在构建时内联
- Vercel 修改环境变量后未重新构建

**解决：**
- 通过 API 运行时获取
- 或触发完整重新部署

### 问题 3：Webhook 验证失败

**原因：**
- `STRIPE_WEBHOOK_SECRET` 未配置或配置错误

**解决：**
- 在 Stripe Dashboard 获取正确的 webhook secret
- 配置到 Vercel 环境变量

### 问题 4：邮件未发送

**原因：**
- API 路径错误
- 数据库字段名错误

**解决：**
- 检查 fetch URL 是否正确
- 验证数据库字段名与代码一致

---

## 八、最佳实践清单

### 环境变量
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (前端可访问)
- [ ] `STRIPE_SECRET_KEY` (仅后端)
- [ ] `STRIPE_WEBHOOK_SECRET` (仅后端)
- [ ] 在 Vercel 选择正确的环境 (Production/Preview/Development)

### 代码实现
- [ ] 运行时获取 publishable key
- [ ] 使用 PaymentElement 而非 EmbeddedCheckout
- [ ] 正确处理 loading/error 状态
- [ ] 添加详细日志便于调试

### 测试验证
- [ ] 本地测试支付流程
- [ ] 验证邮件发送
- [ ] 测试 Webhook（使用 Stripe CLI）
- [ ] 生产环境测试真实支付

---

## 九、依赖版本

```json
{
  "@stripe/react-stripe-js": "^5.6.0",
  "@stripe/stripe-js": "^8.8.0",
  "stripe": "^20.4.0"
}
```

---

## 十、参考链接

- [Stripe PaymentElement 文档](https://stripe.com/docs/payments/payment-element)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Next.js 环境变量](https://nextjs.org/docs/basic-features/environment-variables)

---

**文档版本**: 1.0  
**更新日期**: 2026-03-30  
**项目**: VetSphere 国际站 (vetsphere.net)