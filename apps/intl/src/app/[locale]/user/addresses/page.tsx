import { Metadata } from 'next';
import AddressesClient from './page.client';

export const metadata: Metadata = {
  title: 'Addresses | VetSphere',
  description: 'Manage your shipping addresses',
};

export default function AddressesPage() {
  return <AddressesClient />;
}