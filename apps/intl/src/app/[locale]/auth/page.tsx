import { Metadata } from 'next';
import AuthPageClient from '@vetsphere/shared/pages/AuthPageClient';
import { noIndexRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Sign In / Register - VetSphere',
  description: 'Access your VetSphere account or register as a new member to join the global veterinary surgical community.',
  robots: noIndexRobots,
};

export default function AuthPage() {
  return <AuthPageClient />;
}
