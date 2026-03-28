import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CartPageClient from './page.client';

export async function generateMetadata() {
  return {
    title: 'Shopping Cart | VetSphere',
    description: 'Review and manage your shopping cart',
  };
}

const validLocales = ['zh', 'en', 'th', 'ja'] as const;

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  // 验证 locale 是否有效
  if (!validLocales.includes(locale as any)) {
    // 重定向到默认 locale 的购物车页面
    redirect('/ja/cart');
  }

  return <CartPageClient locale={locale} />;
}