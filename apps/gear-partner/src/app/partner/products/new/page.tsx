'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function PartnerProductNewPage() {
  const router = useRouter();

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-emerald-600 hover:text-emerald-900 mb-4"
        >
          ← 返回列表
        </button>
        <h1 className="text-2xl font-bold text-gray-900">发布新商品</h1>
        <p className="text-gray-600 mt-1">填写商品信息并提交审核</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">商品发布表单开发中...</p>
          <p className="text-sm">
            请使用已有的 ProductForm 组件和 SkuVariantEditor 组件
          </p>
        </div>
      </div>
    </div>
  );
}
