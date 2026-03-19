'use client';

import { use } from 'react';
import ProductForm from '@/components/ProductForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

// This would be a server component fetching data in a real app
// For now, we'll handle data fetching client-side in ProductForm
export default function EditProductPage({ params }: PageProps) {
  const { id } = use(params);

  return <ProductForm productId={id} />;
}
