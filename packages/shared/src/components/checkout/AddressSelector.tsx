'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, Check, Building2 } from 'lucide-react';

export interface Address {
  id: string;
  user_id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  country: string;
  state?: string;
  city: string;
  address_line1: string;
  address_line2?: string;
  postal_code?: string;
  tax_id?: string;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
}

interface AddressSelectorProps {
  selectedId?: string;
  onSelect: (address: Address) => void;
  onAddNew: () => void;
  locale?: string;
}

export default function AddressSelector({ 
  selectedId, 
  onSelect, 
  onAddNew,
  locale = 'en' 
}: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 加载地址列表
  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/addresses');
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
        // 如果有默认地址且没有选中，自动选择默认地址
        if (data.addresses?.length > 0 && !selectedId) {
          const defaultAddr = data.addresses.find((a: Address) => a.is_default);
          if (defaultAddr) {
            onSelect(defaultAddr);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(locale === 'zh' ? '确定要删除这个地址吗？' : 'Are you sure you want to delete this address?')) {
      return;
    }

    try {
      const res = await fetch(`/api/addresses?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAddresses(prev => prev.filter(a => a.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete address:', error);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-20 bg-gray-100 rounded-lg" />
        <div className="h-20 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 已保存地址列表 */}
      {addresses.length > 0 ? (
        <div className="space-y-3">
          {addresses.map((address) => (
            <div
              key={address.id}
              onClick={() => onSelect(address)}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedId === address.id
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {selectedId === address.id && (
                <div className="absolute top-3 right-3">
                  <Check className="w-5 h-5 text-emerald-600" />
                </div>
              )}

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{address.name}</span>
                    {address.is_default && (
                      <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded">
                        {locale === 'zh' ? '默认' : 'Default'}
                      </span>
                    )}
                  </div>
                  {address.company && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <Building2 className="w-3 h-3" />
                      {address.company}
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    {address.address_line1}
                    {address.address_line2 && `, ${address.address_line2}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {address.city}
                    {address.state && `, ${address.state}`}
                    {address.postal_code && ` ${address.postal_code}`}
                  </p>
                  <p className="text-sm text-gray-600">{address.country}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {address.phone} · {address.email}
                  </p>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(address.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(address.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* 添加新地址按钮 */}
      <button
        onClick={onAddNew}
        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-emerald-500 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        <span>{locale === 'zh' ? '添加新地址' : 'Add New Address'}</span>
      </button>
    </div>
  );
}