import { Metadata } from 'next';
import AddressesClient from './page.client';
import { noIndexRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Addresses | VetSphere',
  description: 'Manage your shipping addresses',
  robots: noIndexRobots,
};

export default function AddressesPage() {
  return <AddressesClient />;
}