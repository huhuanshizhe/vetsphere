import { Metadata } from 'next';
import CheckoutPageClient from './CheckoutPageClient';

export const metadata: Metadata = {
  title: 'Checkout - VetSphere',
  description: 'Complete your purchase securely. Shop surgical equipment, course enrollments, and professional resources for veterinary surgeons.',
};

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
