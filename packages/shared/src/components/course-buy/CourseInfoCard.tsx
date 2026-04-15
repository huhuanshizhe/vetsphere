'use client';

import { Calendar, MapPin, Monitor, Users, Clock } from 'lucide-react';

interface CourseInfoCardProps {
  title: string;
  imageUrl?: string;
  instructorName?: string;
  instructorPhoto?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  format?: string;
  price: number;
  currency: string;
  maxEnrollment?: number;
  currentEnrollment?: number;
  locale: string;
}

export default function CourseInfoCard({
  title,
  imageUrl,
  instructorName,
  startDate,
  endDate,
  location,
  format,
  price,
  currency,
  maxEnrollment,
  currentEnrollment,
  locale,
}: CourseInfoCardProps) {
  const isZh = locale === 'zh';
  const spotsLeft = maxEnrollment ? maxEnrollment - (currentEnrollment || 0) : null;

  const formatPrice = (p: number, c: string) => {
    if (c === 'CNY') return `¥${p.toLocaleString('zh-CN')}`;
    return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return dateStr; }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {imageUrl && (
        <div className="aspect-[21/9] relative bg-gray-100">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>

        <div className="space-y-2.5 text-sm text-gray-600 mb-5">
          {instructorName && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{isZh ? '讲师' : 'Instructor'}: {instructorName}</span>
            </div>
          )}
          {(startDate || endDate) && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{formatDate(startDate)}{endDate ? ` - ${formatDate(endDate)}` : ''}</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{location}</span>
            </div>
          )}
          {format && (
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{format}</span>
            </div>
          )}
          {spotsLeft !== null && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              <span>
                {isZh
                  ? `剩余 ${spotsLeft} 个名额`
                  : `${spotsLeft} spots remaining`}
              </span>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">{isZh ? '课程费用' : 'Course Fee'}</span>
          <span className="text-2xl font-bold text-emerald-600">{formatPrice(price, currency)}</span>
        </div>
      </div>
    </div>
  );
}
