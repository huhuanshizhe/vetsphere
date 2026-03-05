'use client';

import type { CourseFormData } from '@/hooks/useCourseForm';

interface InstructorData {
  name?: string;
  imageUrl?: string;
  title?: string;
  credentials?: string[];
  bio?: string;
}

interface LocationData {
  country?: string;
  region?: string;
  city?: string;
  venue?: string;
  address?: string;
}

interface CoursePreviewProps {
  formData: CourseFormData;
}

const LEVEL_LABELS: Record<string, string> = {
  Basic: '基础',
  Intermediate: '进阶',
  Advanced: '高级',
  Master: '大师',
};

const LANGUAGE_LABELS: Record<string, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
  th: 'ภาษาไทย',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: '¥',
  USD: '$',
  JPY: '¥',
  THB: '฿',
};

const COUNTRY_LABELS: Record<string, string> = {
  CN: '中国',
  US: '美国',
  JP: '日本',
  TH: '泰国',
  KR: '韩国',
  SG: '新加坡',
  AU: '澳大利亚',
  GB: '英国',
  DE: '德国',
  FR: '法国',
  IT: '意大利',
  ES: '西班牙',
  NL: '荷兰',
  CA: '加拿大',
  MY: '马来西亚',
  VN: '越南',
  ID: '印度尼西亚',
  PH: '菲律宾',
  IN: '印度',
  AE: '阿联酋',
};

export default function CoursePreview({ formData }: CoursePreviewProps) {
  const instructor = (formData.instructor || {}) as InstructorData;
  const location = (formData.location || {}) as LocationData;
  const teachingLangs = (formData.teachingLanguages || []) as string[];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white mb-2">课程预览</h2>
        <p className="text-gray-400 text-sm">请检查以下信息，确认无误后提交</p>
      </div>

      {/* 封面图 */}
      <div className="relative rounded-2xl overflow-hidden bg-purple-500/10 aspect-video">
        {formData.imageUrl ? (
          <img 
            src={formData.imageUrl} 
            alt="Course cover" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">📚</span>
          </div>
        )}
        {formData.status && (
          <span className="absolute top-4 right-4 px-3 py-1 bg-gray-500/80 text-white text-sm rounded-full">
            {formData.status === 'draft' ? '草稿' : 
             formData.status === 'pending' ? '待审核' :
             formData.status === 'published' ? '已发布' : '已拒绝'}
          </span>
        )}
      </div>

      {/* 基本信息 */}
      <div className="edu-card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-purple-400 border-b border-purple-500/20 pb-2">
          基本信息
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <InfoItem 
            label="发布语言" 
            value={formData.publishLanguage ? LANGUAGE_LABELS[formData.publishLanguage] : undefined} 
          />
          <InfoItem label="课程标题" value={formData.title} />
          <InfoItem label="专科分类" value={formData.specialty} />
          <InfoItem label="难度等级" value={formData.level ? LEVEL_LABELS[formData.level] || formData.level : undefined} />
          <InfoItem 
            label="课程价格" 
            value={formData.price !== undefined ? `${CURRENCY_SYMBOLS[formData.currency || 'CNY'] || '¥'}${formData.price.toLocaleString()}` : undefined} 
          />
          <InfoItem label="最大容量" value={formData.maxCapacity ? `${formData.maxCapacity} 人` : undefined} />
        </div>
      </div>

      {/* 课程详情 */}
      <div className="edu-card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-purple-400 border-b border-purple-500/20 pb-2">
          课程详情
        </h3>

        {/* 授课语言 */}
        <div>
          <p className="text-sm text-gray-400 mb-2">授课语言</p>
          {teachingLangs.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {teachingLangs.map(lang => (
                <span 
                  key={lang} 
                  className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full"
                >
                  {LANGUAGE_LABELS[lang] || lang}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">未选择</p>
          )}
        </div>
        
        {formData.description && (
          <div>
            <p className="text-sm text-gray-400 mb-1">课程描述</p>
            <p className="text-gray-300 whitespace-pre-wrap">{formData.description}</p>
          </div>
        )}

        <div className="pt-4">
          <InfoItem label="总课时" value={formData.totalHours ? `${formData.totalHours} 小时` : undefined} />
        </div>

        {/* 预览视频 */}
        {formData.previewVideoUrl && (
          <div>
            <p className="text-sm text-gray-400 mb-2">预览视频</p>
            <video 
              src={formData.previewVideoUrl} 
              controls 
              className="w-full max-w-lg rounded-xl"
            />
          </div>
        )}
      </div>

      {/* 讲师信息 */}
      <div className="edu-card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-purple-400 border-b border-purple-500/20 pb-2">
          讲师信息
        </h3>
        
        <div className="flex items-start gap-4">
          {instructor.imageUrl ? (
            <img 
              src={instructor.imageUrl} 
              alt={instructor.name} 
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center text-3xl">
              👨‍🏫
            </div>
          )}
          <div className="flex-1">
            <p className="text-lg font-semibold text-white">{instructor.name || '未填写'}</p>
            <p className="text-sm text-purple-400">{instructor.title || '未填写职称'}</p>
            {instructor.bio && (
              <p className="text-sm text-gray-400 mt-2">{instructor.bio}</p>
            )}
          </div>
        </div>

        {instructor.credentials && instructor.credentials.length > 0 && (
          <div>
            <p className="text-sm text-gray-400 mb-2">资格证书</p>
            <div className="flex flex-wrap gap-2">
              {instructor.credentials.map((cred: string, idx: number) => (
                <span 
                  key={idx} 
                  className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full"
                >
                  {cred}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 课程安排 */}
      <div className="edu-card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-purple-400 border-b border-purple-500/20 pb-2">
          课程安排
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          <InfoItem label="开课日期" value={formData.startDate} />
          <InfoItem label="结课日期" value={formData.endDate} />
          <InfoItem label="报名截止" value={formData.enrollmentDeadline} />
        </div>

        <div className="pt-4">
          <p className="text-sm text-gray-400 mb-2">上课地点</p>
          <p className="text-gray-300">
            {[
              location.country ? COUNTRY_LABELS[location.country] || location.country : null,
              location.region,
              location.city,
            ].filter(Boolean).join(' · ') || '未填写'}
          </p>
          {location.venue && (
            <p className="text-white font-medium mt-1">{location.venue}</p>
          )}
          {location.address && (
            <p className="text-sm text-gray-500 mt-1">{location.address}</p>
          )}
        </div>

        {/* 日程表 */}
        {formData.agenda && formData.agenda.length > 0 && (
          <div className="pt-4">
            <p className="text-sm text-gray-400 mb-3">课程日程</p>
            <div className="space-y-4">
              {formData.agenda.map((day, idx) => (
                <div key={idx} className="border-l-2 border-purple-500/30 pl-4">
                  <p className="font-medium text-white mb-2">
                    {day.day} {day.date && <span className="text-gray-400">({day.date})</span>}
                  </p>
                  <div className="space-y-1">
                    {day.items.map((item, itemIdx) => (
                      <p key={itemIdx} className="text-sm text-gray-400">
                        <span className="text-purple-400">{item.time}</span>
                        {item.time && ' - '}
                        {item.activity || '未填写'}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 信息项组件
function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-gray-300">{value || <span className="text-gray-500">未填写</span>}</p>
    </div>
  );
}
