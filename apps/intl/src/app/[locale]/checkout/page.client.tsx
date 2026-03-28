'use client';

import CheckoutPage from '@vetsphere/shared/components/checkout/CheckoutPage';

interface CheckoutClientProps {
  locale: string;
}

export default function CheckoutClient({ locale }: CheckoutClientProps) {
  return <CheckoutPage locale={locale} />;
}