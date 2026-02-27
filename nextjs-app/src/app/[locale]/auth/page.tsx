import { Metadata } from 'next';
import AuthPageClient from './AuthPageClient';

export const metadata: Metadata = {
  title: 'Sign In / Register - VetSphere',
  description: 'Access your VetSphere account or register as a new member to join the global veterinary surgical community.',
};

export default function AuthPage() {
  return <AuthPageClient />;
}
